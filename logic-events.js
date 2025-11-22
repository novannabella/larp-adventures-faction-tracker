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

// Narrative-friendly hex label
function describeHex(hexId) {
  const hex = state.hexes.find((h) => h.id === hexId);
  if (!hex) return "(Unknown Hex)";

  let text = hex.hexNumber || "";
  if (hex.name) text += ` — ${hex.name}`;
  return text.trim();
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

  // -------------------------
  // BUILDS (only if present)
  // -------------------------
  if (ev.builds && ev.builds.length > 0) {
    html += `<h4 class="subsection-title">Builds</h4><div class="mini-list">`;

    ev.builds.forEach((b) => {
      const hexLabel = describeHex(b.hexId);
      html += `<p>• Built <strong>${b.description || "Unknown"}</strong> in <strong>${hexLabel}</strong></p>`;
    });

    html += `</div>`;
  }

  // -------------------------
  // MOVEMENTS (only if present)
  // -------------------------
  if (ev.movements && ev.movements.length > 0) {
    html += `<h4 class="subsection-title">Movements</h4><div class="mini-list">`;

    ev.movements.forEach((m) => {
      html += `<p>• <strong>${m.unitName || "Unit"}</strong> moved from <strong>${m.from || "—"}</strong> to <strong>${m.to || "—"}</strong>`;
      if (m.notes) html += ` — ${m.notes}`;
      html += `</p>`;
    });

    html += `</div>`;
  }

  // -------------------------
  // OFFENSIVE ACTION
  // -------------------------
  const oa = ev.offensiveAction;
  const hasOffense =
    oa && (oa.type || oa.target || oa.notes);

  if (hasOffense) {
    html += `<h4 class="subsection-title">Offensive Action</h4><div class="mini-list">`;

    if (oa.type)
      html += `<p><strong>Type:</strong> ${oa.type}</p>`;
    if (oa.target)
      html += `<p><strong>Target:</strong> ${oa.target}</p>`;
    if (oa.notes)
      html += `<p><strong>Notes:</strong> ${oa.notes}</p>`;

    html += `</div>`;
  }

  bodyEl.innerHTML = html;
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
    typeCell.textContent = ev.type || "—";

    const buildsCell = document.createElement("td");
    buildsCell.textContent = ev.builds?.length || "";

    const movesCell = document.createElement("td");
    movesCell.textContent = ev.movements?.length || "";

    const offenseCell = document.createElement("td");
    offenseCell.textContent =
      ev.offensiveAction?.type ? "1" : "";

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
    delBtn.addEventListener("click", () => deleteEvent(ev.id));

    tbody.appendChild(row);
  });

  const hdr = $("eventDateSortHeader");
  if (hdr) {
    hdr.textContent = eventSortDirection === "asc" ? "Date ▲" : "Date ▼";
  }
}
