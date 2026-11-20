# HeadsApp

**Know when your stack gets hacked. Before your users do.**

HeadsApp watches security sources 24/7 and sends you a Telegram message when a security incident hits a tool you use: Vercel, Supabase, Stripe, nginx, your npm packages, anything in the catalog.

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
| Telegram bot | "Connect (local mode)" links a pretend chat; messages print to the server console and show under **Alerts** |
| OpenRouter | Alerts use built-in summaries |

Production builds never enable dev login or local-mode Telegram.

## How it works

1. **Sources** (every 15 min): GitHub Security Advisories (npm, incl. malware), CISA Known Exploited Vulnerabilities, ~20 vendor status pages, and 5 security news feeds.
2. **Matching**: incidents are matched to a catalog of ~85 tools plus any npm package, using exact package names, CISA vendor/product data, and conservative headline matching.
3. **Low noise**: only fresh incidents are pushed, once per user, at or above your severity threshold, one message per CVE across sources, outages and weekly roundups ignored, and a daily cap. Everything else is in the dashboard.
4. **Delivery**: a Telegram bot message with "what happened" and "what to do". Users connect by pressing Start in the bot via a one-time link, so there are no codes to type. They can send /stop to pause.

## Self-hosting (DigitalOcean or any Docker host)

```bash
git clone <this repo> && cd headsapp
cp .env.example .env    # fill in Auth0, TELEGRAM_BOT_TOKEN, SESSION_SECRET, APP_BASE_URL, DOMAIN
docker compose up -d --build
```

Point your domain's DNS A record at the server first: Caddy gets the TLS certificate automatically. MongoDB is not exposed outside the Docker network.

See `.env.example` for all settings.

### Telegram bot

1. In Telegram, message [@BotFather](https://t.me/BotFather), send `/newbot`, and pick a name and a username ending in `bot`.
2. Put the token it gives you in `TELEGRAM_BOT_TOKEN`.
3. Optional: `/setuserpic` and `/setdescription` in BotFather to brand it.

The app receives bot updates by long polling, so no webhook or public URL is needed. Run one app instance per bot token (Telegram allows a single poller); use a separate bot for local development.

## Project layout

```
src/app          routes (pages + API)
src/lib          core: auth, db, sources, matching, alerts, Telegram bot
src/components   UI
src/edition      extension points (the hosted edition overrides only this folder)
```

## Security

- Auth0 sessions (encrypted, httpOnly). Dev login only exists in non-production builds without Auth0.
- Same-origin check on every state-changing API call, JSON-only bodies, zod validation.
- Telegram is connected through single-use, hashed, 15-minute links; only private chats are accepted. Link creation and test sends are rate limited.
- Strict security headers (CSP, HSTS, frame-ancestors none).
- Outbound requests only go to fixed source URLs; nothing user-supplied is fetched.
- Containers run as non-root with a read-only filesystem.

Found a vulnerability? Please email security@headsapp.dev instead of opening an issue.

## License

MIT
