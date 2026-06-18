import { ToolRegistry } from "./registry.js";
import { browserTool } from "./browserTool.js";
import { createCalendarAgendaTool } from "./calendarTool.js";
import { openAppTool } from "./desktopTool.js";
import { createEmailSummaryTool } from "./emailTool.js";
import { fileInfoTool, listFilesTool, moveFileTool, readFileTool, writeFileTool } from "./fileTool.js";
import { webSearchTool } from "./searchTool.js";
import { terminalTool } from "./terminalTool.js";
import { videoProbeTool } from "./videoTool.js";

import type { GoogleOAuth } from "../integrations/googleOAuth.js";
import type { MicrosoftOAuth } from "../integrations/microsoftOAuth.js";

export function createToolRegistry(integrations: { google: GoogleOAuth; microsoft: MicrosoftOAuth }): ToolRegistry {
  const registry = new ToolRegistry();
  [
    browserTool,
    createCalendarAgendaTool(integrations),
    createEmailSummaryTool(integrations),
    fileInfoTool,
    listFilesTool,
    moveFileTool,
    openAppTool,
    readFileTool,
    terminalTool,
    videoProbeTool,
    webSearchTool,
    writeFileTool
  ].forEach((tool) => registry.register(tool));
  return registry;
}

export type { ToolRegistry } from "./registry.js";
