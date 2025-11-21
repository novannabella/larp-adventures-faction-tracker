// logic-seasons.js

// Ensure the season array exists on state
function ensureSeasonState() {
  if (!Array.isArray(state.seasonGains)) {
    state.seasonGains = [];
  }
}

// ---------- INIT ----------
function initSeasonSection() {
  ensureSeasonState();

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

// Small helper for numeric inputs
function readNumber(id) {
  const el = $(id);
  if (!el) return 0;
  const v = (el.value || "").trim();
  return v === "" ? 0 : Number(v);
}

// ---------- MODAL OPEN ----------
function openSeasonModal(entry) {
  ensureSeasonState();

  const isEdit = !!entry;
  const nowYear = new Date().getFullYear();

  // Set title
  if ($("seasonModalTitle")) {
    $("seasonModalTitle").textContent = isEdit
      ? "Edit Seasonal Resource Gain"
      : "Add Seasonal Resource Gain";
  }

  // Hidden id
  if ($("seasonModalId")) {
    $("seasonModalId").value = isEdit ? entry.id : "";
  }

  // Season & year
  if ($("seasonModalSeason")) {
    $("seasonModalSeason").value = isEdit ? entry.season : "Spring";
  }
  if ($("seasonModalYear")) {
    $("seasonModalYear").value =
      isEdit && entry.year != null && entry.year !== ""
        ? entry.year
        : nowYear;
  }

  // Resources
  if ($("seasonModalFood")) {
    $("seasonModalFood").value = isEdit && entry.food != null ? entry.food : "";
  }
  if ($("seasonModalWood")) {
    $("seasonModalWood").value = isEdit && entry.wood != null ? entry.wood : "";
  }
  if ($("seasonModalStone")) {
    $("seasonModalStone").value =
      isEdit && entry.stone != null ? entry.stone : "";
  }
  if ($("seasonModalOre")) {
    $("seasonModalOre").value = isEdit && entry.ore != null ? entry.ore : "";
  }
  if ($("seasonModalSilver")) {
    $("seasonModalSilver").value =
      isEdit && entry.silver != null ? entry.silver : "";
  }
  if ($("seasonModalGold")) {
    $("seasonModalGold").value =
      isEdit && entry.gold != null ? entry.gold : "";
  }

  if ($("seasonModalNotes")) {
    $("seasonModalNotes").value = isEdit && entry.notes ? entry.notes : "";
  }

  openModal("seasonModal");
}

// ---------- SAVE ----------
function saveSeasonFromModal() {
  ensureSeasonState();

  const idEl = $("seasonModalId");
  const id = idEl ? (idEl.value || "").trim() : "";

  const season = $("seasonModalSeason")
    ? $("seasonModalSeason").value || "Spring"
    : "Spring";
  const yearStr = $("seasonModalYear")
    ? ($("seasonModalYear").value || "").trim()
    : "";
  const year = yearStr === "" ? null : Number(yearStr);

  const payload = {
    id: id || `sg_${calcNextNumericId(state.seasonGains, "sg_")}`,
    season,
    year,
    food: readNumber("seasonModalFood"),
    wood: readNumber("seasonModalWood"),
    stone: readNumber("seasonModalStone"),
    ore: readNumber("seasonModalOre"),
    silver: readNumber("seasonModalSilver"),
    gold: readNumber("seasonModalGold"),
    notes: $("seasonModalNotes") ? $("seasonModalNotes").value.trim() : ""
  };

  if (id) {
    // Update existing
    const existing = state.seasonGains.find((s) => s.id === id);
    if (!existing) {
      console.warn("Season entry not found for id", id);
    } else {
      Object.assign(existing, payload);
    }
  } else {
    // New
    state.seasonGains.push(payload);
  }

  markDirty();
  closeModal("seasonModal");
  renderSeasonGainList();
}

// ---------- DELETE ----------
function deleteSeasonGain(id) {
  ensureSeasonState();
  if (!confirm("Delete this seasonal gain entry?")) return;

  const idx = state.seasonGains.findIndex((s) => s.id === id);
  if (idx >= 0) {
    state.seasonGains.splice(idx, 1);
    markDirty();
    renderSeasonGainList();
  }
}

// ---------- RENDER TABLE ----------
function renderSeasonGainList() {
  ensureSeasonState();
  const tbody = $("seasonTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  state.seasonGains.forEach((sg) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${sg.season || ""}</td>
      <td>${sg.year != null ? sg.year : ""}</td>
      <td>${sg.food ?? 0}</td>
      <td>${sg.wood ?? 0}</td>
      <td>${sg.stone ?? 0}</td>
      <td>${sg.ore ?? 0}</td>
      <td>${sg.silver ?? 0}</td>
      <td>${sg.gold ?? 0}</td>
      <td>${sg.notes ? escapeHtmlForCell(sg.notes) : ""}</td>
      <td class="actions-cell">
        <button class="button tiny secondary season-details-btn">Details</button>
        <button class="button tiny secondary season-edit-btn">Edit</button>
        <button class="button tiny secondary season-delete-btn">Delete</button>
      </td>
    `;

    const detailsRow = document.createElement("tr");
    detailsRow.className = "season-details-row";
    detailsRow.style.display = "none";
    const detailsCell = document.createElement("td");
    detailsCell.colSpan = 10;
    detailsCell.innerHTML = `
      <div class="details-block">
        <div><strong>Season:</strong> ${sg.season || ""} ${sg.year ?? ""}</div>
        <div><strong>Food:</strong> ${sg.food ?? 0}</div>
        <div><strong>Wood:</strong> ${sg.wood ?? 0}</div>
        <div><strong>Stone:</strong> ${sg.stone ?? 0}</div>
        <div><strong>Ore:</strong> ${sg.ore ?? 0}</div>
        <div><strong>Silver:</strong> ${sg.silver ?? 0}</div>
        <div><strong>Gold:</strong> ${sg.gold ?? 0}</div>
        <div><strong>Notes:</strong><br>${sg.notes
          ? escapeHtmlForCell(sg.notes).replace(/\n/g, "<br>")
          : "(none)"}</div>
      </div>
    `;
    detailsRow.appendChild(detailsCell);

    // Wire buttons
    const detailsBtn = tr.querySelector(".season-details-btn");
    const editBtn = tr.querySelector(".season-edit-btn");
    const deleteBtn = tr.querySelector(".season-delete-btn");

    if (detailsBtn) {
      detailsBtn.addEventListener("click", () => {
        const isOpen = detailsRow.style.display !== "none";
        detailsRow.style.display = isOpen ? "none" : "";
        detailsBtn.textContent = isOpen ? "Details" : "Hide";
      });
    }

    if (editBtn) {
      editBtn.addEventListener("click", () => openSeasonModal(sg));
    }

    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => deleteSeasonGain(sg.id));
    }

    tbody.appendChild(tr);
    tbody.appendChild(detailsRow);
  });
}

// Escape helper for notes to keep things safe/nice
function escapeHtmlForCell(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
