/*
 * Downloads each crew member's avatar into public/crew-avatars/<slug>.png so the
 * textures load same-origin (no CORS taint on the WebGL faces).
 *
 * Priority: the website's own pirate portrait (CloudFront), then the member's
 * X/Twitter avatar via unavatar.io as a fallback.
 *
 * Run:  node scripts/download-avatars.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../public/crew-avatars');
const { members } = JSON.parse(readFileSync(resolve(here, '../data/members.json'), 'utf8'));
const CONCURRENCY = 8;
const AVATAR_PX = 256; // source portraits are 1024px/~1.6MB; downscale so 215 of them don't tank page load

mkdirSync(outDir, { recursive: true });

let resizeWarned = false;

// Downscale in place with sips (macOS). Skips with a one-time warning elsewhere.
const resizeAvatar = (path) => {
  try {
    execFileSync('sips', ['-Z', String(AVATAR_PX), path], { stdio: 'ignore' });
  } catch {
    if (!resizeWarned) {
      resizeWarned = true;
      console.warn(`[avatars] sips not available — avatars left at full size. Resize them to ${AVATAR_PX}px before deploying.`);
    }
  }
};

const fetchImage = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 shipordie-avatar-fetch' } });

  if (!res.ok) throw new Error(`${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());

  if (buf.length < 512) throw new Error('too small');

  return buf;
};

const saveAvatar = async (member) => {
  const candidates = [
    member.portraitSrc,
    member.handle && `https://unavatar.io/twitter/${member.handle}`,
    member.handle && `https://unavatar.io/x/${member.handle}`,
    // Deterministic generated avatar so every pirate has a face, even with no source.
    `https://api.dicebear.com/9.x/adventurer/png?seed=${encodeURIComponent(member.slug)}&size=400&backgroundColor=b6e3f4,c0aede,ffd5dc,d1d4f9`,
  ].filter(Boolean);

  for (const url of candidates) {
    try {
      const buf = await fetchImage(url);
      const path = resolve(outDir, `${member.slug}.png`);

      writeFileSync(path, buf);
      resizeAvatar(path);

      const source = url.includes('cloudfront') ? 'website' : url.includes('dicebear') ? 'generated' : 'twitter';

      return { slug: member.slug, source };
    } catch {
      // try next candidate
    }
  }

  return { slug: member.slug, source: 'FAILED' };
};

const runPool = async (items, worker) => {
  const results = [];
  let cursor = 0;

  const runners = Array.from({ length: CONCURRENCY }).map(async () => {
    while (cursor < items.length) {
      const i = cursor;

      cursor += 1;
      results[i] = await worker(items[i]);
    }
  });

  await Promise.all(runners);

  return results;
};

const results = await runPool(members, saveAvatar);
const counts = results.reduce((acc, r) => ({ ...acc, [r.source]: (acc[r.source] || 0) + 1 }), {});

console.log('Avatar sources:', JSON.stringify(counts));

const failed = results.filter((r) => r.source === 'FAILED');

if (failed.length) console.log('Failed:', failed.map((f) => f.slug).join(', '));
