// logic-events.js

function initEventSection() {
  const addBtn = $("eventAddBtn");
  if (addBtn && !addBtn._wired) {
    addBtn.addEventListener("click", () => openEventModal());
    addBtn._wired = true;
  }

  const hdr = $("eventDateSortHeader");
  if (hdr && !hdr._wired) {
    hdr.addEventListener("click", () => {
      eventSortDirection = eventSortDirection === "asc" ? "desc" : "asc";
      renderEventList();
    });
    hdr._wired = true;
  }
}

// ---------- Event Modal (Add / Edit with actions) ----------

function openEventModal(ev) {
  const modal = $("eventModal");
  if (!modal) return;
  const body = modal.querySelector(".modal-body");
  if (!body) return;

  const isEdit = !!ev;
  const eventId = isEdit ? ev.id : "";

  const name = ev?.name || "";
  const date = ev?.date || "";
  const type = ev?.type || "";
  const summary = ev?.summary || "";

  const builds = ev?.builds ? [...ev.builds] : [];
  const movements = ev?.movements ? [...ev.movements] : [];
  const offensive = ev?.offensiveAction
    ? { ...ev.offensiveAction }
    : { type: "", target: "", notes: "" };

  // Build full modal content, including action sections.
  body.innerHTML = `
    <input type="hidden" id="eventModalId" value="${eventId}" />

    <div class="field-row">
      <label for="eventModalName">Event Name</label>
      <input id="eventModalName" type="text" value="${name}" />
    </div>

    <div class="field-row">
      <label for="eventModalDate">Date</label>
      <input id="eventModalDate" type="date" value="${date}" />
    </div>

    <div class="field-row">
      <label for="eventModalType">Type</label>
      <select id="eventModalType">
        ${eventTypeOptions(type)}
      </select>
    </div>

    <div class="field-row">
      <label for="eventModalSummary">Summary</label>
      <textarea id="eventModalSummary" rows="4" placeholder="Overall summary of what happened.">${summary}</textarea>
    </div>

    <hr />

    <div class="subsection-header">
      <span class="subsection-title">Builds</span>
    </div>
    <div class="section-row">
      <div class="field">
        <button type="button" class="button small ev-add-build-btn">+ Add Build</button>
      </div>
    </div>
    <div class="mini-list ev-builds-list"></div>

    <div class="subsection-header">
      <span class="subsection-title">Movements</span>
    </div>
    <div class="section-row">
      <div class="field">
        <button type="button" class="button small ev-add-movement-btn">+ Add Movement</button>
      </div>
    </div>
    <div class="mini-list ev-movements-list"></div>

    <div class="subsection-header">
      <span class="subsection-title">Offensive Action</span>
    </div>
    <div class="section-row">
      <div class="field">
        <button type="button" class="button small ev-add-off-btn">+ Add Offensive Action</button>
      </div>
    </div>
    <div class="mini-list ev-off-list"></div>
  `;

  // Wire Save button (must be done AFTER we replace innerHTML).
  const saveBtn = $("eventModalSaveBtn");
  if (saveBtn) {
    saveBtn.onclick = null;
    saveBtn.addEventListener("click", saveEventFromModal);
  }

  // Containers
  const buildsContainer = body.querySelector(".ev-builds-list");
  const movContainer = body.querySelector(".ev-movements-list");
  const offContainer = body.querySelector(".ev-off-list");

  // Add buttons
  const addBuildBtn = body.querySelector(".ev-add-build-btn");
  const addMovBtn = body.querySelector(".ev-add-movement-btn");
  const addOffBtn = body.querySelector(".ev-add-off-btn");

  // Helper to create a build row
  function addBuildRow(data) {
    const b = data || { id: `b_${nextBuildId++}`, hexId: "", description: "" };
    const rowDiv = document.createElement("div");
    rowDiv.className = "mini-row";
    rowDiv.dataset.buildId = b.id;

    const bodyRow = document.createElement("div");
    bodyRow.className = "mini-row-body two-cols";

    const fieldHex = document.createElement("div");
    fieldHex.className = "field";
    fieldHex.innerHTML = `
      <label>Hex</label>
      <select class="build-hex-select">
        ${buildHexOptions(b.hexId)}
      </select>
    `;

    const fieldUpgrade = document.createElement("div");
    fieldUpgrade.className = "field";
    fieldUpgrade.innerHTML = `
      <label>Upgrade</label>
      <select class="build-structure-select"></select>
    `;

    bodyRow.appendChild(fieldHex);
    bodyRow.appendChild(fieldUpgrade);

    const delBtn = document.createElement("button");
    delBtn.className = "button small secondary";
    delBtn.type = "button";
    delBtn.textContent = "Delete";

    delBtn.addEventListener("click", () => {
      rowDiv.remove();
    });

    rowDiv.appendChild(bodyRow);
    rowDiv.appendChild(delBtn);
    buildsContainer.appendChild(rowDiv);

    const hexSelectEl = bodyRow.querySelector(".build-hex-select");
    const structSelectEl = bodyRow.querySelector(".build-structure-select");

    function refreshStructureOptions() {
      const selectedHexId = hexSelectEl.value || "";
      const availableForHex = getAvailableStructuresForHexId(selectedHexId);
      const currentValue = structSelectEl.value || b.description || "";
      structSelectEl.innerHTML = structureSelectOptions(currentValue, availableForHex);
    }

    hexSelectEl.addEventListener("change", () => {
      refreshStructureOptions();
    });

    // Initialize
    refreshStructureOptions();
  }

  // Helper to create a movement row
  function addMovementRow(data) {
    const m = data || {
      id: `m_${nextMovementId++}`,
      unitName: "",
      from: "",
      to: "",
      notes: ""
    };

    const rowDiv = document.createElement("div");
    rowDiv.className = "mini-row";
    rowDiv.dataset.movementId = m.id;

    const bodyRow = document.createElement("div");
    bodyRow.className = "mini-row-body";

    const fieldUnit = document.createElement("div");
    fieldUnit.className = "field";
    fieldUnit.innerHTML = `
      <label>Unit</label>
      <input type="text" class="mov-unit-input" value="${m.unitName || ""}" placeholder="e.g. 1st Company, Grove Patrol" />
    `;

    const fieldFrom = document.createElement("div");
    fieldFrom.className = "field";
    fieldFrom.innerHTML = `
      <label>From</label>
      <input type="text" class="mov-from-input" value="${m.from || ""}" placeholder="Hex name or hex number" />
    `;

    const fieldTo = document.createElement("div");
    fieldTo.className = "field";
    fieldTo.innerHTML = `
      <label>To</label>
      <input type="text" class="mov-to-input" value="${m.to || ""}" placeholder="Hex name or hex number" />
    `;

    const fieldNotes = document.createElement("div");
    fieldNotes.className = "field";
    fieldNotes.innerHTML = `
      <label>Notes</label>
      <input type="text" class="mov-notes-input" value="${m.notes || ""}" placeholder="Scouting, escort, etc." />
    `;

    bodyRow.appendChild(fieldUnit);
    bodyRow.appendChild(fieldFrom);
    bodyRow.appendChild(fieldTo);
    bodyRow.appendChild(fieldNotes);

    const delBtn = document.createElement("button");
    delBtn.className = "button small secondary";
    delBtn.type = "button";
    delBtn.textContent = "Delete";

    delBtn.addEventListener("click", () => {
      rowDiv.remove();
    });

    rowDiv.appendChild(bodyRow);
    rowDiv.appendChild(delBtn);
    movContainer.appendChild(rowDiv);
  }

  // Helper to create offensive action row (only one)
  function renderOffensiveRow(data) {
    offContainer.innerHTML = "";
    const oa = data || { type: "", target: "", notes: "" };

    const rowDiv = document.createElement("div");
    rowDiv.className = "mini-row ev-off-row";

    const bodyRow = document.createElement("div");
    bodyRow.className = "mini-row-body two-cols";

    const fieldType = document.createElement("div");
    fieldType.className = "field";
    fieldType.innerHTML = `
      <label>Action Type</label>
      <select class="ev-off-type-select">
        ${offensiveTypeOptions(oa.type)}
      </select>
    `;

    const fieldTarget = document.createElement("div");
    fieldTarget.className = "field";
    fieldTarget.innerHTML = `
      <label>Target Hex / Location</label>
      <input type="text" class="ev-off-target-input" value="${oa.target || ""}" placeholder="e.g. A3 Forest, Ruins at B5, etc." />
    `;

    const fieldNotes = document.createElement("div");
    fieldNotes.className = "field";
    fieldNotes.style.gridColumn = "1 / -1";
    fieldNotes.innerHTML = `
      <label>Action Notes / Result</label>
      <textarea class="ev-off-notes-input" rows="3" placeholder="Encounter details, combat outcome, treasure, etc.">${oa.notes || ""}</textarea>
    `;

    bodyRow.appendChild(fieldType);
    bodyRow.appendChild(fieldTarget);
    bodyRow.appendChild(fieldNotes);

    const delBtn = document.createElement("button");
    delBtn.className = "button small secondary";
    delBtn.type = "button";
    delBtn.textContent = "Remove Offensive Action";

    delBtn.addEventListener("click", () => {
      offContainer.innerHTML = "";
      if (addOffBtn) addOffBtn.disabled = false;
    });

    rowDiv.appendChild(bodyRow);
    rowDiv.appendChild(delBtn);
    offContainer.appendChild(rowDiv);

    if (addOffBtn) addOffBtn.disabled = true;
  }

  // Wire add buttons
  if (addBuildBtn) {
    addBuildBtn.addEventListener("click", () => addBuildRow());
  }
  if (addMovBtn) {
    addMovBtn.addEventListener("click", () => addMovementRow());
  }
  if (addOffBtn) {
    addOffBtn.addEventListener("click", () => {
      if (!offContainer.querySelector(".ev-off-row")) {
        renderOffensiveRow();
      }
    });
  }

  // Populate from existing data (if editing)
  builds.forEach((b) => addBuildRow(b));
  movements.forEach((m) => addMovementRow(m));
  if (offensive.type || offensive.target || offensive.notes) {
    renderOffensiveRow(offensive);
  }

  openModal("eventModal");
}

function saveEventFromModal() {
  const id = $("eventModalId").value || null;
  const name = $("eventModalName").value.trim();
  const date = $("eventModalDate").value;
  const type = $("eventModalType").value;
  const summary = $("eventModalSummary").value.trim();

  const modal = $("eventModal");
  if (!modal) return;
  const body = modal.querySelector(".modal-body");
  if (!body) return;

  // Collect builds
  const buildsContainer = body.querySelector(".ev-builds-list");
  const buildRows = buildsContainer
    ? Array.from(buildsContainer.querySelectorAll(".mini-row"))
    : [];
  const builds = buildRows
    .map((row) => {
      const id = row.dataset.buildId || `b_${nextBuildId++}`;
      const hexSelect = row.querySelector(".build-hex-select");
      const structSelect = row.querySelector(".build-structure-select");
      const hexId = (hexSelect && hexSelect.value.trim()) || "";
      const description = (structSelect && structSelect.value.trim()) || "";
      if (!hexId || !description) return null;
      return { id, hexId, description };
    })
    .filter(Boolean);

  // Collect movements
  const movContainer = body.querySelector(".ev-movements-list");
  const movRows = movContainer
    ? Array.from(movContainer.querySelectorAll(".mini-row"))
    : [];
  const movements = movRows
    .map((row) => {
      const id = row.dataset.movementId || `m_${nextMovementId++}`;
      const unitInput = row.querySelector(".mov-unit-input");
      const fromInput = row.querySelector(".mov-from-input");
      const toInput = row.querySelector(".mov-to-input");
      const notesInput = row.querySelector(".mov-notes-input");

      const unitName = (unitInput && unitInput.value.trim()) || "";
      const from = (fromInput && fromInput.value.trim()) || "";
      const to = (toInput && toInput.value.trim()) || "";
      const notes = (notesInput && notesInput.value.trim()) || "";

      if (!unitName && !from && !to && !notes) return null;
      return { id, unitName, from, to, notes };
    })
    .filter(Boolean);

  // Collect offensive action
  const offRow = body.querySelector(".ev-off-row");
  let offensiveAction = { type: "", target: "", notes: "" };
  if (offRow) {
    const typeSelect = offRow.querySelector(".ev-off-type-select");
    const targetInput = offRow.querySelector(".ev-off-target-input");
    const notesInput = offRow.querySelector(".ev-off-notes-input");
    offensiveAction = {
      type: (typeSelect && typeSelect.value.trim()) || "",
      target: (targetInput && targetInput.value.trim()) || "",
      notes: (notesInput && notesInput.value.trim()) || ""
    };
  }

  if (!id) {
    const newId = `ev_${nextEventId++}`;
    state.events.push({
      id: newId,
      name,
      date,
      type,
      summary,
      builds,
      movements,
      offensiveAction
    });
  } else {
    const ev = state.events.find((e) => e.id === id);
    if (ev) {
      ev.name = name;
      ev.date = date;
      ev.type = type;
      ev.summary = summary;
      ev.builds = builds;
      ev.movements = movements;
      ev.offensiveAction = offensiveAction;
    }
  }

  markDirty();
  closeModal("eventModal");
  renderEventList();
}

// ---------- Delete & helpers ----------

function deleteEvent(id) {
  const idx = state.events.findIndex((ev) => ev.id === id);
  if (idx === -1) return;
  if (!confirm("Delete this event and all its actions?")) return;
  state.events.splice(idx, 1);
  markDirty();
  renderEventList();
}

// Structures available for a specific hex
function getAvailableStructuresForHexId(hexId) {
  if (!hexId) return ALL_STRUCTURES.slice();

  const hex = state.hexes.find((h) => h.id === hexId);
  if (!hex || !hex.structure) return ALL_STRUCTURES.slice();

  const existing = hex.structure
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.toLowerCase());

  return ALL_STRUCTURES.filter(
    (name) => !existing.includes(name.toLowerCase())
  );
}

function structureSelectOptions(selected, availableList) {
  const available = new Set(
    (availableList || ALL_STRUCTURES).map((s) => s.toLowerCase())
  );
  const selectedKey = (selected || "").toLowerCase();
  let html = '<option value="">-- Select Upgrade --</option>';

  Object.entries(STRUCTURE_GROUPS).forEach(([groupName, items]) => {
    const groupItems = items.filter(
      (item) =>
        item.toLowerCase() === selectedKey ||
        available.has(item.toLowerCase())
    );
    if (!groupItems.length) return;

    html += `<optgroup label="${groupName}">`;
    groupItems.forEach((item) => {
      const sel = item.toLowerCase() === selectedKey ? "selected" : "";
      html += `<option value="${item}" ${sel}>${item}</option>`;
    });
    html += "</optgroup>";
  });

  if (!html.includes("<optgroup") && selected) {
    html = `<option value="${selected}" selected>${selected}</option>`;
  }

  return html;
}

function buildHexOptions(selectedId) {
  const none = `<option value="">-- None --</option>`;
  const options = state.hexes
    .map((h) => {
      const label =
        (h.hexNumber || "(No Hex #)") + (h.name ? ` — ${h.name}` : "");
      const selected = h.id === selectedId ? "selected" : "";
      return `<option value="${h.id}" ${selected}>${label}</option>`;
    })
    .join("");
  return none + options;
}

function eventTypeOptions(current) {
  const list = ["", "Day Event", "Campout", "Festival Event", "Virtual Event"];
  return list
    .map((val) => {
      const label = val || "-- Select Type --";
      const selected = val === current ? "selected" : "";
      return `<option value="${val}" ${selected}>${label}</option>`;
    })
    .join("");
}

function offensiveTypeOptions(current) {
  const list = ["", "Land Search", "Invasion", "Quest"];
  return list
    .map((val) => {
      const label = val || "None";
      const selected = val === current ? "selected" : "";
      return `<option value="${val}" ${selected}>${label}</option>`;
    })
    .join("");
}

// ---------- List Rendering ----------

function renderEventList() {
  const tbody = $("eventTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const eventsCopy = [...state.events];
  eventsCopy.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    if (da === db) return state.events.indexOf(a) - state.events.indexOf(b);
    return da - db;
  });
  if (eventSortDirection === "desc") eventsCopy.reverse();

  eventsCopy.forEach((ev) => {
    const row = document.createElement("tr");
    row.className = "event-row";

    const nameCell = document.createElement("td");
    nameCell.textContent = ev.name || "Unnamed Event";

    const dateCell = document.createElement("td");
    dateCell.textContent = ev.date || "No date";

    const typeCell = document.createElement("td");
    typeCell.textContent = ev.type || "Type: —";

    const actionsTd = document.createElement("td");
    actionsTd.style.whiteSpace = "nowrap";

    const detailsBtn = document.createElement("button");
    detailsBtn.className = "button small secondary";
    detailsBtn.textContent = "Details";

    const editBtn = document.createElement("button");
    editBtn.className = "button small secondary";
    editBtn.textContent = "Edit";

    const delBtn = document.createElement("button");
    delBtn.className = "button small secondary";
    delBtn.textContent = "Delete";

    actionsTd.appendChild(detailsBtn);
    actionsTd.appendChild(editBtn);
    actionsTd.appendChild(delBtn);

    row.appendChild(nameCell);
    row.appendChild(dateCell);
    row.appendChild(typeCell);
    row.appendChild(actionsTd);

    tbody.appendChild(row);

    detailsBtn.addEventListener("click", () => openEventDetailsModal(ev));
    editBtn.addEventListener("click", () => openEventModal(ev));
    delBtn.addEventListener("click", () => deleteEvent(ev.id));
  });

  const hdr = $("eventDateSortHeader");
  if (hdr) {
    hdr.textContent = eventSortDirection === "asc" ? "Date ▲" : "Date ▼";
  }
}

// ---------- Details Modal (read-only) ----------

function openEventDetailsModal(ev) {
  if (!ev) return;
  const titleEl = $("detailsModalTitle");
  const body = $("detailsModalBody");
  if (!titleEl || !body) return;

  titleEl.textContent = ev.name || "Event Details";

  const builds =
    ev.builds && ev.builds.length
      ? ev.builds
          .map((b) => {
            const hex = state.hexes.find((h) => h.id === b.hexId);
            const hexLabel = hex
              ? (hex.hexNumber || "") + (hex.name ? ` — ${hex.name}` : "")
              : "(Unknown Hex)";
            return `• ${hexLabel}: ${b.description}`;
          })
          .join("<br>")
      : "None";

  const movements =
    ev.movements && ev.movements.length
      ? ev.movements
          .map(
            (m) =>
              `• ${m.unitName || "Unit"}: ${m.from || "?"} → ${
                m.to || "?"
              } (${m.notes || "no notes"})`
          )
          .join("<br>")
      : "None";

  const off = ev.offensiveAction || { type: "", target: "", notes: "" };
  const offText =
    off.type || off.target || off.notes
      ? `<strong>Type:</strong> ${off.type || "—"}<br>
         <strong>Target:</strong> ${off.target || "—"}<br>
         <strong>Notes:</strong> ${off.notes || "—"}`
      : "None";

  body.innerHTML = `
    <div class="details-grid">
      <p><strong>Event Name:</strong> ${ev.name || "—"}</p>
      <p><strong>Date:</strong> ${ev.date || "—"}</p>
      <p><strong>Type:</strong> ${ev.type || "—"}</p>
      <p><strong>Summary:</strong><br>${(ev.summary || "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .join("<br>") || "—"}</p>
    </div>
    <hr />
    <p><strong>Builds:</strong><br>${builds}</p>
    <p><strong>Movements:</strong><br>${movements}</p>
    <p><strong>Offensive Action:</strong><br>${offText}</p>
  `;

  openModal("detailsModal");
}
