import { useMemo, useRef } from 'react';
import { BufferGeometry, Float32BufferAttribute, Group, ShaderMaterial } from 'three';
import { useFrame, useThree } from '@react-three/fiber';

const DROPS = 2200;
const FIELD_RADIUS = 26;
const FALL_HEIGHT = 38;
const STREAK = 1.1;

const VERTEX = /* glsl */ `
  uniform float uTime;
  attribute float aPhase;
  void main() {
    float fall = mod(uTime * 26.0 + aPhase * ${FALL_HEIGHT.toFixed(1)}, ${FALL_HEIGHT.toFixed(1)});
    vec3 pos = position;
    pos.y -= fall;
    pos.x -= fall * 0.16;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision mediump float;
  void main() {
    gl_FragColor = vec4(0.74, 0.82, 0.9, 0.34);
  }
`;

const Rain = () => {
  const groupRef = useRef<Group>(null);
  const { camera } = useThree();

  const geometry = useMemo(() => {
    const positions: number[] = [];
    const phases: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < DROPS; i += 1) {
      const angle = (i * 2.39996) % (Math.PI * 2);
      const radius = Math.sqrt((i % 100) / 100) * FIELD_RADIUS + ((i * 13) % 7);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const yTop = FALL_HEIGHT / 2 + ((i * 7) % 5);
      const phase = ((i * 137) % 1000) / 1000;

      // Two vertices per drop forming a short vertical streak.
      positions.push(x, yTop, z, x, yTop - STREAK, z);
      phases.push(phase, phase);
      indices.push(i * 2, i * 2 + 1);
    }

    const geo = new BufferGeometry();

    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geo.setAttribute('aPhase', new Float32BufferAttribute(phases, 1));
    geo.setIndex(indices);

    return geo;
  }, []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
      }),
    []
  );

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;

    if (groupRef.current) {
      groupRef.current.position.x = camera.position.x;
      groupRef.current.position.z = camera.position.z;
    }
  });

  return (
    <group ref={groupRef}>
      <lineSegments geometry={geometry} material={material} frustumCulled={false} raycast={() => null} />
    </group>
  );
};

export default Rain;
