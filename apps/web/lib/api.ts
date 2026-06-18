import type { ApprovalRecord, AssistantResponse, MemoryRecord } from "@jarvis/contracts";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4010/api";

export async function sendMessage(message: string, conversationId?: string): Promise<AssistantResponse> {
  const response = await fetch(`${API_URL}/assistant/message`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, conversationId, mode: "text" })
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<AssistantResponse>;
}

export async function getTools(): Promise<Array<{ name: string; description: string; risk: string }>> {
  const response = await fetch(`${API_URL}/tools`, { cache: "no-store" });
  if (!response.ok) return [];
  return response.json();
}

export async function getMemories(): Promise<MemoryRecord[]> {
  const response = await fetch(`${API_URL}/memory`, { cache: "no-store" });
  if (!response.ok) return [];
  return response.json() as Promise<MemoryRecord[]>;
}

export async function getApprovals(): Promise<ApprovalRecord[]> {
  const response = await fetch(`${API_URL}/approvals`, { cache: "no-store" });
  if (!response.ok) return [];
  return response.json() as Promise<ApprovalRecord[]>;
}

export async function decideApproval(approvalId: string, approved: boolean): Promise<ApprovalRecord> {
  const response = await fetch(`${API_URL}/approvals/${approvalId}/${approved ? "approve" : "reject"}`, {
    method: "POST"
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<ApprovalRecord>;
}

export async function getGoogleStatus(): Promise<{ configured: boolean; connected: boolean; scopes: string[] }> {
  const response = await fetch(`${API_URL}/integrations/google/status`, { cache: "no-store" });
  if (!response.ok) return { configured: false, connected: false, scopes: [] };
  return response.json() as Promise<{ configured: boolean; connected: boolean; scopes: string[] }>;
}

export async function getGoogleAuthUrl(): Promise<string> {
  const response = await fetch(`${API_URL}/integrations/google/auth-url`);
  if (!response.ok) throw new Error(await response.text());
  const payload = (await response.json()) as { url: string };
  return payload.url;
}

export async function getMicrosoftStatus(): Promise<{ configured: boolean; connected: boolean; scopes: string[] }> {
  const response = await fetch(`${API_URL}/integrations/microsoft/status`, { cache: "no-store" });
  if (!response.ok) return { configured: false, connected: false, scopes: [] };
  return response.json() as Promise<{ configured: boolean; connected: boolean; scopes: string[] }>;
}

export async function getMicrosoftAuthUrl(): Promise<string> {
  const response = await fetch(`${API_URL}/integrations/microsoft/auth-url`);
  if (!response.ok) throw new Error(await response.text());
  const payload = (await response.json()) as { url: string };
  return payload.url;
}
