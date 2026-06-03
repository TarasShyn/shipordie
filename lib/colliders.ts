import {
  FORE_MAST_Z,
  HALF_BEAM,
  HALF_LENGTH,
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
  SPAWN_Y,
  SPAWN_Z,
  TOP_DECK_Y,
  TOP_Z1,
  WHEEL_Z,
} from './space';
import { CrewDeck, CrewPersonData } from './types';

export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  // Optional vertical extent. Without it, the collider blocks at every height
  // (walls, masts). With it, it only blocks crew standing at that level — so a
  // pirate or barrel on a lower deck doesn't block the player on the deck above.
  minY?: number;
  maxY?: number;
}

export const SPAWN: [number, number, number] = [0, SPAWN_Y, SPAWN_Z];

const PLAYER_HEAD = 1.7;

// Does a player standing at (x, y, z) collide with any of the boxes?
export const collidesAt = (x: number, z: number, y: number, radius: number, colliders: AABB[]): boolean => {
  for (const c of colliders) {
    if (x + radius <= c.minX || x - radius >= c.maxX || z + radius <= c.minZ || z - radius >= c.maxZ) continue;

    if (c.minY === undefined || c.maxY === undefined) return true;

    // Vertical overlap between the player's body and the collider.
    if (y + PLAYER_HEAD > c.minY && y < c.maxY) return true;
  }

  return false;
};

// Walls and masts block at every height; the deck levels rise via slopes so no
// interior walls are needed.
export const buildStaticColliders = (): AABB[] => [
  { minX: -(HALF_BEAM + 1), maxX: -(HALF_BEAM - 0.5), minZ: -(HALF_LENGTH + 1), maxZ: HALF_LENGTH + 1 },
  { minX: HALF_BEAM - 0.5, maxX: HALF_BEAM + 1, minZ: -(HALF_LENGTH + 1), maxZ: HALF_LENGTH + 1 },
  { minX: -(HALF_BEAM + 1), maxX: HALF_BEAM + 1, minZ: -(HALF_LENGTH + 1), maxZ: HOLD_Z0 },
  { minX: -(HALF_BEAM + 1), maxX: HALF_BEAM + 1, minZ: TOP_Z1, maxZ: HALF_LENGTH + 1 },

  { minX: -1, maxX: 1, minZ: FORE_MAST_Z - 1, maxZ: FORE_MAST_Z + 1 },
  { minX: -1.1, maxX: 1.1, minZ: MAIN_MAST_Z - 1.1, maxZ: MAIN_MAST_Z + 1.1 },
  { minX: -1, maxX: 1, minZ: MIZZEN_MAST_Z - 1, maxZ: MIZZEN_MAST_Z + 1 },
];

// One solid box per crew member so the player bumps into pirates instead of
// walking through them. Overboard crew (in the sea) are skipped.
export const buildCrewColliders = (people: CrewPersonData[]): AABB[] =>
  people
    .filter((p) => p.deck !== CrewDeck.Overboard)
    .map((p) => {
      const [x, y, z] = p.position;

      return { minX: x - 0.5, maxX: x + 0.5, minZ: z - 0.5, maxZ: z + 0.5, minY: y - 0.2, maxY: y + 2.2 };
    });

// Solid props (barrels, crates, cannons, chest) — positions must match Ship.tsx.
const box = (x: number, z: number, y: number, r: number): AABB => ({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r, minY: y - 0.2, maxY: y + 1.6 });

export const buildPropColliders = (): AABB[] => {
  const mainMidZ = (MAIN_Z0 + MAIN_Z1) / 2;
  const cols: AABB[] = [];

  // Cannons down both gunwales (must match Ship.tsx).
  for (let i = 0; i < 4; i += 1) {
    const z = MAIN_Z0 + 12 + i * ((MAIN_Z1 - MAIN_Z0 - 24) / 3);

    cols.push(box(-(HALF_BEAM - 1.7), z, MAIN_DECK_Y, 0.8), box(HALF_BEAM - 1.7, z, MAIN_DECK_Y, 0.8));
  }

  cols.push(
    // Deck gear.
    box(0, mainMidZ + 11, MAIN_DECK_Y, 0.9), // capstan
    box(-4.5, mainMidZ + 3, MAIN_DECK_Y, 0.8), // brazier
    box(4.5, MAIN_Z1 - 8, MAIN_DECK_Y, 0.9), // map table
    box(-4.5, MAIN_Z1 - 7, MAIN_DECK_Y, 0.7), // ship's bell
    box(HALF_BEAM - 1.6, MAIN_Z0 + 6, MAIN_DECK_Y, 0.6), // anchor
    box(-(HALF_BEAM - 3.6), mainMidZ - 6, MAIN_DECK_Y, 0.5), // powder keg
    box(HALF_BEAM - 3.6, mainMidZ + 18, MAIN_DECK_Y, 0.5), // powder keg
    // Corner crates/barrels.
    box(HALF_BEAM - 2.9, MAIN_Z1 - 5.5, MAIN_DECK_Y, 0.9),
    box(-HALF_BEAM + 2.8, MAIN_Z1 - 5, MAIN_DECK_Y, 0.7),
    // Raised decks.
    box(5, MID_Z0 + 3, MID_DECK_Y, 0.7),
    box(-5, MID_Z1 - 4, MID_DECK_Y, 0.7),
    box(5, WHEEL_Z - 5, TOP_DECK_Y, 0.7),
    // Hold cargo.
    box(-4.5, HOLD_Z0 + 4.7, HOLD_Y, 0.9),
    box(4.8, HOLD_Z0 + 5, HOLD_Y, 0.9),
    box(0, HOLD_Z0 + 3, HOLD_Y, 0.7),
    box(6, HOLD_Z1 - 3, HOLD_Y, 0.7),
    box(-6, HOLD_Z1 - 3, HOLD_Y, 0.5)
  );

  return cols;
};
