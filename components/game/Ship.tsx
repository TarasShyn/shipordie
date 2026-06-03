import { useEffect, useMemo, useRef } from 'react';
import { BufferGeometry, CanvasTexture, Group, Mesh, PlaneGeometry, RepeatWrapping, SRGBColorSpace } from 'three';
import { nav } from '@/lib/nav';
import {
  DECK_INNER_W,
  FORE_MAST_Z,
  HALF_BEAM,
  HALF_LENGTH,
  HOLD_SLOPE_Z1,
  HOLD_Y,
  HOLD_Z0,
  HOLD_Z1,
  MAIN_DECK_Y,
  MAIN_MAST_Z,
  MAIN_Z0,
  MAIN_Z1,
  MID_DECK_Y,
  MID_Z0,
  MID_Z1,
  MIZZEN_MAST_Z,
  NEST_Y,
  TOP_DECK_Y,
  TOP_Z0,
  TOP_Z1,
  WATERLINE_Y,
  WHEEL_Z,
} from '@/lib/space';
import { useFrame } from '@react-three/fiber';

const HULL_WOOD = '#3c2614';
const HULL_DARK = '#241307';
const WALE = '#1c0f06';
const RAIL = '#5a3a1f';
const SAIL = '#1a1620'; // dark pirate canvas
const MAST_WOOD = '#5a3c20';
const METAL = '#2b2b30';
const ROPE = '#2a2014';
const GOLD = '#caa54a';

const makePlankTexture = (): CanvasTexture | null => {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');

  canvas.width = 256;
  canvas.height = 256;

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  ctx.fillStyle = '#7a5230';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 8; i += 1) {
    const shade = 70 + ((i * 17) % 40);

    ctx.fillStyle = `rgb(${shade + 50}, ${shade + 22}, ${shade - 10})`;
    ctx.fillRect(0, i * 32, 256, 30);
    ctx.fillStyle = 'rgba(20,10,4,0.45)';
    ctx.fillRect(0, i * 32 + 30, 256, 2);
  }

  for (let i = 0; i < 800; i += 1) {
    ctx.fillStyle = `rgba(30,16,6,${(i % 30) / 120})`;
    ctx.fillRect((i * 53) % 256, (i * 97) % 256, 2, 1);
  }

  const texture = new CanvasTexture(canvas);

  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = 8;

  return texture;
};

// Black Jolly Roger sail — white skull & crossbones on dark canvas.
const makeJollyRoger = (): CanvasTexture | null => {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');

  canvas.width = 512;
  canvas.height = 512;

  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  const BG = '#141118';
  const WHITE = '#ece3cf';

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, 512, 512);

  // Two crossed bones behind the skull (a shaft with rounded knobs at each end).
  const drawBone = (angle: number) => {
    ctx.save();
    ctx.translate(256, 280);
    ctx.rotate(angle);
    ctx.fillStyle = WHITE;
    ctx.fillRect(-150, -13, 300, 26);
    [-150, 150].forEach((bx) => {
      [-15, 15].forEach((by) => {
        ctx.beginPath();
        ctx.arc(bx, by, 17, 0, Math.PI * 2);
        ctx.fill();
      });
    });
    ctx.restore();
  };

  drawBone(Math.PI / 4);
  drawBone(-Math.PI / 4);

  // Skull: cranium + jaw.
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.ellipse(256, 205, 100, 92, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(196, 250);
  ctx.lineTo(316, 250);
  ctx.lineTo(300, 330);
  ctx.quadraticCurveTo(256, 352, 212, 330);
  ctx.closePath();
  ctx.fill();

  // Eye sockets + nose (cut back to the black background).
  ctx.fillStyle = BG;
  ctx.beginPath();
  ctx.arc(220, 200, 33, 0, Math.PI * 2);
  ctx.arc(292, 200, 33, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(256, 222);
  ctx.lineTo(237, 258);
  ctx.lineTo(275, 258);
  ctx.closePath();
  ctx.fill();
  // Teeth gaps.
  [226, 248, 270].forEach((tx) => ctx.fillRect(tx, 296, 8, 42));

  const texture = new CanvasTexture(canvas);

  texture.colorSpace = SRGBColorSpace;

  return texture;
};

const Floor = ({ x = 0, z, w, l, y, plank }: { x?: number; z: number; w: number; l: number; y: number; plank: CanvasTexture | null }) => {
  const map = useMemo(() => {
    if (!plank) return null;

    const t = plank.clone();

    t.needsUpdate = true;
    t.repeat.set(w / 6, l / 6);

    return t;
  }, [plank, w, l]);

  return (
    <mesh position={[x, y - 0.15, z]} receiveShadow userData={{ walkable: true }}>
      <boxGeometry args={[w, 0.3, l]} />
      <meshStandardMaterial map={map ?? undefined} color={map ? '#ffffff' : '#7a5230'} roughness={0.9} />
    </mesh>
  );
};

const Slope = ({ z0, y0, z1, y1, w }: { z0: number; y0: number; z1: number; y1: number; w: number }) => {
  const dz = z1 - z0;
  const dy = y1 - y0;
  const angle = -Math.atan2(dy, dz);
  const length = Math.hypot(dz, dy);

  return (
    <mesh position={[0, (y0 + y1) / 2, (z0 + z1) / 2]} rotation={[angle, 0, 0]} receiveShadow userData={{ walkable: true }}>
      <boxGeometry args={[w, 0.3, length]} />
      <meshStandardMaterial color="#70492a" roughness={0.92} />
    </mesh>
  );
};

// Solid waist-high bulwark wall with a rail cap down each side of a deck level.
const Rail = ({ z0, z1, baseY }: { z0: number; z1: number; baseY: number }) => {
  const mid = (z0 + z1) / 2;
  const len = z1 - z0;

  return (
    <>
      {[-1, 1].map((sign) => (
        <group key={sign}>
          <mesh position={[sign * (HALF_BEAM - 0.4), baseY + 0.5, mid]} castShadow receiveShadow>
            <boxGeometry args={[0.4, 1, len]} />
            <meshStandardMaterial color={HULL_WOOD} roughness={0.9} />
          </mesh>
          <mesh position={[sign * (HALF_BEAM - 0.4), baseY + 1.05, mid]} castShadow>
            <boxGeometry args={[0.6, 0.18, len]} />
            <meshStandardMaterial color={RAIL} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </>
  );
};

const GunPorts = () =>
  [-1, 1].map((sign) =>
    Array.from({ length: 7 }).map((_, i) => {
      const z = -HALF_LENGTH + 14 + i * ((HALF_LENGTH * 2 - 28) / 6);

      return (
        <mesh key={`${sign}-${i}`} position={[sign * (HALF_BEAM + 0.1), WATERLINE_Y + 2.2, z]}>
          <boxGeometry args={[0.2, 1, 1]} />
          <meshStandardMaterial color={WALE} roughness={0.9} />
        </mesh>
      );
    })
  );

const Hull = () => (
  <group>
    {[-1, 1].map((sign) => (
      <group key={sign}>
        <mesh position={[sign * (HALF_BEAM - 0.4), WATERLINE_Y + 1.2, 0]} rotation={[0, 0, sign * 0.1]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 7.2, HALF_LENGTH * 2 - 8]} />
          <meshStandardMaterial color={HULL_WOOD} roughness={0.9} />
        </mesh>
        {/* Wales — dark horizontal trim along the hull. */}
        <mesh position={[sign * (HALF_BEAM + 0.05), WATERLINE_Y + 3.4, 0]} rotation={[0, 0, sign * 0.1]}>
          <boxGeometry args={[0.3, 0.4, HALF_LENGTH * 2 - 9]} />
          <meshStandardMaterial color={WALE} roughness={0.85} />
        </mesh>
        <mesh position={[sign * (HALF_BEAM + 0.05), WATERLINE_Y + 0.6, 0]} rotation={[0, 0, sign * 0.1]}>
          <boxGeometry args={[0.3, 0.4, HALF_LENGTH * 2 - 9]} />
          <meshStandardMaterial color={WALE} roughness={0.85} />
        </mesh>
      </group>
    ))}
    <mesh position={[0, WATERLINE_Y - 1.6, 0]} castShadow>
      <boxGeometry args={[HALF_BEAM * 2 - 2, 2.2, HALF_LENGTH * 2 - 8]} />
      <meshStandardMaterial color={HULL_DARK} roughness={0.95} />
    </mesh>
    {/* Bow wedge + beakhead + figurehead. */}
    <mesh position={[0, WATERLINE_Y + 1, -HALF_LENGTH + 2]} rotation={[0, Math.PI / 4, 0]} castShadow>
      <boxGeometry args={[HALF_BEAM, 6.5, HALF_BEAM]} />
      <meshStandardMaterial color={HULL_WOOD} roughness={0.9} />
    </mesh>
    <mesh position={[0, WATERLINE_Y + 2.4, -HALF_LENGTH - 0.6]} rotation={[0.5, 0, 0]} castShadow>
      <coneGeometry args={[0.6, 1.8, 8]} />
      <meshStandardMaterial color={GOLD} metalness={0.5} roughness={0.4} emissive="#3a2c08" emissiveIntensity={0.3} />
    </mesh>
    {/* Sterncastle blocks supporting the raised decks from below. They stop just
        under the deck planks (deck level − 0.4) so they neither wall off the deck
        above nor z-fight with the walkable floor surface. */}
    <mesh position={[0, (WATERLINE_Y + (MID_DECK_Y - 0.4)) / 2, (MID_Z0 + TOP_Z1) / 2]} castShadow>
      <boxGeometry args={[HALF_BEAM * 2 - 2, MID_DECK_Y - 0.4 - WATERLINE_Y, TOP_Z1 - MID_Z0]} />
      <meshStandardMaterial color={HULL_WOOD} roughness={0.9} />
    </mesh>
    <mesh position={[0, (MID_DECK_Y + (TOP_DECK_Y - 0.4)) / 2, (TOP_Z0 + TOP_Z1) / 2]} castShadow>
      <boxGeometry args={[HALF_BEAM * 2 - 4, TOP_DECK_Y - 0.4 - MID_DECK_Y, TOP_Z1 - TOP_Z0]} />
      <meshStandardMaterial color={HULL_WOOD} roughness={0.9} />
    </mesh>
    {/* Ornate stern transom with lit great-cabin windows. */}
    <mesh position={[0, MID_DECK_Y + 1, HALF_LENGTH - 1]} castShadow>
      <boxGeometry args={[HALF_BEAM * 2 - 3, 4, 1.2]} />
      <meshStandardMaterial color={HULL_DARK} roughness={0.9} />
    </mesh>
    {[-2.4, -0.8, 0.8, 2.4].map((dx) => (
      <mesh key={dx} position={[dx, MID_DECK_Y + 1.2, HALF_LENGTH - 0.3]}>
        <boxGeometry args={[1, 1.6, 0.2]} />
        <meshStandardMaterial color="#ffcf7a" emissive="#ffb347" emissiveIntensity={0.9} toneMapped={false} />
      </mesh>
    ))}
    <GunPorts />
    {/* Bowsprit. */}
    <mesh position={[0, MAIN_DECK_Y + 1, -HALF_LENGTH - 2]} rotation={[Math.PI / 2 + 0.45, 0, 0]} castShadow>
      <cylinderGeometry args={[0.22, 0.32, 10, 8]} />
      <meshStandardMaterial color={MAST_WOOD} roughness={0.8} />
    </mesh>
  </group>
);

// A wind-filled (billowed) canvas sail on a yard. With `map` it becomes the
// black Jolly Roger sail.
const Sail = ({ width, height, y, seed, map }: { width: number; height: number; y: number; seed: number; map?: CanvasTexture | null }) => {
  const ref = useRef<Group>(null);
  const geometry = useMemo<BufferGeometry>(() => {
    const geo = new PlaneGeometry(width, height, 12, 8);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i += 1) {
      const u = pos.getX(i) / width + 0.5;
      const v = pos.getY(i) / height + 0.5;
      const belly = Math.sin(Math.PI * u) * Math.sin(Math.PI * Math.min(1, Math.max(0, v))) * (height * 0.06);

      pos.setZ(i, -belly); // gentle belly, kept subtle so the Jolly Roger stays readable
    }

    geo.computeVertexNormals();

    return geo;
  }, [width, height]);

  useFrame((state) => {
    if (ref.current) ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 1.4 + seed) * 0.05;
  });

  return (
    <group ref={ref} position={[0, y, 0]}>
      <mesh position={[0, height / 2 + 0.15, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, width + 1.6, 8]} />
        <meshStandardMaterial color={MAST_WOOD} roughness={0.8} />
      </mesh>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial
          map={map ?? undefined}
          color={map ? '#ffffff' : SAIL}
          emissive={map ? '#1a1620' : '#5a4f38'}
          emissiveIntensity={0.3}
          roughness={1}
          side={2}
        />
      </mesh>
    </group>
  );
};

// Rope shrouds fanning from the masthead to the deck edges, with ratline rungs.
const Shrouds = ({ z, baseY, top }: { z: number; baseY: number; top: number }) => {
  const lines = [1.2, 2.4, 3.6];

  return (
    <>
      {[-1, 1].map((sign) =>
        lines.map((spread, i) => {
          const dx = sign * spread;
          const dy = baseY - top;
          const len = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx) - Math.PI / 2;

          return (
            <mesh key={`${sign}-${i}`} position={[dx / 2, (top + baseY) / 2, z]} rotation={[0, 0, angle]}>
              <cylinderGeometry args={[0.035, 0.035, len, 5]} />
              <meshStandardMaterial color={ROPE} roughness={1} />
            </mesh>
          );
        })
      )}
      {/* Ratline rungs between the shrouds on each side. */}
      {[-1, 1].map((sign) =>
        Array.from({ length: 6 }).map((_, r) => {
          const t = (r + 1) / 7;
          const yy = baseY + (top - baseY) * t * 0.7;
          const halfSpread = (3.6 * (1 - t * 0.7)) / 2;

          return (
            <mesh key={`r-${sign}-${r}`} position={[sign * (halfSpread + 0.6), yy, z]}>
              <boxGeometry args={[halfSpread * 1.4, 0.05, 0.05]} />
              <meshStandardMaterial color={ROPE} roughness={1} />
            </mesh>
          );
        })
      )}
    </>
  );
};

const Mast = ({
  z,
  baseY,
  height,
  sailW,
  sailH,
  seed,
  jolly,
  pennant,
}: {
  z: number;
  baseY: number;
  height: number;
  sailW: number;
  sailH: number;
  seed: number;
  jolly?: CanvasTexture | null;
  pennant?: boolean;
}) => (
  <group position={[0, baseY, z]}>
    <mesh position={[0, height / 2, 0]} castShadow>
      <cylinderGeometry args={[0.45, 0.62, height, 10]} />
      <meshStandardMaterial color={MAST_WOOD} roughness={0.85} />
    </mesh>
    {/* The big lower sail flies the Jolly Roger; the topsail is plain black. */}
    <Sail width={sailW} height={sailH} y={height * 0.58} seed={seed} map={jolly} />
    <Sail width={sailW * 0.66} height={sailH * 0.5} y={height * 0.88} seed={seed + 1.7} />
    <Shrouds z={0} baseY={2} top={height * 0.82} />
    {pennant && (
      <>
        {/* Red pennant streaming from the masthead. */}
        <mesh position={[1.1, height - 0.2, 0]} castShadow>
          <planeGeometry args={[2.2, 0.7]} />
          <meshStandardMaterial color="#b81d1d" roughness={1} side={2} emissive="#3a0808" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0, height + 0.4, 0]}>
          <sphereGeometry args={[0.22, 8, 8]} />
          <meshStandardMaterial color={GOLD} metalness={0.5} roughness={0.4} />
        </mesh>
      </>
    )}
  </group>
);

const CrowsNest = ({ z, y }: { z: number; y: number }) => (
  <group position={[0, y, z]}>
    <mesh castShadow>
      <cylinderGeometry args={[1.7, 1.4, 1.4, 14, 1, true]} />
      <meshStandardMaterial color={MAST_WOOD} roughness={0.85} side={2} />
    </mesh>
    <mesh position={[0, -0.7, 0]}>
      <cylinderGeometry args={[1.5, 1.5, 0.14, 14]} />
      <meshStandardMaterial color="#4a3017" roughness={0.8} />
    </mesh>
  </group>
);

const Wheel = () => {
  const ref = useRef<Mesh>(null);

  useFrame((state) => {
    if (ref.current) ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.6) * 0.25;
  });

  return (
    <group position={[0, TOP_DECK_Y + 1.3, WHEEL_Z]}>
      <mesh position={[0, -0.7, 0]} castShadow>
        <boxGeometry args={[0.5, 1.4, 0.5]} />
        <meshStandardMaterial color="#4a3017" roughness={0.8} />
      </mesh>
      <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.8, 0.11, 8, 20]} />
        <meshStandardMaterial color={MAST_WOOD} roughness={0.7} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} rotation={[0, 0, (i / 8) * Math.PI * 2]} castShadow>
          <boxGeometry args={[0.08, 1.9, 0.08]} />
          <meshStandardMaterial color={MAST_WOOD} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
};

const Barrel = ({ position }: { position: [number, number, number] }) => (
  <mesh position={position} castShadow>
    <cylinderGeometry args={[0.55, 0.55, 1.3, 12]} />
    <meshStandardMaterial color="#6b4a2a" roughness={0.85} />
  </mesh>
);

const Crate = ({ position, rot = 0 }: { position: [number, number, number]; rot?: number }) => (
  <mesh position={position} rotation={[0, rot, 0]} castShadow>
    <boxGeometry args={[1.2, 1.2, 1.2]} />
    <meshStandardMaterial color="#7a5836" roughness={0.9} />
  </mesh>
);

const Cannon = ({ position, sign }: { position: [number, number, number]; sign: number }) => (
  <group position={position} rotation={[0, (sign * Math.PI) / 2, 0]}>
    <mesh position={[0, 0.35, 0]} castShadow>
      <boxGeometry args={[1, 0.5, 0.7]} />
      <meshStandardMaterial color="#3a2614" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.6, 0.55]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.22, 0.28, 1.5, 12]} />
      <meshStandardMaterial color={METAL} roughness={0.5} metalness={0.6} />
    </mesh>
  </group>
);

const Chest = ({ position, rot = 0 }: { position: [number, number, number]; rot?: number }) => (
  <group position={position} rotation={[0, rot, 0]}>
    <mesh position={[0, 0.3, 0]} castShadow>
      <boxGeometry args={[1.1, 0.6, 0.7]} />
      <meshStandardMaterial color="#5a3a1c" roughness={0.85} />
    </mesh>
    <mesh position={[0, 0.78, 0]}>
      <boxGeometry args={[0.9, 0.18, 0.5]} />
      <meshStandardMaterial color={GOLD} emissive="#6a4e0e" emissiveIntensity={0.5} metalness={0.7} roughness={0.35} />
    </mesh>
  </group>
);

const Lantern = ({ position, intensity = 34 }: { position: [number, number, number]; intensity?: number }) => {
  const ref = useRef<Group>(null);

  useFrame((state) => {
    if (ref.current) ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.3 + position[2]) * 0.1;
  });

  return (
    <group position={position}>
      <group ref={ref}>
        <mesh position={[0, -0.5, 0]}>
          <boxGeometry args={[0.32, 0.44, 0.32]} />
          <meshStandardMaterial color="#ffcf7a" emissive="#ffb347" emissiveIntensity={1.5} toneMapped={false} />
        </mesh>
      </group>
      <pointLight position={[0, -0.5, 0]} color="#ffb55a" intensity={intensity} distance={26} decay={1.4} />
    </group>
  );
};

const CannonballStack = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    {[[0, 0], [0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.16, z]} castShadow>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshStandardMaterial color="#1b1b20" metalness={0.5} roughness={0.5} />
      </mesh>
    ))}
    <mesh position={[0, 0.42, 0]} castShadow>
      <sphereGeometry args={[0.16, 10, 10]} />
      <meshStandardMaterial color="#1b1b20" metalness={0.5} roughness={0.5} />
    </mesh>
  </group>
);

const RopeCoil = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    {[0, 1, 2].map((i) => (
      <mesh key={i} position={[0, 0.07 + i * 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.36 - i * 0.07, 0.07, 6, 16]} />
        <meshStandardMaterial color="#6a5a3a" roughness={1} />
      </mesh>
    ))}
  </group>
);

const Capstan = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    <mesh position={[0, 0.55, 0]} castShadow>
      <cylinderGeometry args={[0.36, 0.46, 1.1, 12]} />
      <meshStandardMaterial color={MAST_WOOD} roughness={0.85} />
    </mesh>
    {[0, 1, 2, 3].map((i) => (
      <mesh key={i} position={[Math.cos((i * Math.PI) / 2) * 0.7, 1.0, Math.sin((i * Math.PI) / 2) * 0.7]} rotation={[0, -(i * Math.PI) / 2, 0]} castShadow>
        <boxGeometry args={[1.1, 0.1, 0.1]} />
        <meshStandardMaterial color="#4a3017" roughness={0.8} />
      </mesh>
    ))}
  </group>
);

const ShipBell = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    {[-0.5, 0.5].map((x) => (
      <mesh key={x} position={[x, 0.7, 0]} castShadow>
        <boxGeometry args={[0.1, 1.4, 0.1]} />
        <meshStandardMaterial color={MAST_WOOD} roughness={0.8} />
      </mesh>
    ))}
    <mesh position={[0, 1.4, 0]} castShadow>
      <boxGeometry args={[1.2, 0.1, 0.1]} />
      <meshStandardMaterial color={MAST_WOOD} roughness={0.8} />
    </mesh>
    <mesh position={[0, 1.12, 0]} castShadow>
      <cylinderGeometry args={[0.28, 0.34, 0.5, 12, 1, true]} />
      <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.4} side={2} />
    </mesh>
  </group>
);

const Anchor = ({ position, rot = 0 }: { position: [number, number, number]; rot?: number }) => (
  <group position={position} rotation={[0, 0, rot]}>
    <mesh castShadow>
      <boxGeometry args={[0.2, 2.2, 0.2]} />
      <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.5} />
    </mesh>
    <mesh position={[0, 1.2, 0]}>
      <torusGeometry args={[0.22, 0.07, 8, 16]} />
      <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.5} />
    </mesh>
    <mesh position={[0, -1.0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.1, 0.1, 1.5, 8]} />
      <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.5} />
    </mesh>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 0.7, -1.15, 0]} rotation={[0, 0, s * 0.6]} castShadow>
        <coneGeometry args={[0.18, 0.6, 4]} />
        <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.5} />
      </mesh>
    ))}
  </group>
);

const PowderKeg = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    <mesh castShadow>
      <cylinderGeometry args={[0.42, 0.42, 0.95, 12]} />
      <meshStandardMaterial color="#3a2a18" roughness={0.85} />
    </mesh>
    {[-0.3, 0.3].map((y) => (
      <mesh key={y} position={[0, y, 0]}>
        <cylinderGeometry args={[0.44, 0.44, 0.08, 12]} />
        <meshStandardMaterial color="#15110b" roughness={0.7} />
      </mesh>
    ))}
  </group>
);

const Brazier = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    {[0, 1, 2].map((i) => (
      <mesh key={i} position={[Math.cos((i * 2 * Math.PI) / 3) * 0.3, 0.35, Math.sin((i * 2 * Math.PI) / 3) * 0.3]} rotation={[0.2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.8, 6]} />
        <meshStandardMaterial color={METAL} roughness={0.6} />
      </mesh>
    ))}
    <mesh position={[0, 0.75, 0]} castShadow>
      <cylinderGeometry args={[0.5, 0.35, 0.4, 12, 1, true]} />
      <meshStandardMaterial color="#1d1d22" metalness={0.5} roughness={0.6} side={2} />
    </mesh>
    <mesh position={[0, 0.85, 0]}>
      <sphereGeometry args={[0.4, 10, 8]} />
      <meshStandardMaterial color="#ff8a2a" emissive="#ff5a14" emissiveIntensity={2} toneMapped={false} />
    </mesh>
    <pointLight position={[0, 1.1, 0]} color="#ff9a40" intensity={40} distance={24} decay={1.5} />
  </group>
);

const MapTable = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    {[[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.35, z]} castShadow>
        <boxGeometry args={[0.1, 0.7, 0.1]} />
        <meshStandardMaterial color="#3a2614" roughness={0.85} />
      </mesh>
    ))}
    <mesh position={[0, 0.74, 0]} castShadow>
      <boxGeometry args={[1.4, 0.1, 0.9]} />
      <meshStandardMaterial color="#5a3a1c" roughness={0.8} />
    </mesh>
    <mesh position={[0.2, 0.81, 0]} rotation={[-Math.PI / 2, 0, 0.3]}>
      <planeGeometry args={[0.8, 0.6]} />
      <meshStandardMaterial color="#d8caa4" roughness={1} side={2} />
    </mesh>
  </group>
);

const Ladder = ({ position, rot = 0 }: { position: [number, number, number]; rot?: number }) => (
  <group position={position} rotation={[0, rot, 0]}>
    {[-0.3, 0.3].map((x) => (
      <mesh key={x} position={[x, 1.4, 0]} castShadow>
        <boxGeometry args={[0.1, 2.8, 0.1]} />
        <meshStandardMaterial color={MAST_WOOD} roughness={0.85} />
      </mesh>
    ))}
    {[0.4, 0.95, 1.5, 2.05, 2.6].map((y) => (
      <mesh key={y} position={[0, y, 0]} castShadow>
        <boxGeometry args={[0.66, 0.08, 0.08]} />
        <meshStandardMaterial color="#4a3017" roughness={0.85} />
      </mesh>
    ))}
  </group>
);

// A skull bobbing in the swell beside the hull (the crew thrown overboard).
const FloatingSkull = ({ x, z, seed }: { x: number; z: number; seed: number }) => {
  const ref = useRef<Group>(null);

  useFrame((state) => {
    if (!ref.current) return;

    const t = state.clock.elapsedTime;

    ref.current.position.y = WATERLINE_Y + 0.2 + Math.sin(t * 1.6 + seed) * 0.25;
    ref.current.rotation.z = Math.sin(t * 1.1 + seed) * 0.2;
  });

  return (
    <group ref={ref} position={[x, WATERLINE_Y + 0.2, z]} rotation={[0, seed, 0]}>
      <mesh>
        <sphereGeometry args={[0.6, 12, 12]} />
        <meshStandardMaterial color="#d8cdb4" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.45, 0.05]}>
        <boxGeometry args={[0.6, 0.4, 0.55]} />
        <meshStandardMaterial color="#d8cdb4" roughness={0.9} />
      </mesh>
      {[-0.22, 0.22].map((ex) => (
        <mesh key={ex} position={[ex, 0.05, 0.5]}>
          <sphereGeometry args={[0.16, 8, 8]} />
          <meshStandardMaterial color="#100c0a" roughness={1} />
        </mesh>
      ))}
    </group>
  );
};

// A lantern hanging from a curved davit arm off the hull side.
const DavitLantern = ({ z, sign }: { z: number; sign: number }) => (
  <group position={[sign * (HALF_BEAM - 0.2), MAIN_DECK_Y + 2.6, z]}>
    <mesh position={[sign * 0.9, 0.4, 0]} rotation={[0, 0, sign * 0.5]} castShadow>
      <cylinderGeometry args={[0.12, 0.12, 2.4, 6]} />
      <meshStandardMaterial color={MAST_WOOD} roughness={0.8} />
    </mesh>
    <mesh position={[sign * 1.7, 0, 0]}>
      <boxGeometry args={[0.36, 0.5, 0.36]} />
      <meshStandardMaterial color="#ffcf7a" emissive="#ffb347" emissiveIntensity={1.6} toneMapped={false} />
    </mesh>
    <pointLight position={[sign * 1.7, 0, 0]} color="#ffb55a" intensity={24} distance={20} decay={1.4} />
  </group>
);

const Ship = () => {
  const plank = useMemo(() => makePlankTexture(), []);
  const jolly = useMemo(() => makeJollyRoger(), []);
  const floorsRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);

  useEffect(() => {
    nav.root = floorsRef.current;
    nav.occluders = bodyRef.current;

    return () => {
      if (nav.root === floorsRef.current) nav.root = null;
      if (nav.occluders === bodyRef.current) nav.occluders = null;
    };
  }, []);

  const mainMidZ = (MAIN_Z0 + MAIN_Z1) / 2;

  return (
    <group ref={bodyRef}>
      <Hull />

      {/* ── Walkable surfaces, five levels connected by slopes ── */}
      <group ref={floorsRef}>
        <Floor z={(HOLD_Z0 + HOLD_Z1) / 2} w={DECK_INNER_W} l={HOLD_Z1 - HOLD_Z0} y={HOLD_Y} plank={plank} />
        <Slope z0={HOLD_Z1} y0={HOLD_Y} z1={HOLD_SLOPE_Z1} y1={MAIN_DECK_Y} w={DECK_INNER_W} />

        <Floor z={mainMidZ} w={DECK_INNER_W} l={MAIN_Z1 - MAIN_Z0} y={MAIN_DECK_Y} plank={plank} />
        <Slope z0={MAIN_Z1} y0={MAIN_DECK_Y} z1={MID_Z0} y1={MID_DECK_Y} w={DECK_INNER_W} />

        <Floor z={(MID_Z0 + MID_Z1) / 2} w={DECK_INNER_W} l={MID_Z1 - MID_Z0} y={MID_DECK_Y} plank={plank} />
        <Slope z0={MID_Z1} y0={MID_DECK_Y} z1={TOP_Z0} y1={TOP_DECK_Y} w={DECK_INNER_W} />

        <Floor z={(TOP_Z0 + TOP_Z1) / 2} w={DECK_INNER_W} l={TOP_Z1 - TOP_Z0} y={TOP_DECK_Y} plank={plank} />
      </group>

      <Rail z0={HOLD_Z0} z1={HOLD_Z1} baseY={HOLD_Y} />
      <Rail z0={MAIN_Z0} z1={MAIN_Z1} baseY={MAIN_DECK_Y} />
      <Rail z0={MID_Z0} z1={MID_Z1} baseY={MID_DECK_Y} />
      <Rail z0={TOP_Z0} z1={TOP_Z1} baseY={TOP_DECK_Y} />

      <Mast z={FORE_MAST_Z} baseY={MAIN_DECK_Y} height={26} sailW={14} sailH={12} seed={0.3} jolly={jolly} />
      <Mast z={MAIN_MAST_Z} baseY={MAIN_DECK_Y} height={38} sailW={18} sailH={15} seed={1.1} jolly={jolly} pennant />
      <Mast z={MIZZEN_MAST_Z} baseY={MID_DECK_Y} height={24} sailW={12} sailH={10} seed={2.4} jolly={jolly} />

      <CrowsNest z={MAIN_MAST_Z} y={MAIN_DECK_Y + NEST_Y - 1} />
      <CrowsNest z={FORE_MAST_Z} y={MAIN_DECK_Y + 14} />
      <Wheel />

      {/* ── Pirate clutter across the decks ── */}
      {/* Cannons run down both gunwales of the main deck. */}
      {[0, 1, 2, 3].map((i) => {
        const z = MAIN_Z0 + 12 + i * ((MAIN_Z1 - MAIN_Z0 - 24) / 3);

        return [-1, 1].map((s) => <Cannon key={`cannon-${s}-${i}`} position={[s * (HALF_BEAM - 1.7), MAIN_DECK_Y, z]} sign={s} />);
      })}
      <CannonballStack position={[-(HALF_BEAM - 3.2), MAIN_DECK_Y, MAIN_Z0 + 16]} />
      <CannonballStack position={[HALF_BEAM - 3.2, MAIN_DECK_Y, mainMidZ + 8]} />
      <CannonballStack position={[-(HALF_BEAM - 3.2), MAIN_DECK_Y, MAIN_Z1 - 16]} />

      {/* Deck gear. */}
      <Capstan position={[0, MAIN_DECK_Y, mainMidZ + 11]} />
      <Brazier position={[-4.5, MAIN_DECK_Y, mainMidZ + 3]} />
      <MapTable position={[4.5, MAIN_DECK_Y, MAIN_Z1 - 8]} />
      <ShipBell position={[-4.5, MAIN_DECK_Y, MAIN_Z1 - 7]} />
      <Anchor position={[HALF_BEAM - 1.6, MAIN_DECK_Y + 1, MAIN_Z0 + 6]} rot={-0.25} />

      {/* Coiled ropes & powder kegs. */}
      <RopeCoil position={[2.6, MAIN_DECK_Y, mainMidZ - 12]} />
      <RopeCoil position={[-(HALF_BEAM - 3), MAIN_DECK_Y, MAIN_Z1 - 18]} />
      <RopeCoil position={[HALF_BEAM - 3, MAIN_DECK_Y, MAIN_Z0 + 22]} />
      <PowderKeg position={[-(HALF_BEAM - 3.6), MAIN_DECK_Y + 0.48, mainMidZ - 6]} />
      <PowderKeg position={[HALF_BEAM - 3.6, MAIN_DECK_Y + 0.48, mainMidZ + 18]} />

      {/* Crates & barrels grouped at the corners. */}
      <Barrel position={[HALF_BEAM - 2.5, MAIN_DECK_Y + 0.65, MAIN_Z1 - 5]} />
      <Barrel position={[HALF_BEAM - 3.4, MAIN_DECK_Y + 0.65, MAIN_Z1 - 6]} />
      <Crate position={[-HALF_BEAM + 2.8, MAIN_DECK_Y + 0.6, MAIN_Z1 - 5]} rot={0.4} />
      <Crate position={[-HALF_BEAM + 2.8, MAIN_DECK_Y + 1.7, MAIN_Z1 - 5]} rot={0.15} />
      <Ladder position={[-(HALF_BEAM - 1.2), MAIN_DECK_Y, MID_Z0 - 1]} rot={Math.PI / 2} />

      {/* Raised-deck props. */}
      <Crate position={[5, MID_DECK_Y + 0.6, MID_Z0 + 3]} rot={-0.3} />
      <Barrel position={[-5, MID_DECK_Y + 0.65, MID_Z1 - 4]} />
      <RopeCoil position={[5.5, MID_DECK_Y, MID_Z1 - 4]} />
      <Chest position={[5, TOP_DECK_Y, WHEEL_Z - 5]} rot={0.2} />

      {/* Hold cargo. */}
      <Barrel position={[-4, HOLD_Y + 0.65, HOLD_Z0 + 4]} />
      <Barrel position={[-5, HOLD_Y + 0.65, HOLD_Z0 + 5.5]} />
      <Barrel position={[-4.5, HOLD_Y + 1.95, HOLD_Z0 + 4.7]} />
      <Crate position={[4, HOLD_Y + 0.6, HOLD_Z0 + 4]} rot={0.5} />
      <Crate position={[5.6, HOLD_Y + 0.6, HOLD_Z0 + 6]} rot={-0.2} />
      <Chest position={[0, HOLD_Y, HOLD_Z0 + 3]} rot={0.3} />
      <Chest position={[6, HOLD_Y, HOLD_Z1 - 3]} rot={-0.4} />
      <PowderKeg position={[-6, HOLD_Y + 0.48, HOLD_Z1 - 3]} />
      <RopeCoil position={[3, HOLD_Y, HOLD_Z1 - 2]} />

      <Lantern position={[-HALF_BEAM + 1.5, MAIN_DECK_Y + 3.4, mainMidZ]} />
      <Lantern position={[HALF_BEAM - 1.5, MAIN_DECK_Y + 3.4, mainMidZ - 30]} />
      <Lantern position={[0, HOLD_Y + 0.6, (HOLD_Z0 + HOLD_Z1) / 2]} />
      <Lantern position={[0, TOP_DECK_Y + 3, WHEEL_Z]} />
      {/* Stern lanterns either side of the transom. */}
      <Lantern position={[-HALF_BEAM + 2, MID_DECK_Y + 3, HALF_LENGTH - 1.5]} intensity={26} />
      <Lantern position={[HALF_BEAM - 2, MID_DECK_Y + 3, HALF_LENGTH - 1.5]} intensity={26} />

      {/* Lanterns on davit arms off the hull, like the reference. */}
      <DavitLantern z={MAIN_Z1 - 4} sign={1} />
      <DavitLantern z={MAIN_Z0 + 8} sign={-1} />

      {/* Skulls bobbing in the water — the crew thrown overboard. */}
      <FloatingSkull x={-HALF_BEAM - 3} z={HOLD_Z0 + 4} seed={0.5} />
      <FloatingSkull x={-HALF_BEAM - 5} z={HOLD_Z0 + 9} seed={1.7} />
      <FloatingSkull x={-HALF_BEAM - 4} z={HOLD_Z0 + 14} seed={2.9} />
      <FloatingSkull x={-HALF_BEAM - 6.5} z={HOLD_Z0 + 1} seed={3.6} />
    </group>
  );
};

export default Ship;
