/*
 * Scrapes the full Ship or Die crew (~200 members) from ship-or-die.com.
 *
 * The homepage lists every crew member as a `/u/<slug>` link; each profile page
 * carries the member's display name, X/Twitter handle and the website's own
 * pirate-portrait avatar (hosted on CloudFront). We fetch the roster, then each
 * profile, and write the raw result to data/crew-raw.json.
 *
 * Run:  node scripts/scrape-crew.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '../data');
const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh) shipordie-crew-scrape' };
const CDN = 'https://djinh5srvzpwp.cloudfront.net';
const CONCURRENCY = 8;

const fetchText = async (url) => {
  const res = await fetch(url, { headers: UA });

  if (!res.ok) throw new Error(`${res.status} ${url}`);

  return res.text();
};

const extractSlugs = (html) => [...new Set([...html.matchAll(/\/u\/([a-z0-9-]+)/g)].map((m) => m[1]))];

const parseProfile = (slug, html) => {
  const rawTitle = (html.match(/<title>([^<]+)<\/title>/) || [])[1] || '';
  const name = rawTitle
    .replace(/\s*\|\s*Ship or Die\s*$/, '')
    .replace(/^Captain\s+/i, '')
    .trim();

  const handle =
    [...html.matchAll(/(?:twitter|x)\.com\\?\/([A-Za-z0-9_]{2,20})/g)]
      .map((m) => m[1])
      .find((u) => !/^(intent|share|home|i|hashtag|ship|search|explore)$/i.test(u)) || '';

  const portrait = (html.match(/avatars\/[a-f0-9]{24}\/portrait-[0-9]+\.png/) || [])[0] || '';

  // Authoritative shipped count: the number in the "Shipped startups" heading.
  // Handle the current rendered-HTML form (`Shipped startups …<span>N</span>`) and
  // the older RSC form (`…"children":N`). NOT the trophy list ("Shipped 3 startups").
  const json = html.replace(/\\"/g, '"');
  const shippedHtml = json.match(/Shipped startups[\s\S]{0,160}?>\s*(\d+)\s*<\/span>/);
  const shippedRsc = json.match(/Shipped startups"[\s\S]{0,200}?"children":\s*(\d+)\s*\}/);
  const startupsShipped = parseInt(shippedHtml?.[1] ?? shippedRsc?.[1] ?? '0', 10);

  // The crew's real status is the badge shown next to their name. It is the FIRST
  // "On Deck" / "At Risk" / "Overboard" in the payload; the later three are the
  // legend that explains all states. (Deadline-based guessing was wrong — e.g.
  // davy-bones has no deadline yet reads "Overboard".)
  const statusMatch = json.match(/"children":"(On Deck|At Risk|Overboard)"/);
  const status = statusMatch ? statusMatch[1] : 'On Deck';

  return {
    slug,
    name: name || slug,
    handle,
    portraitUrl: portrait ? `${CDN}/${portrait}` : '',
    startupsShipped: Number.isFinite(startupsShipped) ? startupsShipped : 0,
    status,
  };
};

const runPool = async (items, worker) => {
  const results = [];
  let cursor = 0;

  const runners = Array.from({ length: CONCURRENCY }).map(async () => {
    while (cursor < items.length) {
      const index = cursor;

      cursor += 1;

      try {
        results[index] = await worker(items[index], index);
      } catch (error) {
        results[index] = { slug: items[index], error: error.message };
      }
    }
  });

  await Promise.all(runners);

  return results;
};

const main = async () => {
  console.log('Fetching crew roster...');

  // The homepage and the /crew page each list a slightly different subset of the
  // crew, so union both to capture every member with a public profile.
  const [home, crew] = await Promise.all([fetchText('https://www.ship-or-die.com/'), fetchText('https://www.ship-or-die.com/crew')]);
  const slugs = [...new Set([...extractSlugs(home), ...extractSlugs(crew)])];

  console.log(`Found ${slugs.length} crew slugs. Fetching profiles...`);

  let done = 0;
  const members = await runPool(slugs, async (slug) => {
    const html = await fetchText(`https://www.ship-or-die.com/u/${slug}`);
    const member = parseProfile(slug, html);

    done += 1;

    if (done % 25 === 0) console.log(`  ...${done}/${slugs.length}`);

    return member;
  });

  const ok = members.filter((m) => m && !m.error && m.name);
  const failed = members.filter((m) => m && m.error);

  mkdirSync(dataDir, { recursive: true });
  writeFileSync(resolve(dataDir, 'crew-raw.json'), JSON.stringify(ok, null, 2) + '\n');

  console.log(`\nWrote ${ok.length} members to data/crew-raw.json`);
  console.log(`  with portrait: ${ok.filter((m) => m.portraitUrl).length}`);
  console.log(`  with handle:   ${ok.filter((m) => m.handle).length}`);
  console.log(`  total startups shipped: ${ok.reduce((sum, m) => sum + (m.startupsShipped || 0), 0)}`);

  if (failed.length) console.log(`  failed: ${failed.length} (${failed.slice(0, 5).map((f) => f.slug).join(', ')}...)`);
};

main();
