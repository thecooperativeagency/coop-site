# coop-site

Owned rebuild of The Cooperative Agency site. Canonical domain: **https://thecoopbrla.com** (do not cut DNS until Lance OKs).

- Stack: static HTML/CSS + Cloudflare Pages Function (`functions/api/contact.js`)
- Assets: `public/images/`
- Local work: `~/.hermes/work/coop-site`
- Preview: GitHub Pages or Cloudflare `*.pages.dev` — not the live domain

## Pages
- `/` home
- `/faq.html`
- `/contact.html`
- `/field-media.html` (kept in repo, unlinked in nav/footer until Lance approves a customer rewrite)

## Contact form
POST `/api/contact` (functions/api/contact.js): stores every lead in D1 `coop-leads`, drafts a reply with Workers AI grounded in `knowledge/`, emails Lance a notification with mailto/tel/sms links, and emails the inquirer only when `AUTOREPLY_LIVE=true`. Optional `LEAD_WEBHOOK_URL` + `LEAD_WEBHOOK_AUTH` post the lead JSON to chat.

## Workflow
1. Edit in repo, push `main`
2. Copper redeploys Cloudflare preview
3. Lance approves → attach thecoopbrla.com
4. DNS cut only after that

## Maintaining robots.txt, llms.txt and sitemap.xml

When you add a service, product, job posting, or sales page: add its URL to `sitemap.xml`, add it to `llms.txt` under the matching section (Services, Products, or Careers — create the section if it doesn't exist yet), and remove any `Disallow` line for it in `robots.txt`.

## Knowledge docs
The contact-form AI auto-responder is grounded only in `knowledge/*.md`. New site offerings get a matching knowledge doc. Lines containing `TODO` are not sent to the model.
