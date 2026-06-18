import { env } from "../config/env.js";
import { pool } from "../infrastructure/database.js";
import { id } from "../infrastructure/ids.js";
import { decryptText, encryptText } from "../security/encryption.js";
import { decodeOAuthState, encodeOAuthState } from "./oauthState.js";

const googleScopes = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
  "openid",
  "email",
  "profile"
];

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

export interface GoogleConnection {
  userId: string;
  accessToken: string;
  refreshToken?: string;
  scopes: string[];
  expiresAt?: Date;
  profile: Record<string, unknown>;
}

export class GoogleOAuth {
  isConfigured(): boolean {
    return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI);
  }

  authUrl(userId: string): string {
    if (!this.isConfigured()) throw new Error("Google OAuth is not configured.");
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      scope: googleScopes.join(" "),
      state: encodeOAuthState(userId)
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleCallback(code: string, state: string): Promise<GoogleConnection> {
    if (!this.isConfigured()) throw new Error("Google OAuth is not configured.");
    const parsedState = decodeOAuthState(state);
    const token = await this.tokenRequest({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code"
    });
    return this.saveConnection(parsedState.userId, token);
  }

  async getConnection(userId: string): Promise<GoogleConnection | null> {
    const result = await pool.query("select * from oauth_connections where user_id = $1 and provider = 'google'", [userId]);
    if (result.rowCount === 0) return null;
    const row = result.rows[0];
    const connection: GoogleConnection = {
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
    if (!connection) throw new Error("Google account is not connected.");
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${connection.accessToken}` }
    });
    if (response.status !== 401 || !connection.refreshToken) return response;
    const refreshed = await this.refresh(userId, connection.refreshToken);
    return fetch(url, {
      headers: { authorization: `Bearer ${refreshed.accessToken}` }
    });
  }

  private async refresh(userId: string, refreshToken: string): Promise<GoogleConnection> {
    const token = await this.tokenRequest({
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    });
    token.refresh_token = refreshToken;
    return this.saveConnection(userId, token);
  }

  private async saveConnection(userId: string, token: TokenResponse): Promise<GoogleConnection> {
    const scopes = token.scope?.split(" ").filter(Boolean) ?? googleScopes;
    const expiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null;
    const result = await pool.query(
      `insert into oauth_connections
        (id, user_id, provider, scopes, access_token, refresh_token, expires_at)
       values ($1, $2, 'google', $3, $4, $5, $6)
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
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params)
    });
    if (!response.ok) throw new Error(`Google OAuth token exchange failed: ${await response.text()}`);
    return response.json() as Promise<TokenResponse>;
  }
}
