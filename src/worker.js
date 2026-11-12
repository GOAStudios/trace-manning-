// Cloudflare Worker: serves the website and handles the quote form.
//
// Settings it needs (set in Cloudflare, never in this file):
//   RESEND_API_KEY  secret  - API key from resend.com
//   TO_EMAIL        variable - where quote requests are sent (the owner's email)
//   FROM_EMAIL      variable - sender address on the verified domain, e.g. quotes@yourdomain.com

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/quote") {
      if (request.method !== "POST") return json({ ok: false, error: "Use POST" }, 405);
      return handleQuote(request, env);
    }

    // Everything else is a normal page or file from /public
    return env.ASSETS.fetch(request);
  },
};

async function handleQuote(request, env) {
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

  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const rows = [
    ["Name", lead.name],
    ["Phone", lead.phone],
    ["Email", lead.email],
    ["ZIP", lead.zip],
    ["Project", lead.type],
    ["Start", lead.timeline],
  ];
  const html = `
    <h2>New quote request</h2>
    <table cellpadding="6">${rows.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${esc(v)}</td></tr>`).join("")}</table>
    <p><b>Details</b></p>
    <p style="white-space:pre-wrap">${esc(lead.details)}</p>`;
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
    }),
  });

  if (!res.ok) {
    console.log("Resend error", res.status, await res.text());
    return json({ ok: false, error: "Email failed" }, 502);
  }
  return json({ ok: true });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
