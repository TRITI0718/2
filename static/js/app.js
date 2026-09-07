const DEFAULT_THEME = {
  theme: "#20242c",
  accent1: "#ead8d9",
  accent2: "#6682a1",
  accent3: "#c49ca2",
  correct: "#d5e3d7",
  wrong: "#e38a8d",
};

const REVIEW_INTERVAL_DAYS = [1, 2, 4, 7, 15, 30, 60];

const STORAGE = {
  theme: "french-theme",
  quantity: "french-study-quantity",
  studyStats: "french-study-stats-v1",
  mastery: "french-word-mastery-v1",
  starred: "french-starred-words-v1",
  studySessionPrefix: "french-study-session-v5",
  reviewSessionPrefix: "french-review-session-v1",
  spellingSessionPrefix: "french-spelling-session-v2",
};

const state = {
  currentView: "learn",
  returnView: "learn",
  books: [],
  spellingItems: [],
  spellingLanguage: "chinese",
  studyType: null,
  studyItems: [],
  studyIndex: 0,
  studyTargetCount: 0,
  studyCompletedIds: [],
  answered: false,
  activeStudySessionKey: null,
  activeSpellingSessionKey: null,
  orbitMode: "checkins",
  sessionStats: { attempts: 0, correct: 0, failedIds: [], spellingErrors: 0 },
  wordBrowserItems: [],
  wordBrowserBook: "",
  wordBrowserVisible: 200,
};

const els = {
  navItems: [...document.querySelectorAll(".nav-item")],
  views: [...document.querySelectorAll(".view")],
  bookSelect: document.querySelector("#book-select"),
  studyQuantity: document.querySelector("#study-quantity"),
  studyQuantityValue: document.querySelector("#study-quantity-value"),
  arcKnob: document.querySelector("#arc-knob"),
  arcPath: document.querySelector(".quantity-arc-base"),
  arcComplete: document.querySelector(".quantity-arc-complete"),
  arcRemaining: document.querySelector(".quantity-arc-remaining"),
  learningOrbit: document.querySelector("#learning-orbit"),
  orbitCheckins: document.querySelector("#orbit-checkins"),
  orbitStats: document.querySelector("#orbit-stats"),
  attendanceBubbles: document.querySelector("#attendance-bubbles"),
  startWordStudy: document.querySelector("#start-word-study"),
  startReview: document.querySelector("#start-review"),
  reviewDueCount: document.querySelector("#review-due-count"),
  reviewSchedule: document.querySelector("#review-schedule"),
  reviewStatus: document.querySelector("#review-status"),
  reviewHub: document.querySelector("#review-hub"),
  closeReviewHub: document.querySelector("#close-review-hub"),
  startTodaysReview: document.querySelector("#start-todays-review"),
  todayReviewCount: document.querySelector("#today-review-count"),
  openStarred: document.querySelector("#open-starred"),
  starredCount: document.querySelector("#starred-count"),
  starredDrawer: document.querySelector("#starred-drawer"),
  starredList: document.querySelector("#starred-list"),
  grammarMode: document.querySelector("#grammar-mode"),
  startGrammarStudy: document.querySelector("#start-grammar-study"),
  studyBarChart: document.querySelector("#study-bar-chart"),
  studyCalendar: document.querySelector("#study-calendar"),
  calendarMonth: document.querySelector("#calendar-month"),
  checkinSummary: document.querySelector("#checkin-summary"),
  promptTabs: [...document.querySelectorAll(".prompt-tab")],
  spellingLanguageTabs: document.querySelector("#spelling-language-tabs"),
  spellingList: document.querySelector("#spelling-list"),
  saveSpelling: document.querySelector("#save-spelling"),
  clearSpelling: document.querySelector("#clear-spelling"),
  spellingSaveStatus: document.querySelector("#spelling-save-status"),
  themeColor: document.querySelector("#theme-color"),
  accentColor: document.querySelector("#accent-color"),
  accent2Color: document.querySelector("#accent2-color"),
  accent3Color: document.querySelector("#accent3-color"),
  correctColor: document.querySelector("#correct-color"),
  wrongColor: document.querySelector("#wrong-color"),
  resetTheme: document.querySelector("#reset-theme"),
  openWordBrowser: document.querySelector("#open-word-browser"),
  wordBrowserDrawer: document.querySelector("#word-browser-drawer"),
  closeWordBrowser: document.querySelector("#close-word-browser"),
  wordBrowserBooks: document.querySelector("#word-browser-books"),
  wordBrowserSearch: document.querySelector("#word-browser-search"),
  wordBrowserStatus: document.querySelector("#word-browser-status"),
  wordBrowserStarred: document.querySelector("#word-browser-starred"),
  wordBrowserSort: document.querySelector("#word-browser-sort"),
  wordBrowserList: document.querySelector("#word-browser-list"),
  wordBrowserSummary: document.querySelector("#word-browser-summary"),
  wordBrowserMore: document.querySelector("#word-browser-more"),
  studyBack: document.querySelector("#study-back"),
  studyProgressLabel: document.querySelector("#study-progress-label"),
  studyProgressBar: document.querySelector("#study-progress-bar"),
  studyKicker: document.querySelector("#study-kicker"),
  studyMain: document.querySelector("#study-main"),
  studyMeta: document.querySelector("#study-meta"),
  studyContext: document.querySelector("#study-context"),
  studyQuestionPanel: document.querySelector("#study-question-panel"),
  studyResponseLayout: document.querySelector("#study-response-layout"),
  studyOptions: document.querySelector("#study-options"),
  studyAnswerReveal: document.querySelector("#study-answer-reveal"),
  studyFeedback: document.querySelector("#study-feedback"),
  studyNext: document.querySelector("#study-next"),
  studyStar: document.querySelector("#study-star"),
  sessionComplete: document.querySelector("#session-complete"),
  completeWords: document.querySelector("#complete-words"),
  completeAccuracy: document.querySelector("#complete-accuracy"),
  completeMastered: document.querySelector("#complete-mastered"),
  completeReview: document.querySelector("#complete-review"),
  completeSpellingErrors: document.querySelector("#complete-spelling-errors"),
  sessionDone: document.querySelector("#session-done"),
};

function safeParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  return localDateKey(date);
}

function normalizeFrench(value) {
  return String(value ?? "").normalize("NFC");
}

function normalizeAnswer(value) {
  return normalizeFrench(value)
    .trim()
    .toLocaleLowerCase("fr-FR")
    .replace(/\s+/g, " ");
}

function shuffle(values) {
  const items = [...values];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

async function api(path) {
  const response = await fetch(path);
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`${response.status}: ${details}`);
  }
  return response.json();
}

function showView(viewName) {
  state.currentView = viewName;
  window.scrollTo({ top: 0, behavior: "auto" });
  els.views.forEach((view) => view.classList.toggle("active", view.id === `${viewName}-view`));
  els.navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === viewName));
  if (viewName === "learn") {
    renderLearningStats();
    renderReviewSummary();
  }
  if (viewName === "spelling") loadSpellingItems().catch(console.error);
  if (viewName !== "learn") toggleReviewHub(false);
  if (viewName !== "settings") toggleWordBrowser(false);
}

function bindNavigation() {
  els.navItems.forEach((item) => {
    item.addEventListener("click", () => showView(item.dataset.view));
  });
}

async function loadBooks() {
  state.books = await api("/api/books");
  els.bookSelect.innerHTML = state.books
    .map((book) => `<option value="${escapeHtml(book.id)}">${escapeHtml(book.name)} ${book.count}词</option>`)
    .join("");
}

function getStudyQuantity() {
  const stored = Number(localStorage.getItem(STORAGE.quantity));
  if (Number.isFinite(stored) && stored >= 10 && stored <= 200) return stored;
  return 30;
}

function setStudyQuantity(value) {
  const clamped = Math.min(200, Math.max(10, Math.round(Number(value) / 10) * 10));
  els.studyQuantity.value = String(clamped);
  els.studyQuantityValue.textContent = String(clamped);
  localStorage.setItem(STORAGE.quantity, String(clamped));
  updateArcKnob(clamped);
}


function updateArcKnob(value) {
  if (!els.arcKnob || !els.arcPath) return;
  const min = Number(els.studyQuantity.min) || 10;
  const max = Number(els.studyQuantity.max) || 200;
  const progress = Math.min(1, Math.max(0, (Number(value) - min) / (max - min)));
  const totalLength = els.arcPath.getTotalLength();
  const point = els.arcPath.getPointAtLength(totalLength * progress);
  const filled = totalLength * progress;
  const open = totalLength - filled;
  const gap = totalLength + 1;

  const shell = els.arcKnob.closest(".learning-count-arc");
  if (shell) {
    shell.style.setProperty("--arc-x", `${point.x}%`);
    shell.style.setProperty("--arc-y", `${point.y}%`);
  }
  if (els.arcComplete) {
    els.arcComplete.style.strokeDasharray = `${filled} ${gap}`;
    els.arcComplete.style.strokeDashoffset = "0";
  }
  if (els.arcRemaining) {
    els.arcRemaining.style.strokeDasharray = `${open} ${gap}`;
    els.arcRemaining.style.strokeDashoffset = `${-filled}`;
  }
}

function setOrbitMode(mode) {
  state.orbitMode = mode === 'stats' ? 'stats' : 'checkins';
  const statsActive = state.orbitMode === 'stats';
  if (els.orbitCheckins) els.orbitCheckins.hidden = statsActive;
  if (els.orbitStats) els.orbitStats.hidden = !statsActive;
  if (els.learningOrbit) els.learningOrbit.setAttribute('aria-pressed', String(statsActive));
  if (statsActive && els.studyBarChart) {
    window.requestAnimationFrame(() => {
      els.studyBarChart.parentElement?.scrollTo({ left: els.studyBarChart.scrollWidth, behavior: 'smooth' });
    });
  }
}

function bindOrbitDashboard() {
  if (!els.learningOrbit) return;
  els.learningOrbit.addEventListener('click', (event) => {
    if (state.orbitMode === 'stats' && event.target.closest('#study-bar-chart')) return;
    setOrbitMode(state.orbitMode === 'checkins' ? 'stats' : 'checkins');
  });
}

function studySessionKey(book, quantity, dateKey = localDateKey()) {
  return `${STORAGE.studySessionPrefix}:${dateKey}:${book}:${quantity}`;
}

function reviewSessionKey(dateKey = localDateKey()) {
  return `${STORAGE.reviewSessionPrefix}:${dateKey}`;
}

function getMastery() {
  const value = safeParse(localStorage.getItem(STORAGE.mastery), {});
  return value && typeof value === "object" ? value : {};
}

function saveMastery(value) {
  localStorage.setItem(STORAGE.mastery, JSON.stringify(value));
}

function getStarredWords() {
  const value = safeParse(localStorage.getItem(STORAGE.starred), {});
  return value && typeof value === "object" ? value : {};
}

function isStarred(itemId) {
  return Boolean(itemId && getStarredWords()[itemId]);
}

function toggleStarred(item) {
  if (!item?.id) return false;
  const starred = getStarredWords();
  if (starred[item.id]) delete starred[item.id];
  else starred[item.id] = item;
  localStorage.setItem(STORAGE.starred, JSON.stringify(starred));
  renderStarredDrawer();
  renderReviewSummary();
  return Boolean(starred[item.id]);
}

function updateStudyStar(item) {
  if (!els.studyStar) return;
  const visible = ["word", "review"].includes(state.studyType) && Boolean(item?.id);
  els.studyStar.hidden = !visible;
  if (!visible) return;
  const active = isStarred(item.id);
  els.studyStar.textContent = active ? "★" : "☆";
  els.studyStar.setAttribute("aria-pressed", String(active));
  els.studyStar.setAttribute("aria-label", active ? "取消收藏此单词" : "收藏此单词");
}

function dueReviewRecords(dateKey = localDateKey()) {
  const mastery = getMastery();
  return Object.values(mastery).filter(
    (record) => record?.item?.id && record.nextReview && record.nextReview <= dateKey
  );
}

function renderReviewSummary() {
  if (!els.startReview) return;
  const due = dueReviewRecords();
  const starredCount = Object.keys(getStarredWords()).length;
  if (els.reviewDueCount) els.reviewDueCount.textContent = `今日待复习 ${due.length} 词`;
  if (els.reviewSchedule) els.reviewSchedule.textContent = `复习间隔：${REVIEW_INTERVAL_DAYS.join(" / ")} 天`;
  els.startReview.disabled = false;
  els.startReview.textContent = "Begin Reviewing";
  els.startReview.title = `Today: ${due.length} words due · ${starredCount} starred`;
  if (els.startTodaysReview) els.startTodaysReview.disabled = due.length === 0;
  if (els.todayReviewCount) els.todayReviewCount.textContent = due.length ? `${due.length} words due` : "Nothing due today";
  if (els.starredCount) els.starredCount.textContent = `${starredCount} saved word${starredCount === 1 ? "" : "s"}`;
}

function renderStarredDrawer() {
  if (!els.starredList) return;
  const items = Object.values(getStarredWords());
  if (!items.length) {
    els.starredList.innerHTML = '<p class="drawer-empty">No starred words yet.</p>';
    return;
  }
  els.starredList.innerHTML = items
    .sort((a, b) => normalizeFrench(a.french).localeCompare(normalizeFrench(b.french), "fr"))
    .map((item) => `
      <article class="drawer-word" data-item-id="${escapeHtml(item.id)}">
        <button class="drawer-star active" type="button" aria-label="取消收藏 ${escapeHtml(item.french)}">★</button>
        <strong>${escapeHtml(normalizeFrench(item.french))}</strong>
        <span>${escapeHtml(item.chinese || item.english || "—")}</span>
        <small>${escapeHtml([item.part_of_speech, item.english].filter(Boolean).join(" · "))}</small>
      </article>
    `)
    .join("");
  els.starredList.querySelectorAll(".drawer-star").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".drawer-word");
      const item = getStarredWords()[card?.dataset.itemId];
      if (item) toggleStarred(item);
    });
  });
}

function toggleReviewHub(force) {
  if (!els.reviewHub) return;
  const shouldOpen = typeof force === "boolean" ? force : els.reviewHub.hidden;
  els.reviewHub.hidden = !shouldOpen;
  if (shouldOpen) {
    renderReviewSummary();
    renderStarredDrawer();
  } else if (els.starredDrawer) {
    els.starredDrawer.hidden = true;
  }
}

function getSessionUniqueItems() {
  const result = [];
  const seen = new Set();
  state.studyItems.forEach((task) => {
    const item = task?.item ?? task;
    if (!item?.id || seen.has(item.id)) return;
    seen.add(item.id);
    result.push(item);
  });
  return result;
}

function buildEnglishChoices(item) {
  const correct = String(item.english ?? "").trim();
  const pool = getSessionUniqueItems()
    .filter((candidate) => candidate.id !== item.id)
    .map((candidate) => String(candidate.english ?? "").trim())
    .filter(Boolean)
    .filter((value) => normalizeAnswer(value) !== normalizeAnswer(correct));

  const masteryPool = Object.values(getMastery())
    .map((record) => String(record?.item?.english ?? "").trim())
    .filter(Boolean)
    .filter((value) => normalizeAnswer(value) !== normalizeAnswer(correct));

  const distractors = shuffle([...new Set([...pool, ...masteryPool])]).slice(0, 3);
  if (distractors.length < 3) {
    const fallback = ["to make; to do", "to see; to watch", "to know; to understand", "to go; to leave"];
    for (const value of fallback) {
      if (distractors.length >= 3) break;
      if (normalizeAnswer(value) !== normalizeAnswer(correct) && !distractors.includes(value)) {
        distractors.push(value);
      }
    }
  }
  return shuffle([...distractors.slice(0, 3), correct]);
}

function buildFrenchChoices(item) {
  const correct = normalizeFrench(item.french);
  const sessionPool = getSessionUniqueItems()
    .filter((candidate) => candidate.id !== item.id)
    .map((candidate) => normalizeFrench(candidate.french))
    .filter(Boolean);
  const masteryPool = Object.values(getMastery())
    .map((record) => normalizeFrench(record?.item?.french))
    .filter(Boolean)
    .filter((value) => normalizeAnswer(value) !== normalizeAnswer(correct));
  const distractors = shuffle([...new Set([...sessionPool, ...masteryPool])])
    .filter((value) => normalizeAnswer(value) !== normalizeAnswer(correct))
    .slice(0, 3);
  for (const fallback of ["avoir", "faire", "venir", "prendre", "savoir"]) {
    if (distractors.length >= 3) break;
    if (!distractors.includes(fallback) && normalizeAnswer(fallback) !== normalizeAnswer(correct)) distractors.push(fallback);
  }
  return shuffle([...distractors.slice(0, 3), correct]);
}

function normalizeStage(stage) {
  return ({ zh: "recognize", en: "recall", spell: "active" })[stage] || stage;
}

function buildWordTask(item, stage) {
  const normalizedStage = normalizeStage(stage);
  if (normalizedStage === "recognize") {
    const source = Array.isArray(item.choices) && item.choices.length >= 4
      ? item.choices
      : [item.chinese];
    return { item, stage: normalizedStage, options: shuffle(source) };
  }
  if (normalizedStage === "recall") {
    return { item, stage: normalizedStage, options: buildFrenchChoices(item) };
  }
  return { item, stage: normalizedStage === "assisted" ? "assisted" : "active" };
}

function emptySessionStats() {
  return { attempts: 0, correct: 0, failedIds: [], spellingErrors: 0 };
}

function saveActiveStudySession() {
  if (!state.activeStudySessionKey || !["word", "review"].includes(state.studyType)) return;
  const existing = safeParse(localStorage.getItem(state.activeStudySessionKey), {});
  localStorage.setItem(
    state.activeStudySessionKey,
    JSON.stringify({
      ...existing,
      mode: state.studyType,
      queue: state.studyItems,
      index: state.studyIndex,
      targetCount: state.studyTargetCount,
      completedIds: state.studyCompletedIds,
      sessionStats: state.sessionStats,
      updatedAt: new Date().toISOString(),
    })
  );
}

async function fetchNewStudyItems(book, quantity, day) {
  const mastery = getMastery();
  const masteredIds = new Set(Object.keys(mastery));
  const collected = [];
  const seen = new Set();

  for (let batch = 0; batch < 20 && collected.length < quantity; batch += 1) {
    const items = await api(
      `/api/words?book=${encodeURIComponent(book)}&limit=200&shuffle=true&day=${encodeURIComponent(`${day}:${batch}`)}`
    );
    for (const item of items) {
      if (masteredIds.has(item.id) || seen.has(item.id)) continue;
      seen.add(item.id);
      collected.push(item);
      if (collected.length >= quantity) break;
    }
  }
  return collected;
}

async function startWordStudy() {
  const book = els.bookSelect.value;
  const quantity = Number(els.studyQuantity.value);
  const day = localDateKey();
  const key = studySessionKey(book, quantity, day);
  const saved = safeParse(localStorage.getItem(key), null);

  if (saved?.queue?.length) {
    state.studyItems = saved.queue;
    state.studyIndex = Math.min(Number(saved.index) || 0, saved.queue.length);
    state.studyTargetCount = Number(saved.targetCount) || 0;
    state.studyCompletedIds = Array.isArray(saved.completedIds) ? saved.completedIds : [];
    state.sessionStats = saved.sessionStats ?? emptySessionStats();
  } else {
    const items = await fetchNewStudyItems(book, quantity, day);
    state.studyItems = items.map((item) => buildWordTask(item, "recognize"));
    state.studyIndex = 0;
    state.studyTargetCount = items.length;
    state.studyCompletedIds = [];
    state.sessionStats = emptySessionStats();
    localStorage.setItem(
      key,
      JSON.stringify({
        mode: "word",
        queue: state.studyItems,
        index: 0,
        targetCount: items.length,
        completedIds: [],
        sessionStats: state.sessionStats,
        createdAt: new Date().toISOString(),
      })
    );
  }

  state.activeStudySessionKey = key;
  state.studyType = "word";
  state.returnView = "learn";
  showView("study");
  renderStudyQuestion();
}

function startReview() {
  const day = localDateKey();
  const key = reviewSessionKey(day);
  const saved = safeParse(localStorage.getItem(key), null);

  if (saved?.queue?.length) {
    state.studyItems = saved.queue;
    state.studyIndex = Math.min(Number(saved.index) || 0, saved.queue.length);
    state.studyTargetCount = Number(saved.targetCount) || 0;
    state.studyCompletedIds = Array.isArray(saved.completedIds) ? saved.completedIds : [];
    state.sessionStats = saved.sessionStats ?? emptySessionStats();
  } else {
    const due = dueReviewRecords(day);
    if (!due.length) {
      els.reviewStatus.textContent = "今天没有到期复习词汇。";
      return;
    }
    const items = shuffle(due.map((record) => record.item));
    state.studyItems = items.map((item) => buildWordTask(item, "recall"));
    state.studyIndex = 0;
    state.studyTargetCount = items.length;
    state.studyCompletedIds = [];
    state.sessionStats = emptySessionStats();
    localStorage.setItem(
      key,
      JSON.stringify({
        mode: "review",
        queue: state.studyItems,
        index: 0,
        targetCount: items.length,
        completedIds: [],
        sessionStats: state.sessionStats,
        createdAt: new Date().toISOString(),
      })
    );
  }

  els.reviewStatus.textContent = "";
  state.activeStudySessionKey = key;
  state.studyType = "review";
  state.returnView = "learn";
  showView("study");
  renderStudyQuestion();
}

async function startGrammarStudy() {
  const mode = encodeURIComponent(els.grammarMode.value);
  state.studyItems = await api(`/api/grammar?mode=${mode}&limit=30&shuffle=true`);
  state.studyType = "grammar";
  state.returnView = "grammar";
  state.studyIndex = 0;
  state.studyTargetCount = state.studyItems.length;
  state.studyCompletedIds = [];
  state.sessionStats = emptySessionStats();
  state.activeStudySessionKey = null;
  showView("study");
  renderStudyQuestion();
}

function renderWordProgress() {
  const completed = state.studyCompletedIds.length;
  const total = Math.max(1, state.studyTargetCount);
  els.studyProgressLabel.textContent = `${completed} / ${state.studyTargetCount}`;
  els.studyProgressBar.style.width = `${Math.min(100, (completed / total) * 100)}%`;
}

function resetAnswerReveal() {
  if (els.studyAnswerReveal) {
    els.studyAnswerReveal.hidden = true;
    els.studyAnswerReveal.innerHTML = "";
  }
  els.studyResponseLayout?.classList.remove("has-answer");
}

function showAnswerReveal(item, correctAnswer) {
  if (!els.studyAnswerReveal) return;
  els.studyAnswerReveal.innerHTML = `
    <span class="answer-reveal-label">Correct answer</span>
    <strong class="answer-reveal-value">${escapeHtml(correctAnswer)}</strong>
    <small class="answer-reveal-note">${escapeHtml(item?.explanation || item?.english || item?.chinese || "Try this one again later.")}</small>
  `;
  els.studyAnswerReveal.hidden = false;
  els.studyResponseLayout?.classList.add("has-answer");
}

function renderSessionComplete() {
  els.studyQuestionPanel.hidden = true;
  els.sessionComplete.hidden = false;
  els.studyStar.hidden = true;
  const attempts = Number(state.sessionStats.attempts) || 0;
  const correct = Number(state.sessionStats.correct) || 0;
  const accuracy = attempts ? Math.round((correct / attempts) * 100) : 100;
  els.completeWords.textContent = String(state.studyTargetCount);
  els.completeAccuracy.textContent = `${accuracy}%`;
  els.completeMastered.textContent = String(state.studyType === "word" ? state.studyCompletedIds.length : 0);
  els.completeReview.textContent = String(new Set(state.sessionStats.failedIds || []).size);
  els.completeSpellingErrors.textContent = String(state.sessionStats.spellingErrors || 0);
  if (state.activeStudySessionKey) localStorage.removeItem(state.activeStudySessionKey);
  state.activeStudySessionKey = null;
  renderReviewSummary();
}

function renderStudyQuestion() {
  const current = state.studyItems[state.studyIndex];
  if (!current) {
    renderSessionComplete();
    if (["word", "review"].includes(state.studyType)) renderWordProgress();
    return;
  }

  els.studyQuestionPanel.hidden = false;
  els.sessionComplete.hidden = true;
  state.answered = false;
  els.studyFeedback.textContent = "";
  els.studyNext.hidden = true;
  resetAnswerReveal();

  if (["word", "review"].includes(state.studyType)) {
    renderWordProgress();
    renderWordTask(current);
    updateStudyStar(current.item);
    return;
  }

  const item = current;
  const position = state.studyIndex + 1;
  const total = state.studyItems.length;
  els.studyProgressLabel.textContent = `${position} / ${total}`;
  els.studyProgressBar.style.width = `${(position / total) * 100}%`;
  els.studyKicker.textContent = item.mode_label;
  els.studyMain.classList.add("grammar-question");
  els.studyMain.textContent = item.sentence;
  els.studyMeta.innerHTML = `${escapeHtml(item.instruction)} · <span class="underlined-hint">${escapeHtml(item.underlined)}</span>`;
  els.studyContext.textContent = "选择最合适的答案。";
  updateStudyStar(null);
  renderOptions(shuffle(item.options), item.answer, item, null);
}

function renderWordTask(task) {
  const item = task.item;
  els.studyMain.classList.remove("grammar-question");
  els.studyOptions.innerHTML = "";
  els.studyKicker.textContent = "";
  els.studyContext.textContent = "";

  task.stage = normalizeStage(task.stage);

  if (task.stage === "recognize") {
    els.studyMain.textContent = normalizeFrench(item.french);
    els.studyMeta.textContent = [item.phonetic, item.part_of_speech].filter(Boolean).join(" · ");
    els.studyContext.textContent = "认识 · 选择最贴近的中文释义";
    renderOptions(task.options, item.chinese, item, task);
    return;
  }

  if (task.stage === "recall") {
    els.studyMain.textContent = item.chinese || item.english || "回忆这个单词";
    els.studyMeta.textContent = [item.english, item.part_of_speech].filter(Boolean).join(" · ");
    els.studyContext.textContent = "回忆 · 找出对应的法语单词";
    renderOptions(task.options, item.french, item, task);
    return;
  }

  els.studyMain.textContent = item.chinese || item.english || "拼写法语单词";
  els.studyMeta.textContent = [item.english, item.part_of_speech].filter(Boolean).join(" · ");
  if (task.stage === "assisted") {
    const letters = Array.from(normalizeFrench(item.french));
    els.studyContext.textContent = `辅助拼写 · 首字母 ${letters[0] || "—"} · ${letters.length} letters`;
  } else {
    els.studyContext.textContent = "主动拼写 · 不使用提示写出完整单词";
  }
  renderStudySpelling(task);
}

function renderOptions(options, correctAnswer, item, task) {
  els.studyOptions.innerHTML = "";
  options.forEach((option, index) => {
    const button = document.createElement("button");
    button.className = "option-card";
    button.type = "button";
    button.dataset.optionValue = option;
    button.dataset.optionIndex = String(index + 1);
    button.setAttribute("aria-keyshortcuts", String(index + 1));
    const label = document.createElement("span");
    label.className = "option-label";
    label.textContent = option;
    button.appendChild(label);

    const meaning = optionMeaning(option, item, task);
    if (meaning) {
      const detail = document.createElement("span");
      detail.className = "option-meaning";
      detail.textContent = meaning;
      detail.hidden = true;
      button.appendChild(detail);
    }
    button.addEventListener("click", () => gradeStudyAnswer(button, option, correctAnswer, item, task));
    els.studyOptions.appendChild(button);
  });
}

function optionMeaning(option, item, task) {
  if (!task || !["word", "review"].includes(state.studyType)) return "";
  const stage = normalizeStage(task.stage);
  if (stage === "recognize") {
    const detail = item.choice_details?.find(
      (choice) => normalizeAnswer(choice.label) === normalizeAnswer(option)
    );
    return detail ? [normalizeFrench(detail.french), detail.english].filter(Boolean).join(" · ") : "";
  }

  if (stage === "recall") {
    const candidates = [
      item,
      ...getSessionUniqueItems(),
      ...Object.values(getMastery()).map((record) => record?.item),
    ].filter(Boolean);
    const candidate = candidates.find(
      (entry) => normalizeAnswer(entry.french) === normalizeAnswer(option)
    );
    if (candidate) return candidate.chinese || candidate.english || "";
    return {
      avoir: "有；拥有",
      faire: "做；制作",
      venir: "来",
      prendre: "拿；取",
      savoir: "知道；会",
    }[normalizeAnswer(option)] || "";
  }
  return "";
}

function revealOptionMeanings(buttons) {
  buttons.forEach((button) => {
    const meaning = button.querySelector(".option-meaning");
    if (meaning) meaning.hidden = false;
  });
}

function renderStudySpelling(task) {
  els.studyOptions.innerHTML = "";
  els.studyOptions.classList.add("spelling-stage");

  const form = document.createElement("div");
  form.className = "study-spelling-form";

  const input = document.createElement("input");
  input.className = "study-spelling-input";
  input.type = "text";
  input.autocomplete = "off";
  input.autocapitalize = "none";
  input.spellcheck = false;
  input.placeholder = "输入法语单词";
  input.setAttribute("aria-label", "输入法语单词");
  if (task.stage === "assisted") {
    input.placeholder = `${Array.from(normalizeFrench(task.item.french))[0] || ""}…`;
  }

  const submit = document.createElement("button");
  submit.className = "primary-action study-spelling-submit";
  submit.type = "button";
  submit.textContent = "确认";

  const grade = () => gradeStudySpelling(task, input, submit);
  submit.addEventListener("click", grade);
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    grade();
  });

  form.append(input, submit);
  els.studyOptions.appendChild(form);
  window.setTimeout(() => input.focus(), 0);
}

function clearStudyStageClass() {
  els.studyOptions.classList.remove("spelling-stage");
}

function requeueWordTask(task, isCorrect) {
  task.stage = normalizeStage(task.stage);
  if (isCorrect) {
    if (task.stage === "recognize") state.studyItems.push(buildWordTask(task.item, "recall"));
    if (task.stage === "recall") state.studyItems.push(buildWordTask(task.item, "assisted"));
    if (task.stage === "assisted") state.studyItems.push(buildWordTask(task.item, "active"));
    if (task.stage === "active") completeWordCycle(task.item);
  } else {
    state.studyItems.push({ ...task, options: Array.isArray(task.options) ? shuffle(task.options) : task.options });
  }
  saveActiveStudySession();
}

function completeWordCycle(item) {
  if (!state.studyCompletedIds.includes(item.id)) state.studyCompletedIds.push(item.id);
  const mastery = getMastery();
  const today = localDateKey();
  const existing = mastery[item.id];

  if (state.studyType === "review") {
    const previousReviews = Number(existing?.reviews) || 0;
    const newReviews = previousReviews + 1;
    const intervalIndex = Math.min(newReviews, REVIEW_INTERVAL_DAYS.length - 1);
    const intervalDays = REVIEW_INTERVAL_DAYS[intervalIndex];
    mastery[item.id] = {
      ...(existing ?? {}),
      item,
      learnedAt: existing?.learnedAt ?? today,
      reviews: newReviews,
      lastReviewedAt: today,
      intervalDays,
      nextReview: addDays(today, intervalDays),
    };
  } else {
    mastery[item.id] = {
      ...(existing ?? {}),
      item,
      learnedAt: existing?.learnedAt ?? today,
      reviews: Number(existing?.reviews) || 0,
      intervalDays: REVIEW_INTERVAL_DAYS[0],
      nextReview: existing?.nextReview ?? addDays(today, REVIEW_INTERVAL_DAYS[0]),
    };
    recordLearnedWord(item.id);
  }

  saveMastery(mastery);
  renderReviewSummary();
}

function recordSessionAttempt(item, isCorrect, isSpelling = false) {
  state.sessionStats.attempts += 1;
  if (isCorrect) state.sessionStats.correct += 1;
  if (!isCorrect && item?.id && ["word", "review"].includes(state.studyType)) {
    if (!state.sessionStats.failedIds.includes(item.id)) state.sessionStats.failedIds.push(item.id);
  }
  if (!isCorrect && isSpelling) state.sessionStats.spellingErrors += 1;
}

function gradeStudyAnswer(selectedButton, selected, correctAnswer, item, task) {
  if (state.answered) return;
  state.answered = true;
  clearStudyStageClass();

  const buttons = [...els.studyOptions.querySelectorAll(".option-card")];
  buttons.forEach((button) => {
    button.disabled = true;
    if (normalizeAnswer(button.dataset.optionValue) === normalizeAnswer(correctAnswer)) {
      button.classList.add("correct");
    }
  });

  const isCorrect = normalizeAnswer(selected) === normalizeAnswer(correctAnswer);
  if (!isCorrect) {
    selectedButton.classList.remove("correct");
    selectedButton.classList.add("wrong");
    revealOptionMeanings(buttons);
  }

  recordSessionAttempt(item, isCorrect, false);

  if (["word", "review"].includes(state.studyType) && task) {
    requeueWordTask(task, isCorrect);
  }

  els.studyFeedback.textContent = "";
  els.studyNext.hidden = false;
}

function gradeStudySpelling(task, input, submit) {
  if (state.answered) return;
  const received = normalizeAnswer(input.value);
  if (!received) return;

  state.answered = true;
  const expected = normalizeAnswer(task.item.french);
  const isCorrect = received === expected;
  input.disabled = true;
  submit.disabled = true;
  input.classList.add(isCorrect ? "correct-input" : "wrong-input");
  recordSessionAttempt(task.item, isCorrect, true);
  if (!isCorrect) showAnswerReveal(task.item, task.item.french);
  requeueWordTask(task, isCorrect);
  els.studyFeedback.textContent = "";
  els.studyNext.hidden = false;
}

function nextStudyQuestion() {
  state.studyIndex += 1;
  clearStudyStageClass();
  saveActiveStudySession();
  renderStudyQuestion();
}

function bindStudyKeyboard() {
  document.addEventListener("keydown", (event) => {
    if (state.currentView !== "study") return;
    const activeTag = document.activeElement?.tagName;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(activeTag)) return;

    if (!state.answered && ["1", "2", "3", "4"].includes(event.key)) {
      const button = els.studyOptions.querySelectorAll(".option-card")[Number(event.key) - 1];
      if (button && !button.disabled) {
        event.preventDefault();
        button.click();
      }
      return;
    }

    if (!state.answered && ["Numpad1", "Numpad2", "Numpad3", "Numpad4"].includes(event.code)) {
      const index = Number(event.code.replace("Numpad", "")) - 1;
      const button = els.studyOptions.querySelectorAll(".option-card")[index];
      if (button && !button.disabled) {
        event.preventDefault();
        button.click();
      }
      return;
    }

    if (event.key === "Enter" && state.answered && !els.studyNext.hidden) {
      event.preventDefault();
      nextStudyQuestion();
    }
  });
}

function getStudyStats() {
  const value = safeParse(localStorage.getItem(STORAGE.studyStats), {});
  return value && typeof value === "object" ? value : {};
}

function recordLearnedWord(itemId) {
  if (!itemId) return;
  const stats = getStudyStats();
  const date = localDateKey();
  const day = stats[date] ?? { ids: [] };
  const ids = new Set(Array.isArray(day.ids) ? day.ids : []);
  ids.add(itemId);
  stats[date] = { ids: [...ids] };
  localStorage.setItem(STORAGE.studyStats, JSON.stringify(stats));
  renderLearningStats();
}

function lastNDates(count) {
  const dates = [];
  const now = new Date();
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    dates.push(date);
  }
  return dates;
}

function renderLearningStats() {
  if (!els.studyBarChart || !els.attendanceBubbles) return;
  const stats = getStudyStats();
  const studiedDates = Object.keys(stats)
    .filter((key) => Array.isArray(stats[key]?.ids) && stats[key].ids.length > 0)
    .sort();

  const total = studiedDates.length;
  const dotSize = total <= 24 ? 58 : total <= 60 ? 38 : total <= 120 ? 24 : 15;
  const maxRadius = total <= 1 ? 0 : 36;

  els.attendanceBubbles.innerHTML = studiedDates
    .map((key, index) => {
      const count = stats[key].ids.length;
      const ratio = total <= 1 ? 0 : index / Math.max(1, total - 1);
      const radius = Math.sqrt(ratio) * maxRadius;
      const angle = index * 137.508 * Math.PI / 180;
      const x = 50 + Math.cos(angle) * radius;
      const y = 55 + Math.sin(angle) * radius * 0.72;
      const opacity = 0.38 + ((index % 5) * 0.10);
      return `<span class="attendance-dot" title="${key} · ${count} 词" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;width:${dotSize}px;opacity:${Math.min(.9, opacity).toFixed(2)}"></span>`;
    })
    .join("");

  els.attendanceBubbles.setAttribute("aria-label", `累计打卡 ${total} 天`);

  const recent = lastNDates(45).map((date) => {
    const key = localDateKey(date);
    const count = Array.isArray(stats[key]?.ids) ? stats[key].ids.length : 0;
    return { date, key, count };
  });
  const max = Math.max(1, ...recent.map((item) => item.count));
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  els.studyBarChart.innerHTML = recent
    .map((item) => {
      const height = item.count === 0 ? 4 : Math.max(8, Math.round((item.count / max) * 92));
      const label = `${item.date.getMonth() + 1}/${item.date.getDate()}`;
      return `<span class="learning-bar" data-label="${label}" title="${item.key}: ${item.count} words" style="height:${height}%" aria-label="${weekday[item.date.getDay()]} ${item.count} words"></span>`;
    })
    .join("");
}

function spellingSessionKey(book, dateKey = localDateKey()) {
  return `${STORAGE.spellingSessionPrefix}:${dateKey}:${book}`;
}

function getSpellingSession() {
  if (!state.activeSpellingSessionKey) return null;
  return safeParse(localStorage.getItem(state.activeSpellingSessionKey), null);
}

function saveSpellingSession(session) {
  if (!state.activeSpellingSessionKey) return;
  localStorage.setItem(state.activeSpellingSessionKey, JSON.stringify(session));
}

async function loadSpellingItems() {
  if (!els.bookSelect?.value) return;

  const book = els.bookSelect.value;
  const day = localDateKey();
  const key = spellingSessionKey(book, day);
  const saved = safeParse(localStorage.getItem(key), null);
  const bookMeta = state.books.find((item) => item.id === book);
  const requestedCount = Math.min(6000, Math.max(1, Number(bookMeta?.count) || 6000));

  // Spelling now covers the complete selected CEFR book.
  // Existing answers are preserved when upgrading an older 20-word session.
  if (saved?.items?.length === requestedCount) {
    state.spellingItems = saved.items;
  } else {
    state.spellingItems = await api(
      `/api/spelling?book=${encodeURIComponent(book)}&limit=${requestedCount}&shuffle=true&day=${encodeURIComponent(day)}`
    );

    localStorage.setItem(
      key,
      JSON.stringify({
        items: state.spellingItems,
        answers: saved?.answers ?? {},
        graded: saved?.graded ?? {},
        updatedAt: new Date().toISOString(),
      })
    );
  }

  state.activeSpellingSessionKey = key;
  renderSpelling();
}

function currentSpellingPrompt(item) {
  if (state.spellingLanguage === "french") {
    return normalizeFrench(item.french) || "—";
  }
  if (state.spellingLanguage === "english") {
    return item.english || "—";
  }
  return item.chinese || "—";
}

function currentSpellingAnswer(item) {
  if (state.spellingLanguage === "french") {
    return item.english || "";
  }
  return normalizeFrench(item.french);
}

function spellingAnswerKey(itemId) {
  return `${state.spellingLanguage}:${itemId}`;
}

function renderSpellingCorrection(container, received, expected) {
  if (!container) return;
  const receivedLetters = Array.from(normalizeAnswer(received));
  const expectedLetters = Array.from(normalizeFrench(expected));
  container.innerHTML = `
    <span>Correct</span>
    <strong class="spelling-correction-word">${expectedLetters.map((letter, index) => {
      const matches = normalizeAnswer(receivedLetters[index] || "") === normalizeAnswer(letter);
      return `<i class="${matches ? "matching-letter" : "different-letter"}">${letter === " " ? "&nbsp;" : escapeHtml(letter)}</i>`;
    }).join("")}</strong>
  `;
  container.hidden = false;
}

function renderSpelling() {
  const session = getSpellingSession() ?? { answers: {}, graded: {} };
  const answers = session.answers ?? {};
  const graded = session.graded ?? {};
  els.spellingLanguageTabs.hidden = false;
  els.spellingList.innerHTML = "";

  state.spellingItems.forEach((item) => {
    const storageKey = spellingAnswerKey(item.id);
    const expectedAnswer = currentSpellingAnswer(item);

    const row = document.createElement("div");
    row.className = "spelling-row";
    row.dataset.itemId = item.id;
    row.dataset.storageKey = storageKey;
    row.dataset.answer = normalizeFrench(expectedAnswer);

    if (graded[storageKey] === "correct") row.classList.add("correct");
    if (graded[storageKey] === "wrong") row.classList.add("wrong");

    const prompt = document.createElement("div");
    prompt.className = "spelling-prompt";
    prompt.textContent = normalizeFrench(currentSpellingPrompt(item));

    const answerBox = document.createElement("div");
    answerBox.className = "spelling-answer";

    const input = document.createElement("input");
    input.className = "spelling-input";
    input.type = "text";
    input.autocomplete = "off";
    input.autocapitalize = "none";
    input.spellcheck = false;
    input.placeholder = "";
    input.value = answers[storageKey] ?? "";

    const correction = document.createElement("div");
    correction.className = "spelling-correction";
    correction.hidden = true;
    if (graded[storageKey] === "wrong") renderSpellingCorrection(correction, input.value, expectedAnswer);

    const answerLanguage = state.spellingLanguage === "french" ? "英文释义" : "法语拼写";
    input.setAttribute("aria-label", `${prompt.textContent} 的${answerLanguage}`);

    input.addEventListener("input", () => {
      const current = getSpellingSession() ?? {
        items: state.spellingItems,
        answers: {},
        graded: {},
      };
      current.answers = current.answers ?? {};
      current.graded = current.graded ?? {};
      current.answers[storageKey] = input.value;
      delete current.graded[storageKey];
      current.updatedAt = new Date().toISOString();
      saveSpellingSession(current);
      row.classList.remove("correct", "wrong");
      correction.hidden = true;
      correction.innerHTML = "";
      showSpellingStatus("已自动保存");
    });

    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      gradeSpelling(row, input, storageKey);
    });

    answerBox.append(input, correction);
    row.append(prompt, answerBox);
    els.spellingList.appendChild(row);
  });
}

function gradeSpelling(row, input, storageKey) {
  const expected = normalizeAnswer(row.dataset.answer);
  const received = normalizeAnswer(input.value);
  const isCorrect = received === expected;

  row.classList.remove("correct", "wrong");
  row.classList.add(isCorrect ? "correct" : "wrong");

  if (isCorrect) {
    input.removeAttribute("title");
    const correction = row.querySelector(".spelling-correction");
    if (correction) correction.hidden = true;
  } else {
    input.title = `正确答案：${row.dataset.answer}`;
    renderSpellingCorrection(row.querySelector(".spelling-correction"), input.value, row.dataset.answer);
  }

  const current = getSpellingSession() ?? {
    items: state.spellingItems,
    answers: {},
    graded: {},
  };
  current.answers = current.answers ?? {};
  current.graded = current.graded ?? {};
  current.answers[storageKey] = input.value;
  current.graded[storageKey] = isCorrect ? "correct" : "wrong";
  current.updatedAt = new Date().toISOString();
  saveSpellingSession(current);

  const nextInput = row.nextElementSibling?.querySelector(".spelling-input");
  if (nextInput) nextInput.focus();
}

let spellingStatusTimer = null;
function showSpellingStatus(message) {
  els.spellingSaveStatus.textContent = message;
  window.clearTimeout(spellingStatusTimer);
  spellingStatusTimer = window.setTimeout(() => {
    els.spellingSaveStatus.textContent = "";
  }, 1400);
}

function saveSpellingProgress() {
  const current = getSpellingSession();
  if (!current) return;
  current.updatedAt = new Date().toISOString();
  saveSpellingSession(current);
  showSpellingStatus("已保存");
}

function clearSpellingProgress() {
  const current = getSpellingSession();
  if (!current) return;
  current.answers = {};
  current.graded = {};
  current.updatedAt = new Date().toISOString();
  saveSpellingSession(current);
  renderSpelling();
  showSpellingStatus("已清空");
}

function bindSpellingTabs() {
  els.promptTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.spellingLanguage = tab.dataset.language;
      els.promptTabs.forEach((item) => item.classList.toggle("active", item === tab));
      renderSpelling();
    });
  });
}

function wordMasteryStatus(item, mastery = getMastery()) {
  const record = mastery[item.id];
  if (!record) return "new";
  return Number(record.reviews) >= 2 ? "mastered" : "learning";
}

function renderWordBrowserBooks() {
  if (!els.wordBrowserBooks) return;
  els.wordBrowserBooks.innerHTML = state.books.map((book) => `
    <button class="browser-book-chip${book.id === state.wordBrowserBook ? " active" : ""}" type="button" data-book="${escapeHtml(book.id)}">
      ${escapeHtml(book.name)}
    </button>
  `).join("");
  els.wordBrowserBooks.querySelectorAll(".browser-book-chip").forEach((button) => {
    button.addEventListener("click", () => loadWordBrowser(button.dataset.book).catch(console.error));
  });
}

async function loadWordBrowser(book = els.bookSelect?.value) {
  if (!book) return;
  state.wordBrowserBook = book;
  state.wordBrowserVisible = 200;
  renderWordBrowserBooks();
  if (els.wordBrowserSummary) els.wordBrowserSummary.textContent = "Loading words…";
  const bookMeta = state.books.find((item) => item.id === book);
  const limit = Math.min(10000, Math.max(1, Number(bookMeta?.count) || 10000));
  state.wordBrowserItems = await api(`/api/spelling?book=${encodeURIComponent(book)}&limit=${limit}&shuffle=false`);
  renderWordBrowser();
}

function renderWordBrowser() {
  if (!els.wordBrowserList) return;
  const mastery = getMastery();
  const starred = getStarredWords();
  const query = normalizeAnswer(els.wordBrowserSearch?.value || "");
  const status = els.wordBrowserStatus?.value || "all";
  const starredFilter = els.wordBrowserStarred?.value || "all";
  const sort = els.wordBrowserSort?.value || "alphabetical";

  const filtered = state.wordBrowserItems.filter((item) => {
    const haystack = normalizeAnswer([item.french, item.chinese, item.english, item.part_of_speech].join(" "));
    if (query && !haystack.includes(query)) return false;
    if (status !== "all" && wordMasteryStatus(item, mastery) !== status) return false;
    if (starredFilter === "starred" && !starred[item.id]) return false;
    return true;
  });

  filtered.sort((a, b) => {
    if (sort === "mastery") {
      const aScore = mastery[a.id] ? (Number(mastery[a.id].reviews) || 0) + 1 : 0;
      const bScore = mastery[b.id] ? (Number(mastery[b.id].reviews) || 0) + 1 : 0;
      if (aScore !== bScore) return bScore - aScore;
    }
    return normalizeFrench(a.french).localeCompare(normalizeFrench(b.french), "fr");
  });

  const visible = filtered.slice(0, state.wordBrowserVisible);
  const bookName = state.books.find((book) => book.id === state.wordBrowserBook)?.name || "Current book";
  if (els.wordBrowserSummary) els.wordBrowserSummary.textContent = `${bookName} · ${filtered.length} words`;
  els.wordBrowserList.innerHTML = visible.length ? visible.map((item) => {
    const itemStatus = wordMasteryStatus(item, mastery);
    const active = Boolean(starred[item.id]);
    return `
      <article class="drawer-word" data-item-id="${escapeHtml(item.id)}">
        <button class="drawer-star${active ? " active" : ""}" type="button" aria-label="${active ? "取消收藏" : "收藏"} ${escapeHtml(item.french)}">${active ? "★" : "☆"}</button>
        <strong>${escapeHtml(normalizeFrench(item.french))}</strong>
        <span>${escapeHtml(item.chinese || "—")}</span>
        <small>${escapeHtml([item.part_of_speech, item.english, itemStatus].filter(Boolean).join(" · "))}</small>
      </article>
    `;
  }).join("") : '<p class="drawer-empty">No words match these filters.</p>';

  els.wordBrowserList.querySelectorAll(".drawer-star").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.wordBrowserItems.find((entry) => entry.id === button.closest(".drawer-word")?.dataset.itemId);
      if (item) {
        toggleStarred(item);
        renderWordBrowser();
      }
    });
  });
  if (els.wordBrowserMore) {
    els.wordBrowserMore.hidden = visible.length >= filtered.length;
    els.wordBrowserMore.textContent = `Load more · ${visible.length}/${filtered.length}`;
  }
}

function toggleWordBrowser(force) {
  if (!els.wordBrowserDrawer) return;
  const shouldOpen = typeof force === "boolean" ? force : els.wordBrowserDrawer.hidden;
  els.wordBrowserDrawer.hidden = !shouldOpen;
  if (shouldOpen) loadWordBrowser(state.wordBrowserBook || els.bookSelect?.value).catch(console.error);
}

function bindWordBrowser() {
  els.openWordBrowser?.addEventListener("click", () => toggleWordBrowser(true));
  els.closeWordBrowser?.addEventListener("click", () => toggleWordBrowser(false));
  [els.wordBrowserSearch, els.wordBrowserStatus, els.wordBrowserStarred, els.wordBrowserSort]
    .filter(Boolean)
    .forEach((control) => control.addEventListener("input", () => {
      state.wordBrowserVisible = 200;
      renderWordBrowser();
    }));
  els.wordBrowserMore?.addEventListener("click", () => {
    state.wordBrowserVisible += 200;
    renderWordBrowser();
  });
}

function hexToRgb(value) {
  const hex = String(value || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
}

function getTheme() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE.theme) || "{}");
    const legacyTheme = stored.theme === "#f2f3f4" && !stored.accent1 && !stored.accent2;
    return {
      ...DEFAULT_THEME,
      ...stored,
      theme: legacyTheme ? DEFAULT_THEME.theme : (stored.theme || DEFAULT_THEME.theme),
      accent1: stored.accent1 || DEFAULT_THEME.accent1,
      accent2: stored.accent2 || stored.accent || DEFAULT_THEME.accent2,
      accent3: stored.accent3 || DEFAULT_THEME.accent3,
    };
  } catch {
    return { ...DEFAULT_THEME };
  }
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty("--theme", theme.theme);
  root.style.setProperty("--page-dark", theme.theme);
  root.style.setProperty("--accent-1", theme.accent1);
  root.style.setProperty("--accent-2", theme.accent2);
  root.style.setProperty("--accent-3", theme.accent3);
  root.style.setProperty("--accent", theme.accent2);
  root.style.setProperty("--correct", theme.correct);
  root.style.setProperty("--wrong", theme.wrong);

  const accent1Rgb = hexToRgb(theme.accent1);
  const accent2Rgb = hexToRgb(theme.accent2);
  const accent3Rgb = hexToRgb(theme.accent3);
  if (accent1Rgb) root.style.setProperty("--accent-1-rgb", accent1Rgb.join(", "));
  if (accent2Rgb) root.style.setProperty("--accent-2-rgb", accent2Rgb.join(", "));
  if (accent3Rgb) root.style.setProperty("--accent-3-rgb", accent3Rgb.join(", "));

  if (els.themeColor) els.themeColor.value = theme.theme;
  if (els.accentColor) els.accentColor.value = theme.accent1;
  if (els.accent2Color) els.accent2Color.value = theme.accent2;
  if (els.accent3Color) els.accent3Color.value = theme.accent3;
  if (els.correctColor) els.correctColor.value = theme.correct;
  if (els.wrongColor) els.wrongColor.value = theme.wrong;
}

function saveTheme() {
  const theme = {
    theme: els.themeColor?.value || DEFAULT_THEME.theme,
    accent1: els.accentColor?.value || DEFAULT_THEME.accent1,
    accent2: els.accent2Color?.value || DEFAULT_THEME.accent2,
    accent3: els.accent3Color?.value || DEFAULT_THEME.accent3,
    correct: els.correctColor?.value || DEFAULT_THEME.correct,
    wrong: els.wrongColor?.value || DEFAULT_THEME.wrong,
  };
  localStorage.setItem(STORAGE.theme, JSON.stringify(theme));
  applyTheme(theme);
}

function bindThemeSettings() {
  [els.themeColor, els.accentColor, els.accent2Color, els.accent3Color, els.correctColor, els.wrongColor]
    .filter(Boolean)
    .forEach((input) => input.addEventListener("input", saveTheme));

  els.resetTheme?.addEventListener("click", () => {
    localStorage.removeItem(STORAGE.theme);
    applyTheme(DEFAULT_THEME);
  });
}

function bindColorSwatches() {
  document.querySelectorAll(".color-control").forEach((label) => {
    const input = label.querySelector('input[type="color"]');
    const swatch = label.querySelector(".color-swatch");
    if (!input || !swatch) return;
    swatch.addEventListener("click", () => input.click());
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function init() {
  bindNavigation();
  bindSpellingTabs();
  bindStudyKeyboard();
  bindThemeSettings();
  bindColorSwatches();
  bindOrbitDashboard();
  bindWordBrowser();
  applyTheme(getTheme());

  setStudyQuantity(getStudyQuantity());
  setOrbitMode("checkins");
  els.studyQuantity?.addEventListener("input", () => setStudyQuantity(els.studyQuantity.value));

  els.bookSelect?.addEventListener("change", () => {
    loadSpellingItems().catch(console.error);
    if (els.wordBrowserDrawer && !els.wordBrowserDrawer.hidden) loadWordBrowser(els.bookSelect.value).catch(console.error);
  });
  els.startWordStudy?.addEventListener("click", () => startWordStudy().catch(console.error));
  els.startReview?.addEventListener("click", () => toggleReviewHub());
  els.closeReviewHub?.addEventListener("click", () => toggleReviewHub(false));
  els.startTodaysReview?.addEventListener("click", startReview);
  els.openStarred?.addEventListener("click", () => {
    if (!els.starredDrawer) return;
    els.starredDrawer.hidden = !els.starredDrawer.hidden;
    if (!els.starredDrawer.hidden) renderStarredDrawer();
  });
  els.startGrammarStudy?.addEventListener("click", () => startGrammarStudy().catch(console.error));
  els.studyBack?.addEventListener("click", () => {
    saveActiveStudySession();
    clearStudyStageClass();
    showView(state.returnView);
  });
  els.studyNext?.addEventListener("click", nextStudyQuestion);
  els.studyStar?.addEventListener("click", () => {
    const current = state.studyItems[state.studyIndex];
    const item = current?.item ?? current;
    if (item?.id) {
      toggleStarred(item);
      updateStudyStar(item);
    }
  });
  els.sessionDone?.addEventListener("click", () => showView(state.returnView));
  els.saveSpelling?.addEventListener("click", saveSpellingProgress);
  els.clearSpelling?.addEventListener("click", clearSpellingProgress);

  try {
    await loadBooks();
    await loadSpellingItems();
    renderLearningStats();
    renderReviewSummary();
  } catch (error) {
    console.error(error);
    document.querySelector("#app")?.insertAdjacentHTML(
      "afterbegin",
      '<p class="load-error">数据加载失败，请确认 Python 服务已经启动，并检查 CEFR 数据文件。</p>'
    );
  }
}

init();
