import { useRef } from 'react';
import { Group, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { HALF_BEAM, MAIN_DECK_Y, MAIN_Z0, SPAWN_Y, SPAWN_Z, WATERLINE_Y } from '@/lib/space';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

const EYE = 1.62;
export const INTRO_DURATION = 10.4;

// Staged at the starboard rail near the bow.
const STAGE_Z = MAIN_Z0 + 8;
const VIC_X = HALF_BEAM - 2.2;
const CAP_X = HALF_BEAM - 4.4;

const STRIDE_END = 0.9; // captain finishes walking up to the victim
const KICK_T = 3.6; // boot connects — late, so the plea bubble can be read first
const KICK_START = KICK_T - 0.52; // wind-up begins (snap connects 0.52s later)
const G = 9.8;
const V0 = { x: 6.5, y: 7.2, z: 2 };
const ENTER_DT = 2.12; // time after the kick that the body hits the water
const SINK_X = VIC_X + V0.x * ENTER_DT;
const SINK_Z = STAGE_Z + V0.z * ENTER_DT;

export const WASTED_START = 5.8; // flashes as the body hits the water
export const WASTED_END = 8.1;

const NAVY = '#1c2740';
const SKIN = '#e0b48c';
const COAT_V = '#4a2630';

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));
const smoothstep = (t: number): number => {
  const c = clamp01(t);

  return c * c * (3 - 2 * c);
};

interface Frame {
  t: number;
  pos: [number, number, number];
  look: [number, number, number];
}

// Close-up over the captain → follow the launch → zoom in on the drowning →
// rise to reveal the ship → settle at spawn.
const KEYS: Frame[] = [
  { t: 0, pos: [CAP_X - 4.3, MAIN_DECK_Y + 2.4, STAGE_Z + 2.8], look: [VIC_X + 0.3, MAIN_DECK_Y + 1.9, STAGE_Z - 0.3] },
  { t: 2.9, pos: [CAP_X - 3.9, MAIN_DECK_Y + 2.5, STAGE_Z + 2.3], look: [VIC_X + 0.2, MAIN_DECK_Y + 1.9, STAGE_Z - 0.2] }, // linger so the plea reads
  { t: 4.0, pos: [CAP_X - 3.6, MAIN_DECK_Y + 3, STAGE_Z + 1.6], look: [VIC_X + 6, MAIN_DECK_Y + 1, STAGE_Z + 1.5] }, // follow the launch
  { t: 5.7, pos: [SINK_X - 5.5, WATERLINE_Y + 3.4, SINK_Z + 6.5], look: [SINK_X, WATERLINE_Y - 0.2, SINK_Z] },
  { t: 7.3, pos: [SINK_X - 3.6, WATERLINE_Y + 2, SINK_Z + 4.6], look: [SINK_X, WATERLINE_Y - 1.2, SINK_Z] },
  { t: 8.3, pos: [HALF_BEAM * 2.3, 38, 16], look: [0, 8, 0] },
  { t: INTRO_DURATION, pos: [0, SPAWN_Y + EYE, SPAWN_Z], look: [0, SPAWN_Y + EYE, SPAWN_Z - 10] },
];

export const CinematicIntro = ({ onDone }: { onDone: () => void }) => {
  const elapsed = useRef(0);
  const done = useRef(false);
  const _look = useRef(new Vector3());

  useFrame(({ camera }, delta) => {
    if (done.current) return;

    elapsed.current += delta;

    const tt = elapsed.current;
    const last = KEYS[KEYS.length - 1];

    if (tt >= last.t) {
      camera.position.set(last.pos[0], last.pos[1], last.pos[2]);
      _look.current.set(last.look[0], last.look[1], last.look[2]);
      camera.lookAt(_look.current);
      done.current = true;
      onDone();

      return;
    }

    let i = 0;

    while (i < KEYS.length - 2 && tt >= KEYS[i + 1].t) i += 1;

    const a = KEYS[i];
    const b = KEYS[i + 1];
    const f = smoothstep((tt - a.t) / (b.t - a.t));

    camera.position.set(lerp(a.pos[0], b.pos[0], f), lerp(a.pos[1], b.pos[1], f), lerp(a.pos[2], b.pos[2], f));
    _look.current.set(lerp(a.look[0], b.look[0], f), lerp(a.look[1], b.look[1], f), lerp(a.look[2], b.look[2], f));
    camera.lookAt(_look.current);
  });

  return null;
};

const Hat = () => (
  <group position={[0, 1.42, 0]}>
    <mesh rotation={[Math.PI, 0, 0]}>
      <coneGeometry args={[0.5, 0.16, 3]} />
      <meshStandardMaterial color="#15120c" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.14, 0]}>
      <coneGeometry args={[0.28, 0.34, 8]} />
      <meshStandardMaterial color="#1f160e" roughness={0.9} />
    </mesh>
  </group>
);

export const KickScene = () => {
  const captain = useRef<Group>(null);
  const capLean = useRef<Group>(null);
  const capLeg = useRef<Group>(null);
  const capLegBack = useRef<Group>(null);
  const victim = useRef<Group>(null);
  const vArmL = useRef<Group>(null);
  const vArmR = useRef<Group>(null);
  const splash = useRef<Group>(null);
  const bubbles = useRef<Group>(null);
  const plea = useRef<HTMLDivElement>(null);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    elapsed.current += delta;

    const t = elapsed.current;

    // ── Captain: stride in, hold while the plea reads, snap-kick, recover ──
    if (captain.current) {
      const walk = smoothstep(Math.min(1, t / STRIDE_END));

      captain.current.position.set(lerp(CAP_X - 5, CAP_X, walk), MAIN_DECK_Y, STAGE_Z);
    }

    let leanX = 0;
    let frontLeg = 0;
    let backLeg = 0;

    if (t < STRIDE_END) {
      const stride = Math.sin(t * 11) * 0.55;

      frontLeg = stride;
      backLeg = -stride;
    } else if (t < KICK_START) {
      // standing over the victim, hands on hips, letting the excuse hang in the air
      leanX = 0.05 + Math.sin(t * 1.6) * 0.02;
    } else {
      const kt = t - KICK_START;

      if (kt < 0.35) {
        const w = kt / 0.35; // wind up: lean back, leg cocked back
        leanX = -0.18 * w;
        frontLeg = 0.7 * w;
      } else if (kt < 0.52) {
        const w = (kt - 0.35) / 0.17; // snap forward
        leanX = lerp(-0.18, 0.5, w);
        frontLeg = lerp(0.7, -1.7, w);
      } else {
        const w = clamp01((kt - 0.52) / 0.7); // recover
        leanX = lerp(0.5, 0.08, w);
        frontLeg = lerp(-1.7, -0.15, w);
      }
    }

    if (capLean.current) capLean.current.rotation.x = leanX;
    if (capLeg.current) capLeg.current.rotation.x = frontLeg;
    if (capLegBack.current) capLegBack.current.rotation.x = backLeg;

    // ── Victim: cower, get launched on a gravity arc, then sink (drown) ──
    if (victim.current) {
      const dt = t - KICK_T;

      if (dt <= 0) {
        victim.current.position.set(VIC_X, MAIN_DECK_Y, STAGE_Z);
        victim.current.rotation.set(0, 0, Math.sin(t * 9) * 0.06);

        if (vArmL.current) vArmL.current.rotation.x = -1.6;
        if (vArmR.current) vArmR.current.rotation.x = -1.6;
      } else if (dt < ENTER_DT) {
        // ballistic flight — a single slow back-flip, not a frantic spin
        victim.current.position.set(VIC_X + V0.x * dt, MAIN_DECK_Y + 1 + V0.y * dt - 0.5 * G * dt * dt, STAGE_Z + V0.z * dt);
        victim.current.rotation.set(dt * 1.9, dt * 0.5, dt * 0.9);

        const flail = Math.sin(t * 28) * 1.5;

        if (vArmL.current) vArmL.current.rotation.x = flail;
        if (vArmR.current) vArmR.current.rotation.x = -flail;
      } else {
        // in the water — drift, sink slowly, arms go limp
        const u = dt - ENTER_DT;

        victim.current.position.set(SINK_X + u * 0.5, WATERLINE_Y - Math.min(2.8, u * 1.7), SINK_Z + u * 0.3);
        victim.current.rotation.set(dt * 1.9 + u * 0.2, dt * 0.5, dt * 0.9 - u * 0.2);

        const limp = Math.max(-1.5 + u * 2.5, 0.2);

        if (vArmL.current) vArmL.current.rotation.x = limp;
        if (vArmR.current) vArmR.current.rotation.x = limp;
      }
    }

    // The victim's last excuse — pinned full while he cowers, fades on the boot.
    if (plea.current) {
      const fade = t < KICK_T ? 1 : Math.max(0, 1 - (t - KICK_T) / 0.22);

      plea.current.style.opacity = String(fade);
    }

    // Splash on water entry.
    if (splash.current) {
      const s = (t - (KICK_T + ENTER_DT)) / 0.7;

      if (s > 0 && s < 1) {
        splash.current.visible = true;
        splash.current.scale.setScalar(0.4 + s * 3);
        (splash.current.children[0] as Mesh<never, MeshBasicMaterial>).material.opacity = (1 - s) * 0.6;
      } else {
        splash.current.visible = false;
      }
    }

    // Bubbles rising from the drowning point.
    if (bubbles.current) {
      const active = t > KICK_T + ENTER_DT && t < WASTED_END + 0.6;

      bubbles.current.visible = active;

      if (active) {
        bubbles.current.children.forEach((child, idx) => {
          const phase = (t * 0.8 + idx * 0.37) % 1;

          child.position.y = phase * 2.2;
          child.position.x = Math.sin(idx * 2 + t) * 0.5;
          (child as Mesh<never, MeshBasicMaterial>).material.opacity = (1 - phase) * 0.5;
        });
      }
    }
  });

  return (
    <group>
      <pointLight position={[CAP_X - 1, MAIN_DECK_Y + 4, STAGE_Z + 2]} intensity={55} distance={26} decay={1.3} color="#fff0d2" />
      <pointLight position={[SINK_X, WATERLINE_Y + 4, SINK_Z]} intensity={28} distance={20} decay={1.4} color="#cdd8e6" />

      {/* Captain */}
      <group ref={captain} position={[CAP_X - 5, MAIN_DECK_Y, STAGE_Z]} rotation={[0, -Math.PI / 2, 0]}>
        <group ref={capLegBack} position={[-0.16, 0.85, 0]}>
          <mesh position={[0, -0.42, 0]}>
            <boxGeometry args={[0.22, 0.85, 0.24]} />
            <meshStandardMaterial color="#15110b" roughness={0.85} />
          </mesh>
        </group>
        <group ref={capLeg} position={[0.16, 0.85, 0]}>
          <mesh position={[0, -0.42, 0.05]}>
            <boxGeometry args={[0.22, 0.85, 0.24]} />
            <meshStandardMaterial color="#15110b" roughness={0.85} />
          </mesh>
        </group>
        <group ref={capLean} position={[0, 0.85, 0]}>
          <mesh position={[0, 0.34, 0]}>
            <boxGeometry args={[0.68, 0.98, 0.42]} />
            <meshStandardMaterial color={NAVY} roughness={0.8} />
          </mesh>
          <mesh position={[0.34, 0.5, 0.2]} rotation={[0, 0, -0.5]}>
            <boxGeometry args={[0.2, 0.82, 0.22]} />
            <meshStandardMaterial color={NAVY} roughness={0.8} />
          </mesh>
          <mesh position={[-0.34, 0.4, 0]}>
            <boxGeometry args={[0.2, 0.82, 0.22]} />
            <meshStandardMaterial color={NAVY} roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.05, 0]}>
            <sphereGeometry args={[0.32, 14, 14]} />
            <meshStandardMaterial color={SKIN} roughness={0.7} />
          </mesh>
          <Hat />
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.35, 0.78, 0]}>
              <boxGeometry args={[0.2, 0.1, 0.3]} />
              <meshStandardMaterial color="#caa54a" metalness={0.5} roughness={0.4} />
            </mesh>
          ))}
        </group>
      </group>

      {/* Victim */}
      <group ref={victim} position={[VIC_X, MAIN_DECK_Y, STAGE_Z]}>
        <Html position={[0, 2.9, 0]} center distanceFactor={9} zIndexRange={[20, 0]} pointerEvents="none">
          <div
            ref={plea}
            className="w-max max-w-[220px] rounded-2xl bg-white px-3.5 py-2 text-center font-sans text-[13px] leading-snug font-medium text-[#1a2530] shadow-lg"
            style={{ transform: 'translateY(-50%)' }}
          >
            Give me a few more days to polish the product
            <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
          </div>
        </Html>
        {[-0.16, 0.16].map((x) => (
          <mesh key={x} position={[x, 0.42, 0]}>
            <boxGeometry args={[0.2, 0.85, 0.22]} />
            <meshStandardMaterial color="#2a2018" roughness={0.85} />
          </mesh>
        ))}
        <mesh position={[0, 1.18, 0]}>
          <boxGeometry args={[0.62, 0.92, 0.4]} />
          <meshStandardMaterial color={COAT_V} roughness={0.85} />
        </mesh>
        <group ref={vArmL} position={[-0.44, 1.5, 0]}>
          <mesh position={[0, -0.35, 0]}>
            <boxGeometry args={[0.18, 0.78, 0.2]} />
            <meshStandardMaterial color={COAT_V} roughness={0.85} />
          </mesh>
        </group>
        <group ref={vArmR} position={[0.44, 1.5, 0]}>
          <mesh position={[0, -0.35, 0]}>
            <boxGeometry args={[0.18, 0.78, 0.2]} />
            <meshStandardMaterial color={COAT_V} roughness={0.85} />
          </mesh>
        </group>
        <mesh position={[0, 1.78, 0]}>
          <sphereGeometry args={[0.3, 14, 14]} />
          <meshStandardMaterial color={SKIN} roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.95, 0]}>
          <boxGeometry args={[0.5, 0.18, 0.5]} />
          <meshStandardMaterial color="#9a2420" roughness={0.8} />
        </mesh>
      </group>

      {/* Splash ring + rising bubbles at the drowning point. */}
      <group ref={splash} position={[SINK_X, WATERLINE_Y + 0.2, SINK_Z]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <mesh>
          <ringGeometry args={[0.6, 1, 20]} />
          <meshBasicMaterial color="#cdd6e0" transparent opacity={0.6} toneMapped={false} />
        </mesh>
      </group>
      <group ref={bubbles} position={[SINK_X, WATERLINE_Y, SINK_Z]} visible={false}>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i} position={[0, 0, 0]}>
            <sphereGeometry args={[0.1 + (i % 3) * 0.03, 8, 8]} />
            <meshBasicMaterial color="#dfe7ef" transparent opacity={0.5} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
};
