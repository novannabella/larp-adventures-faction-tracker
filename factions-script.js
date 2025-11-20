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
  wireHexForm();
  loadUpkeepTable();

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

// ---------- HEXES & UPKEEP ----------
let upkeepTable = {};

function loadUpkeepTable() {
  fetch("upkeep.csv")
    .then((r) => r.text())
    .then((text) => {
      const lines = text.split(/\r?\n/)
?
/).filter((l) => l.trim().length);
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
  const terrainAddBtn = $("addHexTerrainBtn");
  const structAddBtn = $("addHexStructureBtn");
  const terrainSelect = $("newHexTerrainSelect");
  const structSelect = $("newHexStructureSelect");
  const terrainList = $("newHexTerrainList");
  const structList = $("newHexStructures");
  const addHexBtn = $("addHexBtn");

  if (terrainAddBtn && !terrainAddBtn._wired) {
    terrainAddBtn.addEventListener("click", () => {
      if (!terrainSelect || !terrainList) return;
      const val = terrainSelect.value;
      if (!val) return;
      const current = terrainList.value
        ? terrainList.value.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      if (!current.includes(val)) current.push(val);
      terrainList.value = current.join(", ");
      terrainSelect.value = "";
    });
    terrainAddBtn._wired = true;
  }

  if (structAddBtn && !structAddBtn._wired) {
    structAddBtn.addEventListener("click", () => {
      if (!structSelect || !structList) return;
      const val = structSelect.value;
      if (!val) return;
      const current = structList.value
        ? structList.value.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      if (!current.includes(val)) current.push(val);
      structList.value = current.join(", ");
      structSelect.value = "";
    });
    structAddBtn._wired = true;
  }

  if (addHexBtn && !addHexBtn._wired) {
    addHexBtn.addEventListener("click", () => {
      addHex();
    });
    addHexBtn._wired = true;
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
  const terrainList = $("newHexTerrainList");
  const structList = $("newHexStructures");
  const notesInput = $("newHexNotes");

  if (!nameInput || !numInput || !terrainList || !structList || !notesInput)
    return;

  const name = nameInput.value.trim();
  const hexNumber = numInput.value.trim();
  const terrain = terrainList.value.trim();
  const structure = structList.value.trim();
  const notes = notesInput.value.trim();

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
  terrainList.value = "";
  structList.value = "";
  notesInput.value = "";

  renderHexList();
}

function editHex(hexId) {
  const hex = state.hexes.find((h) => h.id === hexId);
  if (!hex) return;

  $("newHexName").value = hex.name || "";
  $("newHexNumber").value = hex.hexNumber || "";
  $("newHexTerrainList").value = hex.terrain || "";
  $("newHexStructures").value = hex.structure || "";
  $("newHexNotes").value = hex.notes || "";

  const terrainSelect = $("newHexTerrainSelect");
  const structSelect = $("newHexStructureSelect");
  if (terrainSelect) terrainSelect.value = "";
  if (structSelect) structSelect.value = "";

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
  if (addEventBtn) {
    addEventBtn.addEventListener("click", addEventFromForm);
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
        <input type="text" class="mov-from-input" value="${m.from || ""}" placeholder="Hex name or hex number" />
      `;

      const fieldTo = document.createElement("div");
      fieldTo.className = "field";
      fieldTo.innerHTML = `
        <label>To</label>
        <input type="text" class="mov-to-input" value="${m.to || ""}" placeholder="Hex name or hex number" />
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

  updateEventSortHeaderLabel();
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
      const label =
        (h.hexNumber || "(No Hex #)") +
        (h.name ? ` — ${h.name}` : "");
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
