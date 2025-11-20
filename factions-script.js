// ---------- STATE MODEL ----------
const state = {
  factionName: "",
  gameYear: 1,
  currentTurn: 1,
  factionNotes: "",
  coffers: {
    food: 0,
    wood: 0,
    stone: 0,
    ore: 0,
    silver: 0,
    gold: 0
  },
  hexes: [],
  // Per-turn actions
  turnSummary: "",
  builds: [],
  movements: [],
  offensiveAction: {
    type: "",
    target: "",
    notes: ""
  },
  // One-year seasonal outcomes
  seasons: {
    Spring: { landSearch: "", factionEvent: "", populationEvent: "", weather: "", notes: "" },
    Summer: { landSearch: "", factionEvent: "", populationEvent: "", weather: "", notes: "" },
    Fall:   { landSearch: "", factionEvent: "", populationEvent: "", weather: "", notes: "" },
    Winter: { landSearch: "", factionEvent: "", populationEvent: "", weather: "", notes: "" }
  }
};

// simple id counter for hexes/builds/movements
let nextHexId = 1;
let nextBuildId = 1;
let nextMovementId = 1;

// ---------- DOM HELPERS ----------
function $(id) {
  return document.getElementById(id);
}

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  wireTopControls();
  wireFactionInfo();
  wireCoffers();
  wireTurnActions();
  wireSeasons();

  // Initial render
  renderHexList();
  renderBuildList();
  renderMovementList();
  renderSeasonBlocks();
});

// ---------- TOP CONTROLS ----------
function wireTopControls() {
  const loadBtn = $("loadStateBtn");
  const loadFile = $("loadStateFile");
  const saveBtn = $("saveStateBtn");

  if (loadBtn && loadFile) {
    loadBtn.addEventListener("click", () => loadFile.click());
    loadFile.addEventListener("change", handleLoadFile);
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", handleSaveState);
  }
}

function handleSaveState() {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  const faction = state.factionName && state.factionName.trim().length
    ? state.factionName.trim().replace(/\s+/g, "_")
    : "faction";

  a.href = url;
  a.download = `${faction}_state_y${state.gameYear}_t${state.currentTurn}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleLoadFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const obj = JSON.parse(evt.target.result);
      loadStateObject(obj);
    } catch (err) {
      alert("Could not parse JSON file. Please check the file contents.");
    } finally {
      e.target.value = "";
    }
  };
  reader.readAsText(file);
}

function loadStateObject(obj) {
  // Shallow validation / merge
  if (typeof obj !== "object" || !obj) {
    alert("Invalid state file.");
    return;
  }

  // Basic fields
  state.factionName = obj.factionName || "";
  state.gameYear = obj.gameYear || 1;
  state.currentTurn = obj.currentTurn || 1;
  state.factionNotes = obj.factionNotes || "";

  state.coffers = {
    food: Number(obj.coffers?.food ?? 0),
    wood: Number(obj.coffers?.wood ?? 0),
    stone: Number(obj.coffers?.stone ?? 0),
    ore: Number(obj.coffers?.ore ?? 0),
    silver: Number(obj.coffers?.silver ?? 0),
    gold: Number(obj.coffers?.gold ?? 0)
  };

  state.hexes = Array.isArray(obj.hexes) ? obj.hexes.map((h) => ({
    id: h.id || `hex_${nextHexId++}`,
    name: h.name || "",
    coords: h.coords || "",
    terrain: h.terrain || "",
    primary: h.primary || "",
    secondary: h.secondary || "",
    tertiary: h.tertiary || "",
    structure: h.structure || "",
    notes: h.notes || ""
  })) : [];

  state.turnSummary = obj.turnSummary || "";

  state.builds = Array.isArray(obj.builds) ? obj.builds.map((b) => ({
    id: b.id || `build_${nextBuildId++}`,
    hexId: b.hexId || "",
    description: b.description || "",
    turn: b.turn || state.currentTurn
  })) : [];

  state.movements = Array.isArray(obj.movements) ? obj.movements.map((m) => ({
    id: m.id || `mov_${nextMovementId++}`,
    unitName: m.unitName || "",
    from: m.from || "",
    to: m.to || "",
    notes: m.notes || "",
    turn: m.turn || state.currentTurn
  })) : [];

  state.offensiveAction = {
    type: obj.offensiveAction?.type || "",
    target: obj.offensiveAction?.target || "",
    notes: obj.offensiveAction?.notes || ""
  };

  const seasons = obj.seasons || {};
  ["Spring", "Summer", "Fall", "Winter"].forEach((season) => {
    const s = seasons[season] || {};
    state.seasons[season] = {
      landSearch: s.landSearch || "",
      factionEvent: s.factionEvent || "",
      populationEvent: s.populationEvent || "",
      weather: s.weather || "",
      notes: s.notes || ""
    };
  });

  // Reset counters so new items don't clash
  nextHexId = calcNextNumericId(state.hexes, "hex_");
  nextBuildId = calcNextNumericId(state.builds, "build_");
  nextMovementId = calcNextNumericId(state.movements, "mov_");

  // Render
  syncFactionInfoToUI();
  syncCoffersToUI();
  syncTurnActionsToUI();
  syncSeasonsToUI();
  renderHexList();
  renderBuildList();
  renderMovementList();
  renderSeasonBlocks();
}

function calcNextNumericId(arr, prefix) {
  let maxId = 0;
  arr.forEach((item) => {
    const raw = String(item.id || "");
    if (raw.startsWith(prefix)) {
      const n = parseInt(raw.slice(prefix.length), 10);
      if (!isNaN(n) && n > maxId) maxId = n;
    }
  });
  return maxId + 1;
}

// ---------- FACTION INFO ----------
function wireFactionInfo() {
  const nameInput = $("factionName");
  const yearInput = $("gameYear");
  const turnInput = $("currentTurn");
  const notesInput = $("factionNotes");

  if (nameInput) {
    nameInput.addEventListener("input", () => {
      state.factionName = nameInput.value;
    });
  }

  if (yearInput) {
    yearInput.addEventListener("input", () => {
      state.gameYear = parseInt(yearInput.value, 10) || 1;
    });
  }

  if (turnInput) {
    turnInput.addEventListener("input", () => {
      state.currentTurn = parseInt(turnInput.value, 10) || 1;
      // also keep builds/movements pointed at the current turn by default if newly added
    });
  }

  if (notesInput) {
    notesInput.addEventListener("input", () => {
      state.factionNotes = notesInput.value;
    });
  }

  // Sync initial UI
  syncFactionInfoToUI();
}

function syncFactionInfoToUI() {
  if ($("factionName")) $("factionName").value = state.factionName || "";
  if ($("gameYear")) $("gameYear").value = state.gameYear || 1;
  if ($("currentTurn")) $("currentTurn").value = state.currentTurn || 1;
  if ($("factionNotes")) $("factionNotes").value = state.factionNotes || "";
}

// ---------- COFFERS ----------
function wireCoffers() {
  const fields = ["food", "wood", "stone", "ore", "silver", "gold"];
  fields.forEach((key) => {
    const el = $(key);
    if (!el) return;
    el.addEventListener("input", () => {
      const val = parseInt(el.value, 10);
      state.coffers[key] = isNaN(val) || val < 0 ? 0 : val;
      el.value = state.coffers[key];
    });
  });
  syncCoffersToUI();
}

function syncCoffersToUI() {
  const c = state.coffers || {};
  if ($("food")) $("food").value = c.food ?? 0;
  if ($("wood")) $("wood").value = c.wood ?? 0;
  if ($("stone")) $("stone").value = c.stone ?? 0;
  if ($("ore")) $("ore").value = c.ore ?? 0;
  if ($("silver")) $("silver").value = c.silver ?? 0;
  if ($("gold")) $("gold").value = c.gold ?? 0;
}

// ---------- HEXES ----------
function renderHexList() {
  const container = $("hexList");
  if (!container) return;

  container.innerHTML = "";

  state.hexes.forEach((hex) => {
    const div = document.createElement("div");
    div.className = "hex-card";
    div.dataset.id = hex.id;

    const header = document.createElement("div");
    header.className = "hex-header";

    const titleBox = document.createElement("div");
    const title = document.createElement("div");
    title.className = "hex-title";
    const labelName = hex.name || "(Unnamed Hex)";
    const labelCoords = hex.coords ? ` @ ${hex.coords}` : "";
    title.textContent = `${labelName}${labelCoords}`;

    const sub = document.createElement("div");
    sub.className = "hex-subtitle";
    const primary = hex.primary || "None";
    const structure = hex.structure || "No Structure";
    sub.textContent = `Primary: ${primary} · Structure: ${structure}`;

    titleBox.appendChild(title);
    titleBox.appendChild(sub);

    const controls = document.createElement("div");
    controls.className = "hex-controls";

    const delBtn = document.createElement("button");
    delBtn.className = "button small secondary";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteHex(hex.id));

    controls.appendChild(delBtn);

    header.appendChild(titleBox);
    header.appendChild(controls);

    const body = document.createElement("div");
    body.className = "hex-body";

    body.innerHTML = `
      <div class="section-row">
        <div class="field">
          <label>Hex Name</label>
          <input type="text" class="hex-name-input" value="${hex.name || ""}" />
        </div>
        <div class="field">
          <label>Coordinates</label>
          <input type="text" class="hex-coords-input" value="${hex.coords || ""}" placeholder="e.g. A3, B5" />
        </div>
      </div>

      <div class="section-row">
        <div class="field">
          <label>Terrain</label>
          <select class="hex-terrain-select">
            ${terrainOptions(hex.terrain)}
          </select>
        </div>
        <div class="field">
          <label>Structure / Upgrade</label>
          <select class="hex-structure-select">
            ${structureOptions(hex.structure)}
          </select>
        </div>
      </div>

      <div class="section-row">
        <div class="field">
          <label>Primary Resource</label>
          <select class="hex-primary-select">
            ${resourceOptions(hex.primary)}
          </select>
        </div>
        <div class="field">
          <label>Secondary Resource</label>
          <select class="hex-secondary-select">
            ${resourceOptions(hex.secondary)}
          </select>
        </div>
      </div>

      <div class="section-row">
        <div class="field">
          <label>Tertiary Resource</label>
          <select class="hex-tertiary-select">
            ${resourceOptions(hex.tertiary)}
          </select>
        </div>
        <div class="field">
          <label>Notes</label>
          <textarea class="hex-notes-input" placeholder="Bandits, corruption, ruins, etc.">${hex.notes || ""}</textarea>
        </div>
      </div>
    `;

    // Attach listeners
    body.querySelector(".hex-name-input").addEventListener("input", (e) => {
      hex.name = e.target.value;
      renderHexList(); // re-render header text
    });

    body.querySelector(".hex-coords-input").addEventListener("input", (e) => {
      hex.coords = e.target.value;
      renderHexList();
    });

    body.querySelector(".hex-terrain-select").addEventListener("change", (e) => {
      hex.terrain = e.target.value;
      renderHexList();
    });

    body.querySelector(".hex-structure-select").addEventListener("change", (e) => {
      hex.structure = e.target.value;
      renderHexList();
    });

    body.querySelector(".hex-primary-select").addEventListener("change", (e) => {
      hex.primary = e.target.value;
      renderHexList();
    });

    body.querySelector(".hex-secondary-select").addEventListener("change", (e) => {
      hex.secondary = e.target.value;
      renderHexList();
    });

    body.querySelector(".hex-tertiary-select").addEventListener("change", (e) => {
      hex.tertiary = e.target.value;
      renderHexList();
    });

    body.querySelector(".hex-notes-input").addEventListener("input", (e) => {
      hex.notes = e.target.value;
    });

    div.appendChild(header);
    div.appendChild(body);
    container.appendChild(div);
  });

  const addHexBtn = $("addHexBtn");
  if (addHexBtn && !addHexBtn._wired) {
    addHexBtn.addEventListener("click", addHex);
    addHexBtn._wired = true;
  }
}

function addHex() {
  const id = `hex_${nextHexId++}`;
  state.hexes.push({
    id,
    name: "",
    coords: "",
    terrain: "",
    primary: "",
    secondary: "",
    tertiary: "",
    structure: "",
    notes: ""
  });
  renderHexList();
}

function deleteHex(id) {
  const idx = state.hexes.findIndex((h) => h.id === id);
  if (idx === -1) return;
  if (!confirm("Delete this hex from the faction?")) return;
  state.hexes.splice(idx, 1);

  // Clear references from builds
  state.builds.forEach((b) => {
    if (b.hexId === id) b.hexId = "";
  });

  renderHexList();
  renderBuildList();
}

// Dropdown helpers
function terrainOptions(current) {
  const list = [
    "",
    "Plains",
    "Forest",
    "Hills",
    "Mountains",
    "Swamp",
    "Coastal",
    "Lake",
    "Desert",
    "Ruins"
  ];
  return list
    .map((val) => {
      const label = val || "-- Select Terrain --";
      const selected = val === current ? "selected" : "";
      return `<option value="${val}" ${selected}>${label}</option>`;
    })
    .join("");
}

function resourceOptions(current) {
  const list = ["", "Food", "Wood", "Stone", "Ore", "Silver", "Gold", "Special"];
  return list
    .map((val) => {
      const label = val || "-- None --";
      const selected = val === current ? "selected" : "";
      return `<option value="${val}" ${selected}>${label}</option>`;
    })
    .join("");
}

function structureOptions(current) {
  const list = [
    "",
    "Village",
    "Town",
    "City",
    "Farm",
    "Lumber Mill",
    "Quarry",
    "Mine (Ore)",
    "Mine (Silver)",
    "Mine (Gold)",
    "Market",
    "Blacksmith",
    "Carpenter's Shop",
    "Mason's Shop",
    "Watch Tower",
    "Fort",
    "Castle",
    "Dock",
    "Shipyard",
    "Fishing Fleet",
    "Trading Vessel",
    "War Galley",
    "Special"
  ];
  return list
    .map((val) => {
      const label = val || "-- None --";
      const selected = val === current ? "selected" : "";
      return `<option value="${val}" ${selected}>${label}</option>`;
    })
    .join("");
}

// ---------- TURN ACTIONS ----------
function wireTurnActions() {
  const turnSummary = $("turnSummary");
  const offensiveType = $("offensiveType");
  const offensiveTarget = $("offensiveTarget");
  const offensiveNotes = $("offensiveNotes");

  if (turnSummary) {
    turnSummary.addEventListener("input", () => {
      state.turnSummary = turnSummary.value;
    });
  }

  if (offensiveType) {
    offensiveType.addEventListener("change", () => {
      state.offensiveAction.type = offensiveType.value;
    });
  }

  if (offensiveTarget) {
    offensiveTarget.addEventListener("input", () => {
      state.offensiveAction.target = offensiveTarget.value;
    });
  }

  if (offensiveNotes) {
    offensiveNotes.addEventListener("input", () => {
      state.offensiveAction.notes = offensiveNotes.value;
    });
  }

  const addBuildBtn = $("addBuildBtn");
  if (addBuildBtn) {
    addBuildBtn.addEventListener("click", addBuild);
  }

  const addMovementBtn = $("addMovementBtn");
  if (addMovementBtn) {
    addMovementBtn.addEventListener("click", addMovement);
  }

  syncTurnActionsToUI();
}

function syncTurnActionsToUI() {
  if ($("turnSummary")) $("turnSummary").value = state.turnSummary || "";
  if ($("offensiveType"))
    $("offensiveType").value = state.offensiveAction.type || "";
  if ($("offensiveTarget"))
    $("offensiveTarget").value = state.offensiveAction.target || "";
  if ($("offensiveNotes"))
    $("offensiveNotes").value = state.offensiveAction.notes || "";
}

// Builds
function renderBuildList() {
  const container = $("buildList");
  if (!container) return;
  container.innerHTML = "";

  state.builds.forEach((build) => {
    const row = document.createElement("div");
    row.className = "mini-row";
    row.dataset.id = build.id;

    const top = document.createElement("div");
    top.className = "mini-row-top";

    const label = document.createElement("div");
    label.className = "mini-row-label";
    label.textContent = `Build / Turn ${build.turn || state.currentTurn}`;
    top.appendChild(label);

    const btns = document.createElement("div");
    const del = document.createElement("button");
    del.className = "button small secondary";
    del.textContent = "Delete";
    del.addEventListener("click", () => deleteBuild(build.id));
    btns.appendChild(del);
    top.appendChild(btns);

    const body = document.createElement("div");
    body.className = "mini-row-body";

    // Hex selector
    const fieldHex = document.createElement("div");
    fieldHex.className = "field";
    fieldHex.innerHTML = `
      <label>Hex</label>
      <select class="build-hex-select">
        ${buildHexOptions(build.hexId)}
      </select>
    `;

    // Description
    const fieldDesc = document.createElement("div");
    fieldDesc.className = "field";
    fieldDesc.innerHTML = `
      <label>Description</label>
      <input type="text" class="build-desc-input" value="${build.description || ""}" placeholder="e.g. Build Farm, Upgrade to Town" />
    `;

    // Turn
    const fieldTurn = document.createElement("div");
    fieldTurn.className = "field";
    fieldTurn.innerHTML = `
      <label>Turn</label>
      <input type="number" class="build-turn-input" value="${build.turn || state.currentTurn}" min="1" />
    `;

    body.appendChild(fieldHex);
    body.appendChild(fieldDesc);
    body.appendChild(fieldTurn);

    row.appendChild(top);
    row.appendChild(body);
    container.appendChild(row);

    // Wire events
    body.querySelector(".build-hex-select").addEventListener("change", (e) => {
      build.hexId = e.target.value;
    });
    body.querySelector(".build-desc-input").addEventListener("input", (e) => {
      build.description = e.target.value;
    });
    body.querySelector(".build-turn-input").addEventListener("input", (e) => {
      build.turn = parseInt(e.target.value, 10) || 1;
      renderBuildList(); // refresh label
    });
  });
}

function addBuild() {
  const id = `build_${nextBuildId++}`;
  state.builds.push({
    id,
    hexId: "",
    description: "",
    turn: state.currentTurn
  });
  renderBuildList();
}

function deleteBuild(id) {
  const idx = state.builds.findIndex((b) => b.id === id);
  if (idx === -1) return;
  if (!confirm("Delete this build entry?")) return;
  state.builds.splice(idx, 1);
  renderBuildList();
}

function buildHexOptions(selectedId) {
  const none = `<option value="">-- None --</option>`;
  const options = state.hexes
    .map((h) => {
      const label = (h.name || "(Unnamed Hex)") + (h.coords ? ` @ ${h.coords}` : "");
      const selected = h.id === selectedId ? "selected" : "";
      return `<option value="${h.id}" ${selected}>${label}</option>`;
    })
    .join("");
  return none + options;
}

// Movements
function renderMovementList() {
  const container = $("movementList");
  if (!container) return;
  container.innerHTML = "";

  state.movements.forEach((mov) => {
    const row = document.createElement("div");
    row.className = "mini-row";
    row.dataset.id = mov.id;

    const top = document.createElement("div");
    top.className = "mini-row-top";

    const label = document.createElement("div");
    label.className = "mini-row-label";
    label.textContent = `Movement / Turn ${mov.turn || state.currentTurn}`;
    top.appendChild(label);

    const btns = document.createElement("div");
    const del = document.createElement("button");
    del.className = "button small secondary";
    del.textContent = "Delete";
    del.addEventListener("click", () => deleteMovement(mov.id));
    btns.appendChild(del);
    top.appendChild(btns);

    const body = document.createElement("div");
    body.className = "mini-row-body";

    const fieldUnit = document.createElement("div");
    fieldUnit.className = "field";
    fieldUnit.innerHTML = `
      <label>Unit</label>
      <input type="text" class="mov-unit-input" value="${mov.unitName || ""}" placeholder="e.g. 1st Company, Grove Patrol" />
    `;

    const fieldFrom = document.createElement("div");
    fieldFrom.className = "field";
    fieldFrom.innerHTML = `
      <label>From</label>
      <input type="text" class="mov-from-input" value="${mov.from || ""}" placeholder="Hex name or coords" />
    `;

    const fieldTo = document.createElement("div");
    fieldTo.className = "field";
    fieldTo.innerHTML = `
      <label>To</label>
      <input type="text" class="mov-to-input" value="${mov.to || ""}" placeholder="Hex name or coords" />
    `;

    const fieldNotes = document.createElement("div");
    fieldNotes.className = "field";
    fieldNotes.innerHTML = `
      <label>Notes</label>
      <input type="text" class="mov-notes-input" value="${mov.notes || ""}" placeholder="Scouting, escort, etc." />
    `;

    const fieldTurn = document.createElement("div");
    fieldTurn.className = "field";
    fieldTurn.innerHTML = `
      <label>Turn</label>
      <input type="number" class="mov-turn-input" value="${mov.turn || state.currentTurn}" min="1" />
    `;

    body.appendChild(fieldUnit);
    body.appendChild(fieldFrom);
    body.appendChild(fieldTo);
    body.appendChild(fieldNotes);
    body.appendChild(fieldTurn);

    row.appendChild(top);
    row.appendChild(body);
    container.appendChild(row);

    // Wire events
    body.querySelector(".mov-unit-input").addEventListener("input", (e) => {
      mov.unitName = e.target.value;
    });
    body.querySelector(".mov-from-input").addEventListener("input", (e) => {
      mov.from = e.target.value;
    });
    body.querySelector(".mov-to-input").addEventListener("input", (e) => {
      mov.to = e.target.value;
    });
    body.querySelector(".mov-notes-input").addEventListener("input", (e) => {
      mov.notes = e.target.value;
    });
    body.querySelector(".mov-turn-input").addEventListener("input", (e) => {
      mov.turn = parseInt(e.target.value, 10) || 1;
      renderMovementList();
    });
  });
}

function addMovement() {
  const id = `mov_${nextMovementId++}`;
  state.movements.push({
    id,
    unitName: "",
    from: "",
    to: "",
    notes: "",
    turn: state.currentTurn
  });
  renderMovementList();
}

function deleteMovement(id) {
  const idx = state.movements.findIndex((m) => m.id === id);
  if (idx === -1) return;
  if (!confirm("Delete this movement entry?")) return;
  state.movements.splice(idx, 1);
  renderMovementList();
}

// ---------- SEASONS ----------
function wireSeasons() {
  // seasons themselves render as blocks; each block wires its own listeners
  renderSeasonBlocks();
  syncSeasonsToUI();
}

function renderSeasonBlocks() {
  const container = $("seasonGrid");
  if (!container) return;
  container.innerHTML = "";

  ["Spring", "Summer", "Fall", "Winter"].forEach((season) => {
    const card = document.createElement("div");
    card.className = "season-card";

    card.innerHTML = `
      <div class="season-title">${season}</div>
      <div class="section-row">
        <div class="field">
          <label>Land Search Roll</label>
          <input type="text" class="season-landSearch" data-season="${season}" />
        </div>
        <div class="field">
          <label>Faction Event Roll</label>
          <input type="text" class="season-factionEvent" data-season="${season}" />
        </div>
      </div>
      <div class="section-row">
        <div class="field">
          <label>Population Event Roll</label>
          <input type="text" class="season-populationEvent" data-season="${season}" />
        </div>
        <div class="field">
          <label>Weather / Conditions</label>
          <input type="text" class="season-weather" data-season="${season}" />
        </div>
      </div>
      <div class="section-row">
        <div class="field">
          <label>Notes</label>
          <textarea class="season-notes" data-season="${season}" placeholder="Encounters, results, modifiers, etc."></textarea>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  // Wire after we insert them
  ["Spring", "Summer", "Fall", "Winter"].forEach((season) => {
    document
      .querySelectorAll(`.season-landSearch[data-season="${season}"]`)
      .forEach((el) => {
        el.addEventListener("input", () => {
          state.seasons[season].landSearch = el.value;
        });
      });

    document
      .querySelectorAll(`.season-factionEvent[data-season="${season}"]`)
      .forEach((el) => {
        el.addEventListener("input", () => {
          state.seasons[season].factionEvent = el.value;
        });
      });

    document
      .querySelectorAll(`.season-populationEvent[data-season="${season}"]`)
      .forEach((el) => {
        el.addEventListener("input", () => {
          state.seasons[season].populationEvent = el.value;
        });
      });

    document
      .querySelectorAll(`.season-weather[data-season="${season}"]`)
      .forEach((el) => {
        el.addEventListener("input", () => {
          state.seasons[season].weather = el.value;
        });
      });

    document
      .querySelectorAll(`.season-notes[data-season="${season}"]`)
      .forEach((el) => {
        el.addEventListener("input", () => {
          state.seasons[season].notes = el.value;
        });
      });
  });

  // Fill them with existing values
  syncSeasonsToUI();
}

function syncSeasonsToUI() {
  ["Spring", "Summer", "Fall", "Winter"].forEach((season) => {
    const s = state.seasons[season] || {};
    const ls = document.querySelector(
      `.season-landSearch[data-season="${season}"]`
    );
    const fe = document.querySelector(
      `.season-factionEvent[data-season="${season}"]`
    );
    const pe = document.querySelector(
      `.season-populationEvent[data-season="${season}"]`
    );
    const we = document.querySelector(
      `.season-weather[data-season="${season}"]`
    );
    const nt = document.querySelector(
      `.season-notes[data-season="${season}"]`
    );

    if (ls) ls.value = s.landSearch || "";
    if (fe) fe.value = s.factionEvent || "";
    if (pe) pe.value = s.populationEvent || "";
    if (we) we.value = s.weather || "";
    if (nt) nt.value = s.notes || "";
  });
}
