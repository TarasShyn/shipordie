import { useMemo, useRef } from 'react';
import { Color, DoubleSide, ShaderMaterial } from 'three';
import { WATERLINE_Y } from '@/lib/space';
import { useFrame } from '@react-three/fiber';

const VERTEX = /* glsl */ `
  uniform float uTime;
  varying float vWave;
  varying float vDepth;

  float wave(vec2 p) {
    float w = 0.0;
    w += sin(p.x * 0.11 + uTime * 1.05) * 0.62;
    w += sin(p.y * 0.15 - uTime * 0.93) * 0.5;
    w += sin((p.x + p.y) * 0.085 + uTime * 0.7) * 0.46;
    w += sin((p.x * 0.7 - p.y * 0.5) * 0.21 + uTime * 1.7) * 0.26;
    w += sin((p.x * 0.4 + p.y * 0.9) * 0.33 - uTime * 2.1) * 0.14;
    return w;
  }

  void main() {
    vec3 pos = position;
    float h = wave(position.xy);
    pos.z += h;
    vWave = h;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uFoam;
  uniform vec3 uFog;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uFlash;
  varying float vWave;
  varying float vDepth;

  void main() {
    float crest = smoothstep(0.35, 1.25, vWave);
    float trough = smoothstep(-0.2, -1.1, vWave);
    vec3 col = mix(uDeep, uShallow, crest);
    col = mix(col, uDeep * 0.7, trough * 0.5);
    col += uFoam * smoothstep(0.95, 1.35, vWave) * 0.8;
    col += uFlash * 0.25;
    float fog = smoothstep(uFogNear, uFogFar, vDepth);
    col = mix(col, uFog, fog);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const Ocean = ({ flashRef }: { flashRef: React.MutableRefObject<number> }) => {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uDeep: { value: new Color('#0b1f2e') },
          uShallow: { value: new Color('#1d4a5e') },
          uFoam: { value: new Color('#aebfc6') },
          uFog: { value: new Color('#3a4856') },
          uFogNear: { value: 60 },
          uFogFar: { value: 460 },
          uFlash: { value: 0 },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        side: DoubleSide,
      }),
    []
  );

  const matRef = useRef(material);

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
    material.uniforms.uFlash.value = flashRef.current;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WATERLINE_Y, 0]} material={matRef.current} frustumCulled={false} raycast={() => null}>
      <planeGeometry args={[1400, 1400, 180, 180]} />
    </mesh>
  );
};

export default Ocean;
