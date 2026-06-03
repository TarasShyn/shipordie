import { useMemo } from 'react';
import { ShaderMaterial, Texture } from 'three';
import { CrewMember } from '@/lib/types';
import { useTexture } from '@react-three/drei';

export const FACE_HEAD_Y = 2.05;

const FACE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Round portrait: crop to a circle, honor the transparent PNG's alpha, discard
// any leftover green-screen fringe.
const FACE_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform sampler2D uMap;
  varying vec2 vUv;
  void main() {
    vec2 d = vUv - 0.5;
    if (dot(d, d) > 0.243) discard;
    vec4 c = texture2D(uMap, vUv);
    if (c.a < 0.5) discard;
    float greenness = c.g - max(c.r, c.b);
    if (greenness > 0.2 && c.g > 0.35) discard;
    gl_FragColor = vec4(c.rgb, 1.0);
  }
`;

// One billboarded face per pirate. NOT self-orienting — CrewDeck billboards them
// all in a single loop, so there are no per-face frame callbacks.
export const CrewFace = ({ member, position }: { member: CrewMember; position: [number, number, number] }) => {
  const texture = useTexture(member.avatar) as Texture;
  const material = useMemo(() => {
    const mat = new ShaderMaterial({ uniforms: { uMap: { value: null } }, vertexShader: FACE_VERTEX, fragmentShader: FACE_FRAGMENT });

    mat.toneMapped = false;

    return mat;
  }, []);

  material.uniforms.uMap.value = texture;

  return (
    <mesh position={[position[0], position[1] + FACE_HEAD_Y, position[2]]} material={material} userData={{ member }}>
      <planeGeometry args={[1.1, 1.1]} />
    </mesh>
  );
};
