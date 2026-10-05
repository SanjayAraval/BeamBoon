export interface NpcSpawn {
  x: number;
  z: number;
  floor: number;
  rotation: number;
}

export interface Waypoint {
  name: string;
  x: number;
  z: number;
  floor: number;
}

export interface Edge {
  from: string;
  to: string;
}

export interface VisitorPos {
  stand: { x: number; z: number; floor: number; rotation: number };
  inside: string; // waypoint name
}

export interface DeadPose {
  x: number;
  z: number;
  floor: number;
  rotation: number;
  bloodX: number;
  bloodZ: number;
}

export const npcLayout = {
  parentEntry: {
    motherStart: { x: 7.0, z: 12.6, floor: 0, rotation: 0 },
    fatherStart: { x: 7.8, z: 12.6, floor: 0, rotation: 0 }
  },

  waypoints: [
    { name: 'living_room', x: 2.0, z: 9.35, floor: 0 },
    { name: 'living_room_entry', x: 5.5, z: 9.35, floor: 0 },
    { name: 'foyer', x: 8.0, z: 8.5, floor: 0 },
    { name: 'foyer_south', x: 8.0, z: 11.4, floor: 0 },
    { name: 'kitchen', x: 4.5, z: 1.5, floor: 0 },
    { name: 'dining', x: 7.5, z: 4.5, floor: 0 },
    { name: 'stairs_bottom', x: 9.4, z: 11.4, floor: 0 },
    { name: 'stair_entry_up', x: 9.4, z: 5.5, floor: 1 },
    { name: 'stairs_top', x: 9.4, z: 7.2, floor: 1 },
    { name: 'upstairs_hall', x: 8.0, z: 5.5, floor: 1 },
    { name: 'master_hall', x: 7.0, z: 8.5, floor: 1 },
    { name: 'master_door', x: 6.0, z: 8.5, floor: 1 },
    { name: 'master_bedroom', x: 3.0, z: 8.5, floor: 1 },
    { name: 'spare_door', x: 10.0, z: 5.5, floor: 1 },
    { name: 'spare_corner', x: 10.6, z: 5.5, floor: 1 },
    { name: 'spare_inside', x: 11.0, z: 6.2, floor: 1 },
    { name: 'spare_bedroom', x: 12.0, z: 8.5, floor: 1 },
    { name: 'bathroom_hall', x: 8.0, z: 2.0, floor: 1 },
    { name: 'bathroom_door', x: 10.0, z: 2.0, floor: 1 },
    { name: 'bathroom', x: 12.0, z: 2.0, floor: 1 },
    { name: 'front_door_inside', x: 7.4, z: 10.5, floor: 0 },
    { name: 'porch_outside', x: 7.4, z: 12.6, floor: 0 }
  ] as Waypoint[],

  edges: [
    { from: 'living_room', to: 'living_room_entry' },
    { from: 'living_room_entry', to: 'foyer' },
    { from: 'foyer', to: 'front_door_inside' },
    { from: 'front_door_inside', to: 'porch_outside' },
    { from: 'foyer', to: 'dining' },
    { from: 'dining', to: 'kitchen' },
    { from: 'foyer', to: 'foyer_south' },
    { from: 'foyer_south', to: 'stairs_bottom' },
    { from: 'stairs_bottom', to: 'stairs_top' },
    { from: 'stairs_top', to: 'stair_entry_up' },
    { from: 'stair_entry_up', to: 'upstairs_hall' },
    { from: 'upstairs_hall', to: 'master_hall' },
    { from: 'master_hall', to: 'master_door' },
    { from: 'master_door', to: 'master_bedroom' },
    { from: 'upstairs_hall', to: 'spare_door' },
    { from: 'spare_door', to: 'spare_corner' },
    { from: 'spare_corner', to: 'spare_inside' },
    { from: 'spare_inside', to: 'spare_bedroom' },
    { from: 'upstairs_hall', to: 'bathroom_hall' },
    { from: 'bathroom_hall', to: 'bathroom_door' },
    { from: 'bathroom_door', to: 'bathroom' }
  ] as Edge[],

  visitorStand: {
    stand: { x: 7.4, z: 12.6, floor: 0, rotation: Math.PI }, // facing north (door is at z=12)
    inside: 'foyer'
  } as VisitorPos,

  deadPoses: {
    mother: { x: 3.0, z: 9.5, floor: 0, rotation: Math.PI / 4, bloodX: 3.2, bloodZ: 9.6 },
    father: { x: 8.0, z: 8.5, floor: 0, rotation: Math.PI / 2, bloodX: 8.0, bloodZ: 8.2 }
  } as Record<string, DeadPose>
};
