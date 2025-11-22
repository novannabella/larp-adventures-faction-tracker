// logic-events.js

function initEventSection() {
  const addBtn = $("eventAddBtn");
  if (addBtn && !addBtn._wired) {
    addBtn.addEventListener("click", () => openEventModal());
    addBtn._wired = true;
  }

  const saveBtn = $("eventModalSaveBtn");
  if (saveBtn && !saveBtn._wired) {
    saveBtn.addEventListener("click", saveEventFromModal);
    saveBtn._wired = true;
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

function openEventModal(ev) {
  // Basic add/edit modal (used when clicking top-level Add button).
  // For rich details (builds, movements, offensive action) see openEventDetailsModal().
  $("eventModalId").value = ev ? ev.id : "";
  $("eventModalTitle").textContent = ev ? "Edit Event" : "Add Event";

  $("eventModalName").value = ev?.name || "";
  $("eventModalDate").value = ev?.date || "";
  $("eventModalType").value = ev?.type || "";
  $("eventModalSummary").value = ev?.summary || "";

  openModal("eventModal");
}

function saveEventFromModal() {
  const id = $("eventModalId").value || null;
  const name = $("eventModalName").value.trim();
  const date = $("eventModalDate").value;
  const type = $("eventModalType").value;
  const summary = $("eventModalSummary").value.trim();

  if (!id) {
    const newId = `ev_${nextEventId++}`;
    state.events.push({
      id: newId,
      name,
      date,
      type,
      summary,
      builds: [],
      movements: [],
      offensiveAction: { type: "", target: "", notes: "" }
    });
  } else {
    const ev = state.events.find((e) => e.id === id);
    if (ev) {
      ev.name = name;
      ev.date = date;
      ev.type = type;
      ev.summary = summary;
    }
  }

  markDirty();
  closeModal("eventModal");
  renderEventList();
}

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
    .filter(Boolean);

  return ALL_STRUCTURES.filter((name) => !existing.includes(name));
}

function structureSelectOptions(selected, availableList) {
  const available = new Set(availableList || ALL_STRUCTURES);
  let html = '<option value="">-- Select Upgrade --</option>';

  Object.entries(STRUCTURE_GROUPS).forEach(([groupName, items]) => {
    const groupItems = items.filter(
      (item) => item === selected || available.has(item)
    );
    if (!groupItems.length) return;

    html += `<optgroup label="${groupName}">`;
    groupItems.forEach((item) => {
      const sel = item === selected ? "selected" : "";
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

function openEventDetailsModal(ev) {
  const titleEl = $("detailsModalTitle");
  const bodyEl = $("detailsModalBody");
  if (!titleEl || !bodyEl) return;

  titleEl.textContent = ev.name ? `Event Details — ${ev.name}` : "Event Details";

  bodyEl.innerHTML = `
    <div class="event-body">
      <div class="section-row">
        <div class="field">
          <label>Event Name</label>
          <input type="text" class="ev-name-input" value="${ev.name || ""}" />
        </div>
        <div class="field">
          <label>Event Date</label>
          <input type="date" class="ev-date-input" value="${ev.date || ""}" />
        </div>
      </div>

      <div class="section-row">
        <div class="field">
          <label>Event Type</label>
          <select class="ev-type-select">
            ${eventTypeOptions(ev.type)}
          </select>
        </div>
        <div class="field">
          <label>Event Notes / Summary</label>
          <textarea class="ev-summary-input" placeholder="Overall summary of what happened.">${ev.summary ||
            ""}</textarea>
        </div>
      </div>

      <div class="subsection-header">
        <div class="inline">
          <span class="subsection-title">Turn Actions</span>
          <div class="inline">
            <button class="button small ev-toggle-builds-btn">Add Build</button>
            <button class="button small ev-toggle-movements-btn">Add Movement</button>
            <button class="button small ev-toggle-offense-btn">Offensive Action</button>
          </div>
        </div>
        <p class="subsection-note">Use the buttons above to add or edit builds, movements, or a single offensive action.</p>
      </div>

      <div class="mini-section ev-builds-section" style="display: none;">
        <div class="subsection-header">
          <span class="subsection-title">Builds</span>
          <p class="subsection-note">Structures you are constructing or upgrading during this event.</p>
        </div>
        <div class="mini-list ev-builds-list"></div>
        <button class="button small ev-add-build-btn">+ Add Build</button>
      </div>

      <div class="mini-section ev-movements-section" style="display: none;">
        <div class="subsection-header">
          <span class="subsection-title">Movements</span>
          <p class="subsection-note">Track unit movements between hexes for this event.</p>
        </div>
        <div class="mini-list ev-movements-list"></div>
        <button class="button small ev-add-movement-btn">+ Add Movement</button>
      </div>

      <div class="mini-section ev-offense-section" style="display: none;">
        <div class="subsection-header">
          <span class="subsection-title">Offensive Action</span>
          <p class="subsection-note">Land Search, Invasion, or Quest — only one per event.</p>
        </div>
        <div class="section-row">
          <div class="field">
            <label>Action Type</label>
            <select class="ev-off-type-select">
              ${offensiveTypeOptions(ev.offensiveAction.type)}
            </select>
          </div>
          <div class="field">
            <label>Target Hex / Location</label>
            <input type="text" class="ev-off-target-input" value="${
              ev.offensiveAction.target || ""
            }" placeholder="e.g. A3 Forest, Ruins at B5, etc." />
          </div>
        </div>
        <div class="section-row">
          <div class="field">
            <label>Action Notes / Result</label>
            <textarea class="ev-off-notes-input" placeholder="Encounter details, combat outcome, treasure, etc.">${
              ev.offensiveAction.notes || ""
            }</textarea>
          </div>
        </div>
      </div>
    </div>
  `;

  // Wire basic fields
  const nameInput = bodyEl.querySelector(".ev-name-input");
  const dateInput = bodyEl.querySelector(".ev-date-input");
  const typeSelect = bodyEl.querySelector(".ev-type-select");
  const summaryInput = bodyEl.querySelector(".ev-summary-input");

  nameInput.addEventListener("input", (e) => {
    ev.name = e.target.value;
    markDirty();
    renderEventList();
  });

  dateInput.addEventListener("input", (e) => {
    ev.date = e.target.value;
    markDirty();
    renderEventList();
  });

  typeSelect.addEventListener("change", (e) => {
    ev.type = e.target.value;
    markDirty();
    renderEventList();
  });

  summaryInput.addEventListener("input", (e) => {
    ev.summary = e.target.value;
    markDirty();
  });

  // Sections + toggles
  const buildsSection = bodyEl.querySelector(".ev-builds-section");
  const movementsSection = bodyEl.querySelector(".ev-movements-section");
  const offenseSection = bodyEl.querySelector(".ev-offense-section");

  const toggleBuildsBtn = bodyEl.querySelector(".ev-toggle-builds-btn");
  const toggleMovementsBtn = bodyEl.querySelector(".ev-toggle-movements-btn");
  const toggleOffenseBtn = bodyEl.querySelector(".ev-toggle-offense-btn");

  function showSection(section) {
    if (section === buildsSection) {
      buildsSection.style.display = "block";
    }
    if (section === movementsSection) {
      movementsSection.style.display = "block";
    }
    if (section === offenseSection) {
      offenseSection.style.display = "block";
    }
  }

  toggleBuildsBtn.addEventListener("click", () => showSection(buildsSection));
  toggleMovementsBtn.addEventListener("click", () => showSection(movementsSection));
  toggleOffenseBtn.addEventListener("click", () => showSection(offenseSection));

  // Auto-open sections that already have data
  if (ev.builds && ev.builds.length) {
    buildsSection.style.display = "block";
  }
  if (ev.movements && ev.movements.length) {
    movementsSection.style.display = "block";
  }
  if (ev.offensiveAction && (ev.offensiveAction.type || ev.offensiveAction.target || ev.offensiveAction.notes)) {
    offenseSection.style.display = "block";
  }

  // Builds
  const buildsContainer = bodyEl.querySelector(".ev-builds-list");
  const addBuildBtn = bodyEl.querySelector(".ev-add-build-btn");

  function renderBuilds() {
    buildsContainer.innerHTML = "";
    (ev.builds || []).forEach((b) => {
      const rowDiv = document.createElement("div");
      rowDiv.className = "mini-row";
      rowDiv.dataset.id = b.id;

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

      const availableForHex = getAvailableStructuresForHexId(b.hexId);
      const fieldUpgrade = document.createElement("div");
      fieldUpgrade.className = "field";
      fieldUpgrade.innerHTML = `
        <label>Upgrade</label>
        <select class="build-structure-select">
          ${structureSelectOptions(b.description || "", availableForHex)}
        </select>
      `;

      bodyRow.appendChild(fieldHex);
      bodyRow.appendChild(fieldUpgrade);

      const delBuildBtn = document.createElement("button");
      delBuildBtn.className = "button small secondary";
      delBuildBtn.textContent = "Delete";

      delBuildBtn.addEventListener("click", () => {
        const idxB = ev.builds.findIndex((x) => x.id === b.id);
        if (idxB !== -1) {
          ev.builds.splice(idxB, 1);
          markDirty();
          renderBuilds();
          renderEventList();
        }
      });

      rowDiv.appendChild(bodyRow);
      rowDiv.appendChild(delBuildBtn);
      buildsContainer.appendChild(rowDiv);

      const hexSelectEl = bodyRow.querySelector(".build-hex-select");
      const structSelectEl = bodyRow.querySelector(".build-structure-select");

      hexSelectEl.addEventListener("change", (e) => {
        b.hexId = e.target.value;
        markDirty();
        renderBuilds();
        renderEventList();
      });

      structSelectEl.addEventListener("change", (e) => {
        b.description = e.target.value;
        markDirty();
        renderEventList();
      });
    });
  }

  addBuildBtn.addEventListener("click", () => {
    const bid = `b_${nextBuildId++}`;
    if (!ev.builds) ev.builds = [];
    ev.builds.push({ id: bid, hexId: "", description: "" });
    markDirty();
    renderBuilds();
    renderEventList();
  });

  renderBuilds();

  // Movements
  const movContainer = bodyEl.querySelector(".ev-movements-list");
  const addMovBtn = bodyEl.querySelector(".ev-add-movement-btn");

  function renderMovements() {
    movContainer.innerHTML = "";
    (ev.movements || []).forEach((m) => {
      const rowDiv = document.createElement("div");
      rowDiv.className = "mini-row";
      rowDiv.dataset.id = m.id;

      const bodyRow = document.createElement("div");
      bodyRow.className = "mini-row-body";

      const fieldUnit = document.createElement("div");
      fieldUnit.className = "field";
      fieldUnit.innerHTML = `
        <label>Unit</label>
        <input type="text" class="mov-unit-input" value="${m.unitName ||
          ""}" placeholder="e.g. 1st Company, Grove Patrol" />
      `;

      const fieldFrom = document.createElement("div");
      fieldFrom.className = "field";
      fieldFrom.innerHTML = `
        <label>From</label>
        <input type="text" class="mov-from-input" value="${m.from ||
          ""}" placeholder="Hex name or hex number" />
      `;

      const fieldTo = document.createElement("div");
      fieldTo.className = "field";
      fieldTo.innerHTML = `
        <label>To</label>
        <input type="text" class="mov-to-input" value="${m.to ||
          ""}" placeholder="Hex name or hex number" />
      `;

      const fieldNotes = document.createElement("div");
      fieldNotes.className = "field";
      fieldNotes.innerHTML = `
        <label>Notes</label>
        <input type="text" class="mov-notes-input" value="${m.notes ||
          ""}" placeholder="Scouting, escort, etc." />
      `;

      bodyRow.appendChild(fieldUnit);
      bodyRow.appendChild(fieldFrom);
      bodyRow.appendChild(fieldTo);
      bodyRow.appendChild(fieldNotes);

      const delMovBtn = document.createElement("button");
      delMovBtn.className = "button small secondary";
      delMovBtn.textContent = "Delete";

      delMovBtn.addEventListener("click", () => {
        const idxM = ev.movements.findIndex((x) => x.id === m.id);
        if (idxM !== -1) {
          ev.movements.splice(idxM, 1);
          markDirty();
          renderMovements();
          renderEventList();
        }
      });

      rowDiv.appendChild(bodyRow);
      rowDiv.appendChild(delMovBtn);
      movContainer.appendChild(rowDiv);

      bodyRow
        .querySelector(".mov-unit-input")
        .addEventListener("input", (e) => {
          m.unitName = e.target.value;
          markDirty();
        });
      bodyRow
        .querySelector(".mov-from-input")
        .addEventListener("input", (e) => {
          m.from = e.target.value;
          markDirty();
        });
      bodyRow
        .querySelector(".mov-to-input")
        .addEventListener("input", (e) => {
          m.to = e.target.value;
          markDirty();
        });
      bodyRow
        .querySelector(".mov-notes-input")
        .addEventListener("input", (e) => {
          m.notes = e.target.value;
          markDirty();
        });
    });
  }

  addMovBtn.addEventListener("click", () => {
    const mid = `m_${nextMovementId++}`;
    if (!ev.movements) ev.movements = [];
    ev.movements.push({ id: mid, unitName: "", from: "", to: "", notes: "" });
    markDirty();
    renderMovements();
    renderEventList();
  });

  renderMovements();

  // Offensive action
  const offTypeSelect = bodyEl.querySelector(".ev-off-type-select");
  const offTargetInput = bodyEl.querySelector(".ev-off-target-input");
  const offNotesInput = bodyEl.querySelector(".ev-off-notes-input");

  offTypeSelect.addEventListener("change", (e) => {
    ev.offensiveAction.type = e.target.value;
    markDirty();
    renderEventList();
  });

  offTargetInput.addEventListener("input", (e) => {
    ev.offensiveAction.target = e.target.value;
    markDirty();
  });

  offNotesInput.addEventListener("input", (e) => {
    ev.offensiveAction.notes = e.target.value;
    markDirty();
  });

  openModal("detailsModal");
}

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

    const buildsCell = document.createElement("td");
    buildsCell.textContent = (ev.builds && ev.builds.length) ? ev.builds.length : "";

    const movesCell = document.createElement("td");
    movesCell.textContent = (ev.movements && ev.movements.length) ? ev.movements.length : "";

    const offenseCell = document.createElement("td");
    offenseCell.textContent =
      ev.offensiveAction && ev.offensiveAction.type ? "1" : "";

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
    row.appendChild(buildsCell);
    row.appendChild(movesCell);
    row.appendChild(offenseCell);
    row.appendChild(actionsTd);

    detailsBtn.addEventListener("click", () => openEventDetailsModal(ev));
    editBtn.addEventListener("click", () => openEventDetailsModal(ev));
    delBtn.addEventListener("click", () => deleteEvent(ev.id));

    tbody.appendChild(row);
  });

  const hdr = $("eventDateSortHeader");
  if (hdr) {
    hdr.textContent = eventSortDirection === "asc" ? "Date ▲" : "Date ▼";
  }
}
