const fs = require('fs');
let file = fs.readFileSync('src/world/houseLayout.ts', 'utf8');

const correctDoors = `    doors: [
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
    ],`;

file = file.replace(/doors: \[[\s\S]*?\],/, correctDoors);
fs.writeFileSync('src/world/houseLayout.ts', file);
