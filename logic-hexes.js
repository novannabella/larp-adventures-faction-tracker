// logic-hexes.js

let upkeepTable = {};

function initHexSection() {
  const addBtn = $("hexAddBtn");
  if (addBtn && !addBtn._wired) {
    addBtn.addEventListener("click", () => openHexModal());
    addBtn._wired = true;
  }

  const saveBtn = $("hexModalSaveBtn");
  if (saveBtn && !saveBtn._wired) {
    saveBtn.addEventListener("click", saveHexFromModal);
    saveBtn._wired = true;
  }

  const terrAdd = $("hexModalTerrainsAddBtn");
  if (terrAdd && !terrAdd._wired) {
    terrAdd.addEventListener("click", () => {
      const sel = $("hexModalTerrainsSelect");
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
      if (!current.includes(val)) {
        current.push(val);
        list.value = current.join(", ");
      }
      sel.value = "";
    });
    structAdd._wired = true;
  }

  loadUpkeepTable();
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

function calcHexUpkeep(hex) {
  const result = { food: 0, wood: 0, stone: 0, gold: 0 };
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
    result.gold += row.gold || 0;
  });

  return result;
}

function openHexModal(hex) {
  $("hexModalId").value = hex ? hex.id : "";
  $("hexModalTitle").textContent = hex ? "Edit Hex" : "Add Hex";

  $("hexModalName").value = hex?.name || "";
  $("hexModalNumber").value = hex?.hexNumber || "";
  $("hexModalTerrains").value = hex?.terrain || "";
  $("hexModalStructures").value = hex?.structure || "";
  $("hexModalNotes").value = hex?.notes || "";
  $("hexModalTerrainsSelect").value = "";
  $("hexModalStructureSelect").value = "";

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

  state.hexes.forEach((hex) => {
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
