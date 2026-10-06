// Body dragging: constants, drop zones and where a dragged body lies. Game owns the state
// (which body, the noise) and wires input; this module has no DOM or scene access.

import { propsLayout } from '../world/propsLayout';
import { findRoom, houseLayout } from '../world/houseLayout';

export const DRAG_SPEED_FACTOR = 0.5;   // movement speed while dragging
export const DRAG_TRAIL_DISTANCE = 1.0; // the body lies this far behind the player (m)
export const DRAG_NOISE_PER_METER = 1;  // noise per metre dragged (feeds Evidence noise -> suspicion)

export interface DropZone {
  id: string;
  label: string; // shown in the prompt: "Hide body <label>"
  name: string;  // where it is, in the house's own words (objective, nearest-spot hint)
  floor: number;
  xMin: number; xMax: number; zMin: number; zMax: number;
}

const BED_MARGIN = 0.8; // a body this close to a bed goes under it

// The existing hiding places: the master bedroom's walk-in closet (where the player hides) and
// under the three beds (the ones with the sheets)
function bedZone(bedId: string, label: string, name: string): DropZone {
  const bed = propsLayout.find(p => p.id === bedId)!;
  const turned = bed.facing === 'E' || bed.facing === 'W';
  const sx = (turned ? bed.w : bed.d) / 2 + BED_MARGIN;
  const sz = (turned ? bed.d : bed.w) / 2 + BED_MARGIN;
  return { id: `under_${bedId}`, label, name, floor: bed.floor, xMin: bed.x - sx, xMax: bed.x + sx, zMin: bed.z - sz, zMax: bed.z + sz };
}

// Ground floor: the gap behind the living room sofa (its east side, toward the foyer archway).
// Quick to reach from where the parents fall; it hides a body exactly like the upstairs zones.
function behindSofaZone(): DropZone {
  const sofa = propsLayout.find(p => p.id === 'sofa')!;
  const turned = sofa.facing === 'E' || sofa.facing === 'W';
  const halfX = (turned ? sofa.w : sofa.d) / 2;
  const halfZ = (turned ? sofa.d : sofa.w) / 2;
  return { id: 'behind_sofa', label: 'behind the sofa', name: 'behind the living room sofa', floor: 0,
    xMin: sofa.x + halfX, xMax: sofa.x + halfX + 1.35, /* up to the archway */ zMin: sofa.z - halfZ - 0.3, zMax: sofa.z + halfZ + 0.3 };
}

export const DROP_ZONES: DropZone[] = [
  { id: 'closet', label: 'in the closet', name: 'the walk-in closet (master bedroom)', floor: 1, xMin: 0, xMax: 2.2, zMin: 9.8, zMax: 12 },
  bedZone('bed_master', 'under the double bed', 'under the master bed'),
  bedZone('bed_player', 'under your bed', 'under your bed'),
  bedZone('bed_spare', 'under the spare bed', 'under the spare room bed'),
  behindSofaZone()
];

// A spot counts a little beyond its edges (players need not be pixel-perfect), but never through
// a wall: the point must be in the same room as the zone
export const ZONE_GRACE = 0.5;

export function zoneCenter(zn: DropZone): { x: number; z: number } {
  return { x: (zn.xMin + zn.xMax) / 2, z: (zn.zMin + zn.zMax) / 2 };
}

function inZone(zn: DropZone, x: number, z: number, floor: number, grace: number): boolean {
  if (zn.floor !== floor || x < zn.xMin - grace || x > zn.xMax + grace || z < zn.zMin - grace || z > zn.zMax + grace) return false;
  if (grace === 0) return true;
  const c = zoneCenter(zn);
  return findRoom(x, z, floor)?.name === findRoom(c.x, c.z, floor)?.name;
}

export function findDropZone(x: number, z: number, floor: number): DropZone | null {
  return DROP_ZONES.find(zn => inZone(zn, x, z, floor, 0)) ?? DROP_ZONES.find(zn => inZone(zn, x, z, floor, ZONE_GRACE)) ?? null;
}

// Rough walking distance to a zone (m): straight lines, via the stairs when it is on the other floor
const STAIRS_BOTTOM = { x: 9.4, z: houseLayout.stairs.zMax };
const STAIRS_TOP = { x: 9.4, z: houseLayout.stairs.zMin };
const STAIRS_LENGTH = Math.hypot(houseLayout.stairs.zMax - houseLayout.stairs.zMin, houseLayout.stairs.yTop - houseLayout.stairs.yBottom);

export function distanceToZone(zn: DropZone, x: number, z: number, floor: number): number {
  const toRect = (px: number, pz: number) => Math.hypot(Math.max(zn.xMin - px, 0, px - zn.xMax), Math.max(zn.zMin - pz, 0, pz - zn.zMax));
  if (zn.floor === floor) return toRect(x, z);
  const [from, to] = floor === 0 ? [STAIRS_BOTTOM, STAIRS_TOP] : [STAIRS_TOP, STAIRS_BOTTOM];
  return Math.hypot(from.x - x, from.z - z) + STAIRS_LENGTH + toRect(to.x, to.z);
}

export function nearestDropZone(x: number, z: number, floor: number): { zone: DropZone; distance: number } {
  let best = { zone: DROP_ZONES[0], distance: Infinity };
  for (const zn of DROP_ZONES) {
    const d = findDropZone(x, z, floor) === zn ? 0 : distanceToZone(zn, x, z, floor);
    if (d < best.distance) best = { zone: zn, distance: d };
  }
  return best;
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
