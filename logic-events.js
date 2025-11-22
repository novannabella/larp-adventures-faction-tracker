// logic-events.js (clean rewrite)

// --- State helpers ---
let eventSortDirection = "asc";
let nextEventId = 1;

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

  renderEventList();
}

// --- Models / working copy ---
let workingEvent = null;
let workingIsNew = true;

// --- Event modal ---

function openEventModal(ev) {
  workingIsNew = !ev;
  if (ev) {
    // deep clone to avoid mutating until save
    workingEvent = JSON.parse(JSON.stringify(ev));
  } else {
    workingEvent = {
      id: null,
      name: "",
      date: "",
      type: "",
      summary: "",
      builds: [],
      movements: [],
      offensiveAction: { type: "", target: "", notes: "" }
    };
  }

  $("eventModalTitle").textContent = ev ? "Edit Event" : "Add Event";
  $("eventModalId").value = workingEvent.id || "";

  $("eventModalName").value = workingEvent.name || "";
  $("eventModalDate").value = workingEvent.date || "";
  $("eventModalType").value = workingEvent.type || "";
  $("eventModalSummary").value = workingEvent.summary || "";

  const buildsContainer = $("eventBuildsContainer");
  const movesContainer = $("eventMovementsContainer");
  const offContainer = $("eventOffenseContainer");

  renderBuildsInModal(buildsContainer);
  renderMovementsInModal(movesContainer);
  renderOffenseInModal(offContainer);

  // Wire add buttons (overwrite handlers each open)
  $("eventAddBuildBtn").onclick = () => {
    if (!workingEvent.builds) workingEvent.builds = [];
    workingEvent.builds.push({
      id: "b_" + Date.now() + "_" + (workingEvent.builds.length + 1),
      hexId: "",
      description: ""
    });
    renderBuildsInModal(buildsContainer);
  };

  $("eventAddMovementBtn").onclick = () => {
    if (!workingEvent.movements) workingEvent.movements = [];
    workingEvent.movements.push({
      id: "m_" + Date.now() + "_" + (workingEvent.movements.length + 1),
      unitName: "",
      from: "",
      to: "",
      notes: ""
    });
    renderMovementsInModal(movesContainer);
  };

  $("eventAddOffenseBtn").onclick = () => {
    if (!workingEvent.offensiveAction) {
      workingEvent.offensiveAction = { type: "", target: "", notes: "" };
    }
    offContainer.style.display = "block";
  };

  openModal("eventModal");
}

function saveEventFromModal() {
  if (!workingEvent) return;

  workingEvent.name = $("eventModalName").value.trim();
  workingEvent.date = $("eventModalDate").value;
  workingEvent.type = $("eventModalType").value;
  workingEvent.summary = $("eventModalSummary").value.trim();

  if (workingIsNew) {
    const newId = "ev_" + calcNextNumericId(state.events, "ev_");
    workingEvent.id = newId;
    state.events.push(workingEvent);
  } else {
    const idx = state.events.findIndex((e) => e.id === workingEvent.id);
    if (idx !== -1) {
      state.events[idx] = workingEvent;
    }
  }

  markDirty();
  closeModal("eventModal");
  workingEvent = null;
  renderEventList();
}

// --- Modal helpers ---

function renderBuildsInModal(container) {
  if (!container) return;
  container.innerHTML = "";

  if (!workingEvent || !workingEvent.builds || workingEvent.builds.length === 0) {
    container.style.display = "none";
    return;
  }

  container.style.display = "block";

  workingEvent.builds.forEach((b) => {
    const row = document.createElement("div");
    row.className = "section-row";

    const fieldHex = document.createElement("div");
    fieldHex.className = "field";
    const hexSelect = document.createElement("select");
    hexSelect.className = "build-hex-select";
    hexSelect.innerHTML = buildHexOptions(b.hexId);
    fieldHex.innerHTML = "<label>Hex</label>";
    fieldHex.appendChild(hexSelect);

    const fieldUpgrade = document.createElement("div");
    fieldUpgrade.className = "field";
    const structSelect = document.createElement("select");
    structSelect.className = "build-structure-select";
    structSelect.innerHTML = structureSelectOptions(b.description || "", null);
    fieldUpgrade.innerHTML = "<label>Upgrade</label>";
    fieldUpgrade.appendChild(structSelect);

    const delBtn = document.createElement("button");
    delBtn.className = "button small secondary";
    delBtn.textContent = "Delete";

    const wrap = document.createElement("div");
    wrap.className = "inline-between";
    const inner = document.createElement("div");
    inner.className = "section-row";
    inner.appendChild(fieldHex);
    inner.appendChild(fieldUpgrade);
    wrap.appendChild(inner);
    wrap.appendChild(delBtn);

    row.appendChild(wrap);
    container.appendChild(row);

    hexSelect.addEventListener("change", (e) => {
      b.hexId = e.target.value;
      markDirty();
    });
    structSelect.addEventListener("change", (e) => {
      b.description = e.target.value;
      markDirty();
    });
    delBtn.addEventListener("click", () => {
      const idx = workingEvent.builds.findIndex((x) => x.id === b.id);
      if (idx !== -1) {
        workingEvent.builds.splice(idx, 1);
        renderBuildsInModal(container);
        markDirty();
      }
    });
  });
}

function renderMovementsInModal(container) {
  if (!container) return;
  container.innerHTML = "";

  if (!workingEvent || !workingEvent.movements || workingEvent.movements.length === 0) {
    container.style.display = "none";
    return;
  }

  container.style.display = "block";

  workingEvent.movements.forEach((m) => {
    const row = document.createElement("div");
    row.className = "section-row";

    row.innerHTML = `
      <div class="field">
        <label>Unit / Group</label>
        <input type="text" class="mv-unit-input" value="${m.unitName || ""}" />
      </div>
      <div class="field">
        <label>From</label>
        <input type="text" class="mv-from-input" value="${m.from || ""}" />
      </div>
      <div class="field">
        <label>To</label>
        <input type="text" class="mv-to-input" value="${m.to || ""}" />
      </div>
      <div class="field">
        <label>Notes</label>
        <textarea class="mv-notes-input">${m.notes || ""}</textarea>
      </div>
    `;

    const delBtn = document.createElement("button");
    delBtn.className = "button small secondary";
    delBtn.textContent = "Delete";

    const wrap = document.createElement("div");
    wrap.className = "inline-between";
    wrap.appendChild(row);
    wrap.appendChild(delBtn);

    container.appendChild(wrap);

    const unitInput = row.querySelector(".mv-unit-input");
    const fromInput = row.querySelector(".mv-from-input");
    const toInput = row.querySelector(".mv-to-input");
    const notesInput = row.querySelector(".mv-notes-input");

    unitInput.addEventListener("input", (e) => {
      m.unitName = e.target.value;
      markDirty();
    });
    fromInput.addEventListener("input", (e) => {
      m.from = e.target.value;
      markDirty();
    });
    toInput.addEventListener("input", (e) => {
      m.to = e.target.value;
      markDirty();
    });
    notesInput.addEventListener("input", (e) => {
      m.notes = e.target.value;
      markDirty();
    });

    delBtn.addEventListener("click", () => {
      const idx = workingEvent.movements.findIndex((x) => x.id === m.id);
      if (idx !== -1) {
        workingEvent.movements.splice(idx, 1);
        renderMovementsInModal(container);
        markDirty();
      }
    });
  });
}

function renderOffenseInModal(container) {
  if (!container) return;

  const oa = workingEvent && workingEvent.offensiveAction;
  if (!oa || (!oa.type && !oa.target && !oa.notes)) {
    container.style.display = "none";
    return;
  }

  container.style.display = "block";
  $("eventOffenseType").value = oa.type || "";
  $("eventOffenseTarget").value = oa.target || "";
  $("eventOffenseNotes").value = oa.notes || "";

  $("eventOffenseType").onchange = (e) => {
    oa.type = e.target.value;
    markDirty();
  };
  $("eventOffenseTarget").oninput = (e) => {
    oa.target = e.target.value;
    markDirty();
  };
  $("eventOffenseNotes").oninput = (e) => {
    oa.notes = e.target.value;
    markDirty();
  };
}

// --- Details modal ---

function describeHex(hexId) {
  const hex = state.hexes.find((h) => h.id === hexId);
  if (!hex) return "(Unknown Hex)";
  let label = hex.hexNumber || "";
  if (hex.name) label += (label ? " — " : "") + hex.name;
  return label || "(Unnamed Hex)";
}

function openEventDetailsModal(ev) {
  const titleEl = $("detailsModalTitle");
  const bodyEl = $("detailsModalBody");
  if (!titleEl || !bodyEl) return;

  titleEl.textContent = ev.name ? `Event Details — ${ev.name}` : "Event Details";

  let html = `
    <div class="details-grid">
      <p><strong>Event Name:</strong> ${ev.name || "—"}</p>
      <p><strong>Date:</strong> ${ev.date || "—"}</p>
      <p><strong>Type:</strong> ${ev.type || "—"}</p>
      <p style="grid-column: 1 / -1;"><strong>Summary:</strong><br>${ev.summary || "—"}</p>
    </div>
  `;

  if (ev.builds && ev.builds.length) {
    html += '<h4 class="subsection-title">Builds</h4><div class="mini-list">';
    ev.builds.forEach((b) => {
      const hexLabel = describeHex(b.hexId);
      html += `<p>• Built <strong>${b.description || "Structure"}</strong> in <strong>${hexLabel}</strong></p>`;
    });
    html += "</div>";
  }

  if (ev.movements && ev.movements.length) {
    html += '<h4 class="subsection-title">Movements</h4><div class="mini-list">';
    ev.movements.forEach((m) => {
      html += `<p>• <strong>${m.unitName || "Unit"}</strong> moved from <strong>${m.from || "—"}</strong> to <strong>${m.to || "—"}</strong>`;
      if (m.notes) html += ` — ${m.notes}`;
      html += "</p>";
    });
    html += "</div>";
  }

  const oa = ev.offensiveAction || {};
  if (oa.type || oa.target || oa.notes) {
    html += '<h4 class="subsection-title">Offensive Action</h4><div class="mini-list">';
    if (oa.type) html += `<p><strong>Type:</strong> ${oa.type}</p>`;
    if (oa.target) html += `<p><strong>Target:</strong> ${oa.target}</p>`;
    if (oa.notes) html += `<p><strong>Notes:</strong> ${oa.notes}</p>`;
    html += "</div>";
  }

  bodyEl.innerHTML = html;
  openModal("detailsModal");
}

// --- Table rendering ---

function renderEventList() {
  const tbody = $("eventTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const eventsCopy = [...state.events];
  eventsCopy.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    if (da === db) return 0;
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
    typeCell.textContent = ev.type || "—";

    const buildsCell = document.createElement("td");
    buildsCell.textContent = ev.builds && ev.builds.length ? String(ev.builds.length) : "";

    const movesCell = document.createElement("td");
    movesCell.textContent = ev.movements && ev.movements.length ? String(ev.movements.length) : "";

    const offenseCell = document.createElement("td");
    const hasOffense = ev.offensiveAction && (ev.offensiveAction.type || ev.offensiveAction.target || ev.offensiveAction.notes);
    offenseCell.textContent = hasOffense ? "1" : "";

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
    editBtn.addEventListener("click", () => openEventModal(ev));
    delBtn.addEventListener("click", () => {
      if (!confirm("Delete this event and all its actions?")) return;
      const idx = state.events.findIndex((e) => e.id === ev.id);
      if (idx !== -1) {
        state.events.splice(idx, 1);
        markDirty();
        renderEventList();
      }
    });

    tbody.appendChild(row);
  });

  const hdr = $("eventDateSortHeader");
  if (hdr) {
    hdr.textContent = eventSortDirection === "asc" ? "Date ▲" : "Date ▼";
  }
}

// --- Structure helpers (copied from previous version) ---

const STRUCTURE_GROUPS = {
  Improvements: [
    "Market",
    "Carpenter's Shop",
    "Blacksmith",
    "Bank",
    "Stone Mason's Shop"
  ],
  Fortifications: ["Watch Tower", "Fort", "Castle"],
  "Seaborne assets": ["Dock", "Fishing Fleet", "Trading Vessel", "War Galley"]
};

const ALL_STRUCTURES = Object.values(STRUCTURE_GROUPS).flat();

function structureSelectOptions(selected, allowedList) {
  const options = [];
  options.push(`<option value="">-- Select Structure --</option>`);

  const groups = allowedList && allowedList.length ? { Custom: allowedList } : STRUCTURE_GROUPS;

  Object.entries(groups).forEach(([groupName, structs]) => {
    options.push(`<optgroup label="${groupName}">`);
    structs.forEach((s) => {
      const sel = s === selected ? "selected" : "";
      options.push(`<option value="${s}" ${sel}>${s}</option>`);
    });
    options.push("</optgroup>");
  });

  return options.join("");
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
