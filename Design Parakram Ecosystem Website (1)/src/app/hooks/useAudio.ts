import { useRef, useCallback, useEffect } from "react";

let sharedCtx: AudioContext | null = null;

function ctx(): AudioContext {
  if (!sharedCtx) sharedCtx = new AudioContext();
  return sharedCtx;
}

function resume() {
  const c = ctx();
  if (c.state === "suspended") c.resume();
}

/* ---------- SFX generators ---------- */

function playJump() {
  resume();
  const c = ctx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(300, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(700, c.currentTime + 0.08);
  o.frequency.exponentialRampToValueAtTime(500, c.currentTime + 0.15);
  g.gain.setValueAtTime(0.15, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime);
  o.stop(c.currentTime + 0.15);
}

function playCoin() {
  resume();
  const c = ctx();
  [523, 659].forEach((freq, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.12, c.currentTime + i * 0.07);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.07 + 0.2);
    o.connect(g).connect(c.destination);
    o.start(c.currentTime + i * 0.07);
    o.stop(c.currentTime + i * 0.07 + 0.2);
  });
}

function playStomp() {
  resume();
  const c = ctx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "square";
  o.frequency.setValueAtTime(120, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.1);
  g.gain.setValueAtTime(0.2, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime);
  o.stop(c.currentTime + 0.12);
}

function playDeath() {
  resume();
  const c = ctx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(400, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(50, c.currentTime + 0.6);
  g.gain.setValueAtTime(0.15, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime);
  o.stop(c.currentTime + 0.6);
}

function playPowerup() {
  resume();
  const c = ctx();
  [400, 500, 600, 800].forEach((freq, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.1, c.currentTime + i * 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.06 + 0.15);
    o.connect(g).connect(c.destination);
    o.start(c.currentTime + i * 0.06);
    o.stop(c.currentTime + i * 0.06 + 0.15);
  });
}

function playClick() {
  resume();
  const c = ctx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.value = 800;
  g.gain.setValueAtTime(0.06, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.04);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime);
  o.stop(c.currentTime + 0.04);
}

/* ---------- BGM: Procedural Warrior Theme ---------- */

type BgmNode = { stop: () => void; setVolume: (v: number) => void };
let bgmInstance: BgmNode | null = null;

function startBgm(volume: number): BgmNode {
  resume();
  const c = ctx();
  const master = c.createGain();
  master.gain.value = volume;
  master.connect(c.destination);

  const nodes: AudioNode[] = [master];

  /* Drone — deep low C and G */
  const droneNodes: OscillatorNode[] = [];
  [65.4, 98, 130.8].forEach((freq) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sawtooth";
    o.frequency.value = freq;
    const lfo = c.createOscillator();
    const lfoG = c.createGain();
    lfo.frequency.value = 0.3 + Math.random() * 0.2;
    lfoG.gain.value = 1.5;
    lfo.connect(lfoG).connect(o.frequency);
    lfo.start();
    g.gain.value = 0.03;
    o.connect(g).connect(master);
    o.start();
    droneNodes.push(o, lfo);
    nodes.push(o, g, lfo, lfoG);
  });

  /* Percussion — low war drum pulse */
  let drumTimer: ReturnType<typeof setInterval>;
  function scheduleDrum() {
    const beatInterval = 1.2;
    let beatTime = c.currentTime + 0.2;
    function playBeat() {
      const now = c.currentTime;
      if (beatTime < now) beatTime = now + 0.05;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(80, beatTime);
      osc.frequency.exponentialRampToValueAtTime(40, beatTime + 0.08);
      gain.gain.setValueAtTime(0.12, beatTime);
      gain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.1);
      osc.connect(gain).connect(master);
      osc.start(beatTime);
      osc.stop(beatTime + 0.1);

      /* lighter accent on off-beat */
      const offTime = beatTime + beatInterval / 2;
      const osc2 = c.createOscillator();
      const gain2 = c.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(100, offTime);
      osc2.frequency.exponentialRampToValueAtTime(60, offTime + 0.05);
      gain2.gain.setValueAtTime(0.06, offTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, offTime + 0.06);
      osc2.connect(gain2).connect(master);
      osc2.start(offTime);
      osc2.stop(offTime + 0.06);

      beatTime += beatInterval;
    }
    playBeat();
    drumTimer = setInterval(playBeat, beatInterval * 1000);
  }
  scheduleDrum();

  /* Melody — slow pentatonic war-horn */
  const pentatonic = [130.8, 146.8, 174.6, 196, 220, 261.6];
  let melodyInterval: ReturnType<typeof setInterval>;
  function scheduleMelody() {
    const noteDuration = 1.8;
    let noteIdx = 0;
    function playNote() {
      const now = c.currentTime;
      const freq = pentatonic[noteIdx % pentatonic.length];
      noteIdx++;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.04, now);
      g.gain.linearRampToValueAtTime(0.04, now + noteDuration * 0.7);
      g.gain.exponentialRampToValueAtTime(0.001, now + noteDuration);
      o.connect(g).connect(master);
      o.start(now);
      o.stop(now + noteDuration);
    }
    playNote();
    melodyInterval = setInterval(playNote, noteDuration * 1000);
  }
  scheduleMelody();

  /* Ambient pad — filtered noise */
  const bufSize = c.sampleRate * 2;
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = c.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 200;
  filter.Q.value = 0.5;
  const padGain = c.createGain();
  padGain.gain.value = 0.02;
  noise.connect(filter).connect(padGain).connect(master);
  noise.start();
  nodes.push(noise, filter, padGain);

  return {
    stop() {
      clearInterval(drumTimer);
      clearInterval(melodyInterval);
      droneNodes.forEach((n) => { try { n.stop(); } catch {} });
      try { noise.stop(); } catch {}
    },
    setVolume(v: number) {
      master.gain.linearRampToValueAtTime(v, c.currentTime + 0.3);
    },
  };
}

/* ---------- Hook ---------- */

export function useAudio() {
  const started = useRef(false);

  const click = useCallback(() => playClick(), []);

  const gameSfx = useCallback(() => ({
    jump: playJump,
    coin: playCoin,
    stomp: playStomp,
    death: playDeath,
    powerup: playPowerup,
  }), []);

  useEffect(() => {
    const h = () => {
      if (started.current) return;
      started.current = true;
      bgmInstance = startBgm(0.06);
    };
    window.addEventListener("click", h, { once: true });
    window.addEventListener("keydown", h, { once: true });
    window.addEventListener("touchstart", h, { once: true });
    return () => {
      window.removeEventListener("click", h);
      window.removeEventListener("keydown", h);
      window.removeEventListener("touchstart", h);
      if (bgmInstance) bgmInstance.stop();
    };
  }, []);

  return { click, gameSfx };
}

export function playButtonClick() { playClick(); }
export function playJumpSfx() { playJump(); }
export function playCoinSfx() { playCoin(); }
export function playStompSfx() { playStomp(); }
export function playDeathSfx() { playDeath(); }
