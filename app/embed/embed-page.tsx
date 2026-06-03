'use client';

import { useState } from 'react';
import { Button, TextM } from '@/components/ui';
import { GameCanvas, ShipPreview } from '@/lib/game-loaders';
import { CrewPersonData } from '@/lib/types';

export const EmbedPage = ({ people }: { people: CrewPersonData[] }) => {
  const [boarded, setBoarded] = useState(false);

  if (boarded) return <GameCanvas people={people} />;

  return (
    <div className="relative h-screen w-screen" style={{ backgroundColor: '#1a2530' }}>
      <ShipPreview />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[rgba(10,16,24,0.72)] px-5 backdrop-blur-sm">
        <div className="flex w-full max-w-[420px] flex-col items-center">
          <h1 className="mb-3 bg-linear-to-b from-amber-200 from-40% to-amber-500 bg-clip-text text-center text-[clamp(28px,6vw,56px)] font-black tracking-[-1px] text-transparent">
            Ship or Die
          </h1>

          <TextM className="mb-10 text-center text-white/60">A pirate ship crewed by indie hackers, riding out the storm.</TextM>

          <Button fullWidth onClick={() => setBoarded(true)}>
            Climb aboard
          </Button>
        </div>
      </div>
    </div>
  );
};
