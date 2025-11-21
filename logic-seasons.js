// logic-seasons.js

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

function openSeasonModal(entry) {
  $("seasonModalId").value = entry ? entry.id : "";
  $("seasonModalTitle").textContent = entry ? "Edit Seasonal Gain" : "Add Seasonal Gain";

  const now = new Date().getFullYear();

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
  const yearVal = parseInt($("seasonModalYear").value, 10);
  const year = isNaN(yearVal) ? new Date().getFullYear() : yearVal;

  const food = parseInt($("seasonModalFood").value || "0", 10) || 0;
  const wood = parseInt($("seasonModalWood").value || "0", 10) || 0;
  const stone = parseInt($("seasonModalStone").value || "0", 10) || 0;
  const ore = parseInt($("seasonModalOre").value || "0", 10) || 0;
  const silver = parseInt($("seasonModalSilver").value || "0", 10) || 0;
  const gold = parseInt($("seasonModalGold").value || "0", 10) || 0;
  const notes = $("seasonModalNotes").value.trim();

  if (!id) {
    const newId = `sg_${nextSeasonGainId++}`;
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
      notes,
      detailsOpen: false
    });
  } else {
    const existing = state.seasonGains.find((sg) => sg.id === id);
    if (existing) {
      existing.season = season;
      existing.year = year;
      existing.food = food;
      existing.wood = wood;
      existing.stone = stone;
      existing.ore = ore;
      existing.silver = silver;
      existing.gold = gold;
      existing.notes = notes;
    }
  }

  markDirty();
  closeModal("seasonModal");
  renderSeasonGainList();
}

function deleteSeasonGain(id) {
  if (!confirm("Delete this seasonal gain entry?")) return;
  state.seasonGains = state.seasonGains.filter((sg) => sg.id !== id);
  markDirty();
  renderSeasonGainList();
}

function renderSeasonGainList() {
  const tbody = $("seasonTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  state.seasonGains.forEach((sg) => {
    const tr = document.createElement("tr");
    tr.className = "season-row";

    function td(text) {
      const cell = document.createElement("td");
      cell.textContent = text;
      return cell;
    }

    tr.appendChild(td(sg.season || ""));
    tr.appendChild(td(sg.year || ""));
    tr.appendChild(td(sg.food || ""));
    tr.appendChild(td(sg.wood || ""));
    tr.appendChild(td(sg.stone || ""));
    tr.appendChild(td(sg.ore || ""));
    tr.appendChild(td(sg.silver || ""));
    tr.appendChild(td(sg.gold || ""));

    const preview =
      sg.notes && sg.notes.length > 40
        ? sg.notes.slice(0, 37) + "..."
        : sg.notes || "";
    tr.appendChild(td(preview));

    const actionsTd = document.createElement("td");
    actionsTd.style.whiteSpace = "nowrap";

    const detailsBtn = document.createElement("button");
    detailsBtn.className = "button small secondary";
    detailsBtn.textContent = sg.detailsOpen ? "Hide" : "Details";

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

    const detailsRow = document.createElement("tr");
    detailsRow.className = "season-details-row";
    detailsRow.style.display = sg.detailsOpen ? "" : "none";

    const detailsTd = document.createElement("td");
    detailsTd.colSpan = 10;
    detailsTd.innerHTML = `
      <strong>Notes:</strong> ${sg.notes || "—"}
    `;
    detailsRow.appendChild(detailsTd);

    detailsBtn.addEventListener("click", () => {
      sg.detailsOpen = !sg.detailsOpen;
      detailsRow.style.display = sg.detailsOpen ? "" : "none";
      detailsBtn.textContent = sg.detailsOpen ? "Hide" : "Details";
    });

    editBtn.addEventListener("click", () => openSeasonModal(sg));
    delBtn.addEventListener("click", () => deleteSeasonGain(sg.id));

    tbody.appendChild(tr);
    tbody.appendChild(detailsRow);
  });
}
