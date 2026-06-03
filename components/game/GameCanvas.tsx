'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Group } from 'three';
import { useIsMobile } from '@/hooks/useIsMobile';
import { SPAWN_Y, SPAWN_Z } from '@/lib/space';
import { CrewMember, CrewPersonData } from '@/lib/types';
import { Canvas } from '@react-three/fiber';

import Camera from './Camera';
import { CinematicIntro, KickScene, WASTED_END, WASTED_START } from './CinematicIntro';
import CrewDeck from './CrewDeck';
import MobileControls from './MobileControls';
import Player from './Player';
import PostsModal from './PostsModal';
import World from './World';

const Scene = ({
  playerRef,
  people,
  isMobile,
  intro,
  onIntroDone,
  onTargetMember,
  onOpenMember,
}: {
  playerRef: React.RefObject<Group | null>;
  people: CrewPersonData[];
  isMobile: boolean;
  intro: boolean;
  onIntroDone: () => void;
  onTargetMember: (member: CrewMember | null) => void;
  onOpenMember: (member: CrewMember) => void;
}) => (
  <>
    <World />
    <CrewDeck people={people} onTargetMember={onTargetMember} onOpenMember={onOpenMember} />
    {intro ? (
      <>
        <CinematicIntro onDone={onIntroDone} />
        <KickScene />
      </>
    ) : (
      <>
        <Player ref={playerRef} people={people} />
        <Camera target={playerRef} isMobile={isMobile} />
      </>
    )}
  </>
);

const GameCanvas = ({ people }: { people: CrewPersonData[] }) => {
  const playerRef = useRef<Group>(null);
  const isMobile = useIsMobile();
  const [intro, setIntro] = useState(true);
  const [wasted, setWasted] = useState(false);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [targeted, setTargeted] = useState<CrewMember | null>(null);
  const [selected, setSelected] = useState<CrewMember | null>(null);

  const openMember = useCallback((member: CrewMember) => {
    setSelected(member);

    if (document.pointerLockElement) document.exitPointerLock();
  }, []);

  useEffect(() => {
    const onChange = () => setPointerLocked(!!document.pointerLockElement);

    document.addEventListener('pointerlockchange', onChange);

    return () => document.removeEventListener('pointerlockchange', onChange);
  }, []);

  // Flash the overboard banner during the cinematic's drowning beat.
  useEffect(() => {
    if (!intro) {
      setWasted(false);

      return;
    }

    const show = setTimeout(() => setWasted(true), WASTED_START * 1000);
    const hide = setTimeout(() => setWasted(false), WASTED_END * 1000);

    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [intro]);

  return (
    <div className={`relative h-screen w-screen touch-none ${pointerLocked ? 'cursor-none' : ''}`}>
      <Canvas camera={{ position: [0, SPAWN_Y + 1.62, SPAWN_Z], fov: 72, near: 0.1, far: 900 }} dpr={[1, 1.5]} style={{ background: '#1a2530' }}>
        <Scene
          playerRef={playerRef}
          people={people}
          isMobile={isMobile}
          intro={intro}
          onIntroDone={() => setIntro(false)}
          onTargetMember={setTargeted}
          onOpenMember={openMember}
        />
      </Canvas>

      {/* Cinematic intro overlay — masks the load, click to skip to the deck. */}
      {intro && (
        <div className="absolute inset-0 z-30 flex cursor-pointer items-end justify-center pb-16" onClick={() => setIntro(false)}>
          {wasted ? (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div
                className="font-sans text-[clamp(64px,14vw,180px)] leading-none font-black tracking-tight text-[#d11f1f]"
                style={{ textShadow: '0 0 24px rgba(209,31,31,0.65)', animation: 'wastedIn 0.5s ease-out both' }}
              >
                WASTED
              </div>
              <div className="mt-2 font-mono text-sm tracking-widest text-[#d11f1f]/80 uppercase">thrown overboard…</div>
              <style>{`@keyframes wastedIn{from{opacity:0;transform:scale(1.25)}to{opacity:1;transform:scale(1)}}`}</style>
            </div>
          ) : (
            <div className="rounded-full bg-black/55 px-5 py-2 font-sans text-sm text-white/80 backdrop-blur-sm">Boarding the ship… (click to skip)</div>
          )}
        </div>
      )}

      {selected && <PostsModal member={selected} onClose={() => setSelected(null)} />}

      {!isMobile && !intro && targeted && pointerLocked && !selected && (
        <div className="pointer-events-none absolute top-[56%] left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 font-sans text-sm whitespace-nowrap text-white">
          {targeted.name} · <span className="font-semibold">click to read their posts</span>
        </div>
      )}

      {!isMobile && !intro && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="relative h-6 w-6">
            <div className="absolute top-1/2 left-0 h-0.5 w-full -translate-y-1/2 bg-white/60" />
            <div className="absolute top-0 left-1/2 h-full w-0.5 -translate-x-1/2 bg-white/60" />
          </div>
        </div>
      )}

      {isMobile && !intro && <MobileControls />}

      {!isMobile && !intro && !pointerLocked && !selected && (
        <div
          className="absolute inset-0 z-15 flex cursor-pointer items-center justify-center bg-black/40"
          onClick={() => document.querySelector('canvas')?.requestPointerLock()}
        >
          <div className="rounded-xl bg-black/80 px-8 py-4 font-sans text-lg text-white">Click to return to the deck</div>
        </div>
      )}

      {!isMobile && !intro && (
        <div className="pointer-events-none absolute top-4 left-4 z-5 rounded-lg bg-black/60 px-4 py-2.5 font-sans text-xs leading-relaxed text-white">
          <div className="mb-1 font-bold">Ship or Die</div>
          <div>Click to lock mouse · WASD / arrows to walk the deck</div>
          <div>Look at a pirate and click to read their posts · ESC to unlock mouse</div>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;
