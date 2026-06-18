import { env } from "../config/env.js";
import { pool } from "../infrastructure/database.js";
import { id } from "../infrastructure/ids.js";
import { decryptText, encryptText } from "../security/encryption.js";
import { decodeOAuthState, encodeOAuthState } from "./oauthState.js";

const microsoftScopes = ["offline_access", "User.Read", "Mail.Read", "Calendars.Read"];

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

export interface MicrosoftConnection {
  userId: string;
  accessToken: string;
  refreshToken?: string;
  scopes: string[];
  expiresAt?: Date;
  profile: Record<string, unknown>;
}

export class MicrosoftOAuth {
  isConfigured(): boolean {
    return Boolean(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET && env.MICROSOFT_REDIRECT_URI);
  }

  authUrl(userId: string): string {
    if (!this.isConfigured()) throw new Error("Microsoft OAuth is not configured.");
    const params = new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID!,
      redirect_uri: env.MICROSOFT_REDIRECT_URI,
      response_type: "code",
      response_mode: "query",
      scope: microsoftScopes.join(" "),
      state: encodeOAuthState(userId)
    });
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async handleCallback(code: string, state: string): Promise<MicrosoftConnection> {
    if (!this.isConfigured()) throw new Error("Microsoft OAuth is not configured.");
    const parsedState = decodeOAuthState(state);
    const token = await this.tokenRequest({
      client_id: env.MICROSOFT_CLIENT_ID!,
      client_secret: env.MICROSOFT_CLIENT_SECRET!,
      redirect_uri: env.MICROSOFT_REDIRECT_URI,
      grant_type: "authorization_code",
      code
    });
    return this.saveConnection(parsedState.userId, token);
  }

  async getConnection(userId: string): Promise<MicrosoftConnection | null> {
    const result = await pool.query("select * from oauth_connections where user_id = $1 and provider = 'microsoft'", [userId]);
    if (result.rowCount === 0) return null;
    const row = result.rows[0];
    const connection: MicrosoftConnection = {
      userId,
      accessToken: decryptText(row.access_token),
      refreshToken: row.refresh_token ? decryptText(row.refresh_token) : undefined,
      scopes: row.scopes,
      expiresAt: row.expires_at ?? undefined,
      profile: row.profile ?? {}
    };
    if (connection.expiresAt && connection.expiresAt.getTime() < Date.now() + 60_000 && connection.refreshToken) {
      return this.refresh(userId, connection.refreshToken);
    }
    return connection;
  }

  async authedFetch(userId: string, url: string): Promise<Response> {
    const connection = await this.getConnection(userId);
    if (!connection) throw new Error("Microsoft account is not connected.");
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${connection.accessToken}` }
    });
    if (response.status !== 401 || !connection.refreshToken) return response;
    const refreshed = await this.refresh(userId, connection.refreshToken);
    return fetch(url, {
      headers: { authorization: `Bearer ${refreshed.accessToken}` }
    });
  }

  private async refresh(userId: string, refreshToken: string): Promise<MicrosoftConnection> {
    const token = await this.tokenRequest({
      client_id: env.MICROSOFT_CLIENT_ID!,
      client_secret: env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    });
    token.refresh_token = refreshToken;
    return this.saveConnection(userId, token);
  }

  private async saveConnection(userId: string, token: TokenResponse): Promise<MicrosoftConnection> {
    const scopes = token.scope?.split(" ").filter(Boolean) ?? microsoftScopes;
    const expiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null;
    const result = await pool.query(
      `insert into oauth_connections
        (id, user_id, provider, scopes, access_token, refresh_token, expires_at)
       values ($1, $2, 'microsoft', $3, $4, $5, $6)
       on conflict (user_id, provider)
       do update set
         scopes = excluded.scopes,
         access_token = excluded.access_token,
         refresh_token = coalesce(excluded.refresh_token, oauth_connections.refresh_token),
         expires_at = excluded.expires_at,
         updated_at = now()
       returning *`,
      [
        id("oauth"),
        userId,
        scopes,
        encryptText(token.access_token),
        token.refresh_token ? encryptText(token.refresh_token) : null,
        expiresAt
      ]
    );
    const row = result.rows[0];
    return {
      userId,
      accessToken: decryptText(row.access_token),
      refreshToken: row.refresh_token ? decryptText(row.refresh_token) : undefined,
      scopes: row.scopes,
      expiresAt: row.expires_at ?? undefined,
      profile: row.profile ?? {}
    };
  }

  private async tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
    const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params)
    });
    if (!response.ok) throw new Error(`Microsoft OAuth token exchange failed: ${await response.text()}`);
    return response.json() as Promise<TokenResponse>;
  }
}
