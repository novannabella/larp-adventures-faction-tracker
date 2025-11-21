/******************************************************
 * Factions Script – Fully Corrected Version
 * Matches new layout: Faction Info, Coffers,
 * Seasonal Gains (list), Events & Turn Actions,
 * Controlled Hexes.
 ******************************************************/

/* ---------------- STATE -------------------- */

let nextHexId = 1;
let nextEventId = 1;
let nextSeasonGainId = 1;
let nextBuildId = 1;
let nextMovementId = 1;

// Terrain + Structure catalogs
const TERRAIN_OPTIONS = [
  "Plains",
  "Forest",
  "Mountain",
  "Sea",
  "Blasted Lands"
];

const STRUCTURE_GROUPS = {
  Improvements: [
    "market",
    "carpenter's shop",
    "blacksmith",
    "bank",
    "stone mason's shop"
  ],
  Fortifications: ["watch tower", "fort", "castle"],
  "Seaborne assets": ["Dock", "Fishing Fleet", "Trading Vessel", "War Galley"]
};

const ALL_STRUCTURES = Object.values(STRUCTURE_GROUPS).flat();


// Main application state
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

  // Seasonal Gains now a simple list
  seasonalGains: [],

  events: [],
  hexes: [],

  seasonYear: new Date().getFullYear()
};


/* ---------------- UTIL -------------------- */

function $(id) {
  return document.getElementById(id);
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}


/******************************************************
 * SEASONAL GAINS – SIMPLE LIST
 ******************************************************/

function wireSeasonalGainsForm() {
  const btn = $("addSeasonGainBtn");
  if (!btn || btn._wired) return;

  btn.addEventListener("click", () => addSeasonalGain());
  btn._wired = true;
}

function addSeasonalGain() {
  const season = $("seasonSelect").value;
  const year = parseInt($("seasonYear").value || new Date().getFullYear(), 10);

  let food = parseInt($("seasonFood").value || 0, 10);
  let wood = parseInt($("seasonWood").value || 0, 10);
  let stone = parseInt($("seasonStone").value || 0, 10);
  let ore = parseInt($("seasonOre").value || 0, 10);
  let silver = parseInt($("seasonSilver").value || 0, 10);
  let gold = parseInt($("seasonGold").value || 0, 10);
  let notes = ($("seasonNotes").value || "").trim();

  const id = `sg_${nextSeasonGainId++}`;

  state.seasonalGains.push({
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

  // Clear inputs
  $("seasonFood").value = "";
  $("seasonWood").value = "";
  $("seasonStone").value = "";
  $("seasonOre").value = "";
  $("seasonSilver").value = "";
  $("seasonGold").value = "";
  $("seasonNotes").value = "";

  renderSeasonalGainList();
}

function renderSeasonalGainList() {
  const body = $("seasonGainListBody");
  if (!body) return;
  body.innerHTML = "";

  state.seasonalGains.forEach((g) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${g.season}</td>
      <td>${g.year}</td>
      <td>${g.food}</td>
      <td>${g.wood}</td>
      <td>${g.stone}</td>
      <td>${g.ore}</td>
      <td>${g.silver}</td>
      <td>${g.gold}</td>
      <td>${g.notes || ""}</td>
      <td><button class="button small secondary" onclick="editSeasonGain('${g.id}')">Edit</button></td>
      <td><button class="button small secondary" onclick="deleteSeasonGain('${g.id}')">Delete</button></td>
    `;

    body.appendChild(row);
  });
}

function editSeasonGain(id) {
  const g = state.seasonalGains.find((x) => x.id === id);
  if (!g) return;

  $("seasonSelect").value = g.season;
  $("seasonYear").value = g.year;
  $("seasonFood").value = g.food;
  $("seasonWood").value = g.wood;
  $("seasonStone").value = g.stone;
  $("seasonOre").value = g.ore;
  $("seasonSilver").value = g.silver;
  $("seasonGold").value = g.gold;
  $("seasonNotes").value = g.notes || "";

  state.seasonalGains = state.seasonalGains.filter((x) => x.id !== id);
  renderSeasonalGainList();
}

function deleteSeasonGain(id) {
  state.seasonalGains = state.seasonalGains.filter((x) => x.id !== id);
  renderSeasonalGainList();
}


/******************************************************
 * EVENTS (BUG-FIXED)
 ******************************************************/

function wireEventForm() {
  const btn = $("addEventBtn");
  if (!btn || btn._wired) return;

  btn.addEventListener("click", () => addEventFromForm());
  btn._wired = true;
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
    detailsOpen: true
  });

  // Reset form
  nameInput.value = "";
  dateInput.value = "";

  renderEventList();
}

/******************************************************
 * BUILD UPGRADE FILTERING
 ******************************************************/

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

function structureSelectOptions(selected, availableList) {
  const available = new Set(availableList || ALL_STRUCTURES);

  let html = '<option value="">-- Select Upgrade --</option>';

  Object.entries(STRUCTURE_GROUPS).forEach(([groupName, items]) => {
    const groupItems = items.filter(
      (item) => item === selected || available.has(item)
    );
    if (!groupItems.length) return;

    html += `<optgroup label="${groupName}">`;
    groupItems.forEach((item) => {
      const sel = item === selected ? "selected" : "";
      html += `<option value="${item}" ${sel}>${item}</option>`;
    });
    html += "</optgroup>";
  });

  if (!html.includes("<optgroup") && selected) {
    html = `<option value="${selected}" selected>${selected}</option>`;
  }

  return html;
}

/******************************************************
 * EVENT RENDERING
 ******************************************************/

function buildHexOptions(selected) {
  let html = '<option value="">-- Select Hex --</option>';
  state.hexes.forEach((h) => {
    const sel = h.id === selected ? "selected" : "";
    html += `<option value="${h.id}" ${sel}>${h.name} (${h.hexNumber})</option>`;
  });
  return html;
}

function renderEventList() {
  const wrapper = $("eventList");
  if (!wrapper) return;

  wrapper.innerHTML = "";

  state.events.forEach((ev) => {
    const card = document.createElement("div");
    card.className = "event-card";

    card.innerHTML = `
      <div class="event-summary">
        <div class="event-left">
          <strong>${ev.name}</strong> – ${ev.type} – ${ev.date || ""}
        </div>
        <div class="event-right">
          <button class="button small" onclick="toggleEventDetails('${ev.id}')">
            ${ev.detailsOpen ? "Hide" : "Show"}
          </button>
          <button class="button small secondary" onclick="deleteEvent('${ev.id}')">Delete</button>
        </div>
      </div>

      <div class="event-details" id="evdet_${ev.id}" style="${
      ev.detailsOpen ? "" : "display:none"
    }">
        <div class="field">
          <label>Summary</label>
          <textarea class="event-summary-input" data-id="${ev.id}">${
      ev.summary || ""
    }</textarea>
        </div>

        <h4>Builds</h4>
        <div class="ev-builds-list"></div>
        <button class="button small ev-add-build-btn">Add Build</button>

        <h4>Movements</h4>
        <div class="ev-move-list"></div>
        <button class="button small ev-add-move-btn">Add Movement</button>

        <h4>Offensive Action</h4>
        <div class="ev-offense"></div>
      </div>
    `;

    wrapper.appendChild(card);

    // Now fill in details
    const det = card.querySelector(".event-details");

    /* --- Wire Summary --- */
    const sumInput = det.querySelector(".event-summary-input");
    sumInput.addEventListener("input", () => {
      ev.summary = sumInput.value;
    });

    /* -------------------------
     * BUILDS
     * ------------------------- */
    const buildsContainer = det.querySelector(".ev-builds-list");
    const addBuildBtn = det.querySelector(".ev-add-build-btn");

    addBuildBtn.addEventListener("click", () => {
      const bid = `b_${nextBuildId++}`;
      ev.builds.push({
        id: bid,
        hexId: "",
        description: ""
      });
      renderEventList();
    });

    // Render all builds
    ev.builds.forEach((b) => {
      const row = document.createElement("div");
      row.className = "mini-row";
      row.dataset.id = b.id;

      const bodyRow = document.createElement("div");
      bodyRow.className = "mini-row-body two-cols";

      // Hex dropdown
      const fieldHex = document.createElement("div");
      fieldHex.className = "field";
      fieldHex.innerHTML = `
        <label>Hex</label>
        <select class="build-hex-select">
          ${buildHexOptions(b.hexId)}
        </select>
      `;

      // Structure dropdown
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
        ev.builds = ev.builds.filter((x) => x.id !== b.id);
        renderEventList();
      });

      row.appendChild(bodyRow);
      row.appendChild(delBuildBtn);
      buildsContainer.appendChild(row);

      // Wiring
      const hexSelectEl = bodyRow.querySelector(".build-hex-select");
      const structSelectEl = bodyRow.querySelector(".build-structure-select");

      hexSelectEl.addEventListener("change", (e) => {
        b.hexId = e.target.value;
        renderEventList(); // recalc upgrade options
      });

      structSelectEl.addEventListener("change", (e) => {
        b.description = e.target.value;
      });
    });


    /******************************************************
     * MOVEMENTS (unchanged behavior)
     ******************************************************/
    const moveContainer = det.querySelector(".ev-move-list");
    const addMoveBtn = det.querySelector(".ev-add-move-btn");

    addMoveBtn.addEventListener("click", () => {
      const mid = `m_${nextMovementId++}`;
      ev.movements.push({
        id: mid,
        from: "",
        to: "",
        unit: ""
      });
      renderEventList();
    });

    ev.movements.forEach((m) => {
      const row = document.createElement("div");
      row.className = "mini-row";

      row.innerHTML = `
        <div class="mini-row-body three-cols">
          <div class="field">
            <label>From</label>
            <input type="text" class="move-from-input" value="${m.from || ""}">
          </div>
          <div class="field">
            <label>To</label>
            <input type="text" class="move-to-input" value="${m.to || ""}">
          </div>
          <div class="field">
            <label>Unit</label>
            <input type="text" class="move-unit-input" value="${m.unit || ""}">
          </div>
        </div>
        <button class="button small secondary move-del-btn">Delete</button>
      `;

      const fromInput = row.querySelector(".move-from-input");
      const toInput = row.querySelector(".move-to-input");
      const unitInput = row.querySelector(".move-unit-input");
      const delBtn = row.querySelector(".move-del-btn");

      fromInput.addEventListener("input", () => {
        m.from = fromInput.value;
      });
      toInput.addEventListener("input", () => {
        m.to = toInput.value;
      });
      unitInput.addEventListener("input", () => {
        m.unit = unitInput.value;
      });

      delBtn.addEventListener("click", () => {
        ev.movements = ev.movements.filter((x) => x.id !== m.id);
        renderEventList();
      });

      moveContainer.appendChild(row);
    });

    /******************************************************
     * OFFENSIVE ACTION
     ******************************************************/
    const offBlock = det.querySelector(".ev-offense");
    const oa = ev.offensiveAction;

    offBlock.innerHTML = `
      <div class="mini-row-body two-cols">
        <div class="field">
          <label>Type</label>
          <input type="text" class="oa-type" value="${oa.type || ""}">
        </div>
        <div class="field">
          <label>Target</label>
          <input type="text" class="oa-target" value="${oa.target || ""}">
        </div>
      </div>

      <div class="field">
        <label>Notes</label>
        <textarea class="oa-notes">${oa.notes || ""}</textarea>
      </div>
    `;

    offBlock.querySelector(".oa-type").addEventListener("input", (e) => {
      oa.type = e.target.value;
    });
    offBlock.querySelector(".oa-target").addEventListener("input", (e) => {
      oa.target = e.target.value;
    });
    offBlock.querySelector(".oa-notes").addEventListener("input", (e) => {
      oa.notes = e.target.value;
    });
  });
}

function toggleEventDetails(id) {
  const ev = state.events.find((x) => x.id === id);
  if (!ev) return;
  ev.detailsOpen = !ev.detailsOpen;
  renderEventList();
}

function deleteEvent(id) {
  state.events = state.events.filter((x) => x.id !== id);
  renderEventList();
}


/******************************************************
 * CONTROLLED HEXES
 ******************************************************/

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
        ? structList.value.split(",").map((s) => s.trim())
        : [];

      if (!current.includes(val)) {
        current.push(val);
        structList.value = current.join(", ");
      }

      structSelect.value = "";
    });
    structAddBtn._wired = true;
  }
}

function addHex() {
  const nameInput = $("newHexName");
  const numInput = $("newHexNumber");
  const terrainSelect = $("newHexTerrainSelect");
  const structList = $("newHexStructures");
  const notesInput = $("newHexNotes");

  if (!nameInput || !numInput) return;

  const name = nameInput.value.trim();
  const hexNumber = numInput.value.trim();
  const terrain = terrainSelect ? terrainSelect.value.trim() : "";
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
  if (structList) structList.value = "";
  if (notesInput) notesInput.value = "";

  renderHexList();
}

function editHex(hexId) {
  const hex = state.hexes.find((h) => h.id === hexId);
  if (!hex) return;

  $("newHexName").value = hex.name || "";
  $("newHexNumber").value = hex.hexNumber || "";
  $("newHexTerrainSelect").value = hex.terrain || "";
  $("newHexStructures").value = hex.structure || "";
  $("newHexNotes").value = hex.notes || "";

  state.hexes = state.hexes.filter((h) => h.id !== hexId);
  renderHexList();

  $("controlledHexesCard").scrollIntoView({ behavior: "smooth" });
}

function deleteHex(id) {
  state.hexes = state.hexes.filter((h) => h.id !== id);
  renderHexList();
}

function renderHexList() {
  const body = $("hexListBody");
  if (!body) return;
  body.innerHTML = "";

  state.hexes.forEach((x) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${x.name}</td>
      <td>${x.hexNumber}</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td>
        <button class="button small" onclick="toggleHexDetails('${x.id}')">${x.detailsOpen ? "Hide" : "Show"}</button>
      </td>
    `;

    body.appendChild(row);

    // Details row
    if (x.detailsOpen) {
      const det = document.createElement("tr");
      det.className = "hex-detail-row";

      det.innerHTML = `
        <td colspan="7">
          <strong>Terrain:</strong> ${x.terrain || ""}<br>
          <strong>Structures:</strong> ${x.structure || ""}<br>
          <strong>Notes:</strong> ${x.notes || ""}<br><br>
          <button class="button small" onclick="editHex('${x.id}')">Edit</button>
          <button class="button small secondary" onclick="deleteHex('${x.id}')">Delete</button>
        </td>
      `;

      body.appendChild(det);
    }
  });
}

function toggleHexDetails(id) {
  const hex = state.hexes.find((h) => h.id === id);
  if (!hex) return;
  hex.detailsOpen = !hex.detailsOpen;
  renderHexList();
}


/******************************************************
 * LOAD/SAVE
 ******************************************************/

function saveState() {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "faction-data.json";
  a.click();
}

function loadStateFromFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const obj = JSON.parse(e.target.result);
      loadStateObject(obj);
    } catch (err) {
      alert("Invalid JSON file");
    }
  };
  reader.readAsText(file);
}

function loadStateObject(obj) {
  Object.assign(state, clone(obj));

  // Re-render everything
  renderHexList();
  renderEventList();
  renderSeasonalGainList();
}

function wireLoadSave() {
  const loadBtn = $("loadStateBtn");
  const saveBtn = $("saveStateBtn");
  const fileInput = $("loadStateFile");

  if (loadBtn && !loadBtn._wired) {
    loadBtn.addEventListener("click", () => fileInput.click());
    loadBtn._wired = true;
  }
  if (saveBtn && !saveBtn._wired) {
    saveBtn.addEventListener("click", () => saveState());
    saveBtn._wired = true;
  }
  if (fileInput && !fileInput._wired) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) loadStateFromFile(file);
    });
    fileInput._wired = true;
  }
}


/******************************************************
 * INITIALIZE
 ******************************************************/

window.addEventListener("DOMContentLoaded", () => {
  wireLoadSave();
  wireHexForm();
  wireEventForm();
  wireSeasonalGainsForm();

  renderHexList();
  renderEventList();
  renderSeasonalGainList();
});
