// Faction Tracker Script - redesigned

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
  seasonGains: [] // array of {id, season, year, food, wood, stone, ore, silver, gold, notes}
};

let nextHexId = 1;
let nextEventId = 1;
let nextBuildId = 1;
let nextMovementId = 1;
let nextSeasonGainId = 1;

const TERRAIN_OPTIONS = [
  "Plains",
  "Forest",
  "Mountain",
  "Sea",
  "Blasted Lands"
];

const STRUCTURE_GROUPS = {
  Improvements: [
    "Market",
    "Carpenter's Shop",
    "Blacksmith",
    "Bank",
    "Stone Mason's Shop"
  ],
  Fortifications: ["Watch Tower", "Fort", "Castle"],
  "Seaborne assets": ["Dock", "Fishing Fleet", "Trading Vessel", "War Galley"]
};

const ALL_STRUCTURES = Object.values(STRUCTURE_GROUPS).flat();

let eventSortDirection = "asc"; // "asc" or "desc"

// ---------- DOM HELPERS ----------
function $(id) {
  return document.getElementById(id);
}

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  wireTopControls();
  wireFactionInfo();
  wireCoffers();
  wireSeasonGains();
  wireEvents();
  wireHexForm();
  loadUpkeepTable();

  renderHexList();
  renderEventList();
  renderSeasonGainList();

  // default year input for seasons
  const seasonYearInput = $("seasonYear");
  if (seasonYearInput && !seasonYearInput.value) {
    seasonYearInput.value = new Date().getFullYear();
  }
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

  const faction =
    state.factionName && state.factionName.trim().length
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

  // Hexes
  state.hexes = Array.isArray(obj.hexes)
    ? obj.hexes.map((h) => ({
        id: h.id || `hex_${nextHexId++}`,
        hexNumber: h.hexNumber || h.hex_number || h.coords || "",
        name: h.name || "",
        terrain: h.terrain || "",
        structure: h.structure || "",
        notes: h.notes || "",
        detailsOpen: !!h.detailsOpen
      }))
    : [];

  // Events
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

  // Seasonal gains list (new format)
  state.seasonGains = Array.isArray(obj.seasonGains)
    ? obj.seasonGains.map((sg) => ({
        id: sg.id || `sg_${nextSeasonGainId++}`,
        season: sg.season || "Spring",
        year: Number(sg.year ?? new Date().getFullYear()),
        food: Number(sg.food ?? 0),
        wood: Number(sg.wood ?? 0),
        stone: Number(sg.stone ?? 0),
        ore: Number(sg.ore ?? 0),
        silver: Number(sg.silver ?? 0),
        gold: Number(sg.gold ?? 0),
        notes: sg.notes || ""
      }))
    : [];

  // recalc counters
  nextHexId = calcNextNumericId(state.hexes, "hex_");
  nextEventId = calcNextNumericId(state.events, "ev_");
  nextBuildId = calcNextNumericId(flattenBuilds(state.events), "b_");
  nextMovementId = calcNextNumericId(flattenMovements(state.events), "m_");
  nextSeasonGainId = calcNextNumericId(state.seasonGains, "sg_");

  syncFactionInfoToUI();
  syncCoffersToUI();
  renderHexList();
  renderEventList();
  renderSeasonGainList();
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

// ---------- HEXES & UPKEEP ----------
let upkeepTable = {};

function loadUpkeepTable() {
  fetch("upkeep.csv")
    .then((r) => r.text())
    .then((text) => {
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
      if (lines.length < 2) return;

      const header = lines[0].split(",").map((h) => h.trim());
      const idxUpgrade = header.indexOf("Upgrade");
      const idxFood = header.indexOf("Food");
      const idxWood = header.indexOf("Wood");
      const idxStone = header.indexOf("Stone");
      const idxGold = header.indexOf("Gold");

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        const name = cols[idxUpgrade] || "";
        if (!name) continue;
        const food = parseInt(cols[idxFood] || "0", 10) || 0;
        const wood = parseInt(cols[idxWood] || "0", 10) || 0;
        const stone = parseInt(cols[idxStone] || "0", 10) || 0;
        const gold = parseInt(cols[idxGold] || "0", 10) || 0;
        upkeepTable[name] = { food, wood, stone, gold };
      }
    })
    .catch(() => {
      upkeepTable = {};
    });
}

function wireHexForm() {
  const addHexBtn = $("addHexBtn");
  if (addHexBtn && !addHexBtn._wired) {
    addHexBtn.addEventListener("click", () => addHex());
    addHexBtn._wired = true;
  }

  const structAddBtn = $("addHexStructureBtn");
  const structSelect = $("newHexStructureSelect");
  const structList = $("newHexStructures");

  if (structAddBtn && !structAddBtn._wired) {
    structAddBtn.addEventListener("click", () => {
      if (!structSelect || !structList) return;
      const val = (structSelect.value || "").trim();
      if (!val) return;

      const current = structList.value
        ? structList.value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      if (!current.includes(val)) {
        current.push(val);
        structList.value = current.join(", ");
      }

      structSelect.value = "";
    });
    structAddBtn._wired = true;
  }

  // Terrain multi-select (Option A: Add button)
  const terrainAddBtn = $("addHexTerrainBtn");
  const terrainSelect = $("newHexTerrainSelect");
  const terrainList = $("newHexTerrains");

  if (terrainAddBtn && !terrainAddBtn._wired) {
    terrainAddBtn.addEventListener("click", () => {
      if (!terrainSelect || !terrainList) return;
      const val = (terrainSelect.value || "").trim();
      if (!val) return;

      const current = terrainList.value
        ? terrainList.value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      if (!current.includes(val)) {
        current.push(val);
        terrainList.value = current.join(", ");
      }

      terrainSelect.value = "";
    });
    terrainAddBtn._wired = true;
  }
}

function calcHexUpkeep(hex) {
  const result = { food: 0, wood: 0, stone: 0, gold: 0 };
  if (!hex.structure) return result;

  const names = hex.structure
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  names.forEach((name) => {
    const row = upkeepTable[name];
    if (!row) return;
    result.food += row.food || 0;
    result.wood += row.wood || 0;
    result.stone += row.stone || 0;
    result.gold += row.gold || 0;
  });

  return result;
}

function addHex() {
  const nameInput = $("newHexName");
  const numInput = $("newHexNumber");
  const terrainSelect = $("newHexTerrainSelect");
  const terrainList = $("newHexTerrains");
  const structList = $("newHexStructures");
  const notesInput = $("newHexNotes");

  if (!nameInput || !numInput) return;

  const name = nameInput.value.trim();
  const hexNumber = numInput.value.trim();

  let terrain = "";
  if (terrainList && terrainList.value.trim()) {
    terrain = terrainList.value.trim();
  } else if (terrainSelect) {
    terrain = terrainSelect.value.trim();
  }

  const structure = structList ? structList.value.trim() : "";
  const notes = notesInput ? notesInput.value.trim() : "";

  if (!name && !hexNumber && !terrain && !structure && !notes) return;

  const id = `hex_${nextHexId++}`;
  state.hexes.push({
    id,
    name,
    hexNumber,
    terrain,
    structure,
    notes,
    detailsOpen: false
  });

  nameInput.value = "";
  numInput.value = "";
  if (terrainSelect) terrainSelect.value = "";
  if (terrainList) terrainList.value = "";
  if (structList) structList.value = "";
  if (notesInput) notesInput.value = "";

  renderHexList();
}

function editHex(hexId) {
  const hex = state.hexes.find((h) => h.id === hexId);
  if (!hex) return;

  const nameInput = $("newHexName");
  const numInput = $("newHexNumber");
  const terrainSelect = $("newHexTerrainSelect");
  const terrainList = $("newHexTerrains");
  const structList = $("newHexStructures");
  const notesInput = $("newHexNotes");

  if (nameInput) nameInput.value = hex.name || "";
  if (numInput) numInput.value = hex.hexNumber || "";

  if (terrainList) terrainList.value = hex.terrain || "";
  if (terrainSelect) {
    const firstTerrain =
      (hex.terrain || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)[0] || "";
    terrainSelect.value = firstTerrain;
  }

  if (structList) structList.value = hex.structure || "";
  if (notesInput) notesInput.value = hex.notes || "";

  state.hexes = state.hexes.filter((h) => h.id !== hexId);
  renderHexList();

  const card = $("controlledHexesCard");
  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function deleteHex(id) {
  if (!confirm("Delete this hex from the faction?")) return;
  state.hexes = state.hexes.filter((h) => h.id !== id);
  renderHexList();
}

function renderHexList() {
  const tbody = $("hexListBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  state.hexes.forEach((hex) => {
    const upkeep = calcHexUpkeep(hex);

    const row = document.createElement("tr");
    row.className = "hex-main-row";

    const nameCell = document.createElement("td");
    nameCell.textContent = hex.name || "(Unnamed)";

    const hexCell = document.createElement("td");
    hexCell.textContent = hex.hexNumber || "";

    const foodCell = document.createElement("td");
    foodCell.textContent = upkeep.food ? upkeep.food : "";

    const woodCell = document.createElement("td");
    woodCell.textContent = upkeep.wood ? upkeep.wood : "";

    const stoneCell = document.createElement("td");
    stoneCell.textContent = upkeep.stone ? upkeep.stone : "";

    const goldCell = document.createElement("td");
    goldCell.textContent = upkeep.gold ? upkeep.gold : "";

    const detailsCell = document.createElement("td");
    detailsCell.style.textAlign = "center";

    const detailsBtn = document.createElement("button");
    detailsBtn.className = "button small secondary";
    detailsBtn.textContent = hex.detailsOpen ? "Hide" : "Details";
    detailsCell.appendChild(detailsBtn);

    row.appendChild(nameCell);
    row.appendChild(hexCell);
    row.appendChild(foodCell);
    row.appendChild(woodCell);
    row.appendChild(stoneCell);
    row.appendChild(goldCell);
    row.appendChild(detailsCell);

    const detailsRow = document.createElement("tr");
    detailsRow.className = "hex-details-row";
    detailsRow.style.display = hex.detailsOpen ? "" : "none";

    const detailsTd = document.createElement("td");
    detailsTd.colSpan = 7;
    detailsTd.innerHTML = `
      <strong>Terrain:</strong> ${hex.terrain || "—"}<br/>
      <strong>Structures:</strong> ${hex.structure || "—"}<br/>
      <strong>Notes:</strong> ${hex.notes || "—"}<br/><br/>
      <button class="button small secondary hex-edit-btn">Edit</button>
      <button class="button small secondary hex-delete-btn">Delete</button>
    `;
    detailsRow.appendChild(detailsTd);

    detailsBtn.addEventListener("click", () => {
      hex.detailsOpen = !hex.detailsOpen;
      detailsRow.style.display = hex.detailsOpen ? "" : "none";
      detailsBtn.textContent = hex.detailsOpen ? "Hide" : "Details";
    });

    detailsTd
      .querySelector(".hex-edit-btn")
      .addEventListener("click", () => editHex(hex.id));
    detailsTd
      .querySelector(".hex-delete-btn")
      .addEventListener("click", () => deleteHex(hex.id));

    tbody.appendChild(row);
    tbody.appendChild(detailsRow);
  });
}

// ---------- EVENTS & TURN ACTIONS ----------
function wireEvents() {
  const addEventBtn = $("addEventBtn");
  if (addEventBtn && !addEventBtn._wired) {
    addEventBtn.addEventListener("click", addEventFromForm);
    addEventBtn._wired = true;
  }
  wireEventSortHeader();
}

function wireEventSortHeader() {
  const hdr = $("eventDateSortHeader");
  if (!hdr || hdr._wired) return;
  hdr.addEventListener("click", () => {
    eventSortDirection = eventSortDirection === "asc" ? "desc" : "asc";
    renderEventList();
  });
  hdr._wired = true;
}

function updateEventSortHeaderLabel() {
  const hdr = $("eventDateSortHeader");
  if (!hdr) return;
  hdr.textContent = eventSortDirection === "asc" ? "Date ▲" : "Date ▼";
}

function addEventFromForm() {
  const nameInput = $("newEventName");
  const dateInput = $("newEventDate");
  const typeSelect = $("newEventType");

  if (!nameInput || !dateInput || !typeSelect) return;

  const name = nameInput.value.trim();
  const date = dateInput.value;
  const type = typeSelect.value;

  if (!name && !date && !type) return;

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
}

// Global helper for builds: which structures are still available in this hex?
function getAvailableStructuresForHexId(hexId) {
  if (!hexId) return ALL_STRUCTURES.slice();

  const hex = state.hexes.find((h) => h.id === hexId);
  if (!hex || !hex.structure) return ALL_STRUCTURES.slice();

  const existing = hex.structure
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return ALL_STRUCTURES.filter((name) => !existing.includes(name));
}

// Global helper: build <select> options for structures
function structureSelectOptions(selected, availableList) {
  // availableList is already the filtered list from getAvailableStructuresForHexId()
  const available = new Set(availableList || ALL_STRUCTURES);

  let html = '<option value="">-- Select Upgrade --</option>';

  Object.entries(STRUCTURE_GROUPS).forEach(([groupName, items]) => {

    // Only show items that are still allowed OR are currently selected
    const filtered = items.filter(item => {
      if (item === selected) return true;  // keep current choice visible
      return available.has(item);          // show only unbuilt upgrades
    });

    if (!filtered.length) return;

    html += `<optgroup label="${groupName}">`;
    filtered.forEach(item => {
      const sel = item === selected ? "selected" : "";
      html += `<option value="${item}" ${sel}>${item}</option>`;
    });
    html += "</optgroup>";
  });

  return html;
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
    delBtn.textContent = "Delete";

    actionsCell.appendChild(detailsBtn);
    actionsCell.appendChild(delBtn);

    grid.appendChild(nameCell);
    grid.appendChild(dateCell);
    grid.appendChild(typeCell);
    grid.appendChild(actionsCell);

    header.appendChild(grid);

    // Body (details)
    const body = document.createElement("div");
    body.className = "event-body";
    body.style.display = ev.detailsOpen ? "" : "none";

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
          <input type="text" class="ev-off-target-input" value="${
            ev.offensiveAction.target || ""
          }" placeholder="e.g. A3 Forest, Ruins at B5, etc." />
        </div>
      </div>
      <div class="section-row">
        <div class="field">
          <label>Action Notes / Result</label>
          <textarea class="ev-off-notes-input" placeholder="Encounter details, combat outcome, treasure, etc.">${
            ev.offensiveAction.notes || ""
          }</textarea>
        </div>
      </div>
    `;

    // Header buttons
    detailsBtn.addEventListener("click", () => {
      ev.detailsOpen = !ev.detailsOpen;
      body.style.display = ev.detailsOpen ? "" : "none";
      detailsBtn.textContent = ev.detailsOpen ? "Hide Details" : "Details";
    });

    delBtn.addEventListener("click", () => deleteEvent(ev.id));

    // Details fields
    const nameInput = body.querySelector(".ev-name-input");
    const dateInput = body.querySelector(".ev-date-input");
    const typeSelect = body.querySelector(".ev-type-select");
    const summaryInput = body.querySelector(".ev-summary-input");
    const offTypeSelect = body.querySelector(".ev-off-type-select");
    const offTargetInput = body.querySelector(".ev-off-target-input");
    const offNotesInput = body.querySelector(".ev-off-notes-input");

    nameInput.addEventListener("input", (e) => {
      ev.name = e.target.value;
      nameCell.textContent = ev.name || "Unnamed Event";
    });

    dateInput.addEventListener("input", (e) => {
      ev.date = e.target.value;
      dateCell.textContent = ev.date || "No date";
    });

    typeSelect.addEventListener("change", (e) => {
      ev.type = e.target.value;
      typeCell.textContent = ev.type || "Type: —";
    });

    summaryInput.addEventListener("input", (e) => {
      ev.summary = e.target.value;
    });

    offTypeSelect.addEventListener("change", (e) => {
      ev.offensiveAction.type = e.target.value;
    });

    offTargetInput.addEventListener("input", (e) => {
      ev.offensiveAction.target = e.target.value;
    });

    offNotesInput.addEventListener("input", (e) => {
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
        description: "" // will hold the selected upgrade name
      });
      renderEventList();
    });

    ev.builds.forEach((b) => {
      const row = document.createElement("div");
      row.className = "mini-row";
      row.dataset.id = b.id;

      const bodyRow = document.createElement("div");
      bodyRow.className = "mini-row-body two-cols";

      // Hex selection
      const fieldHex = document.createElement("div");
      fieldHex.className = "field";
      fieldHex.innerHTML = `
        <label>Hex</label>
        <select class="build-hex-select">
          ${buildHexOptions(b.hexId)}
        </select>
      `;

      // Upgrade selection (filtered by hex)
      const availableForHex = getAvailableStructuresForHexId(b.hexId);
      const fieldUpgrade = document.createElement("div");
      fieldUpgrade.className = "field";
      fieldUpgrade.innerHTML = `
        <label>Upgrade</label>
        <select class="build-structure-select">
          ${structureSelectOptions(b.description || "", availableForHex)}
        </select>
      `;

      bodyRow.appendChild(fieldHex);
      bodyRow.appendChild(fieldUpgrade);

      const delBuildBtn = document.createElement("button");
      delBuildBtn.className = "button small secondary";
      delBuildBtn.textContent = "Delete";
      delBuildBtn.addEventListener("click", () => {
        const idxB = ev.builds.findIndex((x) => x.id === b.id);
        if (idxB !== -1) {
          ev.builds.splice(idxB, 1);
          renderEventList();
        }
      });

      row.appendChild(bodyRow);
      row.appendChild(delBuildBtn);
      buildsContainer.appendChild(row);

      // Wiring
      const hexSelectEl = bodyRow.querySelector(".build-hex-select");
      const structSelectEl = bodyRow.querySelector(".build-structure-select");

      hexSelectEl.addEventListener("change", (e) => {
        b.hexId = e.target.value;
        // When hex changes, re-render to recalc available upgrades
        renderEventList();
      });

      structSelectEl.addEventListener("change", (e) => {
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
        <input type="text" class="mov-unit-input" value="${
          m.unitName || ""
        }" placeholder="e.g. 1st Company, Grove Patrol" />
      `;

      const fieldFrom = document.createElement("div");
      fieldFrom.className = "field";
      fieldFrom.innerHTML = `
        <label>From</label>
        <input type="text" class="mov-from-input" value="${
          m.from || ""
        }" placeholder="Hex name or hex number" />
      `;

      const fieldTo = document.createElement("div");
      fieldTo.className = "field";
      fieldTo.innerHTML = `
        <label>To</label>
        <input type="text" class="mov-to-input" value="${
          m.to || ""
        }" placeholder="Hex name or hex number" />
      `;

      const fieldNotes = document.createElement("div");
      fieldNotes.className = "field";
      fieldNotes.innerHTML = `
        <label>Notes</label>
        <input type="text" class="mov-notes-input" value="${
          m.notes || ""
        }" placeholder="Scouting, escort, etc." />
      `;

      bodyRow.appendChild(fieldUnit);
      bodyRow.appendChild(fieldFrom);
      bodyRow.appendChild(fieldTo);
      bodyRow.appendChild(fieldNotes);

      const delMovBtn = document.createElement("button");
      delMovBtn.className = "button small secondary";
      delMovBtn.textContent = "Delete";
      delMovBtn.addEventListener("click", () => {
        const idxM = ev.movements.findIndex((x) => x.id === m.id);
        if (idxM !== -1) {
          ev.movements.splice(idxM, 1);
          renderEventList();
        }
      });

      row.appendChild(bodyRow);
      row.appendChild(delMovBtn);
      movContainer.appendChild(row);

      bodyRow
        .querySelector(".mov-unit-input")
        .addEventListener("input", (e) => {
          m.unitName = e.target.value;
        });
      bodyRow
        .querySelector(".mov-from-input")
        .addEventListener("input", (e) => {
          m.from = e.target.value;
        });
      bodyRow.querySelector(".mov-to-input").addEventListener("input", (e) => {
        m.to = e.target.value;
      });
      bodyRow
        .querySelector(".mov-notes-input")
        .addEventListener("input", (e) => {
          m.notes = e.target.value;
        });
    });

    card.appendChild(header);
    card.appendChild(body);
    container.appendChild(card);
  });

  updateEventSortHeaderLabel();
}

function eventTypeOptions(current) {
  const list = ["", "Day Event", "Campout", "Festival Event", "Virtual Event"];
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
      const label =
        (h.hexNumber || "(No Hex #)") + (h.name ? ` — ${h.name}` : "");
      const selected = h.id === selectedId ? "selected" : "";
      return `<option value="${h.id}" ${selected}>${label}</option>`;
    })
    .join("");
  return none + options;
}

// ---------- SEASONAL GAINS (LOG) ----------
function wireSeasonGains() {
  const addBtn = $("addSeasonGainBtn");
  if (addBtn && !addBtn._wired) {
    addBtn.addEventListener("click", addSeasonGainFromForm);
    addBtn._wired = true;
  }
}

function addSeasonGainFromForm() {
  const seasonSelect = $("seasonSelect");
  const yearInput = $("seasonYear");
  const foodInput = $("seasonFood");
  const woodInput = $("seasonWood");
  const stoneInput = $("seasonStone");
  const oreInput = $("seasonOre");
  const silverInput = $("seasonSilver");
  const goldInput = $("seasonGold");
  const notesInput = $("seasonNotes");

  if (!seasonSelect || !yearInput) return;

  const season = seasonSelect.value || "Spring";
  const yearVal = parseInt(yearInput.value, 10);
  const year = isNaN(yearVal) ? new Date().getFullYear() : yearVal;

  const food = parseInt(foodInput?.value || "0", 10) || 0;
  const wood = parseInt(woodInput?.value || "0", 10) || 0;
  const stone = parseInt(stoneInput?.value || "0", 10) || 0;
  const ore = parseInt(oreInput?.value || "0", 10) || 0;
  const silver = parseInt(silverInput?.value || "0", 10) || 0;
  const gold = parseInt(goldInput?.value || "0", 10) || 0;
  const notes = notesInput ? notesInput.value.trim() : "";

  if (
    !season &&
    !year &&
    !food &&
    !wood &&
    !stone &&
    !ore &&
    !silver &&
    !gold &&
    !notes
  ) {
    return;
  }

  const id = `sg_${nextSeasonGainId++}`;
  state.seasonGains.push({
    id,
    season,
    year,
    food,
    wood,
    stone,
    ore,
    silver,
    gold,
    notes
  });

  // Clear numeric fields but keep season & year (for next roll)
  if (foodInput) foodInput.value = "";
  if (woodInput) woodInput.value = "";
  if (stoneInput) stoneInput.value = "";
  if (oreInput) oreInput.value = "";
  if (silverInput) silverInput.value = "";
  if (goldInput) goldInput.value = "";
  if (notesInput) notesInput.value = "";

  renderSeasonGainList();
}

function editSeasonGain(id) {
  const entry = state.seasonGains.find((sg) => sg.id === id);
  if (!entry) return;

  const seasonSelect = $("seasonSelect");
  const yearInput = $("seasonYear");
  const foodInput = $("seasonFood");
  const woodInput = $("seasonWood");
  const stoneInput = $("seasonStone");
  const oreInput = $("seasonOre");
  const silverInput = $("seasonSilver");
  const goldInput = $("seasonGold");
  const notesInput = $("seasonNotes");

  if (seasonSelect) seasonSelect.value = entry.season || "Spring";
  if (yearInput) yearInput.value = entry.year || new Date().getFullYear();
  if (foodInput) foodInput.value = entry.food || "";
  if (woodInput) woodInput.value = entry.wood || "";
  if (stoneInput) foodInput.value = entry.stone || "";
  if (oreInput) oreInput.value = entry.ore || "";
  if (silverInput) silverInput.value = entry.silver || "";
  if (goldInput) goldInput.value = entry.gold || "";
  if (notesInput) notesInput.value = entry.notes || "";

  state.seasonGains = state.seasonGains.filter((sg) => sg.id !== id);
  renderSeasonGainList();

  const card = $("seasonalGainsCard");
  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function deleteSeasonGain(id) {
  if (!confirm("Delete this seasonal gain entry?")) return;
  state.seasonGains = state.seasonGains.filter((sg) => sg.id !== id);
  renderSeasonGainList();
}

function renderSeasonGainList() {
  const tbody = $("seasonTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  state.seasonGains.forEach((sg) => {
    const tr = document.createElement("tr");

    function td(text) {
      const cell = document.createElement("td");
      cell.textContent = text;
      return cell;
    }

    tr.appendChild(td(sg.season || ""));
    tr.appendChild(td(sg.year || ""));
    tr.appendChild(td(sg.food || ""));
    tr.appendChild(td(sg.wood || ""));
    tr.appendChild(td(sg.stone || ""));
    tr.appendChild(td(sg.ore || ""));
    tr.appendChild(td(sg.silver || ""));
    tr.appendChild(td(sg.gold || ""));
    tr.appendChild(td(sg.notes || ""));

    const actionsTd = document.createElement("td");
    actionsTd.style.whiteSpace = "nowrap";
    const editBtn = document.createElement("button");
    editBtn.className = "button small secondary";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => editSeasonGain(sg.id));

    const delBtn = document.createElement("button");
    delBtn.className = "button small secondary";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteSeasonGain(sg.id));

    actionsTd.appendChild(editBtn);
    actionsTd.appendChild(delBtn);
    tr.appendChild(actionsTd);

    tbody.appendChild(tr);
  });
}
