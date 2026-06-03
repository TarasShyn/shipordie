import { useMemo, useRef } from 'react';
import { BackSide, Color, Group, ShaderMaterial } from 'three';
import { useFrame, useThree } from '@react-three/fiber';

const VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uFlash;
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uCloud;
  varying vec3 vDir;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.02;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    float h = clamp(vDir.y, 0.0, 1.0);
    vec3 base = mix(uHorizon, uTop, pow(h, 0.7));

    // Drifting storm clouds projected onto the dome.
    vec2 uv = vDir.xz / (abs(vDir.y) + 0.35);
    float clouds = fbm(uv * 1.6 + vec2(uTime * 0.015, uTime * 0.008));
    clouds = smoothstep(0.45, 1.0, clouds);
    vec3 col = mix(base, uCloud, clouds * (0.55 + 0.45 * h));

    // Lightning flash brightens the whole sky, strongest near the horizon.
    col += uFlash * (0.6 + clouds * 0.8) * vec3(0.85, 0.9, 1.0);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const StormSky = ({ flashRef }: { flashRef: React.MutableRefObject<number> }) => {
  const groupRef = useRef<Group>(null);
  const { camera } = useThree();

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uFlash: { value: 0 },
          uTop: { value: new Color('#0a1018') },
          uHorizon: { value: new Color('#34404e') },
          uCloud: { value: new Color('#10161f') },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        side: BackSide,
        depthWrite: false,
      }),
    []
  );

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
    material.uniforms.uFlash.value = flashRef.current;

    if (groupRef.current) groupRef.current.position.copy(camera.position);
  });

  return (
    <group ref={groupRef}>
      <mesh material={material} renderOrder={-1} frustumCulled={false} raycast={() => null}>
        <sphereGeometry args={[600, 32, 24]} />
      </mesh>
    </group>
  );
};

export default StormSky;
