import { Object3D } from 'three';

// The Ship registers its walkable deck/ramp group here so the Player can
// floor-follow (raycast down) against just those meshes instead of the whole
// scene — keeps the per-frame raycast cheap with 200+ crew in the scene.
//
// `occluders` is the ship's solid body (hull, decks, masts, sterncastle). A
// pirate's speech bubble hides when the ship blocks the line of sight to it, so
// bubbles never float over the sea for crew hidden behind/under the ship.
export const nav: { root: Object3D | null; occluders: Object3D | null } = { root: null, occluders: null };

// Each pirate registers its invisible click-target sphere so the crosshair
// raycast tests ~200 spheres instead of every body/face/hat mesh.
export const crewTargets: Object3D[] = [];

export const registerTarget = (object: Object3D): (() => void) => {
  crewTargets.push(object);

  return () => {
    const index = crewTargets.indexOf(object);

    if (index >= 0) crewTargets.splice(index, 1);
  };
};
