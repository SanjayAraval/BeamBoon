import * as THREE from 'three';

export interface LightDef {
  id: string;
  room: string;
  position: THREE.Vector3;
  color: number;
  intensity: number;
  range: number;
  defaultOn: boolean;
  switchPosition?: THREE.Vector3;
  switchWallSide?: 'N' | 'S' | 'E' | 'W';
  switchNormal?: THREE.Vector3;
  type: 'ceiling' | 'lamp' | 'tv' | 'porch' | 'street';
}

export const lightsLayout: LightDef[] = [
  // Room Lights
  { id: 'light_living_ceiling', room: 'Living Room', position: new THREE.Vector3(3.0, 2.5, 8.5), color: 0xffeedd, intensity: 1.0, range: 8, defaultOn: false, switchPosition: new THREE.Vector3(6.0, 1.3, 11.5), switchWallSide: 'E', switchNormal: new THREE.Vector3(-1, 0, 0), type: 'ceiling' },
  { id: 'lamp_living', room: 'Living Room', position: new THREE.Vector3(0.5, 1.5, 11.3), color: 0xffeedd, intensity: 1.0, range: 5, defaultOn: false, type: 'lamp' },
  
  { id: 'light_foyer', room: 'Foyer', position: new THREE.Vector3(7.5, 2.5, 8.5), color: 0xffeedd, intensity: 1.0, range: 6, defaultOn: false, switchPosition: new THREE.Vector3(6.6, 1.3, 12.0), switchWallSide: 'S', switchNormal: new THREE.Vector3(0, 0, -1), type: 'ceiling' },
  
  { id: 'lamp_study', room: 'Study', position: new THREE.Vector3(12.0, 1.0, 11.4), color: 0xffeedd, intensity: 1.0, range: 5, defaultOn: false, type: 'lamp' },
  
  { id: 'lamp_kitchen', room: 'Kitchen', position: new THREE.Vector3(0.4, 1.1, 0.4), color: 0xffeedd, intensity: 1.0, range: 4, defaultOn: false, type: 'lamp' },
  { id: 'light_kitchen', room: 'Kitchen', position: new THREE.Vector3(3.0, 2.5, 2.5), color: 0xffeedd, intensity: 1.0, range: 7, defaultOn: false, switchPosition: new THREE.Vector3(6.0, 1.3, 4.5), switchWallSide: 'E', switchNormal: new THREE.Vector3(-1, 0, 0), type: 'ceiling' },
  
  { id: 'light_dining', room: 'Dining Room', position: new THREE.Vector3(8.5, 2.5, 2.5), color: 0xffeedd, intensity: 1.0, range: 6, defaultOn: false, switchPosition: new THREE.Vector3(11.0, 1.3, 4.5), switchWallSide: 'E', switchNormal: new THREE.Vector3(-1, 0, 0), type: 'ceiling' },
  
  { id: 'light_powder', room: 'Powder Room', position: new THREE.Vector3(12.5, 2.5, 2.5), color: 0xffeedd, intensity: 1.0, range: 4, defaultOn: false, switchPosition: new THREE.Vector3(11.0, 1.3, 4.0), switchWallSide: 'W', switchNormal: new THREE.Vector3(1, 0, 0), type: 'ceiling' },
  
  { id: 'lamp_hallway', room: 'Upstairs Hall', position: new THREE.Vector3(8.0, 3.9, 0.4), color: 0xffeedd, intensity: 1.0, range: 5, defaultOn: false, type: 'lamp' },
  { id: 'light_upstairs_hall', room: 'Upstairs Hall', position: new THREE.Vector3(8.0, 5.5, 6.0), color: 0xffeedd, intensity: 1.0, range: 7, defaultOn: false, switchPosition: new THREE.Vector3(6.0, 4.3, 6.0), switchWallSide: 'W', switchNormal: new THREE.Vector3(1, 0, 0), type: 'ceiling' },
  
  { id: 'lamp_player', room: 'Player Bedroom', position: new THREE.Vector3(1.0, 3.8, 0.8), color: 0xffeedd, intensity: 1.0, range: 5, defaultOn: false, type: 'lamp' },
  
  { id: 'lamp_m1', room: 'Master Bedroom', position: new THREE.Vector3(2.3, 3.8, 5.4), color: 0xffeedd, intensity: 1.0, range: 5, defaultOn: false, type: 'lamp' },
  { id: 'lamp_m2', room: 'Master Bedroom', position: new THREE.Vector3(4.7, 3.8, 5.4), color: 0xffeedd, intensity: 1.0, range: 5, defaultOn: false, type: 'lamp' },
  { id: 'light_closet', room: 'Walk-in Closet', position: new THREE.Vector3(1.1, 5.5, 10.9), color: 0xffeedd, intensity: 1.0, range: 3, defaultOn: false, switchPosition: new THREE.Vector3(0.5, 4.3, 9.8), switchWallSide: 'S', switchNormal: new THREE.Vector3(0, 0, -1), type: 'ceiling' },
  
  { id: 'light_bathroom', room: 'Bathroom', position: new THREE.Vector3(12.0, 5.5, 2.2), color: 0xffeedd, intensity: 1.0, range: 5, defaultOn: false, switchPosition: new THREE.Vector3(10.0, 4.3, 2.2), switchWallSide: 'W', switchNormal: new THREE.Vector3(1, 0, 0), type: 'ceiling' },
  
  { id: 'light_spare', room: 'Spare Room', position: new THREE.Vector3(12.0, 5.5, 8.0), color: 0xffeedd, intensity: 1.0, range: 6, defaultOn: false, switchPosition: new THREE.Vector3(10.0, 4.3, 8.0), switchWallSide: 'W', switchNormal: new THREE.Vector3(1, 0, 0), type: 'ceiling' },
  
  // Outdoors / Misc
  { id: 'light_porch', room: 'Outside', position: new THREE.Vector3(7.4, 2.4, 13.0), color: 0xffccaa, intensity: 1.2, range: 6, defaultOn: true, switchPosition: new THREE.Vector3(8.2, 1.3, 12.0), switchWallSide: 'S', switchNormal: new THREE.Vector3(0, 0, -1), type: 'porch' },
  { id: 'light_street', room: 'Outside', position: new THREE.Vector3(7.0, 5.0, 22.0), color: 0xeef5ff, intensity: 2.0, range: 14, defaultOn: true, type: 'street' },
  { id: 'tv', room: 'Living Room', position: new THREE.Vector3(1.2, 1.2, 8.5), color: 0x9fc4ff, intensity: 1.0, range: 6, defaultOn: true, type: 'tv' }
];
