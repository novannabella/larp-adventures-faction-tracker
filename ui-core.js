// ui-core.js

// Simple helper, assuming this exists elsewhere in your codebase.
const $ = (id) => document.getElementById(id);

let lastFocusedElement = null;
const MODAL_ACTIVE_CLASS = "active"; 

// Safe & accessible modal open
function openModal(id) {
  const modal = document.getElementById(id);
  const backdrop = document.getElementById("modalBackdrop");
  if (!modal) return;

  // Remember what had focus before opening
  lastFocusedElement = document.activeElement;

  modal.classList.add(MODAL_ACTIVE_CLASS);
  modal.setAttribute("aria-hidden", "false");
  
  // FIX: Activate backdrop
  if (backdrop) {
      backdrop.classList.add(MODAL_ACTIVE_CLASS); 
  }

  // Move focus into the modal (first focusable element, or the modal itself)
  setTimeout(() => {
    const focusTarget =
      modal.querySelector("[data-modal-initial-focus]") ||
      modal.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) ||
      modal;

    if (focusTarget && typeof focusTarget.focus === "function") {
      focusTarget.focus();
    }
  }, 0);
}

// Safe & accessible modal close
function closeModal(id) {
  const modal = document.getElementById(id);
  const backdrop = document.getElementById("modalBackdrop");
  if (!modal) return;

  modal.classList.remove(MODAL_ACTIVE_CLASS);

  // If something inside the modal still has focus, blur it first
  const active = document.activeElement;
  if (active && modal.contains(active)) {
    active.blur();
  }

  // Now it's safe to hide from the accessibility tree
  modal.setAttribute("aria-hidden", "true");

  // FIX: Only hide the backdrop if no other modal is open
  const openModals = document.querySelectorAll(`.modal.${MODAL_ACTIVE_CLASS}`);
  // Subtract 1 from count for the modal we are closing
  if (backdrop && openModals.length <= 1) {
      backdrop.classList.remove(MODAL_ACTIVE_CLASS);
  
      // Restore focus to whatever had it before the modal opened, if still in the DOM
      if (lastFocusedElement && document.body.contains(lastFocusedElement)) {
        try {
          lastFocusedElement.focus();
        } catch (e) {
          // ignore if element can't be focused anymore
        }
      }
  }
}

function wireModalCloseButtons() {
  const backdrop = $("modalBackdrop");
  if (backdrop && !backdrop._wired) {
    // FIX: Only close all modals if clicking the backdrop directly.
    backdrop.addEventListener("click", (e) => {
        if (e.target.id === 'modalBackdrop') {
            document.querySelectorAll(".modal." + MODAL_ACTIVE_CLASS).forEach((m) => {
                m.classList.remove(MODAL_ACTIVE_CLASS);
                m.setAttribute("aria-hidden", "true");
            });
            backdrop.classList.remove(MODAL_ACTIVE_CLASS);

            // Restore focus
            if (lastFocusedElement && document.body.contains(lastFocusedElement)) {
                try {
                    lastFocusedElement.focus();
                } catch (e) {
                    // ignore
                }
            }
        }
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

// Central initialization function
document.addEventListener("DOMContentLoaded", () => {
  // Wire the top controls, faction info, and coffers first
  if (typeof wireTopControls === 'function') wireTopControls();
  if (typeof wireFactionInfo === 'function') wireFactionInfo();
  if (typeof wireCoffers === 'function') wireCoffers();

  // FIX: Ensure all section init functions are called after the DOM is ready
  if (typeof initSeasonSection === 'function') initSeasonSection();
  if (typeof initEventSection === 'function') initEventSection(); 
  if (typeof initHexSection === 'function') initHexSection();

  // FIX: This must run to make the close buttons work.
  wireModalCloseButtons(); 
});