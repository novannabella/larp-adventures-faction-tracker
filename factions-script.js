// ---------- STATE MODEL ----------
const state = {
  factionName: "",
  factionNotes: "",
  gameYear: "",
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
  wireHexAddForm();
  wireEventSortHeader();

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
  state.gameYear = obj.gameYear || "";

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


// Wire hex add form & structure multiselect
function wireHexAddForm() {
  const terrainSelect = $("newHexTerrain");
  if (terrainSelect) {
    // ensure options exist (in case HTML is changed)
    if (!terrainSelect.options.length) {
      terrainSelect.innerHTML = terrainOptions("");
    }
  }

  const structSelect = $("newHexStructureSelect");
  if (structSelect) {
    if (!structSelect.options.length) {
      structSelect.innerHTML = structureOptions("");
    }
  }

  const addStructBtn = $("addHexStructureBtn");
  if (addStructBtn && !addStructBtn._wired) {
    addStructBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const sel = $("newHexStructureSelect");
      const out = $("newHexStructures");
      if (!sel || !out) return;
      const val = sel.value;
      if (!val) return;
      const current = out.value
        ? out.value.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      if (!current.includes(val)) {
        current.push(val);
      }
      out.value = current.join(", ");
      sel.value = "";
    });
    addStructBtn._wired = true;
  }

  const addHexBtn = $("addHexBtn");
  if (addHexBtn && !addHexBtn._wired) {
    addHexBtn.addEventListener("click", (e) => {
      e.preventDefault();
      addHex();
    });
    addHexBtn._wired = true;
  }
}

// Wire event date sort header
function wireEventSortHeader() {
  const header = $("eventDateSortHeader");
  if (header && !header._wired) {
    header.addEventListener("click", () => {
      eventSortDirection = eventSortDirection === "asc" ? "desc" : "asc";
      renderEventList();
    });
    header._wired = true;
  }
}

function updateEventSortHeaderLabel() {
  const header = $("eventDateSortHeader");
  if (!header) return;
  header.textContent = eventSortDirection === "asc" ? "Date ▲" : "Date ▼";
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
    const terrainLabel = hex.terrain || "No Terrain";
    const structLabel = hex.structure || "No Structures";
    sub.textContent = `${terrainLabel} · ${structLabel}`;

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
          <input type="text" class="hex-number-input" maxlength="5" value="${hex.hexNumber || ""}" placeholder="e.g. A3, B5" />
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
          <div class="inline">
            <select class="hex-structure-select">
              ${structureOptions("")}
            </select>
            <button type="button" class="button small secondary hex-add-structure-btn">Add</button>
          </div>
          <input type="text" class="hex-structures-input" value="${hex.structure || ""}" placeholder="Farm, Lumber Mill" />
        </div>
      </div>

      <div class="section-row">
        <div class="field">
          <label>Resource Notes (Primary / Secondary / Tertiary)</label>
          <textarea class="hex-notes-input" placeholder="Primary: ..., Secondary: ..., Tertiary: ...">${hex.notes || ""}</textarea>
        </div>
      </div>
    `;

    const numberInput = body.querySelector(".hex-number-input");
    const nameInput = body.querySelector(".hex-name-input");
    const terrainSelect = body.querySelector(".hex-terrain-select");
    const structSelect = body.querySelector(".hex-structure-select");
    const structInput = body.querySelector(".hex-structures-input");
    const addStructBtn = body.querySelector(".hex-add-structure-btn");
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
      const terrainLabel2 = hex.terrain || "No Terrain";
      const structLabel2 = hex.structure || "No Structures";
      sub.textContent = `${terrainLabel2} · ${structLabel2}`;
    });

    structInput.addEventListener("input", (e) => {
      hex.structure = e.target.value;
      const terrainLabel2 = hex.terrain || "No Terrain";
      const structLabel2 = hex.structure || "No Structures";
      sub.textContent = `${terrainLabel2} · ${structLabel2}`;
    });

    addStructBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const val = structSelect.value;
      if (!val) return;
      const current = structInput.value
        ? structInput.value.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      if (!current.includes(val)) {
        current.push(val);
      }
      structInput.value = current.join(", ");
      hex.structure = structInput.value;
      structSelect.value = "";
      const terrainLabel2 = hex.terrain || "No Terrain";
      const structLabel2 = hex.structure || "No Structures";
      sub.textContent = `${terrainLabel2} · ${structLabel2}`;
    });

    notesInput.addEventListener("input", (e) => {
      hex.notes = e.target.value;
    });

    div.appendChild(header);
    div.appendChild(body);
    container.appendChild(div);
  });
}

function addHex() {
  const nameInput = $("newHexName");
  const numInput = $("newHexNumber");
  const terrainSelect = $("newHexTerrain");
  const structsInput = $("newHexStructures");
  const notesInput = $("newHexNotes");

  if (!nameInput || !numInput || !terrainSelect || !structsInput || !notesInput) return;

  const name = nameInput.value.trim();
  const hexNumber = numInput.value.trim();
  const terrain = terrainSelect.value;
  const structure = structsInput.value.trim();
  const notes = notesInput.value.trim();

  // Avoid adding a completely empty hex
  if (!name && !hexNumber && !terrain && !structure && !notes) {
    return;
  }

  const id = `hex_${nextHexId++}`;
  state.hexes.push({
    id,
    hexNumber,
    name,
    terrain,
    primary: "",
    secondary: "",
    tertiary: "",
    structure,
    notes
  });

  // Clear form
  nameInput.value = "";
  numInput.value = "";
  terrainSelect.value = "";
  structsInput.value = "";
  notesInput.value = "";

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

  const yearEl = $("seasonYear");
  if (yearEl) {
    yearEl.addEventListener("input", () => {
      state.gameYear = yearEl.value;
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

  const yearEl = $("seasonYear");
  if (yearEl) {
    state.gameYear = yearEl.value || "";
  }
}

function syncSeasonUI() {
  if ($("seasonSelect")) $("seasonSelect").value = currentSeason;
  const s = state.seasons[currentSeason];

  if (!s) return;

  if ($("seasonYear")) $("seasonYear").value = state.gameYear || "";
  if ($("seasonFood")) $("seasonFood").value = s.food ?? 0;
  if ($("seasonWood")) $("seasonWood").value = s.wood ?? 0;
  if ($("seasonStone")) $("seasonStone").value = s.stone ?? 0;
  if ($("seasonOre")) $("seasonOre").value = s.ore ?? 0;
  if ($("seasonSilver")) $("seasonSilver").value = s.silver ?? 0;
  if ($("seasonGold")) $("seasonGold").value = s.gold ?? 0;
  if ($("seasonNotes")) $("seasonNotes").value = s.notes || "";
}
