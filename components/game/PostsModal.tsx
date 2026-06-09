import { TwitterIcon } from '@/components/ui';
import { CrewMember, CrewPost, CrewRank, CrewStatus } from '@/lib/types';

interface PostsModalProps {
  member: CrewMember;
  onClose: () => void;
}

const rankClass = (rank: CrewRank): string => {
  if (rank === CrewRank.Legend) return 'border-purple-200 bg-purple-50 text-purple-700';

  if (rank === CrewRank.Captain) return 'border-amber-200 bg-amber-50 text-amber-700';

  if (rank === CrewRank.Shipper) return 'border-blue-200 bg-blue-50 text-blue-700';

  return 'border-slate-200 bg-slate-50 text-slate-600';
};

const statusClass = (status: CrewStatus): string => {
  if (status === CrewStatus.OnDeck) return 'border-green-200 bg-green-50 text-green-700';

  if (status === CrewStatus.AtRisk) return 'border-amber-200 bg-amber-50 text-amber-700';

  return 'border-slate-200 bg-slate-100 text-slate-600';
};

const formatRelativeTime = (publishedAt: string): string => {
  const diffMs = Math.max(0, Date.now() - new Date(publishedAt).getTime());
  const minutes = Math.max(1, Math.floor(diffMs / 60000));

  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  return `${hours}h ago`;
};

const compact = (value: number): string => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value));

const PostCard = ({ member, post }: { member: CrewMember; post: CrewPost }) => (
  <a
    href={post.url}
    target="_blank"
    rel="noopener noreferrer"
    className="block rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
  >
    <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-500">
      <span className="font-semibold text-slate-900">{member.name}</span>
      <span>@{member.handle}</span>
      <span aria-hidden>·</span>
      <span>{formatRelativeTime(post.publishedAt)}</span>
    </div>
    <p className="text-sm leading-relaxed whitespace-pre-line text-slate-800">{post.text}</p>
    <div className="mt-3 flex items-center gap-5 text-xs text-slate-500">
      <span>💬 {compact(post.replies)}</span>
      <span>🔁 {compact(post.reposts)}</span>
      <span>❤️ {compact(post.likes)}</span>
    </div>
  </a>
);

const PostsModal = ({ member, onClose }: PostsModalProps) => (
  <div className="absolute inset-0 z-[2000] flex cursor-default items-center justify-center bg-black/60 px-5 backdrop-blur-sm" onClick={onClose}>
    <article
      className="flex max-h-[86vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl bg-white font-sans shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-3 border-b border-slate-100 p-5">
        <img src={member.avatar} alt={member.name} className="size-12 rounded-full border-2 border-amber-300 object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
            {member.name}
            <TwitterIcon className="size-3.5 fill-slate-400" />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <span className="truncate">@{member.handle}</span>
            <span aria-hidden>·</span>
            <span className="font-semibold text-amber-700">🚀 {member.startupsShipped} shipped</span>
            <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${rankClass(member.rank)}`}>{member.rank}</span>
            <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${statusClass(member.status)}`}>{member.status}</span>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
          Last 24 hours
        </span>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto p-5">
        {member.posts.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No posts in the last 24 hours. This pirate is busy shipping. 🏴‍☠️</p>
        ) : (
          member.posts.map((post) => <PostCard key={post.id} member={member} post={post} />)
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 p-4">
        <button type="button" onClick={onClose} className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200">
          Back to the ship
        </button>
        <div className="flex items-center gap-2">
          {member.website && (
            <a
              href={member.website}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Visit site ↗
            </a>
          )}
          <a
            href={member.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            View @{member.handle} on X ↗
          </a>
        </div>
      </div>
    </article>
  </div>
);

export default PostsModal;
