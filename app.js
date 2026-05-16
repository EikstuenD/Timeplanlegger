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
  assistants: ["Mari", "Ola"],
  classes: ["8A", "8B", "8C"],
  subjects: ["Matematikk", "Norsk", "Engelsk", "Samfunnsfag"],
  rooms: ["201", "202", "Gymsal", "Kjøkken"],
  lessons: []
};

let state = normalizeState(loadState());
let editingLessonId = null;

function loadState() {
  const saved = localStorage.getItem("enkel-timeplanlegger");
  if (!saved) return structuredClone(defaultData);

  try {
    return JSON.parse(saved);
  } catch {
    return structuredClone(defaultData);
  }
}

function normalizeState(data) {
  const normalized = {
    teachers: Array.isArray(data.teachers) ? data.teachers : [],
    assistants: Array.isArray(data.assistants) ? data.assistants : [],
    classes: Array.isArray(data.classes) ? data.classes : [],
    subjects: Array.isArray(data.subjects) ? data.subjects : [],
    rooms: Array.isArray(data.rooms) ? data.rooms : [],
    lessons: Array.isArray(data.lessons) ? data.lessons : []
  };

  normalized.lessons = normalized.lessons.map(lesson => ({
    ...lesson,
    teachers: Array.isArray(lesson.teachers)
      ? lesson.teachers
      : lesson.teacher
        ? [lesson.teacher]
        : [],
    assistants: Array.isArray(lesson.assistants) ? lesson.assistants : []
  }));

  return normalized;
}

function saveState() {
  localStorage.setItem("enkel-timeplanlegger", JSON.stringify(state));
}

function byId(id) {
  return document.getElementById(id);
}

function selectedValues(selectId) {
  return Array.from(byId(selectId).selectedOptions).map(option => option.value);
}

function setSelectedValues(selectId, values) {
  const valueSet = new Set(values || []);
  Array.from(byId(selectId).options).forEach(option => {
    option.selected = valueSet.has(option.value);
  });
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
    if (type === "teachers") return lesson.teachers.includes(value);
    if (type === "assistants") return lesson.assistants.includes(value);
    if (type === "classes") return lesson.className === value;
    if (type === "subjects") return lesson.subject === value;
    if (type === "rooms") return lesson.room === value;
    return false;
  });

  if (isUsed) {
    alert("Dette elementet er i bruk i en time. Slett eller endre timen først.");
    return;
  }

  state[type] = state[type].filter(item => item !== value);
  saveState();
  render();
}

function fillSelect(selectId, values, placeholder = null) {
  const select = byId(selectId);
  const oldValues = Array.from(select.selectedOptions || []).map(option => option.value);
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

  if (select.multiple) {
    setSelectedValues(selectId, oldValues);
  } else if (values.includes(oldValue)) {
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

function renderPalette(containerId, type, cssClass) {
  const container = byId(containerId);
  container.innerHTML = "";

  state[type].forEach(value => {
    const item = document.createElement("div");
    item.className = `draggable-item ${cssClass}`;
    item.draggable = true;
    item.textContent = value;
    item.title = "Dra inn i kalenderen";
    item.addEventListener("dragstart", event => {
      event.dataTransfer.setData("text/plain", JSON.stringify({
        kind: cssClass,
        value
      }));
      event.dataTransfer.effectAllowed = "copy";
    });
    container.appendChild(item);
  });
}

function getDragData(event) {
  try {
    return JSON.parse(event.dataTransfer.getData("text/plain"));
  } catch {
    return null;
  }
}

function allowDrop(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
}

function addDropHighlight(event) {
  event.currentTarget.classList.add("drop-target");
}

function removeDropHighlight(event) {
  event.currentTarget.classList.remove("drop-target");
}

function handleCellDrop(event, day, period) {
  event.preventDefault();
  event.currentTarget.classList.remove("drop-target");

  const data = getDragData(event);
  if (!data) return;

  if (data.kind === "subject") {
    createLessonFromSubject(data.value, day, period);
    return;
  }

  alert("Dra først et fag inn i en tom rute. Deretter kan du dra lærere og fagarbeidere inn på timen.");
}

function handleLessonDrop(event, lessonId) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove("drop-target");

  const data = getDragData(event);
  if (!data) return;

  const lesson = state.lessons.find(item => item.id === lessonId);
  if (!lesson) return;

  if (data.kind === "subject") {
    lesson.subject = data.value;
  }

  if (data.kind === "teacher" && !lesson.teachers.includes(data.value)) {
    lesson.teachers.push(data.value);
  }

  if (data.kind === "assistant" && !lesson.assistants.includes(data.value)) {
    lesson.assistants.push(data.value);
  }

  const messages = conflictMessages(lesson);

  if (messages.length > 0) {
    const proceed = confirm(
      "Det finnes kollisjoner:\n\n" +
      messages.join("\n") +
      "\n\nVil du lagre likevel?"
    );

    if (!proceed) {
      if (data.kind === "teacher") {
        lesson.teachers = lesson.teachers.filter(name => name !== data.value);
      }
      if (data.kind === "assistant") {
        lesson.assistants = lesson.assistants.filter(name => name !== data.value);
      }
      renderWarnings(messages);
      render();
      return;
    }
  }

  saveState();
  render();
}

function createLessonFromSubject(subject, day, period) {
  const activeClass = byId("activeClassSelect").value;
  const activeRoom = byId("activeRoomSelect").value;

  if (!activeClass) {
    alert("Velg klasse først.");
    return;
  }

  if (!activeRoom) {
    alert("Velg rom først.");
    return;
  }

  const lesson = {
    id: crypto.randomUUID(),
    day,
    period,
    className: activeClass,
    subject,
    teachers: [],
    assistants: [],
    room: activeRoom
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

function conflictMessages(newLesson) {
  const conflicts = state.lessons.filter(lesson =>
    lesson.id !== newLesson.id &&
    lesson.day === newLesson.day &&
    lesson.period === newLesson.period
  );

  const messages = [];

  const busyTeachers = newLesson.teachers.filter(name =>
    conflicts.some(lesson => lesson.teachers.includes(name))
  );

  const busyAssistants = newLesson.assistants.filter(name =>
    conflicts.some(lesson => lesson.assistants.includes(name))
  );

  if (busyTeachers.length > 0) {
    messages.push(`Lærer(e) allerede opptatt: ${busyTeachers.join(", ")}.`);
  }

  if (busyAssistants.length > 0) {
    messages.push(`Fagarbeider/voksen allerede opptatt: ${busyAssistants.join(", ")}.`);
  }

  if (conflicts.some(lesson => lesson.className === newLesson.className)) {
    messages.push(`Klasse ${newLesson.className} har allerede en time ${newLesson.day}, ${newLesson.period}.`);
  }

  if (conflicts.some(lesson => lesson.room === newLesson.room)) {
    messages.push(`Rom ${newLesson.room} er allerede i bruk ${newLesson.day}, ${newLesson.period}.`);
  }

  return messages;
}

function openEditDialog(id) {
  const lesson = state.lessons.find(item => item.id === id);
  if (!lesson) return;

  editingLessonId = id;

  byId("editDaySelect").value = lesson.day;
  byId("editPeriodSelect").value = lesson.period;
  byId("editClassSelect").value = lesson.className;
  byId("editSubjectSelect").value = lesson.subject;
  setSelectedValues("editTeachersSelect", lesson.teachers);
  setSelectedValues("editAssistantsSelect", lesson.assistants);
  byId("editRoomSelect").value = lesson.room;

  byId("editDialog").showModal();
}

function closeEditDialog() {
  editingLessonId = null;
  byId("editDialog").close();
}

function saveEdit(event) {
  event.preventDefault();

  const lesson = {
    id: editingLessonId,
    day: byId("editDaySelect").value,
    period: byId("editPeriodSelect").value,
    className: byId("editClassSelect").value,
    subject: byId("editSubjectSelect").value,
    teachers: selectedValues("editTeachersSelect"),
    assistants: selectedValues("editAssistantsSelect"),
    room: byId("editRoomSelect").value
  };

  const messages = conflictMessages(lesson);

  if (messages.length > 0) {
    const proceed = confirm(
      "Det finnes kollisjoner:\n\n" +
      messages.join("\n") +
      "\n\nVil du lagre likevel?"
    );

    if (!proceed) {
      renderWarnings(messages);
      return;
    }
  }

  state.lessons = state.lessons.map(existing =>
    existing.id === editingLessonId ? lesson : existing
  );

  saveState();
  closeEditDialog();
  render();
}

function deleteEditingLesson() {
  if (!editingLessonId) return;

  const lesson = state.lessons.find(item => item.id === editingLessonId);
  const text = lesson
    ? `${lesson.subject} for ${lesson.className} ${lesson.day}, ${lesson.period}`
    : "denne timen";

  const ok = confirm(`Vil du slette ${text}?`);
  if (!ok) return;

  state.lessons = state.lessons.filter(lesson => lesson.id !== editingLessonId);
  saveState();
  closeEditDialog();
  render();
}

function deleteLesson(id) {
  const lesson = state.lessons.find(item => item.id === id);
  const text = lesson
    ? `${lesson.subject} for ${lesson.className} ${lesson.day}, ${lesson.period}`
    : "denne timen";

  const ok = confirm(`Vil du slette ${text}?`);
  if (!ok) return;

  state.lessons = state.lessons.filter(lesson => lesson.id !== id);
  saveState();
  render();
}

function removeAdultFromLesson(id, type, value) {
  const lesson = state.lessons.find(item => item.id === id);
  if (!lesson) return;

  if (type === "teacher") {
    lesson.teachers = lesson.teachers.filter(name => name !== value);
  }

  if (type === "assistant") {
    lesson.assistants = lesson.assistants.filter(name => name !== value);
  }

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
  if (viewType === "assistant") values = state.assistants;
  if (viewType === "room") values = state.rooms;

  fillSelect("viewValue", values);
}

function isLessonInView(lesson, viewType, viewValue) {
  if (!viewValue) return true;
  if (viewType === "teacher") return lesson.teachers.includes(viewValue);
  if (viewType === "assistant") return lesson.assistants.includes(viewValue);
  return lesson[viewType] === viewValue;
}

function renderFreeAdults() {
  const day = byId("freeDaySelect").value;
  const period = byId("freePeriodSelect").value;
  const result = byId("freeAdultsResult");

  const busyLessons = state.lessons.filter(lesson =>
    lesson.day === day && lesson.period === period
  );

  const busyTeachers = new Set(busyLessons.flatMap(lesson => lesson.teachers));
  const busyAssistants = new Set(busyLessons.flatMap(lesson => lesson.assistants));

  const freeTeachers = state.teachers.filter(name => !busyTeachers.has(name));
  const freeAssistants = state.assistants.filter(name => !busyAssistants.has(name));

  result.innerHTML = "";

  result.appendChild(createFreeGroup({
    title: "Lærere",
    free: freeTeachers,
    total: state.teachers.length,
    busyDetails: busyLessons.flatMap(lesson =>
      lesson.teachers.map(name => `${name}: ${lesson.subject} med ${lesson.className} på rom ${lesson.room}`)
    ),
    day,
    period
  }));

  result.appendChild(createFreeGroup({
    title: "Fagarbeidere / voksne",
    free: freeAssistants,
    total: state.assistants.length,
    busyDetails: busyLessons.flatMap(lesson =>
      lesson.assistants.map(name => `${name}: ${lesson.subject} med ${lesson.className} på rom ${lesson.room}`)
    ),
    day,
    period
  }));
}

function createFreeGroup({ title, free, total, busyDetails, day, period }) {
  const group = document.createElement("div");
  group.className = "free-group";

  const heading = document.createElement("h3");
  heading.textContent = title;
  group.appendChild(heading);

  const summary = document.createElement("p");
  summary.className = "summary-line";
  summary.textContent = `${free.length} av ${total} er ledige ${day}, ${period}.`;
  group.appendChild(summary);

  const freeTitle = document.createElement("strong");
  freeTitle.textContent = "Ledige:";
  group.appendChild(freeTitle);

  const pillList = document.createElement("div");
  pillList.className = "teacher-pill-list";

  if (free.length === 0) {
    const empty = document.createElement("p");
    empty.className = "summary-line";
    empty.textContent = "Ingen ledige.";
    pillList.appendChild(empty);
  } else {
    free.forEach(name => {
      const pill = document.createElement("span");
      pill.className = "teacher-pill";
      pill.textContent = name;
      pillList.appendChild(pill);
    });
  }

  group.appendChild(pillList);

  const busyTitle = document.createElement("strong");
  busyTitle.textContent = "Opptatte:";
  group.appendChild(busyTitle);

  if (busyDetails.length === 0) {
    const noneBusy = document.createElement("p");
    noneBusy.className = "summary-line";
    noneBusy.textContent = "Ingen er satt opp denne timen.";
    group.appendChild(noneBusy);
  } else {
    const busyList = document.createElement("ul");
    busyList.className = "busy-list";
    busyDetails.forEach(detail => {
      const li = document.createElement("li");
      li.textContent = detail;
      busyList.appendChild(li);
    });
    group.appendChild(busyList);
  }

  return group;
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
      cell.addEventListener("dragover", allowDrop);
      cell.addEventListener("dragenter", addDropHighlight);
      cell.addEventListener("dragleave", removeDropHighlight);
      cell.addEventListener("drop", event => handleCellDrop(event, day, period));

      const lessons = state.lessons.filter(lesson =>
        lesson.day === day &&
        lesson.period === period &&
        isLessonInView(lesson, viewType, viewValue)
      );

      lessons.forEach(lesson => {
        cell.appendChild(createLessonCard(lesson));
      });

      grid.appendChild(cell);
    });
  });
}

function createLessonCard(lesson) {
  const card = document.createElement("div");
  card.className = "lesson-card";
  card.title = "Klikk for å redigere. Dra lærer/fagarbeider/fag hit for å legge til eller endre.";
  card.addEventListener("click", () => openEditDialog(lesson.id));
  card.addEventListener("dragover", allowDrop);
  card.addEventListener("dragenter", addDropHighlight);
  card.addEventListener("dragleave", removeDropHighlight);
  card.addEventListener("drop", event => handleLessonDrop(event, lesson.id));

  const title = document.createElement("strong");
  title.textContent = lesson.subject;
  card.appendChild(title);

  addSmallLine(card, `Klasse: ${lesson.className}`);
  addSmallLine(card, `Lærer(e): ${listText(lesson.teachers)}`);
  addSmallLine(card, `Fagarbeider/voksen: ${listText(lesson.assistants)}`);
  addSmallLine(card, `Rom: ${lesson.room}`);

  const actions = document.createElement("div");
  actions.className = "lesson-actions";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.textContent = "Rediger";
  editBtn.addEventListener("click", event => {
    event.stopPropagation();
    openEditDialog(lesson.id);
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.textContent = "Slett";
  deleteBtn.className = "delete-lesson";
  deleteBtn.addEventListener("click", event => {
    event.stopPropagation();
    deleteLesson(lesson.id);
  });

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);
  card.appendChild(actions);

  return card;
}

function addSmallLine(parent, text) {
  const small = document.createElement("small");
  small.textContent = text;
  parent.appendChild(small);
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
      const imported = normalizeState(JSON.parse(reader.result));

      const required = ["teachers", "assistants", "classes", "subjects", "rooms", "lessons"];
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

function listText(items) {
  return items && items.length > 0 ? items.join(", ") : "Ingen";
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
  renderChipList("classesList", "classes");
  renderChipList("roomsList", "rooms");

  renderPalette("subjectsPalette", "subjects", "subject");
  renderPalette("teachersPalette", "teachers", "teacher");
  renderPalette("assistantsPalette", "assistants", "assistant");

  fillSelect("activeClassSelect", state.classes, "Velg klasse");
  fillSelect("activeRoomSelect", state.rooms, "Velg rom");

  fillSelect("freeDaySelect", DAYS);
  fillSelect("freePeriodSelect", PERIODS);

  fillSelect("editDaySelect", DAYS);
  fillSelect("editPeriodSelect", PERIODS);
  fillSelect("editClassSelect", state.classes);
  fillSelect("editSubjectSelect", state.subjects);
  fillSelect("editTeachersSelect", state.teachers);
  fillSelect("editAssistantsSelect", state.assistants);
  fillSelect("editRoomSelect", state.rooms);

  renderViewValue();
  renderWarnings();
  renderFreeAdults();
  renderSchedule();
}

byId("addClassBtn").addEventListener("click", () => addItem("classes", "classInput"));
byId("addRoomBtn").addEventListener("click", () => addItem("rooms", "roomInput"));
byId("addSubjectBtn").addEventListener("click", () => addItem("subjects", "subjectInput"));
byId("addTeacherBtn").addEventListener("click", () => addItem("teachers", "teacherInput"));
byId("addAssistantBtn").addEventListener("click", () => addItem("assistants", "assistantInput"));

byId("viewType").addEventListener("change", () => {
  renderViewValue();
  renderSchedule();
});
byId("viewValue").addEventListener("change", renderSchedule);

byId("freeDaySelect").addEventListener("change", renderFreeAdults);
byId("freePeriodSelect").addEventListener("change", renderFreeAdults);

byId("editForm").addEventListener("submit", saveEdit);
byId("deleteEditBtn").addEventListener("click", deleteEditingLesson);
byId("cancelEditBtn").addEventListener("click", closeEditDialog);

byId("exportBtn").addEventListener("click", exportJson);
byId("importInput").addEventListener("change", event => {
  const file = event.target.files[0];
  if (file) importJson(file);
});
byId("resetBtn").addEventListener("click", resetAll);

saveState();
render();
