/**
 * MIDI Gen - Main Application
 * Full DAW-style UI with sections, arrangement timeline, and algorithmic tools.
 */

class MidiGenApp {
  constructor() {
    this.engine = new AudioEngine();
    this.gemini = new GeminiClient();
    this.selectedLayerId = null;
    this.isGenerating = false;
    this.animFrameId = null;

    this._bindElements();
    this._bindEvents();
    this._populateModels();
    this._loadApiKey();
    this._startVisualizer();
    this._renderArrangement();
    this._renderSavedSongs();
  }

  _bindElements() {
    this.el = {
      playBtn: document.getElementById("play-btn"),
      stopBtn: document.getElementById("stop-btn"),
      bpmInput: document.getElementById("bpm-input"),
      modelSelect: document.getElementById("model-select"),
      apiKeyInput: document.getElementById("api-key-input"),
      statusDot: document.getElementById("status-dot"),
      layersList: document.getElementById("layers-list"),
      promptInput: document.getElementById("prompt-input"),
      sendBtn: document.getElementById("send-btn"),
      promptHistory: document.getElementById("prompt-history"),
      canvas: document.getElementById("visualizer-canvas"),
      songKey: document.getElementById("song-key"),
      songScale: document.getElementById("song-scale"),
      songLayers: document.getElementById("song-layers"),
      songSection: document.getElementById("song-section"),
      toolLog: document.getElementById("tool-log"),
      arrangementTimeline: document.getElementById("arrangement-timeline"),
      barCounter: document.getElementById("bar-counter"),
      saveSongBtn: document.getElementById("save-song-btn"),
      exportSongBtn: document.getElementById("export-song-btn"),
      importFileInput: document.getElementById("import-file-input"),
      savedSongsList: document.getElementById("saved-songs-list"),
      headerSaveBtn: document.getElementById("header-save-btn"),
      headerLoadBtn: document.getElementById("header-load-btn"),
      savedSongsDropdown: document.getElementById("saved-songs-dropdown"),
    };
  }

  _bindEvents() {
    this.el.playBtn.addEventListener("click", () => this._play());
    this.el.stopBtn.addEventListener("click", () => this._stop());
    this.el.bpmInput.addEventListener("change", (e) => {
      const bpm = Math.max(40, Math.min(300, parseInt(e.target.value) || 120));
      e.target.value = bpm;
      this.engine.setBPM(bpm);
    });

    this.el.modelSelect.addEventListener("change", (e) => {
      this.gemini.setModel(e.target.value);
    });

    this.el.apiKeyInput.addEventListener("change", (e) => {
      this.gemini.setApiKey(e.target.value);
      this._saveApiKey(e.target.value);
      this._updateStatus("connected");
    });

    this.el.sendBtn.addEventListener("click", () => this._sendPrompt());
    this.el.promptInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this._sendPrompt();
      }
    });

    document.querySelectorAll(".quick-action").forEach(btn => {
      btn.addEventListener("click", () => {
        this.el.promptInput.value = btn.dataset.prompt;
        this._sendPrompt();
      });
    });

    // Song management (sidebar)
    this.el.saveSongBtn.addEventListener("click", () => this._saveSongPrompt());
    this.el.exportSongBtn.addEventListener("click", () => this._exportSongFile());
    this.el.importFileInput.addEventListener("change", (e) => this._importSongFile(e));

    // Song management (header)
    this.el.headerSaveBtn.addEventListener("click", () => this._saveSongPrompt());
    this.el.headerLoadBtn.addEventListener("click", () => this._toggleLoadDropdown());
    document.addEventListener("click", (e) => {
      if (!this.el.savedSongsDropdown.contains(e.target) && e.target !== this.el.headerLoadBtn && !this.el.headerLoadBtn.contains(e.target)) {
        this.el.savedSongsDropdown.classList.add("hidden");
      }
    });

    this.engine.onStep((layerId, stepIndex) => {
      this._highlightStep(layerId, stepIndex);
      this._updateBarCounter();
    });

    this.engine.onSectionChange((section, index) => {
      this._updateSongInfo();
      this._highlightArrangementSection(index);
    });
  }

  _populateModels() {
    this.el.modelSelect.innerHTML = "";
    GEMINI_MODELS.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.name} (${m.tier})`;
      this.el.modelSelect.appendChild(opt);
    });
    this.el.modelSelect.value = GEMINI_MODELS[2].id;
    this.gemini.setModel(GEMINI_MODELS[2].id);
  }

  _saveApiKey(key) {
    try { localStorage.setItem("midigen-api-key", key); } catch {}
  }

  _loadApiKey() {
    try {
      const key = localStorage.getItem("midigen-api-key");
      if (key) {
        this.el.apiKeyInput.value = key;
        this.gemini.setApiKey(key);
        this._updateStatus("connected");
      }
    } catch {}
  }

  async _play() {
    await this.engine.ensureStarted();
    this.engine.play();
    this.el.playBtn.classList.add("playing");
  }

  _stop() {
    this.engine.stop();
    this.el.playBtn.classList.remove("playing");
  }

  _updateStatus(status) {
    this.el.statusDot.className = "status-dot " + status;
  }

  // --- Tool execution ---

  _executeTool(name, args) {
    switch (name) {
      case "add_layer": {
        let notes;
        try {
          notes = typeof args.notes === "string" ? JSON.parse(args.notes) : args.notes;
        } catch (e) {
          return `Error parsing notes JSON: ${e.message}`;
        }
        this.engine.addLayer({
          id: args.id,
          name: args.name,
          instrument: args.instrument,
          volume: args.volume ?? -8,
          pattern: {
            subdivision: args.subdivision || "16n",
            notes
          }
        });
        if (this.engine.isPlaying) {
          const layer = this.engine.layers.get(args.id);
          if (layer) layer.loop.start(0);
        }
        this._renderLayers();
        this._updateSongInfo();
        return `Layer "${args.name}" added with ${notes.length} steps.`;
      }

      case "remove_layer":
        this.engine.removeLayer(args.id);
        this._renderLayers();
        this._updateSongInfo();
        return `Layer "${args.id}" removed.`;

      case "update_layer": {
        const updates = {};
        if (args.instrument) updates.instrument = args.instrument;
        if (args.volume !== undefined) updates.volume = args.volume;
        if (args.subdivision) {
          updates.pattern = { ...(this.engine.layers.get(args.id)?.config?.pattern || {}), subdivision: args.subdivision };
        }
        if (args.notes) {
          let notes;
          try {
            notes = typeof args.notes === "string" ? JSON.parse(args.notes) : args.notes;
          } catch (e) {
            return `Error parsing notes: ${e.message}`;
          }
          updates.pattern = { ...(updates.pattern || this.engine.layers.get(args.id)?.config?.pattern || {}), notes };
        }
        this.engine.updateLayer(args.id, updates);
        this._renderLayers();
        return `Layer "${args.id}" updated.`;
      }

      case "set_bpm":
        this.engine.setBPM(args.bpm);
        this.el.bpmInput.value = args.bpm;
        return `BPM set to ${args.bpm}.`;

      case "set_key":
        this.engine.key = args.key;
        this.engine.scale = args.scale;
        this._updateSongInfo();
        return `Key set to ${args.key} ${args.scale}.`;

      case "set_time_signature":
        this.engine.setTimeSignature([args.beats, args.subdivision]);
        return `Time signature set to ${args.beats}/${args.subdivision}.`;

      // --- Section / Arrangement ---
      case "create_section": {
        const section = this.engine.createSection(args.id, args.name, args.bars);
        this._renderArrangement();
        this._updateSongInfo();
        return `Section "${args.name}" created (${args.bars} bars).`;
      }

      case "set_section_pattern": {
        let notes;
        try {
          notes = typeof args.notes === "string" ? JSON.parse(args.notes) : args.notes;
        } catch (e) {
          return `Error parsing notes: ${e.message}`;
        }
        this.engine.setSectionPattern(args.section_id, args.layer_id, notes);
        return `Pattern set for layer "${args.layer_id}" in section "${args.section_id}".`;
      }

      case "set_arrangement": {
        let sections;
        try {
          sections = typeof args.sections === "string" ? JSON.parse(args.sections) : args.sections;
        } catch (e) {
          return `Error parsing sections: ${e.message}`;
        }
        this.engine.setArrangement(sections);
        this._renderArrangement();
        this._updateSongInfo();
        return `Arrangement set: ${sections.join(" -> ")}.`;
      }

      case "jump_to_section":
        this.engine.jumpToSection(args.section_id);
        this._renderArrangement();
        return `Jumped to section "${args.section_id}".`;

      // --- Algorithmic / Markov ---
      case "mutate_pattern": {
        const params = {};
        if (args.probability !== undefined) params.probability = args.probability;
        if (args.amount !== undefined) params.amount = args.amount;
        if (args.steps !== undefined) params.steps = args.steps;
        if (args.hits !== undefined) params.hits = args.hits;
        if (args.density !== undefined) params.density = args.density;
        if (args.length !== undefined) params.length = args.length;
        if (args.note !== undefined) params.note = args.note;
        if (args.velocity !== undefined) params.velocity = args.velocity;

        const result = this.engine.mutatePattern(args.layer_id, args.mutation, params);
        if (!result) return `Failed to mutate layer "${args.layer_id}".`;
        this._renderLayers();
        return `Applied "${args.mutation}" mutation to "${args.layer_id}" (${result.length} steps).`;
      }

      case "generate_pattern": {
        const params = {};
        if (args.hits !== undefined) params.hits = args.hits;
        if (args.steps !== undefined) params.steps = args.steps;
        if (args.velocity !== undefined) params.velocity = args.velocity;
        if (args.note !== undefined) params.note = args.note;
        if (args.key !== undefined) params.key = args.key;
        if (args.scale !== undefined) params.scale = args.scale;
        if (args.octave !== undefined) params.octave = args.octave;
        if (args.length !== undefined) params.length = args.length;
        if (args.direction !== undefined) params.direction = args.direction;
        if (args.rest_probability !== undefined) params.restProbability = args.rest_probability;
        if (args.duration !== undefined) params.duration = args.duration;

        const pattern = this.engine.generateAlgorithmicPattern(args.type, params);
        if (!pattern) return `Failed to generate pattern of type "${args.type}".`;
        return `Generated ${args.type} pattern with ${pattern.length} steps: ${JSON.stringify(pattern)}`;
      }

      // --- Patch Creation ---
      case "create_patch": {
        const result = this.engine.registerCustomPatch(args.name, args);
        // Add to INSTRUMENT_ENUM so the agent can reference it
        if (!INSTRUMENT_ENUM.includes(args.name)) {
          INSTRUMENT_ENUM.push(args.name);
        }
        this._renderLayers();
        return `Custom patch "${args.name}" (${result.type}) created. Use instrument "${args.name}" in add_layer.`;
      }

      // --- Song Persistence ---
      case "save_song": {
        const key = this.engine.saveSong(args.name);
        this._renderSavedSongs();
        return `Song saved as "${args.name}" (key: ${key}).`;
      }

      case "load_song": {
        try {
          const data = this.engine.loadSong(args.key);
          this._renderLayers();
          this._renderArrangement();
          this._updateSongInfo();
          this._renderSavedSongs();
          return `Song "${data.name}" loaded (${data.layers?.length || 0} layers, ${data.bpm} BPM).`;
        } catch (e) {
          return `Error loading song: ${e.message}`;
        }
      }

      case "list_songs": {
        const songs = this.engine.getSavedSongs();
        if (songs.length === 0) return "No saved songs found.";
        return `Saved songs:\n${songs.map(s => `- "${s.name}" (${s.layerCount} layers, ${s.bpm} BPM) [key: ${s.key}]`).join("\n")}`;
      }

      default:
        return `Unknown tool: ${name}`;
    }
  }

  // --- Tool call log ---

  _clearToolLog() {
    this.el.toolLog.innerHTML = "";
    this.el.toolLog.classList.remove("hidden");
  }

  _addToolLogEntry(name, args, status = "running") {
    const entry = document.createElement("div");
    entry.className = `tool-entry ${status}`;
    entry.dataset.tool = name;

    const icons = {
      add_layer: "+", remove_layer: "-", update_layer: "~",
      set_bpm: "BPM", set_key: "KEY", set_time_signature: "TS",
      create_section: "SEC", set_section_pattern: "PAT",
      set_arrangement: "ARR", jump_to_section: "JMP",
      mutate_pattern: "MUT", generate_pattern: "GEN",
      create_patch: "SYN", save_song: "SAV", load_song: "LOD", list_songs: "LST"
    };
    const icon = icons[name] || "?";
    const summary = this._toolSummary(name, args);

    entry.innerHTML = `<span class="tool-icon">${icon}</span><span class="tool-name">${name}</span><span class="tool-summary">${summary}</span><span class="tool-status">${status === "running" ? "..." : "OK"}</span>`;

    this.el.toolLog.appendChild(entry);
    this.el.toolLog.scrollTop = this.el.toolLog.scrollHeight;
    return entry;
  }

  _toolSummary(name, args) {
    switch (name) {
      case "add_layer": return `${args.instrument} "${args.name}"`;
      case "remove_layer": return args.id;
      case "update_layer": return args.instrument ? `${args.id} -> ${args.instrument}` : args.id;
      case "set_bpm": return `${args.bpm}`;
      case "set_key": return `${args.key} ${args.scale}`;
      case "set_time_signature": return `${args.beats}/${args.subdivision}`;
      case "create_section": return `"${args.name}" (${args.bars} bars)`;
      case "set_section_pattern": return `${args.section_id}/${args.layer_id}`;
      case "set_arrangement": return "song order";
      case "jump_to_section": return args.section_id;
      case "mutate_pattern": return `${args.layer_id} [${args.mutation}]`;
      case "generate_pattern": return args.type;
      case "create_patch": return `${args.type} "${args.name}"`;
      case "save_song": return args.name;
      case "load_song": return args.key;
      case "list_songs": return "query";
      default: return "";
    }
  }

  // --- Prompt handling ---

  async _sendPrompt() {
    const text = this.el.promptInput.value.trim();
    if (!text || this.isGenerating) return;

    this.isGenerating = true;
    this.el.sendBtn.disabled = true;
    this._updateStatus("generating");

    this._addHistory("user", text);
    this.el.promptInput.value = "";
    this._clearToolLog();

    try {
      await this.engine.ensureStarted();
      const songState = this.engine.getSongState();

      const explanation = await this.gemini.runAgentLoop(
        text,
        songState,
        (name, args) => {
          const entry = this._addToolLogEntry(name, args, "running");
          setTimeout(() => {
            entry.classList.remove("running");
            entry.classList.add("done");
            entry.querySelector(".tool-status").textContent = "OK";
          }, 50);
        },
        (name, args) => this._executeTool(name, args)
      );

      this._addHistory("system", explanation);

      if (!this.engine.isPlaying && this.engine.layers.size > 0) {
        this._play();
      }
    } catch (err) {
      this._addHistory("error", err.message);
    } finally {
      this.isGenerating = false;
      this.el.sendBtn.disabled = false;
      this._updateStatus(this.gemini.apiKey ? "connected" : "");
    }
  }

  _addHistory(type, text) {
    const div = document.createElement("div");
    div.className = `history-item ${type}`;
    div.textContent = text;
    this.el.promptHistory.appendChild(div);
    this.el.promptHistory.scrollTop = this.el.promptHistory.scrollHeight;
  }

  // --- Arrangement Timeline ---

  _renderArrangement() {
    const timeline = this.el.arrangementTimeline;
    if (!timeline) return;

    if (this.engine.arrangement.length === 0) {
      timeline.innerHTML = `<div class="arrangement-empty">No sections yet</div>`;
      return;
    }

    timeline.innerHTML = "";
    this.engine.arrangement.forEach((sectionId, i) => {
      const section = this.engine.sections.get(sectionId);
      if (!section) return;

      const block = document.createElement("div");
      block.className = `arrangement-block ${i === this.engine.currentSectionIndex ? "active" : ""}`;
      block.dataset.index = i;
      block.dataset.sectionId = sectionId;

      // Width proportional to bars
      const minWidth = 60;
      const widthPerBar = 4;
      block.style.minWidth = `${Math.max(minWidth, section.bars * widthPerBar)}px`;

      block.innerHTML = `
        <span class="arrangement-block-name">${section.name}</span>
        <span class="arrangement-block-bars">${section.bars}b</span>
      `;

      block.addEventListener("click", () => {
        this.engine.jumpToSection(sectionId);
        this._renderArrangement();
      });

      timeline.appendChild(block);
    });
  }

  _highlightArrangementSection(index) {
    const blocks = document.querySelectorAll(".arrangement-block");
    blocks.forEach((b, i) => {
      b.classList.toggle("active", i === index);
    });
  }

  _updateBarCounter() {
    if (this.el.barCounter) {
      const section = this.engine.getCurrentSection();
      const sectionName = section ? section.name : "---";
      this.el.barCounter.textContent = `${sectionName} | Bar ${this.engine.currentBar + 1}`;
    }
  }

  // --- Layers ---

  _renderLayers() {
    this.el.layersList.innerHTML = "";

    if (this.engine.layers.size === 0) {
      this.el.layersList.innerHTML = `<div class="layers-empty">No layers yet. Type a prompt to get started!</div>`;
      return;
    }

    this.engine.layers.forEach((layer, id) => {
      const card = document.createElement("div");
      card.className = `layer-card ${id === this.selectedLayerId ? "selected" : ""}`;
      card.addEventListener("click", () => {
        this.selectedLayerId = id;
        this._renderLayers();
      });

      const steps = layer.config.pattern?.notes || [];
      const maxVizSteps = Math.min(steps.length, 64);
      const stepsHtml = steps.slice(0, maxVizSteps).map((s, i) => {
        const active = s && !s.rest && (s.note || s.hit);
        const vel = s.velocity || 0.7;
        return `<div class="pattern-step ${active ? "active" : ""}" data-layer="${id}" data-step="${i}" style="${active ? `opacity: ${0.4 + vel * 0.6}` : ""}"></div>`;
      }).join("");

      card.innerHTML = `
        <div class="layer-header">
          <span class="layer-name">${layer.config.name || id}</span>
          <div class="layer-actions">
            <button class="layer-action-btn mute-btn ${layer.muted ? "muted" : ""}" data-id="${id}" title="Mute">
              ${layer.muted ? "M" : "S"}
            </button>
            <button class="layer-action-btn delete-btn" data-id="${id}" title="Delete">x</button>
          </div>
        </div>
        <div class="layer-info">
          <span class="layer-tag instrument">${layer.config.instrument}</span>
          <span class="layer-tag pattern">${steps.length} steps</span>
          <span class="layer-tag">${layer.config.pattern?.subdivision || "16n"}</span>
        </div>
        <div class="layer-pattern-viz">${stepsHtml}</div>
      `;

      this.el.layersList.appendChild(card);
    });

    this.el.layersList.querySelectorAll(".mute-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.engine.toggleMute(btn.dataset.id);
        this._renderLayers();
      });
    });

    this.el.layersList.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.engine.removeLayer(btn.dataset.id);
        this._renderLayers();
        this._updateSongInfo();
      });
    });
  }

  _highlightStep(layerId, stepIndex) {
    document.querySelectorAll(`.pattern-step[data-layer="${layerId}"]`).forEach(el => {
      el.classList.remove("playing");
    });
    const el = document.querySelector(`.pattern-step[data-layer="${layerId}"][data-step="${stepIndex}"]`);
    if (el) el.classList.add("playing");
  }

  _updateSongInfo() {
    this.el.songKey.textContent = `Key: ${this.engine.key}`;
    this.el.songScale.textContent = `Scale: ${this.engine.scale}`;
    this.el.songLayers.textContent = `Layers: ${this.engine.layers.size}`;

    const section = this.engine.getCurrentSection();
    if (this.el.songSection) {
      this.el.songSection.textContent = section ? `Section: ${section.name}` : "Section: ---";
    }
  }

  // --- Song Persistence UI ---

  _saveSongPrompt() {
    const name = prompt("Song name:");
    if (!name) return;
    this.engine.saveSong(name);
    this._renderSavedSongs();
    this._addHistory("system", `Song saved as "${name}".`);
  }

  _exportSongFile() {
    const data = this.engine.exportSong();
    data.name = data.name || "Untitled";
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `midigen-${data.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  _importSongFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        this.engine.importSong(data);
        this._renderLayers();
        this._renderArrangement();
        this._updateSongInfo();
        this._renderSavedSongs();
        this._addHistory("system", `Song "${data.name || 'Untitled'}" imported.`);
      } catch (err) {
        this._addHistory("error", `Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  _toggleLoadDropdown() {
    const dropdown = this.el.savedSongsDropdown;
    const isHidden = dropdown.classList.contains("hidden");
    if (isHidden) {
      const songs = this.engine.getSavedSongs();
      if (songs.length === 0) {
        dropdown.innerHTML = `<div class="dropdown-empty">No saved songs</div>`;
      } else {
        dropdown.innerHTML = songs.map(s => `
          <div class="dropdown-song-item">
            <button class="dropdown-song-load" data-key="${s.key}">${s.name} <span class="dropdown-song-meta">${s.layerCount}L ${s.bpm}bpm</span></button>
            <button class="dropdown-song-del" data-key="${s.key}" title="Delete">x</button>
          </div>
        `).join("");

        dropdown.querySelectorAll(".dropdown-song-load").forEach(btn => {
          btn.addEventListener("click", () => {
            this.engine.loadSong(btn.dataset.key);
            this._renderLayers();
            this._renderArrangement();
            this._updateSongInfo();
            this._renderSavedSongs();
            this.el.bpmInput.value = this.engine.bpm;
            dropdown.classList.add("hidden");
            this._addHistory("system", "Song loaded.");
          });
        });

        dropdown.querySelectorAll(".dropdown-song-del").forEach(btn => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.engine.deleteSong(btn.dataset.key);
            this._renderSavedSongs();
            this._toggleLoadDropdown(); // re-render dropdown
            this._toggleLoadDropdown();
          });
        });
      }

      // Position below the load button
      const rect = this.el.headerLoadBtn.getBoundingClientRect();
      dropdown.style.top = `${rect.bottom + 4}px`;
      dropdown.style.left = `${rect.left}px`;
      dropdown.classList.remove("hidden");
    } else {
      dropdown.classList.add("hidden");
    }
  }

  _renderSavedSongs() {
    const list = this.el.savedSongsList;
    if (!list) return;
    const songs = this.engine.getSavedSongs();
    if (songs.length === 0) {
      list.innerHTML = `<div class="saved-songs-empty">No saved songs</div>`;
      return;
    }
    list.innerHTML = songs.map(s => `
      <div class="saved-song-item" data-key="${s.key}">
        <span class="saved-song-name">${s.name}</span>
        <span class="saved-song-meta">${s.layerCount}L | ${s.bpm}bpm</span>
        <div class="saved-song-actions">
          <button class="saved-song-load" data-key="${s.key}" title="Load">Load</button>
          <button class="saved-song-delete" data-key="${s.key}" title="Delete">x</button>
        </div>
      </div>
    `).join("");

    list.querySelectorAll(".saved-song-load").forEach(btn => {
      btn.addEventListener("click", () => {
        this.engine.loadSong(btn.dataset.key);
        this._renderLayers();
        this._renderArrangement();
        this._updateSongInfo();
        this._addHistory("system", `Song loaded.`);
      });
    });

    list.querySelectorAll(".saved-song-delete").forEach(btn => {
      btn.addEventListener("click", () => {
        this.engine.deleteSong(btn.dataset.key);
        this._renderSavedSongs();
      });
    });
  }

  _startVisualizer() {
    const canvas = this.el.canvas;
    const ctx = canvas.getContext("2d");

    const draw = () => {
      this.animFrameId = requestAnimationFrame(draw);

      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      const w = rect.width;
      const h = rect.height;

      // Dark gradient background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "#0d0d1a");
      bgGrad.addColorStop(1, "#0a0a12");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = "rgba(100, 116, 139, 0.08)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 8; i++) {
        const y = (h / 8) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const data = this.engine.getWaveformData();
      if (!data || data.length === 0) return;

      // Glow layer
      ctx.beginPath();
      ctx.strokeStyle = "rgba(124, 58, 237, 0.15)";
      ctx.lineWidth = 12;
      ctx.lineJoin = "round";
      const sliceWidth = w / data.length;
      let x = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] + 1) / 2;
        const y = v * h;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();

      // Main waveform
      ctx.beginPath();
      const waveGrad = ctx.createLinearGradient(0, 0, w, 0);
      waveGrad.addColorStop(0, "#7c3aed");
      waveGrad.addColorStop(0.5, "#a855f7");
      waveGrad.addColorStop(1, "#6366f1");
      ctx.strokeStyle = waveGrad;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      x = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] + 1) / 2;
        const y = v * h;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();

      // Center line
      ctx.beginPath();
      ctx.strokeStyle = "rgba(100, 116, 139, 0.15)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    draw();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.app = new MidiGenApp();
});
