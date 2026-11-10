import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = (await readFile(new URL('../src/music.js', import.meta.url), 'utf8'))
  .replace('export function createYoutubeSoundtrack', 'function createYoutubeSoundtrack');
const flush = () => new Promise(resolve => setImmediate(resolve));

function fixture({ apiAvailable = true } = {}) {
  const nodes = new Map();
  const scripts = [];
  const players = [];
  const errors = [];
  const timers = new Map();
  let timerId = 0;
  const element = tag => ({
    tagName: tag, hidden: true, textContent: '', children: [], style: {}, dataset: {}, listeners: new Map(),
    append(child) { this.children.push(child); },
    replaceChildren(...children) { this.children = children; },
    setAttribute(key, value) { this[key] = value; },
    addEventListener(type, listener) { this.listeners.set(type, listener); },
    removeEventListener(type) { this.listeners.delete(type); },
    remove() { this.removed = true; },
  });
  for (const id of ['music-player', 'youtube-mount', 'music-title', 'music-source', 'music-status']) nodes.set(`#${id}`, element('div'));
  const api = {
    Player: function (_mount, options) {
      const iframe = element('iframe');
      const player = {
        options, iframe, calls: [], destroyed: false, state: 1, currentTime: 0,
        getIframe() { return iframe; },
        loadVideoById(selection) { this.calls.push(['load', selection]); },
        cueVideoById(selection) { this.calls.push(['cue', selection]); },
        playVideo() { this.calls.push(['play']); },
        pauseVideo() { this.calls.push(['pause']); },
        getPlayerState() { return this.state; },
        getCurrentTime() { return this.currentTime; },
        destroy() { this.destroyed = true; this.calls.push(['destroy']); },
      };
      players.push(player);
      return player;
    },
  };
  const context = vm.createContext({
    location: { origin: 'https://example.test' },
    performance: { now: () => 10000 },
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, delay, interval: false }); return id; },
    clearTimeout(id) { timers.delete(id); },
    setInterval(fn, delay) { const id = ++timerId; timers.set(id, { fn, delay, interval: true }); return id; },
    clearInterval(id) { timers.delete(id); },
    document: {
      querySelector(selector) { return nodes.get(selector) || (selector.startsWith('script[') ? scripts.find(script => !script.removed) : null); },
      createElement: element,
      head: { append(script) { scripts.push(script); } },
    },
    ...(apiAvailable ? { YT: api } : {}),
  });
  vm.runInContext(source, context, { filename: 'music.js' });
  const soundtrack = context.createYoutubeSoundtrack({ onError: message => errors.push(message) });
  return { context, soundtrack, nodes, scripts, players, errors, timers, api };
}

test('YouTube is opt-in and the visible player selects the correct realm excerpt', async () => {
  const f = fixture();
  assert.equal(f.scripts.length, 0);
  assert.equal(f.players.length, 0);
  const pending = f.soundtrack.enable('wild');
  await flush();
  const player = f.players[0];
  assert.equal(player.options.host, 'https://www.youtube-nocookie.com');
  assert.equal(player.options.playerVars.origin, 'https://example.test');
  assert.equal(player.options.playerVars.controls, 1);
  f.soundtrack.setPaused(true);
  player.options.events.onReady({ target: player });
  assert.equal(await pending, true);
  assert.equal(player.calls[0][0], 'cue');
  assert.equal(player.calls[0][1].startSeconds, 807);
  assert.equal(player.calls[0][1].endSeconds, 933);
  assert.equal(f.nodes.get('#music-player').hidden, false);
  assert.match(player.iframe.title, /BOTW/);
  f.soundtrack.setPaused(false);
  assert.equal(player.calls.at(-1)[0], 'play');
  f.soundtrack.setRealm('kingdom');
  assert.equal(player.calls.at(-1)[0], 'load');
  assert.equal(player.calls.at(-1)[1].startSeconds, 63);
  assert.equal(player.calls.at(-1)[1].endSeconds, 237);
  assert.match(f.nodes.get('#music-title').textContent, /TOTK/);
  f.soundtrack.disable();
  assert.equal(f.nodes.get('#music-player').hidden, true);
  assert.ok(player.destroyed);
  assert.equal(f.timers.size, 0);
});

test('disabling while a player is loading settles enable and prevents late autoplay', async () => {
  const f = fixture();
  const pending = f.soundtrack.enable('equestria');
  await flush();
  const stale = f.players[0];
  f.soundtrack.disable();
  assert.equal(await pending, false);
  stale.options.events.onReady({ target: stale });
  assert.ok(stale.destroyed);
  assert.equal(stale.calls.filter(([name]) => name === 'load' || name === 'play').length, 0);
  const retry = f.soundtrack.enable('wild');
  await flush();
  const current = f.players[1];
  current.options.events.onReady({ target: current });
  assert.equal(await retry, true);
  assert.equal(current.calls[0][1].startSeconds, 807);
  f.soundtrack.disable();
});

test('API loading can be cancelled, and a failed script can be retried', async () => {
  const f = fixture({ apiAvailable: false });
  assert.equal(f.scripts.length, 0);
  const first = f.soundtrack.enable('equestria');
  assert.equal(f.scripts.length, 1);
  assert.equal(f.scripts[0].src, 'https://www.youtube.com/iframe_api');
  f.scripts[0].listeners.get('error')();
  assert.equal(await first, false);
  assert.equal(f.errors.length, 1);
  assert.match(f.nodes.get('#music-status').textContent, /could not load/);
  assert.match(f.nodes.get('#music-source').href, /youtube\.com\/watch/);
  const retry = f.soundtrack.enable('wild');
  assert.equal(f.scripts.length, 2);
  f.soundtrack.disable();
  assert.equal(await retry, false);
  f.context.YT = f.api;
  f.context.onYouTubeIframeAPIReady();
  await flush();
  assert.equal(f.players.length, 0, 'late API loading must not recreate a disabled player');
  assert.equal(f.timers.size, 0);
});

test('blocked embedding, readiness timeout and autoplay blocking have explicit feedback', async () => {
  const blocked = fixture();
  const pending = blocked.soundtrack.enable('equestria');
  await flush();
  blocked.players[0].options.events.onError({ data: 150 });
  assert.equal(await pending, false);
  assert.match(blocked.errors[0], /cannot play in an embedded player/);
  blocked.soundtrack.disable();

  const slow = fixture();
  const timeout = slow.soundtrack.enable('wild');
  await flush();
  const readinessTimer = [...slow.timers.values()].find(timer => timer.delay === 20000);
  readinessTimer.fn();
  assert.equal(await timeout, false);
  assert.match(slow.errors[0], /has not become ready/);
  slow.soundtrack.disable();

  const gesture = fixture();
  const ready = gesture.soundtrack.enable('kingdom');
  await flush();
  gesture.players[0].options.events.onReady({ target: gesture.players[0] });
  assert.equal(await ready, true);
  gesture.players[0].options.events.onAutoplayBlocked();
  assert.match(gesture.nodes.get('#music-status').textContent, /press play in the video/);
  gesture.soundtrack.disable();
});
