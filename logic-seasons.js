// ===== SEASON SECTION INIT =====
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
}

// ===== OPEN SEASON MODAL =====
function openSeasonModal(entry) {
  const modal = $("seasonModal");
  const body = modal.querySelector(".modal-body");

  const id = entry ? entry.id : "";
  const now = new Date().getFullYear();

  const season = entry?.season || "Spring";
  const year = entry?.year || now;
  const food = entry?.food ?? "";
  const wood = entry?.wood ?? "";
  const stone = entry?.stone ?? "";
  const ore = entry?.ore ?? "";
  const silver = entry?.silver ?? "";
  const gold = entry?.gold ?? "";
  const notes = entry?.notes || "";

  $("seasonModalId").value = id;

 body.innerHTML = `
  <div class="two-col">
    <div class="field">
      <label>Season</label>
      <select id="seasonModalSeason">
        <option>Spring</option>
        <option>Summer</option>
        <option>Fall</option>
        <option>Winter</option>
      </select>
    </div>

    <div class="field">
      <label>Year</label>
      <input type="number" id="seasonModalYear">
    </div>

    <div class="field">
      <label>Food Gained</label>
      <input type="number" id="seasonModalFood">
    </div>

    <div class="field">
      <label>Wood Gained</label>
      <input type="number" id="seasonModalWood">
    </div>

    <div class="field">
      <label>Stone Gained</label>
      <input type="number" id="seasonModalStone">
    </div>

    <div class="field">
      <label>Ore Gained</label>
      <input type="number" id="seasonModalOre">
    </div>

    <div class="field">
      <label>Silver Gained</label>
      <input type="number" id="seasonModalSilver">
    </div>

    <div class="field">
      <label>Gold Gained</label>
      <input type="number" id="seasonModalGold">
    </div>
  </div>

  <div class="field">
    <label>Notes</label>
    <textarea id="seasonModalNotes" rows="3"></textarea>
  </div>
`;


  $("seasonModalSeason").value = season;
  $("seasonModalYear").value = year;

  openModal("seasonModal");
}

// ===== SAVE SEASON =====
function saveSeasonFromModal() {
  const id = $("seasonModalId").value || null;

  const season = $("seasonModalSeason").value;
  const year = $("seasonModalYear").value;
  const food = $("seasonModalFood").value;
  const wood = $("seasonModalWood").value;
  const stone = $("seasonModalStone").value;
  const ore = $("seasonModalOre").value;
  const silver = $("seasonModalSilver").value;
  const gold = $("seasonModalGold").value;
  const notes = $("seasonModalNotes").value;

  if (!id) {
    const newId = `season_${nextSeasonId++}`;
    state.seasonGains.push({
      id: newId,
      season,
      year,
      food,
      wood,
      stone,
      ore,
      silver,
      gold,
      notes
    });
  } else {
    const entry = state.seasonGains.find(e => e.id === id);
    if (!entry) return;
    entry.season = season;
    entry.year = year;
    entry.food = food;
    entry.wood = wood;
    entry.stone = stone;
    entry.ore = ore;
    entry.silver = silver;
    entry.gold = gold;
    entry.notes = notes;
  }

  markDirty();
  closeModal("seasonModal");
  renderSeasonGainList();
}

// ===== DELETE =====
function deleteSeasonGain(id) {
  if (!confirm("Delete this seasonal gain entry?")) return;
  const idx = state.seasonGains.findIndex(e => e.id === id);
  if (idx >= 0) {
    state.seasonGains.splice(idx, 1);
    markDirty();
    renderSeasonGainList();
  }
}
// ===== RENDER SEASONAL GAINS =====
function renderSeasonGainList() {
  const tbody = $("seasonTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  state.seasonGains.forEach(entry => {
    const row = document.createElement("tr");
    row.className = "season-row";

    row.innerHTML = `
      <td>${entry.season}</td>
      <td>${entry.year}</td>
      <td>${entry.food || 0}</td>
      <td>${entry.wood || 0}</td>
      <td>${entry.stone || 0}</td>
      <td>${entry.ore || 0}</td>
      <td>${entry.silver || 0}</td>
      <td>${entry.gold || 0}</td>
      <td class="actions-cell">
        <button class="button small secondary" data-id="${entry.id}" data-action="details">Details</button>
        <button class="button small secondary" data-id="${entry.id}" data-action="edit">Edit</button>
        <button class="button small secondary" data-id="${entry.id}" data-action="delete">Delete</button>
      </td>
    `;

    tbody.appendChild(row);
  });

  // Wire row buttons
  tbody.querySelectorAll("button").forEach(btn => {
    const id = btn.dataset.id;
    const action = btn.dataset.action;

    btn.addEventListener("click", () => {
      const entry = state.seasonGains.find(e => e.id === id);
      if (!entry) return;

      if (action === "edit") openSeasonModal(entry);
      if (action === "delete") deleteSeasonGain(id);
      if (action === "details") openSeasonDetails(entry);
    });
  });
}

// ===== DETAILS MODAL =====
function openSeasonDetails(entry) {
  const modal = $("detailsModal");
  const title = $("detailsModalTitle");
  const body = $("detailsModalBody");

  title.textContent = `${entry.season} ${entry.year}`;
  body.innerHTML = `
    <p><strong>Food:</strong> ${entry.food}</p>
    <p><strong>Wood:</strong> ${entry.wood}</p>
    <p><strong>Stone:</strong> ${entry.stone}</p>
    <p><strong>Ore:</strong> ${entry.ore}</p>
    <p><strong>Silver:</strong> ${entry.silver}</p>
    <p><strong>Gold:</strong> ${entry.gold}</p>
    <p><strong>Notes:</strong><br>${entry.notes || "(none)"}</p>
  `;

  openModal("detailsModal");
}

