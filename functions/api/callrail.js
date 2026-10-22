// /api/callrail: relay CallRail post-call / call-modified webhooks (Voice Assist "Ada") into D1 + the lead webhook.
// CallRail can't send custom headers, so auth is a shared secret query param ?k= (Pages secret CALLRAIL_RELAY_KEY).
import { json, clip, ipHashOf } from "./_shared.js";

async function readAny(request) {
  const ct = request.headers.get("content-type") || "";
  const raw = await request.text();
  if (!raw) return {};
  if (ct.includes("json") || /^\s*[{[]/.test(raw)) { try { return JSON.parse(raw); } catch {} }
  try { const o = {}; new URLSearchParams(raw).forEach((v, k) => { o[k] = v; }); return o; } catch { return {}; }
}

function eqTime(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0;
}

const str = (v) => (v == null ? "" : typeof v === "string" ? v : typeof v === "object" ? JSON.stringify(v) : String(v));

// Voice Assist message may be a string ("Name: ...\nBusiness: ...") or an object; pull known fields either way.
function parseVA(va) {
  const out = {};
  if (!va) return out;
  let obj = va;
  if (typeof va === "string") { try { obj = JSON.parse(va); } catch { obj = null; } }
  const pick = (k, v) => {
    const key = k.toLowerCase(); const val = str(v).trim(); if (!val) return;
    if (/(^|_|\s)(caller_?)?name$|full_?name|caller name/.test(key) && !/business|company|dealer/.test(key)) out.name ??= val;
    else if (/business|company|dealer|organization/.test(key)) out.business ??= val;
    else if (/phone|callback/.test(key)) out.phone ??= val;
    else if (/email/.test(key)) out.email ??= val;
    else if (/message|summary|reason|purpose|note|request/.test(key)) out.message ??= val;
  };
  if (obj && typeof obj === "object") {
    const walk = (o) => { for (const [k, v] of Object.entries(o)) { if (v && typeof v === "object" && !Array.isArray(v)) walk(v); else pick(k, v); } };
    walk(obj);
  } else {
    for (const line of String(va).split(/\r?\n/)) { const m = line.match(/^\s*[-*]?\s*([A-Za-z][\w ]{1,40}):\s*(.+)$/); if (m) pick(m[1], m[2]); }
  }
  out.raw = typeof va === "string" ? va : JSON.stringify(va);
  return out;
}

export async function onRequestOptions() { return new Response(null, { status: 204 }); }
export async function onRequestGet() { return new Response("Method Not Allowed", { status: 405 }); }

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  if (!env.CALLRAIL_RELAY_KEY || !eqTime(url.searchParams.get("k") || "", env.CALLRAIL_RELAY_KEY)) return json({ ok: false, error: "unauthorized" }, 401);
  const c = await readAny(request);
  if (!c || typeof c !== "object") return json({ ok: false, error: "bad-request" }, 400);

  const va = parseVA(c.voice_assist_message);
  const name = clip(va.name || c.formatted_customer_name || c.customer_name || "", 160) || "Unknown caller";
  const phone = clip(va.phone || c.formatted_customer_phone_number || c.customer_phone_number || "", 40);
  const business = clip(va.business || "", 160);
  const email = clip(va.email || "", 200);
  const summary = clip(str(c.call_summary), 4000);
  const purpose = clip(va.message || "", 4000);
  const transcript = clip(str(c.transcription || c.conversational_transcript), 20000);
  const callTime = clip(str(c.start_time || c.created_at), 60);
  const tracking = clip(str(c.formatted_tracking_phone_number || c.tracking_phone_number), 40);
  const callId = clip(str(c.id || c.resource_id), 80);
  const link = clip(str(c.recording_player || c.recording || ""), 500) ||
    (callId ? `https://app.callrail.com/calls/${encodeURIComponent(callId)}` : "");
  const isTest = /\bTEST\b/.test(name) || c.test === true || c.test === "true" ? 1 : 0;
  const event = clip(url.searchParams.get("event") || str(c.webhook_event) || "post_call", 40);

  const message = [
    purpose && `Purpose: ${purpose}`,
    summary && `Call summary: ${summary}`,
    va.raw && !purpose && `Voice Assist message: ${clip(va.raw, 3000)}`,
    `Call time: ${callTime || "n/a"}`,
    `Tracking number: ${tracking || "n/a"}`,
    c.formatted_duration ? `Duration: ${c.formatted_duration}` : (c.duration != null ? `Duration: ${c.duration}s` : ""),
    c.formatted_customer_location ? `Caller location: ${c.formatted_customer_location}` : "",
    link && `CallRail: ${link}`,
  ].filter(Boolean).join("\n");

  const db = env.DB;
  let leadId = null;
  if (db) {
    try {
      const r = await db.prepare("INSERT INTO leads (created_at,ip_hash,first,last,dealership,website,email,phone,subject,message,source_page,is_test,source,transcript,call_meta) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(new Date().toISOString(), await ipHashOf(request), name, "", business, "", email, phone, `Phone call (Ada) ${event}`, message, link, isTest, "phone", transcript || null,
          JSON.stringify({ call_id: callId, event, call_time: callTime, tracking, link, va: va.raw || null })).run();
      leadId = r?.meta?.last_row_id ?? null;
    } catch (e) { console.log("d1 error", String(e).slice(0, 200)); }
  }

  let webhook = "skipped:no-config";
  if (env.LEAD_WEBHOOK_URL && env.LEAD_WEBHOOK_AUTH) {
    try {
      const r = await fetch(env.LEAD_WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json", authorization: env.LEAD_WEBHOOK_AUTH },
        body: JSON.stringify({ id: leadId, test: !!isTest, source: "Phone call (Ada)", name, company: business, dealership: business, email, phone,
          subject: `${isTest ? "[TEST] " : ""}Phone call (Ada): ${name}${business ? ", " + business : ""}`, message,
          summary: summary || undefined, purpose: purpose || undefined, call_time: callTime, tracking_number: tracking, callrail_link: link, callrail_event: event,
          transcript: transcript ? clip(transcript, 6000) : undefined }) });
      webhook = String(r.status);
    } catch (e) { webhook = "error"; }
    if (db && leadId) await db.prepare("UPDATE leads SET notify_status=? WHERE id=?").bind("webhook:" + webhook, leadId).run().catch(() => {});
  }
  // Always 2xx to CallRail once authenticated (it never retries; non-2xx can auto-disable the webhook).
  return json({ ok: true, id: leadId, webhook });
}
