// ---------- STATE MODEL ----------
const state = {
  factionName: "",
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
  a.download = `${faction}_state.json`;
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
        hexNumber: h.hexNumber || h.hex_number || h.coords || "",
        name: h.name || "",
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
        },
        detailsOpen: !!ev.detailsOpen
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
  const notesInput = $("factionNotes");

  if (nameInput) {
    nameInput.addEventListener("input", () => {
      state.factionName = nameInput.value;
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
    const displayNumber = hex.hexNumber || "(No Hex #)";
    const displayName = hex.name || "(Unnamed Hex)";
    title.textContent = `${displayNumber} — ${displayName}`;

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
          <label>Hex Number</label>
          <input type="text" class="hex-number-input" value="${hex.hexNumber || ""}" placeholder="e.g. A3, B5" />
        </div>
        <div class="field">
          <label>Name</label>
          <input type="text" class="hex-name-input" value="${hex.name || ""}" placeholder="e.g. Gravewood Forest" />
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

    // Attach listeners WITHOUT re-rendering the whole list
    const numberInput = body.querySelector(".hex-number-input");
    const nameInput = body.querySelector(".hex-name-input");
    const terrainSelect = body.querySelector(".hex-terrain-select");
    const structureSelect = body.querySelector(".hex-structure-select");
    const primarySelect = body.querySelector(".hex-primary-select");
    const secondarySelect = body.querySelector(".hex-secondary-select");
    const tertiarySelect = body.querySelector(".hex-tertiary-select");
    const notesInput = body.querySelector(".hex-notes-input");

    numberInput.addEventListener("input", (e) => {
      hex.hexNumber = e.target.value;
      const newNumber = hex.hexNumber || "(No Hex #)";
      const newName = hex.name || "(Unnamed Hex)";
      title.textContent = `${newNumber} — ${newName}`;
    });

    nameInput.addEventListener("input", (e) => {
      hex.name = e.target.value;
      const newNumber = hex.hexNumber || "(No Hex #)";
      const newName = hex.name || "(Unnamed Hex)";
      title.textContent = `${newNumber} — ${newName}`;
    });

    terrainSelect.addEventListener("change", (e) => {
      hex.terrain = e.target.value;
      const primary = hex.primary || "None";
      const structure = hex.structure || "No Structure";
      sub.textContent = `Primary: ${primary} · Structure: ${structure}`;
    });

    structureSelect.addEventListener("change", (e) => {
      hex.structure = e.target.value;
      const primary = hex.primary || "None";
      const structure = hex.structure || "No Structure";
      sub.textContent = `Primary: ${primary} · Structure: ${structure}`;
    });

    primarySelect.addEventListener("change", (e) => {
      hex.primary = e.target.value;
      const primary = hex.primary || "None";
      const structure = hex.structure || "No Structure";
      sub.textContent = `Primary: ${primary} · Structure: ${structure}`;
    });

    secondarySelect.addEventListener("change", (e) => {
      hex.secondary = e.target.value;
    });

    tertiarySelect.addEventListener("change", (e) => {
      hex.tertiary = e.target.value;
    });

    notesInput.addEventListener("input", (e) => {
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
    hexNumber: "",
    name: "",
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
    addEventBtn.addEventListener("click", addEventFromForm);
  }
}

function addEventFromForm() {
  const nameInput = $("newEventName");
  const dateInput = $("newEventDate");
  const typeSelect = $("newEventType");

  if (!nameInput || !dateInput || !typeSelect) return;

  const name = nameInput.value.trim();
  const date = dateInput.value;
  const type = typeSelect.value;

  const id = `ev_${nextEventId++}`;
  state.events.push({
    id,
    name,
    date,
    type,
    summary: "",
    builds: [],
    movements: [],
    offensiveAction: {
      type: "",
      target: "",
      notes: ""
    },
    detailsOpen: true // newly added event starts expanded
  });

  // Clear form (keep type for convenience)
  nameInput.value = "";
  dateInput.value = "";

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
      const idxA = state.events.indexOf(a);
      const idxB = state.events.indexOf(b);
      return idxA - idxB;
    }
    return da - db;
  });

  if (eventSortDirection === "desc") {
    eventsCopy.reverse();
  }

  eventsCopy.forEach((ev) => {
    const card = document.createElement("div");
    card.className = "event-card";
    card.dataset.id = ev.id;

    // Header (Name | Date | Type | Details/Delete)
    const header = document.createElement("div");
    header.className = "event-header-row";

    const grid = document.createElement("div");
    grid.className = "event-header-grid";

    const nameCell = document.createElement("div");
    nameCell.className = "event-col-name";
    nameCell.textContent = ev.name || "Unnamed Event";

    const dateCell = document.createElement("div");
    dateCell.className = "event-col-date";
    dateCell.textContent = ev.date || "No date";

    const typeCell = document.createElement("div");
    typeCell.className = "event-col-type";
    typeCell.textContent = ev.type || "Type: —";

    const actionsCell = document.createElement("div");
    actionsCell.className = "event-actions";

    const detailsBtn = document.createElement("button");
    detailsBtn.className = "button small secondary";
    detailsBtn.textContent = ev.detailsOpen ? "Hide Details" : "Details";

    const delBtn = document.createElement("button");
    delBtn.className = "button small secondary";
    d
