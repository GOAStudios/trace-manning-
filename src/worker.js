// Cloudflare Worker: serves the website and handles the quote form.
//
// Each quote request is:
//   1. emailed to the owner with any photos attached (Resend), which is required
//   2. texted to the owner's phone (Twilio), optional and skipped if not set up
//   3. added as a row in a Google Sheet lead tracker, optional and skipped if not set up
//
// Settings (in Cloudflare: Worker > Settings > Variables and Secrets).
// Secrets must NEVER be written in this repo.
//   RESEND_API_KEY      secret    resend.com API key
//   TO_EMAIL            variable  where quote emails go
//   FROM_EMAIL          variable  sender on the verified domain, e.g. quotes@yourdomain.com
//   TWILIO_ACCOUNT_SID  secret    (optional) text alerts
//   TWILIO_AUTH_TOKEN   secret    (optional)
//   TWILIO_FROM         variable  (optional) Twilio number, e.g. +18505550000
//   ALERT_PHONE         variable  (optional) phone that gets the text, e.g. +18507163740
//   SHEET_WEBHOOK_URL   secret    (optional) Google Apps Script web app URL (see tools/lead-sheet.gs)
//   SHEET_SECRET        secret    (optional) shared password, must match the one in the script

const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024; // per photo, after the browser shrinks it

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/quote") {
      if (request.method !== "POST") return json({ ok: false, error: "Use POST" }, 405);
      return handleQuote(request, env, ctx);
    }

    // Everything else is a normal page or file from /public
    return env.ASSETS.fetch(request);
  },
};

async function handleQuote(request, env, ctx) {
  if (Number(request.headers.get("content-length") || 0) > 25 * 1024 * 1024) {
    return json({ ok: false, error: "Too large" }, 413);
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "Bad request" }, 400);
  }

  // Spam trap: real people never fill in the hidden "company" field
  if (data.company) return json({ ok: true });

  const clean = (v, max = 2000) => String(v ?? "").trim().slice(0, max);
  const lead = {
    name: clean(data.name, 120),
    phone: clean(data.phone, 40),
    email: clean(data.email, 200),
    zip: clean(data.zip, 12),
    type: clean(data.type, 80),
    timeline: clean(data.timeline, 80),
    visit_date: clean(data.visit_date, 20),
    visit_time: clean(data.visit_time, 40),
    details: clean(data.details, 4000),
  };

  if (!lead.name || !lead.phone || !lead.email || !lead.details) {
    return json({ ok: false, error: "Missing required fields" }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return json({ ok: false, error: "Invalid email" }, 400);
  }
  if (!env.RESEND_API_KEY || !env.TO_EMAIL || !env.FROM_EMAIL) {
    return json({ ok: false, error: "Form is not set up yet" }, 500);
  }

  // Photos arrive as base64 JPEGs, already shrunk in the browser
  const photos = (Array.isArray(data.photos) ? data.photos : [])
    .slice(0, MAX_PHOTOS)
    .filter((p) => p && typeof p.data === "string" && /^[A-Za-z0-9+/=]+$/.test(p.data))
    .filter((p) => p.data.length * 0.75 <= MAX_PHOTO_BYTES)
    .map((p, i) => ({ filename: `photo-${i + 1}.jpg`, content: p.data }));

  const visit = [lead.visit_date && formatDate(lead.visit_date), lead.visit_time].filter(Boolean).join(", ");

  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const rows = [
    ["Name", lead.name],
    ["Phone", lead.phone],
    ["Email", lead.email],
    ["ZIP", lead.zip],
    ["Project", lead.type],
    ["Start", lead.timeline],
    ["Walkthrough", visit || "No preference"],
    ["Photos", photos.length ? `${photos.length} attached` : "None"],
  ];
  const html = `
    <h2>New quote request</h2>
    <table cellpadding="6">${rows.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${esc(v)}</td></tr>`).join("")}</table>
    <p><b>Details</b></p>
    <p style="white-space:pre-wrap">${esc(lead.details)}</p>
    <p><a href="tel:${esc(lead.phone)}">Call ${esc(lead.name)}</a></p>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n") + `\n\nDetails:\n${lead.details}`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Website <${env.FROM_EMAIL}>`,
      to: [env.TO_EMAIL],
      reply_to: lead.email,
      subject: `Quote request: ${lead.type || "project"} from ${lead.name}`,
      html,
      text,
      attachments: photos.length ? photos : undefined,
    }),
  });

  if (!res.ok) {
    console.log("Resend error", res.status, await res.text());
    return json({ ok: false, error: "Email failed" }, 502);
  }

  // Extras run after the visitor gets their "sent" message, and never block it
  ctx.waitUntil(sendText(env, lead, visit).catch((e) => console.log("Text alert failed", e)));
  ctx.waitUntil(addToSheet(env, lead, photos.length).catch((e) => console.log("Lead sheet failed", e)));

  return json({ ok: true });
}

// Text alert via Twilio (skipped unless all four settings exist)
async function sendText(env, lead, visit) {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM || !env.ALERT_PHONE) return;
  const body =
    `New quote request: ${lead.name}, ${lead.phone}. ${lead.type || "Project"}` +
    (lead.zip ? ` in ${lead.zip}` : "") +
    (visit ? `. Walkthrough: ${visit}` : "") +
    `. Full details in your email.`;
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: env.ALERT_PHONE, From: env.TWILIO_FROM, Body: body.slice(0, 600) }),
  });
  if (!res.ok) console.log("Twilio error", res.status, await res.text());
}

// Lead tracker row via Google Apps Script (skipped unless set up)
async function addToSheet(env, lead, photoCount) {
  if (!env.SHEET_WEBHOOK_URL) return;
  await fetch(env.SHEET_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: env.SHEET_SECRET || "", ...lead, photos: photoCount }),
  });
}

function formatDate(iso) {
  const d = new Date(iso + "T12:00:00Z");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
