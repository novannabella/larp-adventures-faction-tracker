// ---------- UTIL ----------
function $(id) {
  return document.getElementById(id);
}

// ---------- STATE MODEL ----------
let nextHexId = 1;
let nextEventId = 1;

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
  currentSeason: "Spring",
  seasons: {
    Spring: { food: 0, wood: 0, stone: 0, ore: 0, silver: 0, gold: 0, notes: "" },
    Summer: { food: 0, wood: 0, stone: 0, ore: 0, silver: 0, gold: 0, notes: "" },
    Fall:   { food: 0, wood: 0, stone: 0, ore: 0, silver: 0, gold: 0, notes: "" },
    Winter: { food: 0, wood: 0, stone: 0, ore: 0, silver: 0, gold: 0, notes: "" }
  }
};

// ---------- SAVE / LOAD ----------
function handleSaveState() {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  const faction = state.factionName && state.factionName.trim()
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
    }
  };
  reader.readAsText(file);
}

function loadStateObject(obj) {
  state.factionName = obj.factionName || "";
  state.factionNotes = obj.factionNotes || "";
  state.coffers = Object.assign(
    { food: 0, wood: 0, stone: 0, ore: 0, silver: 0, gold: 0 },
    obj.coffers || {}
  );
  state.hexes = Array.isArray(obj.hexes) ? obj.hexes.map((h, idx) => ({
    id: h.id || `hex_${idx+1}`,
    name: h.name || "",
    hexNumber: h.hexNumber || "",
    terrain: h.terrain || "",
    structure: h.structure || "",
    notes: h.notes || ""
  })) : [];
  nextHexId = state.hexes.length + 1;

  state.events = Array.isArray(obj.events) ? obj.events.map((ev, idx) => ({
    id: ev.id || `ev_${idx+1}`,
    name: ev.name || "",
    date: ev.date || "",
    type: ev.type || "",
    summary: ev.summary || "",
    detailsOpen: !!ev.detailsOpen
  })) : [];
  nextEventId = state.events.length + 1;

  state.currentSeason = obj.currentSeason || "Spring";
  state.seasons = Object.assign(state.seasons, obj.seasons || {});
  syncUIFromState();
}

function syncUIFromState() {
  // Faction
  if ($("factionName")) $("factionName").value = state.factionName;
  if ($("factionNotes")) $("factionNotes").value = state.factionNotes;

  // Coffers
  if ($("food")) $("food").value = state.coffers.food ?? 0;
  if ($("wood")) $("wood").value = state.coffers.wood ?? 0;
  if ($("stone")) $("stone").value = state.coffers.stone ?? 0;
  if ($("ore")) $("ore").value = state.coffers.ore ?? 0;
  if ($("silver")) $("silver").value = state.coffers.silver ?? 0;
  if ($("gold")) $("gold").value = state.coffers.gold ?? 0;

  // Seasons
  syncSeasonUI();

  // Hexes & Events
  renderHexList();
  renderEventTable();
}

// ---------- FACTION / COFFERS WIRING ----------
function wireFactionAndCoffers() {
  const factionName = $("factionName");
  const factionNotes = $("factionNotes");
  if (factionName) {
    factionName.addEventListener("input", (e) => {
      state.factionName = e.target.value;
    });
  }
  if (factionNotes) {
    factionNotes.addEventListener("input", (e) => {
      state.factionNotes = e.target.value;
    });
  }

  const map = [
    ["food", "food"],
    ["wood", "wood"],
    ["stone", "stone"],
    ["ore", "ore"],
    ["silver", "silver"],
    ["gold", "gold"]
  ];
  map.forEach(([id, key]) => {
    const input = $(id);
    if (input) {
      input.addEventListener("input", (e) => {
        const v = parseInt(e.target.value || "0", 10);
        state.coffers[key] = isNaN(v) ? 0 : v;
      });
    }
  });
}

// ---------- HEXES & UPKEEP ----------
let upkeepTable = {};

function loadUpkeepTable() {
  fetch("upkeep.csv")
    .then((r) => r.text())
    .then((text) => {
      const lines = text.split(/\\r?\\n/).filter((l) => l.trim().length);
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

  if (terrainAddBtn) {
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
  }

  if (structAddBtn) {
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
  }

  if (addHexBtn) {
    addHexBtn.addEventListener("click", () => addHexFromForm());
  }
}

function addHexFromForm() {
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
    notes
  });

  nameInput.value = "";
  numInput.value = "";
  terrainList.value = "";
  structList.value = "";
  notesInput.value = "";

  renderHexList();
}

function calcHexUpkeep(hex) {
  const result = { food: 0, wood: 0, stone: 0, gold: 0 };
  if (!hex.structure) return result;

  const names = hex.structure.split(",").map((s) => s.trim()).filter(Boolean);

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

function renderHexList() {
  const tbody = $("hexListBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  state.hexes.forEach((hex) => {
    const upkeep = calcHexUpkeep(hex);

    const mainRow = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.textContent = hex.name || "(Unnamed)";
    const hexCell = document.createElement("td");
    hexCell.textContent = hex.hexNumber || "";
    const foodCell = document.createElement("td");
    foodCell.textContent = upkeep.food || "";
    const woodCell = document.createElement("td");
    woodCell.textContent = upkeep.wood || "";
    const stoneCell = document.createElement("td");
    stoneCell.textContent = upkeep.stone || "";
    const goldCell = document.createElement("td");
    goldCell.textContent = upkeep.gold || "";

    const actionsCell = document.createElement("td");
    actionsCell.className = "actions";

    const detailsBtn = document.createElement("button");
    detailsBtn.className = "button small secondary";
    detailsBtn.textContent = hex.detailsOpen ? "Hide" : "Details";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "button small secondary";
    deleteBtn.textContent = "Delete";

    actionsCell.appendChild(detailsBtn);
    actionsCell.appendChild(deleteBtn);

    mainRow.appendChild(nameCell);
    mainRow.appendChild(hexCell);
    mainRow.appendChild(foodCell);
    mainRow.appendChild(woodCell);
    mainRow.appendChild(stoneCell);
    mainRow.appendChild(goldCell);
    mainRow.appendChild(actionsCell);

    const detailsRow = document.createElement("tr");
    detailsRow.className = "details-row";
    detailsRow.style.display = hex.detailsOpen ? "" : "none";
    const detailsCell = document.createElement("td");
    detailsCell.colSpan = 7;
    detailsCell.innerHTML = `
      <div><strong>Terrain:</strong> ${hex.terrain || "—"}</div>
      <div><strong>Structures:</strong> ${hex.structure || "—"}</div>
      <div><strong>Notes:</strong> ${hex.notes || "—"}</div>
    `;
    detailsRow.appendChild(detailsCell);

    detailsBtn.addEventListener("click", () => {
      hex.detailsOpen = !hex.detailsOpen;
      detailsRow.style.display = hex.detailsOpen ? "" : "none";
      detailsBtn.textContent = hex.detailsOpen ? "Hide" : "Details";
    });

    deleteBtn.addEventListener("click", () => {
      if (!confirm("Remove this hex from the faction?")) return;
      state.hexes = state.hexes.filter((h) => h.id !== hex.id);
      renderHexList();
    });

    tbody.appendChild(mainRow);
    tbody.appendChild(detailsRow);
  });
}

// ---------- EVENTS ----------
let eventSortDirection = "asc";

function wireEvents() {
  const addEventBtn = $("addEventBtn");
  if (addEventBtn) {
    addEventBtn.addEventListener("click", addEventFromForm);
  }
  const sortHeader = $("eventDateSortHeader");
  if (sortHeader) {
    sortHeader.addEventListener("click", () => {
      eventSortDirection = eventSortDirection === "asc" ? "desc" : "asc";
      updateEventSortHeaderLabel();
      renderEventTable();
    });
  }
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
    detailsOpen: true
  });

  nameInput.value = "";
  dateInput.value = "";

  renderEventTable();
}

function renderEventTable() {
  const tbody = $("eventTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const eventsCopy = [...state.events];

  eventsCopy.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    if (da === db) {
      const idxA = state.events.indexOf(a);
      const idxB = state.events.indexOf(b);
      return idxA - idxB;
    }
    return eventSortDirection === "asc" ? da - db : db - da;
  });

  eventsCopy.forEach((ev) => {
    const mainRow = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = ev.name || "Unnamed Event";

    const dateCell = document.createElement("td");
    dateCell.textContent = ev.date || "No date";

    const typeCell = document.createElement("td");
    typeCell.textContent = ev.type || "—";

    const actionsCell = document.createElement("td");
    actionsCell.className = "actions";

    const detailsBtn = document.createElement("button");
    detailsBtn.className = "button small secondary";
    detailsBtn.textContent = ev.detailsOpen ? "Hide" : "Details";

    const delBtn = document.createElement("button");
    delBtn.className = "button small secondary";
    delBtn.textContent = "Delete";

    actionsCell.appendChild(detailsBtn);
    actionsCell.appendChild(delBtn);

    mainRow.appendChild(nameCell);
    mainRow.appendChild(dateCell);
    mainRow.appendChild(typeCell);
    mainRow.appendChild(actionsCell);

    const detailsRow = document.createElement("tr");
    detailsRow.className = "details-row";
    detailsRow.style.display = ev.detailsOpen ? "" : "none";
    const detailsCell = document.createElement("td");
    detailsCell.colSpan = 4;

    detailsCell.innerHTML = `
      <div class="event-details">
        <div class="field">
          <label>Event Name</label>
          <input type="text" class="ev-name-input" value="${ev.name || ""}" />
        </div>
        <div class="field">
          <label>Event Date</label>
          <input type="date" class="ev-date-input" value="${ev.date || ""}" />
        </div>
        <div class="field">
          <label>Event Type</label>
          <select class="ev-type-select">
            ${eventTypeOptions(ev.type)}
          </select>
        </div>
        <div class="field">
          <label>Summary / Notes</label>
          <textarea class="ev-summary-input" rows="3" placeholder="What happened in this event?">${ev.summary || ""}</textarea>
        </div>
      </div>
    `;
    detailsRow.appendChild(detailsCell);

    // Wire details behaviour
    detailsBtn.addEventListener("click", () => {
      ev.detailsOpen = !ev.detailsOpen;
      detailsRow.style.display = ev.detailsOpen ? "" : "none";
      detailsBtn.textContent = ev.detailsOpen ? "Hide" : "Details";
    });

    delBtn.addEventListener("click", () => {
      if (!confirm("Delete this event?")) return;
      state.events = state.events.filter((e) => e.id !== ev.id);
      renderEventTable();
    });

    const nameInput = detailsCell.querySelector(".ev-name-input");
    const dateInput = detailsCell.querySelector(".ev-date-input");
    const typeSelect = detailsCell.querySelector(".ev-type-select");
    const summaryInput = detailsCell.querySelector(".ev-summary-input");

    nameInput.addEventListener("input", (e) => {
      ev.name = e.target.value;
      nameCell.textContent = ev.name || "Unnamed Event";
    });
    dateInput.addEventListener("input", (e) => {
      ev.date = e.target.value;
      dateCell.textContent = ev.date || "No date";
      renderEventTable(); // resort
    });
    typeSelect.addEventListener("change", (e) => {
      ev.type = e.target.value;
      typeCell.textContent = ev.type || "—";
    });
    summaryInput.addEventListener("input", (e) => {
      ev.summary = e.target.value;
    });

    tbody.appendChild(mainRow);
    tbody.appendChild(detailsRow);
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

// ---------- SEASONS ----------
function wireSeasons() {
  const seasonSelect = $("seasonSelect");
  if (seasonSelect) {
    seasonSelect.addEventListener("change", () => {
      saveSeasonFromUI();
      state.currentSeason = seasonSelect.value || "Spring";
      syncSeasonUI();
    });
  }

  const inputs = [
    ["seasonFood", "food"],
    ["seasonWood", "wood"],
    ["seasonStone", "stone"],
    ["seasonOre", "ore"],
    ["seasonSilver", "silver"],
    ["seasonGold", "gold"]
  ];

  inputs.forEach(([id, key]) => {
    const inp = $(id);
    if (inp) {
      inp.addEventListener("input", (e) => {
        const v = parseInt(e.target.value || "0", 10);
        state.seasons[state.currentSeason][key] = isNaN(v) ? 0 : v;
      });
    }
  });

  const notes = $("seasonNotes");
  if (notes) {
    notes.addEventListener("input", (e) => {
      state.seasons[state.currentSeason].notes = e.target.value;
    });
  }
}

function saveSeasonFromUI() {
  const s = state.seasons[state.currentSeason];
  if (!s) return;
  if ($("seasonFood")) s.food = parseInt($("seasonFood").value || "0", 10) || 0;
  if ($("seasonWood")) s.wood = parseInt($("seasonWood").value || "0", 10) || 0;
  if ($("seasonStone")) s.stone = parseInt($("seasonStone").value || "0", 10) || 0;
  if ($("seasonOre")) s.ore = parseInt($("seasonOre").value || "0", 10) || 0;
  if ($("seasonSilver")) s.silver = parseInt($("seasonSilver").value || "0", 10) || 0;
  if ($("seasonGold")) s.gold = parseInt($("seasonGold").value || "0", 10) || 0;
  if ($("seasonNotes")) s.notes = $("seasonNotes").value || "";
}

function syncSeasonUI() {
  const s = state.seasons[state.currentSeason];
  if (!s) return;
  if ($("seasonSelect")) $("seasonSelect").value = state.currentSeason;
  if ($("seasonFood")) $("seasonFood").value = s.food ?? 0;
  if ($("seasonWood")) $("seasonWood").value = s.wood ?? 0;
  if ($("seasonStone")) $("seasonStone").value = s.stone ?? 0;
  if ($("seasonOre")) $("seasonOre").value = s.ore ?? 0;
  if ($("seasonSilver")) $("seasonSilver").value = s.silver ?? 0;
  if ($("seasonGold")) $("seasonGold").value = s.gold ?? 0;
  if ($("seasonNotes")) $("seasonNotes").value = s.notes || "";
}

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = $("saveStateBtn");
  const loadFile = $("loadStateFile");
  if (saveBtn) saveBtn.addEventListener("click", handleSaveState);
  if (loadFile) loadFile.addEventListener("change", handleLoadFile);

  wireFactionAndCoffers();
  wireHexForm();
  wireEvents();
  wireSeasons();
  loadUpkeepTable();

  syncUIFromState();
});
