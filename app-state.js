// app-state.js

// ---------- GLOBAL STATE ----------
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
  seasonGains: []
};

let nextHexId = 1;
let nextEventId = 1;
let nextBuildId = 1;
let nextMovementId = 1;
let nextSeasonGainId = 1;

const TERRAIN_OPTIONS = ["Plains", "Forest", "Mountain", "Sea", "Blasted Lands"];

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


let eventSortDirection = "asc";

// ---------- DIRTY / UNSAVED-CHANGES ----------
let isDirty = false;

function handleBeforeUnload(e) {
  if (!isDirty) return;
  e.preventDefault();
  e.returnValue = "";
}

function markDirty() {
  if (!isDirty) {
    isDirty = true;
    window.addEventListener("beforeunload", handleBeforeUnload);
  }
}

function clearDirty() {
  if (isDirty) {
    isDirty = false;
    window.removeEventListener("beforeunload", handleBeforeUnload);
  }
}

// ---------- HELPERS ----------
function $(id) {
  return document.getElementById(id);
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
  events.forEach((ev) => (ev.builds || []).forEach((b) => list.push(b)));
  return list;
}

function flattenMovements(events) {
  const list = [];
  events.forEach((ev) => (ev.movements || []).forEach((m) => list.push(m)));
  return list;
}

// ---------- TOP CONTROLS (LOAD / SAVE) ----------
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

  clearDirty();
}

function handleLoadFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const obj = JSON.parse(evt.target.result);
      loadStateObject(obj);
      clearDirty();
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

  // Seasonal gains
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
        notes: sg.notes || "",
        detailsOpen: !!sg.detailsOpen
      }))
    : [];

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

// ---------- FACTION INFO ----------
function wireFactionInfo() {
  const nameInput = $("factionName");
  const notesInput = $("factionNotes");

  if (nameInput) {
    nameInput.addEventListener("input", () => {
      state.factionName = nameInput.value;
      markDirty();
    });
  }
  if (notesInput) {
    notesInput.addEventListener("input", () => {
      state.factionNotes = notesInput.value;
      markDirty();
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
      markDirty();
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
