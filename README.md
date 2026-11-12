# Contractor website

A five-page website for a general contractor: Home, Services, Projects, About, and Get a quote. It's plain HTML and CSS with no build step. It's hosted on Cloudflare, and the quote form emails each request to the owner through Resend.

> **Status: preview.** The business name, phone, photos and text are samples. Search the files for `Hartwell`, `555`, `example.com`, `Springfield`, `GC-000000` and `[Owner name]` to find everything that needs to be replaced.

## What's where

| File | What it is |
|---|---|
| `public/index.html` | Home page |
| `public/services.html` | Services |
| `public/projects.html` | Project photos, with filter buttons |
| `public/about.html` | About the owner, license, insurance |
| `public/contact.html` | Quote request form |
| `public/404.html` | "Page not found" page |
| `public/styles.css` | All colors, fonts and layout. Colors are at the top. |
| `public/script.js` | Mobile menu, project filter, form sending |
| `public/images/` | Put job photos here (create the folder) |
| `src/worker.js` | Receives the quote form and emails it |
| `wrangler.jsonc` | Cloudflare settings (where to send form emails) |

The header and footer are copied into every page. If the phone number changes, change it in all six HTML files.

## Going live (one-time setup)

### 1. Get the code into your GitHub
If this repo was transferred to you, you're done. Otherwise create a repo and upload these files.

### 2. Buy the domain on Cloudflare
Cloudflare dashboard → **Domain Registration → Register Domains**.

### 3. Connect the site to Cloudflare
1. Cloudflare dashboard → **Workers & Pages → Create → Import a repository**.
2. Connect GitHub and pick this repo. Leave the build command empty. The deploy command is `npx wrangler deploy`.
3. Deploy. The site is now live at a `*.workers.dev` address, and every change pushed to GitHub redeploys it automatically.
4. In the Worker → **Settings → Domains & Routes → Add → Custom domain**, enter your domain (and `www.` too).

### 4. Set up the quote form email (Resend)
1. Make a free account at resend.com.
2. **Domains → Add domain**, enter your domain, and add the DNS records it shows in Cloudflare (Resend can do this automatically for Cloudflare domains).
3. **API Keys → Create API key** (permission: Sending access). Copy it.
4. In Cloudflare → your Worker → **Settings → Variables and Secrets → Add**:
   - Type **Secret**, name `RESEND_API_KEY`, value = the key.
5. In `wrangler.jsonc`, set `TO_EMAIL` to where leads should go and `FROM_EMAIL` to something like `quotes@yourdomain.com`. Commit the change.
6. Remove the yellow preview banner line from every HTML file. While the banner is there, the form only pretends to send.
7. Submit a test request on the live site and check your inbox.

**Never put an API key in any file in this repo.** The repo may be public, so keys belong only in Cloudflare's Secrets.

## Making changes with Claude

Paste this into Claude Code (or a Claude chat connected to this GitHub repo), then describe the change you want:

```
This repo is my contractor business website. It's plain HTML/CSS in /public,
deployed to Cloudflare Workers from GitHub (pushing to main redeploys it).
src/worker.js handles the quote form and emails leads with Resend; the API key
is a Cloudflare secret and must never be written into any file.

Rules:
- Keep it plain HTML/CSS/JS, no frameworks or build tools.
- The header and footer are repeated in every HTML page; keep them identical.
- Photos go in public/images/. Resize to max 1600px wide, JPG, under 400 KB,
  and always write a real alt description.
- Keep the existing look (colors and fonts in public/styles.css :root).
- Check the page on a phone-sized screen before finishing.
- Commit with a clear message and push to main.

The change I want:
```

### Adding a project photo by hand
1. Upload the photo to `public/images/` on GitHub (**Add file → Upload files**).
2. In `projects.html`, copy one `<figure>` block and replace its `<div class="photo">…</div>` with:
   `<img class="photo-img" src="images/your-photo.jpg" alt="Short description of the photo">`
3. Edit the caption and set `data-type` to `kitchen`, `bath`, `addition`, `newhome` or `outdoor`.
4. Commit. The site updates in about a minute.
