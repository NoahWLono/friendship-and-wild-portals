/** Small, original Web Audio soundscape. Nothing is downloaded or played until enabled. */
export function createAmbientAudio({ onError = () => {} } = {}) {
  let context, master, wind, filter, timer;
  let voices = [];
  let world = null;
  let enabled = false;
  let paused = false;
  let disposed = false;
  let randomState = 1;
  let requestVersion = 0;

  const random = () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 4294967296;
  };
  const pitches = () => {
    const root = world?.realm === 'equestria' ? 174.614 : world?.realm === 'wild' ? 146.832 : 130.813;
    const shift = [1, 1.122462, 1.33484][(world?.seed ?? 0) % 3];
    const minor = world?.biome === 'depths' || world?.timeOfDay === 'night';
    return [1, minor ? 1.189207 : 1.259921, 1.498307, 2].map(ratio => root * shift * ratio);
  };

  function chord() {
    if (!context || disposed) return;
    const now = context.currentTime;
    pitches().forEach((frequency, index) => {
      voices[index].oscillator.frequency.setTargetAtTime(frequency, now, 1.2);
    });
    filter.frequency.setTargetAtTime(world?.weather === 'rain' ? 1500 : 600, now, 1);
  }

  function bell() {
    if (!enabled || paused || disposed || !context || context.state !== 'running') return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = pitches()[Math.floor(random() * 4)] * 2;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.065, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);
    oscillator.connect(gain).connect(master);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(now);
    oscillator.stop(now + 3.6);
  }

  function initialize() {
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) throw new Error('This browser does not support ambient audio.');
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);
    voices = Array.from({ length: 4 }, (_, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index === 0 ? 'triangle' : 'sine';
      gain.gain.value = [0.15, 0.075, 0.065, 0.025][index];
      oscillator.connect(gain).connect(master);
      oscillator.start();
      return { oscillator, gain };
    });
    const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = (random() * 2 - 1) * 0.11;
    wind = context.createBufferSource();
    wind.buffer = buffer;
    wind.loop = true;
    filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.5;
    wind.connect(filter).connect(master);
    wind.start();
    timer = setInterval(bell, 4300);
    chord();
  }

  function volume() {
    if (!context || disposed) return;
    master.gain.setTargetAtTime(enabled && !paused ? 0.20 : 0, context.currentTime, 0.25);
  }

  return {
    async setEnabled(value) {
      if (disposed) return false;
      const request = ++requestVersion;
      enabled = Boolean(value);
      try {
        if (enabled && !context) initialize();
        if (enabled && context?.state === 'suspended') await context.resume();
        if (disposed || request !== requestVersion) return !disposed && enabled;
        volume();
        return enabled;
      } catch (error) {
        if (disposed || request !== requestVersion) return !disposed && enabled;
        enabled = false;
        volume();
        onError(error);
        return false;
      }
    },
    setWorld(value) {
      world = value;
      randomState = world?.seed || 1;
      chord();
    },
    setPaused(value) { paused = Boolean(value); volume(); },
    dispose() {
      if (disposed) return;
      disposed = true;
      requestVersion++;
      enabled = false;
      clearInterval(timer);
      voices.forEach(({ oscillator, gain }) => { oscillator.stop(); oscillator.disconnect(); gain.disconnect(); });
      wind?.stop();
      wind?.disconnect();
      filter?.disconnect();
      master?.disconnect();
      context?.close().catch(() => {});
    },
  };
}
