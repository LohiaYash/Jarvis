import type { ToolDefinition } from "./tool.js";
import type { GoogleOAuth } from "../integrations/googleOAuth.js";
import type { MicrosoftOAuth } from "../integrations/microsoftOAuth.js";

interface GoogleCalendarList {
  items?: Array<{
    id: string;
    summary?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
    location?: string;
    htmlLink?: string;
  }>;
}

interface MicrosoftCalendarList {
  value?: Array<{
    id: string;
    subject?: string;
    start?: { dateTime?: string; timeZone?: string };
    end?: { dateTime?: string; timeZone?: string };
    location?: { displayName?: string };
    webLink?: string;
  }>;
}

export function createCalendarAgendaTool(integrations: {
  google: GoogleOAuth;
  microsoft: MicrosoftOAuth;
}): ToolDefinition<{ date?: string; provider?: "google" | "microsoft" }> {
  return {
    name: "calendar.agenda",
    description: "Fetch the user's Google Calendar agenda using OAuth.",
    risk: "medium",
    schema: { date: "ISO date", provider: "google or microsoft" },
    async execute(input, context) {
      const date = input.date ?? new Date().toISOString().slice(0, 10);
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 1);
      if (input.provider === "microsoft") {
        const params = new URLSearchParams({
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          "$select": "id,subject,start,end,location,webLink",
          "$orderby": "start/dateTime"
        });
        const response = await integrations.microsoft.authedFetch(
          context.userId,
          `https://graph.microsoft.com/v1.0/me/calendarView?${params.toString()}`
        );
        if (!response.ok) throw new Error(`Microsoft Calendar agenda fetch failed: ${await response.text()}`);
        const payload = (await response.json()) as MicrosoftCalendarList;
        return {
          date,
          provider: "microsoft",
          events: (payload.value ?? []).map((event) => ({
            id: event.id,
            title: event.subject ?? "(untitled)",
            startsAt: event.start?.dateTime,
            endsAt: event.end?.dateTime,
            location: event.location?.displayName,
            link: event.webLink
          }))
        };
      }
      const params = new URLSearchParams({
        singleEvents: "true",
        orderBy: "startTime",
        timeMin: start.toISOString(),
        timeMax: end.toISOString()
      });
      const response = await integrations.google.authedFetch(
        context.userId,
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`
      );
      if (!response.ok) throw new Error(`Google Calendar agenda fetch failed: ${await response.text()}`);
      const payload = (await response.json()) as GoogleCalendarList;
      return {
        date,
        provider: "google",
        events: (payload.items ?? []).map((event) => ({
          id: event.id,
          title: event.summary ?? "(untitled)",
          startsAt: event.start?.dateTime ?? event.start?.date,
          endsAt: event.end?.dateTime ?? event.end?.date,
          location: event.location,
          link: event.htmlLink
        }))
      };
    }
  };
}
