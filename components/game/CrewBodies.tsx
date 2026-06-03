import { memo, useEffect, useRef } from 'react';
import { Color, InstancedMesh, Object3D, Vector3 } from 'three';
import { CrewPersonData } from '@/lib/types';

// All crew bodies are drawn with a handful of InstancedMeshes (one per body part)
// instead of thousands of individual meshes — this is what keeps 200+ pirates at
// a smooth frame rate. The face billboards are handled separately in CrewDeck.
const COATS = ['#1e2a44', '#3a1c20', '#173a36', '#2e2113', '#22203a', '#3a2a14', '#142a30'];
const PANTS = '#1a1510';

const dummy = new Object3D();
const col = new Color();
const yAxis = new Vector3(0, 1, 0);
const off = new Vector3();

interface PartProps {
  meshRef: React.RefObject<InstancedMesh | null>;
  size: [number, number, number];
  count: number;
}

const Part = ({ meshRef, size, count }: PartProps) => (
  <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
    <boxGeometry args={size} />
    <meshStandardMaterial roughness={0.82} />
  </instancedMesh>
);

const CrewBodies = memo(({ people }: { people: CrewPersonData[] }) => {
  const n = people.length;
  const torso = useRef<InstancedMesh>(null);
  const legL = useRef<InstancedMesh>(null);
  const legR = useRef<InstancedMesh>(null);
  const armL = useRef<InstancedMesh>(null);
  const armR = useRef<InstancedMesh>(null);

  useEffect(() => {
    const write = (mesh: InstancedMesh | null, localX: number, localY: number, coat: boolean) => {
      if (!mesh) return;

      people.forEach((p, i) => {
        off.set(localX, 0, 0).applyAxisAngle(yAxis, p.rotation);
        dummy.position.set(p.position[0] + off.x, p.position[1] + localY, p.position[2] + off.z);
        dummy.rotation.set(0, p.rotation, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        col.set(coat ? COATS[p.hatHue % COATS.length] : PANTS);
        mesh.setColorAt(i, col);
      });

      mesh.instanceMatrix.needsUpdate = true;

      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };

    write(torso.current, 0, 1.18, true);
    write(legL.current, -0.17, 0.42, false);
    write(legR.current, 0.17, 0.42, false);
    write(armL.current, -0.46, 1.2, true);
    write(armR.current, 0.46, 1.2, true);
  }, [people]);

  return (
    <>
      <Part meshRef={torso} size={[0.66, 0.95, 0.4]} count={n} />
      <Part meshRef={legL} size={[0.22, 0.85, 0.24]} count={n} />
      <Part meshRef={legR} size={[0.22, 0.85, 0.24]} count={n} />
      <Part meshRef={armL} size={[0.2, 0.82, 0.24]} count={n} />
      <Part meshRef={armR} size={[0.2, 0.82, 0.24]} count={n} />
    </>
  );
});

CrewBodies.displayName = 'CrewBodies';

export default CrewBodies;
