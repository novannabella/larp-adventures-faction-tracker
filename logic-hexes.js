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
    aVal = a.hexNumber || "";
    bVal = b.hexNumber || "";
    
    // FIX: Attempt to sort numerically if possible (e.g. 1, 2, 10 instead of 1, 10, 2)
    const aNum = parseInt(aVal.replace(/[^0-9]/g, ''), 10);
    const bNum = parseInt(bVal.replace(/[^0-9]/g, ''), 10);
    
    if (!isNaN(aNum) && !isNaN(bNum)) {
        if (aNum < bNum) return -1 * dir;
        if (aNum > bNum) return 1 * dir;
    }
    
    // Fallback to string comparison
    if (aVal < bVal) return -1 * dir;
    if (aVal > bVal) return 1 * dir;
    return 0;
    
  } else if (col === "name") {
    aVal = a.name || "";
    bVal = b.name || "";
    
    const aLower = aVal.toLowerCase();
    const bLower = bVal.toLowerCase();
    
    if (aLower < bLower) return -1 * dir;
    if (aLower > bLower) return 1 * dir;
    return 0;
  }
  
  return 0;
}

// Define prerequisites for structures (Uses Title Case for keys/values for consistency with template)
const structurePrerequisites = {
  "Shipyard": ["Dock"],
  "Fishing Fleet": ["Dock"],
  "Trading Vessel": ["Dock"],
  "War Galley": ["Dock", "Shipyard"] // Requires both a Dock and a Shipyard
};

// NEW: Helper function to render the tag list with remove buttons
function renderTags(inputElId, listElId, selectElId, isStructure = false) {
  const inputEl = $(inputElId);
  const listEl = $(listElId);
  const selectEl = $(selectElId);
  
  if (!inputEl || !listEl) return;

  // Values stored in inputEl.value should match the Title Case options in the template
  const currentValues = inputEl.value
    ? inputEl.value.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  listEl.innerHTML = "";

  currentValues.forEach((val) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.innerHTML = `${val} <span class="remove-tag">&times;</span>`;

    tag.querySelector(".remove-tag").addEventListener("click", () => {
      // Remove the value from the list
      const updatedValues = currentValues.filter(v => v !== val);
      inputEl.value = updatedValues.join(", ");

      // If it's a structure, add the option back to the select dropdown
      if (isStructure && selectEl) {
        const option = document.createElement("option");
        option.value = val;
        option.textContent = val;
        
        // Find the correct optgroup to re-insert the option
        const template = $("structureOptionsTemplate");
        let targetOptgroup = null;
        
        // FIX: Ensure template and template.content exist before cloning/searching
        if (template && template.content) { 
          // Find the label in the template that matches the option
          const allOptions = Array.from(template.content.querySelectorAll('option'));
          const originalOption = allOptions.find(opt => opt.value === val);

          if (originalOption && originalOption.parentElement.tagName === 'OPTGROUP') {
            const optGroupLabel = originalOption.parentElement.label;
            targetOptgroup = selectEl.querySelector(`optgroup[label="${optGroupLabel}"]`);
          }
        }
        
        // Fallback to appending directly if optgroup isn't found
        if (targetOptgroup) {
            targetOptgroup.appendChild(option);
        } else {
            selectEl.appendChild(option);
        }
      }

      // Re-render the list to reflect the removal
      renderTags(inputElId, listElId, selectElId, isStructure);
    });

    listEl.appendChild(tag);
  });
}


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
      const list = $("hexModalTerrainsInput"); 
      const tagsContainer = $("hexModalTerrainsTags"); 
      
      if (!sel || !list || !tagsContainer) return;

      const val = (sel.value || "").trim();
      if (!val) return;
      
      const current = list.value
        ? list.value.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
        
      if (!current.includes(val)) {
        current.push(val);
        list.value = current.join(", ");
        renderTags("hexModalTerrainsInput", "hexModalTerrainsTags");
      }
    });
    terrAdd._wired = true;
  }

  const structAdd = $("hexModalStructureAddBtn");
  if (structAdd && !structAdd._wired) {
    structAdd.addEventListener("click", () => {
      const sel = $("hexModalStructureSelect");
      const list = $("hexModalStructuresInput");
      const tagsContainer = $("hexModalStructuresTags");

      if (!sel || !list || !tagsContainer) return;

      const val = (sel.value || "").trim(); // This is the Title Case structure name (e.g., "Shipyard")
      if (!val) return;
      
      const current = list.value
        ? list.value.split(",").map((s) => s.trim()).filter(Boolean) // Array of Title Case structures
        : [];
      
      // Map current list to lowercase for case-insensitive checking
      const currentLower = current.map(s => s.toLowerCase());

      // Prerequisite check (keys in structurePrerequisites are Title Case)
      const prereqs = structurePrerequisites[val];
      if (prereqs) {
          // Check if ALL prerequisites (converted to lowercase) are in the current list (converted to lowercase)
          const missingPrereqs = prereqs.filter(p => !currentLower.includes(p.toLowerCase()));
          
          if (missingPrereqs.length > 0) {
              alert(`Cannot add ${val}. Missing prerequisites: ${missingPrereqs.join(', ')}`);
              return;
          }
      }
        
      if (!current.includes(val)) {
        current.push(val);
        list.value = current.join(", ");
        
        // Remove from dropdown
        const optionToRemove = sel.querySelector(`option[value="${val}"]`);
        if (optionToRemove) optionToRemove.remove();
        
        renderTags("hexModalStructuresInput", "hexModalStructuresTags", "hexModalStructureSelect", true);
      }
    });
    structAdd._wired = true;
  }
  
  // Wire sort headers
  const hexSortHeader = $("hexSortHexHeader");
  if (hexSortHeader && !hexSortHeader._wired) {
    hexSortHeader.addEventListener("click", () => handleHexSortClick("hexNumber"));
    hexSortHeader._wired = true;
  }
  
  const nameSortHeader = $("hexSortNameHeader");
  if (nameSortHeader && !nameSortHeader._wired) {
    nameSortHeader.addEventListener("click", () => handleHexSortClick("name"));
    nameSortHeader._wired = true;
  }

  loadUpkeepTable();
  renderHexList();
}

function handleHexSortClick(column) {
  if (currentHexSort.column === column) {
    currentHexSort.direction = currentHexSort.direction === "asc" ? "desc" : "asc";
  } else {
    currentHexSort.column = column;
    currentHexSort.direction = "asc"; // Default to ascending when changing column
  }
  renderHexList();
}

function openHexModal(hex) {
  // FIX: Added defensive checks for all input fields to prevent TypeError if the element is missing.
  if ($("hexModalId")) $("hexModalId").value = hex ? hex.id : "";
  if ($("hexModalTitle")) $("hexModalTitle").textContent = hex ? "Edit Hex" : "Add Hex";

  if ($("hexModalHexNumber")) $("hexModalHexNumber").value = hex?.hexNumber || "";
  if ($("hexModalName")) $("hexModalName").value = hex?.name || "";
  if ($("hexModalController")) $("hexModalController").value = hex?.controller || "Faction";
  if ($("hexModalTroops")) $("hexModalTroops").value = hex?.troops || "";
  if ($("hexModalNotes")) $("hexModalNotes").value = hex?.notes || "";
  
  // Line 234 equivalent (now with defensive check):
  if ($("hexModalMineralDeposit")) $("hexModalMineralDeposit").value = hex?.mineralDeposit || "";
  
  // Set up terrain
  if ($("hexModalTerrainsInput")) $("hexModalTerrainsInput").value = hex?.terrain || "";
  renderTags("hexModalTerrainsInput", "hexModalTerrainsTags");
  
  // Set up structures
  if ($("hexModalStructuresInput")) $("hexModalStructuresInput").value = hex?.structure || "";
  
  // Re-populate the structures dropdown by cloning the template
  const selectEl = $("hexModalStructureSelect");
  const template = $("structureOptionsTemplate");

  // FIX: Added check for template.content to ensure we only proceed if a valid <template> was found
  if (selectEl && template && template.content) {
    selectEl.innerHTML = ""; // Clear existing options
    const clone = template.content.cloneNode(true);
    selectEl.appendChild(clone);
  }
  
  // Remove existing structures from the dropdown
  const currentStructures = hex?.structure 
    ? hex.structure.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  
  if (selectEl) {
    currentStructures.forEach(struct => {
      // struct will be Title Case, matching the option's value
      const option = selectEl.querySelector(`option[value="${struct}"]`);
      if (option) option.remove();
    });
  }
  
  renderTags("hexModalStructuresInput", "hexModalStructuresTags", "hexModalStructureSelect", true);

  openModal("hexModal");
}

function saveHexFromModal() {
  // FIX: Used defensive checks/optional chaining for getting values as well
  const id = $("hexModalId")?.value || null;

  const hexNumber = $("hexModalHexNumber")?.value.trim();
  const name = $("hexModalName")?.value.trim();
  const controller = $("hexModalController")?.value;
  const troops = $("hexModalTroops")?.value.trim();
  const notes = $("hexModalNotes")?.value.trim();
  const mineralDeposit = $("hexModalMineralDeposit")?.value.trim();

  // Get comma-separated list values (will be Title Case from the tags/input)
  const terrain = $("hexModalTerrainsInput")?.value.trim();
  const structure = $("hexModalStructuresInput")?.value.trim();
  
  if (!hexNumber) {
    alert("Hex Number is required.");
    return;
  }
  
  // Prerequisite check for *new* structures
  const structuresList = structure?.split(",").map(s => s.trim()).filter(Boolean) || [];
  const structuresListLower = structuresList.map(s => s.toLowerCase());

  let failedPrereq = false;
  structuresList.forEach(s => {
      // s is Title Case structure name
      const prereqs = structurePrerequisites[s];
      if (prereqs) {
          // Check if ALL prerequisites (converted to lowercase) are in the full list (converted to lowercase)
          const missingPrereqs = prereqs.filter(p => !structuresListLower.includes(p.toLowerCase()));
          
          if (missingPrereqs.length > 0) {
              alert(`Cannot save. Structure "${s}" requires: ${missingPrereqs.join(', ')}`);
              failedPrereq = true;
          }
      }
  });
  if (failedPrereq) return;


  const newHexData = {
    hexNumber,
    name,
    controller,
    troops,
    notes,
    mineralDeposit,
    terrain,
    structure,
  };
  
  if (!id) {
    const newId = `hex_${nextHexId++}`;
    state.hexes.push({
      id: newId,
      ...newHexData,
      detailsOpen: false
    });
  } else {
    const existingIndex = state.hexes.findIndex((h) => h.id === id);
    if (existingIndex !== -1) {
      state.hexes[existingIndex] = {
        ...state.hexes[existingIndex],
        ...newHexData
      };
    }
  }

  markDirty();
  closeModal("hexModal");
  renderHexList();
}

function deleteHex(id) {
  if (!confirm("Delete this controlled hex?")) return;
  state.hexes = state.hexes.filter((h) => h.id !== id);
  markDirty();
  renderHexList();
}


// logic-hexes.js (Updated renderHexList function)

function renderHexList() {
  const tbody = $("hexTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  // 1. Sort the hexes
  const sortedHexes = [...state.hexes].sort(hexComparator);

  // 2. Update the sort headers' indicators
  const hexColIndicator = currentHexSort.column === "hexNumber" ? (currentHexSort.direction === "asc" ? "▲" : "▼") : "";
  const nameColIndicator = currentHexSort.column === "name" ? (currentHexSort.direction === "asc" ? "▲" : "▼") : "";

  // FIX: Ensure the header text is always present, and append the indicator span
  if ($("hexSortHexHeader")) {
      const header = $("hexSortHexHeader");
      header.innerHTML = `Hex <span class="sort-indicator">${hexColIndicator}</span>`;
  }
  if ($("hexSortNameHeader")) {
      const header = $("hexSortNameHeader");
      header.innerHTML = `Name <span class="sort-indicator">${nameColIndicator}</span>`;
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
function openHexDetailsModal(hex) {
  // Assuming a global upkeepTable is loaded from CSV
  const structureUpkeep = hex.structure?.split(",").map(s => s.trim()).filter(Boolean).reduce((acc, struct) => {
      // Look up upkeep using the lowercase name for consistency with loadUpkeepTable
      const entry = upkeepTable[struct.toLowerCase()];
      if (entry) {
          acc.food += entry.food;
          acc.wood += entry.wood;
          acc.stone += entry.stone;
          acc.ore += entry.ore;
          acc.gold += entry.gold;
      }
      return acc;
  }, { food: 0, wood: 0, stone: 0, ore: 0, gold: 0 });

  const titleEl = $("detailsModalTitle");
  const bodyEl = $("detailsModalBody");
  if (!titleEl || !bodyEl) return;

  titleEl.textContent = hex.hexNumber ? `Hex Details — ${hex.hexNumber}` : "Hex Details";

  // Display hex info and calculated upkeep
  const upkeep = structureUpkeep || { food: 0, wood: 0, stone: 0, ore: 0, gold: 0 };
  bodyEl.innerHTML = `
    <div class="details-grid hex-details-grid">
      <p><strong>Hex Number:</strong> ${hex.hexNumber || "—"}</p>
      <p><strong>Name:</strong> ${hex.name || "—"}</p>
      <p><strong>Controller:</strong> ${hex.controller || "—"}</p>
      <p><strong>Troops:</strong> ${hex.troops || "—"}</p>
      <p><strong>Terrain:</strong> ${hex.terrain || "—"}</p>
      <p><strong>Structures:</strong> ${hex.structure || "—"}</p>
      <p><strong>Mineral Deposit:</strong> ${hex.mineralDeposit || "—"}</p>
      
      <h4 style="grid-column: 1 / -1; margin-top: 15px; margin-bottom: 5px;">Upkeep per Season</h4>
      <p><strong>Food:</strong> ${upkeep.food || 0}</p>
      <p><strong>Wood:</strong> ${upkeep.wood || 0}</p>
      <p><strong>Stone:</strong> ${upkeep.stone || 0}</p>
      <p><strong>Ore:</strong> ${upkeep.ore || 0}</p>
      <p><strong>Gold:</strong> ${upkeep.gold || 0}</p>
      
      <p style="grid-column: 1 / -1; margin-top: 8px;">
        <strong>Notes:</strong><br />
        ${hex.notes ? hex.notes.replace(/\n/g, "<br />") : "—"}
      </p>
    </div>
  `;

  openModal("detailsModal");
}

// --- Upkeep Modal Logic ---

// Function to load the upkeep table from CSV (or local storage/hardcoded)
function loadUpkeepTable() {
    // NOTE: Keys here MUST be lowercase to match the .toLowerCase() lookup in openHexDetailsModal
    const csvData = `Terrain/Upgrade,Food,Wood,Stone,Gold,Silver,Ore
market,-1,,-1,,,-1
carpenter's shop,,*2,,,
blacksmith,,,2,,,-1
bank,,,,-1,
stone mason's shop,,,2,,
watch tower,,-1,,,
fort,,,-2,,,-1
castle,,,,-5,,
dock,,-1,,,
fishing fleet,-1,,-1,,,-1
trading vessel,,,-1,,,-1
war galley,,-2,-2,,,-2
`; 

    const lines = csvData.split("\n").map(l => l.trim()).filter(l => l.trim().length);
    if (lines.length < 2) return;

    upkeepTable = {};
    const header = lines[0].split(",").map((h) => h.trim());
    const idxUpgrade = header.indexOf("Terrain/Upgrade"); 
    const idxFood = header.indexOf("Food");
    const idxWood = header.indexOf("Wood");
    const idxStone = header.indexOf("Stone");
    const idxOre = header.indexOf("Ore");
    const idxGold = header.indexOf("Gold");
    

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        // Force the lookup key to lowercase to match the rest of the logic
        const name = (cols[idxUpgrade] || "").toLowerCase(); 
        if (!name) continue;

        // Upkeep numbers in the mock data are negative for loss
        const food = parseInt(cols[idxFood] || "0", 10) || 0;
        const wood = parseInt(cols[idxWood] || "0", 10) || 0;
        const stone = parseInt(cols[idxStone] || "0", 10) || 0;
        const ore = parseInt(cols[idxOre] || "0", 10) || 0;
        const gold = parseInt(cols[idxGold] || "0", 10) || 0;
        
        upkeepTable[name] = {
            food: food, 
            wood: wood, 
            stone: stone, 
            ore: ore, 
            gold: gold 
        };
    }
}


function openUpkeepModal() {
  const upkeepTbody = $("upkeepTable")?.querySelector("tbody");
  if (!upkeepTbody) return;

  upkeepTbody.innerHTML = "";

  // Group structures by type for easier display
  const structureCounts = {};
  state.hexes.forEach(hex => {
    // Convert to lowercase before counting to group structures correctly
    hex.structure?.split(",").map(s => s.trim().toLowerCase()).filter(Boolean).forEach(s => {
      structureCounts[s] = (structureCounts[s] || 0) + 1;
    });
  });

  let allUpkeep = { food: 0, wood: 0, stone: 0, ore: 0, gold: 0 };
  let hasUpkeep = false;

  // 1. Calculate and display upkeep per structure type
  Object.keys(structureCounts).sort().forEach(structName => {
    const count = structureCounts[structName];
    // structName is lowercase, matching the upkeepTable keys
    const upkeep = upkeepTable[structName];

    if (!upkeep || (upkeep.food === 0 && upkeep.wood === 0 && upkeep.stone === 0 && upkeep.ore === 0 && upkeep.gold === 0)) {
        return; // Skip structures with no upkeep defined
    }
    
    hasUpkeep = true;

    // Use a function to convert the lowercase name back to Title Case for display in the modal
    const displayName = structName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ').replace(/'S/g, "'s");

    const row = upkeepTbody.insertRow();
    row.innerHTML = `
      <td>${displayName} (${count} total)</td>
      <td>${upkeep.food * count}</td>
      <td>${upkeep.wood * count}</td>
      <td>${upkeep.stone * count}</td>
      <td>${upkeep.ore * count}</td>
      <td>${upkeep.gold * count}</td>
    `;

    allUpkeep.food += upkeep.food * count;
    allUpkeep.wood += upkeep.wood * count;
    allUpkeep.stone += upkeep.stone * count;
    allUpkeep.ore += upkeep.ore * count;
    allUpkeep.gold += upkeep.gold * count;
  });
  
  if (!hasUpkeep) {
      const row = upkeepTbody.insertRow();
      row.innerHTML = `<td colspan="6" style="text-align: center;">No structures currently incur upkeep.</td>`;
      openModal("upkeepModal");
      return;
  }

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