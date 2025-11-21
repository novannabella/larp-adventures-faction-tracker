// logic-hexes.js

let upkeepTable = {}; // if you later load upkeep.csv etc.

// Ensure hex array exists
function ensureHexState() {
  if (!Array.isArray(state.hexes)) {
    state.hexes = [];
  }
}

// ---------- INIT ----------
function initHexSection() {
  ensureHexState();

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
}

// Helper numeric reader
function readHexNumber(id) {
  const el = $(id);
  if (!el) return 0;
  const v = (el.value || "").trim();
  return v === "" ? 0 : Number(v);
}

// ---------- MODAL OPEN ----------
function openHexModal(entry) {
  ensureHexState();

  const isEdit = !!entry;

  if ($("hexModalTitle")) {
    $("hexModalTitle").textContent = isEdit ? "Edit Hex" : "Add Hex";
  }

  if ($("hexModalId")) {
    $("hexModalId").value = isEdit ? entry.id : "";
  }

  if ($("hexModalName")) {
    $("hexModalName").value = isEdit ? entry.name || "" : "";
  }
  if ($("hexModalNumber")) {
    $("hexModalNumber").value = isEdit ? entry.hexNumber || "" : "";
  }

  if ($("hexModalFood")) {
    $("hexModalFood").value = isEdit && entry.food != null ? entry.food : "";
  }
  if ($("hexModalWood")) {
    $("hexModalWood").value = isEdit && entry.wood != null ? entry.wood : "";
  }
  if ($("hexModalStone")) {
    $("hexModalStone").value =
      isEdit && entry.stone != null ? entry.stone : "";
  }
  if ($("hexModalGold")) {
    $("hexModalGold").value = isEdit && entry.gold != null ? entry.gold : "";
  }

  if ($("hexModalTerrain")) {
    $("hexModalTerrain").value = isEdit ? entry.terrain || "" : "";
  }

  if ($("hexModalStructures")) {
    $("hexModalStructures").value = isEdit ? entry.structures || "" : "";
  }

  if ($("hexModalNotes")) {
    $("hexModalNotes").value = isEdit ? entry.notes || "" : "";
  }

  openModal("hexModal");
}

// ---------- SAVE ----------
function saveHexFromModal() {
  ensureHexState();

  const idEl = $("hexModalId");
  const id = idEl ? (idEl.value || "").trim() : "";

  const payload = {
    id: id || `hx_${calcNextNumericId(state.hexes, "hx_")}`,
    name: $("hexModalName") ? $("hexModalName").value.trim() : "",
    hexNumber: $("hexModalNumber")
      ? $("hexModalNumber").value.trim()
      : "",
    food: readHexNumber("hexModalFood"),
    wood: readHexNumber("hexModalWood"),
    stone: readHexNumber("hexModalStone"),
    gold: readHexNumber("hexModalGold"),
    terrain: $("hexModalTerrain") ? $("hexModalTerrain").value.trim() : "",
    structures: $("hexModalStructures")
      ? $("hexModalStructures").value.trim()
      : "",
    notes: $("hexModalNotes") ? $("hexModalNotes").value.trim() : ""
  };

  if (id) {
    const existing = state.hexes.find((h) => h.id === id);
    if (!existing) {
      console.warn("Hex not found for id", id);
    } else {
      Object.assign(existing, payload);
    }
  } else {
    state.hexes.push(payload);
  }

  markDirty();
  closeModal("hexModal");
  renderHexList();
}

// ---------- DELETE ----------
function deleteHex(id) {
  ensureHexState();
  if (!confirm("Delete this hex?")) return;

  const idx = state.hexes.findIndex((h) => h.id === id);
  if (idx >= 0) {
    state.hexes.splice(idx, 1);
    markDirty();
    renderHexList();
  }
}

// ---------- RENDER TABLE ----------
function renderHexList() {
  ensureHexState();
  const tbody = $("hexTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  state.hexes.forEach((hex) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${hex.name || ""}</td>
      <td>${hex.hexNumber || ""}</td>
      <td>${hex.food ?? 0}</td>
      <td>${hex.wood ?? 0}</td>
      <td>${hex.stone ?? 0}</td>
      <td>${hex.gold ?? 0}</td>
      <td class="actions-cell">
        <button class="button tiny secondary hex-details-btn">Details</button>
        <button class="button tiny secondary hex-edit-btn">Edit</button>
        <button class="button tiny secondary hex-delete-btn">Delete</button>
      </td>
    `;

    const detailsRow = document.createElement("tr");
    detailsRow.className = "hex-details-row";
    detailsRow.style.display = "none";
    const detailsCell = document.createElement("td");
    detailsCell.colSpan = 7;
    detailsCell.innerHTML = `
      <div class="details-block">
        <div><strong>Terrain:</strong> ${hex.terrain || ""}</div>
        <div><strong>Structures:</strong> ${hex.structures || ""}</div>
        <div><strong>Notes:</strong><br>${hex.notes
          ? escapeHtmlForCell(hex.notes).replace(/\n/g, "<br>")
          : "(none)"}</div>
      </div>
    `;
    detailsRow.appendChild(detailsCell);

    const detailsBtn = row.querySelector(".hex-details-btn");
    const editBtn = row.querySelector(".hex-edit-btn");
    const deleteBtn = row.querySelector(".hex-delete-btn");

    if (detailsBtn) {
      detailsBtn.addEventListener("click", () => {
        const isOpen = detailsRow.style.display !== "none";
        detailsRow.style.display = isOpen ? "none" : "";
        detailsBtn.textContent = isOpen ? "Details" : "Hide";
      });
    }

    if (editBtn) {
      editBtn.addEventListener("click", () => openHexModal(hex));
    }

    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => deleteHex(hex.id));
    }

    tbody.appendChild(row);
    tbody.appendChild(detailsRow);
  });
}
