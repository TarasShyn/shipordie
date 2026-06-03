# Ship or Die 🏴‍☠️

A first-person 3D pirate ship, crewed by the [Ship or Die](https://www.ship-or-die.com) indie hackers. Walk the storm-tossed decks, meet the crew, and click any pirate to read what they shipped in the last 24 hours.

Built with Next.js (App Router) + React Three Fiber, deployed to Cloudflare Workers via OpenNext.

## Stack

- **Next.js 16** (App Router, RSC/SSR) + **React 19**
- **react-three-fiber** + **drei** for the 3D scene
- **Tailwind CSS v4**
- **Cloudflare Workers** (OpenNext) + **KV** for live post storage
- **twitterapi.io** for pulling the crew's X posts

## Develop

```bash
pnpm install
pnpm dev            # http://localhost:5183
```

The crew roster is a committed snapshot (`data/members.json`) read via SSR. Each member shows demo posts until real ones are synced from the X list.

## Live posts (optional)

Posts come from an X/Twitter list, fetched hourly and stored in Cloudflare KV.

1. Set `TWITTER_API_API_KEY` (twitterapi.io) in `.env.local`.
2. Backfill KV once: `TWITTER_API_API_KEY=xxx pnpm seed-kv` (`--remote` for production KV).
3. The cron route `GET /api/cron/sync-posts` pulls the **last hour** and merges new posts into KV (rolling 24h retention). Trigger it hourly (Cloudflare Cron Trigger or an external scheduler). Guard it in production with `CRON_SECRET`.

SSR reads KV and overlays live posts onto the roster; members with no recent posts keep their demo posts.

## Regenerate the crew roster

```bash
pnpm scrape   # scrape-crew → build-members-db → download-avatars
```

## Deploy (Cloudflare)

```bash
pnpm preview   # local OpenNext preview
pnpm deploy    # build + deploy the worker

wrangler secret put TWITTER_API_API_KEY
wrangler secret put CRON_SECRET
```

The KV namespace and hourly cron trigger are configured in `wrangler.jsonc`.
