import { useRef } from 'react';
import { DirectionalLight } from 'three';
import { useFrame } from '@react-three/fiber';

import Ocean from './Ocean';
import Rain from './Rain';
import Ship from './Ship';
import StormSky from './StormSky';

// Drives the storm lightning: every few seconds a strike flares the sky, ocean
// and a sharp directional flash, then decays. Shared via `flashRef`.
const Lightning = ({ flashRef }: { flashRef: React.MutableRefObject<number> }) => {
  const lightRef = useRef<DirectionalLight>(null);
  const nextStrike = useRef(2.5);
  const elapsed = useRef(0);
  const strike = useRef(0);
  const burst = useRef(0);

  useFrame((_, delta) => {
    elapsed.current += delta;

    if (elapsed.current >= nextStrike.current) {
      elapsed.current = 0;
      nextStrike.current = 3 + Math.random() * 7;
      strike.current = 1;
      burst.current = Math.random() > 0.5 ? 2 : 1; // single or double flash
    }

    if (strike.current > 0) {
      strike.current = Math.max(0, strike.current - delta * 6);

      // Flicker for a forked-lightning feel.
      const flicker = strike.current * (0.6 + 0.4 * Math.sin(elapsed.current * 60));

      flashRef.current = flicker;

      if (strike.current === 0 && burst.current > 1) {
        burst.current -= 1;
        strike.current = 0.7;
      }
    } else {
      flashRef.current = 0;
    }

    if (lightRef.current) lightRef.current.intensity = flashRef.current * 3.2;
  });

  return <directionalLight ref={lightRef} position={[20, 60, -30]} color="#cdd6ff" intensity={0} />;
};

const World = () => {
  const flashRef = useRef(0);

  return (
    <group>
      <fog attach="fog" args={['#3a4856', 50, 420]} />

      <ambientLight intensity={1.15} color="#b7c5d6" />
      <hemisphereLight args={['#415062', '#0a1018', 0.9]} />
      <directionalLight position={[-30, 40, 30]} intensity={0.55} color="#9fb6d4" />

      <Lightning flashRef={flashRef} />
      <StormSky flashRef={flashRef} />
      <Ocean flashRef={flashRef} />
      <Rain />
      <Ship />
    </group>
  );
};

export default World;
