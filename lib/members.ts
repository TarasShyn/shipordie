import membersData from '@/data/members.json';

import { computeCrewLayout } from './layout';
import { readLivePosts } from './live-posts-store';
import { CrewMember, CrewPersonData, CrewPost, CrewRank, CrewStatus, SceneData } from './types';

const BUBBLE_MAX = 140;
const DISPLAY_WINDOW_MS = 24 * 60 * 60 * 1000; // the ship only shows posts from the last 24h

interface RawPost {
  id: string;
  text: string;
  minutesAgo: number;
  likes: number;
  reposts: number;
  replies: number;
  url: string;
}

interface RawMember {
  slug: string;
  handle: string;
  name: string;
  startupsShipped: number;
  status: string;
  rank: string;
  avatar: string;
  profileUrl: string;
  bubble: string;
  posts: RawPost[];
}

const RANK_VALUES = Object.values(CrewRank) as string[];
const STATUS_VALUES = Object.values(CrewStatus) as string[];

const toRank = (rank: string): CrewRank => (RANK_VALUES.includes(rank) ? (rank as CrewRank) : CrewRank.Noob);

// Status is the badge scraped from each crew member's profile (On Deck / At Risk
// / Overboard) — the site's own verdict, not a guess from the deadline.
const toStatus = (status: string): CrewStatus => (STATUS_VALUES.includes(status) ? (status as CrewStatus) : CrewStatus.OnDeck);

// `minutesAgo` is stored in the DB so timestamps always resolve to "within the
// last 24 hours" relative to the SSR render, never going stale on disk.
const resolveMember = (raw: RawMember, now: number): CrewMember => ({
  slug: raw.slug,
  handle: raw.handle,
  name: raw.name,
  startupsShipped: raw.startupsShipped ?? 0,
  status: toStatus(raw.status),
  rank: toRank(raw.rank),
  avatar: raw.avatar,
  profileUrl: raw.profileUrl,
  bubble: raw.bubble,
  posts: raw.posts
    .map((post) => ({
      id: post.id,
      text: post.text,
      publishedAt: new Date(now - post.minutesAgo * 60_000).toISOString(),
      likes: post.likes,
      reposts: post.reposts,
      replies: post.replies,
      url: post.url,
    }))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()),
});

export const getCrew = (): CrewMember[] => {
  const now = Date.now();

  return (membersData.members as RawMember[]).map((raw) => resolveMember(raw, now));
};

const trimBubble = (text: string): string => {
  const oneLine = text.replace(/\s+/g, ' ').trim();

  return oneLine.length > BUBBLE_MAX ? `${oneLine.slice(0, BUBBLE_MAX - 1).trimEnd()}…` : oneLine;
};

// Overlays the KV archive onto the bundled roster, showing only posts from the
// last 24h (the archive itself keeps everything; we filter here). All-or-nothing,
// never a mix:
//   • No posts within the last 24h (no key / sync stale / nothing fresh) → DEMO
//     mode: every member keeps the placeholder posts + bubble from members.json.
//   • Fresh posts exist → LIVE mode: members with a recent post show it; members
//     with none show no posts and no bubble (no fabricated demo content).
export const getLiveCrew = async (): Promise<CrewMember[]> => {
  const crew = getCrew();
  const archive = await readLivePosts();
  const cutoff = Date.now() - DISPLAY_WINDOW_MS;
  const recentByHandle = new Map<string, CrewPost[]>();

  for (const [handle, posts] of archive) {
    const recent = posts
      .filter((post) => new Date(post.publishedAt).getTime() >= cutoff)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    if (recent.length > 0) recentByHandle.set(handle, recent);
  }

  if (recentByHandle.size === 0) return crew; // demo mode

  return crew.map((member) => {
    const recent = recentByHandle.get(member.handle.toLowerCase());

    if (recent && recent.length > 0) {
      return { ...member, bubble: trimBubble(recent[0].text), posts: recent };
    }

    return { ...member, bubble: '', posts: [] }; // live mode, no recent post → no demo
  });
};

export const getSceneData = (): SceneData => ({
  people: computeCrewLayout(getCrew()),
});

export const getLiveSceneData = async (): Promise<SceneData> => ({
  people: computeCrewLayout(await getLiveCrew()),
});

export const getLiveExperience = async (): Promise<{ crew: CrewMember[]; people: CrewPersonData[] }> => {
  const crew = await getLiveCrew();

  return { crew, people: computeCrewLayout(crew) };
};
