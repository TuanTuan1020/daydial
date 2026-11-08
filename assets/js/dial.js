import {
  CATEGORIES,
  MAX_BLOCK_MINUTES,
  clamp,
  formatCompactDuration,
  formatDurationCN,
  minutesToTime,
  snapMinutes,
} from "./data.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const CX = 340;
const CY = 340;
const OUTER = 312;
const HUB = 184;
const LANES = [266, 244, 222, 200];

function svgEl(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

function angleFor(minute) {
  return ((minute - 360) / 1440) * 360 - 90;
}

function polar(radius, angle) {
  const rad = (angle * Math.PI) / 180;
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  };
}

function arcPath(radius, start, end) {
  const a0 = angleFor(start);
  const a1 = angleFor(end);
  const p0 = polar(radius, a0);
  const p1 = polar(radius, a1);
  const large = end - start > 720 ? 1 : 0;
  return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

export class Dial {
  constructor(svg, options = {}) {
    this.svg = svg;
    this.wrap = svg.closest(".dial-wrap");
    this.tooltip = options.tooltip;
    this.onCreate = options.onCreate || (() => {});
    this.onEdit = options.onEdit || (() => {});
    this.blocksLayer = svg.querySelector("#blocksLayer");
    this.ticksLayer = svg.querySelector("#dialTicks");
    this.labelsLayer = svg.querySelector("#dialLabels");
    this.nowLayer = svg.querySelector("#nowLayer");
    this.draftLayer = svg.querySelector("#draftLayer");
    this.blocks = [];
    this.dateKey = null;
    this.isToday = false;
    this.drag = null;
    this.hoveredId = null;
    this.hasRendered = false;
    this.previousIds = new Set();
    this.animateAll = true;

    this.buildStatic();
    this.bind();
    this.nowTimer = setInterval(() => this.updateNow(), 30000);
  }

  buildStatic() {
    for (let index = 0; index < 96; index += 1) {
      const minute = index * 15;
      const angle = angleFor(minute);
      const isMajor = minute % 180 === 0;
      const isHalf = minute % 30 === 0;
      const isHour = minute % 60 === 0;
      const inner = isMajor ? 296 : isHalf ? 302 : 306;
      const outer = OUTER;
      const p1 = polar(inner, angle);
      const p2 = polar(outer, angle);
      const tick = svgEl("line", {
        x1: p1.x.toFixed(2),
        y1: p1.y.toFixed(2),
        x2: p2.x.toFixed(2),
        y2: p2.y.toFixed(2),
        class: isMajor ? "tick major" : isHour ? "tick hour" : isHalf ? "tick half" : "tick",
      });
      this.ticksLayer.append(tick);
    }

    for (let hour = 0; hour < 24; hour += 3) {
      const point = polar(327, angleFor(hour * 60));
      const label = svgEl("text", {
        x: point.x.toFixed(2),
        y: point.y.toFixed(2),
        class: "dial-label",
      });
      label.textContent = String(hour).padStart(2, "0");
      this.labelsLayer.append(label);
    }
  }

  bind() {
    this.svg.addEventListener("pointerdown", (event) => this.handlePointerDown(event));
    this.svg.addEventListener("pointermove", (event) => this.handlePointerMove(event));
    this.svg.addEventListener("pointerup", (event) => this.handlePointerUp(event));
    this.svg.addEventListener("pointercancel", () => this.cancelDrag());
    this.svg.addEventListener("pointerleave", () => {
      if (!this.drag) this.hideTooltip();
    });

    this.blocksLayer.addEventListener("pointerover", (event) => {
      const group = event.target.closest?.(".block-group");
      if (!group) return;
      this.hoveredId = group.dataset.id;
      const block = this.blocks.find((item) => item.id === group.dataset.id);
      if (block) this.showBlockTooltip(block, event.clientX, event.clientY);
    });
    this.blocksLayer.addEventListener("pointermove", (event) => {
      const group = event.target.closest?.(".block-group");
      if (!group || !this.hoveredId) return;
      const block = this.blocks.find((item) => item.id === group.dataset.id);
      if (block) this.showBlockTooltip(block, event.clientX, event.clientY);
    });
    this.blocksLayer.addEventListener("pointerout", (event) => {
      const group = event.target.closest?.(".block-group");
      if (!group) return;
      if (event.relatedTarget && group.contains(event.relatedTarget)) return;
      this.hoveredId = null;
      this.hideTooltip();
    });
    this.blocksLayer.addEventListener("focusin", (event) => {
      const group = event.target.closest?.(".block-group");
      if (!group) return;
      const block = this.blocks.find((item) => item.id === group.dataset.id);
      if (!block) return;
      const rect = group.getBoundingClientRect();
      this.showBlockTooltip(block, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
    this.blocksLayer.addEventListener("focusout", (event) => {
      const group = event.target.closest?.(".block-group");
      if (group && event.relatedTarget && group.contains(event.relatedTarget)) return;
      this.hideTooltip();
    });
    this.blocksLayer.addEventListener("click", (event) => {
      const group = event.target.closest?.(".block-group");
      if (!group) return;
      event.preventDefault();
      this.onEdit(group.dataset.id);
    });
    this.blocksLayer.addEventListener("keydown", (event) => {
      const group = event.target.closest?.(".block-group");
      if (!group) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.onEdit(group.dataset.id);
      }
    });
  }

  setData({ blocks, dateKey, isToday }) {
    const previousIds = new Set(this.blocks.map((block) => block.id));
    const dateChanged = dateKey !== this.dateKey;
    this.blocks = [...blocks].sort((a, b) => a.start - b.start);
    this.previousIds = previousIds;
    this.animateAll = dateChanged || !this.hasRendered;
    this.dateKey = dateKey;
    this.isToday = isToday;
    this.renderBlocks();
    this.hasRendered = true;
    this.updateNow();
  }

  renderBlocks() {
    this.blocksLayer.replaceChildren();
    if (!this.blocks.length) return;

    const laneEnds = [];
    this.blocks.forEach((block, index) => {
      let lane = laneEnds.findIndex((end) => end <= block.start);
      if (lane === -1) {
        if (laneEnds.length < LANES.length) {
          lane = laneEnds.length;
          laneEnds.push(block.end);
        } else {
          lane = laneEnds.indexOf(Math.min(...laneEnds));
          laneEnds[lane] = block.end;
        }
      } else {
        laneEnds[lane] = block.end;
      }

      const category = CATEGORIES[block.category] || CATEGORIES.focus;
      const group = svgEl("g", {
        class: `block-group ${category.className}${block.done ? " is-done" : ""}`,
        "data-id": block.id,
        role: "button",
        tabindex: "0",
        "aria-label": `${minutesToTime(block.start)} 到 ${minutesToTime(block.end)}，${block.title}，${category.label}${block.done ? "，已完成" : ""}`,
      });

      const path = svgEl("path", {
        d: arcPath(LANES[lane], block.start, block.end),
        class: "dial-block",
        pathLength: "1",
      });
      path.style.setProperty("--i", String(Math.min(index, 6)));
      if (this.animateAll || !this.previousIds.has(block.id)) {
        path.classList.add("is-new");
      }

      const hit = svgEl("path", {
        d: arcPath(LANES[lane], block.start, block.end),
        class: "block-hit",
      });

      group.append(path, hit);
      this.blocksLayer.append(group);
    });
  }

  updateNow() {
    this.nowLayer.replaceChildren();
    if (!this.isToday) return;
    const now = new Date();
    const minute = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const angle = angleFor(minute);
    const inner = polar(HUB + 4, angle);
    const outer = polar(OUTER + 2, angle);

    const line = svgEl("line", {
      x1: inner.x.toFixed(2),
      y1: inner.y.toFixed(2),
      x2: outer.x.toFixed(2),
      y2: outer.y.toFixed(2),
      class: "now-line",
    });
    const halo = svgEl("circle", {
      cx: outer.x.toFixed(2),
      cy: outer.y.toFixed(2),
      r: "9",
      class: "now-halo",
    });
    const dot = svgEl("circle", {
      cx: outer.x.toFixed(2),
      cy: outer.y.toFixed(2),
      r: "3.5",
      class: "now-dot-svg",
    });
    this.nowLayer.append(line, halo, dot);
  }

  pointToTime(event) {
    const point = this.svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const ctm = this.svg.getScreenCTM();
    if (!ctm) return { minute: 0, radius: 0 };
    const local = point.matrixTransform(ctm.inverse());
    const dx = local.x - CX;
    const dy = local.y - CY;
    const radius = Math.hypot(dx, dy);
    const theta = (Math.atan2(dy, dx) * 180) / Math.PI;
    const raw = (((theta + 90) / 360) * 1440 + 360) % 1440;
    return { minute: snapMinutes(raw), radius };
  }

  handlePointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target.closest?.(".block-group")) return;
    const { minute, radius } = this.pointToTime(event);
    if (radius < HUB + 10 || radius > OUTER + 4) return;
    this.drag = {
      pointerId: event.pointerId,
      startMinute: minute,
      currentMinute: minute,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    this.svg.setPointerCapture?.(event.pointerId);
    this.hideTooltip();
    event.preventDefault();
  }

  handlePointerMove(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    const { minute } = this.pointToTime(event);
    this.drag.currentMinute = minute;
    if (Math.hypot(event.clientX - this.drag.startX, event.clientY - this.drag.startY) > 3) {
      this.drag.moved = true;
    }
    this.renderDraft();
    this.showDragTooltip(event.clientX, event.clientY);
  }

  dragInterval() {
    if (!this.drag) return null;
    const startMinute = this.drag.startMinute;
    const raw = this.drag.currentMinute;
    const delta = (raw - startMinute + 1440) % 1440;
    let start = startMinute;
    let end = raw;
    let crossed = false;

    if (delta > 720) {
      // Dragging backwards: use the shorter arc raw -> startMinute.
      start = raw;
      end = startMinute;
    } else {
      start = startMinute;
      end = raw;
    }

    if (delta === 0) {
      end = Math.min(start + 15, 1425);
    } else if (end <= start) {
      // The shorter arc crosses midnight; keep only the part on this day.
      end = 1425;
      crossed = true;
    }

    if (end > 1425) end = 1425;
    if (end <= start) start = Math.max(0, end - 15);
    return { start, end, crossed, delta };
  }

  handlePointerUp(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    const drag = this.drag;
    this.drag = null;
    this.clearDraft();
    this.hideTooltip();
    try {
      this.svg.releasePointerCapture?.(event.pointerId);
    } catch (error) {
      // The pointer may already be released by the browser.
    }

    let start;
    let end;
    let crossed = false;
    if (!drag.moved) {
      start = snapMinutes(drag.startMinute);
      end = Math.min(start + 60, 1425);
      if (end - start < 15) start = Math.max(0, end - 60);
    } else {
      const interval = this.dragIntervalFrom(drag);
      start = interval.start;
      end = interval.end;
      crossed = interval.crossed;
    }

    if (end > 1425) end = 1425;
    if (end - start > MAX_BLOCK_MINUTES) {
      end = Math.min(start + MAX_BLOCK_MINUTES, 1425);
    }
    if (end <= start) {
      start = Math.max(0, end - 60);
    }
    if (end <= start) return;
    const notice = crossed ? "跨午夜的安排已截到 23:45；0 点后的部分请放到下一天。" : null;
    this.onCreate(start, end, notice);
  }

  dragIntervalFrom(drag) {
    const saved = this.drag;
    this.drag = drag;
    const interval = this.dragInterval();
    this.drag = saved;
    return interval;
  }

  cancelDrag() {
    this.drag = null;
    this.clearDraft();
    this.hideTooltip();
  }

  renderDraft() {
    this.clearDraft();
    if (!this.drag) return;
    const { start, end } = this.dragInterval();
    if (end <= start) return;
    const path = svgEl("path", {
      d: arcPath(254, start, end),
      class: "draft-arc",
    });
    this.draftLayer.append(path);
  }

  clearDraft() {
    this.draftLayer.replaceChildren();
  }

  showBlockTooltip(block, clientX, clientY) {
    if (!this.tooltip) return;
    const category = CATEGORIES[block.category] || CATEGORIES.focus;
    this.tooltip.replaceChildren();
    const title = document.createElement("b");
    title.textContent = block.title;
    const time = document.createElement("span");
    time.textContent = `${minutesToTime(block.start)} – ${minutesToTime(block.end)} · ${formatCompactDuration(block.end - block.start)}`;
    const meta = document.createElement("em");
    meta.textContent = `${category.label}${block.note ? ` · ${block.note}` : ""}${block.done ? " · 已完成" : ""}`;
    this.tooltip.append(title, time, meta);
    this.positionTooltip(clientX, clientY);
  }

  showDragTooltip(clientX, clientY) {
    if (!this.tooltip || !this.drag) return;
    const { start, end, crossed } = this.dragInterval();
    this.tooltip.replaceChildren();
    const title = document.createElement("b");
    title.textContent = `${minutesToTime(start)} – ${minutesToTime(end)}`;
    const time = document.createElement("span");
    time.textContent = formatDurationCN(end - start);
    const meta = document.createElement("em");
    meta.textContent = crossed ? "跨午夜，截到 23:45" : "松开后编辑";
    this.tooltip.append(title, time, meta);
    this.positionTooltip(clientX, clientY);
  }

  positionTooltip(clientX, clientY) {
    if (!this.tooltip || !this.wrap) return;
    const rect = this.wrap.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 104, rect.width - 104);
    const y = clientY - rect.top;
    this.tooltip.classList.toggle("is-below", y < 112);
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y + (y < 112 ? 22 : -8)}px`;
    this.tooltip.hidden = false;
  }

  hideTooltip() {
    if (this.tooltip) this.tooltip.hidden = true;
  }

  destroy() {
    clearInterval(this.nowTimer);
  }
}
