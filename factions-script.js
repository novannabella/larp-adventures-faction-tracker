
document.getElementById('addHexBtn').onclick = () => {
  const name = hexName.value, num = hexNum.value, terr = hexTerrain.value;
  const struct = hexStructInput.value, notes = hexResNotes.value;
  const li = document.createElement('li');
  li.textContent = `${name} (${num}) - ${terr} - ${struct} - ${notes}`;
  hexList.appendChild(li);
};

document.getElementById('addEventBtn').onclick = () => {
  const name = eventName.value, date = eventDate.value, type = eventType.value;
  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${name}</td><td>${date}</td><td>${type}</td><td><button>Details</button></td>`;
  eventList.appendChild(tr);
};
