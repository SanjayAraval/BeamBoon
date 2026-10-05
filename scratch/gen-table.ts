import { houseLayout } from './src/world/houseLayout';

console.log("| Door Name | Wall Thickness | Slab Thickness | Doorway (W x H) | Slab (W x H) | Pivot (x, z) / Side | Closed/Open Angle | Swing Direction | Open Collider |");
console.log("|---|---|---|---|---|---|---|---|---|");

for (const d of houseLayout.doors) {
  if (d.isArchway) continue;
  
  let wThick = 0.2; // default
  let swingSide = d.axis === 'x' ? 'Z' : 'X';
  let openAngleDeg = Math.round(d.openAngle * 180 / Math.PI);
  let closedAngleDeg = Math.round(d.closedAngle * 180 / Math.PI);
  let side = d.hingeOffset < 0 ? "Left" : "Right";
  let hx = d.axis === 'x' ? d.x + d.hingeOffset : d.x;
  let hz = d.axis === 'z' ? d.z + d.hingeOffset : d.z;
  let swingDir = "Into room";
  let openCollider = d.locked ? "Solid (Locked)" : "Disabled";

  console.log(`| ${d.name} | ${wThick}m | 0.12m | ${d.width}m x ${d.height}m | ${d.width}m x ${d.height}m | (${hx.toFixed(2)}, ${hz.toFixed(2)}) ${side} | ${closedAngleDeg}° / ${openAngleDeg}° | ${swingDir} | ${openCollider} |`);
}
