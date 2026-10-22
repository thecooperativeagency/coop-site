// Shared helpers for /api/contact and /api/chat.
export const CONFIG = {
  MODEL: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  NOTIFY_TO: "lance@thecoopbrla.com",
  REPLY_TO: "lance@thecoopbrla.com",
  FROM: { email: "hello@mail.thecoopbrla.com", name: "The Cooperative Agency" },
  SIGNATURE: "The Cooperative Agency, Baton Rouge, Louisiana",
  RATE_LIMIT: { max: 3, minutes: 10 },
  CHAT_RATE_LIMIT: { max: 20, minutes: 10 },
  CHAT: { maxTurns: 10, maxChars: 500, transcriptTurns: 24 },
};

export const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
export const clip = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function sha(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
export const ipHashOf = (request) => sha((request.headers.get("cf-connecting-ip") || "") + "|coop");

export const BANNED = /(\$\s?\d|\d\s?%|percent|guarantee|per month|\/mo\b|discount|free of charge)/i;
const TIMELINE = /\b\d+\s*(-|to)?\s*\d*\s*(hours?|days?|weeks?|months?|years?)\b|\bwithin (a|one|two|three) (day|week|month)/i;
const ALLOWED_LINK = "https://www.instagram.com/thecooperativeagency/";
// Output filter shared by every AI surface: true means reject and use a canned line.
export function unsafeOutput(t, { strictTimelines = false } = {}) {
  if (!t) return true;
  if (BANNED.test(t)) return true;
  if (/https?:\/\/|www\./i.test(t.split(ALLOWED_LINK).join(""))) return true;
  if (strictTimelines && TIMELINE.test(t)) return true;
  return false;
}

export async function readBody(request) {
  try {
    if ((request.headers.get("content-type") || "").includes("application/json")) return await request.json();
    const o = {}; (await request.formData()).forEach((v, k) => { o[k] = String(v); }); return o;
  } catch { return null; }
}

export async function countSince(db, sql, ipHash, minutes) {
  const since = new Date(Date.now() - minutes * 60000).toISOString();
  const c = await db.prepare(sql).bind(ipHash, since).first();
  return c ? c.n : 0;
}
export async function leadRateLimited(db, ipHash) {
  if (!db) return false;
  return (await countSince(db, "SELECT COUNT(*) AS n FROM leads WHERE ip_hash=? AND created_at>?", ipHash, CONFIG.RATE_LIMIT.minutes)) >= CONFIG.RATE_LIMIT.max;
}

export async function sendEmail(env, msg) {
  const m = { from: CONFIG.FROM, reply_to: CONFIG.REPLY_TO, ...msg };
  try {
    if (env.EMAIL && env.EMAIL.send) {
      const r = await env.EMAIL.send({ ...m, replyTo: m.reply_to });
      return "sent:" + (r?.messageId || "ok");
    }
    if (env.CF_EMAIL_API_TOKEN && env.CF_ACCOUNT_ID) {
      const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/email/sending/send`, {
        method: "POST", headers: { authorization: `Bearer ${env.CF_EMAIL_API_TOKEN}`, "content-type": "application/json" }, body: JSON.stringify(m) });
      return r.ok ? "sent" : "error:" + r.status + ":" + (await r.text()).slice(0, 200);
    }
    return "skipped:no-email-config";
  } catch (e) { return "error:" + String(e).slice(0, 200); }
}

export function leadKind(lead) { return lead.source === "chat" ? "chat lead" : lead.source === "job_application" ? "JOB APPLICATION" : "inquiry"; }

export function notifyBody(lead, reply, live) {
  const digits = (lead.phone || "").replace(/[^\d+]/g, "");
  const subj = encodeURIComponent("Re: " + (lead.subject || "Your inquiry"));
  const name = `${lead.first} ${lead.last || ""}`.trim();
  const rows = [["Name", name], [lead.source === "job_application" ? "Applying for" : "Dealership / company", lead.dealership], [lead.source === "job_application" ? "Portfolio / website" : "Website", lead.website], ["Email", lead.email], ["Phone", lead.phone], ["Subject", lead.subject], ["Source", lead.source || "contact"], ["Page", lead.source_page]];
  const links = [lead.email && `<a href="mailto:${esc(lead.email)}?subject=${subj}">Email ${esc(lead.first)}</a>`, digits && `<a href="tel:${esc(digits)}">Call ${esc(lead.phone)}</a>`, digits && `<a href="sms:${esc(digits)}">Text ${esc(lead.phone)}</a>`].filter(Boolean).join(" &nbsp;|&nbsp; ");
  const tx = lead.transcript ? `<h3>Chat transcript</h3><pre style="white-space:pre-wrap;font-family:inherit;background:#f4f4f4;padding:10px">${esc(lead.transcript)}</pre>` : "";
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px">
<h2>${lead.is_test ? "[TEST] " : ""}New ${leadKind(lead)}: ${esc(name)}, ${esc(lead.dealership)}</h2>
<p>${links}</p>
<table cellpadding="4">${rows.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${esc(v || "")}</td></tr>`).join("")}</table>
<h3>Message</h3><pre style="white-space:pre-wrap;font-family:inherit">${esc(lead.message)}</pre>${tx}
${reply ? `<h3>${live ? "Auto-reply sent to inquirer" : "Draft reply that would have been sent"}</h3>
<pre style="white-space:pre-wrap;font-family:inherit;background:#f4f4f4;padding:10px">${esc(reply.text)}</pre>
<p style="color:#777;font-size:12px">Reply source: ${esc(reply.source)} · AUTOREPLY_LIVE=${live}</p>` : ""}</div>`;
  const text = `${lead.is_test ? "[TEST] " : ""}New ${leadKind(lead)} from ${name} (${lead.dealership})\n` +
    (lead.email ? `Email: mailto:${lead.email}\n` : "") + (digits ? `Call: tel:${digits}\nText: sms:${digits}\n` : "") +
    rows.map(([k, v]) => `${k}: ${v || ""}`).join("\n") + `\n\nMessage:\n${lead.message}\n` + (lead.transcript ? `\nChat transcript:\n${lead.transcript}\n` : "") +
    (reply ? `\n${live ? "Auto-reply sent to inquirer" : "Draft reply that would have been sent"}:\n${reply.text}\n` : "");
  return { html, text };
}

// Insert lead, notify Lance, optional auto-reply, optional webhook. Same path for contact form and chat.
export async function processLead({ env, waitUntil, lead, ipHash, reply }) {
  const db = env.DB;
  const live = String(env.AUTOREPLY_LIVE || "false").toLowerCase() === "true";
  const canAuto = live && reply && lead.email && lead.source !== "chat";
  let leadId = null;
  if (db) {
    const r = await db.prepare("INSERT INTO leads (created_at,ip_hash,first,last,dealership,website,email,phone,subject,message,source_page,ai_reply,reply_source,autoreply_sent,is_test,source,transcript) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(new Date().toISOString(), ipHash, lead.first, lead.last || "", lead.dealership, lead.website || "", lead.email || "", lead.phone || "", lead.subject, lead.message, lead.source_page, reply ? reply.text : null, reply ? reply.source : null, canAuto ? 1 : 0, lead.is_test, lead.source || "contact", lead.transcript || null).run();
    leadId = r?.meta?.last_row_id ?? null;
  }
  const name = `${lead.first} ${lead.last || ""}`.trim();
  const n = notifyBody(lead, reply, live);
  const notifyStatus = await sendEmail(env, { to: CONFIG.NOTIFY_TO, subject: `${lead.is_test ? "[TEST] " : ""}New ${leadKind(lead)}: ${name}, ${lead.dealership}`, html: n.html, text: n.text, ...(lead.email ? { reply_to: lead.email } : {}) });
  let autoStatus = reply ? "drafted" : "n/a";
  if (canAuto) autoStatus = await sendEmail(env, { to: lead.email, subject: "Thanks for reaching out to The Cooperative Agency", text: reply.text, html: `<pre style="white-space:pre-wrap;font-family:Arial,sans-serif;font-size:15px">${esc(reply.text)}</pre>` });
  if (db && leadId) waitUntil(db.prepare("UPDATE leads SET notify_status=?, autoreply_status=? WHERE id=?").bind(notifyStatus, autoStatus, leadId).run().catch(() => {}));
  if (env.LEAD_WEBHOOK_URL && env.LEAD_WEBHOOK_AUTH) {
    waitUntil(fetch(env.LEAD_WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json", authorization: env.LEAD_WEBHOOK_AUTH },
      body: JSON.stringify({ id: leadId, test: !!lead.is_test, source: lead.source || "contact", name, company: lead.dealership, email: lead.email, phone: lead.phone, website: lead.website, subject: lead.subject, message: lead.message, transcript: lead.transcript || undefined, autoreply: canAuto && autoStatus.startsWith("sent") ? "sent" : "drafted", ai_reply: reply ? reply.text : undefined, reply_source: reply ? reply.source : undefined }) }).catch(() => {}));
  }
  return { leadId, notifyStatus };
}
