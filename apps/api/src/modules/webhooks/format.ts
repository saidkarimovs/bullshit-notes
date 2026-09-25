import { createHmac } from "node:crypto";

export interface WebhookEvent {
  event: string;
  [key: string]: unknown;
}

// Severity -> Discord embed colour (decimal). Falls back to a neutral grey.
const SEVERITY_COLOR: Record<string, number> = {
  INFO: 0x6b7280,
  LOW: 0x3b82f6,
  MEDIUM: 0xf59e0b,
  HIGH: 0xef4444,
  CRITICAL: 0x991b1b,
};

export function severityColor(severity?: string): number {
  return (severity && SEVERITY_COLOR[severity]) || 0x6b7280;
}

function title(evt: WebhookEvent): string {
  const map: Record<string, string> = {
    "report.created": "New report created",
    "report.status_changed": "Report status changed",
    "report.paid": "Bounty paid",
    "cve.watch_match": "CVE watch match",
    "vdp.sla_warning": "VDP disclosure SLA warning",
    "vdp.overdue": "VDP disclosure OVERDUE",
    "asset.new": "New asset discovered",
  };
  return map[evt.event] ?? evt.event;
}

function summary(evt: WebhookEvent): string {
  const parts: string[] = [];
  if (evt.title) parts.push(String(evt.title));
  if (evt.cveIds && Array.isArray(evt.cveIds)) {
    parts.push((evt.cveIds as string[]).join(", "));
  }
  if (evt.keyword) parts.push(`keyword: ${String(evt.keyword)}`);
  if (evt.daysRemaining !== undefined) {
    parts.push(`${String(evt.daysRemaining)} day(s) remaining`);
  }
  if (evt.status) parts.push(`status: ${String(evt.status)}`);
  if (evt.value) parts.push(String(evt.value));
  return parts.join(" — ") || "(no details)";
}

// --- per-platform body builders --------------------------------------------

export function formatDiscord(evt: WebhookEvent): object {
  return {
    embeds: [
      {
        title: title(evt),
        description: summary(evt),
        color: severityColor(evt.severity as string | undefined),
        timestamp: new Date().toISOString(),
        footer: { text: "bullshit notes" },
      },
    ],
  };
}

export function formatSlack(evt: WebhookEvent): object {
  return {
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: title(evt) },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: summary(evt) },
      },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: `event: \`${evt.event}\` · bullshit notes` },
        ],
      },
    ],
  };
}

export function formatTelegram(evt: WebhookEvent, chatId: string): object {
  const text = `<b>${escapeHtml(title(evt))}</b>\n${escapeHtml(summary(evt))}`;
  return { chat_id: chatId, parse_mode: "HTML", text };
}

export function formatGeneric(evt: WebhookEvent): object {
  return { event: evt.event, data: evt, sentAt: new Date().toISOString() };
}

export function signBody(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
