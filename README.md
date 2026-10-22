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
POST `/api/contact`. Set Pages env `FORMSPREE_ENDPOINT` to the Formspree form URL (`https://formspree.io/f/xxxx`). Mail goes to `lance@thecoopbrla.com`.

## Workflow
1. Edit in repo, push `main`
2. Copper redeploys Cloudflare preview
3. Lance approves → attach thecoopbrla.com
4. DNS cut only after that

## Maintaining robots.txt, llms.txt and sitemap.xml

When you add a service, product, job posting, or sales page: add its URL to `sitemap.xml`, add it to `llms.txt` under the matching section (Services, Products, or Careers — create the section if it doesn't exist yet), and remove any `Disallow` line for it in `robots.txt`.
