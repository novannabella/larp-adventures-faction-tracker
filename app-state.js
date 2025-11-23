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

// ---------- HELPERS (Including the global $) ----------
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
  events.forEach(e => e.builds?.forEach(b => list.push(b)));
  return list;
}

function flattenMovements(events) {
  const list = [];
  events.forEach(e => e.movements?.forEach(m => list.push(m)));
  return list;
}


// ---------- SAVE/LOAD LOGIC ----------

function saveState() {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const now = new Date().toISOString().replace(/:/g, "-").slice(0, 19);
  const filename = `${state.factionName || 'faction'}-state-${now}.json`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  clearDirty();
}

function loadStateFile() {
  const fileInput = $("loadStateFile");
  if (!fileInput) return;

  fileInput.click();
  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const obj = JSON.parse(event.target.result);
        loadStateObject(obj);
      } catch (error) {
        alert("Invalid JSON file. Please check the file contents.");
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };
}

function loadStateObject(obj) {
  if (typeof obj !== "object" || !obj) {
    alert("Invalid state file.");
    return;
  }
  
  // FIX: Make the merge logic robust for old data missing new properties
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

  // Hexes: Ensure all hexes have mineralDeposit, or default to empty string/assignmentsApplied
  state.hexes = (obj.hexes || []).map(hex => ({
    mineralDeposit: hex.mineralDeposit || "",
    ...hex
  }));

  // SeasonGains: Ensure assignmentsApplied exists
  state.seasonGains = (obj.seasonGains || []).map(sg => ({
    ...sg,
    assignments: sg.assignments || "{}", 
    assignmentsApplied: sg.assignmentsApplied ?? false, // Ensure assignmentsApplied exists and defaults to false
  }));
  
  // Events and nested actions
  state.events = (obj.events || []).map(event => ({
    ...event,
    builds: (event.builds || []).map(b => ({ ...b })),
    movements: (event.movements || []).map(m => ({ ...m })),
    offensiveAction: event.offensiveAction || null
  }));


  // FIX: Recalculate ALL IDs to prevent collision on next creation
  nextHexId = calcNextNumericId(state.hexes, "hex_");
  nextEventId = calcNextNumericId(state.events, "event_");
  nextBuildId = calcNextNumericId(flattenBuilds(state.events), "build_");
  nextMovementId = calcNextNumericId(flattenMovements(state.events), "move_");
  nextSeasonGainId = calcNextNumericId(state.seasonGains, "sg_");
  
  // Rerender UI functions (assuming they are globally available after scripts load)
  if (typeof syncCoffersToUI === 'function') syncCoffersToUI();
  if (typeof syncFactionInfoToUI === 'function') syncFactionInfoToUI();
  if (typeof renderHexList === 'function') renderHexList();
  if (typeof renderEventList === 'function') renderEventList();
  if (typeof renderSeasonGainList === 'function') renderSeasonGainList();
  
  clearDirty();
}

// ---------- TOP CONTROLS ----------
function wireTopControls() {
  const loadBtn = $("loadStateBtn");
  const saveBtn = $("saveStateBtn");

  if (loadBtn) {
    loadBtn.addEventListener("click", loadStateFile);
  }
  if (saveBtn) {
    saveBtn.addEventListener("click", saveState);
  }
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