import * as THREE from 'three';

export interface RoomDef {
  name: string;
  floor: number;
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
}

export interface DoorDef {
  id: string;
  name: string;
  x: number;
  z: number;
  width: number;
  height: number;
  isArchway: boolean;
  axis: 'x' | 'z'; // 'x' means wall runs along x-axis, so door opens along z
  hingeOffset: number; // offset from center to hinge
  closedAngle: number;
  openAngle: number;
  locked: boolean;
  floor: number;
}

export interface WindowDef {
  id: string;
  x: number;
  z: number;
  width: number;
  height: number;
  yBottom: number;
  axis: 'x' | 'z';
  wallSide?: 'N' | 'S' | 'E' | 'W';
  normal?: THREE.Vector3;
  floor: number;
}

export interface WallDef {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  floor: number;
}

export interface LayoutDef {
  rooms: RoomDef[];
  walls: WallDef[];
  doors: DoorDef[];
  windows: WindowDef[];
  stairs: {
    xMin: number;
    xMax: number;
    zMin: number;
    zMax: number; // top of stairs to bottom
    yBottom: number;
    yTop: number;
    steps: number;
  };
  spawns: Record<string, THREE.Vector3>;
}

export const houseLayout: LayoutDef = {
  rooms: [
    // Ground Floor
    { name: 'Living Room', floor: 0, xMin: 0, xMax: 6, zMin: 5, zMax: 12 },
    { name: 'Foyer', floor: 0, xMin: 6, xMax: 10, zMin: 5, zMax: 12 },
    { name: 'Study', floor: 0, xMin: 10, xMax: 14, zMin: 5, zMax: 12 },
    { name: 'Kitchen', floor: 0, xMin: 0, xMax: 6, zMin: 0, zMax: 5 },
    { name: 'Dining Room', floor: 0, xMin: 6, xMax: 11, zMin: 0, zMax: 5 },
    { name: 'Powder Room', floor: 0, xMin: 11, xMax: 14, zMin: 0, zMax: 5 },
    
    // Upstairs
    { name: 'Upstairs Hall', floor: 1, xMin: 6, xMax: 10, zMin: 0, zMax: 12 },
    { name: 'Player Bedroom', floor: 1, xMin: 0, xMax: 6, zMin: 0, zMax: 5 },
    { name: 'Master Bedroom', floor: 1, xMin: 0, xMax: 6, zMin: 5, zMax: 12 },
    { name: 'Walk-in Closet', floor: 1, xMin: 0, xMax: 2.2, zMin: 9.8, zMax: 12 },
    { name: 'Bathroom', floor: 1, xMin: 10, xMax: 14, zMin: 0, zMax: 4.5 },
    { name: 'Spare Room', floor: 1, xMin: 10, xMax: 14, zMin: 4.5, zMax: 12 }
  ],
  walls: [
    // Ground Floor Exterior Walls
    { x1: 0, z1: 12, x2: 14, z2: 12, floor: 0 }, // South
    { x1: 0, z1: 0, x2: 14, z2: 0, floor: 0 },   // North
    { x1: 0, z1: 0, x2: 0, z2: 12, floor: 0 },   // West
    { x1: 14, z1: 0, x2: 14, z2: 12, floor: 0 }, // East

    // Ground Floor Interior Walls
    { x1: 6, z1: 0, x2: 6, z2: 12, floor: 0 },   // Vertical spine separating living/kitchen from foyer/dining
    { x1: 10, z1: 5, x2: 10, z2: 12, floor: 0 }, // Foyer/Study
    { x1: 11, z1: 0, x2: 11, z2: 5, floor: 0 },  // Dining/Powder
    { x1: 0, z1: 5, x2: 14, z2: 5, floor: 0 },   // Horizontal crossing separating front/back

    // Upstairs Exterior Walls
    { x1: 0, z1: 12, x2: 14, z2: 12, floor: 1 },
    { x1: 0, z1: 0, x2: 14, z2: 0, floor: 1 },
    { x1: 0, z1: 0, x2: 0, z2: 12, floor: 1 },
    { x1: 14, z1: 0, x2: 14, z2: 12, floor: 1 },

    // Upstairs Interior Walls
    { x1: 6, z1: 0, x2: 6, z2: 12, floor: 1 },
    { x1: 10, z1: 0, x2: 10, z2: 12, floor: 1 },
    { x1: 0, z1: 5, x2: 6, z2: 5, floor: 1 },
    { x1: 10, z1: 4.5, x2: 14, z2: 4.5, floor: 1 },
    
    // Closet walls
    { x1: 0, z1: 9.8, x2: 2.2, z2: 9.8, floor: 1 },
    { x1: 2.2, z1: 9.8, x2: 2.2, z2: 12, floor: 1 }
  ],
      doors: [
      { id: 'door_front', name: 'Front Door', x: 7.4, z: 12, width: 1.1, height: 2.1, isArchway: false, axis: 'x', hingeOffset: -0.55, closedAngle: 0, openAngle: Math.PI / 2, locked: true, floor: 0 },
      { id: 'door_rear', name: 'Rear Door', x: 3.0, z: 0, width: 1.0, height: 2.1, isArchway: false, axis: 'x', hingeOffset: 0.5, closedAngle: 0, openAngle: Math.PI / 2, locked: true, floor: 0 },
      { id: 'arch_living_foyer', name: 'Living Room Archway', x: 6, z: 8.5, width: 3.0, height: 2.5, isArchway: true, axis: 'z', hingeOffset: 0, closedAngle: 0, openAngle: 0, locked: false, floor: 0 },
      { id: 'door_study', name: 'Study Door', x: 10, z: 5.7, width: 1.0, height: 2.1, isArchway: false, axis: 'z', hingeOffset: -0.5, closedAngle: -Math.PI / 2, openAngle: 0, locked: false, floor: 0 },
      { id: 'arch_kitchen_dining', name: 'Kitchen Archway', x: 6, z: 2.5, width: 3.0, height: 2.5, isArchway: true, axis: 'z', hingeOffset: 0, closedAngle: 0, openAngle: 0, locked: false, floor: 0 },
      { id: 'door_powder', name: 'Powder Room Door', x: 11, z: 3.5, width: 1.0, height: 2.1, isArchway: false, axis: 'z', hingeOffset: 0.5, closedAngle: -Math.PI / 2, openAngle: -Math.PI, locked: false, floor: 0 },
      { id: 'door_dining_foyer', name: 'Dining Room Door', x: 7.5, z: 5, width: 1.0, height: 2.1, isArchway: false, axis: 'x', hingeOffset: 0.5, closedAngle: 0, openAngle: -Math.PI / 2, locked: false, floor: 0 },
      
      { id: 'door_player_bed', name: 'Player Bedroom Door', x: 6, z: 2.5, width: 1.0, height: 2.1, isArchway: false, axis: 'z', hingeOffset: 0.5, closedAngle: -Math.PI / 2, openAngle: 0, locked: false, floor: 1 },
      { id: 'door_master_bed', name: 'Master Bedroom Door', x: 6, z: 8.5, width: 1.0, height: 2.1, isArchway: false, axis: 'z', hingeOffset: -0.5, closedAngle: -Math.PI / 2, openAngle: Math.PI, locked: false, floor: 1 },
      { id: 'door_closet', name: 'Closet Door', x: 1.1, z: 9.8, width: 0.9, height: 2.1, isArchway: false, axis: 'x', hingeOffset: 0.45, closedAngle: 0, openAngle: -Math.PI / 2, locked: false, floor: 1 },
      { id: 'door_bathroom', name: 'Bathroom Door', x: 10, z: 2.0, width: 1.0, height: 2.1, isArchway: false, axis: 'z', hingeOffset: 0.5, closedAngle: -Math.PI / 2, openAngle: -Math.PI, locked: false, floor: 1 },
      { id: 'door_spare', name: 'Spare Room Door', x: 10, z: 5.5, width: 1.0, height: 2.1, isArchway: false, axis: 'z', hingeOffset: -0.5, closedAngle: -Math.PI / 2, openAngle: 0, locked: false, floor: 1 }
    ],
  windows: [
    { id: 'win_living', x: 3, z: 12, width: 2, height: 1.5, yBottom: 0.8, axis: 'x', wallSide: 'S', normal: new THREE.Vector3(0, 0, -1), floor: 0 },
    { id: 'win_master', x: 3, z: 12, width: 2, height: 1.5, yBottom: 0.8, axis: 'x', wallSide: 'S', normal: new THREE.Vector3(0, 0, -1), floor: 1 },
    { id: 'win_kitchen', x: 3, z: 0, width: 1.5, height: 1.2, yBottom: 1.1, axis: 'x', wallSide: 'N', normal: new THREE.Vector3(0, 0, 1), floor: 0 },
    { id: 'win_player', x: 3, z: 0, width: 1.5, height: 1.2, yBottom: 0.8, axis: 'x', wallSide: 'N', normal: new THREE.Vector3(0, 0, 1), floor: 1 },
    { id: 'win_study', x: 14, z: 8.5, width: 1.5, height: 1.5, yBottom: 0.8, axis: 'z', wallSide: 'E', normal: new THREE.Vector3(-1, 0, 0), floor: 0 },
    { id: 'win_bathroom', x: 14, z: 2, width: 1.0, height: 1.0, yBottom: 1.4, axis: 'z', wallSide: 'E', normal: new THREE.Vector3(-1, 0, 0), floor: 1 },
    { id: 'win_spare', x: 14, z: 8.5, width: 1.5, height: 1.5, yBottom: 0.8, axis: 'z', wallSide: 'E', normal: new THREE.Vector3(-1, 0, 0), floor: 1 }
  ],
  stairs: {
    xMin: 8.9, xMax: 10.0,
    zMin: 6.9, zMax: 11.4, // climbs north from 11.4 to 6.9
    yBottom: 0, yTop: 3.0,
    steps: 16
  },
  spawns: {
    player: new THREE.Vector3(3.0, 0, 9.0),
    parents: new THREE.Vector3(7.4, 0, 11.2),
    visitor: new THREE.Vector3(7.4, 0, 13.3)
  }
};
