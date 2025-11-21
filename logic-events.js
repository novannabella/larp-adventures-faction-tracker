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
      offensiveAction: { type: "", target: "", notes: "" },
      detailsOpen: false
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
    detailsBtn.textContent = ev.detailsOpen ? "Hide" : "Details";

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

    const detailsRow = document.createElement("tr");
    detailsRow.className = "event-details-row";
    detailsRow.style.display = ev.detailsOpen ? "" : "none";

    const detailsTd = document.createElement("td");
    detailsTd.colSpan = 4;

    // Build the inner detail card
    const container = document.createElement("div");
    container.className = "event-body";

    container.innerHTML = `
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
          <span class="subsection-title">Builds</span>
          <button class="button small ev-add-build-btn">+ Add Build</button>
        </div>
        <p class="subsection-note">Structures you are constructing or upgrading during this event.</p>
      </div>
      <div class="mini-list ev-builds-list"></div>

      <div class="subsection-header">
        <div class="inline">
          <span class="subsection-title">Movements</span>
          <button class="button small ev-add-movement-btn">+ Add Movement</button>
        </div>
        <p class="subsection-note">Track unit movements between hexes for this event.</p>
      </div>
      <div class="mini-list ev-movements-list"></div>

      <div class="subsection-header">
        <span class="subsection-title">Offensive Action</span>
        <p class="subsection-note">Land Search, Invasion, or Quest &mdash; only one per event.</p>
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
    `;

    detailsTd.appendChild(container);
    detailsRow.appendChild(detailsTd);

    // Wire header actions
    detailsBtn.addEventListener("click", () => {
      ev.detailsOpen = !ev.detailsOpen;
      detailsRow.style.display = ev.detailsOpen ? "" : "none";
      detailsBtn.textContent = ev.detailsOpen ? "Hide" : "Details";
    });

    editBtn.addEventListener("click", () => openEventModal(ev));
    delBtn.addEventListener("click", () => deleteEvent(ev.id));

    // Wire inner fields
    const nameInput = container.querySelector(".ev-name-input");
    const dateInput = container.querySelector(".ev-date-input");
    const typeSelect = container.querySelector(".ev-type-select");
    const summaryInput = container.querySelector(".ev-summary-input");
    const offTypeSelect = container.querySelector(".ev-off-type-select");
    const offTargetInput = container.querySelector(".ev-off-target-input");
    const offNotesInput = container.querySelector(".ev-off-notes-input");

    nameInput.addEventListener("input", (e) => {
      ev.name = e.target.value;
      nameCell.textContent = ev.name || "Unnamed Event";
      markDirty();
    });

    dateInput.addEventListener("input", (e) => {
      ev.date = e.target.value;
      dateCell.textContent = ev.date || "No date";
      markDirty();
    });

    typeSelect.addEventListener("change", (e) => {
      ev.type = e.target.value;
      typeCell.textContent = ev.type || "Type: —";
      markDirty();
    });

    summaryInput.addEventListener("input", (e) => {
      ev.summary = e.target.value;
      markDirty();
    });

    offTypeSelect.addEventListener("change", (e) => {
      ev.offensiveAction.type = e.target.value;
      markDirty();
    });

    offTargetInput.addEventListener("input", (e) => {
      ev.offensiveAction.target = e.target.value;
      markDirty();
    });

    offNotesInput.addEventListener("input", (e) => {
      ev.offensiveAction.notes = e.target.value;
      markDirty();
    });

    // Builds
    const buildsContainer = container.querySelector(".ev-builds-list");
    const addBuildBtn = container.querySelector(".ev-add-build-btn");

    addBuildBtn.addEventListener("click", () => {
      const bid = `b_${nextBuildId++}`;
      ev.builds.push({ id: bid, hexId: "", description: "" });
      markDirty();
      renderEventList();
    });

    ev.builds.forEach((b) => {
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
        renderEventList();
      });

      structSelectEl.addEventListener("change", (e) => {
        b.description = e.target.value;
        markDirty();
      });
    });

    // Movements
    const movContainer = container.querySelector(".ev-movements-list");
    const addMovBtn = container.querySelector(".ev-add-movement-btn");

    addMovBtn.addEventListener("click", () => {
      const mid = `m_${nextMovementId++}`;
      ev.movements.push({ id: mid, unitName: "", from: "", to: "", notes: "" });
      markDirty();
      renderEventList();
    });

    ev.movements.forEach((m) => {
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

    tbody.appendChild(row);
    tbody.appendChild(detailsRow);
  });

  const hdr = $("eventDateSortHeader");
  if (hdr) {
    hdr.textContent = eventSortDirection === "asc" ? "Date ▲" : "Date ▼";
  }
}
