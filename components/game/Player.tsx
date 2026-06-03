import { forwardRef, useEffect, useMemo, useRef } from 'react';
import { Group, Quaternion, Raycaster, Vector3 } from 'three';
import { isKeyPressed } from '@/hooks/useKeyboard';
import { buildCrewColliders, buildPropColliders, buildStaticColliders, collidesAt, SPAWN } from '@/lib/colliders';
import { mobileInput } from '@/lib/mobileInput';
import { nav } from '@/lib/nav';
import { SHIP_MAX_X, SHIP_MAX_Z, SHIP_MIN_X, SHIP_MIN_Z } from '@/lib/space';
import { CrewPersonData } from '@/lib/types';
import { useFrame, useThree } from '@react-three/fiber';

import { getCameraForwardRight } from './Camera';

const SPEED = 7.8;
const PLAYER_RADIUS = 0.4;
const GRAVITY = -0.022;
const JUMP_VEL = 0.26;
const STEP_UP = 0.65; // max height the player auto-steps up (ramps, small steps)
const SWING_SPEED = 8;
const SWING_AMP = 0.38;

const _move = new Vector3();
const _vel = new Vector3();
const _camFwd = new Vector3();
const _camRt = new Vector3();
const _camUp = new Vector3();
const _swingQ = new Quaternion();
const _xAxis = new Vector3(1, 0, 0);
const _rayOrigin = new Vector3();
const _down = new Vector3(0, -1, 0);

const PUNCH_DURATION = 0.2;
const PUNCH_RAISE = 0.28;
const PUNCH_DROP = 0.18;


const Hands = ({ isMovingRef }: { isMovingRef: React.MutableRefObject<boolean> }) => {
  const { camera } = useThree();
  const rightRef = useRef<Group>(null);
  const leftRef = useRef<Group>(null);
  const cycle = useRef(0);
  const smooth = useRef(0);
  const punching = useRef(false);
  const punchTimer = useRef(0);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && !punching.current) {
        punching.current = true;
        punchTimer.current = 0;
      }
    };

    window.addEventListener('mousedown', onMouseDown);

    return () => window.removeEventListener('mousedown', onMouseDown);
  }, []);

  useFrame((_, delta) => {
    if (!rightRef.current || !leftRef.current) return;

    if (punching.current) {
      punchTimer.current += delta;

      if (punchTimer.current >= PUNCH_DURATION) {
        punching.current = false;
        punchTimer.current = 0;
      }
    }

    if (isMovingRef.current) cycle.current += delta * SWING_SPEED;

    const target = isMovingRef.current ? Math.sin(cycle.current) * SWING_AMP : 0;

    smooth.current += (target - smooth.current) * 0.22;

    camera.getWorldDirection(_camFwd);
    _camRt.crossVectors(_camFwd, camera.up).normalize();
    _camUp.crossVectors(_camRt, _camFwd).normalize();

    let punchY = 0;
    let punchFwd = 0;

    if (punching.current) {
      const p = punchTimer.current / PUNCH_DURATION;

      if (p < 0.2) {
        const t = p / 0.2;

        punchY = PUNCH_RAISE * t;
        punchFwd = -0.04 * t;
      } else if (p < 0.6) {
        const t = (p - 0.2) / 0.4;

        punchY = PUNCH_RAISE - (PUNCH_RAISE + PUNCH_DROP) * t;
        punchFwd = 0.12 * t - 0.04;
      } else {
        const t = (p - 0.6) / 0.4;

        punchY = -PUNCH_DROP * (1 - t);
        punchFwd = 0.08 * (1 - t);
      }
    }

    rightRef.current.position
      .copy(camera.position)
      .addScaledVector(_camRt, 0.25)
      .addScaledVector(_camUp, -0.33 + punchY)
      .addScaledVector(_camFwd, 0.42 + punchFwd);
    _swingQ.setFromAxisAngle(_xAxis, smooth.current);
    rightRef.current.quaternion.multiplyQuaternions(camera.quaternion, _swingQ);

    leftRef.current.position.copy(camera.position).addScaledVector(_camRt, -0.25).addScaledVector(_camUp, -0.33).addScaledVector(_camFwd, 0.42);
    _swingQ.setFromAxisAngle(_xAxis, -smooth.current);
    leftRef.current.quaternion.multiplyQuaternions(camera.quaternion, _swingQ);
  });

  return (
    <>
      <group ref={rightRef} renderOrder={999}>
        <mesh renderOrder={999} castShadow>
          <boxGeometry args={[0.1, 0.22, 0.1]} />
          <meshStandardMaterial color="#6b3f1d" depthTest={false} />
        </mesh>
        <mesh position={[0, -0.17, 0]} renderOrder={999}>
          <boxGeometry args={[0.09, 0.1, 0.09]} />
          <meshStandardMaterial color="#E8C090" depthTest={false} />
        </mesh>
      </group>
      <group ref={leftRef} renderOrder={999}>
        <mesh renderOrder={999} castShadow>
          <boxGeometry args={[0.1, 0.22, 0.1]} />
          <meshStandardMaterial color="#6b3f1d" depthTest={false} />
        </mesh>
        <mesh position={[0, -0.17, 0]} renderOrder={999}>
          <boxGeometry args={[0.09, 0.1, 0.09]} />
          <meshStandardMaterial color="#E8C090" depthTest={false} />
        </mesh>
      </group>
    </>
  );
};

const Body = ({ leftLegRef, rightLegRef }: { leftLegRef: React.RefObject<Group | null>; rightLegRef: React.RefObject<Group | null> }) => {
  const { camera } = useThree();
  const offsetRef = useRef<Group>(null);

  useFrame(() => {
    if (!offsetRef.current) return;

    camera.getWorldDirection(_camFwd);
    offsetRef.current.position.set(-_camFwd.x * 0.22, 0, -_camFwd.z * 0.22);
  });

  return (
    <group ref={offsetRef}>
      <mesh position={[0, 1.42, 0]} castShadow>
        <boxGeometry args={[0.28, 0.28, 0.28]} />
        <meshStandardMaterial color="#E8C090" />
      </mesh>

      <mesh position={[0, 0.88, 0]} castShadow>
        <boxGeometry args={[0.42, 0.6, 0.24]} />
        <meshStandardMaterial color="#6b3f1d" />
      </mesh>

      <group ref={leftLegRef} position={[-0.11, 0.54, 0]}>
        <mesh position={[0, -0.17, 0]} castShadow>
          <boxGeometry args={[0.14, 0.32, 0.14]} />
          <meshStandardMaterial color="#3a2a18" />
        </mesh>
        <mesh position={[0, -0.42, 0.03]} castShadow>
          <boxGeometry args={[0.12, 0.25, 0.13]} />
          <meshStandardMaterial color="#1A1A2A" />
        </mesh>
      </group>

      <group ref={rightLegRef} position={[0.11, 0.54, 0]}>
        <mesh position={[0, -0.17, 0]} castShadow>
          <boxGeometry args={[0.14, 0.32, 0.14]} />
          <meshStandardMaterial color="#3a2a18" />
        </mesh>
        <mesh position={[0, -0.42, 0.03]} castShadow>
          <boxGeometry args={[0.12, 0.25, 0.13]} />
          <meshStandardMaterial color="#1A1A2A" />
        </mesh>
      </group>
    </group>
  );
};

const Player = forwardRef<Group, { people: CrewPersonData[] }>(({ people }, ref) => {
  const allColliders = useMemo(() => [...buildStaticColliders(), ...buildPropColliders(), ...buildCrewColliders(people)], [people]);
  const { camera } = useThree();
  const raycaster = useMemo(() => new Raycaster(), []);
  const velY = useRef(0);
  const grounded = useRef(true);
  const isMoving = useRef(false);
  const limbCycle = useRef(0);
  const smoothLimb = useRef(0);

  const leftLegRef = useRef<Group>(null);
  const rightLegRef = useRef<Group>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const group = ref as React.RefObject<Group | null>;

      if (e.code === 'KeyR' && group?.current) {
        group.current.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
        velY.current = 0;
      }

      if (e.code === 'Space' && grounded.current) velY.current = JUMP_VEL;
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [ref]);

  // Floor-following: raycast straight down against the ship's walkable decks/ramps
  // and return the highest surface at or just below the player (so ramps and small
  // steps are climbable but sheer walls are not).
  const groundAt = (x: number, y: number, z: number): number | null => {
    if (!nav.root) return null;

    _rayOrigin.set(x, y + STEP_UP, z);
    raycaster.set(_rayOrigin, _down);
    raycaster.far = 60;

    const hits = raycaster.intersectObject(nav.root, true);
    let best: number | null = null;

    for (const hit of hits) {
      if (hit.point.y <= y + STEP_UP + 0.02 && (best === null || hit.point.y > best)) best = hit.point.y;
    }

    return best;
  };

  useFrame((_, delta) => {
    const group = ref as React.RefObject<Group | null>;

    if (!group?.current) return;

    const cur = group.current.position;
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

    const { forward, right } = getCameraForwardRight(camera);

    _move.set(0, 0, 0);

    if (isKeyPressed('ArrowUp') || isKeyPressed('KeyW')) _move.add(forward);

    if (isKeyPressed('ArrowDown') || isKeyPressed('KeyS')) _move.sub(forward);

    if (isKeyPressed('ArrowLeft') || isKeyPressed('KeyA')) _move.sub(right);

    if (isKeyPressed('ArrowRight') || isKeyPressed('KeyD')) _move.add(right);

    if (mobileInput.jx !== 0) _move.addScaledVector(right, mobileInput.jx);

    if (mobileInput.jy !== 0) _move.addScaledVector(forward, -mobileInput.jy);

    const hasInput = _move.lengthSq() > 0;

    if (hasInput) _move.normalize();

    const accel = hasInput ? 11 : 16;
    const blend = Math.min(1, delta * accel);

    _vel.x += (_move.x * SPEED - _vel.x) * blend;
    _vel.z += (_move.z * SPEED - _vel.z) * blend;

    const speed = Math.hypot(_vel.x, _vel.z);
    const moving = speed > 0.15;

    isMoving.current = moving;

    const speedRatio = Math.min(1, speed / SPEED);

    if (moving) limbCycle.current += delta * SWING_SPEED * (0.4 + speedRatio * 0.6);

    const targetSwing = moving ? Math.sin(limbCycle.current) * SWING_AMP * (0.4 + speedRatio * 0.6) : 0;

    smoothLimb.current += (targetSwing - smoothLimb.current) * 0.22;

    if (leftLegRef.current) leftLegRef.current.rotation.x = smoothLimb.current;

    if (rightLegRef.current) rightLegRef.current.rotation.x = -smoothLimb.current;

    // ── Horizontal movement with axis-separated wall sliding ──
    if (moving) {
      const dx = _vel.x * delta;
      const dz = _vel.z * delta;
      const tx = clamp(cur.x + dx, SHIP_MIN_X, SHIP_MAX_X);
      const tz = clamp(cur.z + dz, SHIP_MIN_Z, SHIP_MAX_Z);

      // Blocked by a collider, OR there's no deck beneath the target (an edge of
      // the ship). The edge guard only applies while grounded, so falling/jumping
      // onto a lower deck still works.
      const blocked = (x: number, z: number) =>
        collidesAt(x, z, cur.y, PLAYER_RADIUS, allColliders) || (grounded.current && groundAt(x, cur.y, z) === null);

      if (!blocked(tx, tz)) {
        cur.x = tx;
        cur.z = tz;
      } else if (!blocked(tx, cur.z)) {
        cur.x = tx;
        _vel.z = 0;
      } else if (!blocked(cur.x, tz)) {
        cur.z = tz;
        _vel.x = 0;
      } else {
        _vel.x = 0;
        _vel.z = 0;
      }
    }

    // ── Vertical: floor-follow + gravity + jump ──
    const ground = groundAt(cur.x, cur.y, cur.z);

    if (ground !== null && velY.current <= 0 && cur.y <= ground + STEP_UP) {
      cur.y = ground;
      velY.current = 0;
      grounded.current = true;
    } else {
      velY.current += GRAVITY;
      cur.y += velY.current;
      grounded.current = false;

      if (ground !== null && cur.y <= ground) {
        cur.y = ground;
        velY.current = 0;
        grounded.current = true;
      }

      if (cur.y < -20) {
        cur.set(SPAWN[0], SPAWN[1], SPAWN[2]);
        velY.current = 0;
      }
    }
  });

  return (
    <>
      <group ref={ref} position={SPAWN}>
        <Body leftLegRef={leftLegRef} rightLegRef={rightLegRef} />
      </group>
      <Hands isMovingRef={isMoving} />
    </>
  );
});

Player.displayName = 'Player';

export default Player;
