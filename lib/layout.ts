import {
  DECK_INNER_W,
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
  TOP_DECK_Y,
  TOP_Z0,
  WATERLINE_Y,
  WHEEL_Z,
} from './space';
import { CrewDeck, CrewMember, CrewPersonData, CrewStatus } from './types';

const hashString = (value: string): number => {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0;

  return Math.abs(hash);
};

const noise = (seed: string, salt: number): number => (hashString(`${seed}:${salt}`) % 10000) / 10000;

// Deterministic PRNG so the random scatter is stable across SSR renders.
const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;

  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

interface Box {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y: number;
}

interface Placed {
  x: number;
  z: number;
  y: number;
}

// Scatter `members` randomly inside a box, keeping a minimum spacing so the crew
// look naturally dotted around the deck rather than lined up in a grid.
const scatter = (seed: string, members: CrewMember[], box: Box, minDist: number, avoid: { z: number; r: number }[] = []): Map<string, Placed> => {
  const rng = mulberry32(hashString(seed));
  const placed: Placed[] = [];
  const result = new Map<string, Placed>();

  for (const member of members) {
    let best: Placed | null = null;
    let bestScore = -1;

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const x = box.x0 + rng() * (box.x1 - box.x0);
      const z = box.z0 + rng() * (box.z1 - box.z0);

      if (avoid.some((a) => Math.abs(z - a.z) < a.r && Math.abs(x) < a.r)) continue;

      let nearest = Infinity;

      for (const p of placed) nearest = Math.min(nearest, Math.hypot(p.x - x, p.z - z));

      if (nearest >= minDist) {
        best = { x, z, y: box.y };
        break;
      }

      if (nearest > bestScore) {
        bestScore = nearest;
        best = { x, z, y: box.y };
      }
    }

    const spot = best ?? { x: (box.x0 + box.x1) / 2, z: (box.z0 + box.z1) / 2, y: box.y };

    placed.push(spot);
    result.set(member.slug, spot);
  }

  return result;
};

const deckForMember = (m: CrewMember): CrewDeck => {
  // Overboard means overboard — into the sea, no matter what they shipped.
  if (m.status === CrewStatus.Overboard) return CrewDeck.Overboard;
  // Otherwise more shipped → higher deck: ≥3 captains up top, 1-2 shippers on
  // the quarterdeck, everyone else on the main/hold decks.
  if (m.startupsShipped >= 3) return CrewDeck.Top;
  if (m.startupsShipped >= 1) return CrewDeck.Mid;

  return noise(m.slug, 9) < 0.5 ? CrewDeck.Hold : CrewDeck.Main;
};

export const computeCrewLayout = (members: CrewMember[]): CrewPersonData[] => {
  if (members.length === 0) return [];

  // Highest shipper takes the wheel on the top deck.
  const sorted = [...members].sort((a, b) => b.startupsShipped - a.startupsShipped);
  const helm = sorted[0];

  const groups: Record<CrewDeck, CrewMember[]> = {
    [CrewDeck.Overboard]: [],
    [CrewDeck.Hold]: [],
    [CrewDeck.Main]: [],
    [CrewDeck.Mid]: [],
    [CrewDeck.Top]: [],
  };

  for (const m of members) {
    if (m.slug === helm.slug) continue;

    groups[deckForMember(m)].push(m);
  }

  const innerHalf = DECK_INNER_W / 2 - 1.5;

  const placements = new Map<string, Placed>();
  const decks = new Map<string, CrewDeck>();

  const place = (deck: CrewDeck, box: Box, minDist: number, avoid: { z: number; r: number }[] = []) => {
    const map = scatter(deck, groups[deck], box, minDist, avoid);

    for (const m of groups[deck]) {
      placements.set(m.slug, map.get(m.slug)!);
      decks.set(m.slug, deck);
    }
  };

  place(CrewDeck.Hold, { x0: -innerHalf, x1: innerHalf, z0: HOLD_Z0 + 2, z1: HOLD_Z1 - 2, y: HOLD_Y }, 2.4);
  place(CrewDeck.Main, { x0: -innerHalf, x1: innerHalf, z0: MAIN_Z0 + 3, z1: MAIN_Z1 - 3, y: MAIN_DECK_Y }, 2.6, [{ z: MAIN_MAST_Z, r: 2.5 }]);
  place(CrewDeck.Mid, { x0: -innerHalf, x1: innerHalf, z0: MID_Z0 + 2, z1: MID_Z1 - 2, y: MID_DECK_Y }, 2.6);
  // Captains (≥3 shipped) scattered across the whole top deck, leaving the wheel for the helm.
  place(CrewDeck.Top, { x0: -innerHalf, x1: innerHalf, z0: TOP_Z0 + 1.5, z1: WHEEL_Z - 2.5, y: TOP_DECK_Y }, 2.4);

  // Overboard crew scattered across the sea around the hull.
  const overboard = groups[CrewDeck.Overboard];
  const seaRng = mulberry32(hashString('sea'));

  overboard.forEach((m) => {
    const side = seaRng() < 0.5 ? -1 : 1;
    const offX = HALF_BEAM + 3 + seaRng() * 22;
    const x = side * offX;
    const z = -HALF_LENGTH + seaRng() * (HALF_LENGTH * 2);

    placements.set(m.slug, { x, z, y: WATERLINE_Y - 1 });
    decks.set(m.slug, CrewDeck.Overboard);
  });

  // Helm captain at the wheel.
  placements.set(helm.slug, { x: 0, z: WHEEL_Z + 1.6, y: TOP_DECK_Y });
  decks.set(helm.slug, CrewDeck.Top);

  return members.map((member) => {
    const spot = placements.get(member.slug) ?? { x: 0, z: 0, y: MAIN_DECK_Y };
    const deck = decks.get(member.slug) ?? CrewDeck.Main;

    return {
      id: `crew-${member.slug}`,
      member,
      deck,
      position: [spot.x, spot.y, spot.z],
      rotation: (noise(member.handle, 3) - 0.5) * Math.PI * 2,
      bubbleOffset: 0.95 + noise(member.handle, 4) * 0.2,
      hatHue: Math.floor(noise(member.handle, 5) * 360),
      featured: member.startupsShipped >= 5,
    };
  });
};
