const MAIL_TO = "lance@thecoopbrla.com";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function pick(obj, key) {
  const v = obj[key];
  return typeof v === "string" ? v.trim() : "";
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let data = {};
  const ctype = request.headers.get("content-type") || "";
  try {
    if (ctype.includes("application/json")) {
      data = await request.json();
    } else {
      const form = await request.formData();
      form.forEach((value, key) => {
        data[key] = String(value);
      });
    }
  } catch {
    return json({ ok: false, error: "bad-request" }, 400);
  }

  const first = pick(data, "first");
  const last = pick(data, "last");
  const dealership = pick(data, "dealership");
  const website = pick(data, "website");
  const email = pick(data, "email");
  const phone = pick(data, "phone");
  const subject = pick(data, "subject") || "Client application";
  const message = pick(data, "message");

  if (!first || !last || !dealership || !website || !email || !phone || !message) {
    return json({ ok: false, error: "missing-fields" }, 400);
  }

  const endpoint = (env && env.FORMSPREE_ENDPOINT) || "";
  if (!endpoint) {
    return json({ ok: false, error: "not-configured" }, 503);
  }

  const forwarded = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      _subject: `The Cooperative Agency — ${subject}`,
      _replyto: email,
      to: MAIL_TO,
      first,
      last,
      dealership,
      website,
      email,
      phone,
      subject,
      message,
    }),
  });

  if (!forwarded.ok) {
    return json({ ok: false, error: "upstream" }, 502);
  }
  return json({ ok: true });
}
