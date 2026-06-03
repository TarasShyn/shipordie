import { NextRequest, NextResponse } from 'next/server';
import { mergeLivePosts } from '@/lib/live-posts-store';
import { getCrew } from '@/lib/members';
import { CREW_LIST_ID, fetchCrewListPosts } from '@/lib/twitter-list';

export const dynamic = 'force-dynamic';

// Hourly sync endpoint. A Cloudflare Cron Trigger (or any external scheduler)
// hits this once an hour to pull every post from the crew X list and map it onto
// the matching pirate. It force-refreshes the upstream fetch so the warmed cache
// is fresh for the next SSR render, and reports which handles matched.
const isAuthorized = (request: NextRequest): boolean => {
  const secret = process.env.CRON_SECRET;

  if (!secret) return true; // no secret configured (dev) → open

  const header = request.headers.get('authorization');
  const fromQuery = request.nextUrl.searchParams.get('secret');

  return header === `Bearer ${secret}` || fromQuery === secret;
};

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch a full 24h window (replies excluded server-side) and merge it into the
  // KV archive — dedupe by id, never prune. Idempotent: re-running is harmless.
  const fetched = await fetchCrewListPosts();
  const merge = await mergeLivePosts(fetched);
  const crew = getCrew();
  const crewHandles = new Set(crew.map((member) => member.handle.toLowerCase()));

  const matched = crew
    .map((member) => ({ handle: member.handle, name: member.name, posts: fetched.get(member.handle.toLowerCase())?.length ?? 0 }))
    .filter((entry) => entry.posts > 0)
    .sort((a, b) => b.posts - a.posts);

  const fetchedCount = [...fetched.values()].reduce((sum, posts) => sum + posts.length, 0);
  const unmatchedHandles = [...fetched.keys()].filter((handle) => !crewHandles.has(handle));

  return NextResponse.json({
    ok: true,
    stored: merge.stored,
    listId: CREW_LIST_ID,
    syncedAt: new Date().toISOString(),
    fetched24h: fetchedCount, // posts pulled from the 24h window this run
    addedToArchive: merge.added, // genuinely new (not already archived)
    totalArchived: merge.total, // total posts in the KV archive (never pruned)
    membersMatched: matched.length,
    matched,
    unmatchedHandles,
  });
}
