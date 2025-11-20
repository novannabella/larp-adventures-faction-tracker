// ---------- STATE MODEL ----------
const state = {
  factionName: "",
  gameYear: 1,
  currentEventNumber: 1,
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
  events: [],
  // Seasonal gains for the current game year
  seasons: {
    Spring: { food: 0, wood: 0, stone: 0, ore: 0, silver: 0, gold: 0, notes: "" },
    Summer: { food: 0, wood: 0, stone: 0, ore: 0, silver: 0, gold: 0, notes: "" },
    Fall:   { food: 0, wood: 0, stone: 0, ore: 0, silver: 0, gold: 0, notes: "" },
    Winter: { food: 0, wood: 0, stone: 0, ore: 0, silver: 0, gold: 0, notes: "" }
  }
};

let nextHexId = 1;
let nextEventId = 1;
let nextBuildId = 1;
let nextMovementId = 1;

let eventSortDirection = "asc"; // "asc" or "desc"
let currentSeason = "Spring";

// ---------- DOM HELPERS ----------
function $(id) {
  return document.getElementById(id);
}

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  wireTopControls();
  wireFactionInfo();
  wireCoffers();
  wireSeasons();
  wireEvents();

  renderHexList();
  renderEventList();
  syncSeasonUI();
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
  a.download = `${faction}_state_y${state.gameYear}_evt${state.currentEventNumber}.json`;
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
  if (typeof obj !== "object" || !obj) {
    alert("Invalid state file.");
    return;
  }

  state.factionName = obj.factionName || "";
  state.gameYear = obj.gameYear || 1;
  state.currentEventNumber = obj.currentEventNumber || 1;
  state.factionNotes = obj.factionNotes || "";

  state.coffers = {
    food: Number(obj.coffers?.food ?? 0),
    wood: Number(obj.coffers?.wood ?? 0),
    stone: Number(obj.coffers?.stone ?? 0),
    ore: Number(obj.coffers?.ore ?? 0),
    silver: Number(obj.coffers?.silver ?? 0),
    gold: Number(obj.coffers?.gold ?? 0)
  };

  state.hexes = Array.isArray(obj.hexes)
    ? obj.hexes.map((h) => ({
        id: h.id || `hex_${nextHexId++}`,
        name: h.name || "",
        coords: h.coords || "",
        terrain: h.terrain || "",
        primary: h.primary || "",
        secondary: h.secondary || "",
        tertiary: h.tertiary || "",
        structure: h.structure || "",
        notes: h.notes || ""
      }))
    : [];

  state.events = Array.isArray(obj.events)
    ? obj.events.map((ev) => ({
        id: ev.id || `ev_${nextEventId++}`,
        name: ev.name || "",
        date: ev.date || "",
        type: ev.type || "",
        summary: ev.summary || "",
        builds: Array.isArray(ev.builds)
          ? ev.builds.map((b) => ({
              id: b.id || `b_${nextBuildId++}`,
              hexId: b.hexId || "",
              description: b.description || ""
            }))
          : [],
        movements: Array.isArray(ev.movements)
          ? ev.movements.map((m) => ({
              id: m.id || `m_${nextMovementId++}`,
              unitName: m.unitName || "",
              from: m.from || "",
              to: m.to || "",
              notes: m.notes || ""
            }))
          : [],
        offensiveAction: {
          type: ev.offensiveAction?.type || "",
          target: ev.offensiveAction?.target || "",
          notes: ev.offensiveAction?.notes || ""
        }
      }))
    : [];

  const seasons = obj.seasons || {};
  ["Spring", "Summer", "Fall", "Winter"].forEach((season) => {
    const s = seasons[season] || {};
    state.seasons[season] = {
      food: Number(s.food ?? 0),
      wood: Number(s.wood ?? 0),
      stone: Number(s.stone ?? 0),
      ore: Number(s.ore ?? 0),
      silver: Number(s.silver ?? 0),
      gold: Number(s.gold ?? 0),
      notes: s.notes || ""
    };
  });

  // Recalculate counters
  nextHexId = calcNextNumericId(state.hexes, "hex_");
  nextEventId = calcNextNumericId(state.events, "ev_");
  nextBuildId = Math.max(
    calcNextNumericId(flattenBuilds(state.events), "b_"),
    1
  );
  nextMovementId = Math.max(
    calcNextNumericId(flattenMovements(state.events), "m_"),
    1
  );

  syncFactionInfoToUI();
  syncCoffersToUI();
  renderHexList();
  renderEventList();
  syncSeasonUI();
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

function flattenBuilds(events) {
  const list = [];
  events.forEach((ev) => {
    (ev.builds || []).forEach((b) => list.push(b));
  });
  return list;
}

function flattenMovements(events) {
  const list = [];
  events.forEach((ev) => {
    (ev.movements || []).forEach((m) => list.push(m));
  });
  return list;
}

// ---------- FACTION INFO ----------
function wireFactionInfo() {
  const nameInput = $("factionName");
  const yearInput = $("gameYear");
  const eventNumInput = $("currentEventNumber");
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

  if (eventNumInput) {
    eventNumInput.addEventListener("input", () => {
      state.currentEventNumber = parseInt(eventNumInput.value, 10) || 1;
    });
  }

  if (notesInput) {
    notesInput.addEventListener("input", () => {
      state.factionNotes = notesInput.value;
    });
  }

  syncFactionInfoToUI();
}

function syncFactionInfoToUI() {
  if ($("factionName")) $("factionName").value = state.factionName || "";
  if ($("gameYear")) $("gameYear").value = state.gameYear || 1;
  if ($("currentEventNumber"))
    $("currentEventNumber").value = state.currentEventNumber || 1;
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

    body.querySelector(".hex-name-input").addEventListener("input", (e) => {
      hex.name = e.target.value;
      renderHexList();
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

  // clear any references from builds
  state.events.forEach((ev) => {
    ev.builds.forEach((b) => {
      if (b.hexId === id) b.hexId = "";
    });
  });

  renderHexList();
  renderEventList();
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

// ---------- EVENTS & TURN ACTIONS ----------
function wireEvents() {
  const sortSelect = $("eventSortOrder");
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      eventSortDirection = sortSelect.value === "desc" ? "desc" : "asc";
      renderEventList();
    });
  }

  const addEventBtn = $("addEventBtn");
  if (addEventBtn) {
    addEventBtn.addEventListener("click", addEvent);
  }
}

function addEvent() {
  const id = `ev_${nextEventId++}`;
  state.events.push({
    id,
    name: "",
    date: "",
    type: "",
    summary: "",
    builds: [],
    movements: [],
    offensiveAction: {
      type: "",
      target: "",
      notes: ""
    }
  });
  renderEventList();
}

function deleteEvent(id) {
  const idx = state.events.findIndex((ev) => ev.id === id);
  if (idx === -1) return;
  if (!confirm("Delete this event and all its actions?")) return;
  state.events.splice(idx, 1);
  renderEventList();
}

function renderEventList() {
  const container = $("eventList");
  if (!container) return;
  container.innerHTML = "";

  const eventsCopy = [...state.events];

  eventsCopy.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    if (da === db) {
      // fall back to id index in original array
      const idxA = state.events.indexOf(a);
      const idxB = state.events.indexOf(b);
      return idxA - idxB;
    }
    return da - db;
  });

  if (eventSortDirection === "desc") {
    eventsCopy.reverse();
  }

  eventsCopy.forEach((ev, idx) => {
    const actualIndex = state.events.indexOf(ev);
    const displayNumber = idx + 1; // position in sorted list

    const card = document.createElement("div");
    card.className = "event-card";
    card.dataset.id = ev.id;

    const header = document.createElement("div");
    header.className = "event-header-row";

    const titleBox = document.createElement("div");
    const title = document.createElement("div");
    title.className = "event-title";
    const displayName = ev.name || "Unnamed Event";
    title.textContent = `Event ${displayNumber}: ${displayName}`;

    const sub = document.createElement("div");
    sub.className = "event-subtitle";
    const dateStr = ev.date || "No date";
    const typeStr = ev.type || "Type: —";
    sub.textContent = `${dateStr} · ${typeStr}`;

    titleBox.appendChild(title);
    titleBox.appendChild(sub);

    const delBtn = document.createElement("button");
    delBtn.className = "button small secondary";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteEvent(ev.id));

    header.appendChild(titleBox);
    header.appendChild(delBtn);

    const body = document.createElement("div");
    body.className = "event-body";

    body.innerHTML = `
      <div class="section-row">
        <div class="field">
          <label>Event Name</label>
          <input type="text" class="ev-name-input" value="${ev.name || ""}" />
        </div>
        <div class="field">
          <label>Event Date</label>
          <input type="date" class="ev-date-input" value="${ev.date || ""}" />
        </div>
      </div>

      <div class="section-row">
        <div class="field">
          <label>Event Type</label>
          <select class="ev-type-select">
            ${eventTypeOptions(ev.type)}
          </select>
        </div>
        <div class="field">
          <label>Event Notes / Summary</label>
          <textarea class="ev-summary-input" placeholder="Overall summary of what happened.">${ev.summary || ""}</textarea>
        </div>
      </div>

      <div class="subsection-header">
        <div class="inline">
          <span class="subsection-title">Builds</span>
          <button class="button small ev-add-build-btn">+ Add Build</button>
        </div>
        <p class="subsection-note">Structures you are constructing or upgrading during this event.</p>
      </div>
      <div class="mini-list ev-builds-list"></div>

      <div class="subsection-header">
        <div class="inline">
          <span class="subsection-title">Movements</span>
          <button class="button small ev-add-movement-btn">+ Add Movement</button>
        </div>
        <p class="subsection-note">Track unit movements between hexes for this event.</p>
      </div>
      <div class="mini-list ev-movements-list"></div>

      <div class="subsection-header">
        <span class="subsection-title">Offensive Action</span>
        <p class="subsection-note">Land Search, Invasion, or Quest &mdash; only one per event.</p>
      </div>
      <div class="section-row">
        <div class="field">
          <label>Action Type</label>
          <select class="ev-off-type-select">
            ${offensiveTypeOptions(ev.offensiveAction.type)}
          </select>
        </div>
        <div class="field">
          <label>Target Hex / Location</label>
          <input type="text" class="ev-off-target-input" value="${ev.offensiveAction.target || ""}" placeholder="e.g. A3 Forest, Ruins at B5, etc." />
        </div>
      </div>
      <div class="section-row">
        <div class="field">
          <label>Action Notes / Result</label>
          <textarea class="ev-off-notes-input" placeholder="Encounter details, combat outcome, treasure, etc.">${ev.offensiveAction.notes || ""}</textarea>
        </div>
      </div>
    `;

    // Wire basic fields
    body.querySelector(".ev-name-input").addEventListener("input", (e) => {
      ev.name = e.target.value;
      renderEventList();
    });

    body.querySelector(".ev-date-input").addEventListener("input", (e) => {
      ev.date = e.target.value;
      renderEventList();
    });

    body.querySelector(".ev-type-select").addEventListener("change", (e) => {
      ev.type = e.target.value;
      renderEventList();
    });

    body.querySelector(".ev-summary-input").addEventListener("input", (e) => {
      ev.summary = e.target.value;
    });

    // Offensive action
    body.querySelector(".ev-off-type-select").addEventListener("change", (e) => {
      ev.offensiveAction.type = e.target.value;
      renderEventList();
    });

    body.querySelector(".ev-off-target-input").addEventListener("input", (e) => {
      ev.offensiveAction.target = e.target.value;
    });

    body.querySelector(".ev-off-notes-input").addEventListener("input", (e) => {
      ev.offensiveAction.notes = e.target.value;
    });

    // Builds
    const buildsContainer = body.querySelector(".ev-builds-list");
    const addBuildBtn = body.querySelector(".ev-add-build-btn");

    addBuildBtn.addEventListener("click", () => {
      const bid = `b_${nextBuildId++}`;
      ev.builds.push({
        id: bid,
        hexId: "",
        description: ""
      });
      renderEventList();
    });

    ev.builds.forEach((b) => {
      const row = document.createElement("div");
      row.className = "mini-row";
      row.dataset.id = b.id;

      const bodyRow = document.createElement("div");
      bodyRow.className = "mini-row-body two-cols";

      const fieldHex = document.createElement("div");
      fieldHex.className = "field";
      fieldHex.innerHTML = `
        <label>Hex</label>
        <select class="build-hex-select">
          ${buildHexOptions(b.hexId)}
        </select>
      `;

      const fieldDesc = document.createElement("div");
      fieldDesc.className = "field";
      fieldDesc.innerHTML = `
        <label>Description</label>
        <input type="text" class="build-desc-input" value="${b.description || ""}" placeholder="e.g. Build Farm, Upgrade to Town" />
      `;

      bodyRow.appendChild(fieldHex);
      bodyRow.appendChild(fieldDesc);

      const delBtn = document.createElement("button");
      delBtn.className = "button small secondary";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => {
        const idxB = ev.builds.findIndex((x) => x.id === b.id);
        if (idxB !== -1) {
          ev.builds.splice(idxB, 1);
          renderEventList();
        }
      });

      row.appendChild(bodyRow);
      row.appendChild(delBtn);
      buildsContainer.appendChild(row);

      bodyRow.querySelector(".build-hex-select").addEventListener("change", (e) => {
        b.hexId = e.target.value;
      });
      bodyRow.querySelector(".build-desc-input").addEventListener("input", (e) => {
        b.description = e.target.value;
      });
    });

    // Movements
    const movContainer = body.querySelector(".ev-movements-list");
    const addMovBtn = body.querySelector(".ev-add-movement-btn");

    addMovBtn.addEventListener("click", () => {
      const mid = `m_${nextMovementId++}`;
      ev.movements.push({
        id: mid,
        unitName: "",
        from: "",
        to: "",
        notes: ""
      });
      renderEventList();
    });

    ev.movements.forEach((m) => {
      const row = document.createElement("div");
      row.className = "mini-row";
      row.dataset.id = m.id;

      const bodyRow = document.createElement("div");
      bodyRow.className = "mini-row-body";

      const fieldUnit = document.createElement("div");
      fieldUnit.className = "field";
      fieldUnit.innerHTML = `
        <label>Unit</label>
        <input type="text" class="mov-unit-input" value="${m.unitName || ""}" placeholder="e.g. 1st Company, Grove Patrol" />
      `;

      const fieldFrom = document.createElement("div");
      fieldFrom.className = "field";
      fieldFrom.innerHTML = `
        <label>From</label>
        <input type="text" class="mov-from-input" value="${m.from || ""}" placeholder="Hex name or coords" />
      `;

      const fieldTo = document.createElement("div");
      fieldTo.className = "field";
      fieldTo.innerHTML = `
        <label>To</label>
        <input type="text" class="mov-to-input" value="${m.to || ""}" placeholder="Hex name or coords" />
      `;

      const fieldNotes = document.createElement("div");
      fieldNotes.className = "field";
      fieldNotes.innerHTML = `
        <label>Notes</label>
        <input type="text" class="mov-notes-input" value="${m.notes || ""}" placeholder="Scouting, escort, etc." />
      `;

      bodyRow.appendChild(fieldUnit);
      bodyRow.appendChild(fieldFrom);
      bodyRow.appendChild(fieldTo);
      bodyRow.appendChild(fieldNotes);

      const delBtn = document.createElement("button");
      delBtn.className = "button small secondary";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => {
        const idxM = ev.movements.findIndex((x) => x.id === m.id);
        if (idxM !== -1) {
          ev.movements.splice(idxM, 1);
          renderEventList();
        }
      });

      row.appendChild(bodyRow);
      row.appendChild(delBtn);
      movContainer.appendChild(row);

      bodyRow.querySelector(".mov-unit-input").addEventListener("input", (e) => {
        m.unitName = e.target.value;
      });
      bodyRow.querySelector(".mov-from-input").addEventListener("input", (e) => {
        m.from = e.target.value;
      });
      bodyRow.querySelector(".mov-to-input").addEventListener("input", (e) => {
        m.to = e.target.value;
      });
      bodyRow.querySelector(".mov-notes-input").addEventListener("input", (e) => {
        m.notes = e.target.value;
      });
    });

    card.appendChild(header);
    card.appendChild(body);
    container.appendChild(card);
  });

  // ensure sort select reflects current direction
  if ($("eventSortOrder")) $("eventSortOrder").value = eventSortDirection;
}

function eventTypeOptions(current) {
  const list = [
    "",
    "Day Event",
    "Campout",
    "Festival Event",
    "Virtual Event"
  ];
  return list
    .map((val) => {
      const label = val || "-- Select Type --";
      const selected = val === current ? "selected" : "";
      return `<option value="${val}" ${selected}>${label}</option>`;
    })
    .join("");
}

function offensiveTypeOptions(current) {
  const list = ["", "Land Search", "Invasion", "Quest"];
  return list
    .map((val) => {
      const label = val || "None";
      const selected = val === current ? "selected" : "";
      return `<option value="${val}" ${selected}>${label}</option>`;
    })
    .join("");
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

// ---------- SEASONS (RESOURCE GAINS) ----------
function wireSeasons() {
  const seasonSelect = $("seasonSelect");
  if (seasonSelect) {
    seasonSelect.addEventListener("change", () => {
      saveSeasonFromUI(); // save old season
      currentSeason = seasonSelect.value || "Spring";
      syncSeasonUI(); // load new
    });
  }

  // Inputs for current season
  const fields = [
    { id: "seasonFood", key: "food" },
    { id: "seasonWood", key: "wood" },
    { id: "seasonStone", key: "stone" },
    { id: "seasonOre", key: "ore" },
    { id: "seasonSilver", key: "silver" },
    { id: "seasonGold", key: "gold" }
  ];

  fields.forEach(({ id, key }) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", () => {
      const val = parseInt(el.value, 10);
      state.seasons[currentSeason][key] =
        isNaN(val) || val < 0 ? 0 : val;
      el.value = state.seasons[currentSeason][key];
    });
  });

  const notesEl = $("seasonNotes");
  if (notesEl) {
    notesEl.addEventListener("input", () => {
      state.seasons[currentSeason].notes = notesEl.value;
    });
  }
}

function saveSeasonFromUI() {
  const s = state.seasons[currentSeason];
  if (!s) return;

  const fields = [
    { id: "seasonFood", key: "food" },
    { id: "seasonWood", key: "wood" },
    { id: "seasonStone", key: "stone" },
    { id: "seasonOre", key: "ore" },
    { id: "seasonSilver", key: "silver" },
    { id: "seasonGold", key: "gold" }
  ];

  fields.forEach(({ id, key }) => {
    const el = $(id);
    if (!el) return;
    const val = parseInt(el.value, 10);
    s[key] = isNaN(val) || val < 0 ? 0 : val;
  });

  const notesEl = $("seasonNotes");
  if (notesEl) {
    s.notes = notesEl.value || "";
  }
}

function syncSeasonUI() {
  if ($("seasonSelect")) $("seasonSelect").value = currentSeason;
  const s = state.seasons[currentSeason];

  if (!s) return;

  if ($("seasonFood")) $("seasonFood").value = s.food ?? 0;
  if ($("seasonWood")) $("seasonWood").value = s.wood ?? 0;
  if ($("seasonStone")) $("seasonStone").value = s.stone ?? 0;
  if ($("seasonOre")) $("seasonOre").value = s.ore ?? 0;
  if ($("seasonSilver")) $("seasonSilver").value = s.silver ?? 0;
  if ($("seasonGold")) $("seasonGold").value = s.gold ?? 0;
  if ($("seasonNotes")) $("seasonNotes").value = s.notes || "";
}
