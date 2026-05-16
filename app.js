// Fikset versjon: robust tidsoppsett, eldre lokal lagring og tryggere knapper.
const DAYS = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag"];
const DEFAULT_PERIODS = [
  { id: "p1", label: "1. time", start: "08:30", end: "09:15", breakAfter: 10 },
  { id: "p2", label: "2. time", start: "09:25", end: "10:10", breakAfter: 10 },
  { id: "p3", label: "3. time", start: "10:20", end: "11:05", breakAfter: 30 },
  { id: "p4", label: "4. time", start: "11:35", end: "12:20", breakAfter: 10 },
  { id: "p5", label: "5. time", start: "12:30", end: "13:15", breakAfter: 10 },
  { id: "p6", label: "6. time", start: "13:25", end: "14:10", breakAfter: 10 },
  { id: "p7", label: "7. time", start: "14:20", end: "15:05", breakAfter: 0 }
];

const SUBJECT_COLORS = [
  { bg: "#e0f2fe", border: "#38bdf8" },
  { bg: "#dcfce7", border: "#22c55e" },
  { bg: "#fef3c7", border: "#f59e0b" },
  { bg: "#fce7f3", border: "#ec4899" },
  { bg: "#ede9fe", border: "#8b5cf6" },
  { bg: "#ccfbf1", border: "#14b8a6" },
  { bg: "#fee2e2", border: "#ef4444" },
  { bg: "#e0e7ff", border: "#6366f1" },
  { bg: "#f3e8ff", border: "#a855f7" },
  { bg: "#ecfccb", border: "#84cc16" },
  { bg: "#ffedd5", border: "#f97316" },
  { bg: "#f1f5f9", border: "#64748b" }
];

const defaultData = {
  teachers: ["Kristian", "Anne", "Mohammed"],
  assistants: ["Mari", "Ola"],
  classes: ["8A", "8B", "8C"],
  subjects: ["Matematikk", "Norsk", "Engelsk", "Samfunnsfag"],
  rooms: ["201", "202", "Gymsal", "Kjøkken"],
  periods: structuredClone(DEFAULT_PERIODS),
  lessons: [],
  absences: []
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
    periods: normalizePeriods(data.periods),
    lessons: Array.isArray(data.lessons) ? data.lessons : [],
    absences: Array.isArray(data.absences) ? data.absences : []
  };

  normalized.lessons = normalized.lessons.map(lesson => ({
    ...lesson,
    teachers: Array.isArray(lesson.teachers)
      ? lesson.teachers
      : lesson.teacher
        ? [lesson.teacher]
        : [],
    assistants: Array.isArray(lesson.assistants) ? lesson.assistants : [],
    substitutes: Array.isArray(lesson.substitutes) ? lesson.substitutes : [],
    note: lesson.note || ""
  }));

  const normalizedPeriodLabels = normalized.periods.map(period => period.label);

  normalized.absences = normalized.absences.map(absence => ({
    id: absence.id || crypto.randomUUID(),
    date: absence.date || "",
    day: absence.day || DAYS[0],
    person: absence.person || "",
    role: absence.role || "teacher",
    periods: Array.isArray(absence.periods) ? absence.periods : normalizedPeriodLabels
  }));

  return normalized;
}

function normalizePeriods(periods) {
  if (!Array.isArray(periods) || periods.length === 0) {
    return structuredClone(DEFAULT_PERIODS);
  }

  if (typeof periods[0] === "string") {
    return periods.map((label, index) => ({
      id: crypto.randomUUID(),
      label: label || `${index + 1}. time`,
      start: "",
      end: "",
      breakAfter: index === periods.length - 1 ? 0 : 10
    }));
  }

  const normalized = periods
    .filter(period => period && typeof period === "object")
    .map((period, index) => ({
      id: period.id || crypto.randomUUID(),
      label: period.label || `${index + 1}. time`,
      start: period.start || "",
      end: period.end || "",
      breakAfter: Number.isFinite(Number(period.breakAfter)) ? Number(period.breakAfter) : 0
    }));

  return normalized.length > 0 ? normalized : structuredClone(DEFAULT_PERIODS);
}

function periodLabels() {
  if (!state || !Array.isArray(state.periods)) {
    return DEFAULT_PERIODS.map(period => period.label);
  }
  return state.periods.map(period => period.label);
}

function periodByLabel(label) {
  return state.periods.find(period => period.label === label);
}

function periodIndex(label) {
  return periodLabels().indexOf(label);
}

function periodDisplay(label) {
  const period = periodByLabel(label);
  if (!period) return label;

  const timeText = period.start && period.end ? `${period.start}–${period.end}` : "";
  const breakText = Number(period.breakAfter) > 0 ? `Pause ${period.breakAfter} min` : "";

  if (timeText && breakText) return `${label}\n${timeText}\n${breakText}`;
  if (timeText) return `${label}\n${timeText}`;
  return label;
}

function fillPeriodSelect(selectId) {
  const select = byId(selectId);
  if (!select) return;

  const oldValues = Array.from(select.selectedOptions || []).map(option => option.value);
  const oldValue = select.value;

  select.innerHTML = "";

  state.periods.forEach(period => {
    const opt = document.createElement("option");
    opt.value = period.label;
    opt.textContent = period.start && period.end
      ? `${period.label} (${period.start}–${period.end})`
      : period.label;
    select.appendChild(opt);
  });

  if (select.multiple) {
    setSelectedValues(selectId, oldValues.filter(value => periodLabels().includes(value)));
    return;
  }

  if (periodLabels().includes(oldValue)) {
    select.value = oldValue;
  } else if (state.periods.length > 0) {
    select.value = state.periods[0].label;
  }
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

function subjectColor(subject) {
  const index = Math.max(0, state.subjects.indexOf(subject));
  return SUBJECT_COLORS[index % SUBJECT_COLORS.length];
}

function applySubjectColor(element, subject) {
  const color = subjectColor(subject);
  element.style.setProperty("--subject-color", color.bg);
  element.style.setProperty("--subject-border-color", color.border);
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
    if (type === "teachers") return lesson.teachers.includes(value) || lesson.substitutes.includes(value);
    if (type === "assistants") return lesson.assistants.includes(value) || lesson.substitutes.includes(value);
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
  if (!select) return;

  const safeValues = Array.isArray(values) ? values.filter(value => value !== undefined && value !== null) : [];
  const oldValues = Array.from(select.selectedOptions || []).map(option => option.value);
  const oldValue = select.value;

  select.innerHTML = "";

  if (placeholder) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = placeholder;
    select.appendChild(opt);
  }

  safeValues.forEach(value => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    select.appendChild(opt);
  });

  if (select.multiple) {
    const validOldValues = oldValues.filter(value => safeValues.includes(value));
    setSelectedValues(selectId, validOldValues);
    return;
  }

  if (safeValues.includes(oldValue)) {
    select.value = oldValue;
    return;
  }

  if (placeholder) {
    select.value = "";
    return;
  }

  if (safeValues.length > 0) {
    select.value = safeValues[0];
    select.selectedIndex = 0;
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

    if (cssClass === "subject") applySubjectColor(item, value);
    if (isAbsent(value, null, null)) item.classList.add("absent");

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
    substitutes: [],
    room: activeRoom,
    note: ""
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
    conflicts.some(lesson => lesson.teachers.includes(name) || lesson.substitutes.includes(name))
  );

  const busyAssistants = newLesson.assistants.filter(name =>
    conflicts.some(lesson => lesson.assistants.includes(name) || lesson.substitutes.includes(name))
  );

  const busySubs = newLesson.substitutes.filter(name =>
    conflicts.some(lesson =>
      lesson.teachers.includes(name) ||
      lesson.assistants.includes(name) ||
      lesson.substitutes.includes(name)
    )
  );

  if (busyTeachers.length > 0) messages.push(`Lærer(e) allerede opptatt: ${busyTeachers.join(", ")}.`);
  if (busyAssistants.length > 0) messages.push(`Fagarbeider/voksen allerede opptatt: ${busyAssistants.join(", ")}.`);
  if (busySubs.length > 0) messages.push(`Vikar(er) allerede opptatt: ${busySubs.join(", ")}.`);

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

  fillEditSelects();

  byId("editDaySelect").value = lesson.day;
  byId("editPeriodSelect").value = lesson.period;
  byId("editClassSelect").value = lesson.className;
  byId("editSubjectSelect").value = lesson.subject;
  setSelectedValues("editTeachersSelect", lesson.teachers);
  setSelectedValues("editAssistantsSelect", lesson.assistants);
  setSelectedValues("editSubstitutesSelect", lesson.substitutes);
  byId("editRoomSelect").value = lesson.room;
  byId("editNoteInput").value = lesson.note || "";
  byId("editSuggestions").innerHTML = "";

  byId("editDialog").showModal();
}

function fillEditSelects() {
  fillSelect("editDaySelect", DAYS);
  fillPeriodSelect("editPeriodSelect");
  fillSelect("editClassSelect", state.classes);
  fillSelect("editSubjectSelect", state.subjects);
  fillSelect("editTeachersSelect", state.teachers);
  fillSelect("editAssistantsSelect", state.assistants);
  fillSelect("editSubstitutesSelect", allAdults());
  fillSelect("editRoomSelect", state.rooms);
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
    substitutes: selectedValues("editSubstitutesSelect"),
    room: byId("editRoomSelect").value,
    note: byId("editNoteInput").value.trim()
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
  if (viewType === "teacher") return lesson.teachers.includes(viewValue) || lesson.substitutes.includes(viewValue);
  if (viewType === "assistant") return lesson.assistants.includes(viewValue) || lesson.substitutes.includes(viewValue);
  return lesson[viewType] === viewValue;
}

function allAdults() {
  return [...state.teachers, ...state.assistants];
}

function absencePeopleForSelectedRole() {
  const roleSelect = byId("absenceRoleSelect");
  const role = roleSelect ? roleSelect.value : "teacher";
  return role === "assistant" ? state.assistants : state.teachers;
}

function adultRole(name) {
  if (state.teachers.includes(name)) return "teacher";
  if (state.assistants.includes(name)) return "assistant";
  return "adult";
}

function isAbsent(person, day = null, period = null) {
  return state.absences.some(absence =>
    absence.person === person &&
    (!day || absence.day === day) &&
    (!period || absence.periods.includes(period))
  );
}

function isAbsentForLesson(person, lesson) {
  return isAbsent(person, lesson.day, lesson.period);
}

function lessonNeedsSub(lesson) {
  const absentTeachers = lesson.teachers.filter(name => isAbsentForLesson(name, lesson));
  const absentAssistants = lesson.assistants.filter(name => isAbsentForLesson(name, lesson));
  return absentTeachers.length > 0 || absentAssistants.length > 0;
}

function lessonHasSub(lesson) {
  return lesson.substitutes && lesson.substitutes.length > 0;
}

function absentPeopleForLesson(lesson) {
  return [...lesson.teachers, ...lesson.assistants].filter(name => isAbsentForLesson(name, lesson));
}

function getBusyAdults(day, period, excludeLessonId = null) {
  const lessons = state.lessons.filter(lesson =>
    lesson.id !== excludeLessonId &&
    lesson.day === day &&
    lesson.period === period
  );

  return new Set(lessons.flatMap(lesson => [
    ...lesson.teachers,
    ...lesson.assistants,
    ...lesson.substitutes
  ]));
}

function freeAdultsFor(day, period, excludeLessonId = null) {
  const busy = getBusyAdults(day, period, excludeLessonId);
  return allAdults().filter(name => !busy.has(name) && !isAbsent(name, day, period));
}

function teacherLoad(name, day) {
  const teaching = state.lessons.filter(lesson => lesson.day === day && lesson.teachers.includes(name)).length;
  const subbing = state.lessons.filter(lesson => lesson.day === day && lesson.substitutes.includes(name)).length;
  const busyPeriods = new Set(
    state.lessons
      .filter(lesson => lesson.day === day && (
        lesson.teachers.includes(name) ||
        lesson.assistants.includes(name) ||
        lesson.substitutes.includes(name)
      ))
      .map(lesson => lesson.period)
  );
  return {
    teaching,
    subbing,
    busy: busyPeriods.size,
    free: periodLabels().length - busyPeriods.size
  };
}

function scoreSubstitute(name, lesson) {
  const load = teacherLoad(name, lesson.day);
  let score = 0;

  if (state.teachers.includes(name)) score += 10;
  if (state.assistants.includes(name)) score += 5;

  const sameClass = state.lessons.some(item =>
    item.day === lesson.day &&
    item.className === lesson.className &&
    (item.teachers.includes(name) || item.assistants.includes(name))
  );
  if (sameClass) score += 4;

  const sameSubject = state.lessons.some(item =>
    item.subject === lesson.subject &&
    (item.teachers.includes(name) || item.assistants.includes(name))
  );
  if (sameSubject) score += 3;

  score += load.free;
  score -= load.subbing * 2;
  score -= load.teaching;

  return score;
}

function substituteSuggestions(lesson) {
  return freeAdultsFor(lesson.day, lesson.period, lesson.id)
    .map(name => ({
      name,
      role: adultRole(name),
      load: teacherLoad(name, lesson.day),
      score: scoreSubstitute(name, lesson)
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function renderFreeAdults() {
  const day = byId("freeDaySelect").value;
  const period = byId("freePeriodSelect").value;
  const result = byId("freeAdultsResult");

  const busyLessons = state.lessons.filter(lesson =>
    lesson.day === day && lesson.period === period
  );

  const busyTeachers = new Set(busyLessons.flatMap(lesson => [...lesson.teachers, ...lesson.substitutes.filter(name => state.teachers.includes(name))]));
  const busyAssistants = new Set(busyLessons.flatMap(lesson => [...lesson.assistants, ...lesson.substitutes.filter(name => state.assistants.includes(name))]));

  const freeTeachers = state.teachers.filter(name => !busyTeachers.has(name) && !isAbsent(name, day, period));
  const freeAssistants = state.assistants.filter(name => !busyAssistants.has(name) && !isAbsent(name, day, period));

  result.innerHTML = "";

  result.appendChild(createFreeGroup({
    title: "Lærere",
    free: freeTeachers,
    total: state.teachers.length,
    busyDetails: busyLessons.flatMap(lesson =>
      [...lesson.teachers, ...lesson.substitutes.filter(name => state.teachers.includes(name))]
        .map(name => `${name}: ${lesson.subject} med ${lesson.className} på rom ${lesson.room}`)
    ),
    day,
    period
  }));

  result.appendChild(createFreeGroup({
    title: "Fagarbeidere / voksne",
    free: freeAssistants,
    total: state.assistants.length,
    busyDetails: busyLessons.flatMap(lesson =>
      [...lesson.assistants, ...lesson.substitutes.filter(name => state.assistants.includes(name))]
        .map(name => `${name}: ${lesson.subject} med ${lesson.className} på rom ${lesson.room}`)
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
  summary.textContent = `${free.length} av ${total} er ledige ${day}, ${period}. Fravær er ikke regnet som ledig.`;
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

function renderRoomOverview() {
  const grid = byId("roomOverviewGrid");
  const room = byId("roomOverviewSelect").value;

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

  periodLabels().forEach(period => {
    const periodCell = document.createElement("div");
    periodCell.className = "grid-cell period-cell";
    periodCell.textContent = periodDisplay(period);
    grid.appendChild(periodCell);

    DAYS.forEach(day => {
      const cell = document.createElement("div");
      cell.className = "grid-cell";

      const lessons = state.lessons.filter(lesson =>
        lesson.room === room &&
        lesson.day === day &&
        lesson.period === period
      );

      lessons.forEach(lesson => {
        cell.appendChild(createLessonCard(lesson, { compact: true }));
      });

      grid.appendChild(cell);
    });
  });
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

  periodLabels().forEach(period => {
    const periodCell = document.createElement("div");
    periodCell.className = "grid-cell period-cell";
    periodCell.textContent = periodDisplay(period);
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

function createLessonCard(lesson, options = {}) {
  const card = document.createElement("div");
  card.className = "lesson-card";
  if (lessonNeedsSub(lesson)) card.classList.add("needs-sub");
  if (lessonHasSub(lesson)) card.classList.add("has-sub");

  applySubjectColor(card, lesson.subject);

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

  if (!options.compact) {
    addSmallLine(card, `Fagarbeider/voksen: ${listText(lesson.assistants)}`);
    addSmallLine(card, `Vikar: ${listText(lesson.substitutes)}`);
    addSmallLine(card, `Rom: ${lesson.room}`);
  } else {
    if (lesson.substitutes.length > 0) addSmallLine(card, `Vikar: ${listText(lesson.substitutes)}`);
    if (lesson.assistants.length > 0) addSmallLine(card, `Voksen: ${listText(lesson.assistants)}`);
  }

  if (lesson.note) addSmallLine(card, `Notat: ${lesson.note}`);

  if (lessonNeedsSub(lesson)) {
    const badge = document.createElement("span");
    badge.className = "badge danger";
    badge.textContent = "Trenger vikar";
    card.appendChild(badge);
  } else if (lessonHasSub(lesson)) {
    const badge = document.createElement("span");
    badge.className = "badge success";
    badge.textContent = "Vikar satt";
    card.appendChild(badge);
  }

  const actions = document.createElement("div");
  actions.className = "lesson-actions";

  const findBtn = document.createElement("button");
  findBtn.type = "button";
  findBtn.textContent = "Finn vikar";
  findBtn.addEventListener("click", event => {
    event.stopPropagation();
    openEditDialog(lesson.id);
    showEditSuggestions();
  });

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

  actions.appendChild(findBtn);
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

function addAbsence() {
  const absence = {
    id: crypto.randomUUID(),
    date: byId("absenceDateInput").value,
    day: byId("absenceDaySelect").value,
    person: byId("absencePersonSelect").value,
    role: byId("absenceRoleSelect").value,
    periods: selectedValues("absencePeriodsSelect")
  };

  if (!absence.person) {
    alert("Velg person.");
    return;
  }

  if (absence.periods.length === 0) {
    absence.periods = [...periodLabels()];
  }

  state.absences.push(absence);
  saveState();
  render();
}

function deleteAbsence(id) {
  state.absences = state.absences.filter(absence => absence.id !== id);
  saveState();
  render();
}

function renderAbsences() {
  const list = byId("absenceList");
  list.innerHTML = "";

  if (state.absences.length === 0) {
    list.innerHTML = `<p class="summary-line">Ingen fravær registrert.</p>`;
    return;
  }

  state.absences.forEach(absence => {
    const card = document.createElement("div");
    card.className = "absence-card";
    card.innerHTML = `
      <strong>${escapeHtml(absence.person)}</strong>
      <p class="summary-line">${escapeHtml(absence.day)} ${absence.date ? "– " + escapeHtml(absence.date) : ""}</p>
      <p class="summary-line">Timer: ${escapeHtml(absence.periods.join(", "))}</p>
      <p class="summary-line">Type: ${absence.role === "teacher" ? "Lærer" : "Fagarbeider/voksen"}</p>
    `;

    const actions = document.createElement("div");
    actions.className = "card-actions";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "danger";
    btn.textContent = "Fjern fravær";
    btn.addEventListener("click", () => deleteAbsence(absence.id));
    actions.appendChild(btn);
    card.appendChild(actions);
    list.appendChild(card);
  });
}

function substituteNeeds(day) {
  return state.lessons
    .filter(lesson => lesson.day === day && lessonNeedsSub(lesson))
    .sort((a, b) => periodIndex(a.period) - periodIndex(b.period));
}

function renderSubstituteNeeds() {
  const day = byId("substituteDaySelect").value;
  const container = byId("substituteNeeds");
  const needs = substituteNeeds(day);

  container.innerHTML = "";

  if (needs.length === 0) {
    container.innerHTML = `<p class="summary-line">Ingen vikarbehov registrert for ${escapeHtml(day)}.</p>`;
    return;
  }

  needs.forEach(lesson => {
    const absent = absentPeopleForLesson(lesson);
    const suggestions = substituteSuggestions(lesson).slice(0, 5);
    const card = document.createElement("div");
    card.className = lessonHasSub(lesson) ? "need-card has-sub" : "need-card needs-sub";

    card.innerHTML = `
      <strong>${escapeHtml(lesson.period)} – ${escapeHtml(lesson.className)} – ${escapeHtml(lesson.subject)}</strong>
      <p class="summary-line">Rom: ${escapeHtml(lesson.room)}</p>
      <p class="summary-line">Borte: ${escapeHtml(absent.join(", "))}</p>
      <p class="summary-line">Vikar: ${escapeHtml(listText(lesson.substitutes))}</p>
      ${lesson.note ? `<p class="summary-line">Notat: ${escapeHtml(lesson.note)}</p>` : ""}
      <p><strong>Forslag:</strong> ${suggestions.length ? escapeHtml(suggestions.map(s => `${s.name} (${s.load.free} ledige timer)`).join(", ")) : "Ingen ledige forslag"}</p>
    `;

    const actions = document.createElement("div");
    actions.className = "card-actions";

    suggestions.slice(0, 3).forEach(suggestion => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = `Sett ${suggestion.name}`;
      btn.addEventListener("click", () => assignSubstitute(lesson.id, suggestion.name));
      actions.appendChild(btn);
    });

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "secondary";
    editBtn.textContent = "Rediger time";
    editBtn.addEventListener("click", () => openEditDialog(lesson.id));
    actions.appendChild(editBtn);

    card.appendChild(actions);
    container.appendChild(card);
  });
}

function assignSubstitute(lessonId, name) {
  const lesson = state.lessons.find(item => item.id === lessonId);
  if (!lesson) return;

  if (!lesson.substitutes.includes(name)) {
    lesson.substitutes.push(name);
  }

  saveState();
  render();
}

function showEditSuggestions() {
  if (!editingLessonId) return;
  const lesson = state.lessons.find(item => item.id === editingLessonId);
  if (!lesson) return;

  const box = byId("editSuggestions");
  const suggestions = substituteSuggestions(lesson);

  if (suggestions.length === 0) {
    box.innerHTML = `<strong>Vikarforslag</strong><p class="summary-line">Ingen ledige voksne funnet i denne timen.</p>`;
    return;
  }

  box.innerHTML = `<strong>Vikarforslag</strong><p class="summary-line">Rangert etter ledighet, belastning, samme klasse og samme fag.</p>`;

  const wrap = document.createElement("div");
  wrap.className = "teacher-pill-list";

  suggestions.slice(0, 8).forEach(suggestion => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "secondary";
    btn.textContent = `${suggestion.name} (${suggestion.load.free} ledige)`;
    btn.addEventListener("click", () => {
      const current = selectedValues("editSubstitutesSelect");
      if (!current.includes(suggestion.name)) current.push(suggestion.name);
      setSelectedValues("editSubstitutesSelect", current);
    });
    wrap.appendChild(btn);
  });

  box.appendChild(wrap);
}

function renderWorkload() {
  const day = byId("workloadDaySelect").value;
  const container = byId("workloadTable");
  const rows = allAdults().map(name => {
    const load = teacherLoad(name, day);
    const absent = isAbsent(name, day, null);
    return { name, role: adultRole(name), load, absent };
  });

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Navn</th>
            <th>Rolle</th>
            <th>Status</th>
            <th>Undervisning</th>
            <th>Vikartimer</th>
            <th>Ledige timer</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              <td>${escapeHtml(row.name)}</td>
              <td>${row.role === "teacher" ? "Lærer" : "Fagarbeider/voksen"}</td>
              <td>${row.absent ? "Fravær" : "Tilgjengelig"}</td>
              <td>${row.load.teaching}</td>
              <td>${row.load.subbing}</td>
              <td>${row.absent ? "-" : row.load.free}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderHoles() {
  const day = byId("holesDaySelect").value;
  const period = byId("holesPeriodSelect").value;
  const container = byId("holesResult");
  const free = freeAdultsFor(day, period);

  if (free.length === 0) {
    container.innerHTML = `<p class="summary-line">Ingen ledige voksne ${day}, ${period}.</p>`;
    return;
  }

  const rows = free.map(name => {
    const prev = nearestLessonFor(name, day, period, -1);
    const next = nearestLessonFor(name, day, period, 1);
    return { name, prev, next, load: teacherLoad(name, day) };
  });

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ledig voksen</th>
            <th>Før</th>
            <th>Etter</th>
            <th>Ledige timer denne dagen</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              <td>${escapeHtml(row.name)}</td>
              <td>${row.prev ? escapeHtml(`${row.prev.period}: ${row.prev.subject} ${row.prev.className}`) : "Ingen tidligere time"}</td>
              <td>${row.next ? escapeHtml(`${row.next.period}: ${row.next.subject} ${row.next.className}`) : "Ingen senere time"}</td>
              <td>${row.load.free}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function nearestLessonFor(name, day, period, direction) {
  const index = periodIndex(period);
  const candidates = state.lessons
    .filter(lesson => lesson.day === day && (
      lesson.teachers.includes(name) ||
      lesson.assistants.includes(name) ||
      lesson.substitutes.includes(name)
    ))
    .filter(lesson => direction < 0
      ? periodIndex(lesson.period) < index
      : periodIndex(lesson.period) > index
    )
    .sort((a, b) => direction < 0
      ? periodIndex(b.period) - periodIndex(a.period)
      : periodIndex(a.period) - periodIndex(b.period)
    );

  return candidates[0] || null;
}

function runControl() {
  const issues = [];

  state.lessons.forEach(lesson => {
    if (!lesson.subject) issues.push({ type: "Mangler fag", lesson });
    if (!lesson.className) issues.push({ type: "Mangler klasse", lesson });
    if (!lesson.room) issues.push({ type: "Mangler rom", lesson });
    if (!lesson.teachers || lesson.teachers.length === 0) issues.push({ type: "Mangler lærer", lesson });
  });

  DAYS.forEach(day => {
    periodLabels().forEach(period => {
      const lessons = state.lessons.filter(lesson => lesson.day === day && lesson.period === period);
      findDuplicates(lessons.map(l => l.className).filter(Boolean)).forEach(value => {
        issues.push({ type: `Dobbeltbooket klasse: ${value}`, day, period });
      });
      findDuplicates(lessons.map(l => l.room).filter(Boolean)).forEach(value => {
        issues.push({ type: `Dobbeltbooket rom: ${value}`, day, period });
      });
      findDuplicates(lessons.flatMap(l => l.teachers)).forEach(value => {
        issues.push({ type: `Dobbeltbooket lærer: ${value}`, day, period });
      });
      findDuplicates(lessons.flatMap(l => l.assistants)).forEach(value => {
        issues.push({ type: `Dobbeltbooket fagarbeider/voksen: ${value}`, day, period });
      });
      findDuplicates(lessons.flatMap(l => l.substitutes)).forEach(value => {
        issues.push({ type: `Dobbeltbooket vikar: ${value}`, day, period });
      });
    });
  });

  const container = byId("controlResults");

  if (issues.length === 0) {
    container.innerHTML = `<p class="summary-line">Ingen feil funnet.</p>`;
    return;
  }

  container.innerHTML = "";
  issues.forEach(issue => {
    const card = document.createElement("div");
    card.className = "issue-card";
    if (issue.lesson) {
      card.innerHTML = `
        <strong>${escapeHtml(issue.type)}</strong>
        <p class="summary-line">${escapeHtml(issue.lesson.day)} ${escapeHtml(issue.lesson.period)} – ${escapeHtml(issue.lesson.className || "Ukjent klasse")} – ${escapeHtml(issue.lesson.subject || "Ukjent fag")}</p>
      `;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Rediger";
      btn.addEventListener("click", () => openEditDialog(issue.lesson.id));
      card.appendChild(btn);
    } else {
      card.innerHTML = `<strong>${escapeHtml(issue.type)}</strong><p class="summary-line">${escapeHtml(issue.day)}, ${escapeHtml(issue.period)}</p>`;
    }
    container.appendChild(card);
  });
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  values.forEach(value => {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  });
  return [...duplicates];
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
      const required = ["teachers", "assistants", "classes", "subjects", "rooms", "lessons", "absences"];
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

function importCsv(file) {
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const rows = parseCsv(reader.result);
      if (rows.length < 2) {
        alert("CSV-filen ser tom ut.");
        return;
      }

      const headers = rows[0].map(h => h.trim().toLowerCase());
      const idx = name => headers.indexOf(name);

      const required = ["dag", "time", "klasse", "fag", "rom"];
      const missing = required.filter(name => idx(name) === -1);
      if (missing.length > 0) {
        alert(`CSV mangler kolonner: ${missing.join(", ")}`);
        return;
      }

      rows.slice(1).forEach(row => {
        const day = row[idx("dag")]?.trim();
        const period = row[idx("time")]?.trim();
        const className = row[idx("klasse")]?.trim();
        const subject = row[idx("fag")]?.trim();
        const room = row[idx("rom")]?.trim();
        const teachers = splitPeople(row[idx("lærere")] || row[idx("laerere")] || "");
        const assistants = splitPeople(row[idx("fagarbeidere")] || "");
        const note = row[idx("notat")]?.trim() || "";

        if (!day || !period || !className || !subject || !room) return;

        addUnique(state.classes, className);
        addUnique(state.subjects, subject);
        addUnique(state.rooms, room);
        teachers.forEach(name => addUnique(state.teachers, name));
        assistants.forEach(name => addUnique(state.assistants, name));

        state.lessons.push({
          id: crypto.randomUUID(),
          day,
          period,
          className,
          subject,
          room,
          teachers,
          assistants,
          substitutes: [],
          note
        });
      });

      saveState();
      render();
      alert("CSV importert.");
    } catch {
      alert("Kunne ikke lese CSV-filen.");
    }
  };

  reader.readAsText(file);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter(r => r.some(c => c.trim()));
}

function splitPeople(text) {
  return String(text)
    .split(";")
    .map(value => value.trim())
    .filter(Boolean);
}

function addUnique(list, value) {
  if (value && !list.includes(value)) list.push(value);
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

function todayDateString() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function renderAbsencePersonSelect() {
  fillSelect("absencePersonSelect", absencePeopleForSelectedRole(), "Velg person");
}

function renderPeriodEditor() {
  const container = byId("periodEditor");
  if (!container) return;

  container.innerHTML = "";

  state.periods.forEach((period, index) => {
    const row = document.createElement("div");
    row.className = "period-row";

    row.innerHTML = `
      <label>
        Navn på økt
        <input data-period-field="label" data-period-index="${index}" value="${escapeHtml(period.label)}" />
      </label>
      <label>
        Start
        <input type="time" data-period-field="start" data-period-index="${index}" value="${escapeHtml(period.start)}" />
      </label>
      <label>
        Slutt
        <input type="time" data-period-field="end" data-period-index="${index}" value="${escapeHtml(period.end)}" />
      </label>
      <label>
        Pause etterpå
        <input type="number" min="0" step="5" data-period-field="breakAfter" data-period-index="${index}" value="${escapeHtml(period.breakAfter)}" />
      </label>
    `;

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "danger";
    deleteBtn.textContent = "Slett";
    deleteBtn.addEventListener("click", () => deletePeriod(index));
    row.appendChild(deleteBtn);

    container.appendChild(row);
  });

  container.querySelectorAll("input[data-period-field]").forEach(input => {
    input.addEventListener("change", event => updatePeriodField(event.target));
  });
}

function updatePeriodField(input) {
  const index = Number(input.dataset.periodIndex);
  const field = input.dataset.periodField;
  const oldLabel = state.periods[index]?.label;

  if (!state.periods[index]) return;

  let value = input.value.trim();

  if (field === "label") {
    if (!value) {
      alert("Økten må ha et navn.");
      input.value = oldLabel;
      return;
    }

    const duplicate = state.periods.some((period, i) => i !== index && period.label === value);
    if (duplicate) {
      alert("En annen økt har allerede dette navnet.");
      input.value = oldLabel;
      return;
    }

    // Flytt eksisterende timer/fravær til nytt navn dersom økta får nytt navn.
    state.lessons.forEach(lesson => {
      if (lesson.period === oldLabel) lesson.period = value;
    });
    state.absences.forEach(absence => {
      absence.periods = absence.periods.map(period => period === oldLabel ? value : period);
    });
  }

  if (field === "breakAfter") {
    value = Math.max(0, Number(value) || 0);
  }

  state.periods[index][field] = value;
  saveState();
  render();
}

function addPeriod() {
  let nextNumber = state.periods.length + 1;
  let label = `${nextNumber}. time`;

  while (state.periods.some(period => period.label === label)) {
    nextNumber++;
    label = `${nextNumber}. time`;
  }

  state.periods.push({
    id: crypto.randomUUID(),
    label,
    start: "",
    end: "",
    breakAfter: 0
  });
  saveState();
  render();
}

function deletePeriod(index) {
  const period = state.periods[index];
  if (!period) return;

  const used = state.lessons.some(lesson => lesson.period === period.label) ||
    state.absences.some(absence => absence.periods.includes(period.label));

  if (used) {
    const ok = confirm("Denne økta er i bruk i timeplan eller fravær. Hvis du sletter den, fjernes timer og fravær i denne økta. Fortsette?");
    if (!ok) return;

    state.lessons = state.lessons.filter(lesson => lesson.period !== period.label);
    state.absences.forEach(absence => {
      absence.periods = absence.periods.filter(label => label !== period.label);
    });
  }

  state.periods.splice(index, 1);
  saveState();
  render();
}

function copyDayLessons() {
  const fromDay = byId("copyFromDaySelect").value;
  const toDays = selectedValues("copyToDaysSelect").filter(day => day !== fromDay);
  const mode = byId("copyModeSelect").value;

  if (!fromDay || toDays.length === 0) {
    alert("Velg dag du vil kopiere fra, og minst én dag du vil kopiere til.");
    return;
  }

  const sourceLessons = state.lessons.filter(lesson => lesson.day === fromDay);

  if (sourceLessons.length === 0) {
    alert("Det finnes ingen timer på dagen du vil kopiere fra.");
    return;
  }

  let copied = 0;
  let skipped = [];

  toDays.forEach(day => {
    const hasExisting = state.lessons.some(lesson => lesson.day === day);

    if (mode === "skip" && hasExisting) {
      skipped.push(day);
      return;
    }

    if (mode === "replace") {
      state.lessons = state.lessons.filter(lesson => lesson.day !== day);
    }

    sourceLessons.forEach(lesson => {
      state.lessons.push({
        ...structuredClone(lesson),
        id: crypto.randomUUID(),
        day
      });
      copied++;
    });
  });

  saveState();
  render();

  const skippedText = skipped.length ? ` Hoppet over: ${skipped.join(", ")}.` : "";
  alert(`Kopierte ${copied} timer.${skippedText}`);
}

function render() {
  state = normalizeState(state);

  renderChipList("classesList", "classes");
  renderChipList("roomsList", "rooms");

  renderPalette("subjectsPalette", "subjects", "subject");
  renderPalette("teachersPalette", "teachers", "teacher");
  renderPalette("assistantsPalette", "assistants", "assistant");

  fillSelect("activeClassSelect", state.classes, "Velg klasse");
  fillSelect("activeRoomSelect", state.rooms, "Velg rom");

  renderPeriodEditor();
  fillSelect("copyFromDaySelect", DAYS);
  fillSelect("copyToDaysSelect", DAYS);

  fillSelect("freeDaySelect", DAYS);
  fillPeriodSelect("freePeriodSelect");

  fillSelect("roomOverviewSelect", state.rooms, "Velg rom");

  fillSelect("absenceDaySelect", DAYS);
  fillSelect("absencePersonSelect", absencePeopleForSelectedRole(), "Velg person");
  fillPeriodSelect("absencePeriodsSelect");

  fillSelect("substituteDaySelect", DAYS);
  fillSelect("workloadDaySelect", DAYS);
  fillSelect("holesDaySelect", DAYS);
  fillPeriodSelect("holesPeriodSelect");

  renderViewValue();
  renderWarnings();
  renderFreeAdults();
  renderRoomOverview();
  renderSchedule();
  renderAbsences();
  renderSubstituteNeeds();
  renderWorkload();
  renderHoles();
}

function on(id, eventName, handler) {
  const element = byId(id);
  if (element) {
    element.addEventListener(eventName, handler);
  }
}

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(item => item.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(item => item.classList.remove("active"));
    tab.classList.add("active");
    byId(tab.dataset.tab).classList.add("active");
  });
});

on("addClassBtn", "click", () => addItem("classes", "classInput"));
on("addRoomBtn", "click", () => addItem("rooms", "roomInput"));
on("addSubjectBtn", "click", () => addItem("subjects", "subjectInput"));
on("addTeacherBtn", "click", () => addItem("teachers", "teacherInput"));
on("addAssistantBtn", "click", () => addItem("assistants", "assistantInput"));

on("viewType", "change", () => {
  renderViewValue();
  renderSchedule();
});
on("viewValue", "change", renderSchedule);

on("freeDaySelect", "change", renderFreeAdults);
on("freePeriodSelect", "change", renderFreeAdults);
on("roomOverviewSelect", "change", renderRoomOverview);

if (byId("absenceDateInput")) {
  byId("absenceDateInput").value = todayDateString();
}
on("addAbsenceBtn", "click", addAbsence);
on("absenceRoleSelect", "change", () => {
  renderAbsencePersonSelect();
});
on("absenceDaySelect", "change", renderSubstituteNeeds);
on("substituteDaySelect", "change", renderSubstituteNeeds);
on("workloadDaySelect", "change", renderWorkload);
on("holesDaySelect", "change", renderHoles);
on("holesPeriodSelect", "change", renderHoles);

on("editForm", "submit", saveEdit);
on("deleteEditBtn", "click", deleteEditingLesson);
on("cancelEditBtn", "click", closeEditDialog);
on("findSubBtn", "click", showEditSuggestions);

on("runControlBtn", "click", runControl);

on("addPeriodBtn", "click", addPeriod);
on("copyDayBtn", "click", copyDayLessons);

on("exportBtn", "click", exportJson);
on("importInput", "change", event => {
  const file = event.target.files[0];
  if (file) importJson(file);
});
on("csvInput", "change", event => {
  const file = event.target.files[0];
  if (file) importCsv(file);
});
on("printBtn", "click", () => {
  document.querySelectorAll(".tab").forEach(item => item.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(item => item.classList.remove("active"));
  const absenceTab = document.querySelector('[data-tab="absenceTab"]');
  if (absenceTab) absenceTab.classList.add("active");
  const absencePanel = byId("absenceTab");
  if (absencePanel) absencePanel.classList.add("active");
  window.print();
});
on("resetBtn", "click", resetAll);

try {
  saveState();
  render();
} catch (error) {
  console.error("Kunne ikke starte appen:", error);
  alert("Det oppstod en feil ved oppstart. Prøv å eksportere data hvis mulig, eller nullstill lokal lagring for denne siden.");
}
