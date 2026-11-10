import test from 'node:test';
import assert from 'node:assert/strict';
import { createAmbientAudio } from '../src/audio.js';

function fakeContext() {
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
  const node = () => ({ frequency: param(), gain: param(), Q: param(), connect(next) { return next; }, disconnect() {}, start() {}, stop() {} });
  const pending = [];
  let instance;
  class AudioContext {
    constructor() { instance = this; this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 2; this.destination = {}; this.closed = 0; }
    createGain() { return node(); }
    createOscillator() { return node(); }
    createBiquadFilter() { return node(); }
    createBufferSource() { return node(); }
    createBuffer() { return { getChannelData: () => new Float32Array(6) }; }
    resume() { return new Promise((resolve, reject) => pending.push({ resolve, reject })); }
    close() { this.state = 'closed'; this.closed++; return Promise.resolve(); }
  }
  return { AudioContext, pending, instance: () => instance };
}

test('disabling audio wins over an earlier resume rejection', async () => {
  const fake = fakeContext();
  const errors = [];
  const previous = globalThis.AudioContext;
  globalThis.AudioContext = fake.AudioContext;
  const audio = createAmbientAudio({ onError: error => errors.push(error) });
  try {
    const enabling = audio.setEnabled(true);
    assert.equal(fake.pending.length, 1);
    assert.equal(await audio.setEnabled(false), false);
    fake.pending[0].reject(new Error('Late rejected gesture'));
    assert.equal(await enabling, false);
    assert.deepEqual(errors, []);
  } finally {
    audio.dispose();
    globalThis.AudioContext = previous;
  }
});

test('a stale resume failure does not disable a newer successful request', async () => {
  const fake = fakeContext();
  const errors = [];
  const previous = globalThis.AudioContext;
  globalThis.AudioContext = fake.AudioContext;
  const audio = createAmbientAudio({ onError: error => errors.push(error) });
  try {
    const oldEnable = audio.setEnabled(true);
    await audio.setEnabled(false);
    const newEnable = audio.setEnabled(true);
    fake.pending[1].resolve();
    assert.equal(await newEnable, true);
    fake.pending[0].reject(new Error('Obsolete rejection'));
    assert.equal(await oldEnable, true);
    assert.deepEqual(errors, []);
  } finally {
    audio.dispose();
    globalThis.AudioContext = previous;
  }
});

test('disposing during resume prevents later activation and disposal is idempotent', async () => {
  const fake = fakeContext();
  const errors = [];
  const previous = globalThis.AudioContext;
  globalThis.AudioContext = fake.AudioContext;
  const audio = createAmbientAudio({ onError: error => errors.push(error) });
  try {
    const enabling = audio.setEnabled(true);
    audio.dispose();
    audio.dispose();
    fake.pending[0].resolve();
    assert.equal(await enabling, false);
    assert.equal(await audio.setEnabled(true), false);
    assert.equal(fake.instance().closed, 1);
    audio.setWorld({ seed: 1, realm: 'wild' });
    audio.setPaused(false);
    assert.deepEqual(errors, []);
  } finally {
    audio.dispose();
    globalThis.AudioContext = previous;
  }
});
