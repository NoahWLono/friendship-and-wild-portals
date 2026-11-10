import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const start = main.indexOf('async function setMusic(mode) {');
const end = main.indexOf("$('sound').addEventListener", start);
assert.ok(start >= 0 && end > start, 'the soundtrack mode controller must exist');
const controller = main.slice(start, end);
const flush = () => new Promise(resolve => setImmediate(resolve));

function fixture({ sound = async enabled => enabled, youtube = async () => true } = {}) {
  const select = { value: 'off' };
  const calls = [];
  const context = vm.createContext({
    musicRequest: 0, musicMode: 'off', currentWorld: { realm: 'wild' }, state: { paused: false, sound: false },
    $: () => select,
    journey: { setSound: sound },
    soundtrack: {
      disable() { calls.push('disable'); },
      enable: youtube,
      setPaused(value) { calls.push(['paused', value]); },
    },
    setState(state) { calls.push(['state', state]); },
  });
  vm.runInContext(controller, context);
  return { context, select, calls, setMusic: context.setMusic };
}

test('a failed ambient start restores Off so the sound button can retry', async () => {
  const f = fixture({ sound: async () => false });
  await f.setMusic('ambient');
  assert.equal(f.context.musicMode, 'off');
  assert.equal(f.select.value, 'off');
});

test('a failed YouTube start disables its pending player before showing Off', async () => {
  const f = fixture({ youtube: async () => false });
  await f.setMusic('youtube');
  assert.equal(f.context.musicMode, 'off');
  assert.equal(f.select.value, 'off');
  assert.ok(f.calls.includes('disable'), 'late player readiness must not start playback after the UI reports Off');
});

test('a superseded soundtrack request cannot overwrite the newer selection', async () => {
  let completeYoutube;
  const f = fixture({ youtube: () => new Promise(resolve => { completeYoutube = resolve; }) });
  const first = f.setMusic('youtube');
  await flush();
  await f.setMusic('off');
  completeYoutube(true);
  await first;
  assert.equal(f.context.musicMode, 'off');
  assert.equal(f.select.value, 'off');
  assert.equal(f.calls.filter(call => Array.isArray(call) && call[0] === 'paused').length, 0);
  assert.ok(f.calls.includes('disable'));
});
