import { useRef } from 'react';
import { Camera as ThreeCamera, Group, Vector3 } from 'three';
import { mobileInput } from '@/lib/mobileInput';
import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';

interface CameraProps {
  target: React.RefObject<Group | null>;
  isMobile: boolean;
}

const EYE_HEIGHT = 1.62;
const LOOK_SENS = 0.008; // radians per pixel
const BOB_FREQUENCY = 9.2;
const BOB_VERTICAL = 0.05;
const BOB_LATERAL = 0.028;

const _bobRight = new Vector3();
const _bobForward = new Vector3();
const _bobUp = new Vector3(0, 1, 0);

const Camera = ({ target, isMobile }: CameraProps) => {
  const { camera } = useThree();
  const yaw = useRef(0); // radians — Y rotation (left/right)
  const pitch = useRef(0); // radians — X rotation (up/down)
  const bobPhase = useRef(0);
  const bobAmount = useRef(0);
  const prevX = useRef(0);
  const prevZ = useRef(0);

  useFrame((_, delta) => {
    if (!target.current) return;

    const p = target.current.position;
    const moved = Math.hypot(p.x - prevX.current, p.z - prevZ.current);

    prevX.current = p.x;
    prevZ.current = p.z;

    const walking = moved / Math.max(delta, 0.0001) > 0.6;

    bobAmount.current += ((walking ? 1 : 0) - bobAmount.current) * Math.min(1, delta * 8);

    if (walking) bobPhase.current += delta * BOB_FREQUENCY;

    const vertical = Math.sin(bobPhase.current) * BOB_VERTICAL * bobAmount.current;
    const lateral = Math.cos(bobPhase.current * 0.5) * BOB_LATERAL * bobAmount.current;

    camera.getWorldDirection(_bobForward);
    _bobRight.crossVectors(_bobForward, _bobUp).normalize();

    camera.position.set(p.x + _bobRight.x * lateral, p.y + EYE_HEIGHT + vertical, p.z + _bobRight.z * lateral);

    if (isMobile) {
      yaw.current -= mobileInput.ldx * LOOK_SENS;
      pitch.current -= mobileInput.ldy * LOOK_SENS;
      pitch.current = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitch.current));
      mobileInput.ldx = 0;
      mobileInput.ldy = 0;
      camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ');
    }
  });

  return isMobile ? null : <PointerLockControls />;
};

export default Camera;

// ─── Reusable vectors — allocated once, never inside useFrame ───────────────
const _forward = new Vector3();
const _right = new Vector3();
const _up = new Vector3(0, 1, 0);

/**
 * Returns the camera's horizontal forward and right unit vectors.
 * Uses getWorldDirection() so it's correct regardless of how the camera
 * stores its orientation (quaternion via PointerLockControls or manual Euler).
 */
export const getCameraForwardRight = (camera: ThreeCamera): { forward: Vector3; right: Vector3 } => {
  camera.getWorldDirection(_forward);
  _forward.y = 0;
  _forward.normalize();
  _right.crossVectors(_forward, _up).normalize();

  return { forward: _forward, right: _right };
};
