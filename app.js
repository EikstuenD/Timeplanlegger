const DAYS = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag"];
const PERIODS = [
  "1. time",
  "2. time",
  "3. time",
  "4. time",
  "5. time",
  "6. time",
  "7. time",
  "8. time"
];

const defaultData = {
  teachers: ["Kristian", "Anne", "Mohammed"],
  classes: ["8A", "8B", "8C"],
  subjects: ["Matematikk", "Norsk", "Engelsk", "Samfunnsfag"],
  rooms: ["201", "202", "Gymsal", "Kjøkken"],
  lessons: []
};

let state = loadState();

function loadState() {
  const saved = localStorage.getItem("enkel-timeplanlegger");
  if (!saved) return structuredClone(defaultData);

  try {
    return JSON.parse(saved);
  } catch {
    return structuredClone(defaultData);
  }
}

function saveState() {
  localStorage.setItem("enkel-timeplanlegger", JSON.stringify(state));
}

function byId(id) {
  return document.getElementById(id);
}

function addItem(type, inputId) {
  const input = byId(inputId);
  const value = input.value.trim();

  if (!value) return;
  if (state[type].includes(value)) {
    alert(`${value} finnes allerede.`);
    return;
  }

  state[type].push(value);
  input.value = "";
  saveState();
  render();
}

function removeItem(type, value) {
  const isUsed = state.lessons.some(lesson => {
    if (type === "teachers") return lesson.teacher === value;
    if (type === "classes") return lesson.className === value;
    if (type === "subjects") return lesson.subject === value;
    if (type === "rooms") return lesson.room === value;
    return false;
  });

  if (isUsed) {
    alert("Dette elementet er i bruk i en time. Slett timen først.");
    return;
  }

  state[type] = state[type].filter(item => item !== value);
  saveState();
  render();
}

function fillSelect(selectId, values, placeholder = null) {
  const select = byId(selectId);
  const oldValue = select.value;

  select.innerHTML = "";

  if (placeholder) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = placeholder;
    select.appendChild(opt);
  }

  values.forEach(value => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    select.appendChild(opt);
  });

  if (values.includes(oldValue)) {
    select.value = oldValue;
  }
}

function renderChipList(listId, type) {
  const ul = byId(listId);
  ul.innerHTML = "";

  state[type].forEach(value => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${escapeHtml(value)}</span>`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "×";
    btn.title = `Slett ${value}`;
    btn.addEventListener("click", () => removeItem(type, value));
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

function conflictMessages(newLesson) {
  const conflicts = state.lessons.filter(lesson =>
    lesson.day === newLesson.day && lesson.period === newLesson.period
  );

  const messages = [];

  if (conflicts.some(lesson => lesson.teacher === newLesson.teacher)) {
    messages.push(`Lærer ${newLesson.teacher} er allerede opptatt ${newLesson.day}, ${newLesson.period}.`);
  }

  if (conflicts.some(lesson => lesson.className === newLesson.className)) {
    messages.push(`Klasse ${newLesson.className} har allerede en time ${newLesson.day}, ${newLesson.period}.`);
  }

  if (conflicts.some(lesson => lesson.room === newLesson.room)) {
    messages.push(`Rom ${newLesson.room} er allerede i bruk ${newLesson.day}, ${newLesson.period}.`);
  }

  return messages;
}

function addLesson(event) {
  event.preventDefault();

  const lesson = {
    id: crypto.randomUUID(),
    day: byId("daySelect").value,
    period: byId("periodSelect").value,
    className: byId("classSelect").value,
    subject: byId("subjectSelect").value,
    teacher: byId("teacherSelect").value,
    room: byId("roomSelect").value
  };

  const messages = conflictMessages(lesson);

  if (messages.length > 0) {
    const proceed = confirm(
      "Det finnes kollisjoner:\n\n" +
      messages.join("\n") +
      "\n\nVil du legge til timen likevel?"
    );

    if (!proceed) {
      renderWarnings(messages);
      return;
    }
  }

  state.lessons.push(lesson);
  saveState();
  render();
}

function deleteLesson(id) {
  state.lessons = state.lessons.filter(lesson => lesson.id !== id);
  saveState();
  render();
}

function renderWarnings(messages = []) {
  const box = byId("warnings");
  box.innerHTML = "";

  messages.forEach(message => {
    const div = document.createElement("div");
    div.className = "warning";
    div.textContent = message;
    box.appendChild(div);
  });
}

function renderViewValue() {
  const viewType = byId("viewType").value;
  let values = [];

  if (viewType === "className") values = state.classes;
  if (viewType === "teacher") values = state.teachers;
  if (viewType === "room") values = state.rooms;

  fillSelect("viewValue", values);
}

function renderSchedule() {
  const grid = byId("scheduleGrid");
  const viewType = byId("viewType").value;
  const viewValue = byId("viewValue").value;

  grid.innerHTML = "";

  const emptyHead = document.createElement("div");
  emptyHead.className = "grid-cell grid-head";
  emptyHead.textContent = "Tid";
  grid.appendChild(emptyHead);

  DAYS.forEach(day => {
    const head = document.createElement("div");
    head.className = "grid-cell grid-head";
    head.textContent = day;
    grid.appendChild(head);
  });

  PERIODS.forEach(period => {
    const periodCell = document.createElement("div");
    periodCell.className = "grid-cell period-cell";
    periodCell.textContent = period;
    grid.appendChild(periodCell);

    DAYS.forEach(day => {
      const cell = document.createElement("div");
      cell.className = "grid-cell";

      const lessons = state.lessons.filter(lesson =>
        lesson.day === day &&
        lesson.period === period &&
        (!viewValue || lesson[viewType] === viewValue)
      );

      lessons.forEach(lesson => {
        const card = document.createElement("div");
        card.className = "lesson-card";
        card.innerHTML = `
          <strong>${escapeHtml(lesson.subject)}</strong>
          <small>Klasse: ${escapeHtml(lesson.className)}</small>
          <small>Lærer: ${escapeHtml(lesson.teacher)}</small>
          <small>Rom: ${escapeHtml(lesson.room)}</small>
        `;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "Slett";
        btn.addEventListener("click", () => deleteLesson(lesson.id));
        card.appendChild(btn);

        cell.appendChild(card);
      });

      grid.appendChild(cell);
    });
  });
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "timeplan-data.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importJson(file) {
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);

      const required = ["teachers", "classes", "subjects", "rooms", "lessons"];
      const isValid = required.every(key => Array.isArray(imported[key]));

      if (!isValid) {
        alert("Filen har ikke riktig format.");
        return;
      }

      state = imported;
      saveState();
      render();
    } catch {
      alert("Kunne ikke lese JSON-filen.");
    }
  };

  reader.readAsText(file);
}

function resetAll() {
  const ok = confirm("Er du sikker på at du vil slette alt og starte på nytt?");
  if (!ok) return;

  state = structuredClone(defaultData);
  saveState();
  render();
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render() {
  renderChipList("teachersList", "teachers");
  renderChipList("classesList", "classes");
  renderChipList("subjectsList", "subjects");
  renderChipList("roomsList", "rooms");

  fillSelect("daySelect", DAYS);
  fillSelect("periodSelect", PERIODS);
  fillSelect("classSelect", state.classes, "Velg klasse");
  fillSelect("subjectSelect", state.subjects, "Velg fag");
  fillSelect("teacherSelect", state.teachers, "Velg lærer");
  fillSelect("roomSelect", state.rooms, "Velg rom");

  renderViewValue();
  renderWarnings();
  renderSchedule();
}

byId("addTeacherBtn").addEventListener("click", () => addItem("teachers", "teacherInput"));
byId("addClassBtn").addEventListener("click", () => addItem("classes", "classInput"));
byId("addSubjectBtn").addEventListener("click", () => addItem("subjects", "subjectInput"));
byId("addRoomBtn").addEventListener("click", () => addItem("rooms", "roomInput"));
byId("lessonForm").addEventListener("submit", addLesson);
byId("viewType").addEventListener("change", () => {
  renderViewValue();
  renderSchedule();
});
byId("viewValue").addEventListener("change", renderSchedule);
byId("exportBtn").addEventListener("click", exportJson);
byId("importInput").addEventListener("change", event => {
  const file = event.target.files[0];
  if (file) importJson(file);
});
byId("resetBtn").addEventListener("click", resetAll);

render();
