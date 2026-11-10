import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLDS } from '../src/catalog.js';
import { createRoute } from '../src/engine.js';

test('every selectable world starts a complete 450-world itinerary without repetition', () => {
  const expected = new Set(WORLDS.map(world => world.id));
  for (const selected of WORLDS) {
    const route = createRoute(selected.id);
    assert.equal(route.length, 450, selected.id);
    assert.equal(route[0].id, selected.id);
    assert.deepEqual(new Set(route.map(world => world.id)), expected);
    assert.ok(route.every(world => WORLDS.includes(world)));
    for (let i = 0; i < route.length; i += 1) {
      assert.notEqual(route[i].realm, route[(i + 1) % route.length].realm,
        'the itinerary should alternate realms, including at its loop boundary');
    }
  }
});

test('itineraries are deterministic rotations, and unknown IDs retain a valid route', () => {
  const first = createRoute(WORLDS[19].id).map(world => world.id);
  assert.deepEqual(createRoute(WORLDS[19].id).map(world => world.id), first);
  const offset = 127;
  assert.deepEqual(createRoute(first[offset]).map(world => world.id),
    [...first.slice(offset), ...first.slice(0, offset)]);
  assert.equal(createRoute()[0].id, WORLDS[0].id);
  assert.equal(new Set(createRoute('missing').map(world => world.id)).size, 450);
});
