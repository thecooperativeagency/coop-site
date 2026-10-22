// /api/apply: careers job application. Same lead pipeline as /api/contact (D1 + email to Lance + lead webhook), tagged source=job_application. No AI auto-reply.
import { json, clip, readBody, ipHashOf, leadRateLimited, processLead } from "./_shared.js";

const ROLE = "Content Creator";
const INTERESTS = { photo: "Inventory photography", social: "Social content", ai: "AI & systems" };

export async function onRequestOptions() { return new Response(null, { status: 204 }); }

export async function onRequestPost(context) {
  const { request, env } = context;
  const waitUntil = context.waitUntil ? context.waitUntil.bind(context) : (p) => p;
  const data = await readBody(request);
  if (!data || typeof data !== "object") return json({ ok: false, error: "bad-request" }, 400);
  if (clip(data.company_url, 200)) return json({ ok: true }); // honeypot

  const first = clip(data.first, 80), last = clip(data.last, 80), email = clip(data.email, 200), phone = clip(data.phone, 40);
  const city = clip(data.city, 120), sample = clip(data.sample, 300), social = clip(data.social, 300), intro = clip(data.message, 5000);
  let portfolio = clip(data.portfolio, 300);
  if (!first || !last || !email || !phone || !intro) return json({ ok: false, error: "missing-fields" }, 400);
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return json({ ok: false, error: "bad-email" }, 400);
  if (portfolio && !/^[a-z][a-z0-9+.-]*:\/\//i.test(portfolio) && /^[^\s]+\.[^\s]+$/.test(portfolio)) portfolio = clip("https://" + portfolio, 300);
  const raw = Array.isArray(data.interest) ? data.interest : (data.interest ? String(data.interest).split(",") : []);
  const interests = raw.map((k) => INTERESTS[String(k).trim()]).filter(Boolean);
  const isTest = /\bTEST\b/.test([first, last, intro, clip(data.subject, 200)].join(" "));

  const message = [`JOB APPLICATION: ${ROLE}`, ...(city ? [`City: ${city}`] : []), `Social media: ${social || "(none given)"}`,
    `Portfolio / website: ${portfolio || "(none given)"}`, `Inventory photo sample: ${sample || "(none given)"}`, `Interested in: ${interests.join(", ") || "(not specified)"}`, "", "Intro:", intro].join("\n");
  const lead = { first, last, dealership: `Job applicant (${ROLE})`, website: portfolio, email, phone,
    subject: `${isTest ? "TEST " : ""}Job application: ${ROLE}`, message,
    source_page: clip(request.headers.get("referer") || "", 300), source: "job_application", is_test: isTest ? 1 : 0 };

  const ipHash = await ipHashOf(request);
  if (await leadRateLimited(env.DB, ipHash)) return json({ ok: false, error: "rate-limited" }, 429);
  await processLead({ env, waitUntil, lead, ipHash, reply: null });
  return json({ ok: true });
}
