import { getKvStore } from './cf';
import { CrewPost } from './types';

// One KV entry is an ever-growing archive: handle → all posts we've ever synced.
// Each sync fetches a fresh 24h window and merges it in by tweet id. Nothing is
// ever pruned — the archive just accumulates. The "last 24 hours" filtering for
// what's shown on the ship happens at display time (lib/members.ts), not here.
const STORE_KEY = 'crew-list:v1';

interface StoredLivePosts {
  syncedAt: string;
  posts: Record<string, CrewPost[]>;
}

const writeStore = async (byHandle: Map<string, CrewPost[]>): Promise<void> => {
  const kv = await getKvStore();

  if (!kv) return;

  const posts: Record<string, CrewPost[]> = {};

  for (const [handle, list] of byHandle) posts[handle] = list;

  await kv.put(STORE_KEY, JSON.stringify({ syncedAt: new Date().toISOString(), posts } satisfies StoredLivePosts));
};

export const readLivePosts = async (): Promise<Map<string, CrewPost[]>> => {
  const byHandle = new Map<string, CrewPost[]>();
  const kv = await getKvStore();

  if (!kv) return byHandle;

  try {
    const raw = await kv.get(STORE_KEY);

    if (!raw) return byHandle;

    const data = JSON.parse(raw) as StoredLivePosts;

    for (const [handle, list] of Object.entries(data.posts ?? {})) byHandle.set(handle, list);
  } catch {
    // Corrupt/legacy payload — fall back to demo posts rather than crashing SSR.
  }

  return byHandle;
};

interface MergeResult {
  stored: boolean;
  added: number; // posts in this fetch not already in the archive
  total: number; // total posts in the archive after the merge
}

// Folds a freshly-fetched batch into the KV archive: dedupes by tweet id and
// keeps EVERYTHING (no pruning). A member with no new posts this run keeps all
// their previously-archived posts. Newest-first per handle.
export const mergeLivePosts = async (incoming: Map<string, CrewPost[]>): Promise<MergeResult> => {
  const kv = await getKvStore();

  if (!kv) return { stored: false, added: 0, total: 0 };

  const existing = await readLivePosts();
  const handles = new Set([...existing.keys(), ...incoming.keys()]);
  const result = new Map<string, CrewPost[]>();
  let added = 0;

  for (const handle of handles) {
    const existingPosts = existing.get(handle) ?? [];
    const existingIds = new Set(existingPosts.map((post) => post.id));
    const seen = new Set<string>();
    const combined: CrewPost[] = [];

    for (const post of [...(incoming.get(handle) ?? []), ...existingPosts]) {
      if (seen.has(post.id)) continue;

      seen.add(post.id);

      if (!existingIds.has(post.id)) added += 1;

      combined.push(post);
    }

    combined.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    result.set(handle, combined);
  }

  await writeStore(result);

  const total = [...result.values()].reduce((sum, list) => sum + list.length, 0);

  return { stored: true, added, total };
};
