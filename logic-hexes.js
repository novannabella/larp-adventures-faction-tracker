// logic-hexes.js

let upkeepTable = {}; // reserved for future upkeep.csv usage

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

  const terrAdd = $("hexModalTerrainAddBtn");
  if (terrAdd && !terrAdd._wired) {
    terrAdd.addEventListener("click", () => {
      const sel = $("hexModalTerrainSelect");
      const list = $("hexModalTerrain"); // NOTE: matches HTML id
      if (!sel || !list) return;

      const val = (sel.value || "").trim();
      if (!val) return;

      const current = list.value
        ? list.value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
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
        ? list.value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      if (!current.includes(val)) {
        current.push(val);
        list.value = current.join(", ");
      }

      sel.value = "";
    });
    structAdd._wired = true;
  }
}

// (You can still keep loadUpkeepTable / calcHexUpkeep if you want later;
// they are unused by the current table layout.)

// ---------- MODAL OPEN / SAVE ----------
function openHexModal(hex) {
  ensureHexState();

  $("hexModalId").value = hex ? hex.id : "";
  $("hexModalTitle").textContent = hex ? "Edit Hex" : "Add Hex";

  $("hexModalName").value = hex?.name || "";
  $("hexModalNumber").value = hex?.hexNumber || "";

  $("hexModalTerrain").value = hex?.terrain || "";
  $("hexModalStructures").value = hex?.structure || "";

  $("hexModalNotes").value = hex?.notes || "";

  $("hexModalTerrainSelect").value = "";
  $("hexModalStructureSelect").value = "";

  openModal("hexModal");
}

function saveHexFromModal() {
  ensureHexState();

  const id = $("hexModalId").value || null;
  const name = $("hexModalName").value.trim();
  const hexNumber = $("hexModalNumber").value.trim();
  const terrain = $("hexModalTerrain").value.trim();
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
  ensureHexState();
  if (!confirm("Delete this hex from the faction?")) return;
  state.hexes = state.hexes.filter((h) => h.id !== id);
  markDirty();
  renderHexList();
}

// ---------- RENDER TABLE ----------
function renderHexList() {
  ensureHexState();
  const tbody = $("hexTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  state.hexes.forEach((hex) => {
    const row = document.createElement("tr");

    function td(text) {
      const cell = document.createElement("td");
      cell.textContent = text;
      return cell;
    }

    // Columns: Hex | Name | Terrain | Structures | Actions
    row.appendChild(td(hex.hexNumber || ""));
    row.appendChild(td(hex.name || "(Unnamed)"));
    row.appendChild(td(hex.terrain || "—"));
    row.appendChild(td(hex.structure || "—"));

    const actionsTd = document.createElement("td");
    actionsTd.className = "actions-cell";

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

// ---------- DETAILS MODAL ----------
function openHexDetailsModal(hex) {
  if (!hex) return;
  const titleEl = $("detailsModalTitle");
  const body = $("detailsModalBody");
  if (!titleEl || !body) return;

  const label = (hex.hexNumber || "") + (hex.name ? ` — ${hex.name}` : "");
  titleEl.textContent = label.trim() || "Hex Details";

  const notesHtml = hex.notes
    ? escapeHtmlForDetails(hex.notes).replace(/\n/g, "<br>")
    : "(none)";

  body.innerHTML = `
    <p><strong>Name:</strong> ${escapeHtmlForDetails(hex.name || "—")}</p>
    <p><strong>Hex Number:</strong> ${escapeHtmlForDetails(hex.hexNumber || "—")}</p>
    <p><strong>Terrain:</strong> ${escapeHtmlForDetails(hex.terrain || "—")}</p>
    <p><strong>Structures:</strong> ${escapeHtmlForDetails(
      hex.structure || "—"
    )}</p>
    <p><strong>Notes:</strong><br>${notesHtml}</p>
  `;

  openModal("detailsModal");
}

// Simple HTML escape
function escapeHtmlForDetails(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
