import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { WORLDS, REGIONS } from '../src/catalog.js';
import { buildWorld } from '../src/scenery.js';

const finiteVector = (vector, label) => {
  assert.ok(Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z), label);
};

function inspect(view, label) {
  assert.ok(view.scene?.isScene, `${label}: a Three.js scene`);
  assert.equal(typeof view.update, 'function');
  assert.equal(typeof view.dispose, 'function');
  finiteVector(view.portalPosition, `${label}: portal position`);
  assert.ok(view.duration >= 40 && view.duration <= 55);

  for (let step = 0; step <= 100; step += 1) {
    const position = view.path.getPointAt(step / 100);
    const tangent = view.path.getTangentAt(step / 100);
    finiteVector(position, `${label}: path point ${step}`);
    finiteVector(tangent, `${label}: path tangent ${step}`);
    assert.ok(tangent.length() > .9, `${label}: nondegenerate camera direction`);
  }
  const start = view.path.getPointAt(0);
  const end = view.path.getPointAt(1);
  assert.ok(start.distanceTo(end) > 100, `${label}: traversable flight route`);
  assert.ok(end.distanceTo(view.portalPosition) < .001, `${label}: route ends at portal`);

  const resources = new Set();
  const seenGeometry = new Set();
  const signature = createHash('sha256');
  let objects = 0;
  let meshes = 0;
  let triangles = 0;
  view.scene.updateMatrixWorld(true);
  view.scene.traverse(object => {
    objects += 1;
    finiteVector(object.position, `${label}: object position`);
    finiteVector(object.scale, `${label}: object scale`);
    assert.ok(object.matrixWorld.elements.every(Number.isFinite), `${label}: finite world transform`);
    if (object.isMesh || object.isPoints || object.isLine) {
      meshes += 1;
      signature.update(JSON.stringify([object.type, object.geometry?.type, object.matrixWorld.elements]));
      if (object.isMesh && object.geometry?.attributes.position) {
        triangles += ((object.geometry.index?.count || object.geometry.attributes.position.count) / 3)
          * (object.isInstancedMesh ? object.count : 1);
      }
      if (object.isInstancedMesh) {
        // Three.js frees instanceMatrix GPU buffers on the mesh dispose event,
        // separately from geometry/material disposal.
        resources.add(object);
        const matrix = new THREE.Matrix4();
        for (let index = 0; index < object.count; index += 1) {
          object.getMatrixAt(index, matrix);
          assert.ok(matrix.elements.every(Number.isFinite), `${label}: finite instance transform`);
          signature.update(JSON.stringify(matrix.elements));
        }
      }
    }
    const geometry = object.geometry;
    if (geometry && !seenGeometry.has(geometry)) {
      seenGeometry.add(geometry);
      resources.add(geometry);
      const positions = geometry.getAttribute('position');
      if (positions) {
        assert.ok(positions.count > 0, `${label}: nonempty geometry`);
        for (const attribute of Object.values(geometry.attributes)) {
          for (const value of attribute.array) assert.ok(Number.isFinite(value), `${label}: finite vertex attribute`);
        }
        signature.update(Buffer.from(positions.array.buffer, positions.array.byteOffset, positions.array.byteLength));
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        finiteVector(geometry.boundingBox.min, `${label}: bounding-box minimum`);
        finiteVector(geometry.boundingBox.max, `${label}: bounding-box maximum`);
        assert.ok(Number.isFinite(geometry.boundingSphere.radius), `${label}: finite bounding sphere`);
      }
    }
    const materials = object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
    for (const material of materials) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
  assert.ok(meshes >= 10, `${label}: populated scenery`);
  assert.ok(objects < 6000, `${label}: bounded scene graph (${objects})`);
  assert.ok(triangles < 1_000_000, `${label}: bounded geometry (${triangles})`);
  return { signature: signature.digest('hex'), resources, objects, triangles };
}

test('all 450 scenes contain finite geometry and portal-reaching flight paths', { timeout: 120_000 }, () => {
  const signatures = new Set();
  for (const world of WORLDS) {
    const view = buildWorld(world, { quality: 'low' });
    try {
      const result = inspect(view, world.id);
      assert.ok(!signatures.has(result.signature), `${world.id}: geometry must differ from other worlds, independent of colors`);
      signatures.add(result.signature);
      for (const time of [0, 1, world.duration / 2, world.duration, 100_000]) {
        view.update(time, 1 / 60);
        view.scene.updateMatrixWorld(true);
        view.scene.traverse(object => {
          assert.ok(object.matrixWorld.elements.every(Number.isFinite), `${world.id}: animation remains finite at ${time}`);
          if (time === 100_000 && object.geometry?.attributes.position) {
            for (const value of object.geometry.attributes.position.array) {
              assert.ok(Number.isFinite(value), `${world.id}: animated vertices remain finite`);
            }
          }
        });
      }
    } finally {
      view.dispose();
    }
  }
  assert.equal(signatures.size, 450);
});

test('each region builds at high quality and owns resources it can dispose safely', { timeout: 60_000 }, () => {
  for (const region of REGIONS) {
    const world = WORLDS.find(candidate => candidate.regionId === region.id);
    const first = buildWorld(world, { quality: 'high' });
    const second = buildWorld(world, { quality: 'high' });
    const firstResult = inspect(first, `${world.id}: first`);
    const secondResult = inspect(second, `${world.id}: second`);
    assert.equal(firstResult.signature, secondResult.signature, `${world.id}: repeatable geometry`);
    for (const resource of firstResult.resources) {
      assert.ok(!secondResult.resources.has(resource), `${world.id}: scenes cannot share disposable resources`);
    }
    const disposals = new Map([...firstResult.resources].map(resource => [resource, 0]));
    for (const resource of firstResult.resources) {
      resource.addEventListener('dispose', () => disposals.set(resource, disposals.get(resource) + 1));
    }
    first.dispose();
    for (const count of disposals.values()) assert.equal(count, 1, `${world.id}: every resource is disposed once`);
    first.dispose();
    for (const count of disposals.values()) assert.equal(count, 1, `${world.id}: disposal is idempotent`);
    second.update(1, 1 / 60);
    second.dispose();
  }
});

test('chapter scenery features create their promised objects independently of the random seed', () => {
  const base = { ...WORLDS[0], features: [], seed: 12345 };
  const baseline = buildWorld(base, { quality: 'low' });
  const signature = inspect(baseline, 'feature baseline').signature;
  baseline.dispose();
  const physicalFeatures = ['flowers', 'birds', 'lanterns', 'arches', 'ponds', 'mushrooms',
    'banners', 'balloons', 'islands', 'bridges', 'ruins', 'crystals', 'giant-flowers',
    'groves', 'ice', 'spires', 'windmills', 'towers', 'ribbons', 'rainbows', 'floating-stones'];
  for (const feature of physicalFeatures) {
    const view = buildWorld({ ...base, features: [feature] }, { quality: 'low' });
    try {
      assert.notEqual(inspect(view, feature).signature, signature,
        `${feature}: enabling the feature must alter actual geometry, rather than only the catalog label`);
    } finally {
      view.dispose();
    }
  }
});

test('every catalog region has a rendered landmark instead of falling through to a generic scene', () => {
  for (const region of REGIONS) {
    const original = WORLDS.find(world => world.regionId === region.id);
    const world = { ...original, features: [], seed: 99101 };
    const intended = buildWorld(world, { quality: 'low' });
    const fallback = buildWorld({ ...world, landmark: 'unknown-landmark' }, { quality: 'low' });
    try {
      assert.notEqual(inspect(intended, region.id).signature, inspect(fallback, `${region.id}: fallback`).signature,
        `${region.id}: ${world.landmark} needs its own implemented scenery`);
    } finally {
      intended.dispose();
      fallback.dispose();
    }
  }
});

test('the seven named routes have distinct camera paths while preserving portal endpoints', () => {
  const paths = new Set();
  for (const route of ['straight', 'meander', 'river', 'wide', 'rise', 'orbit', 'dip']) {
    const world = { ...WORLDS[0], layout: { ...WORLDS[0].layout, route } };
    const view = buildWorld(world, { quality: 'low' });
    try {
      const points = Array.from({ length: 21 }, (_, i) => view.path.getPointAt(i / 20).toArray());
      assert.ok(view.path.getPointAt(1).distanceTo(view.portalPosition) < .001);
      const signature = JSON.stringify(points);
      assert.ok(!paths.has(signature), `${route}: route selection must change the flight path`);
      paths.add(signature);
    } finally {
      view.dispose();
    }
  }
  assert.equal(paths.size, 7);
});
