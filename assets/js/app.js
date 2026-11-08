import {
  CATEGORIES,
  CATEGORY_KEYS,
  TEMPLATES,
  addDays,
  buildICS,
  dayOfYear,
  dayStats,
  describeDay,
  downloadFile,
  ensureDay,
  formatCompactDuration,
  formatDurationCN,
  formatHeader,
  formatMonthLine,
  fromKey,
  getDay,
  isValidKey,
  loadState,
  makeBlock,
  minutesToInput,
  minutesToTime,
  nowMinutes,
  pad2,
  saveState,
  sanitizeState,
  snapMinutes,
  storageAvailable,
  templateBlocks,
  timeToMinutes,
  todayKey,
  weekdayCN,
} from "./data.js";
import { Dial } from "./dial.js";

const $ = (selector, root = document) => root.querySelector(selector);

const dom = {
  headerDate: $("#headerDate"),
  prevDay: $("#prevDay"),
  dateButton: $("#dateButton"),
  datePicker: $("#datePicker"),
  nextDay: $("#nextDay"),
  todayButton: $("#todayButton"),
  themeToggle: $("#themeToggle"),
  menuButton: $("#menuButton"),
  menuPanel: $("#menuPanel"),
  dial: $("#dial"),
  dialTooltip: $("#dialTooltip"),
  hubWeekday: $("#hubWeekday"),
  hubDay: $("#hubDay"),
  hubMonth: $("#hubMonth"),
  hubStat: $("#hubStat"),
  hubNow: $("#hubNow"),
  hubDoy: $("#hubDoy"),
  addButton: $("#addButton"),
  agendaList: $("#agendaList"),
  agendaCount: $("#agendaCount"),
  emptyState: $("#emptyState"),
  intentionInput: $("#intentionInput"),
  statPlanned: $("#statPlanned"),
  statFocus: $("#statFocus"),
  statDone: $("#statDone"),
  mixBar: $("#mixBar"),
  dayShape: $("#dayShape"),
  storageStatus: $("#storageStatus"),
  blockDialog: $("#blockDialog"),
  blockForm: $("#blockForm"),
  blockDialogKicker: $("#blockDialogKicker"),
  blockDialogTitle: $("#blockDialogTitle"),
  blockTitle: $("#blockTitle"),
  blockStart: $("#blockStart"),
  blockEnd: $("#blockEnd"),
  durationReadout: $("#durationReadout"),
  categoryPicker: $("#categoryPicker"),
  blockNote: $("#blockNote"),
  formError: $("#formError"),
  formNotice: $("#formNotice"),
  deleteBlock: $("#deleteBlock"),
  saveBlock: $("#saveBlock"),
  templatesDialog: $("#templatesDialog"),
  clearDay: $("#clearDay"),
  confirmDialog: $("#confirmDialog"),
  confirmTitle: $("#confirmTitle"),
  confirmCopy: $("#confirmCopy"),
  confirmOk: $("#confirmOk"),
  shortcutsDialog: $("#shortcutsDialog"),
  aboutDialog: $("#aboutDialog"),
  importInput: $("#importInput"),
  toast: $("#toast"),
};

const initialParams = new URLSearchParams(location.search);
let state = loadState();
let currentKey = isValidKey(initialParams.get("date")) ? initialParams.get("date") : todayKey();
let editingId = null;
let confirmResolver = null;
let toastTimer = null;
let intentionTimer = null;
let lastToday = todayKey();
let lastFocused = null;
const storageOk = storageAvailable();

const dial = new Dial(dom.dial, {
  tooltip: dom.dialTooltip,
  onCreate: (start, end, notice) => openBlockDialog({ start, end, notice }),
  onEdit: (id) => openBlockDialog({ id }),
});

/* ---------------------------------------------------------------- theme */

function applyTheme(theme) {
  const effective = theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.dataset.theme = effective;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = effective === "dark" ? "#111512" : "#E7E7E1";
  dom.themeToggle.setAttribute("aria-label", effective === "dark" ? "切换到浅色" : "切换到深色");
  dom.themeToggle.title = effective === "dark" ? "切换到浅色" : "切换到深色";
}

dom.themeToggle.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  state.theme = next;
  saveState(state);
  applyTheme(next);
});

matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
  if (!state.theme) applyTheme(null);
});

/* ---------------------------------------------------------------- render */

function render() {
  const day = getDay(state, currentKey);
  const isToday = currentKey === todayKey();

  dom.headerDate.textContent = formatHeader(currentKey);
  dom.datePicker.value = currentKey;
  dom.todayButton.disabled = isToday;
  dom.dateButton.setAttribute("aria-label", `选择日期，当前 ${formatHeader(currentKey)}`);
  document.title = isToday ? "日晷 Daydial · 今天" : `日晷 Daydial · ${formatHeader(currentKey)}`;

  dial.setData({ blocks: day.blocks, dateKey: currentKey, isToday });
  renderHub(day);
  renderAgenda(day);
  renderStats(day);

  if (document.activeElement !== dom.intentionInput) {
    dom.intentionInput.value = day.note || "";
  }
  dom.storageStatus.textContent = storageOk ? "本地存储" : "仅本次会话";
  syncURL();
}

function syncURL() {
  const url = new URL(location.href);
  if (currentKey === todayKey()) {
    url.searchParams.delete("date");
  } else {
    url.searchParams.set("date", currentKey);
  }
  history.replaceState(null, "", url);
}

function renderHub(day) {
  const date = fromKey(currentKey);
  const stats = dayStats(day.blocks);
  dom.hubWeekday.textContent = weekdayCN(currentKey);
  dom.hubDay.textContent = pad2(date.getDate());
  dom.hubMonth.textContent = formatMonthLine(currentKey);
  dom.hubDoy.textContent = `第 ${dayOfYear(currentKey)} 天`;
  dom.hubStat.textContent = `已安排 ${formatCompactDuration(stats.total)}`;
  updateHubNow();
}

function updateHubNow() {
  const isToday = currentKey === todayKey();
  dom.hubNow.hidden = !isToday;
  if (!isToday) return;
  const dot = document.createElement("span");
  dot.className = "now-dot";
  dot.setAttribute("aria-hidden", "true");
  dom.hubNow.replaceChildren(dot, document.createTextNode(`现在 ${minutesToTime(nowMinutes())}`));
}

function renderAgenda(day) {
  dom.agendaList.replaceChildren();
  const blocks = [...day.blocks].sort((a, b) => a.start - b.start);
  dom.agendaCount.textContent = `${blocks.length} 段`;

  if (!blocks.length) {
    dom.agendaList.hidden = true;
    dom.emptyState.hidden = false;
    return;
  }

  dom.agendaList.hidden = false;
  dom.emptyState.hidden = true;

  for (const block of blocks) {
    const category = CATEGORIES[block.category] || CATEGORIES.focus;
    const article = document.createElement("article");
    article.className = `agenda-item ${category.className}${block.done ? " is-done" : ""}`;
    article.dataset.id = block.id;

    const check = document.createElement("button");
    check.type = "button";
    check.className = "item-check";
    check.setAttribute("aria-pressed", String(block.done));
    check.setAttribute("aria-label", `${block.done ? "取消完成" : "标记完成"}：${block.title}`);
    check.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>';
    check.addEventListener("click", () => toggleDone(block.id));

    const time = document.createElement("div");
    time.className = "item-time";
    const start = document.createElement("b");
    start.textContent = minutesToTime(block.start);
    const end = document.createElement("span");
    end.textContent = `– ${minutesToTime(block.end)}`;
    time.append(start, end);

    const main = document.createElement("button");
    main.type = "button";
    main.className = "item-main";
    main.setAttribute("aria-label", `编辑安排：${block.title}`);
    const title = document.createElement("span");
    title.className = "item-title";
    title.textContent = block.title;
    main.append(title);
    if (block.note) {
      const note = document.createElement("span");
      note.className = "item-note";
      note.textContent = block.note;
      main.append(note);
    }
    main.addEventListener("click", () => openBlockDialog({ id: block.id }));

    const duration = document.createElement("span");
    duration.className = "item-duration";
    duration.textContent = formatCompactDuration(block.end - block.start);

    article.append(check, time, main, duration);
    dom.agendaList.append(article);
  }
}

function renderStats(day) {
  const stats = dayStats(day.blocks);
  dom.statPlanned.textContent = stats.total ? formatCompactDuration(stats.total) : "0h";
  dom.statFocus.textContent = stats.focus ? formatCompactDuration(stats.focus) : "0h";
  dom.statDone.textContent = `${stats.done}/${stats.count}`;
  renderMixBar(day.blocks);
  dom.dayShape.textContent = describeDay(day.blocks);
}

function renderMixBar(blocks) {
  const total = blocks.reduce((sum, block) => sum + (block.end - block.start), 0);
  dom.mixBar.replaceChildren();
  dom.mixBar.hidden = total === 0;
  if (!total) return;
  for (const key of CATEGORY_KEYS) {
    const minutes = blocks
      .filter((block) => block.category === key)
      .reduce((sum, block) => sum + (block.end - block.start), 0);
    if (!minutes) continue;
    const segment = document.createElement("i");
    segment.className = `cat-${key}`;
    segment.style.flex = `${minutes} 1 0`;
    dom.mixBar.append(segment);
  }
}

/* ---------------------------------------------------------------- agenda */

function toggleDone(id) {
  const day = ensureDay(state, currentKey);
  const block = day.blocks.find((item) => item.id === id);
  if (!block) return;
  block.done = !block.done;
  persist();
  render();
  const selector = `.agenda-item[data-id="${CSS.escape(id)}"] .item-check`;
  dom.agendaList.querySelector(selector)?.focus();
}

function persist() {
  if (!saveState(state)) {
    showToast("浏览器没有保存成功，请先导出数据。");
    return false;
  }
  return true;
}

dom.intentionInput.addEventListener("input", () => {
  clearTimeout(intentionTimer);
  intentionTimer = setTimeout(saveIntention, 280);
});

dom.intentionInput.addEventListener("blur", saveIntention);

function saveIntention() {
  clearTimeout(intentionTimer);
  const day = ensureDay(state, currentKey);
  day.note = dom.intentionInput.value.trim().slice(0, 60);
  saveState(state);
}

dom.addButton.addEventListener("click", () => openBlockDialog());

dom.emptyState.addEventListener("click", (event) => {
  const action = event.target.closest("[data-empty]")?.dataset.empty;
  if (action === "add") openBlockDialog();
  if (action === "templates") showDialog(dom.templatesDialog);
  if (action === "sample") applyTemplate("sample");
});

/* ---------------------------------------------------------------- date */

function setDate(key) {
  if (!isValidKey(key)) return;
  currentKey = key;
  closeMenu();
  dial.hideTooltip();
  render();
}

dom.prevDay.addEventListener("click", () => setDate(addDays(currentKey, -1)));
dom.nextDay.addEventListener("click", () => setDate(addDays(currentKey, 1)));
dom.todayButton.addEventListener("click", () => setDate(todayKey()));

dom.dateButton.addEventListener("click", () => {
  dom.datePicker.value = currentKey;
  if (typeof dom.datePicker.showPicker === "function") {
    try {
      dom.datePicker.showPicker();
      return;
    } catch (error) {
      // Some browsers require the input to be visible; fall through.
    }
  }
  dom.datePicker.focus();
  dom.datePicker.click();
});

dom.datePicker.addEventListener("change", () => {
  if (isValidKey(dom.datePicker.value)) setDate(dom.datePicker.value);
});

/* ---------------------------------------------------------------- block dialog */

function defaultStart() {
  if (currentKey !== todayKey()) return 9 * 60;
  let start = snapMinutes(nowMinutes() + 15);
  if (start > 22 * 60) start = 22 * 60;
  return start;
}

function openBlockDialog({ id = null, start = null, end = null, notice = null } = {}) {
  const day = getDay(state, currentKey);
  const block = id ? day.blocks.find((item) => item.id === id) : null;
  editingId = block ? block.id : null;

  dom.blockForm.reset();
  dom.formError.hidden = true;
  dom.formError.textContent = "";
  dom.formNotice.hidden = true;
  dom.formNotice.textContent = "";

  if (block) {
    dom.blockDialogKicker.textContent = "调整这段时间";
    dom.blockDialogTitle.textContent = "编辑安排";
    dom.deleteBlock.hidden = false;
    dom.saveBlock.textContent = "保存修改";
    dom.blockTitle.value = block.title;
    dom.blockStart.value = minutesToInput(block.start);
    dom.blockEnd.value = minutesToInput(block.end);
    dom.blockNote.value = block.note;
    const radio = dom.categoryPicker.querySelector(`input[value="${block.category}"]`);
    if (radio) radio.checked = true;
  } else {
    dom.blockDialogKicker.textContent = "安排一段时间";
    dom.blockDialogTitle.textContent = "添加安排";
    dom.deleteBlock.hidden = true;
    dom.saveBlock.textContent = "保存安排";
    let s = Math.max(0, Math.min(1425, Math.round(start ?? defaultStart())));
    let e = Math.max(0, Math.min(1425, Math.round(end ?? s + 60)));
    if (e <= s) e = Math.min(s + 60, 1425);
    if (e - s < 15) s = Math.max(0, e - 15);
    dom.blockTitle.value = "";
    dom.blockStart.value = minutesToInput(s);
    dom.blockEnd.value = minutesToInput(e);
    dom.blockNote.value = "";
    const focusRadio = dom.categoryPicker.querySelector('input[value="focus"]');
    if (focusRadio) focusRadio.checked = true;
  }

  if (notice) {
    dom.formNotice.textContent = notice;
    dom.formNotice.hidden = false;
  }
  updateDurationReadout();
  showDialog(dom.blockDialog);
  setTimeout(() => {
    dom.blockTitle.focus();
    dom.blockTitle.select();
  }, 40);
}

function updateDurationReadout() {
  const start = timeToMinutes(dom.blockStart.value);
  const end = timeToMinutes(dom.blockEnd.value);
  if (start === null || end === null) {
    dom.durationReadout.textContent = "选择开始和结束时间";
    return;
  }
  if (end <= start) {
    dom.durationReadout.textContent = "结束时间要晚于开始时间";
    return;
  }
  dom.durationReadout.textContent = formatDurationCN(end - start);
}

dom.blockStart.addEventListener("input", updateDurationReadout);
dom.blockEnd.addEventListener("input", updateDurationReadout);

function setFormError(message, focus) {
  dom.formError.textContent = message;
  dom.formError.hidden = false;
  focus?.focus();
}

dom.blockForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = dom.blockTitle.value.trim().slice(0, 60);
  const start = timeToMinutes(dom.blockStart.value);
  const end = timeToMinutes(dom.blockEnd.value);

  if (!title) {
    setFormError("给这段时间起一个名字。", dom.blockTitle);
    return;
  }
  if (start === null || end === null) {
    setFormError("时间格式不对，请重新选择。", dom.blockStart);
    return;
  }
  if (end <= start) {
    setFormError("结束时间要晚于开始时间。", dom.blockEnd);
    return;
  }
  if (end - start < 15) {
    setFormError("一段安排至少 15 分钟。", dom.blockEnd);
    return;
  }
  if (end - start > 720) {
    setFormError("一次安排最长 12 小时。", dom.blockEnd);
    return;
  }

  const category = dom.categoryPicker.querySelector('input[name="category"]:checked')?.value || "focus";
  const note = dom.blockNote.value.trim().slice(0, 140);
  const day = ensureDay(state, currentKey);
  const wasEditing = Boolean(editingId);

  if (editingId) {
    const index = day.blocks.findIndex((item) => item.id === editingId);
    if (index >= 0) {
      day.blocks[index] = makeBlock({
        ...day.blocks[index],
        title,
        start,
        end,
        category,
        note,
      });
    }
  } else {
    day.blocks.push(makeBlock({ title, start, end, category, note }));
  }

  day.blocks.sort((a, b) => a.start - b.start);
  persist();
  render();
  dom.blockDialog.close();
  showToast(wasEditing ? "已更新安排" : "已添加安排");
  editingId = null;
});

dom.deleteBlock.addEventListener("click", async () => {
  const day = getDay(state, currentKey);
  const block = day.blocks.find((item) => item.id === editingId);
  if (!block) return;
  const ok = await askConfirm({
    title: "删除这段安排？",
    copy: `“${block.title}”会从今天移除。`,
    okLabel: "删除",
  });
  if (!ok) return;
  const liveDay = ensureDay(state, currentKey);
  liveDay.blocks = liveDay.blocks.filter((item) => item.id !== block.id);
  persist();
  render();
  dom.blockDialog.close();
  showToast("已删除安排");
});

dom.blockDialog.addEventListener("close", () => {
  editingId = null;
});

/* ---------------------------------------------------------------- templates */

dom.templatesDialog.addEventListener("click", (event) => {
  const key = event.target.closest("[data-template]")?.dataset.template;
  if (key) applyTemplate(key);
});

async function applyTemplate(key) {
  const template = TEMPLATES[key];
  if (!template) return;
  const day = getDay(state, currentKey);
  if (day.blocks.length) {
    const ok = await askConfirm({
      title: "替换今天的安排？",
      copy: `今天已有 ${day.blocks.length} 段安排。套用「${template.label}」会替换它们。`,
      okLabel: "替换",
    });
    if (!ok) return;
  }
  const liveDay = ensureDay(state, currentKey);
  liveDay.blocks = templateBlocks(key);
  persist();
  render();
  if (dom.templatesDialog.open) dom.templatesDialog.close();
  showToast(`已套用「${template.label}」`);
}

dom.clearDay.addEventListener("click", async () => {
  const day = getDay(state, currentKey);
  if (!day.blocks.length) {
    showToast("今天还没有安排。");
    return;
  }
  const ok = await askConfirm({
    title: "清空今天？",
    copy: `今天 ${day.blocks.length} 段安排会被移除，这个操作不能撤销。`,
    okLabel: "清空",
  });
  if (!ok) return;
  const liveDay = ensureDay(state, currentKey);
  liveDay.blocks = [];
  persist();
  render();
  dom.templatesDialog.close();
  showToast("今天已经清空");
});

/* ---------------------------------------------------------------- menu */

function toggleMenu(force) {
  const open = force ?? dom.menuPanel.hidden;
  dom.menuPanel.hidden = !open;
  dom.menuButton.setAttribute("aria-expanded", String(open));
  if (open) {
    requestAnimationFrame(() => dom.menuPanel.querySelector("button")?.focus());
  }
}

function closeMenu() {
  if (dom.menuPanel.hidden) return;
  dom.menuPanel.hidden = true;
  dom.menuButton.setAttribute("aria-expanded", "false");
}

dom.menuButton.addEventListener("click", () => toggleMenu());

document.addEventListener("click", (event) => {
  if (dom.menuPanel.hidden) return;
  if (dom.menuPanel.contains(event.target) || dom.menuButton.contains(event.target)) return;
  closeMenu();
});

dom.menuPanel.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  closeMenu();
  handleMenuAction(action);
});

dom.menuPanel.addEventListener("keydown", (event) => {
  const items = [...dom.menuPanel.querySelectorAll("button")];
  const index = items.indexOf(document.activeElement);
  if (!items.length) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    items[(index + 1 + items.length) % items.length].focus();
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    items[(index - 1 + items.length) % items.length].focus();
  }
  if (event.key === "Home") {
    event.preventDefault();
    items[0].focus();
  }
  if (event.key === "End") {
    event.preventDefault();
    items[items.length - 1].focus();
  }
});

function handleMenuAction(action) {
  if (action === "templates") showDialog(dom.templatesDialog);
  if (action === "export-json") exportJSON();
  if (action === "import-json") {
    dom.importInput.value = "";
    dom.importInput.click();
  }
  if (action === "export-ics") exportICS();
  if (action === "print") setTimeout(() => window.print(), 80);
  if (action === "shortcuts") showDialog(dom.shortcutsDialog);
  if (action === "about") showDialog(dom.aboutDialog);
}

function exportJSON() {
  downloadFile(`daydial-backup-${todayKey()}.json`, JSON.stringify(state, null, 2), "application/json");
  showToast("已导出全部数据");
}

function exportICS() {
  const day = getDay(state, currentKey);
  if (!day.blocks.length) {
    showToast("今天还没有安排可以导出。");
    return;
  }
  downloadFile(`daydial-${currentKey}.ics`, buildICS(day, currentKey), "text/calendar;charset=utf-8");
  showToast("已导出今天的日历");
}

dom.importInput.addEventListener("change", async () => {
  const file = dom.importInput.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const imported = sanitizeState(JSON.parse(text));
    if (!Object.keys(imported.days).length) throw new Error("empty backup");
    const ok = await askConfirm({
      title: "导入这份备份？",
      copy: `文件里有 ${Object.keys(imported.days).length} 天的安排。导入会替换当前浏览器里的全部数据。`,
      okLabel: "导入",
    });
    if (!ok) return;
    state = imported;
    if (!state.days[currentKey]) {
      const keys = Object.keys(state.days).sort();
      currentKey = keys.includes(todayKey()) ? todayKey() : keys[keys.length - 1] || todayKey();
    }
    saveState(state);
    applyTheme(state.theme);
    render();
    showToast(`已导入 ${Object.keys(state.days).length} 天的安排`);
  } catch (error) {
    showToast("这个文件不是有效的日晷备份。");
  } finally {
    dom.importInput.value = "";
  }
});

/* ---------------------------------------------------------------- confirm */

function askConfirm({ title, copy, okLabel = "确认" }) {
  return new Promise((resolve) => {
    if (confirmResolver) {
      const previous = confirmResolver;
      confirmResolver = null;
      previous(false);
    }
    confirmResolver = resolve;
    dom.confirmTitle.textContent = title;
    dom.confirmCopy.textContent = copy;
    dom.confirmOk.textContent = okLabel;
    showDialog(dom.confirmDialog);
    requestAnimationFrame(() => dom.confirmDialog.querySelector('[data-confirm="cancel"]')?.focus());
  });
}

dom.confirmDialog.addEventListener("click", (event) => {
  const action = event.target.closest("[data-confirm]")?.dataset.confirm;
  if (!action) return;
  finishConfirm(action === "ok");
});

dom.confirmDialog.addEventListener("close", () => {
  if (!confirmResolver) return;
  const resolve = confirmResolver;
  confirmResolver = null;
  resolve(false);
});

function finishConfirm(result) {
  const resolve = confirmResolver;
  confirmResolver = null;
  dom.confirmDialog.close();
  resolve?.(result);
}

/* ---------------------------------------------------------------- dialogs */

function rememberFocus() {
  const active = document.activeElement;
  if (active && active !== document.body && !active.closest?.("dialog")) {
    lastFocused = active.closest?.("#menuPanel") ? dom.menuButton : active;
  } else {
    lastFocused = dom.addButton;
  }
}

function restoreFocus() {
  const target = lastFocused;
  lastFocused = null;
  if (target?.isConnected && target.getClientRects().length) {
    target.focus();
  } else {
    dom.addButton.focus();
  }
}

function showDialog(dialog) {
  if (dialog.open) return;
  if (!document.querySelector("dialog[open]")) rememberFocus();
  dialog.showModal();
}

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog")?.close());
});

document.querySelectorAll("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    if (dialog === dom.confirmDialog) return;
    if (document.querySelector("dialog[open]")) return;
    requestAnimationFrame(restoreFocus);
  });
});

/* ---------------------------------------------------------------- toast */

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    dom.toast.hidden = true;
  }, 2800);
}

/* ---------------------------------------------------------------- keyboard */

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !dom.menuPanel.hidden) {
    event.preventDefault();
    closeMenu();
    dom.menuButton.focus();
    return;
  }

  if (document.querySelector("dialog[open]")) return;

  const target = event.target;
  const typing = target.matches?.("input, textarea, select") || target.isContentEditable;
  if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

  if (event.key === "n" || event.key === "N") {
    event.preventDefault();
    openBlockDialog();
    return;
  }
  if (event.key === "t" || event.key === "T") {
    event.preventDefault();
    setDate(todayKey());
    return;
  }
  if (event.key === "?") {
    event.preventDefault();
    showDialog(dom.shortcutsDialog);
    return;
  }

  const interactive = target.closest?.("button, a, [role='button']");
  if (interactive) return;
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    setDate(addDays(currentKey, -1));
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    setDate(addDays(currentKey, 1));
  }
});

/* ---------------------------------------------------------------- boot */

if (initialParams.get("demo") === "1" && !Object.keys(state.days).length) {
  const key = todayKey();
  state.days[key] = { blocks: templateBlocks("sample"), note: "把一天，看成一个圆。" };
  saveState(state);
}

applyTheme(state.theme);
render();

if (!storageOk) {
  setTimeout(() => showToast("浏览器禁用了本地存储，关闭页面后安排会丢失。"), 700);
}

setInterval(() => {
  const nowToday = todayKey();
  if (nowToday !== lastToday) {
    const wasViewingToday = currentKey === lastToday;
    lastToday = nowToday;
    if (wasViewingToday) currentKey = nowToday;
    render();
    return;
  }
  if (currentKey === nowToday) {
    updateHubNow();
    dial.updateNow();
  }
}, 30000);

window.addEventListener("popstate", () => {
  const params = new URLSearchParams(location.search);
  currentKey = isValidKey(params.get("date")) ? params.get("date") : todayKey();
  render();
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Daydial: service worker registration failed", error);
    });
  });
}
