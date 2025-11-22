// Safe & accessible modal open
function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add("active");

  // Modal should NEVER be aria-hidden when open
  modal.setAttribute("aria-hidden", "false");

  // Remove any accidental inert on the body
  document.body.removeAttribute("inert");

  // Focus modal for accessibility
  setTimeout(() => modal.focus(), 0);
}

// Safe modal close
function closeModal(id) {
  const modal = document.getElementById(id);
  modal.classList.remove("active");

  // Closed modals should be aria-hidden
  modal.setAttribute("aria-hidden", "true");

  // Remove inert to ensure page is interactive
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

  renderSeasonGainList();
  renderEventList();
  renderHexList();
});
