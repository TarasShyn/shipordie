'use client';

import { useState } from 'react';
import { Button, TextM } from '@/components/ui';
import { GameCanvas, ShipPreview } from '@/lib/game-loaders';
import { CrewMember, CrewPersonData } from '@/lib/types';

interface ShipExperienceProps {
  people: CrewPersonData[];
  crew: CrewMember[];
}

const ShipExperience = ({ people, crew }: ShipExperienceProps) => {
  const [boarded, setBoarded] = useState(false);

  if (boarded) return <GameCanvas people={people} />;

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <ShipPreview />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[rgba(10,16,24,0.72)] px-5 backdrop-blur-sm">
        <div className="flex w-full max-w-[820px] flex-col items-center">
          <h1 className="mb-4 bg-linear-to-b from-amber-200 from-30% to-amber-500 bg-clip-text text-center text-[clamp(44px,8vw,104px)] leading-[0.85] font-black tracking-tight text-transparent">
            SHIP OR DIE
          </h1>

          <TextM className="mb-8 max-w-[620px] text-center text-white/65">
            Board a storm-tossed pirate ship crewed by indie hackers. Walk the decks, meet the crew, and click any pirate to see what they shipped in
            the last 24 hours.
          </TextM>

          <Button onClick={() => setBoarded(true)} className="px-10">
            Climb aboard
          </Button>

          <div className="mt-10 w-full">
            <TextM className="mb-3 text-center tracking-wider text-white/40 uppercase">{crew.length} pirates aboard</TextM>

            <div className="flex max-h-[180px] flex-wrap items-start justify-center gap-x-5 gap-y-3 overflow-y-auto px-2">
              {[...crew]
                .sort((a, b) => b.startupsShipped - a.startupsShipped)
                .map((member) => (
                <a
                  key={member.slug}
                  href={member.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex w-[64px] flex-col items-center gap-1"
                  title={`${member.name} (@${member.handle})`}
                >
                  <img
                    src={member.avatar}
                    alt={member.name}
                    width={48}
                    height={48}
                    loading="lazy"
                    decoding="async"
                    className="size-12 rounded-full border-2 border-amber-300/70 object-cover transition-transform group-hover:scale-110"
                  />
                  <span className="w-full truncate text-center text-[10px] text-white/60">{member.name}</span>
                  <span className="text-[10px] font-semibold text-amber-300/80">🚀 {member.startupsShipped}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipExperience;
