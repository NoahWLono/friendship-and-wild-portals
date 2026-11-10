// Playback stays in YouTube's visible, interactive player. No media is downloaded.
const TRACKS = Object.freeze({
  equestria: Object.freeze({
    videoId: 'i7PQ9IO-7fU', start: 0,
    title: 'Lullaby for a Princess · WarpOut animation',
    source: 'https://www.youtube.com/watch?v=i7PQ9IO-7fU',
  }),
  wild: Object.freeze({
    videoId: 'xuXHrHRZzLk', start: 807, end: 933,
    title: 'BOTW Main Theme · official concert arrangement',
    source: 'https://www.youtube.com/watch?v=xuXHrHRZzLk&t=807s',
  }),
  kingdom: Object.freeze({
    videoId: 'xuXHrHRZzLk', start: 63, end: 237,
    title: 'TOTK Main Theme Reprise · official concert arrangement',
    source: 'https://www.youtube.com/watch?v=xuXHrHRZzLk&t=63s',
  }),
});

let apiPromise;

function loadYoutubeAPI() {
  if (globalThis.YT?.Player) return Promise.resolve(globalThis.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    let settled = false;
    let script = document.querySelector('script[data-portals-youtube-api]');
    const previousReady = globalThis.onYouTubeIframeAPIReady;
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      script?.removeEventListener('error', failed);
      if (globalThis.onYouTubeIframeAPIReady === ready) {
        globalThis.onYouTubeIframeAPIReady = previousReady;
      }
      if (error) {
        script?.remove();
        reject(error);
      } else resolve(globalThis.YT);
    };
    const failed = () => finish(new Error('YouTube could not load. Use the Watch on YouTube link or choose Ambient.'));
    const ready = () => {
      try { previousReady?.(); } finally { finish(); }
    };
    const timeout = setTimeout(() => finish(new Error('YouTube is taking too long to load. Use the Watch on YouTube link or try again.')), 20000);
    globalThis.onYouTubeIframeAPIReady = ready;
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.dataset.portalsYoutubeApi = '';
      script.addEventListener('error', failed);
      document.head.append(script);
    } else script.addEventListener('error', failed);
  }).catch(error => { apiPromise = null; throw error; });
  return apiPromise;
}

/** Optional visible YouTube soundtrack. Loading begins only after enable(). */
export function createYoutubeSoundtrack({ onError = () => {} } = {}) {
  const panel = document.querySelector('#music-player');
  const mount = document.querySelector('#youtube-mount');
  const title = document.querySelector('#music-title');
  const source = document.querySelector('#music-source');
  const status = document.querySelector('#music-status');
  let enabled = false;
  let paused = false;
  let ready = false;
  let generation = 0;
  let realm = 'equestria';
  let player = null;
  let loopTimer = null;
  let readyTimer = null;
  let cancelEnable = null;
  let lastLoop = 0;

  const track = () => TRACKS[realm] || TRACKS.equestria;
  const current = token => enabled && generation === token;
  const say = message => { if (status) status.textContent = message; };
  const report = message => { say(message); onError(message); };

  function label() {
    const selected = track();
    if (title) title.textContent = selected.title;
    if (source) {
      source.href = selected.source;
      source.rel = 'noopener noreferrer';
      source.textContent = 'Watch on YouTube ↗';
    }
    const iframe = player?.getIframe?.();
    if (iframe) iframe.title = selected.title;
  }

  function playSelection() {
    if (!enabled || !ready || !player) return;
    const selected = track();
    const selection = { videoId: selected.videoId, startSeconds: selected.start };
    if (selected.end) selection.endSeconds = selected.end;
    lastLoop = performance.now();
    try {
      if (paused) player.cueVideoById(selection);
      else player.loadVideoById(selection);
      say(paused ? 'Paused with your journey.' : 'Press play in the video if playback does not begin.');
    } catch {
      report('YouTube playback is unavailable. You can open this track on YouTube.');
    }
  }

  function clearPlayer() {
    clearInterval(loopTimer);
    clearTimeout(readyTimer);
    loopTimer = null;
    readyTimer = null;
    ready = false;
    if (player) {
      try { player.destroy(); } catch { /* A partially loaded player may already be gone. */ }
      player = null;
    }
    mount?.replaceChildren();
  }

  function loopIfNeeded() {
    if (!enabled || paused || !ready || !player) return;
    const selected = track();
    try {
      if (player.getPlayerState() !== 1 || !selected.end) return;
      const time = player.getCurrentTime();
      if (time >= selected.end - 0.12 && performance.now() - lastLoop > 1500) playSelection();
    } catch { /* API calls may briefly be unavailable during a realm change. */ }
  }

  return {
    async enable(nextRealm = realm) {
      if (!panel || !mount || !title || !source || !status) {
        onError('The soundtrack player is unavailable on this page.');
        return false;
      }
      if (enabled && ready && player) {
        this.setRealm(nextRealm);
        panel.hidden = false;
        return true;
      }
      cancelEnable?.();
      clearPlayer();
      enabled = true;
      realm = TRACKS[nextRealm] ? nextRealm : 'equestria';
      const token = ++generation;
      panel.hidden = false;
      label();
      say('Loading YouTube. Playback may need a tap on the video.');
      const cancelled = Symbol('cancelled');
      const cancellation = new Promise(resolve => { cancelEnable = () => resolve(cancelled); });
      let api;
      try {
        api = await Promise.race([loadYoutubeAPI(), cancellation]);
      } catch (error) {
        if (current(token)) report(error.message);
        return false;
      }
      if (api === cancelled || !current(token)) return false;

      const result = new Promise(resolve => {
        let resolved = false;
        const finish = value => {
          if (resolved) return;
          resolved = true;
          clearTimeout(readyTimer);
          if (current(token)) cancelEnable = null;
          resolve(value);
        };
        cancelEnable = () => finish(false);
        const child = document.createElement('div');
        mount.append(child);
        const selected = track();
        readyTimer = setTimeout(() => {
          if (current(token)) report('The video has not become ready. Use the Watch on YouTube link or try again.');
          finish(false);
        }, 20000);
        try {
          player = new api.Player(child, {
            width: '100%', height: '200',
            host: 'https://www.youtube-nocookie.com',
            videoId: selected.videoId,
            playerVars: {
              origin: location.origin, playsinline: 1, controls: 1, rel: 0,
              autoplay: 0, start: selected.start,
              ...(selected.end ? { end: selected.end } : {}),
            },
            events: {
              onReady(event) {
                if (!current(token)) { try { event.target.destroy(); } catch {} finish(false); return; }
                player = event.target;
                ready = true;
                const iframe = player.getIframe();
                iframe.style.minWidth = '200px';
                iframe.style.minHeight = '200px';
                iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
                label();
                // Loading after the click can exhaust a browser's gesture window.
                // The visible native play button always remains available.
                playSelection();
                loopTimer = setInterval(loopIfNeeded, 400);
                finish(true);
              },
              onStateChange(event) {
                if (!current(token) || !ready) return;
                if (event.data === 1) {
                  if (paused) { player.pauseVideo(); return; }
                  say('Playing from YouTube. The soundtrack follows your realm.');
                } else if (event.data === 0 && !paused) {
                  playSelection();
                } else if (event.data === 2) {
                  say(paused ? 'Paused with your journey.' : 'Video paused. Press play in the video to resume.');
                }
              },
              onAutoplayBlocked() {
                if (current(token)) say('Your browser requires a tap: press play in the video.');
              },
              onError(event) {
                if (!current(token)) { finish(false); return; }
                const restricted = event.data === 101 || event.data === 150;
                report(restricted
                  ? 'This video cannot play in an embedded player. Use the Watch on YouTube link.'
                  : 'YouTube could not play this video here. Use the Watch on YouTube link or choose Ambient.');
                finish(false);
              },
            },
          });
        } catch {
          if (current(token)) report('The YouTube player could not start. Use the Watch on YouTube link.');
          finish(false);
        }
      });
      return result;
    },
    disable() {
      enabled = false;
      generation++;
      cancelEnable?.();
      cancelEnable = null;
      clearPlayer();
      if (panel) panel.hidden = true;
      say('YouTube soundtrack is off.');
    },
    setRealm(nextRealm) {
      const next = TRACKS[nextRealm] ? nextRealm : 'equestria';
      if (realm === next) return;
      realm = next;
      label();
      if (enabled && ready) playSelection();
    },
    setPaused(value) {
      const changed = paused !== Boolean(value);
      paused = Boolean(value);
      if (!changed || !enabled || !ready || !player) return;
      try {
        if (paused) { player.pauseVideo(); say('Paused with your journey.'); }
        else { player.playVideo(); say('Press play in the video if playback does not resume.'); }
      } catch {
        report('YouTube playback is unavailable. You can open this track on YouTube.');
      }
    },
  };
}
