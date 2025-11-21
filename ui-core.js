// ui-core.js — FIXED VERSION
// Ensures ALL “Add” buttons work and all sections initialize properly.

// ===== BASIC MODAL SYSTEM =====
function openModal(id) {
  const modal = document.getElementById(id);
  const backdrop = document.getElementById("modalBackdrop");
  if (!modal || !backdrop) return;

  modal.classList.add("active");
  backdrop.classList.add("active");

  // Accessibility: modal is now visible to assistive tech
  modal.setAttribute("aria-hidden", "false");

  // Try to focus first focusable element
  const focusTarget =
    modal.querySelector("input, select, textarea, button") || modal;
  if (focusTarget && typeof focusTarget.focus === "function") {
    focusTarget.focus();
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  const backdrop = document.getElementById("modalBackdrop");
  if (!modal || !backdrop) return;

  modal.classList.remove("active");
  backdrop.classList.remove("active");

  // Accessibility: hide modal from assistive tech
  modal.setAttribute("aria-hidden", "true");
}

// Close modal for elements with [data-close-modal]
document.addEventListener("click", (e) => {
  if (e.target.matches("[data-close-modal]")) {
    const modal = e.target.closest(".modal");
    if (modal) modal.classList.remove("active");
    document.getElementById("modalBackdrop").classList.remove("active");
  }
});

// ===== INITIALIZE ALL UI SECTIONS (IMPORTANT) =====
function initUI() {
  // Load/Save wiring
  wireTopControls();

  // Faction info
  wireFactionInfo();

  // Coffers
  wireCoffers();

  // Seasonal gains
initSeasonSection();

  // Events
  initEventSection();

  // Controlled Hexes
  initHexSection();

  // Render UI
  syncFactionInfoToUI();
  syncCoffersToUI();
  renderSeasonGainList();
  renderEventList();
  renderHexList();
}


// Run after DOM loads
document.addEventListener("DOMContentLoaded", initUI);
