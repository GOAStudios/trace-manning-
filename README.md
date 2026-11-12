# Manning General Contractors website

A six-page website for a general contractor with three service divisions (Residential Construction, Estimating & Preconstruction, Construction Consulting): Home, Services, Projects, About, FAQ and Get a quote. It's plain HTML and CSS with no build step, hosted on Cloudflare.

**What it does**
- Quote form that emails each request with the customer's photos attached, texts the owner, and logs the lead in a Google Sheet
- A preferred walkthrough date and time on the form, plus an optional online booking link
- Before/after photo sliders
- A service-area town list and map
- An FAQ page
- A floating "Call now" button on phones
- Local SEO built in: business schema, FAQ schema, sitemap and robots.txt
- Free visitor stats through Cloudflare Web Analytics

> **Status: preview.** The name and phone number are real. Photos, reviews, license number, email, company history, towns and FAQ answers are samples. To find everything that needs replacing, search the files for `example.com`, `GC-000000`, `Sample reviewer`, `class="photo"`, `TOWNS` and `2008`.

## What's where

| File | What it is |
|---|---|
| `public/index.html` | Home page |
| `public/services.html` | Services |
| `public/projects.html` | Before/after sliders and project gallery with filters |
| `public/about.html` | Owner story, license and insurance, service area and map |
| `public/faq.html` | Frequently asked questions |
| `public/contact.html` | Quote form (walkthrough time and photo upload) |
| `public/404.html` | "Page not found" page |
| `public/styles.css` | Colors, fonts and layout. Colors are at the top. |
| `public/script.js` | Menu, sliders, map, form. The booking link setting is at the top. |
| `public/sitemap.xml`, `robots.txt` | For Google. Replace `www.example.com` with the real domain. |
| `public/images/` | Job photos go here (create the folder) |
| `src/worker.js` | Receives the quote form: email, text alert, lead sheet |
| `tools/lead-sheet.gs` | Google Sheet script for the lead tracker |
| `wrangler.jsonc` | Cloudflare settings |

The header and footer are copied into every page. If the phone number changes, change it in every HTML file. The town list and the business info for Google are in the `<script type="application/ld+json">` block on `index.html`.

## Going live (one-time setup)

### 1. GitHub
If this repo was transferred to you, you're done.

### 2. Buy the domain on Cloudflare
Cloudflare dashboard → **Domain Registration → Register Domains**.

### 3. Connect the site to Cloudflare
1. **Workers & Pages → Create → Import a repository**, connect GitHub and pick this repo. Leave the build command empty. The deploy command is `npx wrangler deploy`.
2. Deploy. Every change pushed to GitHub now redeploys the site in about a minute.
3. Worker → **Settings → Domains & Routes → Add → Custom domain**: add the domain and `www.` too.
4. Replace `https://www.example.com` in `index.html`, `sitemap.xml` and `robots.txt` with the real domain.

### 4. Quote form email (required)
1. Make a free account at resend.com. **Domains → Add domain**, then add the DNS records it shows to Cloudflare.
2. **API Keys → Create API key** (Sending access).
3. Cloudflare → Worker → **Settings → Variables and Secrets → Add**: type **Secret**, name `RESEND_API_KEY`.
4. In `wrangler.jsonc`, set `TO_EMAIL` (where leads go) and `FROM_EMAIL` (for example `quotes@yourdomain.com`).
5. Delete the yellow preview banner line from every HTML file. While the banner is there, the form only pretends to send.
6. Send a test request with a photo attached.

### 5. Text alerts (optional)
1. Make a Twilio account and buy a local number (about $1–2/month plus a fraction of a cent per text).
2. For texting US phones, Twilio requires a one-time **A2P 10DLC registration**. Choose the **Sole Proprietor** option. Approval can take from a few days to a couple of weeks and has small fees.
3. Add the secrets `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` in Cloudflare.
4. In `wrangler.jsonc`, set `TWILIO_FROM` to the Twilio number. `ALERT_PHONE` is already set to Trace's cell.

If this isn't set up, the email still arrives as usual. The text is just skipped.

### 6. Lead tracker sheet (optional)
Follow the steps at the top of `tools/lead-sheet.gs`. It takes about 5 minutes. Each quote request becomes a row with Status and Notes columns he can update from his phone.

### 7. Online booking (optional)
The form already asks for a preferred date and time of day. For real calendar booking, make a free Cal.com or Calendly account connected to his phone's calendar, then paste the booking link into `BOOKING_URL` at the top of `public/script.js`.

### 8. Visitor stats
Cloudflare dashboard → **Analytics & Logs → Web Analytics → Add a site**. Pick the domain and choose automatic setup. No code changes are needed. It shows visits, pages and where visitors come from.

### 9. Google Business Profile (biggest win for "contractor near me" searches)
1. Go to business.google.com and create or claim **Manning General Contractors**. Use the same name and phone number as the website.
2. Category: **General contractor**. Add the service area towns, hours, website link and at least 10 job photos.
3. Google verifies by video or postcard.
4. Ask every happy customer for a Google review. That's what moves him up in local results.
5. In Google Search Console (search.google.com/search-console), add the domain and submit `sitemap.xml`.

**Never put an API key or password in any file in this repo.** The repo is public, so keys belong only in Cloudflare's Secrets.

## Making changes with Claude

Paste this into Claude Code (or a Claude chat connected to this GitHub repo), then describe the change you want:

```
This repo is my contractor business website (Manning General Contractors).
It's plain HTML/CSS/JS in /public, deployed to Cloudflare Workers from GitHub
(pushing to main redeploys it). src/worker.js handles the quote form: it emails
leads with photos via Resend, texts me via Twilio, and logs to a Google Sheet.
All keys are Cloudflare secrets and must never be written into any file.

Rules:
- Keep it plain HTML/CSS/JS, no frameworks or build tools.
- The header and footer are repeated in every HTML page; keep them identical.
- Photos go in public/images/. Resize to max 1600px wide, JPG, under 400 KB,
  and always write a real alt description.
- Keep the existing look (deep red; colors and fonts in public/styles.css :root).
- If you add a page, add it to the nav, the footer and sitemap.xml.
- Check the page on a phone-sized screen before finishing.
- Commit with a clear message and push to main.

The change I want:
```

### Adding photos by hand
- **Gallery photo:** upload to `public/images/` (**Add file → Upload files**). In `projects.html`, copy a `<figure>` block and replace its `<div class="photo">…</div>` with `<img class="photo-img" src="images/your-photo.jpg" alt="Short description">`. Set `data-type` to `kitchen`, `bath`, `addition`, `newhome` or `outdoor`.
- **Before/after:** in a `.ba` block, replace the two `<div class="photo ba-before">` and `<div class="photo ba-after">` with `<img class="ba-before" src="images/before.jpg" alt="Before: …">` and `<img class="ba-after" src="images/after.jpg" alt="After: …">`. Use two photos taken from the same spot.
