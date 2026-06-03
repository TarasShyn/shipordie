'use client';

import { useRef } from 'react';
import { PerspectiveCamera } from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';

import World from './World';

// Slow cinematic orbit around the ship for the landing screen.
const OrbitCamera = () => {
  const { camera } = useThree();
  const angle = useRef(0.6);

  useFrame((_, delta) => {
    angle.current += delta * 0.05;

    const radius = 92;

    camera.position.set(Math.sin(angle.current) * radius, 52, Math.cos(angle.current) * radius);
    camera.lookAt(0, 7, 0);
    (camera as PerspectiveCamera).updateProjectionMatrix();
  });

  return null;
};

const ShipPreview = () => (
  <div className="absolute inset-0">
    <Canvas camera={{ position: [40, 18, 50], fov: 60, near: 0.1, far: 900 }} style={{ background: '#1a2530' }}>
      <OrbitCamera />
      <World />
    </Canvas>
  </div>
);

export default ShipPreview;
