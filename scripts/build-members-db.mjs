/*
 * Builds data/members.json — the crew "database" — from the scraped roster in
 * data/crew-raw.json (see scrape-crew.mjs). Each member gets a hardcoded speech
 * bubble and a small set of recent posts. Post timestamps are stored as
 * `minutesAgo` so the SSR loader always presents them as "within 24 hours".
 *
 * Run:  node scripts/scrape-crew.mjs && node scripts/build-members-db.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '../data');
const raw = JSON.parse(readFileSync(resolve(dataDir, 'crew-raw.json'), 'utf8'));

const BUBBLES = [
  'Ship or die, mateys! ⚓',
  'Pushed to prod. No survivors.',
  'Day 47 of building in public 🏴‍☠️',
  'Shipped a feature before breakfast',
  'MRR is climbing, hoist the sails!',
  'Who needs sleep when you can ship',
  'Found a bug. Walked the plank.',
  'New landing page is LIVE 🚢',
  'Launching on Product Hunt tomorrow',
  'Closed 3 customers this morning',
  'Refactored the whole hull today',
  'Ahoy! Just hit 100 users 🎉',
  'Storm’s rough but we keep sailing',
  'Demo day — wish me luck crew',
  'Cold DMs > cold feet',
  'Shipping beats perfect, always',
  'Another day, another deploy ⚔️',
  'Talked to 10 users today',
  'The roadmap is a treasure map',
  'Burned the boats. Only forward.',
];

const POST_POOL = [
  'Just shipped a feature I’ve been putting off for weeks. Felt impossible yesterday, done today. Momentum is everything.',
  'Reminder: nobody cares about your tech stack. They care if it solves their problem. Ship the ugly version.',
  'Day in the life of an indie hacker: wake up, check Stripe, cry a little, write code, ship, repeat.',
  'Spent 2 hours debugging. The fix was one line. The bug was me.',
  'Hit a new MRR record this month. Slow, boring, compounding growth is underrated.',
  'Launched my side project to the Ship or Die crew first. The feedback loop here is unreal.',
  'Marketing tip that actually worked: talk to 10 users this week. Not 100. Just 10. Really listen.',
  'The hardest part of building a product is not the code. It’s shipping when you’re scared it’s not ready.',
  'Posting my revenue publicly keeps me accountable. $0 → $400 MRR in two months. Onward.',
  'Killed a feature today that nobody used. Deleting code feels better than writing it.',
  'My biggest unlock this year: shipping daily, even if it’s tiny. Consistency > intensity.',
  'Customer just emailed “this saved me hours.” That one line is worth more than 1000 likes.',
  'Cold outreach is brutal but it works. 50 DMs, 4 replies, 1 customer. Math checks out.',
  'Built the whole MVP in a weekend. Ugly, buggy, but live. You can’t improve what doesn’t exist.',
  'If you’re waiting for the perfect moment to launch, this is your sign. Ship it today.',
  'Note to self: stop adding settings nobody asked for and fix the onboarding instead.',
  'Three months ago this was a Notion doc. Today it has paying users. Keep going.',
  'The Ship or Die accountability is no joke. Posted my goal, now I have to actually do it.',
];

const pick = (arr, i) => arr[((i % arr.length) + arr.length) % arr.length];

// Ship or Die rank, derived from the number of startups shipped.
const rankFor = (shipped) => {
  if (shipped >= 5) return 'Legend';
  if (shipped >= 3) return 'Captain';
  if (shipped >= 1) return 'Shipper';
  return 'Noob';
};

const members = raw.map((m, index) => {
  const postCount = 2 + ((index * 7) % 3); // 2–4 posts
  const posts = Array.from({ length: postCount }).map((_, p) => ({
    id: `${m.slug}-${p}`,
    text: pick(POST_POOL, index * 5 + p * 3),
    minutesAgo: 35 + ((index * 53 + p * 197) % 1320),
    likes: 8 + ((index * 31 + p * 17) % 240),
    reposts: (index * 13 + p * 7) % 40,
    replies: 1 + ((index * 11 + p * 5) % 28),
    url: m.handle ? `https://x.com/${m.handle}` : `https://www.ship-or-die.com/u/${m.slug}`,
  }));

  const startupsShipped = m.startupsShipped ?? 0;

  return {
    slug: m.slug,
    handle: m.handle || m.slug,
    name: m.name,
    startupsShipped,
    status: m.status || 'On Deck',
    rank: rankFor(startupsShipped),
    avatar: `/crew-avatars/${m.slug}.png`,
    portraitSrc: m.portraitUrl || '',
    profileUrl: m.handle ? `https://x.com/${m.handle}` : `https://www.ship-or-die.com/u/${m.slug}`,
    bubble: pick(BUBBLES, index),
    posts,
  };
});

writeFileSync(resolve(dataDir, 'members.json'), JSON.stringify({ members }, null, 2) + '\n');
console.log(`Wrote ${members.length} crew members to data/members.json`);
console.log(`  with website portrait: ${members.filter((m) => m.portraitSrc).length}`);
