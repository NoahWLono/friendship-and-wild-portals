import * as THREE from 'three';

// Every mesh is built here. Nothing is fetched while a world is being explored.
const TAU = Math.PI * 2;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
function random(seed) {
  let n = seed >>> 0;
  return () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export function buildWorld(world, { quality = 'auto' } = {}) {
  const rng = random(world.seed);
  const rand = (a, b) => a + rng() * (b - a);
  const pick = (a) => a[Math.floor(rng() * a.length)];
  const p = world.palette;
  const low = quality === 'low';
  const density = (low ? .56 : quality === 'high' ? 1.2 : .85) * (world.layout?.density || 1);
  const spread = world.layout?.spread || 1;
  const landmarkScale = world.layout?.landmarkScale || 1;
  const skyWorld = ['sky', 'cloud'].includes(world.biome);
  const dark = world.timeOfDay === 'night' || world.biome === 'depths';
  const snow = world.biome === 'snow' || world.weather === 'snow';
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(p.sky);
  scene.fog = new THREE.FogExp2(p.fog, world.weather === 'mist' ? .012 : world.biome === 'depths' ? .009 : .0045);
  const geometries = new Set();
  const materials = new Set();
  const instancedMeshes = new Set();
  const animations = [];
  const buckets = new Map();
  const geometry = (g) => { geometries.add(g); return g; };
  const geo = {
    box: geometry(new THREE.BoxGeometry(1, 1, 1)),
    ball: geometry(new THREE.IcosahedronGeometry(1, 1)),
    rock: geometry(new THREE.IcosahedronGeometry(1, 0)),
    cone: geometry(new THREE.ConeGeometry(1, 1, 7)),
    cylinder: geometry(new THREE.CylinderGeometry(1, 1, 1, 8)),
    prism: geometry(new THREE.CylinderGeometry(.4, 1, 1, 5)),
    ring: geometry(new THREE.TorusGeometry(1, .13, 5, 28)),
  };
  const mats = new Map();
  const mat = (color, glow = 0, transparent = false) => {
    const key = `${color}/${glow}/${transparent}`;
    if (!mats.has(key)) {
      const m = new THREE.MeshStandardMaterial({ color, roughness: .85, metalness: glow ? .12 : 0, emissive: color, emissiveIntensity: glow, transparent, opacity: transparent ? .63 : 1 });
      mats.set(key, m); materials.add(m);
    }
    return mats.get(key);
  };
  const dummy = new THREE.Object3D();
  function put(shape, color, x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0, glow = 0) {
    const key = `${shape}/${color}/${glow}`;
    if (!buckets.has(key)) buckets.set(key, { geometry: geo[shape], material: mat(color, glow), matrices: [] });
    dummy.position.set(x, y, z); dummy.rotation.set(rx, ry, rz); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
    buckets.get(key).matrices.push(dummy.matrix.clone());
  }
  function mesh(g, m, x = 0, y = 0, z = 0) {
    const o = new THREE.Mesh(g, m); o.position.set(x, y, z); scene.add(o); return o;
  }
  function beam(a, b, width, color, glow = 0) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const middle = start.clone().add(end).multiplyScalar(.5);
    dummy.position.copy(middle); dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    dummy.scale.set(width, new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b)), width); dummy.updateMatrix();
    const key = `box/${color}/${glow}`;
    if (!buckets.has(key)) buckets.set(key, { geometry: geo.box, material: mat(color, glow), matrices: [] });
    buckets.get(key).matrices.push(dummy.matrix.clone());
  }
  function torus(x, y, z, r, color, rx = 0, ry = 0, glow = 0) { put('ring', color, x, y, z, r, r, r, rx, ry, 0, glow); }

  scene.add(new THREE.HemisphereLight(dark ? '#adbdea' : '#fff4df', p.ground, dark ? 1.35 : 2.15));
  const sun = new THREE.DirectionalLight(world.timeOfDay === 'sunset' ? '#ffcfad' : '#fff1d1', dark ? .5 : 2.4);
  sun.position.set(-65, 100, 35); scene.add(sun);
  const rim = new THREE.DirectionalLight(p.accent, dark ? 1.8 : .55); rim.position.set(45, 25, -50); scene.add(rim);

  // A soft atmospheric dome, with a separate polygon sun or moon.
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { topColor: { value: new THREE.Color(p.sky) }, bottomColor: { value: new THREE.Color(p.fog) } },
    vertexShader: 'varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 topColor;uniform vec3 bottomColor;varying vec3 vPosition;void main(){float h=clamp(normalize(vPosition).y*.9+.12,0.,1.);gl_FragColor=vec4(mix(bottomColor,topColor,pow(h,.65)),1.);}',
  });
  materials.add(skyMat);
  mesh(geometry(new THREE.SphereGeometry(450, 20, 12)), skyMat);
  const orbMat = new THREE.MeshBasicMaterial({ color: dark ? '#f0f1ff' : '#fff0bd', fog: false }); materials.add(orbMat);
  mesh(geometry(new THREE.IcosahedronGeometry(dark ? 9 : 12, 2)), orbMat, -100, world.timeOfDay === 'sunset' ? 32 : 92, -235);

  if (dark || world.weather === 'stars' || world.features?.includes('stars')) {
    const stars = new Float32Array(220 * 3);
    for (let i = 0; i < 220; i++) { stars[i * 3] = rand(-330, 330); stars[i * 3 + 1] = rand(70, 220); stars[i * 3 + 2] = rand(-310, 200); }
    const sg = geometry(new THREE.BufferGeometry()); sg.setAttribute('position', new THREE.BufferAttribute(stars, 3));
    const sm = new THREE.PointsMaterial({ color: '#e4efff', size: .65, transparent: true, opacity: .85, fog: false }); materials.add(sm); scene.add(new THREE.Points(sg, sm));
  }

  if (world.biome !== 'depths') {
    for (let i = 0; i < (low ? 14 : 22); i++) {
      const x = rand(-175, 175), z = rand(-220, 70), y = rand(44, 80);
      const color = dark ? '#485171' : world.timeOfDay === 'sunset' ? '#f8d4d6' : '#fff8f1';
      for (let j = 0; j < 3; j++) put('ball', color, x + j * 7, y + rand(-2, 2), z, rand(8, 17), rand(2.3, 4.5), rand(5, 9));
    }
  }

  const groundHeight = (x, z) => {
    const edge = clamp((Math.abs(x) - 11) / 38, 0, 1);
    const elevation = 1 + (world.layout?.elevation || 0) * .07;
    return edge * (Math.sin(x * .06 + world.variant) * Math.cos(z * .045) * 4 + Math.sin(z * .08) * 1.2) * elevation;
  };
  if (!skyWorld) {
    const terrain = geometry(new THREE.PlaneGeometry(440, 420, 44, 44));
    terrain.rotateX(-Math.PI / 2);
    const positions = terrain.attributes.position;
    const colors = [];
    const base = new THREE.Color(snow ? '#e1eaf1' : p.ground);
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = positions.getZ(i);
      positions.setY(i, groundHeight(x, z) - .25);
      const c = base.clone().multiplyScalar(.86 + rand(0, .25)); colors.push(c.r, c.g, c.b);
    }
    terrain.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); terrain.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }); materials.add(m); mesh(terrain, m);
  } else {
    // Separate islands make the sky routes feel suspended rather than ground-level.
    for (let i = 0; i < 18; i++) {
      const x = (i % 2 ? 1 : -1) * rand(16, 90), z = rand(-160, 100), r = rand(9, 21);
      const y = rand(-12, 0);
      put('ball', p.ground, x, y, z, r, r * .23, r * .85);
      put('cone', p.stone, x, y - r * .7, z, r * .93, r * 1.7, r * .8, Math.PI);
      for (let j = 0; j < 3; j++) put('rock', p.stone, x + rand(-r, r), y - rand(8, 28), z + rand(-r, r), rand(1, 3), rand(2, 6), rand(1, 3));
    }
    for (let z = 70; z > -100; z -= 30) {
      const x = Math.sin(z * .04) * 2;
      put('ball', p.ground, x, -3, z, 13, 2.3, 12);
      put('cone', p.stone, x, -12, z, 11, 19, 10, Math.PI);
    }
    // The drifting cloud ocean remains beneath the flyway.
    for (let i = 0; i < 32; i++) put('ball', dark ? '#384868' : '#eeeaf9', rand(-160, 160), rand(-37, -26), rand(-190, 110), rand(20, 45), rand(3, 8), rand(15, 35));
  }

  // Mountain silhouettes and region-specific horizon formations.
  for (let i = 0; i < 20; i++) {
    const x = (i - 10) * 24 + rand(-8, 8), z = -185 - rand(0, 50), h = rand(28, 77);
    const color = world.biome === 'volcano' ? '#594650' : dark ? '#303c59' : p.stone;
    put('cone', color, x, h * .35 - 4, z, rand(24, 40), h, rand(24, 40));
    if (snow || world.biome === 'mountain') put('cone', '#edf1f1', x, h * .69, z, 8, h * .32, 8);
  }

  const water = ['coast', 'lake', 'marsh'].includes(world.biome) || world.landmark === 'water-wheels';
  const lava = world.biome === 'volcano';
  if (water || lava) {
    const wg = geometry(new THREE.PlaneGeometry(230, 320, 1, 1)); wg.rotateX(-Math.PI / 2);
    const wm = new THREE.MeshStandardMaterial({ color: lava ? '#f87539' : p.water, emissive: lava ? '#ff4f0e' : p.water, emissiveIntensity: lava ? .65 : .06, roughness: .28, metalness: .23 }); materials.add(wm);
    const surface = mesh(wg, wm, water && world.biome !== 'coast' ? -62 : 90, .2, -45);
    // Islands are left exposed down the center to preserve the camera route.
    for (let i = 0; i < 12; i++) {
      const x = rand(18, 80) * (world.biome === 'coast' ? 1 : -1), z = rand(-150, 80);
      put('rock', p.stone, x, .6, z, rand(3, 11), rand(1, 3), rand(3, 8));
    }
    for (let i = 0; i < 18; i++) put('box', lava ? '#ffcf70' : '#ceefed', rand(-10, 120), .29, rand(-150, 100), rand(3, 10), .025, .13, 0, 0, 0, lava ? .5 : .1);
    animations.push(t => { surface.position.y = .2 + Math.sin(t * .8) * .05; });
  }

  // A winding path guides the eye through each world, without acting as a road in the sky.
  if (!skyWorld && !water && !lava && world.biome !== 'depths') {
    const points = [], indices = [];
    for (let i = 0; i <= 70; i++) {
      const z = 110 - i * 3.4, x = Math.sin(z * .033 + world.variant * .2) * 2.5;
      points.push(x - 3.3, .02, z, x + 3.3, .02, z);
      if (i < 70) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = geometry(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); g.setIndex(indices); g.computeVertexNormals();
    mesh(g, mat(snow ? '#c6dbe8' : world.biome === 'desert' ? '#e7c28a' : '#d8cda5'));
  }

  function tree(x, z, size = 1, kind = 'round') {
    const y = skyWorld ? 0 : groundHeight(x, z);
    const foliage = snow ? '#dce9eb' : p.foliage;
    if (kind === 'palm') {
      beam([x, y, z], [x + 1.6 * size, y + 10 * size, z], .7 * size, '#9c7956');
      for (let a = 0; a < 6; a++) {
        const angle = a * TAU / 6;
        put('ball', foliage, x + 1.6 * size + Math.sin(angle) * 3 * size, y + 9.5 * size, z + Math.cos(angle) * 3 * size, 1.3 * size, .4 * size, 4.5 * size, 0, angle, .1);
      }
    } else if (kind === 'pine') {
      put('cylinder', '#655b50', x, y + 3 * size, z, .5 * size, 6 * size, .5 * size);
      for (let j = 0; j < 3; j++) put('cone', foliage, x, y + (5 + j * 2.3) * size, z, (4 - j * .9) * size, 6 * size, (4 - j * .9) * size);
    } else {
      put('cylinder', '#786249', x, y + 3.5 * size, z, .65 * size, 7 * size, .65 * size);
      put('ball', foliage, x, y + 8 * size, z, 4.4 * size, 3.8 * size, 4 * size);
      put('ball', foliage, x + 2.6 * size, y + 7.1 * size, z + .8 * size, 3 * size, 3 * size, 3 * size);
      if (world.biome === 'orchard') for (let a = 0; a < 6; a++) put('ball', '#e66566', x + rand(-3.5, 3.5) * size, y + rand(5.8, 8) * size, z + rand(-3, 3) * size, .38 * size);
    }
  }
  function crystal(x, z, size = 1, color = p.accent, y = 0) {
    put('prism', color, x, y + 4 * size, z, 1.4 * size, 8 * size, 1.4 * size, 0, rand(0, TAU), .12, dark ? .5 : .1);
    put('cone', color, x + .45 * size, y + 8.8 * size, z, .63 * size, 2 * size, .63 * size, 0, 0, .1, dark ? .5 : .1);
    put('prism', color, x - 1.7 * size, y + 2 * size, z + .5 * size, .7 * size, 4 * size, .7 * size, 0, 0, -.25, dark ? .5 : .1);
  }
  const barren = ['desert', 'volcano', 'depths', 'crystal'].includes(world.biome);
  for (let i = 0; i < Math.round((skyWorld ? 24 : barren ? 28 : 82) * density); i++) {
    let x = (i % 2 ? 1 : -1) * rand(15, 92) * spread, z = rand(-145, 96);
    const size = rand(.6, 1.6);
    if (world.biome === 'crystal') crystal(x, z, size, pick([p.accent, '#a3d9f2', '#dca5e8']));
    else if (world.biome === 'depths') {
      put('cylinder', '#34394a', x, size * 7, z, size * .8, size * 14, size * .8);
      put('ball', '#50666a', x, size * 14, z, size * 5, size, size * 5);
      for (let j = 0; j < 3; j++) put('ball', '#a6f3db', x + rand(-3, 3), size * 12, z + rand(-3, 3), .45, .8, .45, 0, 0, 0, 1.3);
    } else if (barren) {
      put('rock', p.stone, x, groundHeight(x, z) + size * 2, z, size * 3, size * 4, size * 3, 0, rand(0, TAU));
      if (world.biome === 'desert' && i % 3 === 0) {
        put('cylinder', '#658e7c', x + 2, 3, z, .65, 6, .65);
        beam([x + 2, 3, z], [x + 4, 4, z], .7, '#658e7c');
        put('cylinder', '#658e7c', x + 4, 5, z, .5, 2, .5);
      }
    } else tree(x, z, size, world.biome === 'coast' ? 'palm' : ['snow', 'mountain'].includes(world.biome) ? 'pine' : 'round');
  }

  // Small foreground details frame the route at a human scale.
  const flowers = world.realm === 'equestria' ? ['#f3a8d5', '#fff0a4', '#c0aff1', '#c7e9f0'] : ['#fff1c0', '#a8d6db', '#c7bbef'];
  if (!barren && !snow) {
    for (let i = 0; i < Math.round(175 * density); i++) {
      const x = (i % 2 ? 1 : -1) * rand(6.5, 40), z = rand(-105, 90), y = skyWorld ? -.2 : groundHeight(x, z);
      put('cone', p.foliage, x, y + .45, z, .24, .95, .24, 0, 0, rand(-.2, .2));
      if (i % 3 === 0) put('ball', pick(flowers), x, y + .9, z, .35, .22, .35);
    }
  }

  function cottage(x, z, s = 1, color = '#e9d9be', roof = p.accent, style = 'cottage') {
    const y = Math.max(0, skyWorld ? 0 : groundHeight(x, z));
    put('box', color, x, y + 2.5 * s, z, 7 * s, 5 * s, 6 * s);
    if (style === 'stacked') {
      put('box', roof, x, y + 5.25 * s, z, 7.4 * s, .6 * s, 6.4 * s);
      put('box', color, x + s, y + 6.8 * s, z - s, 4 * s, 3 * s, 4 * s);
      put('box', roof, x + s, y + 8.4 * s, z - s, 4.4 * s, .5 * s, 4.4 * s);
    } else put('cone', roof, x, y + 6 * s, z, 5.7 * s, 4 * s, 5 * s, 0, Math.PI / 4);
    put('box', '#594e65', x, y + 1.45 * s, z + 3.04 * s, 1.45 * s, 2.9 * s, .12);
    for (const dx of [-2.15, 2.15]) {
      put('box', '#675b69', x + dx * s, y + 3 * s, z + 3.05 * s, 1.5 * s, 1.7 * s, .12);
      put('box', '#ffdfa0', x + dx * s, y + 3 * s, z + 3.13 * s, 1.1 * s, 1.3 * s, .12, 0, 0, 0, .45);
      put('box', '#7c705f', x + dx * s, y + 2.1 * s, z + 3.25 * s, 1.85 * s, .3 * s, .5 * s);
    }
    if (world.realm === 'equestria') {
      beam([x - 3.5 * s, y + .2, z + 3.2 * s], [x + 3.5 * s, y + 4.8 * s, z + 3.2 * s], .16 * s, '#99849d');
      put('cylinder', '#f6d6a3', x - 2 * s, y + 7.6 * s, z, .6 * s, 2 * s, .6 * s);
    }
  }
  function tower(x, z, h, s, color = p.stone, crown = p.accent) {
    put('cylinder', color, x, h * .5, z, s, h, s);
    put('cylinder', color, x, h * .78, z, s * 1.3, 1.6, s * 1.3);
    put('cone', crown, x, h + s * .6, z, s * 1.6, s * 3, s * 1.6);
    for (let j = 0; j < 3; j++) put('box', '#7196ab', x, h * .35 + j * h * .19, z + s * .97, s * .5, h * .13, .15, 0, 0, 0, .2);
  }
  function arch(x, z, s = 1, color = p.stone, glowing = false) {
    put('box', color, x - 5 * s, 6 * s, z, 2 * s, 12 * s, 2.8 * s);
    put('box', color, x + 5 * s, 6 * s, z, 2 * s, 12 * s, 2.8 * s);
    put('box', color, x, 12 * s, z, 12 * s, 2.3 * s, 3 * s);
    if (glowing) {
      for (let i = 0; i < 5; i++) put('box', p.accent, x + (i - 2) * 1.6 * s, 12.1 * s, z + 1.55 * s, .65 * s, .8 * s, .12, 0, 0, .2, .9);
    }
  }
  function shrine(x, z, s = 1) {
    put('rock', p.stone, x, 2 * s, z, 5.2 * s, 3.8 * s, 5.2 * s);
    put('cone', p.stone, x, 5.4 * s, z, 4 * s, 5 * s, 4 * s);
    put('box', '#24363b', x, 2.2 * s, z + 4 * s, 2.3 * s, 4 * s, .15);
    torus(x, 6.8 * s, z + .2, 1.1 * s, p.accent, 0, 0, .9);
    for (let a = 0; a < 6; a++) {
      const angle = a * TAU / 6;
      put('ball', p.accent, x + Math.sin(angle) * 4 * s, 2.8 * s, z + Math.cos(angle) * 4 * s, .35 * s, .45 * s, .35 * s, 0, 0, 0, 1);
    }
  }
  function rainbow(x, z, s = 1) {
    const colors = ['#f49ca6', '#f4be9c', '#f4e7ab', '#a1d8b3', '#8dc9e2', '#b6a3df'];
    for (let i = 0; i < colors.length; i++) {
      const g = geometry(new THREE.TorusGeometry((17 - i * .8) * s, .46 * s, 4, 40, Math.PI));
      const o = mesh(g, mat(colors[i], .15), x, 8 * s, z); o.rotation.z = 0;
    }
    for (const dx of [-17, 17]) for (let j = 0; j < 4; j++) put('ball', '#f4edfc', x + (dx + j - 1.5) * s, 7 * s, z, 3 * s, 1.4 * s, 2.4 * s);
  }

  const mainX = (world.variant % 2 ? -1 : 1) * (30 + rand(-3, 4) + Math.max(0, landmarkScale - 1) * 24);
  const mainZ = -9 + rand(-8, 8);
  const s = landmarkScale;
  switch (world.landmark) {
    case 'timber-houses':
    case 'cottage':
    case 'stacked-houses':
    case 'palm-huts':
    case 'windmill': {
      for (let i = 0; i < 10; i++) cottage((i % 2 ? -1 : 1) * rand(17, 48), 62 - i * 15, rand(.85, 1.55), world.realm === 'equestria' ? pick(['#f4dfbf', '#e8d7ed', '#dfecd9']) : '#d7c8a1', world.landmark === 'palm-huts' ? '#a8915f' : p.accent, world.landmark === 'stacked-houses' ? 'stacked' : 'cottage');
      if (world.landmark === 'windmill') {
        tower(mainX, mainZ, 20 * s, 4 * s, '#d4c9a9', '#7d6c65');
        const blades = new THREE.Group(); blades.position.set(mainX, 16 * s, mainZ + 4.3 * s); scene.add(blades);
        for (let i = 0; i < 4; i++) { const o = new THREE.Mesh(geo.box, mat('#efe7cf')); o.scale.set(1.5 * s, 8 * s, .35); o.position.set(Math.sin(i * Math.PI / 2) * 4.5 * s, Math.cos(i * Math.PI / 2) * 4.5 * s, 0); o.rotation.z = -i * Math.PI / 2; blades.add(o); }
        animations.push(t => { blades.rotation.z = t * .15; });
      }
      break;
    }
    case 'sheikah-gate': {
      for (let i = 0; i < 8; i++) {
        const x = (i % 2 ? -1 : 1) * rand(22, 43), z = 54 - i * 19, h = rand(1, 1.4);
        cottage(x, z, h, '#c6c0a4', '#707e84');
        // Upturned eaves and layered roofs make these mountain houses distinct.
        put('box', '#707e84', x, 5.4 * h, z, 10 * h, .65, 8 * h);
        for (const side of [-1, 1]) put('box', '#707e84', x + side * 4.7 * h, 5.8 * h, z, 2.2 * h, .55, 8 * h, 0, 0, side * .22);
      }
      const x = mainX;
      for (const side of [-1, 1]) { put('cylinder', '#b36f61', x + side * 6 * s, 8 * s, mainZ, .8 * s, 16 * s, .8 * s); put('cylinder', '#555f65', x + side * 6 * s, .6, mainZ, 1.1 * s, 1.2, 1.1 * s); }
      put('box', '#b36f61', x, 13 * s, mainZ, 16 * s, 1 * s, 1.2 * s);
      put('box', '#596c74', x, 16 * s, mainZ, 19 * s, 1.3 * s, 2 * s);
      for (const side of [-1, 1]) put('box', '#596c74', x + side * 9 * s, 16.6 * s, mainZ, 4 * s, 1.1 * s, 2 * s, 0, 0, side * .2);
      break;
    }
    case 'spires': {
      put('box', '#f1dfed', mainX, 8 * s, mainZ, 23 * s, 16 * s, 16 * s);
      for (let i = 0; i < 5; i++) tower(mainX + (i - 2) * 7 * s, mainZ + (i % 2 ? -5 : 3) * s, (24 + (2 - Math.abs(i - 2)) * 11) * s, 3.4 * s, '#ece1ee', i % 2 ? '#b68dd2' : '#84bdce');
      arch(mainX, mainZ + 9 * s, s, '#e7cba1');
      for (let i = 0; i < 5; i++) put('ball', '#f8d58c', mainX + (i - 2) * 7 * s, (29 + (2 - Math.abs(i - 2)) * 11) * s, mainZ + (i % 2 ? -5 : 3) * s, .8 * s, 1.4 * s, .8 * s, 0, 0, 0, .25);
      break;
    }
    case 'rainbow-falls':
    case 'rainbow-arches': {
      rainbow(mainX, -20, 1.4 * s); rainbow(-mainX, -90, s);
      for (let i = 0; i < 5; i++) { put('cylinder', '#eeeafa', mainX + (i - 2) * 5, 8, 10, 2, 16, 2); put('ball', '#f8f3ff', mainX + (i - 2) * 5, 17, 10, 4, 2, 4); }
      if (world.landmark === 'rainbow-falls') for (let i = 0; i < 6; i++) put('box', ['#eea8be', '#f4cbad', '#f3dfaf', '#add7ba', '#a9d6e7', '#baa6df'][i], mainX + (i - 3) * 1.5, -4, 1, 1.5, 28, 1, 0, 0, 0, .25);
      break;
    }
    case 'red-barn': {
      cottage(mainX, mainZ, 2.5 * s, '#bd595e', '#786185');
      put('box', '#f8dfb4', mainX, 8, mainZ + 7.7, 6, 6, .2);
      beam([mainX - 3, 5, mainZ + 7.9], [mainX + 3, 11, mainZ + 7.9], .3, '#bd595e');
      beam([mainX + 3, 5, mainZ + 7.9], [mainX - 3, 11, mainZ + 7.9], .3, '#bd595e');
      for (let z = 60; z > -90; z -= 12) for (const x of [-12, 12]) { put('box', '#e8d5ad', x, 1, z, .45, 2, .45); put('box', '#e8d5ad', x, 1.4, z - 6, .22, .25, 12); }
      break;
    }
    case 'ancient-tree': {
      const baseY = groundHeight(mainX, mainZ);
      put('cylinder', '#65564d', mainX, baseY + 13 * s, mainZ, 4.3 * s, 26 * s, 4.3 * s);
      for (let i = 0; i < 7; i++) {
        const a = i * TAU / 7;
        const bx = mainX + Math.sin(a) * 13 * s, bz = mainZ + Math.cos(a) * 13 * s;
        beam([mainX, 15 * s, mainZ], [bx, 27 * s, bz], 2 * s, '#65564d');
        put('ball', p.foliage, bx, 30 * s + rand(-2, 2), bz, 11 * s, 7 * s, 10 * s);
        beam([mainX, 2, mainZ], [bx, .4, bz], 1.8 * s, '#65564d');
      }
      put('ball', p.foliage, mainX, 35 * s, mainZ, 13 * s, 7 * s, 13 * s);
      if (world.realm === 'kingdom') for (let i = 0; i < 7; i++) {
        const x = mainX + rand(-16, 16), z = mainZ + rand(-14, 16);
        put('ball', '#c3b283', x, 1.5, z, 1.1, 1.6, .7); put('ball', '#a8c882', x, 2.6, z + .5, 1.3, .8, .25); put('ball', '#3e5751', x - .35, 2.6, z + .73, .1); put('ball', '#3e5751', x + .35, 2.6, z + .73, .1);
      }
      break;
    }
    case 'crystal-spire': {
      crystal(mainX, mainZ, 4 * s, '#b3cbe9');
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6; crystal(mainX + Math.sin(a) * 14, mainZ + Math.cos(a) * 14, 1.7 * s, i % 2 ? '#d3a6df' : '#a0d8e7'); }
      torus(mainX, 27 * s, mainZ, 8 * s, '#f2d397', Math.PI / 2, 0, .4);
      break;
    }
    case 'towers': {
      for (let i = 0; i < 16; i++) {
        const x = (i % 2 ? -1 : 1) * rand(24, 70), z = rand(-110, 45), h = rand(16, 38);
        put('box', pick(['#a0a7bf', '#c1b0c7', '#dbbfb7']), x, h / 2, z, 9, h, 8);
        put('cone', p.accent, x, h + 3, z, 7, 7, 6, 0, Math.PI / 4);
        for (let j = 4; j < h; j += 4) for (const dx of [-2.5, 2.5]) put('box', '#f1dcb8', x + dx, j, z + 4.1, 1.5, 2, .2, 0, 0, 0, .15);
      }
      break;
    }
    case 'shell-palace':
    case 'water-palace': {
      for (let i = 0; i < 7; i++) {
        const a = (i - 3) * .35, x = mainX + Math.sin(a) * 15, z = mainZ + Math.cos(a) * 7;
        put('prism', world.landmark === 'shell-palace' ? '#edb6d9' : '#badcdd', x, (12 + Math.cos(a) * 6) * s, z, 3 * s, (23 + Math.cos(a) * 12) * s, 3 * s, 0, 0, -a * .7);
      }
      put('ball', p.water, mainX, 9, mainZ + 3, 19, 3, 12);
      for (let i = 0; i < 4; i++) torus(mainX, 9 + i * 4, mainZ, (11 - i * 1.5) * s, '#d6eee5', Math.PI / 2, 0, .1);
      break;
    }
    case 'temple': {
      for (let i = 0; i < 5; i++) for (const side of [-1, 1]) tower(mainX + side * 9 * s, mainZ + (i - 2) * 7 * s, 16 * s, 1.6 * s, '#bdbca4', '#8eaa9b');
      put('box', '#bdbca4', mainX, 17 * s, mainZ, 24 * s, 3 * s, 35 * s);
      arch(mainX, mainZ + 19 * s, 1.3 * s, '#c6c3a8', true);
      shrine(-mainX * .6, 25, 1.4);
      break;
    }
    case 'sandstone-gate': {
      for (let i = 0; i < 7; i++) cottage(mainX + (i - 3) * 8, -35 - (i % 2) * 10, 1.6, '#d9a77f', '#668f89', 'stacked');
      arch(mainX, 4, 2.5 * s, '#d9ac86', true);
      for (const dx of [-18, 18]) tower(mainX + dx, -5, 29 * s, 4.3, '#c59476', '#66a6a6');
      break;
    }
    case 'basalt-rings':
    case 'rail-fortress': {
      for (let i = 0; i < 8; i++) {
        const x = mainX + (i - 4) * 5, h = rand(15, 33);
        put('cylinder', '#554e5b', x, h / 2, -25 + (i % 2) * 5, 3.5, h, 3.5);
        torus(x, h, -25 + (i % 2) * 5, 2.5, '#f2a15c', Math.PI / 2, 0, .7);
      }
      if (world.landmark === 'rail-fortress') {
        for (let j = 0; j < 3; j++) for (const dx of [-1.8, 1.8]) beam([mainX - 24, 12 + j * 7, -40 + j * 8 + dx], [mainX + 24, 12 + j * 7, -40 + j * 8 + dx], .24, '#d9ad7b');
      }
      break;
    }
    case 'roost': {
      put('rock', '#8b8776', mainX, 20 * s, mainZ, 12 * s, 36 * s, 12 * s);
      for (let i = 0; i < 6; i++) {
        const a = i * 1.1, x = mainX + Math.sin(a) * 13 * s, z = mainZ + Math.cos(a) * 13 * s, y = (6 + i * 5) * s;
        put('cylinder', '#a18b6b', x, y, z, 7 * s, 1.2, 7 * s);
        put('cone', '#b66f69', x, y + 6 * s, z, 6 * s, 6 * s, 6 * s);
        for (let j = 0; j < 3; j++) { const b = j * TAU / 3; put('cylinder', '#a78d6e', x + Math.sin(b) * 4 * s, y + 2.8 * s, z + Math.cos(b) * 4 * s, .35, 5.6 * s, .35); }
      }
      break;
    }
    case 'stone-arch': {
      for (let i = 0; i < 4; i++) arch((i % 2 ? -1 : 1) * (23 + i * 4), 35 - i * 30, (1.2 + i * .2) * s, p.stone, world.realm === 'kingdom');
      break;
    }
    case 'zonai-rings':
    case 'dragon-ring':
    case 'storm-towers': {
      const color = '#a6c6a9';
      for (let i = 0; i < 3; i++) {
        const x = (i % 2 ? -1 : 1) * (26 + i * 5), z = 25 - i * 47;
        torus(x, (17 + i * 4) * s, z, (11 + i * 2) * s, color, 0, .25, .1);
        torus(x, (17 + i * 4) * s, z + .2, (9 + i * 2) * s, p.accent, 0, .25, .65);
        for (let j = 0; j < 7; j++) { const a = j * TAU / 7; put('box', '#e1d3ad', x + Math.sin(a) * (11 + i * 2) * s, (17 + i * 4 + Math.cos(a) * (11 + i * 2)) * s, z + 1, 1.2, 1.8, .6, 0, 0, -a); }
        if (world.landmark === 'storm-towers') tower(x, z, 30 + i * 5, 3, '#a4b4a5', p.accent);
      }
      if (world.landmark === 'dragon-ring') {
        // A pale serpentine dragon curves around the distant ring.
        for (let i = 0; i < 32; i++) { const a = i * .16; put('ball', '#e5e5c9', mainX + Math.sin(a) * 23, 40 + Math.cos(a) * 10, -70 - i * .7, 2.2 - i * .025, 1.8, 2.5); if (i % 3 === 0) put('cone', '#b9d4b8', mainX + Math.sin(a) * 23, 43 + Math.cos(a) * 10, -70 - i * .7, .8, 4, .8); }
        put('ball', '#f1e8c5', mainX, 51, -68, 3, 2.5, 4);
      }
      break;
    }
    case 'water-wheels': {
      for (let i = 0; i < 3; i++) {
        const x = (i % 2 ? -1 : 1) * 27, z = 30 - i * 42;
        const wheel = new THREE.Group(); wheel.position.set(x, 13, z); scene.add(wheel);
        const ring = new THREE.Mesh(geo.ring, mat('#bdc5a5')); ring.scale.setScalar(11); wheel.add(ring);
        for (let j = 0; j < 8; j++) { const a = j * TAU / 8; const blade = new THREE.Mesh(geo.box, mat('#97b7ab')); blade.position.set(Math.sin(a) * 7, Math.cos(a) * 7, 0); blade.scale.set(4, 5, 1); blade.rotation.z = -a; wheel.add(blade); }
        animations.push(t => { wheel.rotation.z = t * .13; });
        put('box', '#9bdad7', x, -2, z - 2, 8, 31, .8, 0, 0, 0, .12);
      }
      break;
    }
    case 'sky-ship': {
      put('ball', '#8d7368', mainX, 14 * s, mainZ, 11 * s, 4 * s, 23 * s);
      put('box', '#cfb797', mainX, 17 * s, mainZ, 17 * s, 1.2, 38 * s);
      for (let i = 0; i < 3; i++) {
        put('cylinder', '#806f67', mainX, 27 * s, mainZ + (i - 1) * 11 * s, .4, 21 * s, .4);
        put('box', '#e3e4d6', mainX, 29 * s, mainZ + (i - 1) * 11 * s, 14 * s, 11 * s, .3, 0, .15);
        beam([mainX - 7 * s, 34 * s, mainZ + (i - 1) * 11 * s], [mainX + 7 * s, 34 * s, mainZ + (i - 1) * 11 * s], .4, '#806f67');
      }
      for (let i = 0; i < 5; i++) { const z = mainZ + (i - 2) * 7; for (const side of [-1, 1]) beam([mainX + side * 7, 14, z], [mainX + side * 21, 19, z - 4], .7, '#b9ac92'); }
      break;
    }
    case 'lightroot': {
      put('cylinder', '#9dada0', mainX, 19 * s, mainZ, 2.8 * s, 38 * s, 2.8 * s);
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8, x = mainX + Math.sin(a) * 15 * s, z = mainZ + Math.cos(a) * 15 * s;
        beam([mainX, 31 * s, mainZ], [x, 39 * s, z], .8 * s, '#a9cbb5', .3);
        put('ball', '#d3f5c2', x, 39 * s, z, 4 * s, 3 * s, 4 * s, 0, 0, 0, 1.4);
        beam([mainX, 3, mainZ], [x, .4, z], 1.6 * s, '#b1d7ad', .4);
      }
      const light = new THREE.PointLight('#c3f8b8', 55, 85, 1); light.position.set(mainX, 25, mainZ); scene.add(light);
      for (let i = 0; i < 30; i++) { const x = rand(-70, 70), z = rand(-100, 80); put('ball', '#df6c88', x, .3, z, rand(1, 5), .13, rand(1, 5), 0, 0, 0, .25); }
      break;
    }
    default: shrine(mainX, mainZ, 2);
  }

  // Recurring motifs keep the franchises legible even in wide landscape views.
  if (world.realm !== 'equestria') {
    for (let i = 0; i < 3; i++) shrine((i % 2 ? -1 : 1) * (15 + rand(0, 7)), 55 - i * 55, .65 + rng() * .35);
    for (let i = 0; i < 7; i++) {
      const x = (i % 2 ? -1 : 1) * rand(10, 17), z = 68 - i * 23;
      put('box', p.stone, x, 1.8, z, 1.1, 3.6, 1.1);
      put('ball', p.accent, x, 3.7, z, .5, .65, .5, 0, 0, 0, 1.1);
    }
  }

  function pony(x, z, body, mane, unicorn, wings, size = 1) {
    const y = (skyWorld ? .1 : Math.max(0, groundHeight(x, z))) + (wings ? 4 : 0);
    const s = size;
    put('ball', body, x, y + 1.6 * s, z, 1.5 * s, 1 * s, .8 * s);
    put('ball', body, x - 1.2 * s, y + 2.4 * s, z, .55 * s, 1 * s, .5 * s, 0, 0, -.3);
    put('ball', body, x - 1.6 * s, y + 3.1 * s, z, .75 * s, .7 * s, .6 * s);
    put('ball', body, x - 2 * s, y + 2.8 * s, z + .1 * s, .65 * s, .38 * s, .45 * s);
    for (const dx of [-.9, .8]) for (const dz of [-.5, .5]) put('cylinder', body, x + dx * s, y + .7 * s, z + dz * s, .23 * s, 1.5 * s, .23 * s);
    put('cone', body, x - 1.4 * s, y + 3.9 * s, z - .25 * s, .25 * s, .8 * s, .25 * s, 0, 0, -.2);
    for (let i = 0; i < 5; i++) put('ball', mane, x - 1.4 * s + i * .17 * s, y + (3.7 - i * .32) * s, z - .44 * s, .44 * s, .6 * s, .32 * s);
    for (let i = 0; i < 4; i++) put('ball', mane, x + (1.3 + i * .23) * s, y + (1.8 - i * .25) * s, z, .55 * s, .5 * s, .45 * s);
    put('ball', '#fffdf4', x - 1.75 * s, y + 3.15 * s, z + .54 * s, .24 * s, .32 * s, .1 * s);
    put('ball', '#4d4776', x - 1.8 * s, y + 3.15 * s, z + .63 * s, .13 * s, .23 * s, .06 * s);
    if (unicorn) put('cone', '#f1d4f1', x - 1.95 * s, y + 3.9 * s, z, .18 * s, .85 * s, .18 * s, 0, 0, -.35);
    if (wings) for (const side of [-1, 1]) for (let i = 0; i < 3; i++) put('ball', body, x + i * .3 * s, y + (2.2 + i * .2) * s, z + side * (1 + i * .3) * s, 1 * s, .25 * s, .7 * s, side * .3);
    put('ball', mane, x + .65 * s, y + 1.8 * s, z + .79 * s, .22 * s, .22 * s, .05 * s);
  }
  if (world.realm === 'equestria') {
    const ponies = [['#ba9add', '#675091'], ['#f1a5c8', '#c759a7'], ['#a5dbe9', '#d98fbd'], ['#f2d395', '#d78864'], ['#efe7fa', '#9377c0'], ['#eadc9f', '#e7a3c3']];
    for (let i = 0; i < (low ? 5 : 8); i++) {
      const colors = ponies[(i + world.variant) % ponies.length];
      pony((i % 2 ? -1 : 1) * rand(8, 15), 62 - i * 21 + rand(-4, 4), colors[0], colors[1], i % 3 === 0, i % 3 === 2, rand(.95, 1.4));
    }
    if (!['cloud', 'sky'].includes(world.biome)) rainbow(-mainX, -110, 1.8);
  }

  // Each chapter changes silhouettes and props as well as lighting and weather.
  const features = new Set(world.features || []);
  if (features.has('flowers')) {
    for (let i = 0; i < 35; i++) {
      const x = (i % 2 ? -1 : 1) * rand(7, 15), z = rand(-90, 75);
      put('cylinder', p.foliage, x, .45, z, .06, .9, .06);
      for (let j = 0; j < 5; j++) { const a = j * TAU / 5; put('ball', flowers[i % flowers.length], x + Math.sin(a) * .25, .95, z + Math.cos(a) * .25, .22, .12, .22); }
      put('ball', '#e9d696', x, 1, z, .14, .1, .14);
    }
  }
  if (features.has('groves')) for (let i = 0; i < 16; i++) tree((i % 2 ? -1 : 1) * rand(15, 32), rand(-110, 74), rand(.8, 1.25));
  if (features.has('autumn')) {
    for (let i = 0; i < 16; i++) {
      const x = (i % 2 ? -1 : 1) * rand(18, 36), z = rand(-105, 70);
      put('cylinder', '#866c55', x, 4, z, .45, 8, .45);
      put('ball', i % 2 ? '#d5a163' : '#c8846e', x, 8, z, 3.4, 3.7, 3.4);
    }
  }
  if (features.has('lanterns') || features.has('fireflies')) {
    for (let i = 0; i < 14; i++) {
      const x = (i % 2 ? -1 : 1) * 8.5, z = 80 - i * 13;
      put('cylinder', '#7f7a77', x, 2.1, z, .13, 4.2, .13);
      put('ball', '#fce4a4', x, 4.5, z, .65, .85, .65, 0, 0, 0, 1);
    }
  }
  if (features.has('banners') || features.has('ribbons')) {
    for (let i = 0; i < 6; i++) {
      const z = 62 - i * 27;
      for (const side of [-1, 1]) {
        put('cylinder', p.stone, side * 10, 6, z, .18, 12, .18);
        put('box', i % 2 ? p.accent : '#f0dca4', side * 10, 10, z, 2, 3, .08);
      }
      beam([-10, 12, z], [10, 12, z], .045, '#c6c8b4');
      for (let j = 0; j < 9; j++) put('cone', j % 2 ? p.accent : '#edd4a1', (j - 4) * 2, 11.4, z, .5, 1.3, .12, Math.PI);
    }
  }
  if (features.has('balloons')) {
    for (let i = 0; i < 9; i++) {
      const x = (i % 2 ? -1 : 1) * rand(18, 50), z = rand(-95, 65), y = rand(13, 28);
      put('ball', i % 2 ? p.accent : '#edd39f', x, y, z, 2, 2.8, 2);
      beam([x, y - 2.8, z], [x, y - 7.3, z], .035, '#b6b0a1');
      put('box', '#a78e72', x, y - 7.5, z, 1.4, .6, 1.4);
    }
  }
  if (features.has('mushrooms') || features.has('giant-flowers')) {
    for (let i = 0; i < 24; i++) {
      const x = (i % 2 ? -1 : 1) * rand(10, 33), z = rand(-105, 78), h = rand(2, features.has('giant-flowers') ? 8 : 4.5);
      put('cylinder', features.has('mushrooms') ? '#c9c4ac' : '#93ab79', x, h / 2, z, .2, h, .2);
      if (features.has('mushrooms')) { put('ball', i % 2 ? '#b491c4' : '#c5b3ad', x, h, z, h * .65, h * .25, h * .65); put('ball', '#dcf2bc', x, h - .2, z, h * .5, .1, h * .5, 0, 0, 0, .65); }
      else {
        for (let a = 0; a < 6; a++) { const angle = a * TAU / 6; put('ball', i % 2 ? p.accent : '#e7c4cf', x + Math.sin(angle) * h * .28, h, z + Math.cos(angle) * h * .28, h * .25, .25, h * .25); }
        put('ball', '#ebd799', x, h + .2, z, h * .17, .3, h * .17);
      }
    }
  }
  if (features.has('ruins') || features.has('arches')) {
    for (let i = 0; i < 5; i++) arch((i % 2 ? -1 : 1) * rand(17, 28), 50 - i * 32, rand(.45, .85), p.stone, world.realm !== 'equestria');
  }
  if (features.has('crystals') || features.has('ice')) {
    for (let i = 0; i < 11; i++) crystal((i % 2 ? -1 : 1) * rand(11, 25), 75 - i * 16, rand(.35, .85), features.has('ice') ? '#badde8' : p.accent);
  }
  if (features.has('floating-stones') || features.has('islands')) {
    for (let i = 0; i < 13; i++) { const x = (i % 2 ? -1 : 1) * rand(17, 60), z = rand(-130, 60), y = rand(20, 48), s = rand(2, 6); put('rock', p.stone, x, y, z, s, s * 1.4, s, rand(0, 1), rand(0, TAU)); put('ball', p.ground, x, y + s, z, s * .8, .4, s * .8); }
  }
  if (features.has('bridges')) {
    for (let i = 0; i < 3; i++) {
      const x = (i % 2 ? -1 : 1) * 27, z = 45 - i * 55;
      put('box', '#b6a58a', x, 4, z, 24, .7, 4);
      for (const dx of [-10, 10]) for (const dz of [-2, 2]) put('box', '#9d9079', x + dx, 2.8, z + dz, .6, 5.6, .6);
      for (const dz of [-2, 2]) put('box', '#b6a58a', x, 5.6, z + dz, 24, .25, .25);
    }
  }
  if (features.has('towers')) for (let i = 0; i < 3; i++) tower((i % 2 ? -1 : 1) * 22, 38 - i * 58, 20 + i * 4, 1.8, p.stone, p.accent);
  if (features.has('spires')) for (let i = 0; i < 5; i++) { const x = (i % 2 ? -1 : 1) * rand(15, 35), z = 65 - i * 37, h = rand(13, 23); put('cone', snow ? '#d4e9ec' : p.stone, x, h / 2, z, 2.4, h, 2.4); }
  if (features.has('windmills')) {
    for (let i = 0; i < 3; i++) {
      const x = (i % 2 ? -1 : 1) * 19, z = 45 - i * 52;
      put('cylinder', '#d2c9b3', x, 5, z, 1.5, 10, 1.5);
      put('cone', p.accent, x, 11, z, 2, 3, 2);
      const vanes = new THREE.Group(); vanes.position.set(x, 8.5, z + 1.7); scene.add(vanes);
      for (let j = 0; j < 4; j++) { const a = j * TAU / 4; const blade = new THREE.Mesh(geo.box, mat('#ede2bd')); blade.position.set(Math.sin(a) * 2.5, Math.cos(a) * 2.5, 0); blade.scale.set(.9, 4, .2); blade.rotation.z = -a; vanes.add(blade); }
      animations.push(t => { vanes.rotation.z = t * .2 + i; });
    }
  }
  if (features.has('rainbows')) rainbow(mainX * -.8, -45, .9);
  if (features.has('lightning')) {
    const points = [new THREE.Vector3(-72, 94, -180), new THREE.Vector3(-66, 75, -180), new THREE.Vector3(-75, 76, -180), new THREE.Vector3(-64, 53, -180)];
    const g = geometry(new THREE.BufferGeometry().setFromPoints(points));
    const m = new THREE.LineBasicMaterial({ color: '#c1dddf', transparent: true, opacity: .2 }); materials.add(m);
    scene.add(new THREE.Line(g, m));
    // A slow, subdued glow avoids a strobing effect in this passive experience.
    animations.push(t => { m.opacity = .12 + .3 * Math.pow(Math.max(0, Math.sin(t * .35)), 4); });
  }
  if (features.has('ponds')) {
    for (let i = 0; i < 7; i++) put('ball', p.water, (i % 2 ? -1 : 1) * rand(12, 38), .15, rand(-100, 70), rand(3, 8), .18, rand(3, 9), 0, 0, 0, .12);
  }

  // Floating leaves, snow, fireflies and rain are animated in one draw call.
  const weather = world.weather;
  const particleCount = Math.round((low ? 100 : 230) * (weather === 'clear' ? .3 : 1));
  const particlePositions = new Float32Array(particleCount * 3);
  const particleOrigins = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = rand(-60, 60); particlePositions[i * 3 + 1] = rand(2, 45); particlePositions[i * 3 + 2] = rand(-130, 100);
  }
  particleOrigins.set(particlePositions);
  const pg = geometry(new THREE.BufferGeometry()); pg.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const pm = new THREE.PointsMaterial({ color: weather === 'petals' ? '#fbd0e7' : weather === 'fireflies' || world.biome === 'depths' ? '#d9efac' : weather === 'rain' || weather === 'storm' ? '#cce7ef' : '#f8f1d8', size: weather === 'rain' ? .11 : weather === 'snow' ? .24 : .16, transparent: true, opacity: .75, depthWrite: false });
  materials.add(pm); scene.add(new THREE.Points(pg, pm));
  animations.push(t => {
    const fall = weather === 'rain' || weather === 'storm' ? 12 : weather === 'snow' ? 1.3 : weather === 'petals' ? .9 : -.3;
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = particleOrigins[i * 3] + Math.sin(t * .3 + i) * (weather === 'storm' ? 6 : 2);
      particlePositions[i * 3 + 1] = ((particleOrigins[i * 3 + 1] - t * fall) % 45 + 45) % 45;
    }
    pg.attributes.position.needsUpdate = true;
  });

  // A few birds mark the depth of the view and move without any model assets.
  if ((!low || features.has('birds')) && world.biome !== 'depths') {
    const flock = new THREE.Group(); scene.add(flock);
    for (let i = 0; i < (features.has('birds') ? 14 : 8); i++) {
      const bird = new THREE.Group(); bird.position.set(rand(-35, 35), rand(23, 35), rand(-90, 30)); flock.add(bird);
      for (const side of [-1, 1]) { const wing = new THREE.Mesh(geo.cone, mat(dark ? '#babacb' : '#5f6c7b')); wing.scale.set(.35, 1.9, .11); wing.rotation.z = side * 1.1; wing.position.x = side * .7; bird.add(wing); }
      animations.push(t => { bird.position.x += 0; bird.rotation.z = Math.sin(t * 1.8 + i) * .12; bird.children[0].rotation.z = -1.1 + Math.sin(t * 3 + i) * .25; bird.children[1].rotation.z = 1.1 - Math.sin(t * 3 + i) * .25; });
    }
    animations.push(t => { flock.position.x = Math.sin(t * .04) * 20; });
  }

  for (const bucket of buckets.values()) {
    const instances = new THREE.InstancedMesh(bucket.geometry, bucket.material, bucket.matrices.length);
    instancedMeshes.add(instances);
    bucket.matrices.forEach((matrix, i) => instances.setMatrixAt(i, matrix));
    instances.instanceMatrix.needsUpdate = true; instances.computeBoundingSphere(); scene.add(instances);
  }

  const routePhase = world.variant * .45;
  const route = world.layout?.route;
  const rise = route === 'rise' ? 4 : route === 'dip' ? -1.5 : 0;
  const sway = route === 'straight' ? .2 : route === 'wide' ? 1.3 : route === 'river' ? .8 : 1;
  const routeX = route === 'orbit' ? [3.5, 4.5, 3.5] : route === 'river' ? [-2.8, 2.8, -2.8] : [Math.sin(routePhase) * 3 * sway, -Math.cos(routePhase) * 3.5 * sway, Math.sin(routePhase + 1) * 3 * sway];
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 7, 85),
    new THREE.Vector3(routeX[0], 8.5 + rise * .5, 52),
    new THREE.Vector3(routeX[1], 10 + rise, 13),
    new THREE.Vector3(routeX[2], 9 + rise * .4, -28),
    new THREE.Vector3(0, 7, -68),
    new THREE.Vector3(0, 7, -95),
  ], false, 'catmullrom', .3);
  let disposed = false;
  return {
    scene, path, duration: world.duration, portalPosition: new THREE.Vector3(0, 7, -95),
    update(elapsed) { if (!disposed) for (const animate of animations) animate(elapsed); },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const instances of instancedMeshes) instances.dispose();
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      scene.clear(); buckets.clear(); animations.length = 0;
    },
  };
}
