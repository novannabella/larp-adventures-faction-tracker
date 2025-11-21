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
  $("seasonModalTitle").textContent = entry ? "Edit Seasonal Gain" : "Add Seasonal Gain";

  body.innerHTML = `
    <div class="field-row two-col">
      <div class="field">
        <label for="seasonModalSeason">Season</label>
        <select id="seasonModalSeason">
          <option value="Spring" ${season === "Spring" ? "selected" : ""}>Spring</option>
          <option value="Summer" ${season === "Summer" ? "selected" : ""}>Summer</option>
          <option value="Fall" ${season === "Fall" ? "selected" : ""}>Fall</option>
          <option value="Winter" ${season === "Winter" ? "selected" : ""}>Winter</option>
        </select>
      </div>

      <div class="field">
        <label for="seasonModalYear">Year</label>
        <input id="seasonModalYear" type="number" value="${year}">
      </div>
    </div>

    <hr />

    <div class="field-row two-col">
      <div class="field">
        <label for="seasonModalFood">Food Gained</label>
        <input id="seasonModalFood" type="number" value="${food}">
      </div>

      <div class="field">
        <label for="seasonModalWood">Wood Gained</label>
        <input id="seasonModalWood" type="number" value="${wood}">
      </div>
    </div>

    <div class="field-row two-col">
      <div class="field">
        <label for="seasonModalStone">Stone Gained</label>
        <input id="seasonModalStone" type="number" value="${stone}">
      </div>

      <div class="field">
        <label for="seasonModalOre">Ore Gained</label>
        <input id="seasonModalOre" type="number" value="${ore}">
      </div>
    </div>

    <div class="field-row two-col">
      <div class="field">
        <label for="seasonModalSilver">Silver Gained</label>
        <input id="seasonModalSilver" type="number" value="${silver}">
      </div>

      <div class="field">
        <label for="seasonModalGold">Gold Gained</label>
        <input id="seasonModalGold" type="number" value="${gold}">
      </div>
    </div>

    <hr />

    <div class="field-row">
      <label for="seasonModalNotes">Notes</label>
      <textarea id="seasonModalNotes" rows="3">${notes}</textarea>
    </div>
  `;

  // Wire up the save button (already done by init, but safe)
  const saveBtn = $("seasonModalSaveBtn");
  if (saveBtn) {
    saveBtn.onclick = null;
    saveBtn.addEventListener("click", saveSeasonFromModal);
  }

  openModal("seasonModal");
}
