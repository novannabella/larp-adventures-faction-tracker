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
    <div class="field-row">
      <label for="seasonModalSeason">Season</label>
      <select id="seasonModalSeason">
        <option value="Spring">Spring</option>
        <option value="Summer">Summer</option>
        <option value="Fall">Fall</option>
        <option value="Winter">Winter</option>
      </select>
