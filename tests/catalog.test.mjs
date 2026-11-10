import test from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS, REALMS, WORLDS, getWorld, filterWorlds } from '../src/catalog.js';

test('the atlas contains exactly 450 addressable worlds across three equal realms', () => {
  assert.equal(WORLDS.length, 450);
  assert.equal(REGIONS.length, 30);
  assert.deepEqual(REALMS.map(realm => realm.id), ['equestria', 'wild', 'kingdom']);
  for (const realm of REALMS) {
    assert.equal(REGIONS.filter(region => region.realm === realm.id).length, 10);
    assert.equal(WORLDS.filter(world => world.realm === realm.id).length, 150);
  }
  for (const field of ['id', 'title', 'seed']) {
    assert.equal(new Set(WORLDS.map(world => world[field])).size, 450, `${field} must be unique`);
  }
  WORLDS.forEach((world, index) => {
    assert.equal(world.index, index);
    assert.equal(getWorld(world.id), world);
    assert.match(world.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });
  assert.equal(getWorld('missing-world'), undefined);
});

test('every region has 15 structural configurations, with valid scenery inputs', () => {
  for (const region of REGIONS) {
    const worlds = WORLDS.filter(world => world.regionId === region.id);
    assert.equal(worlds.length, 15);
    assert.deepEqual(worlds.map(world => world.variant), Array.from({ length: 15 }, (_, i) => i));
    assert.equal(new Set(worlds.map(world => JSON.stringify([world.features, world.layout]))).size, 15);
    assert.ok(new Set(worlds.map(world => world.weather)).size >= 5);
    assert.equal(new Set(worlds.map(world => world.timeOfDay)).size, 4);
    for (const world of worlds) {
      assert.equal(world.region, region.name);
      assert.equal(world.biome, region.biome);
      assert.equal(world.landmark, region.landmark);
      assert.ok(world.description.length >= 100);
      assert.ok(Number.isInteger(world.seed) && world.seed >= 0 && world.seed <= 0xffffffff);
      assert.ok(world.duration >= 40 && world.duration <= 55);
      assert.ok(world.features.length >= 2);
      assert.ok(world.layout.density > 0);
      for (const key of ['sky', 'fog', 'ground', 'foliage', 'stone', 'accent', 'water']) {
        assert.match(world.palette[key], /^#[0-9a-f]{6}$/i);
      }
    }
  }
});

test('search covers names, regions, descriptions, themes and features without changing catalog order', () => {
  assert.equal(filterWorlds({}).length, 450);
  assert.equal(filterWorlds({ realm: 'wild' }).length, 150);
  assert.equal(filterWorlds({ query: '  PONYVILLE  ' }).length, 15);
  assert.equal(filterWorlds({ query: 'breath of the wild' }).length, 150);
  assert.equal(filterWorlds({ query: 'tears of the kingdom' }).length, 150);
  assert.equal(filterWorlds({ query: 'my little pony' }).length, 150);
  assert.equal(filterWorlds({ query: 'Ponyville', realm: 'kingdom' }).length, 0);
  assert.equal(filterWorlds({ query: 'unfindable xyz' }).length, 0);
  const saved = [WORLDS[301].id, WORLDS[4].id];
  assert.deepEqual(filterWorlds({ favorites: new Set(saved) }).map(world => world.id), saved.toReversed());
  assert.deepEqual(filterWorlds({ favorites: saved }).map(world => world.id), saved.toReversed());
  assert.deepEqual(filterWorlds({ favorites: [] }), []);
  assert.equal(filterWorlds({ realm: 'unknown' }).length, 0);
});

test('catalog exports cannot be mutated and regenerated imports have identical data', async () => {
  assert.ok(Object.isFrozen(WORLDS));
  assert.ok(Object.isFrozen(WORLDS[0]));
  assert.ok(Object.isFrozen(WORLDS[0].palette));
  assert.ok(Object.isFrozen(WORLDS[0].features));
  const fresh = await import('../src/catalog.js?determinism-check');
  assert.deepEqual(fresh.WORLDS, WORLDS);
});
