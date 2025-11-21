// Faction Resource Tracker Script - rebuilt cleanly

// ---------- ID COUNTERS ----------
let nextHexId = 1;
let nextEventId = 1;
let nextSeasonEntryId = 1;
let nextBuildId = 1;
let nextMovementId = 1;
let eventSortDirection = "asc"; // "asc" or "desc"
let currentEventModalId = null;

// ---------- CONSTANTS ----------
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

// ---------- STATE ----------
const state = {
  factionName: "",
  factionNotes: "",
  coffers: {
    food: "",
    wood: "",
    stone: "",
    ore: "",
    silver: "",
    gold: ""
  },
  seasonalEntries: [],
  events: [],
  hexes: []
};

// ---------- DOM HELPERS ----------
function $(id) {
  return document.getElementById(id);
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ---------- INIT ----------
window.addEventListener("DOMContentLoaded", () => {
  wireTopControls();
  wireFactionAndCoffers();
  wireSeasonal();
  wireEvents();
  wireHexes();

  const yearInput = $("seasonYear");
  if (yearInput && !yearInput.value) {
    yearInput.value = new Date().getFullYear();
  }

  renderSeasonTable();
  renderEventList();
  renderHexList();
});

// ======================================================
// Faction + Coffers
// ======================================================
function wireFactionAndCoffers() {
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

  const cofferFields = ["food", "wood", "stone", "ore", "silver", "gold"];
  cofferFields.forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", () => {
      state.coffers[id] = el.value;
    });
  });
}

function syncFactionAndCoffersToUI() {
  if ($("factionName")) $("factionName").value = state.factionName || "";
  if ($("factionNotes")) $("factionNotes").value = state.factionNotes || "";

  const cofferFields = ["food", "wood", "stone", "ore", "silver", "gold"];
  cofferFields.forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.value = state.coffers[id] ?? "";
  });
}

// ======================================================
// Seasonal Resource Gains (list of entries)
// ======================================================
function wireSeasonal() {
  const addBtn = $("addSeasonGainBtn");
  if (addBtn && !addBtn._wired) {
    addBtn.addEventListener("click", addSeasonEntryFromForm);
    addBtn._wired = true;
  }
}

function addSeasonEntryFromForm() {
  const season = $("seasonSelect") ? $("seasonSelect").value : "Spring";
  const yearVal = $("seasonYear") ? $("seasonYear").value : "";
  const year = yearVal ? parseInt(yearVal, 10) : new Date().getFullYear();

  const fields = [
    { id: "seasonFood", key: "food" },
    { id: "seasonWood", key: "wood" },
    { id: "seasonStone", key: "stone" },
    { id: "seasonOre", key: "ore" },
    { id: "seasonSilver", key: "silver" },
    { id: "seasonGold", key: "gold" }
  ];

  const entry = {
    id: "sg_" + nextSeasonEntryId++,
    season,
    year,
    food: 0,
    wood: 0,
    stone: 0,
    ore: 0,
    silver: 0,
    gold: 0,
    notes: $("seasonNotes") ? $("seasonNotes").value.trim() : ""
  };

  fields.forEach(({ id, key }) => {
    const el = $(id);
    if (!el) return;
    const val = parseInt(el.value, 10);
    entry[key] = Number.isFinite(val) ? val : 0;
  });

  state.seasonalEntries.push(entry);

  fields.forEach(({ id }) => {
    const el = $(id);
    if (el) el.value = "";
  });
  if ($("seasonNotes")) $("seasonNotes").value = "";

  renderSeasonTable();
}

function renderSeasonTable() {
  const tbody = $("seasonTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  state.seasonalEntries.forEach((e) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.season}</td>
      <td>${e.year}</td>
      <td>${e.food}</td>
      <td>${e.wood}</td>
      <td>${e.stone}</td>
      <td>${e.ore}</td>
      <td>${e.silver}</td>
      <td>${e.gold}</td>
      <td>${e.notes || ""}</td>
      <td>
        <button class="button small secondary" data-id="${e.id}" data-action="edit-season">Edit</button>
        <button class="button small secondary" data-id="${e.id}" data-action="delete-season">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.onclick = (ev) => {
    const btn = ev.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const action = btn.getAttribute("data-action");
    if (action === "edit-season") {
      editSeasonEntry(id);
    } else if (action === "delete-season") {
      deleteSeasonEntry(id);
    }
  };
}

function editSeasonEntry(id) {
  const entry = state.seasonalEntries.find((e) => e.id === id);
  if (!entry) return;

  if ($("seasonSelect")) $("seasonSelect").value = entry.season;
  if ($("seasonYear")) $("seasonYear").value = entry.year;
  if ($("seasonFood")) $("seasonFood").value = entry.food;
  if ($("seasonWood")) $("seasonWood").value = entry.wood;
  if ($("seasonStone")) $("seasonStone").value = entry.stone;
  if ($("seasonOre")) $("seasonOre").value = entry.ore;
  if ($("seasonSilver")) $("seasonSilver").value = entry.silver;
  if ($("seasonGold")) $("seasonGold").value = entry.gold;
  if ($("seasonNotes")) $("seasonNotes").value = entry.notes || "";

  state.seasonalEntries = state.seasonalEntries.filter((e) => e.id !== id);
  renderSeasonTable();
}

function deleteSeasonEntry(id) {
  state.seasonalEntries = state.seasonalEntries.filter((e) => e.id !== id);
  renderSeasonTable();
}

// ======================================================
// Events & Turn Actions (table + full-screen modal editor)
// ======================================================
function wireEvents() {
  const addEventBtn = $("addEventBtn");
  if (addEventBtn && !addEventBtn._wired) {
    addEventBtn.addEventListener("click", addEventFromForm);
    addEventBtn._wired = true;
  }

  const hdr = $("eventDateSortHeader");
  if (hdr && !hdr._wired) {
    hdr.addEventListener("click", () => {
      eventSortDirection = eventSortDirection === "asc" ? "desc" : "asc";
      renderEventList();
    });
    hdr._wired = true;
  }

  wireEventModal();
  updateEventSortHeaderLabel();
}

function updateEventSortHeaderLabel() {
  const hdr = $("eventDateSortHeader");
  if (!hdr) return;
  hdr.textContent = eventSortDirection === "asc" ? "Date ▲" : "Date ▼";
}

function formatEventDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString();
}

function getEventActionsSummary(ev) {
  const bits = [];
  if (ev.builds && ev.builds.length) bits.push(`Builds (${ev.builds.length})`);
  if (ev.movements && ev.movements.length) bits.push(`Movements (${ev.movements.length})`);
  const oa = ev.offensiveAction || {};
  if (
    (oa.type && oa.type.trim()) ||
    (oa.target && oa.target.trim()) ||
    (oa.notes && oa.notes.trim())
  ) {
    bits.push("Offense");
  }
  return bits.length ? bits.join(", ") : "—";
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

  const id = "ev_" + nextEventId++;
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
    }
  });

  nameInput.value = "";
  dateInput.value = "";

  renderEventList();
}

function renderEventList() {
  const tbody = $("eventTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const eventsCopy = [...state.events];
  eventsCopy.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    if (da === db) {
      const ia = state.events.indexOf(a);
      const ib = state.events.indexOf(b);
      return ia - ib;
    }
    return da - db;
  });
  if (eventSortDirection === "desc") eventsCopy.reverse();

  updateEventSortHeaderLabel();

  eventsCopy.forEach((ev) => {
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    nameTd.textContent = ev.name || "Unnamed Event";

    const dateTd = document.createElement("td");
    dateTd.textContent = formatEventDate(ev.date);

    const typeTd = document.createElement("td");
    typeTd.textContent = ev.type || "—";

    const actionsTd = document.createElement("td");
    actionsTd.className = "event-actions-cell";

    const summarySpan = document.createElement("span");
    summarySpan.className = "event-actions-summary";
    summarySpan.textContent = getEventActionsSummary(ev);

    const editBtn = document.createElement("button");
    editBtn.className = "button small";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => openEventModal(ev.id));

    const delBtn = document.createElement("button");
    delBtn.className = "button small secondary";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteEvent(ev.id));

    actionsTd.appendChild(summarySpan);
    actionsTd.appendChild(editBtn);
    actionsTd.appendChild(delBtn);

    tr.appendChild(nameTd);
    tr.appendChild(dateTd);
    tr.appendChild(typeTd);
    tr.appendChild(actionsTd);

    tbody.appendChild(tr);
  });
}

function deleteEvent(id) {
  const idx = state.events.findIndex((ev) => ev.id === id);
  if (idx === -1) return;
  if (!confirm("Delete this event and all its actions?")) return;
  state.events.splice(idx, 1);
  renderEventList();
}

// ---------- Build / structure helpers ----------
function getAvailableStructuresForHexId(hexId) {
  if (!hexId) return ALL_STRUCTURES.slice();

  const hex = state.hexes.find((h) => h.id === hexId);
  if (!hex || !hex.structures) return ALL_STRUCTURES.slice();

  const existing = hex.structures
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

function buildHexOptions(selectedId) {
  let html = '<option value="">-- Select Hex --</option>';
  state.hexes.forEach((h) => {
    const label =
      (h.hexNumber || "(No Hex #)") + (h.name ? ` — ${h.name}` : "");
    const sel = h.id === selectedId ? "selected" : "";
    html += `<option value="${h.id}" ${sel}>${label}</option>`;
  });
  return html;
}

// ---------- Modal wiring ----------
function wireEventModal() {
  const modal = $("eventModal");
  if (!modal) return;

  const closeBtn = $("eventModalCloseBtn");
  const saveBtn = $("eventModalSaveBtn");
  const addBuildBtn = $("eventAddBuildBtn");
  const addMoveBtn = $("eventAddMovementBtn");
  const setOffBtn = $("eventSetOffenseBtn");

  if (closeBtn && !closeBtn._wired) {
    closeBtn.addEventListener("click", closeEventModal);
    closeBtn._wired = true;
  }
  if (saveBtn && !saveBtn._wired) {
    saveBtn.addEventListener("click", () => {
      closeEventModal();
      renderEventList();
    });
    saveBtn._wired = true;
  }
  if (!modal._backdropWired) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeEventModal();
    });
    modal._backdropWired = true;
  }
  if (addBuildBtn && !addBuildBtn._wired) {
    addBuildBtn.addEventListener("click", () => {
      const ev = getCurrentModalEvent();
      if (!ev) return;
      const id = "b_" + nextBuildId++;
      ev.builds.push({ id, hexId: "", description: "" });
      renderEventModalContent();
      renderEventList();
    });
    addBuildBtn._wired = true;
  }
  if (addMoveBtn && !addMoveBtn._wired) {
    addMoveBtn.addEventListener("click", () => {
      const ev = getCurrentModalEvent();
      if (!ev) return;
      const id = "m_" + nextMovementId++;
      ev.movements.push({ id, from: "", to: "", unit: "" });
      renderEventModalContent();
      renderEventList();
    });
    addMoveBtn._wired = true;
  }
  if (setOffBtn && !setOffBtn._wired) {
    setOffBtn.addEventListener("click", () => {
      const ev = getCurrentModalEvent();
      if (!ev) return;
      if (!ev.offensiveAction) {
        ev.offensiveAction = { type: "", target: "", notes: "" };
      }
      renderEventModalContent();
    });
    setOffBtn._wired = true;
  }
}

function getCurrentModalEvent() {
  if (!currentEventModalId) return null;
  return state.events.find((e) => e.id === currentEventModalId) || null;
}

function openEventModal(eventId) {
  currentEventModalId = eventId;
  const modal = $("eventModal");
  if (!modal) return;
  modal.classList.add("is-visible");
  renderEventModalContent();
}

function closeEventModal() {
  const modal = $("eventModal");
  if (modal) modal.classList.remove("is-visible");
  currentEventModalId = null;
}

function renderEventModalContent() {
  const ev = getCurrentModalEvent();
  if (!ev) return;

  const title = $("eventModalTitle");
  const subtitle = $("eventModalSubtitle");
  const nameInput = $("eventModalName");
  const dateInput = $("eventModalDate");
  const typeSelect = $("eventModalType");
  const summaryInput = $("eventModalSummary");

  if (title) title.textContent = ev.name || "Unnamed Event";
  if (subtitle)
    subtitle.textContent = [ev.type || "", formatEventDate(ev.date)]
      .filter(Boolean)
      .join(" • ");

  if (nameInput) {
    nameInput.value = ev.name || "";
    nameInput.oninput = (e) => {
      ev.name = e.target.value;
      if (title) title.textContent = ev.name || "Unnamed Event";
      renderEventList();
    };
  }
  if (dateInput) {
    dateInput.value = ev.date || "";
    dateInput.oninput = (e) => {
      ev.date = e.target.value;
      renderEventList();
    };
  }
  if (typeSelect) {
    typeSelect.value = ev.type || "";
    typeSelect.onchange = (e) => {
      ev.type = e.target.value;
      renderEventList();
    };
  }
  if (summaryInput) {
    summaryInput.value = ev.summary || "";
    summaryInput.oninput = (e) => {
      ev.summary = e.target.value;
    };
  }

  const buildsBody = $("eventBuildsBody");
  if (buildsBody) {
    buildsBody.innerHTML = "";
    (ev.builds || []).forEach((b) => {
      const tr = document.createElement("tr");

      const hexTd = document.createElement("td");
      const hexSelect = document.createElement("select");
      hexSelect.innerHTML = buildHexOptions(b.hexId);
      hexSelect.addEventListener("change", (e) => {
        b.hexId = e.target.value;
        renderEventModalContent();
        renderEventList();
      });
      hexTd.appendChild(hexSelect);

      const avail = getAvailableStructuresForHexId(b.hexId);
      const upTd = document.createElement("td");
      const upSelect = document.createElement("select");
      upSelect.innerHTML = structureSelectOptions(b.description || "", avail);
      upSelect.addEventListener("change", (e) => {
        b.description = e.target.value;
        renderEventList();
      });
      upTd.appendChild(upSelect);

      const delTd = document.createElement("td");
      const delBtn = document.createElement("button");
      delBtn.className = "button small secondary";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => {
        ev.builds = ev.builds.filter((x) => x.id !== b.id);
        renderEventModalContent();
        renderEventList();
      });
      delTd.appendChild(delBtn);

      tr.appendChild(hexTd);
      tr.appendChild(upTd);
      tr.appendChild(delTd);

      buildsBody.appendChild(tr);
    });
  }

  const movesBody = $("eventMovementsBody");
  if (movesBody) {
    movesBody.innerHTML = "";
    (ev.movements || []).forEach((m) => {
      const tr = document.createElement("tr");

      const fromTd = document.createElement("td");
      const fromInput = document.createElement("input");
      fromInput.type = "text";
      fromInput.value = m.from || "";
      fromInput.addEventListener("input", (e) => {
        m.from = e.target.value;
      });
      fromTd.appendChild(fromInput);

      const toTd = document.createElement("td");
      const toInput = document.createElement("input");
      toInput.type = "text";
      toInput.value = m.to || "";
      toInput.addEventListener("input", (e) => {
        m.to = e.target.value;
      });
      toTd.appendChild(toInput);

      const unitTd = document.createElement("td");
      const unitInput = document.createElement("input");
      unitInput.type = "text";
      unitInput.value = m.unit || "";
      unitInput.addEventListener("input", (e) => {
        m.unit = e.target.value;
      });
      unitTd.appendChild(unitInput);

      const delTd = document.createElement("td");
      const delBtn = document.createElement("button");
      delBtn.className = "button small secondary";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => {
        ev.movements = ev.movements.filter((x) => x.id !== m.id);
        renderEventModalContent();
        renderEventList();
      });
      delTd.appendChild(delBtn);

      tr.appendChild(fromTd);
      tr.appendChild(toTd);
      tr.appendChild(unitTd);
      tr.appendChild(delTd);

      movesBody.appendChild(tr);
    });
  }

  const offBody = $("eventOffenseBody");
  if (offBody) {
    offBody.innerHTML = "";
    const oa = ev.offensiveAction || {};

    if (!oa.type && !oa.target && !oa.notes) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent =
        "No offensive action set. Click 'Offensive Action' above to add one.";
      offBody.appendChild(p);
    } else {
      const typeField = document.createElement("div");
      typeField.className = "field";
      typeField.innerHTML = "<label>Type</label>";
      const typeInput = document.createElement("input");
      typeInput.type = "text";
      typeInput.value = oa.type || "";
      typeInput.addEventListener("input", (e) => {
        oa.type = e.target.value;
        renderEventList();
      });
      typeField.appendChild(typeInput);

      const targetField = document.createElement("div");
      targetField.className = "field";
      targetField.innerHTML = "<label>Target</label>";
      const targetInput = document.createElement("input");
      targetInput.type = "text";
      targetInput.value = oa.target || "";
      targetInput.addEventListener("input", (e) => {
        oa.target = e.target.value;
        renderEventList();
      });
      targetField.appendChild(targetInput);

      const notesField = document.createElement("div");
      notesField.className = "field";
      notesField.innerHTML = "<label>Notes</label>";
      const notesArea = document.createElement("textarea");
      notesArea.rows = 2;
      notesArea.value = oa.notes || "";
      notesArea.addEventListener("input", (e) => {
        oa.notes = e.target.value;
      });
      notesField.appendChild(notesArea);

      const row = document.createElement("div");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "1fr 1fr";
      row.style.gap = "10px 16px";
      row.appendChild(typeField);
      row.appendChild(targetField);

      offBody.appendChild(row);
      offBody.appendChild(notesField);

      const delWrap = document.createElement("div");
      delWrap.style.marginTop = "6px";
      const delBtn = document.createElement("button");
      delBtn.className = "button small secondary";
      delBtn.textContent = "Remove Offensive Action";
      delBtn.addEventListener("click", () => {
        ev.offensiveAction = { type: "", target: "", notes: "" };
        renderEventModalContent();
        renderEventList();
      });
      delWrap.appendChild(delBtn);
      offBody.appendChild(delWrap);
    }
  }
}

// ======================================================
// Controlled Hexes
// ======================================================
function wireHexes() {
  const addHexBtn = $("addHexBtn"); // (optional, if you add a separate button)
  if (addHexBtn && !addHexBtn._wired) {
    addHexBtn.addEventListener("click", addHexFromForm);
    addHexBtn._wired = true;
  }

  // If you want hex added when leaving fields, wire that here instead.
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

function addHexFromForm() {
  const nameInput = $("newHexName");
  const hexInput = $("newHexNumber");
  const terrainSelect = $("newHexTerrainSelect");
  const structList = $("newHexStructures");
  const notesInput = $("newHexNotes");

  if (!nameInput || !hexInput) return;

  const name = nameInput.value.trim();
  const hexNumber = hexInput.value.trim();
  const terrain = terrainSelect ? terrainSelect.value : "";
  const structures = structList ? structList.value.trim() : "";
  const notes = notesInput ? notesInput.value.trim() : "";

  if (!name && !hexNumber && !terrain && !structures && !notes) return;

  const id = "hex_" + nextHexId++;
  state.hexes.push({
    id,
    name,
    hexNumber,
    terrain,
    structures,
    notes,
    detailsOpen: false
  });

  nameInput.value = "";
  hexInput.value = "";
  if (terrainSelect) terrainSelect.value = "";
  if (structList) structList.value = "";
  if (notesInput) notesInput.value = "";

  renderHexList();
}

function renderHexList() {
  const tbody = $("hexListBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  state.hexes.forEach((h) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${h.name || ""}</td>
      <td>${h.hexNumber || ""}</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td>
        <button class="button small" data-id="${h.id}" data-action="toggle-hex">
          ${h.detailsOpen ? "Hide" : "Show"}
        </button>
      </td>
    `;

    tbody.appendChild(row);

    if (h.detailsOpen) {
      const det = document.createElement("tr");
      det.innerHTML = `
        <td colspan="7">
          <strong>Terrain:</strong> ${h.terrain || ""}<br>
          <strong>Structures:</strong> ${h.structures || ""}<br>
          <strong>Notes:</strong> ${h.notes || ""}<br><br>
          <button class="button small" data-id="${h.id}" data-action="edit-hex">Edit</button>
          <button class="button small secondary" data-id="${h.id}" data-action="delete-hex">Delete</button>
        </td>
      `;
      tbody.appendChild(det);
    }
  });

  tbody.onclick = (ev) => {
    const btn = ev.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const action = btn.getAttribute("data-action");
    if (action === "toggle-hex") {
      toggleHexDetails(id);
    } else if (action === "edit-hex") {
      editHex(id);
    } else if (action === "delete-hex") {
      deleteHex(id);
    }
  };
}

function toggleHexDetails(id) {
  const hex = state.hexes.find((h) => h.id === id);
  if (!hex) return;
  hex.detailsOpen = !hex.detailsOpen;
  renderHexList();
}

function editHex(id) {
  const hex = state.hexes.find((h) => h.id === id);
  if (!hex) return;

  if ($("newHexName")) $("newHexName").value = hex.name || "";
  if ($("newHexNumber")) $("newHexNumber").value = hex.hexNumber || "";
  if ($("newHexTerrainSelect")) $("newHexTerrainSelect").value = hex.terrain || "";
  if ($("newHexStructures")) $("newHexStructures").value = hex.structures || "";
  if ($("newHexNotes")) $("newHexNotes").value = hex.notes || "";

  state.hexes = state.hexes.filter((h) => h.id !== id);
  renderHexList();
}

function deleteHex(id) {
  state.hexes = state.hexes.filter((h) => h.id !== id);
  renderHexList();
}

// ======================================================
// Load / Save
// ======================================================
function wireTopControls() {
  const loadFile = $("loadStateFile");
  const saveBtn = $("saveStateBtn");

  if (loadFile && !loadFile._wired) {
    loadFile.addEventListener("change", handleLoadFile);
    loadFile._wired = true;
  }
  if (saveBtn && !saveBtn._wired) {
    saveBtn.addEventListener("click", handleSaveState);
    saveBtn._wired = true;
  }
}

function handleSaveState() {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "faction-data.json";
  a.click();
  URL.revokeObjectURL(url);
}

function handleLoadFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const obj = JSON.parse(ev.target.result);
      loadStateObject(obj);
    } catch (err) {
      alert("Could not read faction file. Is it a valid JSON save?");
      console.error(err);
    }
  };
  reader.readAsText(file);
}

function loadStateObject(obj) {
  state.factionName = obj.factionName || "";
  state.factionNotes = obj.factionNotes || "";
  state.coffers = Object.assign(
    { food: "", wood: "", stone: "", ore: "", silver: "", gold: "" },
    obj.coffers || {}
  );
  state.seasonalEntries = Array.isArray(obj.seasonalEntries)
    ? obj.seasonalEntries
    : [];
  state.events = Array.isArray(obj.events) ? obj.events : [];
  state.hexes = Array.isArray(obj.hexes) ? obj.hexes : [];

  nextSeasonEntryId =
    1 +
    Math.max(
      0,
      ...state.seasonalEntries.map((e) => {
        const n = parseInt(String(e.id || "").split("_")[1], 10);
        return Number.isFinite(n) ? n : 0;
      })
    );
  nextEventId =
    1 +
    Math.max(
      0,
      ...state.events.map((e) => {
        const n = parseInt(String(e.id || "").split("_")[1], 10);
        return Number.isFinite(n) ? n : 0;
      })
    );
  nextHexId =
    1 +
    Math.max(
      0,
      ...state.hexes.map((h) => {
        const n = parseInt(String(h.id || "").split("_")[1], 10);
        return Number.isFinite(n) ? n : 0;
      })
    );

  syncFactionAndCoffersToUI();
  renderSeasonTable();
  renderEventList();
  renderHexList();
}
