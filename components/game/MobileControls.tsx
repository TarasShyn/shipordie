'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { mobileInput } from '@/lib/mobileInput';

const BASE_R = 56;
const KNOB_R = 24;
const MAX_DIST = BASE_R - KNOB_R;

const JOY_RIGHT = 30; // px from right edge of visual viewport
const JOY_BOTTOM = 90; // px from bottom edge of visual viewport

const getJoyCentre = () => ({
  x: window.innerWidth - JOY_RIGHT - BASE_R,
  y: window.innerHeight - JOY_BOTTOM - BASE_R,
});

const MobileControls = () => {
  const [mounted, setMounted] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);
  const joyId = useRef<number | null>(null);
  const lookId = useRef<number | null>(null);
  const lookPrevX = useRef(0);
  const lookPrevY = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const moveKnob = (ox: number, oy: number) => {
    if (knobRef.current) knobRef.current.style.transform = `translate(${ox}px, ${oy}px)`;
  };

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      e.preventDefault();

      for (const t of Array.from(e.changedTouches)) {
        const c = getJoyCentre();
        const dx = t.clientX - c.x;
        const dy = t.clientY - c.y;
        const dist = Math.hypot(dx, dy);

        if (dist < BASE_R + 20 && joyId.current === null) {
          joyId.current = t.identifier;

          const cl = Math.min(dist, MAX_DIST);
          const nx = dist > 0 ? (dx / dist) * cl : 0;
          const ny = dist > 0 ? (dy / dist) * cl : 0;

          mobileInput.jx = nx / MAX_DIST;
          mobileInput.jy = ny / MAX_DIST;
          moveKnob(nx, ny);
        } else if (lookId.current === null) {
          lookId.current = t.identifier;
          lookPrevX.current = t.clientX;
          lookPrevY.current = t.clientY;
        }
      }
    };

    const onMove = (e: TouchEvent) => {
      e.preventDefault();

      const c = getJoyCentre();

      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === joyId.current) {
          const dx = t.clientX - c.x;
          const dy = t.clientY - c.y;
          const dist = Math.hypot(dx, dy);
          const cl = Math.min(dist, MAX_DIST);
          const nx = dist > 0 ? (dx / dist) * cl : 0;
          const ny = dist > 0 ? (dy / dist) * cl : 0;

          mobileInput.jx = nx / MAX_DIST;
          mobileInput.jy = ny / MAX_DIST;
          moveKnob(nx, ny);
        } else if (t.identifier === lookId.current) {
          mobileInput.ldx += t.clientX - lookPrevX.current;
          mobileInput.ldy += t.clientY - lookPrevY.current;
          lookPrevX.current = t.clientX;
          lookPrevY.current = t.clientY;
        }
      }
    };

    const onEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === joyId.current) {
          joyId.current = null;
          mobileInput.jx = 0;
          mobileInput.jy = 0;
          moveKnob(0, 0);
        } else if (t.identifier === lookId.current) {
          lookId.current = null;
        }
      }
    };

    window.addEventListener('touchstart', onStart, { passive: false, capture: true });
    window.addEventListener('touchmove', onMove, { passive: false, capture: true });
    window.addEventListener('touchend', onEnd, { passive: false, capture: true });
    window.addEventListener('touchcancel', onEnd, { passive: false, capture: true });

    return () => {
      window.removeEventListener('touchstart', onStart, { capture: true });
      window.removeEventListener('touchmove', onMove, { capture: true });
      window.removeEventListener('touchend', onEnd, { capture: true });
      window.removeEventListener('touchcancel', onEnd, { capture: true });
      mobileInput.jx = 0;
      mobileInput.jy = 0;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Joystick base — rendered directly on body so no ancestor can clip it */}
      <div
        className="pointer-events-none fixed z-9999 box-border rounded-full border-2 border-white/40 bg-white/8"
        style={{
          right: JOY_RIGHT,
          bottom: JOY_BOTTOM,
          width: BASE_R * 2,
          height: BASE_R * 2,
        }}
      >
        <div
          ref={knobRef}
          className="pointer-events-none absolute rounded-full border-2 border-white/85 bg-white/50 transition-transform duration-40"
          style={{
            left: BASE_R - KNOB_R,
            top: BASE_R - KNOB_R,
            width: KNOB_R * 2,
            height: KNOB_R * 2,
          }}
        />
      </div>
    </>,
    document.body
  );
};

export default MobileControls;
