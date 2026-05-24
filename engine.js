/**
 * MIDI Gen - Audio Engine
 * Manages Tone.js synths, transport, layers, sections, arrangement, and Markov generation.
 */

const INSTRUMENT_PRESETS = {
  // Synths
  "synth": { type: "Synth", options: { oscillator: { type: "triangle" }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 } } },
  "fat-synth": { type: "Synth", options: { oscillator: { type: "fatsawtooth", count: 3, spread: 30 }, envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.4 } } },
  "square-synth": { type: "Synth", options: { oscillator: { type: "square" }, envelope: { attack: 0.01, decay: 0.15, sustain: 0.6, release: 0.2 } } },
  "sine-pad": { type: "Synth", options: { oscillator: { type: "sine" }, envelope: { attack: 0.5, decay: 0.5, sustain: 0.8, release: 1.0 } } },

  // FM Synths
  "fm-bass": { type: "FMSynth", options: { harmonicity: 1, modulationIndex: 3, envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.2 }, modulation: { type: "square" } } },
  "fm-bell": { type: "FMSynth", options: { harmonicity: 5.1, modulationIndex: 10, envelope: { attack: 0.001, decay: 1.5, sustain: 0, release: 0.5 } } },
  "fm-pluck": { type: "FMSynth", options: { harmonicity: 2, modulationIndex: 5, envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.3 } } },

  // AM Synths
  "am-synth": { type: "AMSynth", options: { harmonicity: 2, envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 } } },

  // Membrane (drums)
  "kick": { type: "MembraneSynth", options: { pitchDecay: 0.05, octaves: 6, oscillator: { type: "sine" }, envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4 } } },
  "tom": { type: "MembraneSynth", options: { pitchDecay: 0.08, octaves: 4, oscillator: { type: "sine" }, envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 0.3 } } },

  // Metal (hi-hats, cymbals)
  "hihat": { type: "MetalSynth", options: { frequency: 400, envelope: { attack: 0.001, decay: 0.1, release: 0.05 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 } },
  "cymbal": { type: "MetalSynth", options: { frequency: 300, envelope: { attack: 0.001, decay: 0.8, release: 0.3 }, harmonicity: 5.1, modulationIndex: 40, resonance: 5000, octaves: 2 } },

  // Noise (snare, etc)
  "snare": { type: "NoiseSynth", options: { noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.15 } } },
  "noise-sweep": { type: "NoiseSynth", options: { noise: { type: "pink" }, envelope: { attack: 0.5, decay: 1, sustain: 0.3, release: 0.5 } } },

  // Pluck
  "pluck": { type: "PluckSynth", options: { attackNoise: 1, dampening: 4000, resonance: 0.9 } },
  "guitar": { type: "PluckSynth", options: { attackNoise: 2, dampening: 3000, resonance: 0.95 } },

  // Lo-Fi / Keys
  "lofi-piano": { type: "Synth", options: { oscillator: { type: "triangle" }, envelope: { attack: 0.02, decay: 0.8, sustain: 0.2, release: 1.2 } } },
  "lofi-keys": { type: "FMSynth", options: { harmonicity: 0.5, modulationIndex: 1.5, envelope: { attack: 0.03, decay: 0.6, sustain: 0.3, release: 1.0 }, modulation: { type: "triangle" }, modulationEnvelope: { attack: 0.02, decay: 0.4, sustain: 0.1, release: 0.5 } } },
  "electric-piano": { type: "FMSynth", options: { harmonicity: 2, modulationIndex: 4, envelope: { attack: 0.005, decay: 0.5, sustain: 0.1, release: 0.8 }, modulation: { type: "sine" }, modulationEnvelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.4 } } },
  "vintage-keys": { type: "AMSynth", options: { harmonicity: 0.5, oscillator: { type: "triangle" }, envelope: { attack: 0.02, decay: 0.4, sustain: 0.4, release: 1.0 }, modulation: { type: "sine" }, modulationEnvelope: { attack: 0.5, decay: 0.1, sustain: 1, release: 0.5 } } },
  "organ": { type: "AMSynth", options: { harmonicity: 2, oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.01, sustain: 1.0, release: 0.1 }, modulation: { type: "square" }, modulationEnvelope: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.1 } } },
  "soft-pad": { type: "Synth", options: { oscillator: { type: "triangle" }, envelope: { attack: 1.0, decay: 0.5, sustain: 0.9, release: 2.0 } } },
  "sub-bass": { type: "Synth", options: { oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.3 } } },
  "synth-bass": { type: "FMSynth", options: { harmonicity: 0.5, modulationIndex: 2, envelope: { attack: 0.005, decay: 0.2, sustain: 0.8, release: 0.2 }, modulation: { type: "square" } } },
  "brass": { type: "Synth", options: { oscillator: { type: "sawtooth" }, envelope: { attack: 0.1, decay: 0.2, sustain: 0.7, release: 0.3 } } },
  "choir-pad": { type: "AMSynth", options: { harmonicity: 3, oscillator: { type: "sine" }, envelope: { attack: 0.8, decay: 0.3, sustain: 0.9, release: 2.5 } } },

  // Acid / Bass
  "acid-bass": { type: "MonoSynth", options: { oscillator: { type: "sawtooth" }, filter: { Q: 6, type: "lowpass", rolloff: -24 }, envelope: { attack: 0.005, decay: 0.2, sustain: 0.4, release: 0.3 }, filterEnvelope: { attack: 0.06, decay: 0.2, sustain: 0.3, release: 0.2, baseFrequency: 200, octaves: 4, exponent: 2 }, portamento: 0.05 } },
  "wobble-bass": { type: "FMSynth", options: { harmonicity: 0.5, modulationIndex: 8, envelope: { attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.3 }, modulation: { type: "sine" }, modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 } } },

  // Super Saws / Pads
  "detuned-saw": { type: "Synth", options: { oscillator: { type: "fatsawtooth", count: 7, spread: 40 }, envelope: { attack: 0.05, decay: 0.3, sustain: 0.6, release: 0.5 } } },
  "dark-pad": { type: "FMSynth", options: { harmonicity: 0.25, modulationIndex: 2, envelope: { attack: 1.5, decay: 0.8, sustain: 0.7, release: 3.0 }, modulation: { type: "sine" }, modulationEnvelope: { attack: 2.0, decay: 0.5, sustain: 0.8, release: 2.0 } } },
  "string-pad": { type: "AMSynth", options: { harmonicity: 3, oscillator: { type: "fatsawtooth", count: 3, spread: 20 }, envelope: { attack: 1.2, decay: 0.4, sustain: 0.8, release: 2.5 }, modulation: { type: "sine" }, modulationEnvelope: { attack: 0.5, decay: 0.2, sustain: 1, release: 0.5 } } },

  // Bells / Glass
  "glass-bell": { type: "FMSynth", options: { harmonicity: 12, modulationIndex: 20, envelope: { attack: 0.001, decay: 2.0, sustain: 0, release: 1.0 }, modulation: { type: "sine" } } },

  // Keys
  "tape-keys": { type: "AMSynth", options: { harmonicity: 1.5, oscillator: { type: "triangle" }, envelope: { attack: 0.03, decay: 0.5, sustain: 0.3, release: 0.8 }, modulation: { type: "sine" }, modulationEnvelope: { attack: 0.1, decay: 0.3, sustain: 0.5, release: 0.5 } } },

  // Percussion
  "metallic-perc": { type: "MetalSynth", options: { frequency: 200, envelope: { attack: 0.001, decay: 0.15, release: 0.1 }, harmonicity: 5.1, modulationIndex: 24, resonance: 3000, octaves: 1.0 } },
  "glitch-perc": { type: "NoiseSynth", options: { noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.03 } } },
};

// Scale definitions for Markov note generation
const SCALE_INTERVALS = {
  major:      [0, 2, 4, 5, 7, 9, 11],
  minor:      [0, 2, 3, 5, 7, 8, 10],
  dorian:     [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues:      [0, 3, 5, 6, 7, 10],
};

const NOTE_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

/**
 * Markov Chain generator for algorithmic note sequences
 */
class MarkovChain {
  constructor() {
    this.transitions = new Map(); // state -> [{next, weight}]
  }

  /** Build transition table from an array of note steps */
  train(steps) {
    this.transitions.clear();
    for (let i = 0; i < steps.length - 1; i++) {
      const current = this._stateKey(steps[i]);
      const next = steps[i + 1];
      if (!this.transitions.has(current)) this.transitions.set(current, []);
      this.transitions.get(current).push(next);
    }
  }

  /** Generate n steps starting from a seed step */
  generate(seed, n) {
    const result = [seed];
    let current = seed;
    for (let i = 1; i < n; i++) {
      const key = this._stateKey(current);
      const options = this.transitions.get(key);
      if (options && options.length > 0) {
        current = options[Math.floor(Math.random() * options.length)];
      } else {
        // Fallback: pick a random known transition
        const allKeys = [...this.transitions.keys()];
        if (allKeys.length === 0) break;
        const rk = allKeys[Math.floor(Math.random() * allKeys.length)];
        const opts = this.transitions.get(rk);
        current = opts[Math.floor(Math.random() * opts.length)];
      }
      result.push({ ...current });
    }
    return result;
  }

  _stateKey(step) {
    if (step.rest) return "REST";
    return step.note || (step.hit ? "HIT" : "REST");
  }
}

/**
 * Algorithmic pattern mutators — generative transformations
 */
const PatternMutators = {
  /** Probabilistic step dropout */
  dropout(steps, probability = 0.15) {
    return steps.map(s => {
      if (s.rest) return s;
      return Math.random() < probability ? { rest: true } : { ...s };
    });
  },

  /** Velocity humanization */
  humanize(steps, amount = 0.12) {
    return steps.map(s => {
      if (s.rest || (!s.note && !s.hit)) return s;
      const vel = (s.velocity || 0.8) + (Math.random() * 2 - 1) * amount;
      return { ...s, velocity: Math.max(0.2, Math.min(1.0, vel)) };
    });
  },

  /** Reverse pattern */
  reverse(steps) {
    return [...steps].reverse();
  },

  /** Rotate/shift pattern by n steps */
  rotate(steps, n = 1) {
    const len = steps.length;
    const shift = ((n % len) + len) % len;
    return [...steps.slice(shift), ...steps.slice(0, shift)];
  },

  /** Euclidean rhythm generator */
  euclidean(hits, totalSteps, velocity = 0.8, note = null) {
    const pattern = [];
    let bucket = 0;
    for (let i = 0; i < totalSteps; i++) {
      bucket += hits;
      if (bucket >= totalSteps) {
        bucket -= totalSteps;
        if (note) {
          pattern.push({ note, duration: "16n", velocity });
        } else {
          pattern.push({ hit: true, duration: "16n", velocity });
        }
      } else {
        pattern.push({ rest: true });
      }
    }
    return pattern;
  },

  /** Density morph — add or remove steps to reach a target density */
  densityMorph(steps, targetDensity) {
    const result = steps.map(s => ({ ...s }));
    const active = result.filter(s => !s.rest).length;
    const currentDensity = active / result.length;

    if (targetDensity > currentDensity) {
      // Fill in some rests
      const toAdd = Math.round((targetDensity - currentDensity) * result.length);
      const restIndices = result.map((s, i) => s.rest ? i : -1).filter(i => i >= 0);
      for (let i = 0; i < Math.min(toAdd, restIndices.length); i++) {
        const idx = restIndices[Math.floor(Math.random() * restIndices.length)];
        result[idx] = { hit: true, duration: "16n", velocity: 0.6 + Math.random() * 0.3 };
        restIndices.splice(restIndices.indexOf(idx), 1);
      }
    } else if (targetDensity < currentDensity) {
      const toRemove = Math.round((currentDensity - targetDensity) * result.length);
      const activeIndices = result.map((s, i) => !s.rest ? i : -1).filter(i => i >= 0);
      for (let i = 0; i < Math.min(toRemove, activeIndices.length); i++) {
        const idx = activeIndices[Math.floor(Math.random() * activeIndices.length)];
        result[idx] = { rest: true };
        activeIndices.splice(activeIndices.indexOf(idx), 1);
      }
    }
    return result;
  },

  /** Generate scale-aware note sequence */
  scaleSequence(key, scale, octave, length, options = {}) {
    const rootMidi = NOTE_NAMES.indexOf(key);
    const intervals = SCALE_INTERVALS[scale] || SCALE_INTERVALS.minor;
    const {
      direction = "random", // "up", "down", "random", "pendulum"
      stepSize = 1,
      restProbability = 0.2,
      velocityRange = [0.5, 0.9],
      duration = "8n"
    } = options;

    const scaleNotes = [];
    for (let oct = octave - 1; oct <= octave + 1; oct++) {
      for (const interval of intervals) {
        const midi = rootMidi + interval + (oct + 1) * 12;
        const noteName = NOTE_NAMES[(rootMidi + interval) % 12];
        scaleNotes.push(`${noteName}${oct}`);
      }
    }

    const result = [];
    let pos = Math.floor(scaleNotes.length / 2); // Start from middle
    let dir = 1;

    for (let i = 0; i < length; i++) {
      if (Math.random() < restProbability) {
        result.push({ rest: true });
        continue;
      }

      const vel = velocityRange[0] + Math.random() * (velocityRange[1] - velocityRange[0]);
      result.push({
        note: scaleNotes[pos],
        duration,
        velocity: Math.round(vel * 100) / 100
      });

      // Move position
      switch (direction) {
        case "up":
          pos = Math.min(pos + stepSize, scaleNotes.length - 1);
          break;
        case "down":
          pos = Math.max(pos - stepSize, 0);
          break;
        case "pendulum":
          pos += dir * stepSize;
          if (pos >= scaleNotes.length - 1 || pos <= 0) dir *= -1;
          pos = Math.max(0, Math.min(scaleNotes.length - 1, pos));
          break;
        default: // random
          pos += (Math.random() > 0.5 ? 1 : -1) * stepSize;
          pos = Math.max(0, Math.min(scaleNotes.length - 1, pos));
      }
    }
    return result;
  }
};


class AudioEngine {
  constructor() {
    this.layers = new Map(); // layerId -> { synth, loop, config, muted }
    this.isPlaying = false;
    this.bpm = 120;
    this.timeSignature = [4, 4];
    this.key = "C";
    this.scale = "major";
    this.analyser = null;
    this.masterGain = null;
    this._currentStepCallbacks = [];
    this._sectionCallbacks = [];
    this._started = false;

    // --- Section / Arrangement ---
    // Each section: { id, name, bars, layerPatterns: { layerId: notes[] } }
    this.sections = new Map();
    this.arrangement = []; // ordered array of section IDs
    this.currentSectionIndex = 0;
    this.currentBar = 0;
    this.globalStep = 0;
    this._sectionLoop = null;

    // Markov engine
    this.markov = new MarkovChain();
  }

  async init() {
    await Tone.start();
    this._started = true;

    this.masterGain = new Tone.Gain(0.7).toDestination();
    this.analyser = new Tone.Analyser("waveform", 256);
    this.masterGain.connect(this.analyser);

    Tone.getTransport().bpm.value = this.bpm;
    Tone.getTransport().timeSignature = this.timeSignature;
  }

  async ensureStarted() {
    if (!this._started) await this.init();
  }

  setBPM(bpm) {
    this.bpm = bpm;
    if (this._started) {
      Tone.getTransport().bpm.value = bpm;
    }
  }

  setTimeSignature(ts) {
    this.timeSignature = ts;
    if (this._started) {
      Tone.getTransport().timeSignature = ts;
    }
  }

  getWaveformData() {
    if (!this.analyser) return new Float32Array(256);
    return this.analyser.getValue();
  }

  _createSynth(instrumentName) {
    const preset = INSTRUMENT_PRESETS[instrumentName];
    if (!preset) {
      console.warn(`Unknown instrument: ${instrumentName}, using default synth`);
      return new Tone.PolySynth(Tone.Synth).connect(this.masterGain);
    }

    const SynthClass = Tone[preset.type];
    if (!SynthClass) {
      console.warn(`Unknown Tone class: ${preset.type}`);
      return new Tone.PolySynth(Tone.Synth).connect(this.masterGain);
    }

    if (["NoiseSynth", "MetalSynth", "MembraneSynth", "PluckSynth", "MonoSynth"].includes(preset.type)) {
      return new SynthClass(preset.options).connect(this.masterGain);
    }

    return new Tone.PolySynth(SynthClass, preset.options).connect(this.masterGain);
  }

  // --- Section Management ---

  /** Create a new section with a given bar length */
  createSection(id, name, bars = 8) {
    const section = {
      id,
      name,
      bars,
      layerPatterns: {} // layerId -> notes[]
    };
    this.sections.set(id, section);

    // Copy current layer patterns into this section
    this.layers.forEach((layer, layerId) => {
      if (layer.config.pattern?.notes) {
        section.layerPatterns[layerId] = this._expandPatternToBars(
          layer.config.pattern.notes,
          layer.config.pattern.subdivision || "16n",
          bars
        );
      }
    });

    // Auto-add to arrangement if first section
    if (this.arrangement.length === 0) {
      this.arrangement.push(id);
    }

    return section;
  }

  /** Expand a short pattern to fill N bars (at 4/4, 16th = 16 steps/bar) */
  _expandPatternToBars(notes, subdivision, bars) {
    const stepsPerBar = subdivision === "4n" ? 4 : subdivision === "8n" ? 8 : 16;
    const totalSteps = stepsPerBar * bars;
    const expanded = [];
    for (let i = 0; i < totalSteps; i++) {
      expanded.push({ ...notes[i % notes.length] });
    }
    return expanded;
  }

  /** Set the pattern for a specific layer within a section */
  setSectionPattern(sectionId, layerId, notes) {
    const section = this.sections.get(sectionId);
    if (!section) return;
    section.layerPatterns[layerId] = notes;
  }

  /** Build the arrangement from an ordered list of section IDs */
  setArrangement(sectionIds) {
    this.arrangement = sectionIds.filter(id => this.sections.has(id));
  }

  /** Get the currently active section */
  getCurrentSection() {
    if (this.arrangement.length === 0) return null;
    const idx = this.currentSectionIndex % this.arrangement.length;
    return this.sections.get(this.arrangement[idx]) || null;
  }

  /** Switch to a specific section by index or ID */
  jumpToSection(indexOrId) {
    if (typeof indexOrId === "number") {
      this.currentSectionIndex = indexOrId % this.arrangement.length;
    } else {
      const idx = this.arrangement.indexOf(indexOrId);
      if (idx >= 0) this.currentSectionIndex = idx;
    }
    this._applySectionPatterns();
    this._notifySectionChange();
  }

  /** Apply current section's patterns to all layers */
  _applySectionPatterns() {
    const section = this.getCurrentSection();
    if (!section) return;

    this.layers.forEach((layer, layerId) => {
      const sectionNotes = section.layerPatterns[layerId];
      if (sectionNotes) {
        layer.patternRef.current = {
          ...layer.config.pattern,
          notes: sectionNotes
        };
      }
    });
  }

  /** Advance to the next section in the arrangement */
  _advanceSection() {
    if (this.arrangement.length === 0) return;
    this.currentSectionIndex = (this.currentSectionIndex + 1) % this.arrangement.length;
    this._applySectionPatterns();
    this._notifySectionChange();
  }

  _notifySectionChange() {
    const section = this.getCurrentSection();
    this._sectionCallbacks.forEach(cb => cb(section, this.currentSectionIndex));
  }

  onSectionChange(callback) {
    this._sectionCallbacks.push(callback);
  }

  // --- Markov / Algorithmic ---

  /** Use Markov chain to extend a pattern */
  markovExtend(steps, targetLength) {
    this.markov.train(steps);
    const seed = steps[steps.length - 1] || { rest: true };
    const generated = this.markov.generate(seed, targetLength - steps.length);
    return [...steps, ...generated.slice(1)];
  }

  /** Apply an algorithmic mutation to a layer's pattern */
  mutatePattern(layerId, mutationType, params = {}) {
    const layer = this.layers.get(layerId);
    if (!layer) return null;

    const notes = [...(layer.patternRef.current.notes || [])];

    let mutated;
    switch (mutationType) {
      case "dropout":
        mutated = PatternMutators.dropout(notes, params.probability);
        break;
      case "humanize":
        mutated = PatternMutators.humanize(notes, params.amount);
        break;
      case "reverse":
        mutated = PatternMutators.reverse(notes);
        break;
      case "rotate":
        mutated = PatternMutators.rotate(notes, params.steps || 1);
        break;
      case "euclidean":
        mutated = PatternMutators.euclidean(
          params.hits || 5,
          notes.length,
          params.velocity || 0.8,
          params.note || null
        );
        break;
      case "density":
        mutated = PatternMutators.densityMorph(notes, params.density || 0.5);
        break;
      case "markov":
        mutated = this.markovExtend(notes, params.length || notes.length * 2);
        break;
      default:
        return null;
    }

    // Apply the mutation
    layer.patternRef.current = { ...layer.config.pattern, notes: mutated };
    layer.config.pattern.notes = mutated;
    return mutated;
  }

  /** Generate a completely new pattern using algorithmic methods */
  generateAlgorithmicPattern(type, params = {}) {
    switch (type) {
      case "euclidean":
        return PatternMutators.euclidean(
          params.hits || 5,
          params.steps || 16,
          params.velocity || 0.8,
          params.note || null
        );
      case "scale_sequence":
        return PatternMutators.scaleSequence(
          params.key || this.key,
          params.scale || this.scale,
          params.octave || 4,
          params.length || 16,
          params
        );
      default:
        return null;
    }
  }

  // --- Layer Management ---

  addLayer(layerConfig) {
    const { id, name, instrument, volume = 0 } = layerConfig;

    if (this.layers.has(id)) {
      this.removeLayer(id);
    }

    const synth = this._createSynthWithEffects(instrument);
    if (synth.volume) synth.volume.value = volume;

    const isDrum = ["kick", "tom", "snare", "hihat", "cymbal", "noise-sweep", "metallic-perc", "glitch-perc"].includes(instrument);
    const isMembrane = ["kick", "tom"].includes(instrument);

    const patternRef = { current: layerConfig.pattern };

    let stepIndex = 0;
    const subdivision = patternRef.current.subdivision || "16n";

    const loop = new Tone.Loop((time) => {
      const steps = patternRef.current.notes;
      if (!steps || steps.length === 0) return;

      const step = steps[stepIndex % steps.length];
      stepIndex++;
      this.globalStep++;

      // Track bar position for section advancing
      const stepsPerBar = subdivision === "4n" ? 4 : subdivision === "8n" ? 8 : 16;
      if (this.arrangement.length > 0 && stepIndex % stepsPerBar === 0) {
        this.currentBar++;
        const section = this.getCurrentSection();
        if (section && this.currentBar >= section.bars) {
          this.currentBar = 0;
          this._advanceSection();
        }
      }

      this._currentStepCallbacks.forEach(cb => cb(id, (stepIndex - 1) % steps.length));

      if (!step || step.rest) return;

      try {
        if (isDrum) {
          if (step.hit || step.note) {
            if (synth.triggerAttackRelease) {
              if (isMembrane) {
                synth.triggerAttackRelease(step.note || "C1", step.duration || "16n", time, step.velocity || 0.8);
              } else if (instrument === "hihat" || instrument === "cymbal") {
                synth.triggerAttackRelease(step.duration || "32n", time, step.velocity || 0.8);
              } else {
                synth.triggerAttackRelease(step.duration || "16n", time, step.velocity || 0.8);
              }
            }
          }
        } else {
          if (step.note) {
            const notes = Array.isArray(step.note) ? step.note : [step.note];
            if (synth.triggerAttackRelease) {
              synth.triggerAttackRelease(notes, step.duration || "8n", time, step.velocity || 0.7);
            }
          }
        }
      } catch (e) {
        console.warn(`Layer ${id} playback error:`, e.message);
      }
    }, subdivision);

    if (this.isPlaying) {
      loop.start(0);
    }

    this.layers.set(id, {
      synth,
      loop,
      config: layerConfig,
      patternRef,
      muted: false,
      stepIndex: 0
    });

    // Register in all existing sections if not already present
    this.sections.forEach(section => {
      if (!section.layerPatterns[id] && layerConfig.pattern?.notes) {
        section.layerPatterns[id] = this._expandPatternToBars(
          layerConfig.pattern.notes,
          subdivision,
          section.bars
        );
      }
    });

    return id;
  }

  removeLayer(id) {
    const layer = this.layers.get(id);
    if (!layer) return;

    layer.loop.stop();
    layer.loop.dispose();
    if (layer.synth._effectNodes) {
      layer.synth._effectNodes.forEach(n => n.dispose());
    }
    layer.synth.dispose();
    this.layers.delete(id);

    // Remove from sections
    this.sections.forEach(section => {
      delete section.layerPatterns[id];
    });
  }

  updateLayer(id, updates) {
    const layer = this.layers.get(id);
    if (!layer) return;

    const config = { ...layer.config, ...updates };

    if (updates.instrument && updates.instrument !== layer.config.instrument) {
      this.removeLayer(id);
      this.addLayer(config);
      return;
    }

    if (updates.pattern) {
      layer.config.pattern = updates.pattern;
      layer.patternRef.current = updates.pattern;
    }

    if (updates.volume !== undefined && layer.synth.volume) {
      layer.synth.volume.value = updates.volume;
    }

    layer.config = config;
  }

  muteLayer(id) {
    const layer = this.layers.get(id);
    if (!layer) return;
    layer.muted = true;
    if (layer.synth.volume) layer.synth.volume.value = -Infinity;
  }

  unmuteLayer(id) {
    const layer = this.layers.get(id);
    if (!layer) return;
    layer.muted = false;
    if (layer.synth.volume) layer.synth.volume.value = layer.config.volume || 0;
  }

  toggleMute(id) {
    const layer = this.layers.get(id);
    if (!layer) return;
    if (layer.muted) this.unmuteLayer(id);
    else this.muteLayer(id);
    return !layer.muted;
  }

  play() {
    if (!this._started) return;
    this.layers.forEach((layer) => {
      layer.loop.start(0);
    });
    Tone.getTransport().start();
    this.isPlaying = true;
  }

  stop() {
    Tone.getTransport().stop();
    this.layers.forEach((layer) => {
      layer.loop.stop();
    });
    this.isPlaying = false;
    this.currentBar = 0;
    this.globalStep = 0;
  }

  getSongState() {
    const layers = [];
    this.layers.forEach((layer, id) => {
      layers.push({
        id,
        name: layer.config.name,
        instrument: layer.config.instrument,
        pattern: layer.config.pattern,
        muted: layer.muted,
        volume: layer.config.volume || 0
      });
    });

    const sections = [];
    this.sections.forEach((section, id) => {
      sections.push({
        id: section.id,
        name: section.name,
        bars: section.bars,
        layerCount: Object.keys(section.layerPatterns).length
      });
    });

    return {
      bpm: this.bpm,
      timeSignature: this.timeSignature,
      key: this.key,
      scale: this.scale,
      isPlaying: this.isPlaying,
      layerCount: layers.length,
      layers,
      sections,
      arrangement: this.arrangement,
      currentSectionIndex: this.currentSectionIndex,
      currentSection: this.getCurrentSection()?.id || null
    };
  }

  onStep(callback) {
    this._currentStepCallbacks.push(callback);
  }

  getInstrumentList() {
    return Object.keys(INSTRUMENT_PRESETS);
  }

  dispose() {
    this.stop();
    this.layers.forEach((_, id) => this.removeLayer(id));
    if (this.masterGain) this.masterGain.dispose();
    if (this.analyser) this.analyser.dispose();
  }

  // --- Patch Management ---

  /** Register a custom synth patch at runtime */
  registerCustomPatch(name, config) {
    const synthOptions = {};
    if (config.oscillator_type) {
      synthOptions.oscillator = { type: config.oscillator_type };
      if (config.oscillator_count) synthOptions.oscillator.count = config.oscillator_count;
      if (config.oscillator_spread) synthOptions.oscillator.spread = config.oscillator_spread;
    }
    if (config.attack !== undefined || config.decay !== undefined || config.sustain !== undefined || config.release !== undefined) {
      synthOptions.envelope = {
        attack: config.attack ?? 0.01,
        decay: config.decay ?? 0.2,
        sustain: config.sustain ?? 0.5,
        release: config.release ?? 0.3
      };
    }
    if (config.harmonicity !== undefined) synthOptions.harmonicity = config.harmonicity;
    if (config.modulation_index !== undefined) synthOptions.modulationIndex = config.modulation_index;
    if (config.modulation_type) synthOptions.modulation = { type: config.modulation_type };

    // Parse effects
    let effects = [];
    if (config.effects) {
      try {
        effects = typeof config.effects === "string" ? JSON.parse(config.effects) : config.effects;
      } catch (e) {
        console.warn("Failed to parse effects:", e.message);
      }
    }

    INSTRUMENT_PRESETS[name] = {
      type: config.type || "Synth",
      options: synthOptions,
      effects,
      custom: true,
      name
    };

    return { name, type: config.type || "Synth", options: synthOptions, effects };
  }

  /** Create a custom synth patch dynamically (legacy) */
  createPatch(patchConfig) {
    const {
      id,
      name,
      type = "Synth",
      oscillator = {},
      envelope = {},
      modulation = {},
      modulationEnvelope = {},
      filter = {},
      filterEnvelope = {},
      effects = [],
      harmonicity,
      modulationIndex,
      voice0 = {},
      voice1 = {},
      vibratoAmount,
      vibratoRate
    } = patchConfig;

    const synthOptions = {};
    if (Object.keys(oscillator).length > 0) synthOptions.oscillator = oscillator;
    if (Object.keys(envelope).length > 0) synthOptions.envelope = envelope;
    if (Object.keys(modulation).length > 0) synthOptions.modulation = modulation;
    if (Object.keys(modulationEnvelope).length > 0) synthOptions.modulationEnvelope = modulationEnvelope;
    if (Object.keys(filter).length > 0) synthOptions.filter = filter;
    if (Object.keys(filterEnvelope).length > 0) synthOptions.filterEnvelope = filterEnvelope;
    if (harmonicity !== undefined) synthOptions.harmonicity = harmonicity;
    if (modulationIndex !== undefined) synthOptions.modulationIndex = modulationIndex;
    if (Object.keys(voice0).length > 0) synthOptions.voice0 = voice0;
    if (Object.keys(voice1).length > 0) synthOptions.voice1 = voice1;
    if (vibratoAmount !== undefined) synthOptions.vibratoAmount = vibratoAmount;
    if (vibratoRate !== undefined) synthOptions.vibratoRate = vibratoRate;

    INSTRUMENT_PRESETS[id] = { type, options: synthOptions, effects, custom: true, name };

    return { id, name, type, options: synthOptions, effects };
  }

  /** Create a synth with optional effects chain */
  _createSynthWithEffects(instrumentName) {
    const preset = INSTRUMENT_PRESETS[instrumentName];
    if (!preset) return this._createSynth(instrumentName);

    const synth = this._createSynth(instrumentName);

    // Apply effects chain if defined
    if (preset.effects && preset.effects.length > 0) {
      synth.disconnect(); // Disconnect from masterGain
      let lastNode = synth;

      const effectNodes = [];
      for (const fx of preset.effects) {
        let effectNode;
        const fxType = fx.type || fx.Type;
        switch (fxType) {
          case "Reverb":
          case "reverb":
            effectNode = new Tone.Reverb({ decay: fx.decay || 2.5, wet: fx.wet || 0.3 });
            break;
          case "FeedbackDelay":
          case "delay":
            effectNode = new Tone.FeedbackDelay(fx.delayTime || fx.options?.delayTime || "8n", fx.feedback || fx.options?.feedback || 0.3);
            if (fx.wet !== undefined) effectNode.wet.value = fx.wet;
            else if (fx.options?.wet !== undefined) effectNode.wet.value = fx.options.wet;
            break;
          case "Chorus":
          case "chorus":
            effectNode = new Tone.Chorus(fx.frequency || fx.options?.frequency || 1.5, fx.delayTime || fx.options?.delayTime || 3.5, fx.depth || fx.options?.depth || 0.7);
            if (fx.wet !== undefined) effectNode.wet.value = fx.wet;
            else if (fx.options?.wet !== undefined) effectNode.wet.value = fx.options.wet;
            effectNode.start();
            break;
          case "Distortion":
          case "distortion":
            effectNode = new Tone.Distortion(fx.distortion || fx.options?.distortion || 0.4);
            if (fx.wet !== undefined) effectNode.wet.value = fx.wet;
            else if (fx.options?.wet !== undefined) effectNode.wet.value = fx.options.wet;
            break;
          case "Phaser":
          case "phaser":
            effectNode = new Tone.Phaser({
              frequency: fx.frequency || fx.options?.frequency || 0.5,
              octaves: fx.octaves || fx.options?.octaves || 3,
              baseFrequency: fx.baseFrequency || fx.options?.baseFrequency || 350
            });
            if (fx.wet !== undefined) effectNode.wet.value = fx.wet;
            else if (fx.options?.wet !== undefined) effectNode.wet.value = fx.options.wet;
            break;
          case "Tremolo":
          case "tremolo":
            effectNode = new Tone.Tremolo(fx.frequency || fx.options?.frequency || 9, fx.depth || fx.options?.depth || 0.75);
            if (fx.wet !== undefined) effectNode.wet.value = fx.wet;
            else if (fx.options?.wet !== undefined) effectNode.wet.value = fx.options.wet;
            effectNode.start();
            break;
          case "BitCrusher":
          case "bitcrusher":
            effectNode = new Tone.BitCrusher(fx.bits || fx.options?.bits || 4);
            if (fx.wet !== undefined) effectNode.wet.value = fx.wet;
            else if (fx.options?.wet !== undefined) effectNode.wet.value = fx.options.wet;
            break;
          case "AutoFilter":
          case "autofilter":
            effectNode = new Tone.AutoFilter({
              frequency: fx.frequency || fx.options?.frequency || "4n",
              baseFrequency: fx.baseFrequency || fx.options?.baseFrequency || 200,
              octaves: fx.octaves || fx.options?.octaves || 4
            });
            if (fx.wet !== undefined) effectNode.wet.value = fx.wet;
            else if (fx.options?.wet !== undefined) effectNode.wet.value = fx.options.wet;
            effectNode.start();
            break;
          case "EQ3":
          case "eq":
            effectNode = new Tone.EQ3(fx.options || { low: 0, mid: 0, high: 0 });
            break;
          case "Compressor":
          case "compressor":
            effectNode = new Tone.Compressor(fx.options || { threshold: -24, ratio: 4 });
            break;
          default:
            continue;
        }
        if (effectNode) {
          lastNode.connect(effectNode);
          lastNode = effectNode;
          effectNodes.push(effectNode);
        }
      }
      lastNode.connect(this.masterGain);
      synth._effectNodes = effectNodes;
    }

    return synth;
  }

  /** Get list of custom patches */
  getCustomPatches() {
    const patches = [];
    for (const [id, preset] of Object.entries(INSTRUMENT_PRESETS)) {
      if (preset.custom) {
        patches.push({ id, name: preset.name, type: preset.type, effects: preset.effects || [] });
      }
    }
    return patches;
  }

  // --- Song Persistence ---

  /** Export full song state as a serializable object */
  exportSong() {
    const layers = [];
    this.layers.forEach((layer, id) => {
      layers.push({
        id,
        name: layer.config.name,
        instrument: layer.config.instrument,
        volume: layer.config.volume || 0,
        pattern: layer.config.pattern,
        muted: layer.muted
      });
    });

    const sections = [];
    this.sections.forEach((section) => {
      sections.push({
        id: section.id,
        name: section.name,
        bars: section.bars,
        layerPatterns: section.layerPatterns
      });
    });

    const customPatches = [];
    for (const [id, preset] of Object.entries(INSTRUMENT_PRESETS)) {
      if (preset.custom) {
        customPatches.push({ id, ...preset });
      }
    }

    return {
      version: 1,
      timestamp: Date.now(),
      bpm: this.bpm,
      timeSignature: this.timeSignature,
      key: this.key,
      scale: this.scale,
      layers,
      sections,
      arrangement: this.arrangement,
      customPatches
    };
  }

  /** Import a song from a previously exported object */
  importSong(songData) {
    // Stop and clear
    this.stop();
    this.layers.forEach((_, id) => this.removeLayer(id));
    this.sections.clear();
    this.arrangement = [];
    this.currentSectionIndex = 0;
    this.currentBar = 0;

    // Restore settings
    this.setBPM(songData.bpm || 120);
    this.setTimeSignature(songData.timeSignature || [4, 4]);
    this.key = songData.key || "C";
    this.scale = songData.scale || "major";

    // Restore custom patches
    if (songData.customPatches) {
      for (const patch of songData.customPatches) {
        INSTRUMENT_PRESETS[patch.id] = {
          type: patch.type,
          options: patch.options,
          effects: patch.effects || [],
          custom: true,
          name: patch.name
        };
      }
    }

    // Restore layers
    if (songData.layers) {
      for (const layer of songData.layers) {
        this.addLayer({
          id: layer.id,
          name: layer.name,
          instrument: layer.instrument,
          volume: layer.volume,
          pattern: layer.pattern
        });
        if (layer.muted) this.muteLayer(layer.id);
      }
    }

    // Restore sections
    if (songData.sections) {
      for (const sec of songData.sections) {
        this.sections.set(sec.id, {
          id: sec.id,
          name: sec.name,
          bars: sec.bars,
          layerPatterns: sec.layerPatterns || {}
        });
      }
    }

    // Restore arrangement
    if (songData.arrangement) {
      this.arrangement = songData.arrangement;
    }
  }

  /** Save song to localStorage with a name */
  saveSong(name) {
    const data = this.exportSong();
    data.name = name;
    const saved = this._getSavedSongsList();
    const key = `midigen-song-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    localStorage.setItem(key, JSON.stringify(data));
    if (!saved.includes(key)) {
      saved.push(key);
      localStorage.setItem("midigen-songs", JSON.stringify(saved));
    }
    return key;
  }

  /** Load song from localStorage by key */
  loadSong(key) {
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error(`Song "${key}" not found.`);
    const data = JSON.parse(raw);
    this.importSong(data);
    return data;
  }

  /** Get list of saved songs */
  getSavedSongs() {
    const keys = this._getSavedSongsList();
    return keys.map(key => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const data = JSON.parse(raw);
        return { key, name: data.name || key, timestamp: data.timestamp, bpm: data.bpm, layerCount: (data.layers || []).length };
      } catch { return null; }
    }).filter(Boolean);
  }

  /** Delete a saved song */
  deleteSong(key) {
    localStorage.removeItem(key);
    const saved = this._getSavedSongsList().filter(k => k !== key);
    localStorage.setItem("midigen-songs", JSON.stringify(saved));
  }

  _getSavedSongsList() {
    try {
      return JSON.parse(localStorage.getItem("midigen-songs") || "[]");
    } catch { return []; }
  }
}

window.AudioEngine = AudioEngine;
window.INSTRUMENT_PRESETS = INSTRUMENT_PRESETS;
window.PatternMutators = PatternMutators;
window.MarkovChain = MarkovChain;
