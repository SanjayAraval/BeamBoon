const fs = require('fs');
let file = fs.readFileSync('src/world/houseLayout.ts', 'utf8');

file = file.replace(/closedAngle: Math\.PI \/ 2/g, 'closedAngle: -Math.PI / 2');

file = file.replace(/{ id: 'door_front'.+?openAngle: -Math\.PI \/ 2/g, match => match.replace('-Math.PI / 2', 'Math.PI / 2'));
file = file.replace(/{ id: 'door_dining_foyer'.+?openAngle: Math\.PI \/ 2/g, match => match.replace('Math.PI / 2', '-Math.PI / 2'));
file = file.replace(/{ id: 'door_closet'.+?openAngle: Math\.PI \/ 2/g, match => match.replace('Math.PI / 2', '-Math.PI / 2'));

file = file.replace(/{ id: 'door_powder'.+?openAngle: Math\.PI/g, match => match.replace('Math.PI', '-Math.PI'));
file = file.replace(/{ id: 'door_player_bed'.+?openAngle: Math\.PI/g, match => match.replace('Math.PI', '0'));
file = file.replace(/{ id: 'door_bathroom'.+?openAngle: Math\.PI/g, match => match.replace('Math.PI', '-Math.PI'));
file = file.replace(/{ id: 'door_master_bed'.+?openAngle: 0/g, match => match.replace('0', 'Math.PI'));

fs.writeFileSync('src/world/houseLayout.ts', file);
