import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { Box3 } from 'three';
import { DragonBridgeBuilder } from '../src/features/map-location/3d/DragonBridgeBuilder.ts';
import { DRAGON_BRIDGE_CONFIG } from '../src/features/map-location/data/bridgeConfig.ts';

const builder = new DragonBridgeBuilder(DRAGON_BRIDGE_CONFIG);
const model = builder.build();
const deck = new Box3().setFromObject(model.getObjectByName('BridgeDeck'));
assert.equal(deck.max.x - deck.min.x, 666);
assert.ok(Math.abs(deck.max.y - deck.min.y - 37.5) < 1e-5);
const pier = new Box3().setFromObject(model.getObjectByName('Pier_1'));
assert.ok(Math.abs(pier.min.z) < 1e-5);
assert.ok(Math.abs(pier.max.z - 7.5) < 1e-5);
for (const name of [
  'DragonSpineMain',
  'DragonHead_LyDynasty',
  'DragonTail_LotusFan',
  'DragonTrussLeft',
  'DragonTrussRight',
]) {
  assert.ok(model.getObjectByName(name), 'Missing real geometry: ' + name);
}
let meshes = 0;
const geometries = new Set();
model.traverse((object) => {
  if (object.isMesh) {
    meshes++;
    geometries.add(object.geometry);
  }
});
assert.ok(meshes > 60);
const result = {
  deckLengthMetres: 666,
  deckWidthMetres: 37.5,
  pierHeightMetres: pier.max.z,
  meshes,
  bearing: DRAGON_BRIDGE_CONFIG.bearing,
  scale: 1,
  passed: true,
};
await mkdir('artifacts/tv5-map', { recursive: true });
await writeFile(
  'artifacts/tv5-map/geometry-results.json',
  JSON.stringify(result, null, 2),
);
geometries.forEach((geometry) => geometry.dispose());
builder.dispose();
console.log(result);
