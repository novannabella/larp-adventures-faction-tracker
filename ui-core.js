// ui-core.js

// CRITICAL FIX: Ensure $() is defined for all other scripts
const $ = (id) => document.getElementById(id);

let lastFocusedElement = null;

// Safe & accessible modal open
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  // Remember what had focus before opening
  lastFocusedElement = document.activeElement;

  modal.classList.add("visible");
  modal.classList.remove("hidden");
  $("modalBackdrop").classList.add("visible");

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

  modal.classList.remove("visible");
  modal.classList.add("hidden");
  $("modalBackdrop").classList.remove("visible");

  // If something inside the modal still has focus, blur it first
  const active = document.activeElement;
  if (active && modal.contains(active)) {
    try {
      active.blur();
    } catch (e) {
      // ignore if element can't be focused anymore
    }
  }

  // Now it's safe to hide from the accessibility tree
  modal.setAttribute("aria-hidden", "true");

  // Restore focus to whatever had it before the modal opened, if still in the DOM
  if (lastFocusedElement && document.body.contains(lastFocusedElement)) {
    try {
      lastFocusedElement.focus();
    } catch (e) {
      // ignore
    }
  }
}

function wireTopControls() {
  const saveBtn = $("saveStateBtn");
  if (saveBtn && !saveBtn._wired) {
    if (typeof saveState === 'function') saveBtn.addEventListener("click", saveState);
    saveBtn._wired = true;
  }

  const loadBtn = $("loadStateBtn");
  const loadInput = $("loadStateFile");
  if (loadBtn && loadInput && !loadBtn._wired) {
    loadBtn.addEventListener("click", () => loadInput.click());
    loadInput.addEventListener("change", loadFactionState);
    loadBtn._wired = true;
  }
}

function wireFactionInfo() {
  // Save faction name and notes on input/change
  const nameInput = $("factionName");
  const notesInput = $("factionNotes");
  [nameInput, notesInput].forEach((el) => {
    if (el && !el._wired) {
      if (typeof markDirty === 'function') el.addEventListener("input", markDirty);
      if (typeof saveState === 'function') el.addEventListener("change", saveState);
      el._wired = true;
    }
  });
}

function wireCoffers() {
  // Save coffers on input/change
  const resources = ["food", "wood", "stone", "ore", "silver", "gold"];
  resources.forEach((id) => {
    const input = $(id);
    if (input && !input._wired) {
      if (typeof markDirty === 'function') input.addEventListener("input", markDirty);
      if (typeof saveState === 'function') input.addEventListener("change", saveState);
      input._wired = true;
    }
  });
}

function wireModalCloseButtons() {
  const backdrop = $("modalBackdrop");
  if (backdrop && !backdrop._wired) {
    backdrop.addEventListener("click", () => {
      document.querySelectorAll(".modal.visible").forEach((m) => {
        m.classList.remove("visible");
        m.classList.add("hidden");

        // Same pattern as closeModal, but for all modals
        const active = document.activeElement;
        if (active && m.contains(active)) {
          active.blur();
        }

        m.setAttribute("aria-hidden", "true");
      });
      backdrop.classList.remove("visible");
      backdrop.classList.add("hidden");

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

// The main initialization function, called explicitly from the HTML
function init() {
  // Initialize and wire all sections first
  wireTopControls();
  wireFactionInfo();
  wireCoffers();

  // These functions call their respective render lists, creating table buttons
  // and need the functions defined above to be loaded first.
  if (typeof initSeasonSection === 'function') initSeasonSection();
  if (typeof initEventSection === 'function') initEventSection();
  if (typeof initHexSection === 'function') initHexSection();

  // Wire modal logic globally (closing by backdrop or X button)
  wireModalCloseButtons();
  
  // Load state last
  if (typeof loadState === 'function') {
    loadState();
  }
}

// NOTE: The previous document.addEventListener("DOMContentLoaded", ...) block was removed.
// It is now the user's responsibility to call init() after all scripts are loaded.