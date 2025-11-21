// logic-hexes.js

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

  const terrainAddBtn = $("hexModalTerrainAddBtn");
  if (terrainAddBtn && !terrainAddBtn._wired) {
    terrainAddBtn.addEventListener("click", () => {
      const select = $("hexModalTerrainSelect");
      const list = $("hexModalTerrain");
      const val = (select.value || "").trim();
      if (!val) return;

      const current = (list.value || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (!current.includes(val)) {
        current.push(val);
        list.value = current.join(", ");
        markDirty();
      }
    });
    terrainAddBtn._wired = true;
  }

  const structAddBtn = $("hexModalStructureAddBtn");
  if (structAddBtn && !structAddBtn._wired) {
    structAddBtn.addEventListener("click", () => {
      const select = $("hexModalStructureSelect");
      const list = $("hexModalStructures");
      const val = (select.value || "").trim();
      if (!val) return;

      const current = (list.value || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (!current.includes(val)) {
        current.push(val);
        list.value = current.join(", ");
        markDirty();
        refreshHexStructureOptions();
      }
    });
    structAddBtn._wired = true;
  }
}

function openHexModal(hex) {
  $("hexModalId").value = hex ? hex.id : "";
  $("hexModalTitle").textContent = hex ? "Edit Hex" : "Add Hex";

  $("hexModalNumber").value = hex?.hexNumber || "";
  $("hexModalName").value = hex?.name || "";
  $("hexModalOwner").value = hex?.owner || "";
  $("hexModalTerrain").value = hex?.terrain || "";
  $("hexModalStructures").value = hex?.structure || "";
  $("hexModalNotes").value = hex?.notes || "";

  refreshHexStructureOptions();

  openModal("hexModal");
}

function saveHexFromModal() {
  const id = $("hexModalId").value || null;
  const hexNumber = $("hexModalNumber").value.trim();
  const name = $("hexModalName").value.trim();
  const owner = $("hexModalOwner").value.trim();
  const terrain = $("hexModalTerrain").value.trim();
  const structure = $("hexModalStructures").value.trim();
  const notes = $("hexModalNotes").value.trim();

  if (!id) {
    const newId = `hx_${nextHexId++}`;
    state.hexes.push({
      id: newId,
      hexNumber,
      name,
      owner,
      terrain,
      structure,
      notes
    });
  } else {
    const hex = state.hexes.find((h) => h.id === id);
    if (hex) {
      hex.hexNumber = hexNumber;
      hex.name = name;
      hex.owner = owner;
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
  const idx = state.hexes.findIndex((h) => h.id === id);
  if (idx === -1) return;
  if (!confirm("Delete this hex and all its info?")) return;
  state.hexes.splice(idx, 1);
  markDirty();
  renderHexList();
}

function renderHexList() {
  const tbody = $("hexTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const hexesCopy = [...state.hexes];
  hexesCopy.sort((a, b) => {
    const na = a.hexNumber || "";
    const nb = b.hexNumber || "";
    return na.localeCompare(nb, undefined, { numeric: true, sensitivity: "base" });
  });

  hexesCopy.forEach((hex) => {
    const row = document.createElement("tr");
    row.className = "hex-row";

    const numCell = document.createElement("td");
    numCell.textContent = hex.hexNumber || "—";

    const nameCell = document.createElement("td");
    nameCell.textContent = hex.name || "Unnamed";

    const terrainCell = document.createElement("td");
    terrainCell.textContent = hex.terrain || "—";

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

    row.appendChild(numCell);
    row.appendChild(nameCell);
    row.appendChild(terrainCell);
    row.appendChild(actionsTd);

    tbody.appendChild(row);

    detailsBtn.addEventListener("click", () => openHexDetailsModal(hex));
    editBtn.addEventListener("click", () => openHexModal(hex));
    delBtn.addEventListener("click", () => deleteHex(hex.id));
  });
}

/**
 * Show a read-only details modal for a single hex.
 */
function openHexDetailsModal(hex) {
  const titleEl = $("detailsModalTitle");
  const body = $("detailsModalBody");
  if (!titleEl || !body) return;

  const titleParts = [];
  if (hex.hexNumber) titleParts.push(hex.hexNumber);
  if (hex.name) titleParts.push(hex.name);
  titleEl.textContent = titleParts.join(" — ") || "Hex Details";

  const terrain = hex.terrain || "—";
  const structures = hex.structure || "—";
  const owner = hex.owner || "—";
  const notes =
    (hex.notes || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join("<br>") || "—";

  body.innerHTML = `
    <div class="details-grid">
      <p><strong>Owner:</strong> ${owner}</p>
      <p><strong>Terrain:</strong> ${terrain}</p>
      <p><strong>Structures:</strong> ${structures}</p>
      <p><strong>Notes:</strong><br>${notes}</p>
    </div>
  `;

  openModal("detailsModal");
}

/**
 * Helper: hide structure options already selected in the hex modal.
 */
function refreshHexStructureOptions() {
  const select = $("hexModalStructureSelect");
  const list = $("hexModalStructures");
  if (!select || !list) return;

  const current = (list.value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.toLowerCase());

  const taken = new Set(current);

  Array.from(select.options).forEach((opt) => {
    const val = (opt.value || "").trim();
    if (!val) {
      opt.disabled = false;
      opt.hidden = false;
      return;
    }
    const key = val.toLowerCase();
    const isTaken = taken.has(key);
    opt.disabled = isTaken;
    opt.hidden = isTaken;
  });
}
