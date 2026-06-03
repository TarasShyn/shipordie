import membersData from '@/data/members.json';

// The ship scales with the crew size and has five vertical levels, rising from
// bow to stern: a sunken bow hold (deck -1), the main deck (deck 1), a raised
// mid deck (deck 2) and the captain's top deck (deck 3) — plus the sea, where
// the overboard crew float. Full-width slopes connect every level. Bow is -Z.
const CREW = membersData.members.length;

// Keep a galleon-like ~4:1 length-to-beam ratio so it reads as a ship, not a barge.
export const DECK_BEAM = Math.round(Math.min(48, 32 + CREW * 0.07));
export const HALF_BEAM = DECK_BEAM / 2;
export const DECK_LENGTH = Math.round(Math.min(230, 110 + CREW * 0.45));
export const HALF_LENGTH = DECK_LENGTH / 2;
export const DECK_INNER_W = DECK_BEAM - 0.6; // deck planking reaches under the bulwarks (no edge gap)

export const WATERLINE_Y = -1.8;
export const HOLD_Y = 0; // deck -1
export const MAIN_DECK_Y = 4; // deck 1
export const MID_DECK_Y = 8; // deck 2
export const TOP_DECK_Y = 12.5; // deck 3
export const NEST_Y = 26;

const SLOPE = 10;

// Bow hold (deck -1) — a sunken open foredeck.
export const HOLD_Z0 = -HALF_LENGTH + 5;
export const HOLD_Z1 = -HALF_LENGTH + 29;
export const HOLD_SLOPE_Z1 = HOLD_Z1 + SLOPE; // slope up to the main deck

// Stern stack, measured back from the stern.
export const TOP_Z1 = HALF_LENGTH - 6;
export const TOP_Z0 = HALF_LENGTH - 22; // deck 3 flat
export const MID_Z1 = TOP_Z0 - SLOPE; // deck 2/3 slope sits in [MID_Z1, TOP_Z0]
export const MID_Z0 = MID_Z1 - 26; // deck 2 flat
export const MAIN_Z1 = MID_Z0 - SLOPE; // main/deck-2 slope sits in [MAIN_Z1, MID_Z0]
export const MAIN_Z0 = HOLD_SLOPE_Z1; // main deck flat

export const FORE_MAST_Z = -HALF_LENGTH + 50;
export const MAIN_MAST_Z = (MAIN_Z0 + MAIN_Z1) / 2;
export const MIZZEN_MAST_Z = (MID_Z0 + MID_Z1) / 2;
export const WHEEL_Z = (TOP_Z0 + TOP_Z1) / 2;

export const SPAWN_Z = MAIN_Z1 - 20; // clear stern area of the main deck
export const SPAWN_Y = MAIN_DECK_Y;

export const SHIP_MIN_X = -(HALF_BEAM - 0.8);
export const SHIP_MAX_X = HALF_BEAM - 0.8;
export const SHIP_MIN_Z = HOLD_Z0 + 0.6;
export const SHIP_MAX_Z = TOP_Z1 - 0.6;
