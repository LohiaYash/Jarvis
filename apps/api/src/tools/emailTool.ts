import type { ToolDefinition } from "./tool.js";
import type { GoogleOAuth } from "../integrations/googleOAuth.js";
import type { MicrosoftOAuth } from "../integrations/microsoftOAuth.js";

interface GmailMessageList {
  messages?: Array<{ id: string; threadId: string }>;
}

interface GmailMessage {
  id: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
  };
  snippet?: string;
}

function header(message: GmailMessage, name: string): string {
  return message.payload?.headers?.find((item) => item.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

interface OutlookMessageList {
  value?: Array<{
    id: string;
    subject?: string;
    receivedDateTime?: string;
    from?: { emailAddress?: { name?: string; address?: string } };
    bodyPreview?: string;
  }>;
}

export function createEmailSummaryTool(integrations: {
  google: GoogleOAuth;
  microsoft: MicrosoftOAuth;
}): ToolDefinition<{ provider?: "gmail" | "outlook"; limit?: number }> {
  return {
    name: "email.summarize_unread",
    description: "Summarize unread emails using OAuth-backed providers.",
    risk: "medium",
    schema: { provider: "gmail or outlook", limit: "Maximum unread emails" },
    async execute(input, context) {
      const provider = input.provider ?? "gmail";
      const limit = Math.min(Math.max(input.limit ?? 10, 1), 25);
      if (provider === "outlook") {
        const params = new URLSearchParams({
          "$filter": "isRead eq false",
          "$top": String(limit),
          "$select": "id,subject,from,receivedDateTime,bodyPreview",
          "$orderby": "receivedDateTime desc"
        });
        const response = await integrations.microsoft.authedFetch(
          context.userId,
          `https://graph.microsoft.com/v1.0/me/messages?${params.toString()}`
        );
        if (!response.ok) throw new Error(`Outlook unread fetch failed: ${await response.text()}`);
        const payload = (await response.json()) as OutlookMessageList;
        const unread = (payload.value ?? []).map((message) => ({
          id: message.id,
          from: message.from?.emailAddress?.name ?? message.from?.emailAddress?.address ?? "",
          subject: message.subject ?? "(no subject)",
          date: message.receivedDateTime ?? "",
          snippet: message.bodyPreview ?? ""
        }));
        return {
          provider,
          unreadCount: unread.length,
          unread,
          summary: unread.length
            ? unread.map((message) => `${message.subject} from ${message.from}`).join("\n")
            : "No unread Outlook messages found."
        };
      }

      const listResponse = await integrations.google.authedFetch(
        context.userId,
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=UNREAD&maxResults=${limit}`
      );
      if (!listResponse.ok) throw new Error(`Gmail unread fetch failed: ${await listResponse.text()}`);
      const list = (await listResponse.json()) as GmailMessageList;
      const messages = await Promise.all(
        (list.messages ?? []).map(async (message) => {
          const response = await integrations.google.authedFetch(
            context.userId,
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`
          );
          if (!response.ok) throw new Error(`Gmail message fetch failed: ${await response.text()}`);
          const detail = (await response.json()) as GmailMessage;
          return {
            id: detail.id,
            from: header(detail, "From"),
            subject: header(detail, "Subject"),
            date: header(detail, "Date"),
            snippet: detail.snippet ?? ""
          };
        })
      );
      return {
        provider,
        unreadCount: messages.length,
        unread: messages,
        summary: messages.length
          ? messages.map((message) => `${message.subject || "(no subject)"} from ${message.from}`).join("\n")
          : "No unread Gmail messages found."
      };
    }
  };
}
