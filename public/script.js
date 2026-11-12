// ============ Settings ============
// Online booking: paste a Cal.com or Calendly link here to show a
// "book a time on our calendar" link on the quote page. Leave "" to hide it.
const BOOKING_URL = "";
// ==================================

const isPreview = !!document.querySelector(".preview-banner");

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

// Before/after sliders
document.querySelectorAll(".ba").forEach((ba) => {
  const range = ba.querySelector(".ba-range");
  range.addEventListener("input", () => ba.style.setProperty("--pos", range.value + "%"));
});

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

// Service area map (Google Maps embed; only on the live site)
const map = document.querySelector(".map[data-map-query]");
if (map && !isPreview) {
  const q = encodeURIComponent(map.dataset.mapQuery);
  map.classList.add("live");
  map.innerHTML = `<iframe title="Service area map" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
    src="https://www.google.com/maps?q=${q}&output=embed"></iframe>`;
}

// Quote request form, sent to /api/quote (handled by src/worker.js)
const form = document.querySelector("#quote-form");
if (form) {
  const status = document.querySelector(".form-status");
  const button = form.querySelector("button[type=submit]");
  const photoInput = form.querySelector("#photos");
  const previews = form.querySelector(".photo-previews");
  const dateInput = form.querySelector("#visit_date");
  const MAX_PHOTOS = 6;
  let photos = []; // { name, data } with data as base64 JPEG

  if (dateInput) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    dateInput.min = d.toISOString().slice(0, 10);
  }

  if (BOOKING_URL) {
    const wrap = document.querySelector("#booking-link-wrap");
    const link = document.querySelector("#booking-link");
    link.href = BOOKING_URL;
    link.target = "_blank";
    link.rel = "noopener";
    wrap.hidden = false;
  }

  const show = (kind, text) => {
    status.className = "form-status show " + kind;
    status.textContent = text;
    status.focus();
  };

  // Shrink a photo to max 1600px JPEG so uploads stay small and fast
  const shrink = (file) =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
      img.src = url;
    });

  if (photoInput) {
    photoInput.addEventListener("change", async () => {
      const files = [...photoInput.files].filter((f) => f.type.startsWith("image/")).slice(0, MAX_PHOTOS);
      photos = [];
      previews.innerHTML = "";
      for (const [i, f] of files.entries()) {
        try {
          const dataUrl = await shrink(f);
          photos.push({ name: `photo-${i + 1}.jpg`, data: dataUrl.split(",")[1] });
          const li = document.createElement("li");
          li.innerHTML = `<img alt="Selected photo ${i + 1}" src="${dataUrl}">`;
          previews.appendChild(li);
        } catch { /* skip files the browser can't read */ }
      }
      if (photoInput.files.length > MAX_PHOTOS) {
        show("err", `Only the first ${MAX_PHOTOS} photos will be sent.`);
      }
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    button.disabled = true;
    button.textContent = "Sending…";
    const data = Object.fromEntries(new FormData(form).entries());
    delete data.photos;
    data.photos = photos;

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) throw new Error(out.error || "send failed");
      form.reset();
      photos = [];
      if (previews) previews.innerHTML = "";
      show("ok", "Request sent. We'll call or email you within one business day.");
    } catch (err) {
      // While the yellow preview banner is on the page, the form only pretends to send.
      if (isPreview) {
        show("ok", "Preview only: on the live site, this form emails the request and photos to Trace, texts his phone, and adds a row to his lead sheet.");
      } else {
        show("err", "Your request didn't go through. Please call us instead, or try again in a minute.");
      }
    } finally {
      button.disabled = false;
      button.textContent = "Send quote request";
    }
  });
}
