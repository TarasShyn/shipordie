// The five vertical levels, from the sea up to the captain's deck.
export enum CrewDeck {
  Overboard = 'overboard', // in the water
  Hold = 'hold', // deck -1 (below)
  Main = 'main', // deck 1
  Mid = 'mid', // deck 2
  Top = 'top', // deck 3 (captains)
}

// Ship or Die crew status (the deadline state on ship-or-die.com).
export enum CrewStatus {
  OnDeck = 'On Deck',
  AtRisk = 'At Risk',
  Overboard = 'Overboard',
}

// Ship or Die rank, derived from the number of startups shipped.
export enum CrewRank {
  Noob = 'Noob',
  Shipper = 'Shipper',
  Captain = 'Captain',
  Legend = 'Legend',
}

export interface CrewPost {
  id: string;
  text: string;
  publishedAt: string;
  likes: number;
  reposts: number;
  replies: number;
  url: string;
}

export interface CrewMember {
  slug: string;
  handle: string;
  name: string;
  startupsShipped: number;
  status: CrewStatus;
  rank: CrewRank;
  avatar: string;
  profileUrl: string;
  website: string;
  websites: string[];
  bubble: string;
  posts: CrewPost[];
}

export interface CrewPersonData {
  id: string;
  member: CrewMember;
  deck: CrewDeck;
  position: [number, number, number];
  rotation: number;
  bubbleOffset: number;
  hatHue: number;
  featured: boolean;
}

export interface SceneData {
  people: CrewPersonData[];
}
