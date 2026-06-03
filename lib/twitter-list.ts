import { CrewPost } from './types';

// The crew's X/Twitter list. Every member who is on this list has their recent
// posts pulled in hourly and pinned to their pirate on the ship.
export const CREW_LIST_ID = '2059658620963348934';

const TWITTER_API_URL = 'https://api.twitterapi.io';
// Every sync fetches a full 24h window (replies excluded server-side). This makes
// each run self-contained and idempotent — a missed run is harmless, the next one
// re-covers the window. The merge dedupes by id into the KV archive; display-time
// 24h filtering lives in lib/members.ts.
const LOOKBACK_MS = 24 * 60 * 60 * 1000;
const MAX_PAGES = 40; // 24h of originals on this list ≈ 225 (~12 pages); headroom for growth

interface RawAuthor {
  userName?: string;
  name?: string;
}

interface RawTweet {
  id?: string;
  url?: string;
  text?: string;
  createdAt?: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  isReply?: boolean;
  retweeted_tweet?: unknown;
  author?: RawAuthor;
}

interface ListTweetsResponse {
  tweets?: RawTweet[];
  has_next_page?: boolean;
  next_cursor?: string;
}

const normalizeHandle = (handle: string): string => handle.trim().replace(/^@/, '').toLowerCase();

const toPost = (tweet: RawTweet): CrewPost | null => {
  if (!tweet.id || !tweet.text) return null;

  const published = tweet.createdAt ? new Date(tweet.createdAt) : null;

  return {
    id: tweet.id,
    text: tweet.text,
    publishedAt: published && !Number.isNaN(published.getTime()) ? published.toISOString() : new Date().toISOString(),
    likes: tweet.likeCount ?? 0,
    reposts: tweet.retweetCount ?? 0,
    replies: tweet.replyCount ?? 0,
    url: tweet.url ?? `https://x.com/${normalizeHandle(tweet.author?.userName ?? '')}/status/${tweet.id}`,
  };
};

// Walks the list's timeline (newest first) and buckets original posts by author
// handle. Replies and retweets are dropped so the bubbles read as the crew's own
// "shipping in public" posts. Called only by the hourly cron, which then MERGES
// the result into KV. Returns an empty map (never throws) when the key is missing
// or the API is unreachable, so a failed sync leaves the existing data untouched.
export const fetchCrewListPosts = async (): Promise<Map<string, CrewPost[]>> => {
  const byHandle = new Map<string, CrewPost[]>();
  const apiKey = process.env.TWITTER_API_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[crew-list] TWITTER_API_API_KEY is not set — falling back to placeholder posts.');
    }

    return byHandle;
  }

  const sinceUnix = Math.floor((Date.now() - LOOKBACK_MS) / 1000);
  let cursor = '';

  try {
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const url =
        `${TWITTER_API_URL}/twitter/list/tweets` +
        `?listId=${CREW_LIST_ID}&sinceTime=${sinceUnix}&includeReplies=false` +
        (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '');

      const response = await fetch(url, { headers: { 'X-API-Key': apiKey }, cache: 'no-store' });

      if (!response.ok) {
        console.warn(`[crew-list] twitterapi.io responded ${response.status}; using what was collected so far.`);

        break;
      }

      const data = (await response.json()) as ListTweetsResponse;
      const tweets = Array.isArray(data.tweets) ? data.tweets : [];

      for (const tweet of tweets) {
        if (tweet.isReply || tweet.retweeted_tweet) continue;

        const handle = normalizeHandle(tweet.author?.userName ?? '');
        const post = toPost(tweet);

        if (!handle || !post) continue;

        const bucket = byHandle.get(handle);

        if (bucket) bucket.push(post);
        else byHandle.set(handle, [post]);
      }

      if (!data.has_next_page || !data.next_cursor || tweets.length === 0) break;

      cursor = data.next_cursor;
    }
  } catch (error) {
    console.warn('[crew-list] failed to fetch list tweets:', error);
  }

  for (const posts of byHandle.values()) {
    posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  return byHandle;
};
