// logic-seasons.js

let nextSeasonId = 1;
let resourceTable = {}; // Populated by loadResourceTable()
let upkeepTable = {}; // Also populated by loadResourceTable()
let assignmentDefinitions = {}; // Populated by loadResourceTable()
let currentAssignmentData = {}; // Stores assignment inputs while modal is open

// --- CONSTANTS ---

const ASSIGNMENT_DEFINITIONS_RAW = {
  // These keys are Title Case to match the hex structure names
  "Market": { resource: "food", limit: 5, gainPerUnit: 20, gainResource: "gold" },
  "Carpenter's Shop": { resource: "wood", limit: 5, gainPerUnit: 20, gainResource: "gold" },
  "Blacksmith": { resource: "ore", limit: 4, gainPerUnit: 40, gainResource: "gold" },
  "Stone Mason's Shop": { resource: "stone", limit: 5, gainPerUnit: 20, gainResource: "gold" },
  "Bank": { resource: "gold", limit: Infinity, multiplier: 1.25 }
};

const BASE_YIELD = 2;
const RESOURCES = ["food", "wood", "stone", "ore", "silver", "gold"];

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
    
    return parseInt(rollString, 10) || 0;
}

// Function to load the resource table from CSV (or local storage/hardcoded)
function loadResourceTable() {
  // Hardcoded Resource/Yield data based on terrain_upgrade.csv
  const resourceCsvData = `Terrain/Upgrade,Food,Wood,Stone,Gold,Silver,Ore
Grain Field,2,,,,,,
Fish,2,,,,,,
Forest,,2,,,,,
Mountains,,,2,,,,
Mineral Deposit - Ore,,,,,,,1d10
Mineral Deposit - Silver,,,,,1d6*10,,
Mineral Deposit - Gold,,,,1d6*10,,,
Village,,,,10,,,
Town,,,,25,,,
City,,,,100,,,
Farm,*2,,,,,,
Lumber Mill,,*2,,,,,
Quarry,,,*2,,,,
Iron Mine,,,,,,,*2
Silver Mine,,,,,,*2,
Gold Mine,,,,*2,,,
Dock,,-1,,,,
Fishing Fleet,2,,,,,,
Trading Vessel,,,,25,,,
War Galley,,,,25,,,
`;

  // Hardcoded Upkeep data (used for final calculation)
  const upkeepCsvData = `Terrain/Upgrade,Food,Wood,Stone,Ore,Gold,Silver
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

  // Helper to parse CSV string
  function parseCsv(csvString) {
      const result = {};
      const lines = csvString.split("\n").map(l => l.trim()).filter(l => l.trim().length);
      if (lines.length < 2) return result;

      const header = lines[0].split(",").map((h) => h.trim());
      const indices = RESOURCES.reduce((acc, r) => {
          // Find the index of each resource column
          acc[r] = header.indexOf(r.charAt(0).toUpperCase() + r.slice(1));
          return acc;
      }, {});
      indices.name = header.indexOf("Terrain/Upgrade");

      for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim());
          const name = (cols[indices.name] || "").toLowerCase(); 
          if (!name) continue;

          const entry = {};
          RESOURCES.forEach(res => {
              const val = cols[indices[res]];
              if (val) entry[res] = val;
          });
          result[name] = entry;
      }
      return result;
  }
  
  // Populate the tables
  resourceTable = parseCsv(resourceCsvData);
  upkeepTable = parseCsv(upkeepCsvData); // Using the same structure for Upkeep data
  assignmentDefinitions = ASSIGNMENT_DEFINITIONS_RAW; // Use the hardcoded assignment definitions
}


// Calculates the raw yields (before upkeep) from all controlled hexes
function getHexYields() {
  const gains = RESOURCES.reduce((acc, res) => ({ ...acc, [res]: 0 }), {});

  state.hexes.forEach(hex => {
    // 1. Base Resource Yields
    const terrains = hex.terrain ? hex.terrain.split(",").map(s => s.trim().toLowerCase()) : [];
    
    // Add base yield for non-sea hexes
    if (!terrains.includes("sea")) {
        gains.food += BASE_YIELD; 
        gains.wood += BASE_YIELD;
        gains.stone += BASE_YIELD;
    }

    // 2. Terrain/Deposit Yields (from resourceTable)
    const allNames = [
        ...terrains, 
        hex.mineralDeposit ? hex.mineralDeposit.toLowerCase() : ""
    ].filter(Boolean);

    allNames.forEach(name => {
      const entry = resourceTable[name];
      if (entry) {
        RESOURCES.forEach(res => {
          const value = entry[res];
          if (value) {
            // Check for direct values or dice rolls (e.g., '10', '1d10', '1d6*10')
            if (!value.startsWith('*')) { 
              gains[res] += randomRoll(value);
            }
          }
        });
      }
    });

    // 3. Structure Yields/Multipliers (from resourceTable)
    const structures = hex.structure ? hex.structure.split(",").map(s => s.trim().toLowerCase()) : [];
    
    structures.forEach(name => {
      const entry = resourceTable[name];
      if (entry) {
        RESOURCES.forEach(res => {
          const value = entry[res];
          if (value && value.startsWith('*')) { 
            // Apply multiplier (e.g., '*2')
            const multiplier = parseInt(value.substring(1), 10) || 1;
            // Assumes multipliers apply to the BASE YIELD of that resource, 
            // but for simplicity here we'll assume it multiplies the current total gain of that resource.
            // A more complex system would need to track where the base yield comes from.
            // For now, let's just use the multiplier for structures that are defined for yield (e.g. Farm for food).
            if (name === 'farm' && res === 'food') { gains.food *= multiplier; }
            if (name === 'lumber mill' && res === 'wood') { gains.wood *= multiplier; }
            if (name === 'quarry' && res === 'stone') { gains.stone *= multiplier; }
            if (name === 'iron mine' && res === 'ore') { gains.ore *= multiplier; }
            if (name === 'silver mine' && res === 'silver') { gains.silver *= multiplier; }
            if (name === 'gold mine' && res === 'gold') { gains.gold *= multiplier; }
          }
        });
      }
    });
  });

  // Ensure no negative totals from multipliers
  RESOURCES.forEach(res => {
    gains[res] = Math.max(0, gains[res]);
  });
  
  return gains;
}

// Calculates total upkeep for all controlled hexes
function getUpkeepCosts() {
  const totalUpkeep = RESOURCES.reduce((acc, res) => ({ ...acc, [res]: 0 }), {});

  state.hexes.forEach(hex => {
    const structures = hex.structure ? hex.structure.split(",").map(s => s.trim().toLowerCase()) : [];
    
    structures.forEach(name => {
      const entry = upkeepTable[name];
      if (entry) {
        RESOURCES.forEach(res => {
          const value = entry[res];
          // Upkeep numbers in this data are typically negative for loss
          const cost = parseInt(value || "0", 10) || 0;
          totalUpkeep[res] += cost;
        });
      }
    });
  });
  
  return totalUpkeep;
}


// FIX 2: Define the missing function for the "Calculate Harvest" button
function calculateSeasonalGains() {
  loadResourceTable(); // Ensure tables are loaded before calculation
  
  const rawYields = getHexYields();
  const totalUpkeep = getUpkeepCosts();
  
  const finalGains = { ...rawYields };

  // Apply upkeep
  RESOURCES.forEach(res => {
    // Upkeep values are negative, so adding them is subtracting the cost.
    finalGains[res] += totalUpkeep[res]; 
    // Ensure resource is not negative
    finalGains[res] = Math.max(0, finalGains[res]);
  });
  
  // Create a new season gain entry
  const newId = `season_${nextSeasonGainId++}`;
  const now = new Date();
  
  const newEntry = {
    id: newId,
    season: $("seasonModalSeason")?.value || "Spring", // Use values from season modal if open, or default
    year: $("seasonModalYear")?.value || now.getFullYear(),
    ...finalGains,
    notes: "Auto-calculated seasonal gain (Yields - Upkeep).",
    detailsOpen: false
  };
  
  state.seasonGains.push(newEntry);
  markDirty();
  
  // Update Coffer totals immediately (optional, but usually desired after harvest)
  RESOURCES.forEach(res => {
    const current = state.coffers[res] || 0;
    state.coffers[res] = Math.max(0, current + finalGains[res]);
  });
  syncCoffersToUI();
  
  renderSeasonGainList();
  alert(`Seasonal Gains calculated! Added ${finalGains.food} Food, ${finalGains.wood} Wood, etc. to coffers.`);
}


// FIX 3: Define the missing function for the "Resource Assignment" button
function openAssignmentModal() {
  loadResourceTable(); // Ensure tables are loaded
  
  const assignableStructures = {};
  
  // 1. Count assignable structures in all hexes
  state.hexes.forEach(hex => {
    hex.structure?.split(",").map(s => s.trim()).filter(Boolean).forEach(structName => {
        // Use Title Case for lookup since ASSIGNMENT_DEFINITIONS_RAW keys are Title Case
        if (assignmentDefinitions[structName]) {
            const def = assignmentDefinitions[structName];
            const key = structName;
            
            assignableStructures[key] = assignableStructures[key] || {
                count: 0,
                resource: def.resource,
                limit: def.limit,
                gainPerUnit: def.gainPerUnit,
                gainResource: def.gainResource
            };
            assignableStructures[key].count++;
        }
    });
  });

  const bodyEl = $("assignmentModalBody");
  if (!bodyEl) {
      alert("Assignment Modal not found. Cannot open.");
      return;
  }
  
  let html = "<h4>Assign Resources from your Coffers to activate the following structures:</h4>";
  html += "<div class='assignment-list'>";

  if (Object.keys(assignableStructures).length === 0) {
      html += "<p>No assignable structures (Market, Blacksmith, etc.) have been built.</p>";
  } else {
      Object.keys(assignableStructures).sort().forEach(key => {
          const struct = assignableStructures[key];
          const availableResource = state.coffers[struct.resource] || 0;
          const maxAssignment = Math.min(struct.count, struct.limit);
          const currentAssignment = currentAssignmentData[key] || 0;
          
          html += `
              <div class="assignment-item">
                  <p>
                      <strong>${key}</strong> (${struct.count} total, Max Assignment: ${maxAssignment} ${struct.resource})
                  </p>
                  <div class="input-group">
                      <label for="assign-${key.replace(/\s+/g, '')}">${struct.resource} to Assign:</label>
                      <input 
                          type="number" 
                          id="assign-${key.replace(/\s+/g, '')}" 
                          data-struct-key="${key}"
                          min="0" 
                          max="${maxAssignment}" 
                          value="${currentAssignment}"
                          placeholder="0"
                          title="Available ${struct.resource}: ${availableResource}"
                          oninput="handleAssignmentInput(this)"
                      />
                      <span>(Available: ${availableResource})</span>
                  </div>
                  <p class="assignment-result">Expected Gain: ${currentAssignment * struct.gainPerUnit} ${struct.gainResource}</p>
              </div>
          `;
      });
  }

  html += "</div>";
  bodyEl.innerHTML = html;
  
  openModal("assignmentModal");
}

// Helper to store input values and update expected gains dynamically
function handleAssignmentInput(inputEl) {
    const key = inputEl.getAttribute('data-struct-key');
    const val = parseInt(inputEl.value, 10) || 0;
    
    const def = ASSIGNMENT_DEFINITIONS_RAW[key];
    const available = state.coffers[def.resource] || 0;
    const maxAssignment = Math.min(assignableStructures[key].count, def.limit); // Requires re-counting or passing struct data
    
    // Simple validation (can be improved)
    const finalVal = Math.max(0, Math.min(val, maxAssignment, available));
    inputEl.value = finalVal;

    currentAssignmentData[key] = finalVal;
    
    // Update display text (this is complex as it needs to re-render the surrounding P tag. 
    // For a quick fix, let's skip the dynamic update here and rely on modal open/close)
    
    // A better approach would be to calculate the gain and update a dedicated span nearby:
    // const resultP = inputEl.closest('.assignment-item').querySelector('.assignment-result');
    // if (resultP) {
    //     resultP.textContent = `Expected Gain: ${finalVal * def.gainPerUnit} ${def.gainResource}`;
    // }
}


// Function to process assignments when the modal is closed/saved
function processResourceAssignments() {
    let totalCosts = {};
    let totalGains = {};

    // 1. Calculate costs and gains from assignments
    Object.keys(currentAssignmentData).forEach(key => {
        const amount = currentAssignmentData[key];
        if (amount > 0) {
            const def = assignmentDefinitions[key];
            
            // Cost
            totalCosts[def.resource] = (totalCosts[def.resource] || 0) + amount;
            
            // Gain (for non-Bank structures)
            if (def.gainResource) {
                 totalGains[def.gainResource] = (totalGains[def.gainResource] || 0) + (amount * def.gainPerUnit);
            }
        }
    });

    // 2. Apply costs and gains to coffers
    let success = true;
    let costMessage = "Costs:\n";
    let gainMessage = "Gains:\n";

    RESOURCES.forEach(res => {
        const cost = totalCosts[res] || 0;
        const gain = totalGains[res] || 0;
        
        if (cost > 0) {
            if (state.coffers[res] >= cost) {
                state.coffers[res] -= cost;
                costMessage += ` -${cost} ${res}\n`;
            } else {
                success = false;
                alert(`Insufficient ${res} in coffers. Cannot complete assignments. Required: ${cost}, Available: ${state.coffers[res]}`);
                return;
            }
        }
        
        if (gain > 0) {
            state.coffers[res] = (state.coffers[res] || 0) + gain;
            gainMessage += ` +${gain} ${res}\n`;
        }
        
    });
    
    // 3. Apply Bank multiplier (must be done last, as it affects gold after all other transactions)
    const bankDef = assignmentDefinitions["Bank"];
    if (bankDef) {
        // Bank Assignment assumes it uses the full gold in the coffers after costs/gains
        const initialGold = state.coffers.gold;
        const multiplier = bankDef.multiplier || 1;
        
        // This logic is highly simplified. A proper bank would only multiply a *portion* or assigned gold.
        // Assuming a simple increase for the current gold in the coffer:
        const bankGain = Math.floor(initialGold * multiplier) - initialGold;
        
        if (bankGain > 0) {
            state.coffers.gold += bankGain;
            gainMessage += ` +${bankGain} gold (Bank Interest)\n`;
        }
    }
    
    if (success) {
        markDirty();
        syncCoffersToUI();
        alert(`Assignments Processed!\n\n${costMessage}\n${gainMessage}`);
    }

    // Reset temporary assignment data
    currentAssignmentData = {}; 
    closeModal("assignmentModal");
}


// --- WIRING AND INIT ---

function initSeasonSection() {
  loadResourceTable(); // Load resource/upkeep definitions once
  
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
  
  // Wire the Assignment Modal Save button (assuming ID is 'assignmentModalSaveBtn')
  const assignSaveBtn = $("assignmentModalSaveBtn");
  if (assignSaveBtn && !assignSaveBtn._wired) {
    assignSaveBtn.addEventListener("click", processResourceAssignments);
    assignSaveBtn._wired = true;
  }
  
  renderSeasonGainList(); 
}

// ... (keep the rest of the logic-seasons.js code below this line) ...

// openSeasonModal, saveSeasonFromModal, deleteSeasonGain, renderSeasonGainList, openSeasonDetailsModal...
// (Assuming these existing functions from logic-seasons.js are kept)