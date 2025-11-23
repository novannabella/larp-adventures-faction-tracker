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
  if (saveBtn && !saveBtn._wired && typeof saveFactionState === 'function') {
    saveBtn.addEventListener("click", saveFactionState);
    saveBtn._wired = true;
  }

  // Wire Load Button
  const loadBtn = $("loadStateBtn");
  const loadFile = $("loadStateFile");
  if (loadBtn && loadFile && !loadBtn._wired && typeof loadFactionState === 'function') {
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

function init() {
  // Initialize and wire all sections first
  wireTopControls();
  wireFactionInfo();
  wireCoffers();

  // These functions call their respective render lists, creating table buttons
  initSeasonSection();
  initEventSection();
  initHexSection();

  // Wire modal logic globally (closing by backdrop or X button)
  wireModalCloseButtons();
  
  // CRITICAL FIX: Load state last, so an error here doesn't prevent button wiring.
  if (typeof loadState === 'function') {
      loadState();
  }
}

document.addEventListener("DOMContentLoaded", init);