// ui-core.js


function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  // Disable background
  document.body.setAttribute("inert", "true");
  // Focus modal container
  modal.focus();
}


function closeModal(id) {
  const modal = document.getElementById(id);
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  // Re-enable background
  document.body.removeAttribute("inert");
}

function wireModalCloseButtons() {
  const backdrop = $("modalBackdrop");
  if (backdrop && !backdrop._wired) {
    backdrop.addEventListener("click", () => {
      document.querySelectorAll(".modal.active").forEach((m) => {
        m.classList.remove("active");
        m.setAttribute("aria-hidden", "true");
      });
      backdrop.classList.remove("active");
    });
    backdrop._wired = true;
  }

  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    if (btn._wired) return;
    btn.addEventListener("click", () => {
      const modal = btn.closest(".modal");
      if (modal && modal.id) {
        closeModal(modal.id);
      }
    });
    btn._wired = true;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  wireTopControls();
  wireFactionInfo();
  wireCoffers();

  initSeasonSection();
  initEventSection();
  initHexSection();

  wireModalCloseButtons();

  // initial renders
  renderSeasonGainList();
  renderEventList();
  renderHexList();
});
