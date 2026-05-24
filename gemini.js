/**
 * MIDI Gen - Gemini API Integration (Agent Loop with Function Calling)
 * Supports sections, arrangement, Markov generation, and algorithmic mutations.
 */

const GEMINI_MODELS = [
  { id: "gemini-2.0-flash-lite", name: "2.0 Flash Lite", tier: "economy" },
  { id: "gemini-3-flash", name: "3 Flash", tier: "fast" },
  { id: "gemini-3.1-flash-lite-preview", name: "3.1 Flash Lite", tier: "economy" },
  { id: "gemini-3.1-pro-preview", name: "3.1 Pro", tier: "pro" },
];

const INSTRUMENT_ENUM = [
  "synth", "fat-synth", "square-synth", "sine-pad", "fm-bass", "fm-bell", "fm-pluck",
  "am-synth", "kick", "tom", "snare", "hihat", "cymbal", "noise-sweep", "pluck", "guitar",
  "lofi-piano", "lofi-keys", "electric-piano", "vintage-keys", "organ", "soft-pad",
  "sub-bass", "synth-bass", "brass", "choir-pad",
  "acid-bass", "wobble-bass", "detuned-saw", "dark-pad", "string-pad",
  "glass-bell", "tape-keys", "metallic-perc", "glitch-perc"
];

const TOOL_DECLARATIONS = [
  {
    name: "add_layer",
    description: "Add a new musical layer with an instrument and step-sequencer pattern. Call this once per layer. For drums, create separate layers for kick, snare, hihat, etc.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Unique layer ID slug like 'kick-1', 'bass-line', 'lead-melody'" },
        name: { type: "string", description: "Human-readable display name" },
        instrument: { type: "string", enum: INSTRUMENT_ENUM, description: "Instrument preset" },
        volume: { type: "number", description: "Volume in dB (-20 to 0). Use -8 for drums, -6 for bass, -10 for pads" },
        subdivision: { type: "string", enum: ["4n", "8n", "16n"], description: "Step grid size. Use 16n for drums, 8n for melody/bass, 4n for chords" },
        notes: { type: "string", description: "JSON array of step objects. Melodic: [{\"note\":\"C4\",\"duration\":\"8n\",\"velocity\":0.8},{\"rest\":true},...]. Drums: [{\"hit\":true,\"duration\":\"16n\",\"velocity\":0.9},{\"rest\":true},...]. Use {\"rest\":true} for silent steps." }
      },
      required: ["id", "name", "instrument", "subdivision", "notes"]
    }
  },
  {
    name: "remove_layer",
    description: "Remove an existing layer by its ID",
    parameters: {
      type: "object",
      properties: { id: { type: "string", description: "Layer ID to remove" } },
      required: ["id"]
    }
  },
  {
    name: "update_layer",
    description: "Update an existing layer's instrument patch, pattern, or volume.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Layer ID to update" },
        instrument: { type: "string", enum: INSTRUMENT_ENUM, description: "Swap the instrument/patch" },
        volume: { type: "number", description: "New volume in dB" },
        subdivision: { type: "string", enum: ["4n", "8n", "16n"], description: "New subdivision" },
        notes: { type: "string", description: "New notes JSON array" }
      },
      required: ["id"]
    }
  },
  {
    name: "set_bpm",
    description: "Change the tempo/BPM",
    parameters: {
      type: "object",
      properties: { bpm: { type: "number", description: "Beats per minute (40-300)" } },
      required: ["bpm"]
    }
  },
  {
    name: "set_key",
    description: "Set the musical key and scale for the song",
    parameters: {
      type: "object",
      properties: {
        key: { type: "string", description: "Root note: C, C#, D, Eb, E, F, F#, G, Ab, A, Bb, B" },
        scale: { type: "string", enum: ["major", "minor", "dorian", "mixolydian", "pentatonic", "blues"], description: "Scale type" }
      },
      required: ["key", "scale"]
    }
  },
  {
    name: "set_time_signature",
    description: "Set the time signature",
    parameters: {
      type: "object",
      properties: {
        beats: { type: "number", description: "Beats per measure (e.g., 4, 3, 6)" },
        subdivision: { type: "number", description: "Beat unit (e.g., 4 for quarter note)" }
      },
      required: ["beats", "subdivision"]
    }
  },
  // --- Section / Arrangement Tools ---
  {
    name: "create_section",
    description: "Create a new song section (like intro, verse, chorus, bridge, drop, outro). The section starts with copies of the current layer patterns. Use 8 bars for short sections, 32 for standard, 64 for long evolving sections.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Unique section slug like 'intro', 'verse-1', 'chorus', 'bridge', 'drop', 'outro'" },
        name: { type: "string", description: "Display name like 'Intro', 'Verse 1', 'Chorus'" },
        bars: { type: "number", description: "Length in bars: 8, 16, 32, or 64" }
      },
      required: ["id", "name", "bars"]
    }
  },
  {
    name: "set_section_pattern",
    description: "Set a specific layer's pattern within a section. This lets different sections have different patterns for the same layer (e.g. chorus drums hit harder than verse drums).",
    parameters: {
      type: "object",
      properties: {
        section_id: { type: "string", description: "Section ID" },
        layer_id: { type: "string", description: "Layer ID" },
        notes: { type: "string", description: "JSON array of step objects for this section" }
      },
      required: ["section_id", "layer_id", "notes"]
    }
  },
  {
    name: "set_arrangement",
    description: "Set the full song arrangement as an ordered sequence of section IDs. Sections play one after another and loop. Example: ['intro','verse-1','chorus','verse-2','chorus','bridge','chorus','outro']",
    parameters: {
      type: "object",
      properties: {
        sections: { type: "string", description: "JSON array of section ID strings in play order" }
      },
      required: ["sections"]
    }
  },
  {
    name: "jump_to_section",
    description: "Immediately jump playback to a specific section",
    parameters: {
      type: "object",
      properties: {
        section_id: { type: "string", description: "Section ID to jump to" }
      },
      required: ["section_id"]
    }
  },
  // --- Algorithmic / Markov Tools ---
  {
    name: "mutate_pattern",
    description: "Apply an algorithmic mutation to an existing layer's pattern. Mutations: 'dropout' (random step removal), 'humanize' (velocity variation), 'reverse', 'rotate' (shift steps), 'euclidean' (regenerate as euclidean rhythm), 'density' (change pattern density), 'markov' (extend using Markov chain). Great for generative variation.",
    parameters: {
      type: "object",
      properties: {
        layer_id: { type: "string", description: "Layer ID to mutate" },
        mutation: { type: "string", enum: ["dropout", "humanize", "reverse", "rotate", "euclidean", "density", "markov"], description: "Mutation type" },
        probability: { type: "number", description: "For dropout: probability of removing a step (0.0-1.0, default 0.15)" },
        amount: { type: "number", description: "For humanize: velocity variation amount (0.0-0.3, default 0.12)" },
        steps: { type: "number", description: "For rotate: number of steps to shift (default 1)" },
        hits: { type: "number", description: "For euclidean: number of hits (default 5)" },
        density: { type: "number", description: "For density: target density 0.0-1.0 (default 0.5)" },
        length: { type: "number", description: "For markov: target output length" },
        note: { type: "string", description: "For euclidean melodic: note to use (e.g. 'C3')" }
      },
      required: ["layer_id", "mutation"]
    }
  },
  {
    name: "generate_pattern",
    description: "Generate a brand new pattern using algorithmic methods. 'euclidean' creates a euclidean rhythm. 'scale_sequence' generates a melody from the current key/scale with options for direction (up, down, random, pendulum).",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["euclidean", "scale_sequence"], description: "Generation algorithm" },
        hits: { type: "number", description: "For euclidean: number of hits" },
        steps: { type: "number", description: "Total steps (default 16)" },
        velocity: { type: "number", description: "Default velocity" },
        note: { type: "string", description: "For euclidean melodic: note pitch" },
        key: { type: "string", description: "For scale_sequence: root note (defaults to song key)" },
        scale: { type: "string", description: "For scale_sequence: scale type (defaults to song scale)" },
        octave: { type: "number", description: "For scale_sequence: octave (default 4)" },
        length: { type: "number", description: "For scale_sequence: number of steps (default 16)" },
        direction: { type: "string", enum: ["up", "down", "random", "pendulum"], description: "For scale_sequence: melodic direction (default random)" },
        rest_probability: { type: "number", description: "For scale_sequence: chance of rest 0.0-1.0 (default 0.2)" },
        duration: { type: "string", enum: ["4n", "8n", "16n"], description: "Note duration" }
      },
      required: ["type"]
    }
  },
  // --- Patch Creation ---
  {
    name: "create_patch",
    description: "Create a custom synth patch on-the-fly by specifying Tone.js parameters directly. The patch becomes available as an instrument for add_layer/update_layer. Use this when the built-in presets don't match the desired sound.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Patch name slug like 'wobble-bass', 'glitch-lead', 'ambient-pad'" },
        type: { type: "string", enum: ["Synth", "FMSynth", "AMSynth", "MonoSynth", "DuoSynth", "MetalSynth", "MembraneSynth", "PluckSynth", "NoiseSynth"], description: "Tone.js synth class" },
        oscillator_type: { type: "string", enum: ["sine", "square", "sawtooth", "triangle", "fatsawtooth", "fatsquare", "fattriangle", "pwm", "pulse"], description: "Oscillator waveform type" },
        oscillator_count: { type: "number", description: "For fat oscillators: number of detuned voices (2-8)" },
        oscillator_spread: { type: "number", description: "For fat oscillators: detune spread in cents (1-100)" },
        attack: { type: "number", description: "Envelope attack time in seconds" },
        decay: { type: "number", description: "Envelope decay time in seconds" },
        sustain: { type: "number", description: "Envelope sustain level (0.0-1.0)" },
        release: { type: "number", description: "Envelope release time in seconds" },
        harmonicity: { type: "number", description: "For FM/AM synths: frequency ratio between carrier and modulator" },
        modulation_index: { type: "number", description: "For FM synths: depth of frequency modulation (0-100)" },
        modulation_type: { type: "string", description: "Modulation oscillator waveform: sine, square, triangle, sawtooth" },
        effects: { type: "string", description: "JSON array of effect configs. Example: [{\"type\":\"Reverb\",\"decay\":2.5,\"wet\":0.3},{\"type\":\"FeedbackDelay\",\"delayTime\":\"8n\",\"feedback\":0.4,\"wet\":0.2},{\"type\":\"Distortion\",\"distortion\":0.4,\"wet\":0.5},{\"type\":\"Chorus\",\"frequency\":1.5,\"delayTime\":3.5,\"depth\":0.7,\"wet\":0.3},{\"type\":\"Phaser\",\"frequency\":0.5,\"octaves\":3,\"wet\":0.3},{\"type\":\"AutoFilter\",\"frequency\":\"4n\",\"depth\":0.6,\"wet\":0.4}]" }
      },
      required: ["name", "type"]
    }
  },
  // --- Song Persistence ---
  {
    name: "save_song",
    description: "Save the current song state with a name so it can be reloaded later.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for the saved song" }
      },
      required: ["name"]
    }
  },
  {
    name: "load_song",
    description: "Load a previously saved song by its storage key.",
    parameters: {
      type: "object",
      properties: {
        key: { type: "string", description: "Storage key of the song to load" }
      },
      required: ["key"]
    }
  },
  {
    name: "list_songs",
    description: "List all saved songs available for loading.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "done",
    description: "Call this when you have finished making all changes. Include a brief explanation of what you did.",
    parameters: {
      type: "object",
      properties: {
        explanation: { type: "string", description: "Brief summary of changes for the user (1-2 sentences)" }
      },
      required: ["explanation"]
    }
  }
];

function buildSystemPrompt(songState) {
  return `You are a music producer AI inspired by algorithmic electronic music. You create and modify live music using Tone.js synthesizers with generative and Markov-based techniques.

INSTRUMENTS:
- Synths: synth, fat-synth, square-synth, sine-pad, soft-pad, choir-pad, brass
- FM/AM: fm-bass, fm-bell, fm-pluck, am-synth
- Keys/Lo-Fi: lofi-piano, lofi-keys, electric-piano, vintage-keys, organ
- Bass: sub-bass, synth-bass, fm-bass
- Pluck: pluck, guitar
- Drums: kick, tom, snare, hihat, cymbal, noise-sweep

SECTION SYSTEM:
- Create sections (intro, verse, chorus, bridge, drop, outro) with create_section
- Each section has its own bar length (8, 16, 32, or 64 bars)
- Set per-section patterns with set_section_pattern for variation between sections
- Build the arrangement with set_arrangement to order sections into a full song
- Use jump_to_section to skip to any section during playback

PATCH CREATION:
- create_patch: Design custom synth patches with specific oscillator types, envelopes, modulation, filters, and effects chains
- Oscillator types: sine, square, triangle, sawtooth, fatsine, fatsquare, fattriangle, fatsawtooth, pwm, pulse, amtriangle, amsine, fmtriangle, fmsine
- Synth types: Synth (basic), FMSynth (FM), AMSynth (AM), MonoSynth (with filter), DuoSynth (two voices)
- Effects: reverb, delay, chorus, distortion, phaser, tremolo, bitcrusher, autofilter, eq, compressor
- After creating a patch, use its ID as the instrument in add_layer

ALGORITHMIC TOOLS:
- mutate_pattern: Apply generative mutations (dropout, humanize, reverse, rotate, euclidean, density, markov)
- generate_pattern: Create new patterns algorithmically (euclidean rhythms, scale sequences)
- Use these for evolving, generative compositions
- Chain mutations: e.g. euclidean -> humanize -> rotate for complex grooves

SONG PERSISTENCE:
- save_song: Save the current song with a name for later recall
- load_song: Reload a previously saved song
- list_songs: Show all saved songs

RULES:
- Call one tool at a time. Add layers individually.
- For "add drums": call add_layer 3 times (kick, snare, hihat minimum).
- Notes in the "notes" field must be a valid JSON array string.
- Use notes that fit the key/scale. Bass in octaves 1-3, melody 4-5, pads 3-4.
- Vary velocity for groove (0.6-1.0).
- When asked to create a full song, create sections and an arrangement.
- For longer sequences (32/64 bars), use generate_pattern or mutate_pattern to create evolving patterns rather than hand-writing every step.
- Always call "done" when finished with ALL changes.
- Don't remove layers unless asked.

CURRENT STATE:
${JSON.stringify(songState, null, 2)}`;
}

class GeminiClient {
  constructor() {
    this.apiKey = "";
    this.model = GEMINI_MODELS[2].id;
    this._abortController = null;
  }

  setApiKey(key) { this.apiKey = key; }
  setModel(modelId) { this.model = modelId; }

  abort() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
  }

  async runAgentLoop(userPrompt, songState, onToolCall, executeTool) {
    if (!this.apiKey) throw new Error("Enter your Gemini API key first.");

    this._abortController = new AbortController();
    const signal = this._abortController.signal;

    const systemPrompt = buildSystemPrompt(songState);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    let contents = [
      { role: "user", parts: [{ text: userPrompt }] }
    ];

    const MAX_TURNS = 25; // Increased for multi-section songs

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const body = {
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
        toolConfig: { functionCallingConfig: { mode: "ANY" } },
        generationConfig: { temperature: 0.8 }
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal
      });

      if (!res.ok) {
        const errText = await res.text();
        try {
          const errJson = JSON.parse(errText);
          const msg = errJson.error?.message || errText;
          throw new Error(`API error: ${msg}`);
        } catch (e) {
          if (e.message.startsWith("API error:")) throw e;
          throw new Error(`API error (${res.status}): ${errText.slice(0, 300)}`);
        }
      }

      const data = await res.json();
      const candidate = data.candidates?.[0];

      if (!candidate?.content?.parts) {
        throw new Error("Empty response from Gemini. Try a different model or simplify your prompt.");
      }

      const parts = candidate.content.parts;
      contents.push({ role: "model", parts });

      const functionCalls = parts.filter(p => p.functionCall);

      if (functionCalls.length === 0) {
        const textPart = parts.find(p => p.text);
        return textPart?.text || "Done.";
      }

      const functionResponses = [];
      for (const part of functionCalls) {
        const { name, args } = part.functionCall;
        const callId = part.functionCall.id;

        if (name === "done") {
          return args.explanation || "Changes applied.";
        }

        onToolCall(name, args);

        let result;
        try {
          result = executeTool(name, args);
        } catch (e) {
          result = `Error: ${e.message}`;
        }

        const responseObj = {
          functionResponse: {
            name,
            response: { result: typeof result === "string" ? result : JSON.stringify(result) }
          }
        };
        if (callId) responseObj.functionResponse.id = callId;
        functionResponses.push(responseObj);
      }

      contents.push({ role: "user", parts: functionResponses });
    }

    return "Reached maximum turns. Some changes may have been applied.";
  }
}

window.GeminiClient = GeminiClient;
window.GEMINI_MODELS = GEMINI_MODELS;
