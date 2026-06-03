import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Group, Object3D, Raycaster, Vector2, Vector3 } from 'three';
import { nav } from '@/lib/nav';
import { CrewDeck as Deck, CrewMember, CrewPersonData } from '@/lib/types';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';

import CrewBodies from './CrewBodies';
import { CrewFace, FACE_HEAD_Y } from './CrewFace';
import SpeechBubble from './SpeechBubble';

interface CrewDeckProps {
  people: CrewPersonData[];
  onTargetMember: (member: CrewMember | null) => void;
  onOpenMember: (member: CrewMember) => void;
}

const PICK_DISTANCE = 90;
const BUBBLE_MAX_DIST = 24;
const BUBBLE_CAP = 10;
const RECOMPUTE = 0.15;
// Faces fade in slowly (bodies are instanced and appear instantly), spreading the
// texture decode so neither the cinematic nor the deck stutters.
const BATCH = 7;
const BATCH_DELAY = 170;

const _camPos = new Vector3();
const _camDir = new Vector3();
const _head = new Vector3();
const _dir = new Vector3();

const CrewDeck = ({ people, onTargetMember, onOpenMember }: CrewDeckProps) => {
  const { camera } = useThree();
  const facesRef = useRef<Group>(null);
  const raycaster = useMemo(() => new Raycaster(), []);
  const occRay = useMemo(() => new Raycaster(), []);
  const screenCenter = useMemo(() => new Vector2(0, 0), []);
  const targetedRef = useRef<CrewMember | null>(null);
  const bubbleKey = useRef('');
  const elapsed = useRef(0);
  const [count, setCount] = useState(() => Math.min(BATCH, people.length));
  const [bubbles, setBubbles] = useState<CrewPersonData[]>([]);

  useEffect(() => {
    if (count >= people.length) return;

    const id = setTimeout(() => setCount((c) => Math.min(c + BATCH, people.length)), BATCH_DELAY);

    return () => clearTimeout(id);
  }, [count, people.length]);

  useEffect(() => {
    raycaster.far = PICK_DISTANCE;

    const onMouseDown = () => {
      if (document.pointerLockElement && targetedRef.current) onOpenMember(targetedRef.current);
    };

    window.addEventListener('mousedown', onMouseDown);

    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [onOpenMember, raycaster]);

  const faces = useMemo(
    () =>
      people.slice(0, count).map((p) => (
        <Suspense key={p.id} fallback={null}>
          <CrewFace member={p.member} position={p.position} />
        </Suspense>
      )),
    [people, count]
  );

  useFrame((_, delta) => {
    const children = facesRef.current?.children as Object3D[] | undefined;

    // Billboard every face toward the camera in one pass (no per-face callbacks).
    if (children) for (const child of children) child.quaternion.copy(camera.quaternion);

    // Crosshair pick for clicking a pirate.
    raycaster.setFromCamera(screenCenter, camera);

    const hit = children ? raycaster.intersectObjects(children, false).find((e) => e.object.userData?.member) : undefined;
    const member = (hit?.object.userData?.member as CrewMember | undefined) ?? null;

    if (member?.handle !== targetedRef.current?.handle) {
      targetedRef.current = member;
      onTargetMember(member);
    }

    // Pick which crew show a bubble (throttled): nearest, in front, ship-visible.
    elapsed.current += delta;

    if (elapsed.current < RECOMPUTE) return;

    elapsed.current = 0;
    camera.getWorldPosition(_camPos);
    camera.getWorldDirection(_camDir);

    const candidates: { person: CrewPersonData; d2: number }[] = [];

    for (const person of people) {
      if (person.deck === Deck.Overboard) continue;
      if (!person.member.bubble) continue; // no post → no bubble (live mode)

      const dx = person.position[0] - _camPos.x;
      const dz = person.position[2] - _camPos.z;
      const d2 = dx * dx + dz * dz;

      if (d2 > BUBBLE_MAX_DIST * BUBBLE_MAX_DIST) continue;
      if (dx * _camDir.x + dz * _camDir.z <= 0) continue;

      candidates.push({ person, d2 });
    }

    candidates.sort((a, b) => a.d2 - b.d2);

    const picked: CrewPersonData[] = [];

    for (const { person } of candidates) {
      if (picked.length >= BUBBLE_CAP) break;

      _head.set(person.position[0], person.position[1] + FACE_HEAD_Y, person.position[2]);
      _dir.subVectors(_head, _camPos);

      const dist = _dir.length();

      _dir.normalize();
      occRay.set(_camPos, _dir);
      occRay.far = dist - 1.1;

      if (nav.occluders && occRay.intersectObject(nav.occluders, true).length > 0) continue;

      picked.push(person);
    }

    const key = picked
      .map((p) => p.id)
      .sort()
      .join('|');

    if (key !== bubbleKey.current) {
      bubbleKey.current = key;
      setBubbles(picked);
    }
  });

  return (
    <>
      <CrewBodies people={people} />
      <group ref={facesRef}>{faces}</group>
      {bubbles.map((p) => (
        <Html
          key={p.id}
          position={[p.position[0], p.position[1] + FACE_HEAD_Y + p.bubbleOffset, p.position[2]]}
          center
          distanceFactor={7}
          zIndexRange={[1800, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <SpeechBubble member={p.member} />
        </Html>
      ))}
    </>
  );
};

export default CrewDeck;
