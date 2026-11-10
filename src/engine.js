import * as THREE from 'three';
import { WORLDS, getWorld } from './catalog.js';
import { buildWorld } from './scenery.js';
import { createAmbientAudio } from './audio.js';

/** A repeatable itinerary: each world appears exactly once before the route loops. */
export function createRoute(startId = WORLDS[0].id) {
  let seed = 0x504f4e59;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const groups = ['equestria', 'wild', 'kingdom'].map(realm => {
    const worlds = WORLDS.filter(world => world.realm === realm);
    for (let i = worlds.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [worlds[i], worlds[j]] = [worlds[j], worlds[i]];
    }
    return worlds;
  });
  const route = [];
  for (let i = 0; i < Math.max(...groups.map(group => group.length)); i++) {
    for (const group of groups) if (group[i]) route.push(group[i]);
  }
  const index = Math.max(0, route.findIndex(world => world.id === startId));
  return [...route.slice(index), ...route.slice(0, index)];
}

/**
 * Owns renderer, current/next scenes, seamless portal crossing, and opt-in audio.
 * Call start(id) after constructing. onWorld fires once per entered destination.
 * setSound returns a Promise<boolean>; all other controls are synchronous.
 */
export function createJourney(canvas, callbacks = {}) {
  const { onWorld = () => {}, onProgress = () => {}, onState = () => {}, onError = () => {}, onAudioError = onError } = callbacks;
  const state = { paused: false, sound: false, pace: 1, quality: 'auto', gentle: false };
  const audio = createAmbientAudio({ onError: onAudioError });
  const camera = new THREE.PerspectiveCamera(62, 1, 0.15, 1100);
  const portalCamera = camera.clone();
  const destination = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  const nextStart = new THREE.Vector3();
  const currentPosition = new THREE.Vector3();
  const portalTint = new THREE.Color();
  let renderer;
  let target;
  let current;
  let upcoming;
  let route = [];
  let routeIndex = 0;
  let elapsed = 0;
  let animationElapsed = 0;
  let previewElapsed = 0;
  let lastTime = null;
  let frame = null;
  let preloadTimer = null;
  let disposed = false;
  let failed = false;
  let rushing = false;
  let dirty = true;
  let previousProgress = -1;
  let width = 1;
  let height = 1;
  let resizeObserver;
  let soundRequest = 0;
  let renderedFrames = 0;
  let worldFrames = 0;

  function detailQuality() {
    if (state.quality !== 'auto') return state.quality;
    const coarse = globalThis.matchMedia?.('(pointer: coarse)').matches;
    return width <= 640 || (coarse && width <= 1024) ? 'low' : 'auto';
  }

  const emitState = () => onState({ ...state });
  const error = (cause) => {
    failed = true;
    state.paused = true;
    audio.setPaused(true);
    emitState();
    onError(cause instanceof Error ? cause : new Error(String(cause)));
  };

  function resize() {
    if (!renderer || disposed) return;
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(bounds.width || innerWidth));
    height = Math.max(1, Math.round(bounds.height || innerHeight));
    const detail = detailQuality();
    const maxDimension = detail === 'low' ? 960 : detail === 'high' ? 2304 : 1600;
    const requestedRatio = detail === 'low' ? 0.85 : detail === 'high' ? Math.min(devicePixelRatio || 1, 2) : Math.min(devicePixelRatio || 1, 1.35);
    const pixelRatio = Math.min(requestedRatio, maxDimension / Math.max(width, height));
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    portalCamera.aspect = camera.aspect;
    portalCamera.updateProjectionMatrix();
    // Full-screen projective mapping needs the same aspect ratio on both targets.
    const scale = Math.min(1, (detail === 'high' ? 1400 : detail === 'low' ? 560 : 900) / Math.max(width, height));
    target?.setSize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
    if (current && current.quality !== detail) rebuildDetail();
    dirty = true;
  }

  function createPortal(worldScene, world) {
    const group = new THREE.Group();
    group.position.copy(worldScene.portalPosition);
    const color = world.palette?.accent || '#b3e6c2';
    portalTint.set(color);
    const ringGeometry = new THREE.TorusGeometry(11.3, 0.28, 8, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    group.add(ring);
    const outerGeometry = new THREE.TorusGeometry(12, 0.065, 5, 64);
    const outerMaterial = new THREE.MeshBasicMaterial({ color: '#fff4ca', transparent: true, opacity: 0.65, toneMapped: false });
    const outer = new THREE.Mesh(outerGeometry, outerMaterial);
    group.add(outer);
    const planeGeometry = new THREE.CircleGeometry(11.05, 64);
    const planeMaterial = new THREE.ShaderMaterial({
      uniforms: { portalTexture: { value: target.texture }, ready: { value: 0 }, tint: { value: portalTint.clone() } },
      vertexShader: `varying vec4 projected; void main() { projected = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = projected; }`,
      fragmentShader: `uniform sampler2D portalTexture; uniform float ready; uniform vec3 tint; varying vec4 projected;
        void main() {
          vec2 uv = projected.xy / projected.w * 0.5 + 0.5;
          gl_FragColor = mix(vec4(tint * 0.18, 1.0), texture2D(portalTexture, uv), ready);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      toneMapped: true,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.z = 0.025;
    group.add(plane);
    worldScene.scene.add(group);
    return {
      group, material: planeMaterial,
      update(time) { outer.rotation.z = time * 0.04; ringMaterial.color.copy(portalTint.set(color)).multiplyScalar(1 + Math.sin(time * 1.2) * 0.12); },
      dispose() {
        worldScene.scene.remove(group);
        for (const geometry of [ringGeometry, outerGeometry, planeGeometry]) geometry.dispose();
        for (const material of [ringMaterial, outerMaterial, planeMaterial]) material.dispose();
      },
    };
  }

  function build(world, withPortal = false) {
    const quality = detailQuality();
    const view = buildWorld(world, { quality });
    if (!view?.scene || !view?.path || !view?.portalPosition) throw new Error(`Could not build ${world.title}.`);
    return { world, view, quality, portal: withPortal ? createPortal(view, world) : null };
  }

  function release(entry) {
    if (!entry) return;
    entry.portal?.dispose();
    entry.view.dispose();
  }

  function rebuildDetail() {
    if (!current || disposed || failed) return;
    let replacement;
    let replacementNext;
    try {
      // Build before releasing so a failed rebuild leaves the old scene intact.
      // The camera route and both animation clocks stay at their current positions.
      replacement = build(current.world, true);
      if (upcoming) replacementNext = build(upcoming.world);
      replacement.portal.material.uniforms.ready.value = replacementNext ? 1 : 0;
    } catch (cause) {
      release(replacement);
      release(replacementNext);
      error(cause);
      return;
    }
    const old = current;
    const oldNext = upcoming;
    current = replacement;
    upcoming = replacementNext;
    worldFrames = 0;
    release(old);
    release(oldNext);
    lastTime = null;
    dirty = true;
  }

  function preload() {
    clearTimeout(preloadTimer);
    preloadTimer = setTimeout(() => {
      if (disposed || failed || !current || upcoming) return;
      try {
        upcoming = build(route[(routeIndex + 1) % route.length]);
        current.portal.material.uniforms.ready.value = 1;
        dirty = true;
      } catch (cause) { error(cause); }
    }, 80);
  }

  function enterNext() {
    if (!upcoming) return;
    const old = current;
    current = upcoming;
    upcoming = null;
    routeIndex = (routeIndex + 1) % route.length;
    current.portal = createPortal(current.view, current.world);
    elapsed = 0;
    animationElapsed = previewElapsed;
    previewElapsed = 0;
    rushing = false;
    previousProgress = -1;
    worldFrames = 0;
    release(old);
    audio.setWorld(current.world);
    onWorld(current.world);
    preload();
  }

  function setCamera(progress) {
    const path = current.view.path;
    path.getPointAt(progress, currentPosition);
    camera.position.copy(currentPosition);
    path.getPointAt(Math.min(1, progress + 0.025), ahead);
    if (progress > 0.975) ahead.copy(current.view.portalPosition).add(new THREE.Vector3(0, 0, -10));
    if (state.gentle) {
      // Horizon stays level and gaze follows the route without oscillation.
      ahead.y = camera.position.y;
    } else {
      ahead.x += Math.sin(elapsed * 0.20) * 0.6 * (1 - progress);
      ahead.y += Math.sin(elapsed * 0.13) * 0.3 * (1 - progress);
    }
    camera.up.set(0, 1, 0);
    camera.lookAt(ahead);
  }

  function render(dt) {
    renderer.info.reset();
    const duration = current.view.duration || current.world.duration || 45;
    let progress = Math.min(1, elapsed / duration);
    if (progress >= 1 && upcoming) { enterNext(); progress = 0; }
    setCamera(progress);
    current.view.update?.(animationElapsed, dt);
    current.portal.update(animationElapsed);

    if (upcoming) {
      // Translate the current camera through the portal into the next world.
      // Sampling by screen position gives genuine perspective through the opening.
      upcoming.view.path.getPointAt(0, nextStart);
      destination.copy(camera.position).sub(current.view.portalPosition).add(nextStart);
      portalCamera.position.copy(destination);
      portalCamera.quaternion.copy(camera.quaternion);
      upcoming.view.update?.(previewElapsed, dt);
      renderer.setRenderTarget(target);
      renderer.render(upcoming.view.scene, portalCamera);
      renderer.setRenderTarget(null);
    }
    renderer.render(current.view.scene, camera);
    renderedFrames++;
    worldFrames++;
    if (Math.abs(progress - previousProgress) > 0.001 || previousProgress < 0) {
      previousProgress = progress;
      onProgress(progress);
    }
  }

  function tick(time) {
    if (disposed) return;
    frame = requestAnimationFrame(tick);
    const dt = lastTime == null ? 0 : Math.min(0.25, Math.max(0, (time - lastTime) / 1000));
    lastTime = time;
    if (failed || !current || document.hidden) return;
    if (!state.paused) {
      const travel = dt * state.pace * (rushing ? 20 : 1);
      const duration = current.view.duration || current.world.duration || 45;
      elapsed = Math.min(duration, elapsed + travel);
      // Wait ahead of the opening if a next world has not finished building.
      if (!upcoming) elapsed = Math.min(elapsed, duration * 0.91);
      animationElapsed += dt;
      previewElapsed += dt;
      dirty = true;
    }
    if (dirty) {
      dirty = false;
      try { render(state.paused ? 0 : dt); } catch (cause) { error(cause); }
    }
  }

  function visibility() {
    lastTime = null;
    audio.setPaused(state.paused || document.hidden);
    dirty = true;
  }

  function contextLost(event) {
    event.preventDefault();
    error(new Error('The graphics connection was interrupted. Reload the page to resume your journey.'));
  }

  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    renderer.info.autoReset = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = false;
    target = new THREE.WebGLRenderTarget(1, 1, {
      depthBuffer: true, stencilBuffer: false,
      type: renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType,
    });
    target.texture.colorSpace = THREE.LinearSRGBColorSpace;
    resize();
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);
    }
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', visibility);
    canvas.addEventListener('webglcontextlost', contextLost, false);
    frame = requestAnimationFrame(tick);
  } catch (cause) {
    error(new Error('This journey needs WebGL graphics. Try a recent browser with hardware acceleration enabled.', { cause }));
  }

  return {
    start(worldId = WORLDS[0].id) {
      if (disposed || failed || !renderer) return false;
      const selected = getWorld(worldId) || WORLDS[0];
      clearTimeout(preloadTimer);
      let replacement;
      try { replacement = build(selected, true); } catch (cause) { error(cause); return false; }
      release(current);
      release(upcoming);
      current = replacement;
      upcoming = null;
      route = createRoute(selected.id);
      routeIndex = 0;
      elapsed = 0;
      animationElapsed = 0;
      previewElapsed = 0;
      previousProgress = -1;
      worldFrames = 0;
      rushing = false;
      lastTime = null;
      dirty = true;
      audio.setWorld(selected);
      onWorld(selected);
      emitState();
      preload();
      return true;
    },
    setPaused(value) {
      state.paused = Boolean(value);
      audio.setPaused(state.paused || document.hidden);
      lastTime = null;
      dirty = true;
      emitState();
    },
    setPace(value) {
      const number = Number(value);
      if (Number.isFinite(number)) state.pace = Math.min(3, Math.max(0.5, number));
      emitState();
    },
    async setSound(value) {
      const request = ++soundRequest;
      const enabled = await audio.setEnabled(value);
      if (disposed || request !== soundRequest) return state.sound;
      state.sound = enabled;
      audio.setPaused(state.paused || document.hidden);
      emitState();
      return state.sound;
    },
    setQuality(value) {
      if (disposed || failed || !['low', 'auto', 'high'].includes(value)) return;
      state.quality = value;
      resize();
      emitState();
    },
    setGentle(value) { state.gentle = Boolean(value); dirty = true; emitState(); },
    next() {
      if (!current || failed || disposed) return;
      rushing = true;
      state.paused = false;
      audio.setPaused(document.hidden);
      emitState();
    },
    screenshot() {
      if (failed || !renderer || !current) return null;
      render(0);
      return canvas.toDataURL('image/png');
    },
    getDebugState() {
      return {
        ...state, failed, worldId: current?.world.id || null, nextWorldId: upcoming?.world.id || null,
        progress: current ? elapsed / (current.view.duration || current.world.duration || 45) : 0,
        routeLength: route.length, routeIndex,
        renderedFrames, worldFrames,
        liveWorlds: Number(Boolean(current)) + Number(Boolean(upcoming)),
        effectiveQuality: current?.quality || detailQuality(),
        drawingBuffer: renderer ? { width: canvas.width, height: canvas.height } : null,
        render: renderer ? { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, points: renderer.info.render.points } : null,
        memory: renderer ? { ...renderer.info.memory } : null,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      soundRequest++;
      cancelAnimationFrame(frame);
      clearTimeout(preloadTimer);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('webglcontextlost', contextLost);
      release(current);
      release(upcoming);
      current = null;
      upcoming = null;
      audio.dispose();
      target?.dispose();
      renderer?.dispose();
    },
  };
}
