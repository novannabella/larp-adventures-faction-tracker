// logic-hexes.js

function initHexSection() {
  const addHexBtn = $("hexAddBtn");
  if (addHexBtn && !addHexBtn._wired) {
    addHexBtn.addEventListener("click", () => openHexModal());
    addHexBtn._wired = true;
  }
}

function openHexModal(hex) {
  const isEdit = !!hex;
  const modalBody = $("hexModalBody");
  const modal = $("hexModal");
  if (!modalBody) return;

  modalBody.innerHTML = `
    <input type="hidden" id="hexModalId" value="${hex?.id || ""}">
    <div class="field-row">
      <label for="hexModalName">Name</label>
      <input type="text" id="hexModalName" value="${hex?.name || ""}">
    </div>

    <div class="field-row">
      <label for="hexModalNumber">Hex Number</label>
      <input type="text" id="hexModalNumber" value="${hex?.hexNumber || ""}">
    </div>

    <div class="field-row">
      <label for="hexModalTerrain">Terrain</label>
      <input type="text" id="hexModalTerrain" value="${hex?.terrain || ""}">
    </div>

    <div class="field-row">
      <label for="hexModalStructures">Structures</label>
      <input type="text" id="hexModalStructures" placeholder="Comma separated (Farm, Market, Watch Tower)" 
             value="${hex?.structure || ""}">
    </div>
  `;

  const saveBtn = $("hexModalSaveBtn");
  saveBtn.onclick = null;
  saveBtn.addEventListener("click", saveHexFromModal);

  openModal("hexModal");
}

function saveHexFromModal() {
  const id = $("hexModalId").value;
  const name = $("hexModalName").value.trim();
  const hexNumber = $("hexModalNumber").value.trim();
  const terrain = $("hexModalTerrain").value.trim();
  const structure = $("hexModalStructures").value.trim();

  if (!name && !hexNumber) {
    alert("Hex needs at least a number or name.");
    return;
  }

  if (!id) {
    const newId = `hx_${nextHexId++}`;
    state.hexes.push({
      id: newId,
      name,
      hexNumber,
      terrain,
      structure
    });
  } else {
    const hx = state.hexes.find((h) => h.id === id);
    if (!hx) return;

    hx.name = name;
    hx.hexNumber = hexNumber;
    hx.terrain = terrain;
    hx.structure = structure;
  }

  markDirty();
  closeModal("hexModal");
  renderHexList();
}

function deleteHex(id) {
  if (!confirm("Delete this hex?")) return;
  const idx = state.hexes.findIndex((h) => h.id === id);
  if (idx !== -1) {
    state.hexes.splice(idx, 1);
    markDirty();
    renderHexList();
  }
}

function renderHexList() {
  const tbody = $("hexTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  state.hexes.forEach((hx) => {
    const row = document.createElement("tr");
    row.className = "hex-row";

    const hexCell = document.createElement("td");
    hexCell.textContent = hx.hexNumber || "";

    const nameCell = document.createElement("td");
    nameCell.textContent = hx.name || "";

    const terrainCell = document.createElement("td");
    terrainCell.textContent = hx.terrain || "";

    const structCell = document.createElement("td");
    structCell.textContent = hx.structure || "";

    const actionTd = document.createElement("td");
    actionTd.style.whiteSpace = "nowrap";

    const detailsBtn = document.createElement("button");
    detailsBtn.className = "button small secondary";
    detailsBtn.textContent = "Details";

    const editBtn = document.createElement("button");
    editBtn.className = "button small secondary";
    editBtn.textContent = "Edit";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "button small secondary";
    deleteBtn.textContent = "Delete";

    actionTd.appendChild(detailsBtn);
    actionTd.appendChild(editBtn);
    actionTd.appendChild(deleteBtn);

    row.appendChild(hexCell);
    row.appendChild(nameCell);
    row.appendChild(terrainCell);
    row.appendChild(structCell);
    row.appendChild(actionTd);

    tbody.appendChild(row);

    detailsBtn.addEventListener("click", () => openHexDetails(hx));
    editBtn.addEventListener("click", () => openHexModal(hx));
    deleteBtn.addEventListener("click", () => deleteHex(hx.id));
  });
}

function openHexDetails(hx) {
  const body = $("detailsModalBody");
  const title = $("detailsModalTitle");

  title.textContent = hx.name || `Hex ${hx.hexNumber}`;
  body.innerHTML = `
    <p><strong>Hex:</strong> ${hx.hexNumber}</p>
    <p><strong>Name:</strong> ${hx.name || "—"}</p>
    <p><strong>Terrain:</strong> ${hx.terrain || "—"}</p>
    <p><strong>Structures:</strong> ${(hx.structure || "—")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ")}</p>
  `;

  openModal("detailsModal");
}
