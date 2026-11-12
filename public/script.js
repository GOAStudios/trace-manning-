// Mobile menu
const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.textContent = open ? "Close" : "Menu";
  });
}

// Project gallery filter (projects page)
const filterBar = document.querySelector(".filter-bar");
if (filterBar) {
  const buttons = filterBar.querySelectorAll("button");
  const items = document.querySelectorAll(".gallery figure");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      const type = btn.dataset.filter;
      items.forEach((item) => {
        item.hidden = type !== "all" && item.dataset.type !== type;
      });
    });
  });
}

// Quote request form — sends to /api/quote (handled by src/worker.js)
const form = document.querySelector("#quote-form");
if (form) {
  const status = document.querySelector(".form-status");
  const button = form.querySelector("button[type=submit]");

  const show = (kind, text) => {
    status.className = "form-status show " + kind;
    status.textContent = text;
    status.focus();
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    button.disabled = true;
    button.textContent = "Sending…";
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) throw new Error(out.error || "send failed");
      form.reset();
      show("ok", "Request sent. We'll call or email you within one business day.");
    } catch (err) {
      // While the yellow preview banner is on the page, the form only pretends to send.
      if (document.querySelector(".preview-banner")) {
        show("ok", "Preview only: on the live site, this form emails the request straight to the owner.");
      } else {
        show("err", "Your request didn't go through. Please call us instead, or try again in a minute.");
      }
    } finally {
      button.disabled = false;
      button.textContent = "Send quote request";
    }
  });
}
