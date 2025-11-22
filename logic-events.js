// logic-events.js (clean rewrite)

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

  // Action Button Wiring (Build, Movement, Offensive Action)
  const addBuildBtn = $("eventBuildAddBtn");
  if (addBuildBtn && !addBuildBtn._wired) {
    addBuildBtn.addEventListener("click", () => openBuildModal(workingEvent));
    addBuildBtn._wired = true;
  }

  const addMovementBtn = $("eventMovementAddBtn");
  if (addMovementBtn && !addMovementBtn._wired) {
    addMovementBtn.addEventListener("click", () => openMovementModal(workingEvent));
    addMovementBtn._wired = true;
  }
  
  // ADDED: Offensive Action Button
  const addOffenseBtn = $("eventOffensiveAddBtn");
  if (addOffenseBtn && !addOffenseBtn._wired) {
    // Assuming a corresponding function for the modal exists
    addOffenseBtn.addEventListener("click", () => openOffensiveActionModal(workingEvent));
    addOffenseBtn._wired = true;
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
  $("eventModalId").value = ev?.id || "";
  $("eventModalName").value = ev?.name || "";
  $("eventModalDate").value = ev?.date || "";
  $("eventModalType").value = ev?.type || "";
  $("eventModalSummary").value = ev?.summary || "";
  
  // You would typically call a render function here to display the current builds/moves/offense
  // renderEventActionsSummary(workingEvent);

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
    builds: workingEvent.builds,
    movements: workingEvent.movements,
    offensiveAction: workingEvent.offensiveAction
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

// --- Builds/Movement/Offense Sub-modal functions (dummies for sub-modals) ---
// NOTE: These functions are stubs. You will need to implement the full logic 
// for opening and saving sub-modals for Build/Movement/Offensive Actions.

function openBuildModal(event) {
    if (!event) return;
    // Implementation would open the #buildModal, populate it, and wire up its save logic
    // alert("Opening Build Modal for " + event.name); 
    openModal("buildModal");
}

function openMovementModal(event) {
    if (!event) return;
    // Implementation would open the #movementModal, populate it, and wire up its save logic
    // alert("Opening Movement Modal for " + event.name); 
    openModal("movementModal");
}

function openOffensiveActionModal(event) {
    if (!event) return;
    // Implementation would open the #offensiveActionModal, populate it, and wire up its save logic
    // alert("Opening Offensive Action Modal for " + event.name); 
    // You likely need to create an #offensiveActionModal in factions.html
    alert("Offensive Action button clicked. Implement your modal/logic here."); 
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
    const countActions = (arr) => arr.filter(a => !a.isDeleted).length;

    // Match the header: Event | Date | Type | Builds | Moves | Offense | Actions
    row.appendChild(td(ev.name));
    row.appendChild(td(ev.date));
    row.appendChild(td(ev.type));
    
    // Builds column (4th TD) - now just shows count
    row.appendChild(td(countActions(ev.builds)));
    
    // Moves column (5th TD) - now just shows count
    row.appendChild(td(countActions(ev.movements)));
    
    // Offense column (6th TD) - shows if an action is present
    const offenseText = ev.offensiveAction?.type ? ev.offensiveAction.type : "—";
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
    
    // Build Actions List
    const buildList = ev.builds.filter(b => !b.isDeleted).map(b => 
        `<li>Hex: ${b.targetHex || '—'}, Structure: ${b.structure || '—'}, Notes: ${b.notes || '—'}</li>`
    ).join('');

    // Movement Actions List
    const movementList = ev.movements.filter(m => !m.isDeleted).map(m => 
        `<li>From: ${m.sourceHex || '—'}, To: ${m.targetHex || '—'}, Assets: ${m.assetsMoved || '—'}, Notes: ${m.notes || '—'}</li>`
    ).join('');

    // Offensive Action
    const offense = ev.offensiveAction;
    const offenseDetail = offense?.type ? 
        `<p><strong>Type:</strong> ${offense.type || '—'}</p>
         <p><strong>Target:</strong> ${offense.target || '—'}</p>
         <p><strong>Notes:</strong> ${offense.notes || '—'}</p>` : 
        `<p>No Offensive Action</p>`;

    bodyEl.innerHTML = `
        <div class="details-grid">
            <p><strong>Date:</strong> ${ev.date || '—'}</p>
            <p><strong>Type:</strong> ${ev.type || '—'}</p>
            <p style="grid-column: 1 / -1;"><strong>Summary:</strong> ${ev.summary || '—'}</p>
        </div>

        <h4 style="margin-top: 15px; margin-bottom: 5px;">Build Actions (${ev.builds.length})</h4>
        ${buildList ? `<ul style="margin-top: 0; padding-left: 20px;">${buildList}</ul>` : '<p>None</p>'}

        <h4 style="margin-top: 15px; margin-bottom: 5px;">Movement Actions (${ev.movements.length})</h4>
        ${movementList ? `<ul style="margin-top: 0; padding-left: 20px;">${movementList}</ul>` : '<p>None</p>'}

        <h4 style="margin-top: 15px; margin-bottom: 5px;">Offensive Action</h4>
        ${offenseDetail}
    `;

    openModal("detailsModal");
}

// --- Utility Functions (Hex/Structure related helpers) ---

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
      const sel = h.id === selectedId ? "selected" : "";
      return `<option value="${h.id}" ${sel}>${label}</option>`;
    })
    .join("");

  return none + options;
}
