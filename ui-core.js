// ui-core.js

function openModal(id) {
  const modal = $(id);
  const backdrop = $("modalBackdrop");
  if (!modal || !backdrop) return;

  modal.classList.add("active");
  backdrop.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(id) {
  const modal = $(id);
  const backdrop = $("modalBackdrop");
  if (!modal || !backdrop) return;

  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");

  // If no other modals are active, hide backdrop
  const anyActive = document.querySelector(".modal.active");
  if (!anyActive) {
    backdrop.classList.remove("active");
  }
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
  // Faction Info + Save/Load
  wireTopControls();
  wireFactionInfo();
  wireCoffers();

  // Initialize all logic modules
  initSeasonSection();
  initEventSection();
  initHexSection();

  // Modal close buttons & backdrop behavior
  wireModalCloseButtons();

  // Initial UI render
  renderSeasonGainList();
  renderEventList();
  renderHexList();
});
