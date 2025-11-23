// logic-hexes.js

let upkeepTable = {};

// NEW: Define sorting state for hex list
let currentHexSort = {
  column: "hexNumber", // Default sort column is Hex Number
  direction: "asc"     // Default sort direction
};

// NEW: Comparator function for sorting hexes
function hexComparator(a, b) {
  const col = currentHexSort.column;
  const dir = currentHexSort.direction === "asc" ? 1 : -1;

  let aVal;
  let bVal;

  if (col === "hexNumber") {
    // Attempt numeric comparison for hex numbers if they are purely numeric
    // Otherwise, treat them as strings (which is safer for mixed inputs like "A1", "1A")
    aVal = a.hexNumber || "";
    bVal = b.hexNumber || "";
    
    // Simple string comparison for hex numbers
    if (aVal < bVal) return -1 * dir;
    if (aVal > bVal) return 1 * dir;
    return 0;
    
  } else if (col === "name") {
    aVal = a.name || "";
    bVal = b.name || "";
    
    // Case-insensitive string comparison for names
    const aLower = aVal.toLowerCase();
    const bLower = bVal.toLowerCase();
    
    if (aLower < bLower) return -1 * dir;
    if (aLower > bLower) return 1 * dir;
    return 0;
  }
  
  return 0;
}

// Define prerequisites for structures
const structurePrerequisites = {
  "Shipyard": ["Dock"],
  "Fishing Fleet": ["Dock"],
  "Trading Vessel": ["Dock"],
  "War Galley": ["Dock", "Shipyard"] // Requires both a Dock (implicit via Shipyard, but checking explicitly is safer) and a Shipyard
};

function initHexSection() {
  const addBtn = $("hexAddBtn");
  if (addBtn && !addBtn._wired) {
    addBtn.addEventListener("click", () => openHexModal());
    addBtn._wired = true;
  }

  const upkeepBtn = $("hexUpkeepBtn");
  if (upkeepBtn && !upkeepBtn._wired) {
    upkeepBtn.addEventListener("click", openUpkeepModal);
    upkeepBtn._wired = true;
  }

  const saveBtn = $("hexModalSaveBtn");
  if (saveBtn && !saveBtn._wired) {
    saveBtn.addEventListener("click", saveHexFromModal);
    saveBtn._wired = true;
  }

  const terrAdd = $("hexModalTerrainAddBtn");
  if (terrAdd && !terrAdd._wired) {
    terrAdd.addEventListener("click", () => {
      const sel = $("hexModalTerrainSelect");
      const list = $("hexModalTerrains");
      if (!sel || !list) return;
      const val = (sel.value || "").trim();
      if (!val) return;
      const current = list.value
        ? list.value.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      if (!current.includes(val)) {
        current.push(val);
        list.value = current.join(", ");
      }
      sel.value = "";
    });
    terrAdd._wired = true;
  }

  const structAdd = $("hexModalStructureAddBtn");
  if (structAdd && !structAdd._wired) {
    structAdd.addEventListener("click", () => {
      const sel = $("hexModalStructureSelect");
      const list = $("hexModalStructures");
      if (!sel || !list) return;
      const val = (sel.value || "").trim();
      if (!val) return;

      const current = list.value
        ? list.value.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      
      // NEW PREREQUISITE CHECK LOGIC
      const required = structurePrerequisites[val];
      let canAdd = true;
      let missingPrereqs = [];

      if (required) {
        required.forEach(prereq => {
          if (!current.includes(prereq)) {
            canAdd = false;
            missingPrereqs.push(prereq);
          }
        });

        if (!canAdd) {
          alert(`Cannot add ${val}. Missing prerequisites: ${missingPrereqs.join(', ')}.`);
          sel.value = "";
          return; // Stop the function if prerequisites are missing
        }
      }
      // END NEW PREREQUISITE CHECK LOGIC
      
      if (!current.includes(val)) {
        current.push(val);
        list.value = current.join(", ");

        // Remove the selected option from the dropdown
        const optionToRemove = sel.querySelector(`option[value="${val}"]`);
        if (optionToRemove) {
          optionToRemove.remove();
        }
      }
      sel.value = "";
    });
    structAdd._wired = true;
  }

  // NEW: Add click listeners for sorting headers
  const hexSortHexHeader = $("hexSortHexHeader");
  const hexSortNameHeader = $("hexSortNameHeader");

  if (hexSortHexHeader && !hexSortHexHeader._wired) {
    // We use "hexNumber" as the internal column name
    hexSortHexHeader.addEventListener("click", () => handleHexSort("hexNumber"));
    hexSortHexHeader._wired = true;
  }

  if (hexSortNameHeader && !hexSortNameHeader._wired) {
    // We use "name" as the internal column name
    hexSortNameHeader.addEventListener("click", () => handleHexSort("name"));
    hexSortNameHeader._wired = true;
  }
  // END NEW SORTING LOGIC

  loadUpkeepTable();
}

// NEW: Function to handle sort header clicks
function handleHexSort(column) {
  if (currentHexSort.column === column) {
    // Toggle direction if clicking the same column
    currentHexSort.direction = currentHexSort.direction === "asc" ? "desc" : "asc";
  } else {
    // New column, reset to ascending
    currentHexSort.column = column;
    currentHexSort.direction = "asc";
  }
  renderHexList(); // Re-render the list with the new sort state
}

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
      const idxOre = header.indexOf("Ore");
      const idxGold = header.indexOf("Gold");

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        const name = cols[idxUpgrade] || "";
        if (!name) continue;
        const food = parseInt(cols[idxFood] || "0", 10) || 0;
        const wood = parseInt(cols[idxWood] || "0", 10) || 0;
        const stone = parseInt(cols[idxStone] || "0", 10) || 0;
        const ore = parseInt(cols[idxOre] || "0", 10) || 0;
        const gold = parseInt(cols[idxGold] || "0", 10) || 0;
        upkeepTable[name] = { food, wood, stone, ore, gold };
      }
    })
    .catch(() => {
      upkeepTable = {};
    });
}

function calcHexUpkeep(hex) {
  const result = { food: 0, wood: 0, stone: 0, ore: 0, gold: 0 };
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
    result.ore += row.ore || 0;
    result.gold += row.gold || 0;
  });

  return result;
}

function openUpkeepModal() {
  const allUpkeep = { food: 0, wood: 0, stone: 0, ore: 0, gold: 0 };
  const upkeepDetails = {}; // Stores total count of each structure type

  state.hexes.forEach((hex) => {
    const hexUpkeep = calcHexUpkeep(hex);
    
    // Sum total resource upkeep
    allUpkeep.food += hexUpkeep.food;
    allUpkeep.wood += hexUpkeep.wood;
    allUpkeep.stone += hexUpkeep.stone;
    allUpkeep.ore += hexUpkeep.ore;
    allUpkeep.gold += hexUpkeep.gold;

    // Sum total structures
    if (hex.structure) {
      const names = hex.structure
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      names.forEach((name) => {
        if (upkeepTable[name]) { // Only count structures that have an upkeep cost
          upkeepDetails[name] = (upkeepDetails[name] || 0) + 1;
        }
      });
    }
  });

  const upkeepTbody = $("upkeepTable").querySelector("tbody");
  if (!upkeepTbody) return;
  upkeepTbody.innerHTML = "";

  // 1. Add rows for each individual structure count
  Object.keys(upkeepDetails).sort().forEach(structureName => {
    const count = upkeepDetails[structureName];
    const upkeep = upkeepTable[structureName] || { food: 0, wood: 0, stone: 0, ore: 0, gold: 0 };
    
    const row = upkeepTbody.insertRow();
    row.innerHTML = `
      <td>${structureName} (${count})</td>
      <td>${upkeep.food * count}</td>
      <td>${upkeep.wood * count}</td>
      <td>${upkeep.stone * count}</td>
      <td>${upkeep.ore * count}</td>
      <td>${upkeep.gold * count}</td>
    `;
  });

  // 2. Add a separator row
  const separatorRow = upkeepTbody.insertRow();
  separatorRow.innerHTML = `<td colspan="6" style="text-align: center; border-bottom: 2px solid var(--text-color);"></td>`;

  // 3. Add a row for the grand totals
  const totalRow = upkeepTbody.insertRow();
  totalRow.className = "total-row";
  totalRow.innerHTML = `
    <td><strong>TOTAL UPKEEP</strong></td>
    <td><strong>${allUpkeep.food}</strong></td>
    <td><strong>${allUpkeep.wood}</strong></td>
    <td><strong>${allUpkeep.stone}</strong></td>
    <td><strong>${allUpkeep.ore}</strong></td>
    <td><strong>${allUpkeep.gold}</strong></td>
  `;

  openModal("upkeepModal");
}

function openHexModal(hex) {
  $("hexModalId").value = hex ? hex.id : "";
  $("hexModalTitle").textContent = hex ? "Edit Hex" : "Add Hex";

  const structureSelect = $("hexModalStructureSelect");
  const structureListInput = $("hexModalStructures");
  const structureTemplate = $("structureOptionsTemplate");

  // Step 1: Reset and load all structure options from the hidden template
  // Keep the default option
  structureSelect.innerHTML = '<option value="">-- Add Structure / Upgrade --</option>'; 
  
  if (structureTemplate) {
      // Clone the template content and append it to the select element
      const templateClone = structureTemplate.cloneNode(true);
      // Append children of the clone (the optgroups)
      // Note: We move the children, not append the clone itself
      Array.from(templateClone.children).forEach(child => {
          structureSelect.appendChild(child.cloneNode(true));
      });
  }

  $("hexModalName").value = hex?.name || "";
  $("hexModalNumber").value = hex?.hexNumber || "";
  $("hexModalTerrains").value = hex?.terrain || "";
  structureListInput.value = hex?.structure || "";
  $("hexModalNotes").value = hex?.notes || "";
  $("hexModalTerrainSelect").value = "";
  $("hexModalStructureSelect").value = "";
  
  const currentStructures = structureListInput.value
      ? structureListInput.value.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  // Step 2: Remove options already present in the hex
  currentStructures.forEach(structure => {
      const optionToRemove = structureSelect.querySelector(`option[value="${structure}"]`);
      if (optionToRemove) {
          optionToRemove.remove();
      }
  });

  openModal("hexModal");
}

function saveHexFromModal() {
  const id = $("hexModalId").value || null;

  const name = $("hexModalName").value.trim();
  const hexNumber = $("hexModalNumber").value.trim();
  const terrain = $("hexModalTerrains").value.trim();
  const structure = $("hexModalStructures").value.trim();
  const notes = $("hexModalNotes").value.trim();

  if (!id) {
    const newId = `hex_${nextHexId++}`;
    state.hexes.push({
      id: newId,
      name,
      hexNumber,
      terrain,
      structure,
      notes
    });
  } else {
    const hex = state.hexes.find((h) => h.id === id);
    if (hex) {
      hex.name = name;
      hex.hexNumber = hexNumber;
      hex.terrain = terrain;
      hex.structure = structure;
      hex.notes = notes;
    }
  }

  markDirty();
  closeModal("hexModal");
  renderHexList();
}

function deleteHex(id) {
  if (!confirm("Delete this hex from the faction?")) return;
  state.hexes = state.hexes.filter((h) => h.id !== id);
  markDirty();
  renderHexList();
}

function openHexDetailsModal(hex) {
  const titleEl = $("detailsModalTitle");
  const bodyEl = $("detailsModalBody");
  if (!titleEl || !bodyEl) return;

  const upkeep = calcHexUpkeep(hex);
  titleEl.textContent = hex.name
    ? `Hex Details — ${hex.name}`
    : `Hex Details — ${hex.hexNumber || ""}`;

  bodyEl.innerHTML = `
    <div class="details-grid">
      <p><strong>Name:</strong> ${hex.name || "(Unnamed)"}</p>
      <p><strong>Hex Number:</strong> ${hex.hexNumber || "—"}</p>
      <p><strong>Terrain:</strong> ${hex.terrain || "—"}</p>
      <p><strong>Structures:</strong> ${hex.structure || "—"}</p>
      <p><strong>Upkeep Food:</strong> ${upkeep.food || 0}</p>
      <p><strong>Upkeep Wood:</strong> ${upkeep.wood || 0}</p>
      <p><strong>Upkeep Stone:</strong> ${upkeep.stone || 0}</p>
      <p><strong>Upkeep Ore:</strong> ${upkeep.ore || 0}</p>
      <p><strong>Upkeep Gold:</strong> ${upkeep.gold || 0}</p>
    </div>
    <div class="field-row">
      <label>Notes</label>
      <textarea readonly rows="4">${hex.notes || "—"}</textarea>
    </div>
  `;

  openModal("detailsModal");
}

function renderHexList() {
  const tbody = $("hexTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";
  
  // NEW: 1. Sort the hexes array based on current sort state
  const sortedHexes = [...state.hexes].sort(hexComparator);

  // NEW: 2. Update Header Sort Indicators
  const hexSortHexHeader = $("hexSortHexHeader");
  const hexSortNameHeader = $("hexSortNameHeader");
  const hexCol = currentHexSort.column;
  const hexDir = currentHexSort.direction === 'asc' ? '▲' : '▼';

  if (hexSortHexHeader) {
      hexSortHexHeader.innerHTML = `Hex ${hexCol === 'hexNumber' ? hexDir : ''}`;
  }
  if (hexSortNameHeader) {
      hexSortNameHeader.innerHTML = `Name ${hexCol === 'name' ? hexDir : ''}`;
  }

  // 3. Iterate over the sorted array
  sortedHexes.forEach((hex) => {
    const row = document.createElement("tr");
    row.className = "hex-row";

    function td(text) {
      const cell = document.createElement("td");
      cell.textContent = text;
      return cell;
    }

    // Match the header: Hex | Name | Terrain | Structures | Actions
    row.appendChild(td(hex.hexNumber || ""));
    row.appendChild(td(hex.name || "(Unnamed)"));
    row.appendChild(td(hex.terrain || ""));
    row.appendChild(td(hex.structure || ""));

    const actionsTd = document.createElement("td");
    actionsTd.style.whiteSpace = "nowrap";

    const detailsBtn = document.createElement("button");
    detailsBtn.className = "button small secondary";
    detailsBtn.textContent = "Details";

    const editBtn = document.createElement("button");
    editBtn.className = "button small secondary";
    editBtn.textContent = "Edit";

    const delBtn = document.createElement("button");
    delBtn.className = "button small secondary";
    delBtn.textContent = "Delete";

    actionsTd.appendChild(detailsBtn);
    actionsTd.appendChild(editBtn);
    actionsTd.appendChild(delBtn);
    row.appendChild(actionsTd);

    detailsBtn.addEventListener("click", () => openHexDetailsModal(hex));
    editBtn.addEventListener("click", () => openHexModal(hex));
    delBtn.addEventListener("click", () => deleteHex(hex.id));

    tbody.appendChild(row);
  });
}