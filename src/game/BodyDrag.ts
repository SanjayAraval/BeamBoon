// Body dragging: constants, drop zones and where a dragged body lies. Game owns the state
// (which body, the noise) and wires input; this module has no DOM or scene access.

import { propsLayout } from '../world/propsLayout';

export const DRAG_SPEED_FACTOR = 0.5;   // movement speed while dragging
export const DRAG_TRAIL_DISTANCE = 1.0; // the body lies this far behind the player (m)
export const DRAG_NOISE_PER_METER = 1;  // noise per metre dragged (feeds Evidence noise -> suspicion)

export interface DropZone {
  id: string;
  label: string; // shown in the prompt: "Hide body <label>"
  floor: number;
  xMin: number; xMax: number; zMin: number; zMax: number;
}

const BED_MARGIN = 0.8; // a body this close to a bed goes under it

// The existing hiding places: the master bedroom's walk-in closet (where the player hides) and
// under the three beds (the ones with the sheets)
function bedZone(bedId: string, label: string): DropZone {
  const bed = propsLayout.find(p => p.id === bedId)!;
  const turned = bed.facing === 'E' || bed.facing === 'W';
  const sx = (turned ? bed.w : bed.d) / 2 + BED_MARGIN;
  const sz = (turned ? bed.d : bed.w) / 2 + BED_MARGIN;
  return { id: `under_${bedId}`, label, floor: bed.floor, xMin: bed.x - sx, xMax: bed.x + sx, zMin: bed.z - sz, zMax: bed.z + sz };
}

// Ground floor: the gap behind the living room sofa (its east side, toward the foyer archway).
// Quick to reach from where the parents fall; it hides a body exactly like the upstairs zones.
function behindSofaZone(): DropZone {
  const sofa = propsLayout.find(p => p.id === 'sofa')!;
  const turned = sofa.facing === 'E' || sofa.facing === 'W';
  const halfX = (turned ? sofa.w : sofa.d) / 2;
  const halfZ = (turned ? sofa.d : sofa.w) / 2;
  return { id: 'behind_sofa', label: 'behind the sofa', floor: 0,
    xMin: sofa.x + halfX, xMax: sofa.x + halfX + 1.2, zMin: sofa.z - halfZ - 0.3, zMax: sofa.z + halfZ + 0.3 };
}

export const DROP_ZONES: DropZone[] = [
  { id: 'closet', label: 'in the closet', floor: 1, xMin: 0, xMax: 2.2, zMin: 9.8, zMax: 12 },
  bedZone('bed_master', 'under the double bed'),
  bedZone('bed_player', 'under your bed'),
  bedZone('bed_spare', 'under the spare bed'),
  behindSofaZone()
];

export function findDropZone(x: number, z: number, floor: number): DropZone | null {
  return DROP_ZONES.find(zn => zn.floor === floor && x >= zn.xMin && x <= zn.xMax && z >= zn.zMin && z <= zn.zMax) ?? null;
}

// Where the body lies: on the floor, DRAG_TRAIL_DISTANCE behind the player (opposite the way
// they face). Walls are not checked: it may clip.
export function trailPosition(px: number, pz: number, yaw: number, floor: number): { x: number; y: number; z: number; rotation: number } {
  // The camera faces -Z at yaw 0, so "behind" is +Z rotated by yaw
  const bx = px + Math.sin(yaw) * DRAG_TRAIL_DISTANCE;
  const bz = pz + Math.cos(yaw) * DRAG_TRAIL_DISTANCE;
  // Turn the body so it lines up with the pull (feet toward the player)
  return { x: bx, y: floor * 3, z: bz, rotation: yaw };
}
