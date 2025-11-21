function openSeasonModal(entry) {
  // Use your existing modal-content as the body container
  const modal = $("seasonModal");
  const modalContent = modal.querySelector(".modal-content");

  // Find or create a .modal-body wrapper
  let body = modalContent.querySelector(".modal-body");
  if (!body) {
    body = document.createElement("div");
    body.className = "modal-body";
    modalContent.insertBefore(body, modalContent.querySelector(".modal-footer"));
  }

  $("seasonModalId").value = entry ? entry.id : "";
  $("seasonModalTitle").textContent = entry ? "Edit Seasonal Gain" : "Add Seasonal Gain";

  const now = new Date().getFullYear();

  // Build compact 2-column UI while STILL using your existing element IDs
  body.innerHTML = `
    <div class="field-row two-col">
      <div class="field">
        <label for="seasonModalSeason">Season</label>
        <select id="seasonModalSeason">
          <option value="Spring">Spring</option>
          <option value="Summer">Summer</option>
          <option value="Fall">Fall</option>
          <option value="Winter">Winter</option>
        </select>
      </div>

      <div class="field">
        <label for="seasonModalYear">Year</label>
        <input id="seasonModalYear" type="number">
      </div>
    </div>

    <hr>

    <div class="field-row two-col">
      <div class="field">
        <label for="seasonModalFood">Food</label>
        <input id="seasonModalFood" type="number">
      </div>
      <div class="field">
        <label for="seasonModalWood">Wood</label>
        <input id="seasonModalWood" type="number">
      </div>
    </div>

    <div class="field-row two-col">
      <div class="field">
        <label for="seasonModalStone">Stone</label>
        <input id="seasonModalStone" type="number">
      </div>
      <div class="field">
        <label for="seasonModalOre">Ore</label>
        <input id="seasonModalOre" type="number">
      </div>
    </div>

    <div class="field-row two-col">
      <div class="field">
        <label for="seasonModalSilver">Silver</label>
        <input id="seasonModalSilver" type="number">
      </div>
      <div class="field">
        <label for="seasonModalGold">Gold</label>
        <input id="seasonModalGold" type="number">
      </div>
    </div>

    <hr>

    <div class="field-row">
      <label for="seasonModalNotes">Notes</label>
      <textarea id="seasonModalNotes" rows="3"></textarea>
    </div>
  `;

  // Populate values AFTER building the DOM so IDs exist
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
