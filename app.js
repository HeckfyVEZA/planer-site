(() => {
  "use strict";

  const STORAGE_KEYS = {
    tasks: "my-day-soft-tracker",
    notes: "my-day-soft-notes",
    phrases: "my-day-soft-phrases"
  };

  const DEFAULT_PHRASES = [
    "Сегодня можно двигаться мягко, но уверенно.",
    "Не обязательно делать всё сразу. Достаточно одного следующего шага.",
    "Порядок начинается с маленького спокойного действия.",
    "Ты можешь быть продуктивной без спешки.",
    "Пусть день будет собранным, но добрым к тебе.",
    "Главное — не идеальный список, а ощущение опоры.",
    "Даже маленькое выполненное дело — это уже движение."
  ];

  const EMPTY_STATES = {
    today: "На сегодня дел нет. Можно добавить что-то маленькое и приятное.",
    work: "Рабочих дел пока нет.",
    home: "Домашних дел пока нет.",
    archive: "Архив пока пуст.",
    phrases: "Фраз пока нет.",
    freeDay: "Свободно",
    modal: "На эту дату пока ничего не запланировано.",
    preview: "На сегодня всё спокойно 🌿"
  };

  const CATEGORY_META = {
    work: {
      label: "Работа",
      shortLabel: "Работа",
      icon: "💻"
    },
    home: {
      label: "Дом",
      shortLabel: "Дом",
      icon: "🏡"
    }
  };

  const MONTH_WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  const formatters = {
    shortDate: new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }),
    fullDate: new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }),
    monthTitle: new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }),
    weekday: new Intl.DateTimeFormat("ru-RU", { weekday: "short" })
  };

  const elements = {
    tabsNav: getElement("tabsNav"),
    tabButtons: Array.from(document.querySelectorAll(".tab-btn")),
    tabViews: Array.from(document.querySelectorAll(".tab-view")),
    taskForm: getElement("taskForm"),
    taskInput: getElement("taskInput"),
    taskCategory: getElement("taskCategory"),
    taskDate: getElement("taskDate"),
    todayTasks: getElement("todayTasks"),
    workTasks: getElement("workTasks"),
    homeTasks: getElement("homeTasks"),
    archiveTasks: getElement("archiveTasks"),
    modalTaskList: getElement("modalTaskList"),
    taskLists: Array.from(document.querySelectorAll("[data-task-list]")),
    previewList: getElement("previewList"),
    totalCount: getElement("totalCount"),
    doneCount: getElement("doneCount"),
    workCount: getElement("workCount"),
    homeCount: getElement("homeCount"),
    progressText: getElement("progressText"),
    progressFill: getElement("progressFill"),
    dailyQuote: getElement("dailyQuote"),
    todayDate: getElement("todayDate"),
    todayNoteInput: getElement("todayNoteInput"),
    saveTodayNoteBtn: getElement("saveTodayNoteBtn"),
    clearTodayNoteBtn: getElement("clearTodayNoteBtn"),
    phraseInput: getElement("phraseInput"),
    addPhraseBtn: getElement("addPhraseBtn"),
    phraseList: getElement("phraseList"),
    newQuoteBtn: getElement("newQuoteBtn"),
    calendarTitle: getElement("calendarTitle"),
    calendarSubtitle: getElement("calendarSubtitle"),
    calendarControls: getElement("calendarControls"),
    calendarModes: Array.from(document.querySelectorAll(".calendar-mode")),
    prevMonthBtn: getElement("prevMonthBtn"),
    nextMonthBtn: getElement("nextMonthBtn"),
    calendarGrid: getElement("calendarGrid"),
    dayModal: getElement("dayModal"),
    modalCloseBtn: getElement("modalCloseBtn"),
    modalDayLabel: getElement("modalDayLabel"),
    modalDateTitle: getElement("modalDateTitle"),
    modalTotal: getElement("modalTotal"),
    modalWork: getElement("modalWork"),
    modalHome: getElement("modalHome"),
    modalNoteInput: getElement("modalNoteInput"),
    saveDayNoteBtn: getElement("saveDayNoteBtn"),
    addForSelectedDayBtn: getElement("addForSelectedDayBtn")
  };

  const state = {
    tasks: loadTasks(),
    notes: loadNotes(),
    phrases: loadPhrases(),
    currentQuote: "",
    activeTab: "today",
    calendarMode: "week",
    calendarCursor: new Date(),
    selectedModalDate: getToday()
  };

  init();

  function init() {
    elements.taskDate.value = getToday();
    setRandomPhrase();
    bindEvents();
    syncTabState();
    syncCalendarModeState();
    renderApp();
  }

  function bindEvents() {
    elements.tabsNav.addEventListener("click", handleTabClick);
    elements.taskForm.addEventListener("submit", handleTaskSubmit);

    elements.saveTodayNoteBtn.addEventListener("click", () => {
      saveNote(getToday(), elements.todayNoteInput.value);
    });

    elements.clearTodayNoteBtn.addEventListener("click", () => {
      elements.todayNoteInput.value = "";
      saveNote(getToday(), "");
    });

    elements.addPhraseBtn.addEventListener("click", addPhrase);
    elements.phraseInput.addEventListener("keydown", handlePhraseInputKeydown);
    elements.phraseList.addEventListener("click", handlePhraseListClick);
    elements.newQuoteBtn.addEventListener("click", () => {
      setRandomPhrase();
      renderQuote();
    });

    elements.calendarControls.addEventListener("click", handleCalendarControlsClick);
    elements.calendarGrid.addEventListener("click", handleCalendarGridClick);
    elements.calendarGrid.addEventListener("keydown", handleCalendarGridKeydown);

    elements.taskLists.forEach(container => {
      container.addEventListener("click", handleTaskListClick);
    });

    elements.modalCloseBtn.addEventListener("click", closeDayModal);
    elements.dayModal.addEventListener("click", handleModalBackdropClick);
    elements.saveDayNoteBtn.addEventListener("click", () => {
      saveNote(state.selectedModalDate, elements.modalNoteInput.value);
    });
    elements.addForSelectedDayBtn.addEventListener("click", moveFocusToTaskForm);

    document.addEventListener("keydown", handleDocumentKeydown);
  }

  function handleTabClick(event) {
    const button = event.target.closest(".tab-btn");

    if (!button) {
      return;
    }

    state.activeTab = button.dataset.tab;
    syncTabState();
  }

  function handleTaskSubmit(event) {
    event.preventDefault();

    const title = elements.taskInput.value.trim();

    if (!title) {
      return;
    }

    state.tasks.push({
      id: createId(),
      title,
      category: normalizeCategory(elements.taskCategory.value),
      date: normalizeDateString(elements.taskDate.value),
      done: false,
      createdAt: Date.now()
    });

    elements.taskInput.value = "";
    elements.taskInput.placeholder = "Добавить новое дело...";
    elements.taskDate.value = getToday();

    saveTasks();
    renderApp();
  }

  function handlePhraseInputKeydown(event) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addPhrase();
  }

  function handlePhraseListClick(event) {
    const button = event.target.closest("[data-action='delete-phrase']");

    if (!button) {
      return;
    }

    const phraseIndex = Number(button.dataset.phraseIndex);

    if (Number.isNaN(phraseIndex)) {
      return;
    }

    deletePhrase(phraseIndex);
  }

  function handleCalendarControlsClick(event) {
    const modeButton = event.target.closest(".calendar-mode");

    if (modeButton) {
      state.calendarMode = modeButton.dataset.calendarMode;
      syncCalendarModeState();
      renderCalendar();
      return;
    }

    const actionButton = event.target.closest("button");

    if (!actionButton) {
      return;
    }

    if (actionButton === elements.prevMonthBtn) {
      shiftCalendar(-1);
      return;
    }

    if (actionButton === elements.nextMonthBtn) {
      shiftCalendar(1);
    }
  }

  function handleCalendarGridClick(event) {
    const dateCard = event.target.closest("[data-date]");

    if (!dateCard) {
      return;
    }

    openDayModal(dateCard.dataset.date);
  }

  function handleCalendarGridKeydown(event) {
    const dateCard = event.target.closest("[data-date]");

    if (!dateCard || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    event.preventDefault();
    openDayModal(dateCard.dataset.date);
  }

  function handleTaskListClick(event) {
    const actionButton = event.target.closest("[data-action]");

    if (!actionButton) {
      return;
    }

    const taskCard = actionButton.closest("[data-task-id]");

    if (!taskCard) {
      return;
    }

    const taskId = taskCard.dataset.taskId;

    switch (actionButton.dataset.action) {
      case "toggle":
        toggleTask(taskId);
        break;
      case "edit":
        editTask(taskId);
        break;
      case "delete":
        deleteTask(taskId);
        break;
      default:
        break;
    }
  }

  function handleModalBackdropClick(event) {
    if (event.target === elements.dayModal) {
      closeDayModal();
    }
  }

  function handleDocumentKeydown(event) {
    if (event.key === "Escape") {
      closeDayModal();
    }
  }

  function shiftCalendar(direction) {
    if (state.calendarMode === "week") {
      state.calendarCursor = addDays(state.calendarCursor, direction * 7);
    } else {
      state.calendarCursor = shiftMonth(state.calendarCursor, direction);
    }

    renderCalendar();
  }

  function moveFocusToTaskForm() {
    closeDayModal();
    elements.taskDate.value = state.selectedModalDate;
    elements.taskInput.placeholder = `Добавить дело на ${formatDate(state.selectedModalDate)}...`;
    elements.taskInput.focus();
  }

  function addPhrase() {
    const phrase = elements.phraseInput.value.trim();

    if (!phrase) {
      return;
    }

    state.phrases.push(phrase);
    elements.phraseInput.value = "";

    savePhrases();
    setRandomPhrase();
    renderQuote();
    renderPhrasesList();
  }

  function deletePhrase(index) {
    if (state.phrases.length <= 1) {
      alert("Оставь хотя бы одну фразу, чтобы блоку было что показывать.");
      return;
    }

    state.phrases.splice(index, 1);
    savePhrases();
    setRandomPhrase();
    renderQuote();
    renderPhrasesList();
  }

  function toggleTask(taskId) {
    const task = findTask(taskId);

    if (!task) {
      return;
    }

    task.done = !task.done;
    saveTasks();
    renderApp();
  }

  function editTask(taskId) {
    const task = findTask(taskId);

    if (!task) {
      return;
    }

    const updatedTitle = prompt("Изменить дело:", task.title);

    if (updatedTitle === null) {
      return;
    }

    const normalizedTitle = updatedTitle.trim();

    if (!normalizedTitle) {
      return;
    }

    task.title = normalizedTitle;
    saveTasks();
    renderApp();
  }

  function deleteTask(taskId) {
    const confirmed = confirm("Удалить это дело?");

    if (!confirmed) {
      return;
    }

    state.tasks = state.tasks.filter(task => task.id !== taskId);
    saveTasks();
    renderApp();
  }

  function saveNote(dateString, text) {
    const normalizedDate = normalizeDateString(dateString);
    const cleanText = text.trim();

    if (cleanText) {
      state.notes[normalizedDate] = cleanText;
    } else {
      delete state.notes[normalizedDate];
    }

    saveJSON(STORAGE_KEYS.notes, state.notes);
    renderApp();
  }

  function renderApp() {
    const today = getToday();
    const derived = getDerivedState(today);

    elements.todayDate.textContent = formatDate(today);
    elements.todayNoteInput.value = state.notes[today] || "";

    renderTaskList(elements.todayTasks, derived.todayActive, EMPTY_STATES.today);
    renderTaskList(elements.workTasks, derived.workActive, EMPTY_STATES.work);
    renderTaskList(elements.homeTasks, derived.homeActive, EMPTY_STATES.home);
    renderTaskList(elements.archiveTasks, derived.completedTasks, EMPTY_STATES.archive);
    renderPreview(derived.todayActive);
    renderStats(derived.todayAll, derived.todayDone);
    renderCalendar();
    renderPhrasesList();
    renderQuote();

    if (elements.dayModal.classList.contains("is-open")) {
      renderDayModal(state.selectedModalDate);
    }
  }

  function renderTaskList(container, tasks, emptyText) {
    container.replaceChildren();

    if (!tasks.length) {
      container.appendChild(createEmptyState(emptyText));
      return;
    }

    container.append(...tasks.map(createTaskElement));
  }

  function renderPreview(todayActive) {
    elements.previewList.replaceChildren();

    const previewTasks = todayActive.slice(0, 4);

    if (!previewTasks.length) {
      elements.previewList.appendChild(createEmptyState(EMPTY_STATES.preview));
      return;
    }

    elements.previewList.append(...previewTasks.map(createPreviewTask));
  }

  function renderStats(todayAll, todayDone) {
    const progress = todayAll.length
      ? Math.round((todayDone.length / todayAll.length) * 100)
      : 0;

    elements.totalCount.textContent = String(todayAll.length);
    elements.doneCount.textContent = String(todayDone.length);
    elements.workCount.textContent = String(todayAll.filter(task => task.category === "work").length);
    elements.homeCount.textContent = String(todayAll.filter(task => task.category === "home").length);
    elements.progressText.textContent = `${progress}%`;
    elements.progressFill.style.width = `${progress}%`;
  }

  function renderQuote() {
    elements.dailyQuote.textContent = state.currentQuote;
  }

  function renderPhrasesList() {
    elements.phraseList.replaceChildren();

    if (!state.phrases.length) {
      elements.phraseList.appendChild(createEmptyState(EMPTY_STATES.phrases));
      return;
    }

    elements.phraseList.append(...state.phrases.map(createPhraseItem));
  }

  function renderCalendar() {
    if (state.calendarMode === "week") {
      renderWeekCalendar();
      return;
    }

    renderMonthCalendar();
  }

  function renderWeekCalendar() {
    elements.calendarGrid.replaceChildren();
    elements.calendarGrid.className = "calendar-grid week-view";
    elements.calendarSubtitle.textContent = "план на выбранную неделю";

    const start = new Date(state.calendarCursor);
    const end = addDays(start, 6);

    elements.calendarTitle.textContent = `${formatFullDate(start)} — ${formatFullDate(end)}`;

    const dayCards = [];

    for (let index = 0; index < 7; index += 1) {
      const date = addDays(start, index);
      const dateString = toLocalDateString(date);
      const dayTasks = getActiveTasksByDate(dateString);
      const isToday = dateString === getToday();
      const hasNote = Boolean(state.notes[dateString]?.trim());

      const card = createInteractiveDateCard("day-card", dateString);
      const title = createElement("div", {
        className: "day-name",
        text: `${isToday ? "Сегодня" : getWeekday(date)} · ${formatDate(dateString)}`
      });

      card.appendChild(title);

      if (!dayTasks.length) {
        card.appendChild(createEmptyState(EMPTY_STATES.freeDay, true));
      } else {
        dayTasks.forEach(task => {
          card.appendChild(createMiniTask(task));
        });
      }

      if (hasNote) {
        card.appendChild(createElement("div", { className: "note-badge", text: "✦ заметка" }));
      }

      dayCards.push(card);
    }

    elements.calendarGrid.append(...dayCards);
  }

  function renderMonthCalendar() {
    elements.calendarGrid.replaceChildren();
    elements.calendarGrid.className = "calendar-grid month-view";
    elements.calendarSubtitle.textContent = "план на месяц";

    const year = state.calendarCursor.getFullYear();
    const month = state.calendarCursor.getMonth();
    const monthName = formatters.monthTitle.format(state.calendarCursor);

    elements.calendarTitle.textContent = capitalize(monthName);

    const weekdayLabels = MONTH_WEEKDAYS.map(day => (
      createElement("div", { className: "weekday-label", text: day })
    ));

    const firstDayOfMonth = new Date(year, month, 1);
    const startOffset = getMondayOffset(firstDayOfMonth);
    const calendarStart = addDays(firstDayOfMonth, -startOffset);
    const cards = [];

    for (let index = 0; index < 42; index += 1) {
      const date = addDays(calendarStart, index);
      const dateString = toLocalDateString(date);
      const dayTasks = getActiveTasksByDate(dateString);
      const visibleTasks = dayTasks.slice(0, 2);
      const hiddenCount = dayTasks.length - visibleTasks.length;
      const isCurrentMonth = date.getMonth() === month;
      const isToday = dateString === getToday();
      const hasNote = Boolean(state.notes[dateString]?.trim());

      const card = createInteractiveDateCard("month-day", dateString);

      if (!isCurrentMonth) {
        card.classList.add("is-muted");
      }

      if (isToday) {
        card.classList.add("is-today");
      }

      const numberRow = createElement("div", { className: "day-number" });
      numberRow.appendChild(createElement("span", { text: String(date.getDate()) }));

      if (isToday) {
        numberRow.appendChild(createElement("span", { className: "today-badge", text: "сегодня" }));
      }

      card.appendChild(numberRow);

      visibleTasks.forEach(task => {
        card.appendChild(createMiniTask(task));
      });

      if (hiddenCount > 0) {
        card.appendChild(createElement("div", {
          className: "more-tasks",
          text: `+ ещё ${hiddenCount}`
        }));
      }

      if (hasNote) {
        card.appendChild(createElement("div", { className: "note-badge", text: "✦ заметка" }));
      }

      cards.push(card);
    }

    elements.calendarGrid.append(...weekdayLabels, ...cards);
  }

  function openDayModal(dateString) {
    state.selectedModalDate = normalizeDateString(dateString);
    renderDayModal(state.selectedModalDate);
    elements.dayModal.classList.add("is-open");
    elements.dayModal.setAttribute("aria-hidden", "false");
  }

  function renderDayModal(dateString) {
    const normalizedDate = normalizeDateString(dateString);
    const dateTasks = state.tasks
      .filter(task => task.date === normalizedDate)
      .sort(sortByDate);
    const activeDateTasks = dateTasks.filter(task => !task.done);

    elements.modalDayLabel.textContent = normalizedDate === getToday()
      ? "сегодня"
      : getWeekday(parseDateString(normalizedDate));
    elements.modalDateTitle.textContent = formatFullDate(parseDateString(normalizedDate));
    elements.modalNoteInput.value = state.notes[normalizedDate] || "";
    elements.modalTotal.textContent = String(activeDateTasks.length);
    elements.modalWork.textContent = String(activeDateTasks.filter(task => task.category === "work").length);
    elements.modalHome.textContent = String(activeDateTasks.filter(task => task.category === "home").length);

    renderTaskList(elements.modalTaskList, activeDateTasks, EMPTY_STATES.modal);
  }

  function closeDayModal() {
    elements.dayModal.classList.remove("is-open");
    elements.dayModal.setAttribute("aria-hidden", "true");
  }

  function syncTabState() {
    elements.tabButtons.forEach(button => {
      const isActive = button.dataset.tab === state.activeTab;
      const controlledView = document.getElementById(button.getAttribute("aria-controls"));

      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", String(isActive));
      button.tabIndex = isActive ? 0 : -1;

      if (!controlledView) {
        return;
      }

      controlledView.classList.toggle("hidden", !isActive);
      controlledView.hidden = !isActive;
      controlledView.setAttribute("aria-hidden", String(!isActive));
    });
  }

  function syncCalendarModeState() {
    elements.calendarModes.forEach(button => {
      const isActive = button.dataset.calendarMode === state.calendarMode;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function getDerivedState(today) {
    const activeTasks = state.tasks.filter(task => !task.done).sort(sortByDate);
    const completedTasks = state.tasks.filter(task => task.done).sort(sortByDate);
    const todayAll = state.tasks.filter(task => task.date === today).sort(sortByDate);
    const todayDone = todayAll.filter(task => task.done);

    return {
      activeTasks,
      completedTasks,
      todayAll,
      todayDone,
      todayActive: activeTasks.filter(task => task.date === today),
      workActive: activeTasks.filter(task => task.category === "work"),
      homeActive: activeTasks.filter(task => task.category === "home")
    };
  }

  function getActiveTasksByDate(dateString) {
    return state.tasks
      .filter(task => task.date === dateString && !task.done)
      .sort(sortByDate);
  }

  function createTaskElement(task) {
    const isOverdue = !task.done && task.date < getToday();
    const article = createElement("article", {
      className: `task${task.done ? " done" : ""}`,
      dataset: { taskId: task.id }
    });

    const checkButton = createElement("button", {
      className: "check",
      attrs: {
        type: "button",
        "aria-label": task.done ? "Отметить невыполненным" : "Отметить выполненным"
      },
      dataset: { action: "toggle" }
    });

    const main = createElement("div", { className: "task-main" });
    const title = createElement("p", { className: "task-title", text: task.title });
    const meta = createElement("div", { className: "task-meta" });

    meta.append(
      createElement("span", {
        className: `pill ${task.category}`,
        text: `${CATEGORY_META[task.category].icon} ${CATEGORY_META[task.category].label}`
      }),
      createElement("span", {
        className: `pill${isOverdue ? " overdue" : ""}`,
        text: `${isOverdue ? "Просрочено" : "Дедлайн"}: ${formatDate(task.date)}`
      })
    );

    main.append(title, meta);

    const actions = createElement("div", { className: "task-actions" });
    actions.append(
      createElement("button", {
        className: "icon-btn",
        text: "✎",
        attrs: {
          type: "button",
          title: "Редактировать",
          "aria-label": `Редактировать задачу: ${task.title}`
        },
        dataset: { action: "edit" }
      }),
      createElement("button", {
        className: "icon-btn",
        text: "×",
        attrs: {
          type: "button",
          title: "Удалить",
          "aria-label": `Удалить задачу: ${task.title}`
        },
        dataset: { action: "delete" }
      })
    );

    article.append(checkButton, main, actions);
    return article;
  }

  function createPreviewTask(task) {
    const item = createElement("div", { className: "mobile-task" });
    const dot = createElement("div", { className: "mobile-dot" });
    const content = createElement("div");

    content.append(
      createElement("p", { text: task.title }),
      createElement("span", {
        text: `${CATEGORY_META[task.category].shortLabel} · ${formatDate(task.date)}`
      })
    );

    item.append(dot, content);
    return item;
  }

  function createPhraseItem(phrase, index) {
    const item = createElement("div", { className: "phrase-item" });
    const text = createElement("p", { text: phrase });
    const button = createElement("button", {
      className: "icon-btn",
      text: "×",
      attrs: {
        type: "button",
        title: "Удалить фразу",
        "aria-label": `Удалить фразу: ${phrase}`
      },
      dataset: {
        action: "delete-phrase",
        phraseIndex: index
      }
    });

    item.append(text, button);
    return item;
  }

  function createMiniTask(task) {
    return createElement("div", {
      className: `mini-task ${task.category}`,
      text: task.title
    });
  }

  function createInteractiveDateCard(className, dateString) {
    return createElement("div", {
      className,
      attrs: {
        role: "button",
        tabindex: "0",
        "aria-label": `Открыть задачи на ${formatFullDate(parseDateString(dateString))}`
      },
      dataset: {
        date: dateString
      }
    });
  }

  function createEmptyState(text, compact = false) {
    return createElement("div", {
      className: compact ? "empty empty-compact" : "empty",
      text
    });
  }

  function createElement(tagName, options = {}) {
    const element = document.createElement(tagName);

    if (options.className) {
      element.className = options.className;
    }

    if (options.text !== undefined) {
      element.textContent = options.text;
    }

    if (options.attrs) {
      Object.entries(options.attrs).forEach(([name, value]) => {
        element.setAttribute(name, String(value));
      });
    }

    if (options.dataset) {
      Object.entries(options.dataset).forEach(([name, value]) => {
        element.dataset[name] = String(value);
      });
    }

    return element;
  }

  function setRandomPhrase() {
    const source = state.phrases.length ? state.phrases : DEFAULT_PHRASES;
    const randomIndex = Math.floor(Math.random() * source.length);
    state.currentQuote = source[randomIndex];
  }

  function findTask(taskId) {
    return state.tasks.find(task => task.id === taskId) || null;
  }

  function saveTasks() {
    saveJSON(STORAGE_KEYS.tasks, state.tasks);
  }

  function savePhrases() {
    saveJSON(STORAGE_KEYS.phrases, state.phrases);
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function loadTasks() {
    const parsed = readJSON(STORAGE_KEYS.tasks, []);

    if (!Array.isArray(parsed) || !parsed.length) {
      return createInitialTasks();
    }

    const normalized = parsed
      .map(normalizeTask)
      .filter(Boolean)
      .sort(sortByDate);

    return normalized.length ? normalized : createInitialTasks();
  }

  function loadNotes() {
    const parsed = readJSON(STORAGE_KEYS.notes, {});

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(([date, note]) => {
        return isValidDateString(date) && typeof note === "string" && note.trim();
      })
    );
  }

  function loadPhrases() {
    const parsed = readJSON(STORAGE_KEYS.phrases, DEFAULT_PHRASES);

    if (!Array.isArray(parsed)) {
      return [...DEFAULT_PHRASES];
    }

    const normalized = parsed
      .filter(phrase => typeof phrase === "string")
      .map(phrase => phrase.trim())
      .filter(Boolean);

    return normalized.length ? normalized : [...DEFAULT_PHRASES];
  }

  function readJSON(key, fallbackValue) {
    try {
      const rawValue = localStorage.getItem(key);
      return rawValue ? JSON.parse(rawValue) : fallbackValue;
    } catch {
      return fallbackValue;
    }
  }

  function createInitialTasks() {
    const today = getToday();
    const createdAt = Date.now();

    return [
      {
        id: createId(),
        title: "Разобрать рабочие задачи на день",
        category: "work",
        date: today,
        done: false,
        createdAt
      },
      {
        id: createId(),
        title: "Навести уют на рабочем столе",
        category: "home",
        date: today,
        done: false,
        createdAt: createdAt + 1
      }
    ];
  }

  function normalizeTask(task) {
    if (!task || typeof task !== "object") {
      return null;
    }

    const title = typeof task.title === "string" ? task.title.trim() : "";

    if (!title) {
      return null;
    }

    return {
      id: typeof task.id === "string" && task.id ? task.id : createId(),
      title,
      category: normalizeCategory(task.category),
      date: normalizeDateString(task.date),
      done: Boolean(task.done),
      createdAt: Number.isFinite(task.createdAt) ? task.createdAt : Date.now()
    };
  }

  function normalizeCategory(category) {
    return category === "home" ? "home" : "work";
  }

  function normalizeDateString(value) {
    return isValidDateString(value) ? value : getToday();
  }

  function isValidDateString(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseDateString(value).getTime());
  }

  function sortByDate(firstTask, secondTask) {
    return parseDateString(firstTask.date) - parseDateString(secondTask.date)
      || firstTask.createdAt - secondTask.createdAt;
  }

  function createId() {
    if (globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }

    return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function getToday() {
    return toLocalDateString(new Date());
  }

  function formatDate(dateString) {
    return formatters.shortDate.format(parseDateString(dateString));
  }

  function formatFullDate(date) {
    return formatters.fullDate.format(date);
  }

  function getWeekday(date) {
    return formatters.weekday.format(date);
  }

  function parseDateString(dateString) {
    return new Date(`${dateString}T00:00:00`);
  }

  function getMondayOffset(date) {
    const day = date.getDay();
    return day === 0 ? 6 : day - 1;
  }

  function toLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function shiftMonth(date, amount) {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1);
  }

  function capitalize(text) {
    return text ? text[0].toUpperCase() + text.slice(1) : text;
  }

  function getElement(id) {
    const element = document.getElementById(id);

    if (!element) {
      throw new Error(`Element with id "${id}" was not found.`);
    }

    return element;
  }
})();
