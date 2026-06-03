// Pre-seeds the Cloudflare KV store with a full 24h backfill of the crew X-list
// posts, so the ship shows real tweets immediately without waiting for the hourly
// cron. Writes the same key/shape the app reads (lib/live-posts-store.ts).
//
// Usage (TWITTER_API_API_KEY must be set):
//   TWITTER_API_API_KEY=xxx pnpm seed-kv             # local Miniflare KV (shared with `next dev`)
//   TWITTER_API_API_KEY=xxx pnpm seed-kv --remote    # production KV (needs `wrangler login` / CLOUDFLARE_API_TOKEN)

import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Keep these three in sync with lib/twitter-list.ts, lib/live-posts-store.ts and wrangler.jsonc.
const LIST_ID = '2059658620963348934';
const STORE_KEY = 'crew-list:v1';
const KV_BINDING = 'KV';

const TWITTER_API_URL = 'https://api.twitterapi.io';
const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_PAGES = 200; // backfill walks the whole 24h window, far deeper than the hourly top-up

const remote = process.argv.includes('--remote');
const apiKey = process.env.TWITTER_API_API_KEY;

if (!apiKey) {
  console.error('TWITTER_API_API_KEY is required. Run: TWITTER_API_API_KEY=xxx pnpm seed-kv');
  process.exit(1);
}

const normalizeHandle = (handle = '') => handle.trim().replace(/^@/, '').toLowerCase();

const toPost = (tweet) => {
  if (!tweet.id || !tweet.text) return null;

  const published = tweet.createdAt ? new Date(tweet.createdAt) : null;

  return {
    id: tweet.id,
    text: tweet.text,
    publishedAt: published && !Number.isNaN(published.getTime()) ? published.toISOString() : new Date().toISOString(),
    likes: tweet.likeCount ?? 0,
    reposts: tweet.retweetCount ?? 0,
    replies: tweet.replyCount ?? 0,
    url: tweet.url ?? `https://x.com/${normalizeHandle(tweet.author?.userName)}/status/${tweet.id}`,
  };
};

const sinceUnix = Math.floor((Date.now() - WINDOW_MS) / 1000);
const byHandle = new Map();
let cursor = '';
let pages = 0;
let total = 0;

console.log(`Fetching list ${LIST_ID} (last 24h)...`);

while (pages < MAX_PAGES) {
  const url =
    `${TWITTER_API_URL}/twitter/list/tweets` +
    `?listId=${LIST_ID}&sinceTime=${sinceUnix}&includeReplies=false` +
    (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '');

  const response = await fetch(url, { headers: { 'X-API-Key': apiKey } });

  if (!response.ok) {
    console.error(`\ntwitterapi.io responded ${response.status}: ${(await response.text()).slice(0, 200)}`);
    break;
  }

  const data = await response.json();
  const tweets = Array.isArray(data.tweets) ? data.tweets : [];

  for (const tweet of tweets) {
    if (tweet.isReply || tweet.retweeted_tweet) continue;

    const handle = normalizeHandle(tweet.author?.userName);
    const post = toPost(tweet);

    if (!handle || !post) continue;

    let bucket = byHandle.get(handle);

    if (!bucket) {
      bucket = [];
      byHandle.set(handle, bucket);
    }

    bucket.push(post);
    total += 1;
  }

  pages += 1;
  process.stdout.write(`\r  page ${pages} · ${total} posts · ${byHandle.size} handles`);

  if (!data.has_next_page || !data.next_cursor || tweets.length === 0) break;

  cursor = data.next_cursor;
}

console.log('');

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const scope = remote ? '--remote' : '--local';

// Read the existing archive so we MERGE (never wipe) — the archive accumulates,
// matching the runtime sync. wrangler prints a banner before the value, so slice
// from the first '{'.
const readExisting = () => {
  try {
    const out = execFileSync('pnpm', ['exec', 'wrangler', 'kv', 'key', 'get', '--binding', KV_BINDING, scope, STORE_KEY], {
      cwd: appDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const json = out.slice(out.indexOf('{'));

    return JSON.parse(json).posts ?? {};
  } catch {
    return {}; // key doesn't exist yet
  }
};

const existing = readExisting();

// Merge fetched (this run) with whatever is already archived — dedupe by id, keep
// everything. Handles only in `existing` get carried over; handles only in this
// fetch are already in `byHandle`.
for (const [handle, archivedPosts] of Object.entries(existing)) {
  const fetched = byHandle.get(handle) ?? [];
  const fetchedIds = new Set(fetched.map((p) => p.id));
  const merged = [...fetched, ...archivedPosts.filter((p) => !fetchedIds.has(p.id))];

  merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  byHandle.set(handle, merged);
}

const payload = { syncedAt: new Date().toISOString(), posts: Object.fromEntries(byHandle) };
const tmpFile = join(tmpdir(), 'shipordie-kv-seed.json');
const totalArchived = [...byHandle.values()].reduce((sum, list) => sum + list.length, 0);

writeFileSync(tmpFile, JSON.stringify(payload));

try {
  execFileSync('pnpm', ['exec', 'wrangler', 'kv', 'key', 'put', '--binding', KV_BINDING, scope, STORE_KEY, '--path', tmpFile], {
    cwd: appDir,
    stdio: 'inherit',
  });
  console.log(`\nMerged ${total} fetched posts into ${remote ? 'remote' : 'local'} KV archive "${STORE_KEY}" (total now ${totalArchived} across ${byHandle.size} handles).`);
} finally {
  unlinkSync(tmpFile);
}
