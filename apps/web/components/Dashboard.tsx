"use client";

import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { motion } from "framer-motion";
import { Activity, Brain, Check, Database, Mic, Send, Settings, ShieldCheck, TerminalSquare, Workflow, X } from "lucide-react";
import type { AgentEvent, ApprovalRecord, AssistantResponse, ChatMessage, MemoryRecord } from "@jarvis/contracts";
import { ArcReactor } from "./ArcReactor";
import {
  decideApproval,
  getApprovals,
  getGoogleAuthUrl,
  getGoogleStatus,
  getMemories,
  getMicrosoftAuthUrl,
  getMicrosoftStatus,
  getTools,
  sendMessage
} from "../lib/api";

export function Dashboard() {
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [tools, setTools] = useState<Array<{ name: string; description: string; risk: string }>>([]);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [googleStatus, setGoogleStatus] = useState<{ configured: boolean; connected: boolean; scopes: string[] }>({
    configured: false,
    connected: false,
    scopes: []
  });
  const [microsoftStatus, setMicrosoftStatus] = useState<{ configured: boolean; connected: boolean; scopes: string[] }>({
    configured: false,
    connected: false,
    scopes: []
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getTools().then(setTools).catch(() => setTools([]));
    void getMemories().then(setMemories).catch(() => setMemories([]));
    void getApprovals().then(setApprovals).catch(() => setApprovals([]));
    void getGoogleStatus().then(setGoogleStatus).catch(() => setGoogleStatus({ configured: false, connected: false, scopes: [] }));
    void getMicrosoftStatus()
      .then(setMicrosoftStatus)
      .catch(() => setMicrosoftStatus({ configured: false, connected: false, scopes: [] }));
  }, []);

  const highRisk = useMemo(() => tools.filter((tool) => tool.risk === "high" || tool.risk === "critical").length, [tools]);

  async function submit() {
    if (!input.trim() || busy) return;
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      createdAt: new Date().toISOString(),
      metadata: {}
    };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setBusy(true);
    try {
      const response: AssistantResponse = await sendMessage(userMessage.content, conversationId);
      setConversationId(response.conversationId);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.answer,
          createdAt: new Date().toISOString(),
          metadata: { taskId: response.taskId }
        }
      ]);
      setEvents((current) => [...response.events, ...current].slice(0, 80));
      void getMemories().then(setMemories).catch(() => setMemories([]));
      void getApprovals().then(setApprovals).catch(() => setApprovals([]));
    } catch (error) {
      const message = error instanceof Error ? error.message : "The local API is not reachable yet.";
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `I cannot reach the local API yet. Start the backend with Docker services and npm run dev, then I will be ready to operate.\n\n${message}`,
          createdAt: new Date().toISOString(),
          metadata: {}
        }
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function decide(approvalId: string, approved: boolean) {
    try {
      const updated = await decideApproval(approvalId, approved);
      setApprovals((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setEvents((current) => [
        {
          id: crypto.randomUUID(),
          agent: "Security",
          type: "security",
          message: approved ? `${updated.toolCall.name} approved and processed.` : `${updated.toolCall.name} rejected.`,
          createdAt: new Date().toISOString(),
          data: { approvalId }
        },
        ...current
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Approval action failed.";
      setEvents((current) => [
        {
          id: crypto.randomUUID(),
          agent: "Security",
          type: "error",
          message,
          createdAt: new Date().toISOString(),
          data: { approvalId }
        },
        ...current
      ]);
    }
  }

  async function connectGoogle() {
    try {
      const url = await getGoogleAuthUrl();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google connection failed.";
      setEvents((current) => [
        {
          id: crypto.randomUUID(),
          agent: "Integrations",
          type: "error",
          message,
          createdAt: new Date().toISOString(),
          data: {}
        },
        ...current
      ]);
    }
  }

  async function connectMicrosoft() {
    try {
      const url = await getMicrosoftAuthUrl();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Microsoft connection failed.";
      setEvents((current) => [
        {
          id: crypto.randomUUID(),
          agent: "Integrations",
          type: "error",
          message,
          createdAt: new Date().toISOString(),
          data: {}
        },
        ...current
      ]);
    }
  }

  return (
    <main className="hud-grid min-h-screen px-5 py-5">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <aside className="space-y-5">
          <section className="rounded-lg border border-reactor/20 bg-panel/80 p-5 shadow-hud backdrop-blur">
            <ArcReactor />
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <Metric icon={<Brain size={18} />} label="Agents" value="7" />
              <Metric icon={<TerminalSquare size={18} />} label="Tools" value={String(tools.length)} />
              <Metric icon={<ShieldCheck size={18} />} label="Guarded" value={String(highRisk)} />
              <Metric icon={<Database size={18} />} label="Memory" value={String(memories.length)} />
            </div>
          </section>
          <section className="rounded-lg border border-white/10 bg-black/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-reactor">
              <Settings size={16} /> System Status
            </div>
            <Status label="API" value="local" />
            <Status label="Model Routing" value="cloud/local fallback" />
            <Status label="Voice" value="wake word ready" />
            <Status label="Security" value="approval gated" />
            <div className="flex items-center justify-between border-t border-white/10 py-2 text-sm">
              <span className="text-cyan-100/60">Google</span>
              {googleStatus.connected ? (
                <span className="text-reactor">connected</span>
              ) : (
                <button
                  onClick={() => void connectGoogle()}
                  disabled={!googleStatus.configured}
                  className="rounded-md border border-reactor/30 px-2 py-1 text-xs text-reactor disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Connect
                </button>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-white/10 py-2 text-sm">
              <span className="text-cyan-100/60">Microsoft</span>
              {microsoftStatus.connected ? (
                <span className="text-reactor">connected</span>
              ) : (
                <button
                  onClick={() => void connectMicrosoft()}
                  disabled={!microsoftStatus.configured}
                  className="rounded-md border border-reactor/30 px-2 py-1 text-xs text-reactor disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Connect
                </button>
              )}
            </div>
          </section>
        </aside>

        <section className="flex min-h-[calc(100vh-40px)] flex-col rounded-lg border border-reactor/20 bg-black/40 shadow-hud backdrop-blur">
          <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <h1 className="text-xl font-semibold text-white">JARVIS Command</h1>
              <p className="text-sm text-cyan-100/65">Chief-of-staff mode, local-first architecture</p>
            </div>
            <button className="grid h-11 w-11 place-items-center rounded-lg border border-reactor/30 text-reactor" title="Voice input">
              <Mic size={20} />
            </button>
          </header>
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <div className="grid h-full place-items-center text-center text-cyan-100/70">
                <div>
                  <p className="text-lg text-white">Awaiting instructions.</p>
                  <p className="mt-2 max-w-md text-sm">Try: summarize unread emails, plan my study week, search internships, or launch VS Code.</p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <motion.article
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`max-w-[82%] rounded-lg border p-4 text-sm leading-6 ${
                    message.role === "user"
                      ? "ml-auto border-ember/30 bg-ember/10 text-orange-50"
                      : "border-reactor/30 bg-reactor/10 text-cyan-50"
                  }`}
                >
                  {message.content}
                </motion.article>
              ))
            )}
          </div>
          <div className="border-t border-white/10 p-4">
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submit();
                }}
                placeholder="Speak plainly. JARVIS will plan, route, and act."
                className="h-12 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-4 text-sm outline-none ring-reactor/40 focus:ring-2"
              />
              <button
                onClick={() => void submit()}
                disabled={busy}
                className="grid h-12 w-12 place-items-center rounded-lg bg-reactor text-black disabled:opacity-50"
                title="Send"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <Panel title="Agent Activity" icon={<Activity size={16} />}>
            <div className="space-y-3">
              {events.slice(0, 12).map((event) => (
                <div key={event.id} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-xs text-reactor">{event.agent}</div>
                  <div className="text-sm text-cyan-50/85">{event.message}</div>
                </div>
              ))}
              {events.length === 0 && <p className="text-sm text-cyan-100/60">No activity yet.</p>}
            </div>
          </Panel>
          <Panel title="Memory Viewer" icon={<Database size={16} />}>
            <div className="space-y-3">
              {memories.slice(0, 8).map((memory) => (
                <div key={memory.id} className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-xs text-cyan-50/75">
                  {memory.content.slice(0, 150)}
                </div>
              ))}
              {memories.length === 0 && <p className="text-sm text-cyan-100/60">No memories stored yet.</p>}
            </div>
          </Panel>
          <Panel title="Approvals" icon={<ShieldCheck size={16} />}>
            <div className="space-y-3">
              {approvals.slice(0, 8).map((approval) => (
                <div key={approval.id} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-cyan-50">{approval.toolCall.name}</div>
                      <div className="mt-1 text-xs uppercase text-cyan-100/55">{approval.status} | {approval.toolCall.risk}</div>
                    </div>
                    {approval.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => void decide(approval.id, true)}
                          className="grid h-8 w-8 place-items-center rounded-md bg-reactor text-black"
                          title="Approve"
                        >
                          <Check size={15} />
                        </button>
                        <button
                          onClick={() => void decide(approval.id, false)}
                          className="grid h-8 w-8 place-items-center rounded-md border border-ember/40 text-ember"
                          title="Reject"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                  {approval.error && <div className="mt-2 text-xs text-ember">{approval.error}</div>}
                </div>
              ))}
              {approvals.length === 0 && <p className="text-sm text-cyan-100/60">No pending approvals.</p>}
            </div>
          </Panel>
          <Panel title="Workflow Surface" icon={<Workflow size={16} />}>
            <div className="grid grid-cols-2 gap-2 text-xs text-cyan-50/70">
              {tools.slice(0, 10).map((tool) => (
                <div key={tool.name} className="rounded-md border border-white/10 px-2 py-2">
                  {tool.name}
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      </div>
    </main>
  );
}

function Metric(props: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center gap-2 text-reactor">{props.icon}</div>
      <div className="mt-2 text-lg font-semibold">{props.value}</div>
      <div className="text-xs text-cyan-100/60">{props.label}</div>
    </div>
  );
}

function Status(props: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-t border-white/10 py-2 text-sm">
      <span className="text-cyan-100/60">{props.label}</span>
      <span className="text-cyan-50">{props.value}</span>
    </div>
  );
}

function Panel(props: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-white/10 bg-black/30 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-reactor">
        {props.icon} {props.title}
      </div>
      {props.children}
    </section>
  );
}
