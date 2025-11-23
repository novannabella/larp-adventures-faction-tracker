// logic-events.js (updated)

// --- State helpers ---
let eventSortDirection = "asc";

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

  // Event action buttons in Event modal
  const addBuildBtn = $("eventAddBuildBtn");
  if (addBuildBtn && !addBuildBtn._wired) {
    addBuildBtn.addEventListener("click", () => openBuildModal(workingEvent));
    addBuildBtn._wired = true;
  }

  const addMovementBtn = $("eventAddMovementBtn");
  if (addMovementBtn && !addMovementBtn._wired) {
    addMovementBtn.addEventListener("click", () => openMovementModal(workingEvent));
    addMovementBtn._wired = true;
  }

  const addOffenseBtn = $("eventAddOffenseBtn");
  if (addOffenseBtn && !addOffenseBtn._wired) {
    addOffenseBtn.addEventListener("click", () => openOffensiveActionModal(workingEvent));
    addOffenseBtn._wired = true;
  }

  // Sub‑modal save buttons
  const buildSaveBtn = $("buildModalSaveBtn");
  if (buildSaveBtn && !buildSaveBtn._wired) {
    buildSaveBtn.addEventListener("click", saveBuildFromModal);
    buildSaveBtn._wired = true;
  }

  const movementSaveBtn = $("movementModalSaveBtn");
  if (movementSaveBtn && !movementSaveBtn._wired) {
    movementSaveBtn.addEventListener("click", saveMovementFromModal);
    movementSaveBtn._wired = true;
  }

  const offenseSaveBtn = $("offenseModalSaveBtn");
  if (offenseSaveBtn && !offenseSaveBtn._wired) {
    offenseSaveBtn.addEventListener("click", saveOffensiveFromModal);
    offenseSaveBtn._wired = true;
  }

  // Build modal: when hex changes, refresh structure list
  const buildTargetHexSelect = $("buildModalTargetHex");
  if (buildTargetHexSelect && !buildTargetHexSelect._wired) {
    buildTargetHexSelect.addEventListener("change", onBuildTargetHexChange);
    buildTargetHexSelect._wired = true;
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
      offensiveAction: {
        type: "Invasion",
        hexNumber: "",
        targetFaction: "",
        target: "",
        success: null,
        notes: ""
      }
    };
  }

  $("eventModalTitle").textContent = ev ? "Edit Event" : "Add Event";
  $("eventModalId").value = ev?.id || "";
  $("eventModalName").value = ev?.name || "";
  $("eventModalDate").value = ev?.date || "";
  $("eventModalType").value = ev?.type || "";
  $("eventModalSummary").value = ev?.summary || "";

  openModal("eventModal");
}

function saveEventFromModal() {
  const name = $("eventModalName").value || "";
  if (!name) {
    alert("Please enter an Event Name.");
    return;
  }

  const id = workingEvent.id || nextEventId++;

  const newEvent = {
    id: id,
    name: name,
    date: $("eventModalDate").value || "",
    type: $("eventModalType").value || "",
    summary: $("eventModalSummary").value || "",
    // Keep the current actions from the working copy
    builds: workingEvent.builds || [],
    movements: workingEvent.movements || [],
    offensiveAction: workingEvent.offensiveAction || {
      type: "",
      hexNumber: "",
      targetFaction: "",
      target: "",
      success: null,
      notes: ""
    }
  };

  const existingIndex = state.events.findIndex((e) => e.id === id);
  if (existingIndex !== -1) {
    state.events[existingIndex] = newEvent;
  } else {
    state.events.push(newEvent);
  }

  state.events.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    if (dateA < dateB) return eventSortDirection === "asc" ? -1 : 1;
    if (dateA > dateB) return eventSortDirection === "asc" ? 1 : -1;
    return 0;
  });

  markDirty();
  renderEventList();
  closeModal("eventModal");
}

// --- Builds/Movement/Offense sub‑modal functions ---

function openBuildModal(ev) {
  const eventObj = ev || workingEvent;
  if (!eventObj) return;

  // Populate hex dropdown with all controlled hexes
  $("buildModalTargetHex").innerHTML = buildHexOptions();

  // Reset notes
  $("buildModalNotes").value = "";

  // Trigger initial structure options (no hex selected yet -> full list)
  onBuildTargetHexChange();

  openModal("buildModal");
}

function onBuildTargetHexChange() {
  const select = $("buildModalTargetHex");
  const hexId = select ? select.value : "";
  const template = $("structureOptionsTemplate");

  let allStructures = [];
  if (template) {
    allStructures = Array.from(template.querySelectorAll("option")).map(
      (o) => o.value
    );
  }

  let allowedList = allStructures;

  if (hexId) {
    // Remove structures that already exist on that hex
    const hex = state.hexes.find((h) => h.id === hexId);
    const existingStructs =
      hex && hex.structure
        ? hex.structure
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    allowedList = allStructures.filter((s) => !existingStructs.includes(s));
  }

  $("buildModalStructure").innerHTML = structureSelectOptions("", allowedList);
}

function saveBuildFromModal() {
  if (!workingEvent) return;

  const hexId = $("buildModalTargetHex").value || "";
  const structure = $("buildModalStructure").value || "";
  const notes = $("buildModalNotes").value || "";

  if (!hexId || !structure) {
    alert("Please select a target hex and a structure/upgrade.");
    return;
  }

  const build = {
    id: generateId("b"),
    targetHex: hexId,
    structure: structure,
    notes: notes,
    isDeleted: false
  };

  if (!Array.isArray(workingEvent.builds)) {
    workingEvent.builds = [];
  }
  workingEvent.builds.push(build);

  markDirty();
  closeModal("buildModal");
}

function openMovementModal(ev) {
  const eventObj = ev || workingEvent;
  if (!eventObj) return;

  const options = buildHexOptions();
  $("movementModalSourceHex").innerHTML = options;
  $("movementModalTargetHex").innerHTML = options;

  $("movementModalAssets").value = "";
  $("movementModalNotes").value = "";

  openModal("movementModal");
}

function saveMovementFromModal() {
  if (!workingEvent) return;

  const sourceHex = $("movementModalSourceHex").value || "";
  const targetHex = $("movementModalTargetHex").value || "";
  const assets = $("movementModalAssets").value || "";
  const notes = $("movementModalNotes").value || "";

  if (!sourceHex || !targetHex) {
    alert("Please select both a source and target hex.");
    return;
  }

  const movement = {
    id: generateId("m"),
    sourceHex: sourceHex,
    targetHex: targetHex,
    assetsMoved: assets,
    notes: notes,
    isDeleted: false
  };

  if (!Array.isArray(workingEvent.movements)) {
    workingEvent.movements = [];
  }
  workingEvent.movements.push(movement);

  markDirty();
  closeModal("movementModal");
}

function openOffensiveActionModal(ev) {
  const eventObj = ev || workingEvent;
  if (!eventObj) return;

  if (!eventObj.offensiveAction) {
    eventObj.offensiveAction = {
      type: "Invasion",
      hexNumber: "",
      targetFaction: "",
      target: "",
      success: null,
      notes: ""
    };
  }

  const offense = eventObj.offensiveAction;

  $("offenseModalHexNumber").value = offense.hexNumber || "";
  $("offenseModalTargetFaction").value =
    offense.targetFaction || offense.target || "";
  $("offenseModalSuccess").value = offense.success === false ? "No" : "Yes";
  $("offenseModalNotes").value = offense.notes || "";

  openModal("offenseModal");
}

function saveOffensiveFromModal() {
  if (!workingEvent) return;

  const hexNumber = $("offenseModalHexNumber").value || "";
  const faction = $("offenseModalTargetFaction").value || "";
  const successVal = $("offenseModalSuccess").value;
  const notes = $("offenseModalNotes").value || "";

  if (!hexNumber || !faction) {
    alert("Please enter a hex number and target faction.");
    return;
  }

  workingEvent.offensiveAction = {
    type: "Invasion",
    hexNumber: hexNumber,
    targetFaction: faction,
    target: faction,
    success: successVal === "Yes",
    notes: notes
  };

  markDirty();
  closeModal("offenseModal");
}

// --- Rendering ---

function deleteEvent(id) {
  const ev = state.events.find((e) => e.id === id);
  if (!ev) return;
  if (!confirm("Delete event: " + ev.name + "?")) return;
  state.events = state.events.filter((e) => e.id !== id);
  markDirty();
  renderEventList();
}

function renderEventList() {
  const tbody = $("eventTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const sortedEvents = [...state.events].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    if (dateA < dateB) return eventSortDirection === "asc" ? -1 : 1;
    if (dateA > dateB) return eventSortDirection === "asc" ? 1 : -1;
    return 0;
  });

  sortedEvents.forEach((ev) => {
    const row = document.createElement("tr");

    function td(content) {
      const cell = document.createElement("td");
      // Wrap content in a span for mobile styling (right-alignment)
      cell.innerHTML = `<span>${content || "—"}</span>`;
      return cell;
    }

    // Helper to count non-deleted actions (assuming actions have a `isDeleted` flag)
    const countActions = (arr) =>
      Array.isArray(arr) ? arr.filter((a) => !a.isDeleted).length : 0;

    // Match the header: Event | Date | Type | Builds | Moves | Offense | Actions
    row.appendChild(td(ev.name));
    row.appendChild(td(ev.date));
    row.appendChild(td(ev.type));

    // Builds column (4th TD) - count
    row.appendChild(td(countActions(ev.builds)));

    // Moves column (5th TD) - count
    row.appendChild(td(countActions(ev.movements)));

    // Offense column (6th TD) - shows type if present
    const offenseText = ev.offensiveAction && ev.offensiveAction.type
      ? ev.offensiveAction.type
      : "—";
    row.appendChild(td(offenseText));

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
    row.appendChild(actionsTd);

    detailsBtn.addEventListener("click", () => openEventDetailsModal(ev));
    editBtn.addEventListener("click", () => openEventModal(ev));
    delBtn.addEventListener("click", () => deleteEvent(ev.id));

    tbody.appendChild(row);
  });

  const hdr = $("eventDateSortHeader");
  if (hdr) {
    hdr.textContent = eventSortDirection === "asc" ? "Date ▲" : "Date ▼";
  }
}

function openEventDetailsModal(ev) {
  const titleEl = $("detailsModalTitle");
  const bodyEl = $("detailsModalBody");
  if (!titleEl || !bodyEl) return;

  const heading = ev.name || "Event Details";
  titleEl.textContent = heading;

  const safeBuilds = Array.isArray(ev.builds) ? ev.builds : [];
  const safeMovements = Array.isArray(ev.movements) ? ev.movements : [];

  // Build Actions List
  const buildList = safeBuilds
    .filter((b) => !b.isDeleted)
    .map(
      (b) =>
        `<li>Hex: ${b.targetHex || "—"}, Structure: ${
          b.structure || "—"
        }, Notes: ${b.notes || "—"}</li>`
    )
    .join("");

  // Movement Actions List
  const movementList = safeMovements
    .filter((m) => !m.isDeleted)
    .map(
      (m) =>
        `<li>From: ${m.sourceHex || "—"}, To: ${
          m.targetHex || "—"
        }, Assets: ${m.assetsMoved || "—"}, Notes: ${
          m.notes || "—"
        }</li>`
    )
    .join("");

  // Offensive Action
  const offense = ev.offensiveAction;
  let offenseDetail;
  if (offense && offense.type) {
    const successText =
      offense.success == null ? "—" : offense.success ? "Yes" : "No";
    offenseDetail = `
      <p><strong>Type:</strong> ${offense.type || "—"}</p>
      <p><strong>Hex:</strong> ${offense.hexNumber || "—"}</p>
      <p><strong>Faction:</strong> ${
        offense.targetFaction || offense.target || "—"
      }</p>
      <p><strong>Successful:</strong> ${successText}</p>
      <p><strong>Notes:</strong> ${offense.notes || "—"}</p>
    `;
  } else {
    offenseDetail = "<p>No Offensive Action</p>";
  }

  bodyEl.innerHTML = `
    <div class="details-grid">
      <p><strong>Date:</strong> ${ev.date || "—"}</p>
      <p><strong>Type:</strong> ${ev.type || "—"}</p>
      <p style="grid-column: 1 / -1;"><strong>Summary:</strong> ${
        ev.summary || "—"
      }</p>
    </div>

    <h4 style="margin-top: 15px; margin-bottom: 5px;">Build Actions (${
      safeBuilds.length
    })</h4>
    ${
      buildList
        ? `<ul style="margin-top: 0; padding-left: 20px;">${buildList}</ul>`
        : "<p>None</p>"
    }

    <h4 style="margin-top: 15px; margin-bottom: 5px;">Movement Actions (${
      safeMovements.length
    })</h4>
    ${
      movementList
        ? `<ul style="margin-top: 0; padding-left: 20px;">${movementList}</ul>`
        : "<p>None</p>"
    }

    <h4 style="margin-top: 15px; margin-bottom: 5px;">Offensive Action</h4>
    ${offenseDetail}
  `;

  openModal("detailsModal");
}

// --- Utility Functions (Hex/Structure related helpers) ---

function structureSelectOptions(selected, allowedList) {
  const options = [];
  options.push(`<option value="">-- Select Structure --</option>`);

  const groups =
    allowedList && allowedList.length
      ? { Custom: allowedList }
      : STRUCTURE_GROUPS;

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
      const sel = h.id === selectedId ? "selected" : "";
      return `<option value="${h.id}" ${sel}>${label}</option>`;
    })
    .join("");

  return none + options;
}

function generateId(prefix) {
  return (
    prefix + "_" + Math.random().toString(36).substr(2, 9)
  );
}
