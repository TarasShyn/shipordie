import { CrewMember } from '@/lib/types';

const SpeechBubble = ({ member }: { member: CrewMember }) => (
  <div className="pointer-events-none w-[180px] -translate-y-1/2 select-none font-sans">
    <div className="relative rounded-2xl border border-amber-900/30 bg-[#f6ecd6] px-3 py-2 shadow-xl shadow-black/40">
      <p className="text-[12px] leading-snug font-semibold text-[#3a2a12]">{member.bubble}</p>
      <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-amber-800/80">
        <span>@{member.handle}</span>
        <span aria-hidden>·</span>
        <span>🚀 {member.startupsShipped}</span>
        <span aria-hidden>·</span>
        <span>{member.rank}</span>
      </p>
      <span className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-r border-b border-amber-900/30 bg-[#f6ecd6]" />
    </div>
  </div>
);

export default SpeechBubble;
