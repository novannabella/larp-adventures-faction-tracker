// logic-seasons.js

let nextSeasonId = 1;
let resourceTable = {}; // Populated by loadResourceTable()
let assignmentDefinitions = {}; // Populated by loadResourceTable()
let currentAssignmentData = {}; // Stores assignment inputs while modal is open

// --- CONSTANTS ---

const ASSIGNMENT_DEFINITIONS_RAW = {
  "Market": { resource: "food", limit: 5, gainPerUnit: 20, gainResource: "gold" },
  "Carpenter's Shop": { resource: "wood", limit: 5, gainPerUnit: 20, gainResource: "gold" },
  "Blacksmith": { resource: "ore", limit: 4, gainPerUnit: 40, gainResource: "gold" },
  "Stone Mason's Shop": { resource: "stone", limit: 5, gainPerUnit: 20, gainResource: "gold" },
  "Bank": { resource: "gold", limit: Infinity, multiplier: 1.25 }
};

const BASE_YIELD = 2;
const RESOURCES = ["food", "wood", "stone", "gold", "silver", "ore"];

// --- UTILITY FUNCTIONS ---

function randomRoll(rollString) {
    if (!rollString || typeof rollString !== 'string') return 0;
    
    // Handles '1d6*10'
    const matchMultiply = rollString.match(/1d(\d+)\*(\d+)/);
    if (matchMultiply) {
        const sides = parseInt(matchMultiply[1], 10);
        const multiplier = parseInt(matchMultiply[2], 10);
        const roll = Math.floor(Math.random() * sides) + 1;
        return roll * multiplier;
    }
    
    // Handles '1d10'
    const matchSimple = rollString.match(/1d(\d+)/);
    if (matchSimple) {
        const sides = parseInt(matchSimple[1], 10);
        return Math.floor(Math.random() * sides) + 1;
    }
    
    return 0;
}

function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length);
    if (lines.length < 2) return null;

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim());
        const entry = { source: cols[0] };
        for (let j = 1; j < headers.length; j++) {
            const value = cols[j];
            if (value) {
                entry[headers[j]] = value;
            }
        }
        data.push(entry);
    }
    return data;
}

function loadResourceTable() {
    fetch("terrain_upgrade.csv")
        .then(response => {
            if (!response.ok) throw new Error("Could not load terrain_upgrade.csv");
            return response.text();
        })
        .then(csvText => {
            const parsedData = parseCSV(csvText);
            if (!parsedData) return;

            resourceTable = {};
            parsedData.forEach(item => {
                resourceTable[item.source] = item;
            });
            console.log("Resource Table Loaded:", resourceTable);
            
            // Apply assignment gains from previous season on load/init
            applyAssignmentGains();
        })
        .catch(error => {
            console.error(error);
            // Fallback to empty table or alert user if necessary
        });
}

// --- ASSIGNMENT LOGIC ---

function applyAssignmentGains() {
    // Find the latest completed season entry
    state.seasonGains.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return ["Winter", "Fall", "Summer", "Spring"].indexOf(a.season) - ["Winter", "Fall", "Summer", "Spring"].indexOf(b.season);
    });
    
    const lastSeason = state.seasonGains[0];

    if (!lastSeason || lastSeason.assignmentsApplied) return;

    let appliedGold = 0;
    
    try {
        const assignments = JSON.parse(lastSeason.assignments || "{}");
        
        Object.keys(assignments).forEach(structureName => {
            const assignedAmount = parseInt(assignments[structureName] || 0, 10);
            if (assignedAmount <= 0) return;
            
            const def = ASSIGNMENT_DEFINITIONS_RAW[structureName];
            if (!def) return;
            
            if (def.multiplier) { // Bank rollover
                const gain = Math.floor(assignedAmount * def.multiplier) - assignedAmount;
                appliedGold += gain;
                state.coffers.gold = (state.coffers.gold || 0) + gain;
            } else { // Market, Blacksmith, etc.
                const gain = assignedAmount * def.gainPerUnit;
                appliedGold += gain;
                state.coffers.gold = (state.coffers.gold || 0) + gain;
            }
        });

        if (appliedGold > 0) {
            alert(`Applied ${appliedGold} Gold gain from assignments made last season.`);
            lastSeason.notes = (lastSeason.notes || "") + `\n[Applied ${appliedGold} Gold from previous assignments.]`;
        }
        
        lastSeason.assignmentsApplied = true;
        markDirty();
        renderCofferDisplay();
        renderSeasonGainList();

    } catch (e) {
        console.error("Error applying assignments:", e);
    }
}

function openAssignmentModal() {
    const assignmentsBody = $("assignmentsBody");
    const currentCofferAmounts = $("currentCofferAmounts");
    assignmentsBody.innerHTML = "";
    
    let allStructures = [];
    state.hexes.forEach(hex => {
        if (hex.structure) {
            allStructures.push(...hex.structure.split(',').map(s => s.trim()).filter(Boolean));
        }
    });
    
    // Get unique assignment structures controlled by the faction
    const uniqueAssignmentStructures = Object.keys(ASSIGNMENT_DEFINITIONS_RAW).filter(def => allStructures.includes(def));

    // Show current coffer amounts
    currentCofferAmounts.textContent = RESOURCES.map(r => `${r.charAt(0).toUpperCase() + r.slice(1)}: ${state.coffers[r] || 0}`).join(' | ');

    if (uniqueAssignmentStructures.length === 0) {
        assignmentsBody.innerHTML = '<p>No structures requiring end-of-season assignments found (Market, Bank, Carpenter\'s Shop, Blacksmith, Stone Mason\'s Shop).</p>';
        openModal("assignmentModal");
        return;
    }
    
    // Load previously saved assignments if they exist
    const assignmentsJson = $("seasonModalAssignments").value;
    currentAssignmentData = assignmentsJson ? JSON.parse(assignmentsJson) : {};

    uniqueAssignmentStructures.forEach(structureName => {
        const def = ASSIGNMENT_DEFINITIONS_RAW[structureName];
        const assignedResource = def.resource;
        const limit = def.limit;
        
        // Find the total count of this structure
        const count = allStructures.filter(s => s === structureName).length;
        const totalLimit = limit === Infinity ? 'No Limit' : (limit * count);
        const maxAssignable = Math.min(state.coffers[assignedResource] || 0, totalLimit);
        
        const currentAmount = currentAssignmentData[structureName] || 0;
        
        const container = document.createElement("div");
        container.className = "field-row";
        
        container.innerHTML = `
            <label for="assign_${structureName.replace(/[^a-zA-Z0-9]/g, '')}">${structureName} (${count}x)</label>
            <input 
                id="assign_${structureName.replace(/[^a-zA-Z0-9]/g, '')}"
                type="number"
                min="0"
                max="${maxAssignable}"
                value="${currentAmount}"
                data-structure-name="${structureName}"
                onchange="validateAssignmentInput(this, ${maxAssignable}, '${assignedResource}')"
            />
            <p class="input-hint">Assign ${assignedResource} (Max: ${maxAssignable}, Total Cap: ${totalLimit})</p>
        `;
        assignmentsBody.appendChild(container);
    });

    openModal("assignmentModal");
}

function validateAssignmentInput(input, maxAssignable, resource) {
    let value = parseInt(input.value, 10) || 0;
    
    if (value > maxAssignable) {
        value = maxAssignable;
        alert(`Cannot assign more than what is available in Coffers (${resource}: ${state.coffers[resource] || 0}) or the structure limit. Max allowed is ${maxAssignable}.`);
    } else if (value < 0) {
        value = 0;
    }
    input.value = value;
    
    currentAssignmentData[input.dataset.structureName] = value;
    
    // For the Bank (Gold), maxAssignable is the current gold, so no need to re-validate against a structure limit, it is captured in the initial max.
}

function saveAssignments() {
    const assignments = {};
    const inputs = $("assignmentsBody").querySelectorAll('input[type="number"]');
    
    inputs.forEach(input => {
        const structureName = input.dataset.structureName;
        const value = parseInt(input.value, 10) || 0;
        if (value > 0) {
            assignments[structureName] = value;
        }
    });
    
    // Store JSON string in the hidden field of the season modal
    $("seasonModalAssignments").value = JSON.stringify(assignments);
    
    closeModal("assignmentModal");
}


// --- CALCULATION LOGIC ---

function calculateSeasonalGains() {
    if (Object.keys(resourceTable).length === 0) {
        alert("Resource data is still loading. Please wait a moment and try again.");
        return;
    }

    const totals = { food: 0, wood: 0, stone: 0, gold: 0, silver: 0, ore: 0 };
    const rollNotes = [];

    state.hexes.forEach(hex => {
        const hexGains = { food: 0, wood: 0, stone: 0, gold: 0, silver: 0, ore: 0 };
        const baseYieldSources = []; // Tracks base terrains for yield division

        const structures = hex.structure
            ? hex.structure.split(",").map(s => s.trim()).filter(Boolean)
            : [];
        
        const baseTerrains = hex.terrain
            ? hex.terrain.split(",").map(t => t.trim()).filter(Boolean)
            : [];
            
        // 1. Determine Base Yield Sources
        baseTerrains.forEach(terrain => {
            const tableEntry = resourceTable[terrain];
            if (tableEntry && tableEntry[RESOURCES[0]] === String(BASE_YIELD)) {
                baseYieldSources.push(terrain);
            } else if (terrain === "Mountain") { // Special case for Mountain yielding stone
                baseYieldSources.push(terrain);
            }
        });
        
        const numBaseSources = baseYieldSources.length;
        const yieldPerSource = numBaseSources > 0 ? BASE_YIELD / numBaseSources : 0;
        
        // 2. Calculate Base Gains (divided yield)
        baseYieldSources.forEach(sourceName => {
            const tableEntry = resourceTable[sourceName];
            if (!tableEntry) return;

            // Determine the resource for this base source (e.g., Mountain yields Stone)
            let baseResource = null;
            if (tableEntry.food) baseResource = "food";
            else if (tableEntry.wood) baseResource = "wood";
            else if (tableEntry.stone) baseResource = "stone";
            
            if (baseResource) {
                hexGains[baseResource] += yieldPerSource;
            }
        });
        
        // 3. Apply Multipliers from Structures (*2)
        structures.forEach(structure => {
            const tableEntry = resourceTable[structure];
            if (!tableEntry) return;
            
            RESOURCES.forEach(resource => {
                if (tableEntry[resource] === "*2") {
                    // Check if a base source exists that this multiplier applies to
                    const applicableSources = baseTerrains.concat(hex.mineralDeposit ? [hex.mineralDeposit] : []);
                    
                    let targetResource = null;
                    if (resource === "food" && applicableSources.some(s => s === "Grain Field" || s === "Fish")) targetResource = "food";
                    else if (resource === "wood" && applicableSources.includes("Forest")) targetResource = "wood";
                    else if (resource === "stone" && applicableSources.includes("Mountain")) targetResource = "stone";
                    else if (resource === "ore" && hex.mineralDeposit === "Mineral Deposit - Ore") targetResource = "ore";
                    else if (resource === "silver" && hex.mineralDeposit === "Mineral Deposit - Silver") targetResource = "silver";
                    else if (resource === "gold" && hex.mineralDeposit === "Mineral Deposit - Gold") targetResource = "gold";
                    
                    if (targetResource && hexGains[targetResource] > 0) {
                        hexGains[targetResource] *= 2;
                    }
                }
            });
        });
        
        // 4. Apply Fixed Gains (Village, Town, City, Trading Vessel, War Galley)
        structures.forEach(structure => {
            const tableEntry = resourceTable[structure];
            if (!tableEntry) return;
            
            RESOURCES.forEach(resource => {
                const value = parseInt(tableEntry[resource]);
                if (!isNaN(value)) {
                    hexGains[resource] += value;
                }
            });
        });

        // 5. Apply Dice Rolls (Mineral Deposits)
        const allSources = structures.concat(hex.mineralDeposit ? [hex.mineralDeposit] : []);
        allSources.forEach(sourceName => {
            const tableEntry = resourceTable[sourceName];
            if (!tableEntry) return;

            RESOURCES.forEach(resource => {
                const rollString = tableEntry[resource];
                if (rollString && (rollString.includes('d') || rollString.includes('*'))) {
                    const rollResult = randomRoll(rollString);
                    hexGains[resource] += rollResult;
                    rollNotes.push(`${hex.hexNumber || hex.name || 'Hex'} (${sourceName} - ${resource}) rolled ${rollString} for ${rollResult}`);
                }
            });
        });

        // 6. Sum Hex Gains into Totals (Rounding)
        RESOURCES.forEach(resource => {
            totals[resource] += Math.floor(hexGains[resource]); // Round down to integer
        });
    });

    // Update Modal Fields
    $("seasonModalFood").value = totals.food;
    $("seasonModalWood").value = totals.wood;
    $("seasonModalStone").value = totals.stone;
    $("seasonModalOre").value = totals.ore;
    $("seasonModalSilver").value = totals.silver;
    $("seasonModalGold").value = totals.gold;
    
    // Update Notes
    if (rollNotes.length > 0) {
        const existingNotes = $("seasonModalNotes").value;
        $("seasonModalNotes").value = (existingNotes ? existingNotes + "\n\n" : "") + "--- Dice Rolls ---\n" + rollNotes.join("\n");
    }
    
    alert(`Harvest Calculated: Food: ${totals.food}, Wood: ${totals.wood}, Stone: ${totals.stone}, Ore: ${totals.ore}, Silver: ${totals.silver}, Gold: ${totals.gold}`);
}

// --- INITIALIZATION ---

function initSeasonSection() {
  const addBtn = $("seasonAddBtn");
  if (addBtn && !addBtn._wired) {
    addBtn.addEventListener("click", () => openSeasonModal());
    addBtn._wired = true;
  }

  const saveBtn = $("seasonModalSaveBtn");
  if (saveBtn && !saveBtn._wired) {
    saveBtn.addEventListener("click", saveSeasonFromModal);
    saveBtn._wired = true;
  }
  
  loadResourceTable(); // Load CSV data asynchronously
  renderSeasonGainList();
}

function openSeasonModal(entry) {
  // Apply any unapplied gains from the previous season before opening a new modal
  if (!entry) {
      applyAssignmentGains();
  }

  $("seasonModalId").value = entry ? entry.id : "";
  $("seasonModalTitle").textContent = entry ? "Edit Seasonal Gain" : "Add Seasonal Gain";

  const now = new Date().getFullYear();
  
  // Set read-only status and ensure assignment data is loaded
  const isReadOnly = !!entry;
  
  RESOURCES.forEach(r => {
      $(`seasonModal${r.charAt(0).toUpperCase() + r.slice(1)}`).readOnly = !isReadOnly;
  });

  $("seasonModalAssignments").value = entry?.assignments || "";

  // The Calculate button is hidden if editing an existing entry
  $("calculateHarvestBtn").style.display = entry ? 'none' : 'block';

  $("seasonModalSeason").value = entry?.season || "Spring";
  $("seasonModalYear").value = entry?.year || now;
  $("seasonModalFood").value = entry?.food ?? "";
  $("seasonModalWood").value = entry?.wood ?? "";
  $("seasonModalStone").value = entry?.stone ?? "";
  $("seasonModalOre").value = entry?.ore ?? "";
  $("seasonModalSilver").value = entry?.silver ?? "";
  $("seasonModalGold").value = entry?.gold ?? "";
  $("seasonModalNotes").value = entry?.notes || "";

  openModal("seasonModal");
}

function saveSeasonFromModal() {
  const id = $("seasonModalId").value || null;

  const season = $("seasonModalSeason").value || "Spring";
  const year = parseInt($("seasonModalYear").value, 10) || new Date().getFullYear();
  
  // Resources are read-only now (except when editing) but must be parsed as numbers
  const food = parseInt($("seasonModalFood").value, 10) || 0;
  const wood = parseInt($("seasonModalWood").value, 10) || 0;
  const stone = parseInt($("seasonModalStone").value, 10) || 0;
  const ore = parseInt($("seasonModalOre").value, 10) || 0;
  const silver = parseInt($("seasonModalSilver").value, 10) || 0;
  const gold = parseInt($("seasonModalGold").value, 10) || 0;
  
  const assignments = $("seasonModalAssignments").value; // Store the JSON string
  
  const notes = $("seasonModalNotes").value.trim();

  // Validate only if creating a new entry
  if (!id && (food + wood + stone + ore + silver + gold === 0)) {
      if (!confirm("The calculated gains are zero. Are you sure you want to save this entry?")) {
          return;
      }
  }

  const newEntry = {
    season,
    year,
    food,
    wood,
    stone,
    ore,
    silver,
    gold,
    notes,
    assignments, // NEW
    assignmentsApplied: false // NEW
  };

  if (!id) {
    newEntry.id = `season_${nextSeasonId++}`;
    state.seasonGains.push(newEntry);
  } else {
    const sg = state.seasonGains.find((s) => s.id === id);
    if (sg) {
      Object.assign(sg, newEntry);
    }
  }

  markDirty();
  closeModal("seasonModal");
  renderSeasonGainList();
}

function deleteSeasonGain(id) {
  if (!confirm("Delete this seasonal resource gain entry?")) return;
  state.seasonGains = state.seasonGains.filter((s) => s.id !== id);
  markDirty();
  renderSeasonGainList();
}

function openSeasonDetailsModal(sg) {
  const titleEl = $("detailsModalTitle");
  const bodyEl = $("detailsModalBody");
  if (!titleEl || !bodyEl) return;

  const seasonLabel = sg.season || "";
  const yearLabel = sg.year || "";
  const heading = [seasonLabel, yearLabel].filter(Boolean).join(" ");

  titleEl.textContent = heading ? `Seasonal Gain — ${heading}` : "Seasonal Gain Details";

  // Parse assignments for display
  let assignmentsHtml = "—";
  if (sg.assignments) {
      try {
          const assignments = JSON.parse(sg.assignments);
          const lines = Object.keys(assignments).map(s => `<li>${s}: ${assignments[s]} ${ASSIGNMENT_DEFINITIONS_RAW[s]?.resource || 'resource'}</li>`).join('');
          if (lines) {
              assignmentsHtml = `<ul>${lines}</ul>`;
          }
      } catch (e) {
          assignmentsHtml = "Error parsing assignments.";
      }
  }


  bodyEl.innerHTML = `
    <div class="details-grid">
      <p><strong>Season:</strong> ${sg.season || "—"}</p>
      <p><strong>Year:</strong> ${sg.year || "—"}</p>
      <p><strong>Food:</strong> ${sg.food ?? "0"}</p>
      <p><strong>Wood:</strong> ${sg.wood ?? "0"}</p>
      <p><strong>Stone:</strong> ${sg.stone ?? "0"}</p>
      <p><strong>Ore:</strong> ${sg.ore ?? "0"}</p>
      <p><strong>Silver:</strong> ${sg.silver ?? "0"}</p>
      <p><strong>Gold:</strong> ${sg.gold ?? "0"}</p>
    </div>
    
    <h4 style="margin-top: 15px;">Resource Assignments (Applied next season):</h4>
    <div>${assignmentsHtml}</div>
    
    <div class="field-row">
      <label>Notes</label>
      <textarea readonly rows="4">${sg.notes || "—"}</textarea>
    </div>
  `;

  openModal("detailsModal");
}

function renderSeasonGainList() {
  const tbody = $("seasonTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  state.seasonGains.sort((a, b) => {
    // Sort by Year (descending)
    if (a.year !== b.year) return b.year - a.year;
    // Then sort by Season (Winter > Fall > Summer > Spring)
    const seasonOrder = ["Winter", "Fall", "Summer", "Spring"];
    return seasonOrder.indexOf(a.season) - seasonOrder.indexOf(b.season);
  });

  state.seasonGains.forEach((sg) => {
    const tr = document.createElement("tr");

    function td(text) {
      const cell = document.createElement("td");
      cell.textContent = text;
      return cell;
    }

    tr.appendChild(td(sg.season || ""));
    tr.appendChild(td(sg.year || ""));
    tr.appendChild(td(sg.food ?? "0"));
    tr.appendChild(td(sg.wood ?? "0"));
    tr.appendChild(td(sg.stone ?? "0"));
    tr.appendChild(td(sg.ore ?? "0"));
    tr.appendChild(td(sg.silver ?? "0"));
    tr.appendChild(td(sg.gold ?? "0"));
    tr.appendChild(td(sg.notes || ""));

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
    tr.appendChild(actionsTd);

    detailsBtn.addEventListener("click", () => openSeasonDetailsModal(sg));
    editBtn.addEventListener("click", () => openSeasonModal(sg));
    delBtn.addEventListener("click", () => deleteSeasonGain(sg.id));

    tbody.appendChild(tr);
  });
}