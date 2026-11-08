export const STORAGE_KEY = "daydial.v1";
export const VERSION = 1;

export const CATEGORIES = {
  focus: { key: "focus", label: "深度", className: "cat-focus" },
  meet: { key: "meet", label: "会议", className: "cat-meet" },
  life: { key: "life", label: "生活", className: "cat-life" },
  rest: { key: "rest", label: "休息", className: "cat-rest" },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES);
export const MAX_TITLE = 60;
export const MAX_NOTE = 140;
export const MAX_BLOCK_MINUTES = 720;

const TEMPLATE_RAW = {
  deep: {
    label: "深度日",
    description: "两段不被打断的工作，留出散步和阅读。",
    blocks: [
      ["写产品方案", 540, 660, "focus", "关掉消息，只留一个窗口"],
      ["回复必要消息", 675, 720, "meet", "集中处理，不随时在线"],
      ["继续写方案", 840, 930, "focus", "从上次停下的地方接上"],
      ["下楼走一圈", 960, 990, "rest", "不带手机，看看远处"],
      ["读一点书", 1200, 1260, "life", "不求进度，只读十页"],
    ],
  },
  meeting: {
    label: "会议日",
    description: "把会议聚在一起，中间留出恢复的空隙。",
    blocks: [
      ["站会", 570, 600, "meet", "只同步阻塞和今天的目标"],
      ["项目讨论", 630, 720, "meet", "带着方案去，不做开放讨论"],
      ["一对一", 840, 900, "meet", "先听，再说"],
      ["复盘与收尾", 960, 1020, "focus", "把决定写下来"],
    ],
  },
  rest: {
    label: "休息日",
    description: "不追进度，只安排让身体舒服的事。",
    blocks: [
      ["早餐与散步", 540, 600, "life", "慢慢吃，走一条没走过的路"],
      ["读闲书", 660, 720, "rest", "纸质书，不做笔记"],
      ["看一部电影", 900, 990, "rest", "把手机放到另一个房间"],
      ["做晚饭", 1140, 1200, "life", "切菜的时候只听声音"],
    ],
  },
  sample: {
    label: "示例一天",
    description: "看看圆盘被填满时，一天可以是什么形状。",
    blocks: [
      ["早餐与当天计划", 510, 540, "life", "先决定今天最重要的一件事"],
      ["写产品方案", 540, 660, "focus", "关掉消息，只留一个窗口"],
      ["回复邮件", 675, 720, "meet", "集中处理，不随时在线"],
      ["用户访谈", 840, 930, "meet", "带着三个问题去，不急着解释"],
      ["继续写方案", 960, 1020, "focus", "从上次停下的地方接上"],
      ["晚饭与散步", 1110, 1170, "rest", "不带手机，看看远处"],
      ["阅读", 1230, 1290, "life", "不求进度，只读十页"],
    ],
  },
};

export const TEMPLATES = Object.fromEntries(
  Object.entries(TEMPLATE_RAW).map(([key, value]) => [
    key,
    {
      key,
      label: value.label,
      description: value.description,
      blocks: value.blocks.map(([title, start, end, category, note]) => ({
        title,
        start,
        end,
        category,
        note,
      })),
    },
  ]),
);

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const MONTHS = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];

export function pad2(value) {
  return String(value).padStart(2, "0");
}

export function toKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function fromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function todayKey() {
  return toKey(new Date());
}

export function isValidKey(key) {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const date = fromKey(key);
  return !Number.isNaN(date.getTime()) && toKey(date) === key;
}

export function addDays(key, amount) {
  const date = fromKey(key);
  date.setDate(date.getDate() + amount);
  return toKey(date);
}

export function weekdayCN(key) {
  return WEEKDAYS[fromKey(key).getDay()];
}

export function monthCN(key) {
  return MONTHS[fromKey(key).getMonth()];
}

export function formatHeader(key) {
  const date = fromKey(key);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdayCN(key)}`;
}

export function formatMonthLine(key) {
  const date = fromKey(key);
  return `${monthCN(key)} · ${date.getFullYear()}`;
}

export function dayOfYear(key) {
  const date = fromKey(key);
  const start = new Date(date.getFullYear(), 0, 1, 12);
  return Math.floor((date - start) / 86400000) + 1;
}

export function nowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function snapMinutes(value, step = 15) {
  return clamp(Math.round(value / step) * step, 0, 1439);
}

export function minutesToTime(value) {
  const minutes = clamp(Math.round(value), 0, 1439);
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
}

export function minutesToInput(value) {
  return minutesToTime(value);
}

export function timeToMinutes(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatCompactDuration(minutes) {
  const value = Math.max(0, Math.round(minutes));
  if (value === 0) return "0h";
  if (value < 60) return `${value}m`;
  const hours = value / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

export function formatDurationCN(minutes) {
  const value = Math.max(0, Math.round(minutes));
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  if (!hours) return `${rest} 分钟`;
  if (!rest) return `${hours} 小时`;
  return `${hours} 小时 ${rest} 分`;
}

export function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function makeBlock(partial = {}) {
  const start = clamp(Number(partial.start) || 0, 0, 1439);
  const end = clamp(Number(partial.end) || start + 60, start + 1, 1439);
  return {
    id: partial.id || makeId(),
    title: String(partial.title || "未命名安排").trim().slice(0, MAX_TITLE),
    start,
    end,
    category: CATEGORIES[partial.category] ? partial.category : "focus",
    note: String(partial.note || "").trim().slice(0, MAX_NOTE),
    done: partial.done === true,
  };
}

export function templateBlocks(key) {
  const template = TEMPLATES[key];
  if (!template) return [];
  return template.blocks.map((block) => makeBlock(block));
}

export function defaultState() {
  return {
    version: VERSION,
    theme: null,
    days: {},
    meta: { createdAt: new Date().toISOString() },
  };
}

function sanitizeBlock(raw) {
  if (!raw || typeof raw !== "object") return null;
  const start = Number(raw.start);
  const end = Number(raw.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start < 0 || end > 1439 || end <= start) return null;
  if (end - start > MAX_BLOCK_MINUTES) return null;
  return makeBlock({
    id: typeof raw.id === "string" && raw.id ? raw.id : undefined,
    title: raw.title,
    start,
    end,
    category: raw.category,
    note: raw.note,
    done: raw.done,
  });
}

export function sanitizeState(raw) {
  const state = defaultState();
  if (!raw || typeof raw !== "object") return state;
  if (raw.theme === "light" || raw.theme === "dark") state.theme = raw.theme;
  if (raw.meta && typeof raw.meta.createdAt === "string") state.meta.createdAt = raw.meta.createdAt;
  if (!raw.days || typeof raw.days !== "object") return state;

  const seenIds = new Set();
  for (const [key, value] of Object.entries(raw.days)) {
    if (!isValidKey(key) || !value || typeof value !== "object") continue;
    const blocks = Array.isArray(value.blocks)
      ? value.blocks
          .map(sanitizeBlock)
          .filter(Boolean)
          .map((block) => {
            if (seenIds.has(block.id)) block.id = makeId();
            seenIds.add(block.id);
            return block;
          })
          .sort((a, b) => a.start - b.start)
      : [];
    const note = typeof value.note === "string" ? value.note.trim().slice(0, 60) : "";
    state.days[key] = { blocks, note };
  }
  return state;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return sanitizeState(JSON.parse(raw));
  } catch (error) {
    console.warn("Daydial: could not read saved data", error);
    return defaultState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.warn("Daydial: could not save data", error);
    return false;
  }
}

export function storageAvailable() {
  try {
    const key = "__daydial_test__";
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    return false;
  }
}

export function getDay(state, key) {
  return state.days[key] || { blocks: [], note: "" };
}

export function ensureDay(state, key) {
  if (!state.days[key]) state.days[key] = { blocks: [], note: "" };
  return state.days[key];
}

export function dayStats(blocks) {
  const total = blocks.reduce((sum, block) => sum + (block.end - block.start), 0);
  const focus = blocks.filter((block) => block.category === "focus").reduce((sum, block) => sum + (block.end - block.start), 0);
  const meet = blocks.filter((block) => block.category === "meet").reduce((sum, block) => sum + (block.end - block.start), 0);
  const life = blocks.filter((block) => block.category === "life").reduce((sum, block) => sum + (block.end - block.start), 0);
  const rest = blocks.filter((block) => block.category === "rest").reduce((sum, block) => sum + (block.end - block.start), 0);
  const done = blocks.filter((block) => block.done).length;
  return { total, focus, meet, life, rest, done, count: blocks.length };
}

export function describeDay(blocks) {
  if (!blocks.length) return "还没有安排。今天可以慢慢开始。";
  const stats = dayStats(blocks);
  if (stats.done === stats.count) return "今天的安排都完成了。可以收工了。";
  if (stats.focus / stats.total >= 0.55) return "今天偏重深度工作。给自己留一点恢复的空隙。";
  if (stats.meet / stats.total >= 0.45) return "今天会议较多。零碎时间可以留白，不必填满。";
  if (stats.rest / stats.total >= 0.35) return "今天留了休息。慢一点也算在前进。";
  return "今天的节奏比较均衡。留一点余地给变化。";
}

export function buildICS(day, key) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const datePart = key.replace(/-/g, "");
  const escape = (value) =>
    String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Daydial//Daydial//ZH-CN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(`日晷 · ${formatHeader(key)}`)}`,
  ];

  for (const block of day.blocks) {
    const start = `${datePart}T${minutesToTime(block.start).replace(":", "")}00`;
    const end = `${datePart}T${minutesToTime(block.end).replace(":", "")}00`;
    const category = CATEGORIES[block.category]?.label || "安排";
    lines.push(
      "BEGIN:VEVENT",
      `UID:${block.id}@daydial`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escape(block.title)}`,
      `DESCRIPTION:${escape(`${category}${block.note ? ` · ${block.note}` : ""}`)}`,
      `CATEGORIES:${escape(category)}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

export function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
