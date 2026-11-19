# HeadsApp

**Know when your stack gets hacked. Before your users do.**

HeadsApp watches security sources 24/7 and sends you a WhatsApp message when a security incident hits a tool you use: Vercel, Supabase, Stripe, nginx, your npm packages, anything in the catalog.

This is the open-source, self-hostable edition. A hosted version runs at [headsapp.dev](https://headsapp.dev).

## Run it locally (one command)

Requirements: Node 20.9+, Docker.

```bash
npm install
npm run dev
```

That starts MongoDB in Docker, then the app at http://localhost:3000. If a port is taken, the next free one is used and printed.

No accounts or keys needed locally:

| Integration | Without credentials (local) |
| --- | --- |
| Auth0 | "Continue" signs you in as a local dev user |
| Twilio WhatsApp | Messages print to the server console and show in the app's **Messages** panel |
| Twilio Verify | The 6-digit code is shown on screen |
| OpenRouter | Alerts use built-in summaries |

Production builds never enable dev login or on-screen codes.

## How it works

1. **Sources** (every 15 min): GitHub Security Advisories (npm, incl. malware), CISA Known Exploited Vulnerabilities, ~20 vendor status pages, and 5 security news feeds.
2. **Matching**: incidents are matched to a catalog of ~85 tools plus any npm package, using exact package names, CISA vendor/product data, and conservative headline matching.
3. **Low noise**: only fresh incidents are pushed, once per user, at or above your severity threshold, one message per CVE across sources, outages and weekly roundups ignored, and a daily cap. Everything else is in the dashboard.
4. **Delivery**: WhatsApp via Twilio, with "what happened" and "what to do".

## Self-hosting (DigitalOcean or any Docker host)

```bash
git clone <this repo> && cd headsapp
cp .env.example .env    # fill in Auth0, Twilio, SESSION_SECRET, APP_BASE_URL, DOMAIN
docker compose up -d --build
```

Point your domain's DNS A record at the server first: Caddy gets the TLS certificate automatically. MongoDB is not exposed outside the Docker network.

See `.env.example` for all settings.

## Project layout

```
src/app          routes (pages + API)
src/lib          core: auth, db, sources, matching, alerts, WhatsApp, verification
src/components   UI
src/edition      extension points (the hosted edition overrides only this folder)
```

## Security

- Auth0 sessions (encrypted, httpOnly). Dev login only exists in non-production builds without Auth0.
- Same-origin check on every state-changing API call, JSON-only bodies, zod validation.
- Phone numbers verified via Twilio Verify; codes and sends are rate limited.
- Strict security headers (CSP, HSTS, frame-ancestors none).
- Outbound requests only go to fixed source URLs; nothing user-supplied is fetched.
- Containers run as non-root with a read-only filesystem.

Found a vulnerability? Please email security@headsapp.dev instead of opening an issue.

## License

MIT
