// ui-core.js

// Simple helper, assuming this exists elsewhere in your codebase.
// If it doesn't, uncomment this:
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
    backdrop.addEventListener("click", (e) => {
      // Only close if clicking the backdrop, not elements inside it
      if (e.target !== backdrop) return;

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

function wireTopControls() {
  // Wire Save Button
  const saveBtn = $("saveStateBtn");
  if (saveBtn && !saveBtn._wired) {
    saveBtn.addEventListener("click", saveFactionState);
    saveBtn._wired = true;
  }

  // Wire Load Button
  const loadBtn = $("loadStateBtn");
  const loadFile = $("loadStateFile");
  if (loadBtn && loadFile && !loadBtn._wired) {
    loadBtn.addEventListener("click", () => loadFile.click());
    loadFile.addEventListener("change", loadFactionState);
    loadBtn._wired = true;
  }
}

function wireFactionInfo() {
  // Save faction name and notes on input/change
  const nameInput = $("factionName");
  const notesInput = $("factionNotes");
  [nameInput, notesInput].forEach((el) => {
    if (el && !el._wired) {
      el.addEventListener("input", markDirty);
      el.addEventListener("change", saveState);
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
      input.addEventListener("input", markDirty);
      input.addEventListener("change", saveState);
      input._wired = true;
    }
  });
}

function init() {
  // Note: state should be loaded before rendering, but we call render after load
  // Load state and wire global elements
  loadState();

  // Initialize and wire all sections
  wireTopControls();
  wireFactionInfo();
  wireCoffers();

  // These functions call their respective render lists as their last step
  // They depend on the $() function which is now enabled.
  initSeasonSection();
  initEventSection();
  initHexSection();

  // Wire modal logic globally
  wireModalCloseButtons();
}

document.addEventListener("DOMContentLoaded", init);