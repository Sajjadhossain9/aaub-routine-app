(() => {
  "use strict";

  const DATA = window.ROUTINE_DATA;
  const STORE_KEY = "flightplan-state-v1";
  const DAY_MS = 86400000;
  const PREP_STATES = ["not-started", "preparing", "prepared"];
  const PREP_LABELS = { "not-started": "Not started", preparing: "Preparing", prepared: "Prepared" };
  const REPORT_STATES = { "not-started": "Not started", writing: "Writing", completed: "Completed" };
  const EXAM_STATES = { "not-started": "Not started", revising: "Revising", ready: "Ready" };

  const defaultState = () => ({
    prep: {},
    taskEdits: {},
    customTasks: [],
    assessmentEdits: {},
    customExams: [],
    deletedExams: [],
    customClasses: [],
    cancelledClasses: [],
    customHolidays: {},
    notified: [],
    settings: { theme: "dark", morningTime: "07:00", examTime: "20:00" }
  });

  let state = loadState();
  let selectedDate = clampDate(todayISO());
  let weekAnchor = selectedDate;
  let taskFilter = "upcoming";
  let examFilter = "upcoming";
  let dialogContext = null;
  let toastTimer;

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY));
      const base = defaultState();
      if (!saved || typeof saved !== "object") return base;
      return { ...base, ...saved, settings: { ...base.settings, ...(saved.settings || {}) } };
    } catch {
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }

  function localDate(iso) {
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(year, month - 1, day, 12);
  }

  function toISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function todayISO() { return toISO(new Date()); }

  function addDays(iso, amount) {
    const date = localDate(iso);
    date.setDate(date.getDate() + amount);
    return toISO(date);
  }

  function daysBetween(from, to) {
    return Math.round((localDate(to) - localDate(from)) / DAY_MS);
  }

  function clampDate(iso) {
    if (iso < DATA.semester.start) return DATA.semester.start;
    if (iso > DATA.semester.end) return DATA.semester.end;
    return iso;
  }

  function formatDate(iso, options = { weekday: "long", day: "numeric", month: "long", year: "numeric" }) {
    return new Intl.DateTimeFormat("en-GB", options).format(localDate(iso));
  }

  function shortDate(iso) {
    return formatDate(iso, { day: "numeric", month: "short" });
  }

  function timeLabel(time) {
    const [hour, minute] = time.split(":").map(Number);
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(2026, 0, 1, hour, minute));
  }

  function dateTime(iso, time) {
    const [year, month, day] = iso.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    return new Date(year, month - 1, day, hour, minute);
  }

  function uid(prefix = "item") {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function weekInfo(iso) {
    if (iso >= "2026-09-27" && iso <= "2026-10-03") return { number: 7, label: "ADJUSTMENT" };
    let number = Math.floor(daysBetween(DATA.semester.start, iso) / 7) + 1;
    if (iso >= "2026-10-04") number -= 1;
    return { number: Math.max(1, Math.min(14, number)), label: `WEEK ${Math.max(1, Math.min(14, number))}` };
  }

  function sundayOf(iso) {
    const date = localDate(iso);
    date.setDate(date.getDate() - date.getDay());
    return toISO(date);
  }

  function course(code) {
    return DATA.courses[code] || { name: "Custom class", type: "theory", teacher: "", room: "", color: "#4fc3ff" };
  }

  function eventId(date, item) {
    return `${date}-${item.code}-${item.start}`.replace(/[^a-zA-Z0-9-]/g, "");
  }

  function officialSchedule(iso) {
    if (DATA.holidays[iso] || state.customHolidays[iso]) return [];
    let items;
    if (Object.prototype.hasOwnProperty.call(DATA.overrides, iso)) {
      items = DATA.overrides[iso].map(item => ({ ...item }));
    } else if (iso >= DATA.semester.start && iso <= DATA.semester.end) {
      items = (DATA.weekly[localDate(iso).getDay()] || []).map(item => ({ ...item }));
      if (DATA.wednesdayLabs.includes(iso)) items.push({ code: "AVE 4504", start: "12:30", end: "15:25" });
    } else {
      items = [];
    }

    return items.map(item => ({
      ...item,
      id: eventId(iso, item),
      date: iso,
      source: "official",
      ...course(item.code)
    })).filter(item => !state.cancelledClasses.includes(item.id));
  }

  function getSchedule(iso) {
    const custom = state.customClasses.filter(item => item.date === iso).map(item => ({
      ...item,
      source: "custom",
      ...course(item.code),
      name: item.name || course(item.code).name,
      teacher: item.teacher || course(item.code).teacher,
      room: item.room || course(item.code).room,
      color: item.color || course(item.code).color,
      type: item.type || course(item.code).type
    }));
    return [...officialSchedule(iso), ...custom]
      .map(item => ({ ...item, assessment: getExams().find(exam => exam.date === iso && exam.code === item.code) }))
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  function holidayName(iso) {
    return state.customHolidays[iso] || DATA.holidays[iso] || "";
  }

  function getAllSessionals() {
    const results = [];
    for (let date = DATA.semester.start; date <= DATA.semester.end; date = addDays(date, 1)) {
      getSchedule(date).filter(item => item.type === "sessional").forEach(item => results.push(item));
    }
    return results;
  }

  function getTasks() {
    const generated = getAllSessionals().map(item => {
      const id = `report-${item.id}`;
      const edit = state.taskEdits[id] || {};
      return {
        id,
        linkedClass: item.id,
        code: item.code,
        title: `Lab report · ${item.name}`,
        dueDate: item.date,
        status: "not-started",
        note: "",
        generated: true,
        ...edit
      };
    });
    return [...generated, ...state.customTasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  function getExams() {
    const official = DATA.assessments
      .filter(item => !state.deletedExams.includes(item.id))
      .map(item => ({ status: "not-started", syllabus: "", official: true, ...item, ...(state.assessmentEdits[item.id] || {}) }));
    return [...official, ...state.customExams].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  }

  function examName(exam) {
    return exam.code ? course(exam.code).name : (exam.subject || "Assessment");
  }

  function renderToday() {
    const info = weekInfo(selectedDate);
    const pickedToday = selectedDate === todayISO();
    $("#selectedDayName").textContent = formatDate(selectedDate, { weekday: "long" });
    $("#selectedDateLabel").textContent = formatDate(selectedDate, { day: "numeric", month: "long", year: "numeric" });
    $("#weekChip").textContent = info.label;
    $("#dateButtonText").textContent = pickedToday ? "Today" : shortDate(selectedDate);
    $("#datePicker").value = selectedDate;

    const schedule = getSchedule(selectedDate);
    const holiday = holidayName(selectedDate);
    const note = DATA.notes[selectedDate];
    const container = $("#daySchedule");

    if (holiday && !schedule.length) {
      container.innerHTML = `<article class="holiday-card"><div class="holiday-symbol">✦</div><p class="eyebrow">GOVERNMENT HOLIDAY</p><h3>${escapeHTML(holiday)}</h3><p>No scheduled classes. Use the day to get ahead.</p></article>`;
    } else if (!schedule.length) {
      container.innerHTML = emptyState("No classes scheduled", selectedDate > DATA.semester.end || selectedDate < DATA.semester.start ? "This date is outside the published semester routine." : "A clear runway for revision, rest or project work.", "◌");
    } else {
      container.innerHTML = (note ? `<div class="course-note">${escapeHTML(note)}</div>` : "") + schedule.map(classCard).join("");
    }
    bindDayCardActions();
    renderNextClass();
  }

  function classCard(item) {
    const prep = state.prep[item.id] || "not-started";
    const isCurrent = isClassCurrent(item);
    const lab = item.type === "sessional";
    return `<article class="class-card${isCurrent ? " current" : ""}" style="--course:${escapeHTML(item.color)}">
      <div class="time-block">${escapeHTML(timeLabel(item.start))}<small>${escapeHTML(timeLabel(item.end))}</small></div>
      <div>
        <div class="course-head">
          <div><div class="course-code">${escapeHTML(item.code)}${item.assessment ? ` · ${escapeHTML(item.assessment.type)}` : ""}</div><h3 class="course-name">${escapeHTML(item.name)}</h3></div>
          <button class="kebab" data-edit-class="${escapeHTML(item.id)}" aria-label="Edit or reschedule class">•••</button>
        </div>
        <div class="course-meta"><span>⌖ ${escapeHTML(item.room || "Room not set")}</span><span>${lab ? "◈ Sessional" : "◇ Theory"}</span></div>
        ${item.note ? `<p class="course-note">${escapeHTML(item.note)}</p>` : ""}
      </div>
      <button class="status-button" data-prep-id="${escapeHTML(item.id)}" data-state="${prep}" aria-label="Change preparation status"><span class="status-copy">${PREP_LABELS[prep]}</span><span>Tap to change</span>${lab ? `<span class="lab-link" data-open-report="report-${escapeHTML(item.id)}">Report</span>` : ""}</button>
    </article>`;
  }

  function isClassCurrent(item) {
    const now = new Date();
    if (item.date !== todayISO()) return false;
    return now >= dateTime(item.date, item.start) && now <= dateTime(item.date, item.end);
  }

  function bindDayCardActions() {
    $$('[data-prep-id]').forEach(button => button.addEventListener("click", event => {
      if (event.target.closest("[data-open-report]")) return;
      const id = button.dataset.prepId;
      const current = state.prep[id] || "not-started";
      state.prep[id] = PREP_STATES[(PREP_STATES.indexOf(current) + 1) % PREP_STATES.length];
      saveState();
      renderToday();
      showToast(`Preparation: ${PREP_LABELS[state.prep[id]]}`);
    }));
    $$('[data-open-report]').forEach(button => button.addEventListener("click", event => {
      event.stopPropagation();
      const task = getTasks().find(item => item.id === button.dataset.openReport);
      if (task) openTaskDialog(task);
    }));
    $$('[data-edit-class]').forEach(button => button.addEventListener("click", () => {
      const item = getSchedule(selectedDate).find(entry => entry.id === button.dataset.editClass);
      if (item) openClassDialog(item);
    }));
  }

  function renderNextClass() {
    const now = new Date();
    let next = null;
    for (let offset = 0; offset <= 14 && !next; offset += 1) {
      const date = addDays(todayISO(), offset);
      next = getSchedule(date).find(item => dateTime(date, item.end) > now);
    }
    const card = $("#nextClassCard");
    if (!next) { card.hidden = true; return; }
    card.hidden = false;
    $("#nextClassTitle").textContent = next.name;
    $("#nextClassMeta").textContent = `${next.code} · ${next.date === todayISO() ? "Today" : shortDate(next.date)} · ${timeLabel(next.start)}`;
    const minutes = Math.max(0, Math.round((dateTime(next.date, next.start) - now) / 60000));
    $("#nextClassCountdown").innerHTML = minutes <= 0 ? "IN<br>PROGRESS" : minutes < 60 ? `${minutes}<br>MIN` : minutes < 1440 ? `${Math.floor(minutes / 60)}H ${minutes % 60}M<br>TO GO` : `${Math.ceil(minutes / 1440)}<br>DAYS`;
  }

  function renderWeek() {
    const sunday = sundayOf(weekAnchor);
    const info = weekInfo(sunday);
    $("#weekLabel").textContent = info.label;
    const tabs = [];
    for (let index = 0; index < 15; index += 1) {
      const date = index < 8 ? addDays(DATA.semester.start, index * 7) : addDays(DATA.semester.start, index * 7);
      const label = index === 7 ? "Adj" : `W${index < 7 ? index + 1 : index}`;
      tabs.push(`<button class="week-tab${sundayOf(date) === sunday ? " active" : ""}" data-week-date="${date}">${label}</button>`);
    }
    $("#weekTabs").innerHTML = tabs.join("");
    $("#weekTabs").querySelector(".active")?.scrollIntoView?.({ inline: "center", block: "nearest" });
    $$('[data-week-date]').forEach(button => button.addEventListener("click", () => { weekAnchor = button.dataset.weekDate; renderWeek(); }));

    const days = [];
    for (let offset = 0; offset < 5; offset += 1) {
      const date = addDays(sunday, offset);
      const schedule = getSchedule(date);
      const holiday = holidayName(date);
      days.push(`<article class="week-day">
        <header class="week-day-header"><strong>${formatDate(date, { weekday: "long" })}</strong><span>${shortDate(date)}</span></header>
        ${holiday ? `<div class="week-entry"><time>HOLIDAY</time><div><strong>${escapeHTML(holiday)}</strong></div></div>` : schedule.length ? schedule.map(item => `<div class="week-entry"><time>${escapeHTML(item.start)}-${escapeHTML(item.end)}</time><div><strong style="color:${escapeHTML(item.color)}">${escapeHTML(item.code)}</strong><small>${escapeHTML(item.name)}</small></div></div>`).join("") : `<div class="week-entry"><time>—</time><div><small>No classes</small></div></div>`}
      </article>`);
    }
    $("#weekSchedule").innerHTML = days.join("");
  }

  function renderTasks() {
    const today = todayISO();
    const all = getTasks();
    const completed = all.filter(item => item.status === "completed").length;
    const urgent = all.filter(item => item.status !== "completed" && daysBetween(today, item.dueDate) >= 0 && daysBetween(today, item.dueDate) <= 7).length;
    $("#taskStats").innerHTML = `<div class="stat-card"><strong>${all.length}</strong><span>Total reports</span></div><div class="stat-card"><strong>${urgent}</strong><span>Due in 7 days</span></div><div class="stat-card"><strong>${completed}</strong><span>Completed</span></div>`;
    let tasks = all;
    if (taskFilter === "upcoming") tasks = tasks.filter(item => item.status !== "completed" && item.dueDate >= today);
    if (taskFilter === "completed") tasks = tasks.filter(item => item.status === "completed");
    const list = $("#taskList");
    list.innerHTML = tasks.length ? tasks.map(taskCard).join("") : emptyState("Nothing here", "Your report list is clear for this filter.", "✓");
    $$('[data-task-status]').forEach(select => select.addEventListener("change", () => updateTask(select.dataset.taskStatus, { status: select.value })));
    $$('[data-edit-task]').forEach(button => button.addEventListener("click", () => openTaskDialog(getTasks().find(item => item.id === button.dataset.editTask))));
  }

  function taskCard(task) {
    const diff = daysBetween(todayISO(), task.dueDate);
    const deadline = diff < 0 ? `${Math.abs(diff)}d overdue` : diff === 0 ? "Due today" : `${diff}d left`;
    const color = course(task.code).color;
    return `<article class="task-card" style="--course:${escapeHTML(color)}">
      <div class="card-top"><div><span class="type-pill">${escapeHTML(task.code || "REPORT")}</span><h3>${escapeHTML(task.title)}</h3><p>${escapeHTML(task.note || "Reminder: 7 days, 1 day and morning of class")}</p></div><div class="deadline${diff < 0 && task.status !== "completed" ? " overdue" : ""}"><strong>${escapeHTML(deadline)}</strong>${escapeHTML(shortDate(task.dueDate))}</div></div>
      <div class="progress-row"><select data-task-status="${escapeHTML(task.id)}" aria-label="Report status">${Object.entries(REPORT_STATES).map(([value, label]) => `<option value="${value}"${task.status === value ? " selected" : ""}>${label}</option>`).join("")}</select><div class="card-actions"><button class="mini-button" data-edit-task="${escapeHTML(task.id)}" aria-label="Edit report">✎</button></div></div>
    </article>`;
  }

  function updateTask(id, changes) {
    const customIndex = state.customTasks.findIndex(item => item.id === id);
    if (customIndex >= 0) state.customTasks[customIndex] = { ...state.customTasks[customIndex], ...changes };
    else state.taskEdits[id] = { ...(state.taskEdits[id] || {}), ...changes };
    saveState(); renderTasks(); renderReminders();
  }

  function renderExams() {
    const today = todayISO();
    const all = getExams();
    const official = all.filter(item => item.date >= today);
    const ready = official.filter(item => item.status === "ready").length;
    const percent = official.length ? Math.round((ready / official.length) * 100) : 100;
    $("#examReadiness").innerHTML = `<div class="readiness-line"><span>Upcoming exam readiness</span><strong>${ready}/${official.length} ready</strong></div><div class="progress-track"><span style="width:${percent}%"></span></div>`;
    let exams = all;
    if (examFilter === "upcoming") exams = exams.filter(item => item.date >= today);
    if (examFilter === "ct") exams = exams.filter(item => item.type.toUpperCase().startsWith("CT"));
    if (examFilter === "mid") exams = exams.filter(item => item.type.toUpperCase().includes("MID"));
    $("#examList").innerHTML = exams.length ? exams.map(examCard).join("") : emptyState("No assessments", "Add an exam when its date is announced.", "◎");
    $$('[data-exam-status]').forEach(select => select.addEventListener("change", () => updateExam(select.dataset.examStatus, { status: select.value })));
    $$('[data-edit-exam]').forEach(button => button.addEventListener("click", () => openExamDialog(getExams().find(item => item.id === button.dataset.editExam))));
  }

  function examCard(exam) {
    const diff = daysBetween(todayISO(), exam.date);
    const badge = diff < 0 ? "Finished" : diff === 0 ? "TODAY" : `${diff} DAYS`;
    return `<article class="exam-card" style="--course:${escapeHTML(course(exam.code).color)}">
      <div class="card-top"><div><span class="type-pill">${escapeHTML(exam.type)}</span><h3>${escapeHTML(exam.code || exam.subject || "Exam")} · ${escapeHTML(examName(exam))}</h3><p>${escapeHTML(exam.syllabus || "Syllabus/topics not added yet")}</p></div><div class="exam-badge${diff >= 0 && diff <= 3 ? " urgent" : ""}">${escapeHTML(badge)}<br><small>${escapeHTML(shortDate(exam.date))}</small></div></div>
      <div class="progress-row"><select data-exam-status="${escapeHTML(exam.id)}" aria-label="Exam readiness">${Object.entries(EXAM_STATES).map(([value, label]) => `<option value="${value}"${exam.status === value ? " selected" : ""}>${label}</option>`).join("")}</select><div class="card-actions"><button class="mini-button" data-edit-exam="${escapeHTML(exam.id)}" aria-label="Edit exam">✎</button></div></div>
    </article>`;
  }

  function updateExam(id, changes) {
    const customIndex = state.customExams.findIndex(item => item.id === id);
    if (customIndex >= 0) state.customExams[customIndex] = { ...state.customExams[customIndex], ...changes };
    else state.assessmentEdits[id] = { ...(state.assessmentEdits[id] || {}), ...changes };
    saveState(); renderExams(); renderReminders();
  }

  function buildReminders() {
    const today = todayISO();
    const reminders = [];
    getTasks().filter(task => task.status !== "completed").forEach(task => {
      const days = daysBetween(today, task.dueDate);
      if ([7, 1, 0].includes(days)) reminders.push({ id: `task-${task.id}-${days}`, title: days === 0 ? "Lab report due today" : `Lab report due in ${days} day${days === 1 ? "" : "s"}`, body: `${task.code}: ${task.title}`, date: task.dueDate });
    });
    getExams().filter(exam => exam.status !== "ready").forEach(exam => {
      const days = daysBetween(today, exam.date);
      if (days >= 0 && days <= 7) reminders.push({ id: `exam-${exam.id}-${days}`, title: `Are you ready for ${exam.type}?`, body: `${exam.code || exam.subject} · ${examName(exam)} · ${days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"} left`}`, date: exam.date });
    });
    getSchedule(today).filter(item => item.type === "sessional").forEach(item => reminders.push({ id: `lab-${item.id}`, title: "Sessional class today", body: `${item.code}: ${item.name} at ${timeLabel(item.start)}. Check your report.`, date: today }));
    return reminders;
  }

  function renderReminders() {
    const reminders = buildReminders();
    const badge = $("#reminderBadge");
    badge.hidden = !reminders.length;
    badge.textContent = reminders.length;
    $("#reminderList").innerHTML = reminders.length ? reminders.map(item => `<article class="reminder-item"><strong>${escapeHTML(item.title)}</strong><p>${escapeHTML(item.body)}</p><time>${escapeHTML(shortDate(item.date))}</time></article>`).join("") : emptyState("You're caught up", "No reminders are due today.", "✓");
  }

  async function sendDueNotifications() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const today = todayISO();
    const fresh = buildReminders().filter(item => !state.notified.includes(`${today}:${item.id}`));
    if (!fresh.length) return;
    const registration = await navigator.serviceWorker?.ready;
    fresh.slice(0, 3).forEach(item => {
      if (registration) registration.active?.postMessage({ type: "SHOW_NOTIFICATION", title: item.title, body: item.body, tag: item.id });
      else new Notification(item.title, { body: item.body, tag: item.id });
      state.notified.push(`${today}:${item.id}`);
    });
    state.notified = state.notified.slice(-100);
    saveState();
  }

  function renderSettings() {
    $("#morningTime").value = state.settings.morningTime;
    $("#examTime").value = state.settings.examTime;
    const notificationButton = $("#enableNotifications");
    notificationButton.textContent = "Notification" in window && Notification.permission === "granted" ? "Enabled" : "Enable";
    notificationButton.disabled = "Notification" in window && Notification.permission === "granted";
  }

  function inputField(label, name, type = "text", value = "", extra = "") {
    return `<label>${escapeHTML(label)}<input type="${escapeHTML(type)}" name="${escapeHTML(name)}" value="${escapeHTML(value)}" ${extra}></label>`;
  }

  function selectField(label, name, options, value) {
    return `<label>${escapeHTML(label)}<select name="${escapeHTML(name)}">${options.map(option => {
      const pair = Array.isArray(option) ? option : [option, option];
      return `<option value="${escapeHTML(pair[0])}"${pair[0] === value ? " selected" : ""}>${escapeHTML(pair[1])}</option>`;
    }).join("")}</select></label>`;
  }

  function openDialog({ type, title, eyebrow, fields, item }) {
    dialogContext = { type, item };
    $("#dialogTitle").textContent = title;
    $("#dialogEyebrow").textContent = eyebrow;
    $("#dialogFields").innerHTML = fields;
    $("#itemDialog").showModal();
  }

  function openTaskDialog(task = null) {
    const item = task || { id: uid("task"), code: "AVE 4502", title: "", dueDate: selectedDate, status: "not-started", note: "", generated: false };
    openDialog({ type: "task", item, title: task ? "Edit lab report" : "Add lab report", eyebrow: "SESSIONAL WORK", fields:
      selectField("Course", "code", Object.keys(DATA.courses).filter(code => DATA.courses[code].type === "sessional"), item.code) +
      inputField("Report title", "title", "text", item.title, "required maxlength=120") +
      inputField("Due date", "dueDate", "date", item.dueDate, "required") +
      selectField("Status", "status", Object.entries(REPORT_STATES), item.status) +
      `<label>Notes<textarea name="note" maxlength="500">${escapeHTML(item.note || "")}</textarea></label>` +
      (!item.generated && task ? `<button type="button" class="danger-button" data-dialog-delete>Delete report</button>` : "")
    });
  }

  function openExamDialog(exam = null) {
    const item = exam || { id: uid("exam"), type: "CT", code: "AVE 4501", date: selectedDate, time: "09:00", status: "not-started", syllabus: "", official: false };
    openDialog({ type: "exam", item, title: exam ? "Edit assessment" : "Add assessment", eyebrow: "EXAM READINESS", fields:
      inputField("Assessment type", "type", "text", item.type, "required maxlength=30") +
      selectField("Subject", "code", Object.keys(DATA.courses).filter(code => DATA.courses[code].type === "theory"), item.code) +
      inputField("Date", "date", "date", item.date, "required") + inputField("Time", "time", "time", item.time || "09:00", "required") +
      selectField("Readiness", "status", Object.entries(EXAM_STATES), item.status) +
      `<label>Syllabus / topics<textarea name="syllabus" maxlength="500">${escapeHTML(item.syllabus || "")}</textarea></label>` +
      (exam ? `<button type="button" class="danger-button" data-dialog-delete>Delete assessment</button>` : "")
    });
  }

  function openClassDialog(event = null) {
    const item = event || { id: uid("class"), code: "AVE 4501", name: "", date: selectedDate, start: "09:00", end: "09:55", room: "CL-304", teacher: "", type: "theory", source: "custom" };
    openDialog({ type: "class", item, title: event ? (event.source === "official" ? "Reschedule class" : "Edit class") : "Add class", eyebrow: "ROUTINE UPDATE", fields:
      selectField("Course", "code", Object.keys(DATA.courses), item.code) + inputField("Custom title (optional)", "name", "text", item.source === "custom" ? item.name : "", "maxlength=120") +
      inputField("Date", "date", "date", item.date, "required") + inputField("Start", "start", "time", item.start, "required") + inputField("End", "end", "time", item.end, "required") +
      inputField("Room", "room", "text", item.room || "", "maxlength=60") + inputField("Teacher", "teacher", "text", item.teacher || "", "maxlength=100") +
      selectField("Class type", "type", [["theory", "Theory"], ["sessional", "Sessional / Lab"]], item.type) +
      (event ? `<button type="button" class="danger-button" data-dialog-delete>${event.source === "official" ? "Cancel this class" : "Delete class"}</button>` : "")
    });
  }

  function handleDialogSave(event) {
    event.preventDefault();
    if (!dialogContext || !$("#itemForm").reportValidity()) return;
    const values = Object.fromEntries(new FormData($("#itemForm")));
    const { type, item } = dialogContext;
    if (type === "task") {
      const updated = { ...item, ...values };
      if (item.generated) state.taskEdits[item.id] = { ...(state.taskEdits[item.id] || {}), ...values };
      else {
        const index = state.customTasks.findIndex(entry => entry.id === item.id);
        if (index >= 0) state.customTasks[index] = updated; else state.customTasks.push(updated);
      }
    }
    if (type === "exam") {
      const updated = { ...item, ...values };
      if (item.official) state.assessmentEdits[item.id] = { ...(state.assessmentEdits[item.id] || {}), ...values };
      else {
        const index = state.customExams.findIndex(entry => entry.id === item.id);
        if (index >= 0) state.customExams[index] = updated; else state.customExams.push(updated);
      }
    }
    if (type === "class") {
      const base = course(values.code);
      const updated = { ...item, ...values, name: values.name || base.name, id: item.source === "custom" ? item.id : uid("class"), source: "custom", color: base.color };
      if (item.source === "official" && !state.cancelledClasses.includes(item.id)) state.cancelledClasses.push(item.id);
      const index = state.customClasses.findIndex(entry => entry.id === updated.id);
      if (index >= 0) state.customClasses[index] = updated; else state.customClasses.push(updated);
      selectedDate = values.date;
    }
    saveState();
    $("#itemDialog").close();
    dialogContext = null;
    renderAll();
    showToast("Saved successfully");
  }

  function handleDialogDelete() {
    if (!dialogContext || !confirm("Delete this item?")) return;
    const { type, item } = dialogContext;
    if (type === "task") state.customTasks = state.customTasks.filter(entry => entry.id !== item.id);
    if (type === "exam") {
      if (item.official) state.deletedExams.push(item.id);
      else state.customExams = state.customExams.filter(entry => entry.id !== item.id);
    }
    if (type === "class") {
      if (item.source === "official") state.cancelledClasses.push(item.id);
      else state.customClasses = state.customClasses.filter(entry => entry.id !== item.id);
    }
    saveState(); $("#itemDialog").close(); dialogContext = null; renderAll(); showToast("Item removed");
  }

  function emptyState(title, copy, icon) {
    return `<div class="empty-state"><div class="empty-icon">${escapeHTML(icon)}</div><h3>${escapeHTML(title)}</h3><p>${escapeHTML(copy)}</p></div>`;
  }

  function showView(name) {
    $$(".view").forEach(view => view.classList.toggle("active", view.dataset.view === name));
    $$(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.target === name));
    if (name === "week") { weekAnchor = selectedDate; renderWeek(); }
    if (name === "tasks") renderTasks();
    if (name === "exams") renderExams();
    if (name === "settings") renderSettings();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.settings.theme;
    $("#themeToggle").textContent = state.settings.theme === "dark" ? "☾" : "☀";
    document.querySelector('meta[name="theme-color"]').content = state.settings.theme === "dark" ? "#07111f" : "#edf4fa";
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ app: "FlightPlan", version: 1, exportedAt: new Date().toISOString(), state }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `flightplan-backup-${todayISO()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function importData(file) {
    try {
      const parsed = JSON.parse(await file.text());
      const imported = parsed.state || parsed;
      if (!imported || typeof imported !== "object") throw new Error("Invalid backup");
      state = { ...defaultState(), ...imported, settings: { ...defaultState().settings, ...(imported.settings || {}) } };
      saveState(); applyTheme(); renderAll(); showToast("Backup imported");
    } catch { showToast("Could not import this file"); }
  }

  function openReminders(open) {
    $("#drawerBackdrop").hidden = !open;
    $("#reminderDrawer").classList.toggle("open", open);
    $("#reminderDrawer").setAttribute("aria-hidden", String(!open));
  }

  function bindEvents() {
    $$(".nav-item").forEach(button => button.addEventListener("click", () => showView(button.dataset.target)));
    $("#previousDay").addEventListener("click", () => { selectedDate = addDays(selectedDate, -1); renderToday(); });
    $("#nextDay").addEventListener("click", () => { selectedDate = addDays(selectedDate, 1); renderToday(); });
    $("#jumpToday").addEventListener("click", () => { selectedDate = todayISO(); renderToday(); });
    $("#datePickerButton").addEventListener("click", () => { const picker = $("#datePicker"); picker.showPicker ? picker.showPicker() : picker.click(); });
    $("#datePicker").addEventListener("change", event => { if (event.target.value) { selectedDate = event.target.value; renderToday(); } });
    $("#previousWeek").addEventListener("click", () => { weekAnchor = addDays(sundayOf(weekAnchor), -7); renderWeek(); });
    $("#nextWeek").addEventListener("click", () => { weekAnchor = addDays(sundayOf(weekAnchor), 7); renderWeek(); });
    $("#themeToggle").addEventListener("click", () => { state.settings.theme = state.settings.theme === "dark" ? "light" : "dark"; saveState(); applyTheme(); });
    $("#reminderButton").addEventListener("click", () => openReminders(true));
    $("#closeReminders").addEventListener("click", () => openReminders(false));
    $("#drawerBackdrop").addEventListener("click", () => openReminders(false));
    $("#addTaskButton").addEventListener("click", () => openTaskDialog());
    $("#addExamButton").addEventListener("click", () => openExamDialog());
    $("#addClassButton").addEventListener("click", () => openClassDialog());
    $("#taskFilters").addEventListener("click", event => { const button = event.target.closest("[data-filter]"); if (!button) return; taskFilter = button.dataset.filter; $$("#taskFilters .filter").forEach(item => item.classList.toggle("active", item === button)); renderTasks(); });
    $("#examFilters").addEventListener("click", event => { const button = event.target.closest("[data-filter]"); if (!button) return; examFilter = button.dataset.filter; $$("#examFilters .filter").forEach(item => item.classList.toggle("active", item === button)); renderExams(); });
    $("#itemForm").addEventListener("submit", handleDialogSave);
    $("#dialogFields").addEventListener("click", event => { if (event.target.closest("[data-dialog-delete]")) handleDialogDelete(); });
    $("#itemDialog").addEventListener("close", () => { if ($("#itemDialog").returnValue === "cancel") dialogContext = null; });
    $("#enableNotifications").addEventListener("click", async () => {
      if (!("Notification" in window)) return showToast("This browser does not support notifications");
      const permission = await Notification.requestPermission();
      renderSettings();
      if (permission === "granted") { showToast("Notifications enabled"); sendDueNotifications(); }
      else showToast("Notification permission was not granted");
    });
    $("#saveSettings").addEventListener("click", () => { state.settings.morningTime = $("#morningTime").value; state.settings.examTime = $("#examTime").value; saveState(); showToast("Reminder times saved"); });
    $("#exportData").addEventListener("click", exportData);
    $("#importData").addEventListener("click", () => $("#importFile").click());
    $("#importFile").addEventListener("change", event => { const file = event.target.files[0]; if (file) importData(file); event.target.value = ""; });
    $("#resetData").addEventListener("click", () => { if (!confirm("Reset all FlightPlan progress and custom data?")) return; state = defaultState(); saveState(); applyTheme(); renderAll(); showToast("App data reset"); });
  }

  function renderAll() {
    renderToday(); renderTasks(); renderExams(); renderReminders(); renderSettings();
  }

  async function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      try { await navigator.serviceWorker.register("./sw.js"); } catch (error) { console.warn("Offline mode unavailable", error); }
    }
  }

  function init() {
    applyTheme();
    bindEvents();
    renderAll();
    registerServiceWorker().then(sendDueNotifications);
    setInterval(() => { renderNextClass(); sendDueNotifications(); }, 60000);
  }

  init();
})();
