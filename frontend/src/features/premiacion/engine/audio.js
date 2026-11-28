// Efectos de sonido de la premiación, sintetizados con Web Audio.
// Portado del proyecto de la cinemática; se mantiene en JS (tipos en audio.d.ts).
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const chords = {
    3: [130.81, 164.81, 196.00, 261.63],
    2: [146.83, 185.00, 220.00, 293.66],
    1: [164.81, 207.65, 246.94, 329.63],
  };

  export function createCeremonyAudio({ openingMusic, audioContext } = {}) {
    let context;
    let master;
    let noiseBuffer;
    let enabled = false;
    let paused = false;
    let enableRequest = 0;
    let openingBuffer;
    let openingReady;
    let openingVoice;
    const voices = new Set();

    function initialize() {
      context = audioContext || new AudioContextClass();
      master = context.createGain();
      master.gain.value = 0.54;

      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.knee.value = 14;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.012;
      compressor.release.value = 0.32;
      master.connect(compressor);
      compressor.connect(context.destination);

      noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const samples = noiseBuffer.getChannelData(0);
      for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
    }

    function release(voice) {
      if (!voices.delete(voice)) return;
      voice.source.disconnect();
      voice.filter?.disconnect();
      voice.panner?.disconnect();
      voice.envelope.disconnect();
    }

    function discard(voice, time) {
      voice.source.stop(time);
      release(voice);
    }

    function stop() {
      if (!context) return;
      const time = context.currentTime;
      for (const voice of voices) {
        if (paused || context.state !== "running") {
          discard(voice, time);
          continue;
        }
        if (voice.stopping) continue;

        voice.stopping = true;
        const { gain } = voice.envelope;
        if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(time);
        else gain.cancelScheduledValues(time);
        gain.setTargetAtTime(0, time, 0.007);
        voice.source.stop(time + 0.034);
      }
    }

    async function setEnabled(requested) {
      const token = ++enableRequest;
      enabled = Boolean(requested && AudioContextClass);
      if (!enabled) {
        stop();
        return false;
      }

      try {
        if (!context) initialize();
        if (openingMusic && !openingReady) {
          openingReady = fetch(openingMusic)
            .then(response => response.arrayBuffer())
            .then(bytes => context.decodeAudioData(bytes))
            .then(buffer => { openingBuffer = buffer; })
            .catch(() => {});
        }
        if (paused) await context.suspend();
        else await context.resume();
        await openingReady;
      } catch {
        if (token === enableRequest) {
          enabled = false;
          stop();
        }
      }
      return enabled;
    }

    async function setPaused(requested) {
      const next = Boolean(requested);
      if (paused === next) return paused;
      paused = next;
      if (!context) return paused;

      try {
        if (paused) {
          const time = context.currentTime;
          for (const voice of voices) {
            if (voice.stopping) discard(voice, time);
          }
          await context.suspend();
        } else if (enabled) {
          await context.resume();
        }
      } catch {
        stop();
      }
      return paused;
    }

    function voice(source, start, duration, peak, { attack, filter, sustain, pan, offset, releaseTime }) {
      const envelope = context.createGain();
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(peak, start + attack);
      if (releaseTime) {
        envelope.gain.setValueAtTime(peak, start + Math.max(attack, duration - releaseTime));
      } else if (sustain) {
        const middle = start + attack + (duration - attack) * 0.48;
        envelope.gain.exponentialRampToValueAtTime(peak * sustain, middle);
      }
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      if (filter) {
        source.connect(filter);
        filter.connect(envelope);
      } else {
        source.connect(envelope);
      }
      const panner = pan && context.createStereoPanner?.();
      if (panner) {
        panner.pan.value = pan;
        envelope.connect(panner);
        panner.connect(master);
      } else {
        envelope.connect(master);
      }

      const active = { source, envelope, filter, panner: panner || null, stopping: false };
      voices.add(active);
      source.addEventListener("ended", () => release(active), { once: true });
      if (offset == null) source.start(start);
      else source.start(start, offset);
      source.stop(start + duration + 0.012);
      return active;
    }

    function playOpening(start, offset = 0) {
      if (!openingBuffer || (voices.has(openingVoice) && !openingVoice.stopping)) return;
      const remaining = openingBuffer.duration - offset;
      if (remaining <= 0.04) return;
      const source = context.createBufferSource();
      source.buffer = openingBuffer;
      openingVoice = voice(source, start, remaining, 1, { attack: 0.02, releaseTime: 0.04, offset });
    }

    function tone(start, frequency, duration, peak, {
      attack = 0.035, type = "sine", endsAt = frequency, sustain = 0, pan = 0,
    } = {}) {
      const oscillator = context.createOscillator();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      if (endsAt !== frequency) oscillator.frequency.exponentialRampToValueAtTime(endsAt, start + duration);
      voice(oscillator, start, duration, peak, { attack, sustain, pan });
    }

    function texture(start, frequency, duration, peak, attack, pan = 0) {
      const source = context.createBufferSource();
      source.buffer = noiseBuffer;

      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = frequency;
      filter.Q.value = 0.7;
      voice(source, start, duration, peak, { attack, filter, pan });
    }

    function pulse(start, pitch, emphasis) {
      tone(start, pitch * 1.42, 0.37, 0.20 * emphasis, { attack: 0.017, endsAt: pitch });
      tone(start + 0.012, pitch * 2, 0.19, 0.047 * emphasis, { type: "triangle" });
      texture(start, 230, 0.28, 0.057 * emphasis, 0.018);
    }

    function pluckedString(start, pitch, strength, pan = 0) {
      tone(start, pitch, 0.45, strength, { attack: 0.014, sustain: 0.37, pan });
      tone(start + 0.002, pitch * 2, 0.30, strength * 0.48,
        { attack: 0.011, sustain: 0.29, pan });
      tone(start + 0.004, pitch * 3, 0.20, strength * 0.23, { attack: 0.009, pan });
      tone(start + 0.006, pitch * 4.02, 0.12, strength * 0.075, { attack: 0.008, pan });
      texture(start, 840, 0.068, strength * 0.25, 0.007, pan);
    }

    function countdown(start, number) {
      const pitch = { 3: 196, 2: 220, 1: 261.63 }[number];
      if (!pitch) return;
      pluckedString(start, pitch, 0.146);
      tone(start + 0.018, pitch * 0.5, 0.30, 0.058, { attack: 0.025, sustain: 0.41 });
      if (number === 1) {
        pluckedString(start + 0.084, 329.63, 0.056, -0.18);
        pluckedString(start + 0.152, 392, 0.041, 0.18);
      }
    }

    function mallet(start, pitch, duration, strength, pan = 0) {
      tone(start, pitch, duration, strength, { attack: 0.011, pan });
      tone(start + 0.004, pitch * 2.01, duration * 0.64, strength * 0.32, { attack: 0.008, pan });
      tone(start + 0.007, pitch * 3.97, duration * 0.4, strength * 0.12, { attack: 0.006, pan });
    }

    function award(start, rank) {
      const chord = chords[rank];
      if (!chord) return;
      const isGold = rank === 1;
      const duration = { 3: 1.08, 2: 1.32, 1: 1.76 }[rank];
      tone(start, chord[0] * 0.6, 0.4, 0.14, { attack: 0.023, endsAt: chord[0] * 0.5 });
      texture(start, 1030, 0.38, 0.081, 0.052);
      chord.forEach((note, index) => {
        const onset = start + index * 0.041;
        const pan = index % 2 === 0 ? -0.32 : 0.32;
        tone(onset, note, duration, 0.072, { attack: 0.105, sustain: 0.56, pan });
        tone(onset + 0.016, note * 2, duration * 0.74, 0.020,
          { attack: 0.14, sustain: 0.44, type: "triangle", pan });
      });
      mallet(start + 0.11, chord.at(-1), 0.62, isGold ? 0.102 : 0.076);
      if (isGold) mallet(start + 0.31, chord[2] * 2, 0.82, 0.068, 0.24);
    }

    function suspense(start, rank) {
      if (rank === 1) {
        pulse(start, 43, 0.59);
        pulse(start + 0.48, 47, 0.64);
        pulse(start + 0.95, 51, 0.70);
        tone(start + 0.035, 57.5, 1.47, 0.132, { attack: 1.02, endsAt: 91 });
        tone(start + 0.08, 85, 1.40, 0.047, { attack: 1.04, endsAt: 142, type: "triangle" });
        texture(start + 0.55, 414, 0.95, 0.085, 0.6);
      } else {
        pulse(start, 44, 0.56);
        pulse(start + 0.52, 47, 0.62);
        tone(start + 0.08, 80, 1.17, 0.068, { attack: 0.29, endsAt: 106 });
      }
    }

    function score(start, rank, settled) {
      const chord = chords[rank];
      if (!chord) return;
      if (settled) {
        mallet(start, chord.at(-1) * 2, 0.55, 0.078, 0.08);
        mallet(start + 0.063, chord[2] * 3, 0.44, 0.032, -0.14);
      } else {
        mallet(start, chord[1] * 2, 0.25, 0.043, -0.10);
        mallet(start + 0.135, chord[2] * 2, 0.32, 0.049, 0.10);
        mallet(start + 0.28, chord.at(-1) * 2, 0.36, 0.038);
      }
    }

    function finale(start) {
      tone(start, 91, 0.63, 0.17, { attack: 0.036, endsAt: 61 });
      texture(start + 0.23, 690, 0.70, 0.101, 0.17, -0.49);
      texture(start + 0.38, 1860, 0.83, 0.136, 0.23, 0.49);
      texture(start + 0.56, 3980, 0.63, 0.065, 0.09, -0.30);

      const chord = chords[1];
      chord.forEach((note, index) => {
        const onset = start + 0.15 + index * 0.078;
        const pan = index % 2 === 0 ? -0.40 : 0.40;
        tone(onset, note, 2.42 - index * 0.08, 0.078,
          { attack: 0.18, sustain: 0.66, pan });
        tone(onset + 0.025, note * 2, 1.65, 0.027,
          { type: "triangle", attack: 0.2, sustain: 0.56, pan });
      });
      mallet(start + 0.54, chord[2] * 2, 0.72, 0.064, -0.23);
      mallet(start + 0.69, chord.at(-1) * 2, 0.89, 0.084, 0.23);
      mallet(start + 0.86, chord.at(-1) * 3, 0.79, 0.038);
    }

    function cue(name, value) {
      if (name === "opening-film-end") {
        if (voices.has(openingVoice)) stop();
        return;
      }
      if (!enabled || paused || context?.state !== "running") return;
      const start = context.currentTime + 0.016;

      switch (name) {
        case "opening-film":
          playOpening(start, value);
          break;
        case "opening":
          tone(start, 146.83, 2.34, 0.044, { attack: 0.28 });
          tone(start + 0.24, 220, 2.2, 0.035, { attack: 0.34 });
          tone(start + 0.48, 293.66, 1.96, 0.033, { attack: 0.23 });
          tone(start + 0.74, 369.99, 1.68, 0.031, { attack: 0.17 });
          tone(start + 0.99, 440, 1.42, 0.025, { attack: 0.12 });
          break;
        case "count":
          countdown(start, value);
          break;
        case "suspense":
          suspense(start, value);
          break;
        case "reveal":
          award(start, value);
          break;
        case "score-start":
          score(start, value, false);
          break;
        case "score":
          score(start, value, true);
          break;
        case "finale":
          finale(start);
          break;
      }
    }

    function destroy() {
      enabled = false;
      stop();
      context?.close().catch(() => {});
    }

    return { setEnabled, setPaused, cue, stop, destroy };
}
