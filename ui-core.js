// Simple helper, assuming this exists elsewhere in your codebase.
// If it doesn't, uncomment this:
// const $ = (id) => document.getElementById(id);

let lastFocusedElement = null;

// Safe & accessible modal open
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  // Remember what had focus before opening
  lastFocusedElement = document.activeElement;

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");

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
  if (!modal) return;

  modal.classList.remove("active");

  // If something inside the modal still has focus, blur it first
  const active = document.activeElement;
  if (active && modal.contains(active)) {
    active.blur();
  }

  // Now it's safe to hide from the accessibility tree
  modal.setAttribute("aria-hidden", "true");

  // Restore focus to whatever had it before the modal opened, if still in the DOM
  if (lastFocusedElement && document.body.contains(lastFocusedElement)) {
    try {
      lastFocusedElement.focus();
    } catch (e) {
      // ignore if element can't be focused anymore
    }
  }
}

function wireModalCloseButtons() {
  const backdrop = $("modalBackdrop");
  if (backdrop && !backdrop._wired) {
    backdrop.addEventListener("click", () => {
      document.querySelectorAll(".modal.active").forEach((m) => {
        m.classList.remove("active");

        // Same pattern as closeModal, but for all modals
        const active = document.activeElement;
        if (active && m.contains(active)) {
          active.blur();
        }

        m.setAttribute("aria-hidden", "true");
      });
      backdrop.classList.remove("active");

      // Restore focus if possible
      if (lastFocusedElement && document.body.contains(lastFocusedElement)) {
        try {
          lastFocusedElement.focus();
        } catch (e) {
          // ignore
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

document.addEventListener("DOMContentLoaded", () => {
  // your existing init wiring
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
