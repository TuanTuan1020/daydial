> **Status note (Lead, 2026-11-08):** This is the original independent review. The final build addresses H1–H3 and most Medium/Low items: cross-midnight drags are truncated to 23:45 with an in-dialog notice; the service worker is `daydial-v2` with stale-while-revalidate; the ambiguous composition ring was removed and replaced by a separate horizontal composition bar; done-state CSS, focus restoration, tab stop, touch targets, contrast, meeting color, print overflow, duplicate IDs and 1024px layout were fixed. M9 is resolved by making 10–11px an explicit metadata tier in the design brief (contrast ≥ 4.5:1), and N4/N5 are deliberate trade-offs. The original findings below are retained for traceability.

# 日晷 Daydial · 独立 QA 与设计评审

**Review target**：`index.html` `assets/css/style.css` `assets/js/{app,data,dial}.js` `manifest.webmanifest` `sw.js`
（SHA-256 见文末附录；评审期间 `assets/js/app.js` 有一处改动——导入后跳转日期的分支——已重新跑过全量功能用例。）
**Method**：Chrome headless (Playwright, channel=chrome) + 代码通读 + 计算样式 / 几何盒 / 像素采样。未修改任何站点文件。

> **Lead follow-up after re-check:** R1 is fixed (the arrow-key exclusion now only skips arrow-consuming controls; `?` → Esc → ArrowRight works). M1 is accepted as an intentional 06:00-top / 00-at-9-o'clock orientation and documented in the design brief. The item-check pseudo hit area is now a square 44×44, 9px declarations were raised to 10px, tooltip opacity was removed, and the intention field is 44px tall. The 320px icon-width nit is also fixed; N2/N4/N5 are accepted trade-offs.

---

## 摘要与结论

站点功能完整、健壮性不错：79 项功能用例通过 78 项（唯一"失败"是导入后跳转到备份最后一天，属有意改动）；6 个宽度无横向溢出；5 个弹窗全部适配到 320px；XSS 安全；localStorage 脏数据全部被安全降级；Service Worker 离线可用；深色模式无残留浅色值。

**结论：没有 Blocker。修掉 3 个 High 后可以发布。**

> **最终状态（2026-11-08）：GO。** 3 个 High 全部修复并有实测证据；M2–M10 与大部分 Low 已修；复审中发现的 1 个 Medium 回归（R1 方向键）已修复并复验；M1 已由设计简报声明为有意设计（06:00 在顶），实测角度与文档一致。发布物 `4ec0895` 与线上逐字节一致。详见文末「复审」与「附录 E」。

三个 High 分别是：跨午夜拖动会生成错误的 12 小时块、Service Worker 缓存优先导致部署后老用户永远拿旧 CSS/JS、圆盘弧段与中心节奏环的零点相差 90°。

设计简报与实现的主要偏差集中在：排版比例（简报 12px 起，实现有 38 处 8–11px）、"红色只做功能色"（会议类别用的就是同一个红）、触控目标 44px、圆盘在移动端的刻度可读性。

---

## 已核验（实测通过）

| 类别 | 结果 |
|---|---|
| 空状态 | 空文案 / 3 个入口 / 清单隐藏 / "今天"按钮禁用 |
| 新建 | 单击圆盘 → 06:00–07:00；拖动 → 08:00–10:00；点弧段 → 编辑；标题自动聚焦 |
| 编辑 / 删除 | 预填正确；删除需二次确认；取消不删；删除后回到空状态 |
| 完成切换 | `aria-pressed`、划线、统计 1/1、焦点回到勾选按钮、持久化 |
| 校验 | 空标题 / end≤start / <15 分钟 / >12 小时 四类错误均拦截并聚焦 |
| 日期 | 前后箭头、今天、`?date=` 深链、popstate、跨日 00:00 自动翻页 |
| 模板 | 已有安排时先确认；取消保留；确认替换为 5 段；清空今天有确认 |
| 导出 | JSON 文件名/内容合法；ICS 5 个 VEVENT、CRLF、无 >75 字节行 |
| 导入 | 合法备份确认后替换；非法 JSON 提示且不动数据；主题随备份切换 |
| 主题 | 切换、`aria-label` 联动、`meta theme-color` 联动、刷新保持 |
| 快捷键 | N / T / ←→ / ? / Esc 全部有效；输入框内不劫持 |
| 持久化 | 刷新后主题 + 数据都在 |
| 控制台 | 0 个 console error、0 个 pageerror、0 个 4xx |
| 响应式 | 320/375/414/768/1024/1440：`scrollWidth === clientWidth`，无元素越界，无文字被裁，页头三块不重叠 |
| 弹窗 | 5 个弹窗在 320 上最小边距 19px，无内部横向滚动 |
| 无障碍 | 图标按钮全部有 `aria-label`；圆盘弧段 `role=button` + 中文名 + `tabindex=0` + Enter/Space 可开；5 个 dialog 均有有效 `aria-labelledby`；表单控件均有 label；`role=alert` 错误、`role=status` toast |
| 减弱动效 | `animation-duration: 1e-05s`、`stroke-dashoffset: 0`、`scroll-behavior: auto` |
| 对比度 | 40+ 组前景/背景实算，浅/深两套主题（见附录，异常项已列为 M8） |
| 深色模式 | 无残留浅色值；主按钮深字红底 6.25:1；弧段/刻度色正确 |
| PWA | SW activated；缓存清单与 `sw.js` 完全一致（0 缺失 0 多余）；离线刷新渲染 4 条安排 + 字体；3 个图标尺寸正确（192/512/512 maskable + 180 apple） |
| 安全 | `<img onerror>` / `<script>` / 属性注入均按文本渲染，`window.__xss` 未触发 |
| 脏数据 | 非法 JSON / null / 数组 / 负值 / NaN / end≤start / >12h / 超长标题 / `__proto__` 键 全部安全降级，无原型污染 |
| HTML | 无重复 id、1 个 h1、`label[for]` 均能解析、无嵌套交互元素 |

## 未能核验

- **真实读屏软件**（VoiceOver/NVDA）的实际播报顺序——只用无障碍树快照 + 可访问名计算。
- **原生日期选择器 UI**（headless 下 `showPicker()` 打开的是系统层，无法断言）。
- **Safari / iOS**：环境只有 Chromium，Safari 回退是按代码判断（见附录），未实机验证。
- **安装提示 / A2HS** 与真机 PWA 行为。
- **打印成品**：只做了 `emulateMedia('print')` 的布局度量，未出纸。
- **视觉审美**：无图像识别能力，结论基于计算样式、盒模型、像素采样。
- **真机触控手势**（`touch-action: none` 的实际滚动阻塞）。

---

## Blocker

无。

---

## High

### H1 跨午夜拖动会静默生成错误的 12 小时块，且与拖动提示不一致
`assets/js/dial.js:340-368`、`assets/js/dial.js:409-419`

**现象**：从 22:00 拖到 02:00（逆时针越过 0 点），拖动中提示是「02:00 – 22:00 / 20 小时」，松手后对话框变成「02:00 – 14:00 / 12 小时」。两个方向拖都一样。
**原因**：`end < start` 时直接交换（:354），之后只对 `end` 做 `MAX_BLOCK_MINUTES` 截断（:361-363），没有"跨日"语义；`showDragTooltip` / `renderDraft` 用的却是未截断的 20 小时区间。
**复现**：圆盘半径 250 处，22:00 按下 → 拖到 02:00 → 松开。
**建议**：跨 0 点时按「22:00–24:00」处理（或拒绝并提示"一天之内"），并让 draft/tooltip 与最终结果使用同一套夹取逻辑。

### H2 Service Worker 缓存优先 + 固定缓存名 → 部署后老用户永远拿到旧 CSS/JS
`sw.js:1`、`sw.js:57-68`（导航是 network-first，子资源是 cache-first）

**现象**：CSS/JS 命中缓存就直接返回、永不回源；`VERSION` 仍是 `daydial-v1`，安装流程不会重跑。本次 `style.css`/`app.js` 都改过，任何装过 SW 的浏览器会拿"新 HTML + 旧 CSS/JS"，表现就是版式错乱。
**复现**：装好 SW 后修改 `style.css`，刷新两次仍返回旧样式（`caches.match` 命中）。
**建议**：每次改资源 bump `VERSION`（→ `daydial-v2`），或对 CSS/JS 改 stale-while-revalidate。

### H3 圆盘弧段与中心「节奏环」零点相差 90°，同一角度显示不同类别
`assets/js/dial.js:27-29`（`angleFor`：00:00 在 9 点方向）vs `assets/js/dial.js:228-262`（`renderMix` 的 `rotate(-90)` 让环从 12 点方向开始）

**证据**（数据：focus 00:00–06:00 + meet 06:00–12:00，截图取样）：

| 采样点 | 弧段半径 r=266 | 节奏环半径 r=184 |
|---|---|---|
| 12 点方向 | `rgb(194,47,34)` = 会议红 | `rgb(64,90,199)` = 深度蓝 |
| 9 点方向 | `rgb(40,70,200)` = 深度蓝 | `rgb(195,70,58)` = 会议红 |

环本应读作"一天的颜色构成"，但它的起点（12 点）和弧段起点（9 点）差 90°，同一方位两套颜色，读图会得出相反结论。
**建议**：把 `rotate(-90 …)` 改成与 `angleFor(0)` 对齐的旋转（180°），或把环移出表盘、做成独立比例条。

---

## Medium

### M1 00:00 落在 9 点方向，24 小时表盘整体转了 90°
`assets/js/dial.js:27-29`
实测标签角度：`00`→180°、`06`→-90°（正上）、`12`→0°（正右）、`18`→90°（正下）。顶部是 06:00 而不是 00:00；只有每 3 小时一个标签，首次使用很难定位。
**建议**：若"日出在顶"是有意设计，请在 `stage-sub`/图例里写明；否则改为 `(minute / 1440) * 360 - 90`。

### M2 完成状态在圆盘上完全没有视觉变化（CSS 规则永不匹配）
`assets/css/style.css:586-590` ← `assets/js/dial.js:201`
`is-done` 加在 `<g>` 上，规则写的是 `.dial-block.is-done`（path 上），因此 `path.matches('.dial-block.is-done') === false`：实测 opacity 仍是 1、dasharray 仍是 `1px`。
**复现**：勾选完成 → 清单有划线，圆盘上毫无变化。
**建议**：改成 `.block-group.is-done .dial-block { … }`；注意 `pathLength="1"`，`stroke-dasharray: 1 5` 仍是实线，需要改成 `0.06 0.04` 之类的小数。

### M3 点击 23:45 会生成 22:59 的起点（脱离 15 分钟网格），且 23:45–24:00 无法安排
`assets/js/dial.js:356-366`、`assets/js/app.js:361-364`（上限写死 1425）

**复现**：点圆盘 23:45 → 对话框显示 22:59–23:45，保存后 `{start:1379, end:1425}`。22:59 对 `step=900` 的 time 输入是 `stepMismatch`（`novalidate` 所以能存进去）。
**建议**：全天用 0–1440（end 允许 1440 表示 24:00），起点用 `Math.floor(minute / 15) * 15`；或起点也夹到 1425 并生成 23:30–23:45。

### M4 320–375px 上圆盘刻度文字只有 4.2–5.0 CSS px
`assets/css/style.css:492-497`（SVG 用户单位 10px）+ `.dial-wrap` 缩放

实测有效字号：320 → **4.18px**、375 → **4.99px**、768 → 9.12px、1440 → 9.26px；`tick.major` 描边在 320 上只有 0.54px。移动端刻度基本不可读——这是移动端最明显的缺陷。
**建议**：≤700px 时把 `.dial-label { font-size: 18–22px }`（用户单位）补偿缩放，或移动端只保留 00/06/12/18 四个标签。

### M5 弹窗关闭后焦点掉到 `<body>`
`assets/js/app.js:680-682`、`assets/js/app.js:551-559`

**复现**：菜单 → End → Enter（关于）→ Esc → `activeElement = BODY`；`N` → 保存 → BODY；删除 → BODY。来源元素被隐藏（菜单项）或列表重绘时，原生 dialog 的焦点还原失效。
**建议**：记录 opener；关闭后聚焦 opener（菜单项已隐藏时回 `#menuButton`，保存后回新条目或 `#addButton`）。

### M6 多出一个无名称、无角色的 Tab 停靠点 `<g id="blocksLayer">`
`index.html:128`、`assets/js/dial.js:180-226`

**复现**：Tab 到「更多操作」后再 Tab 一次 → `g#blocksLayer`，会画出红色焦点环，但没有 `role`、没有可访问名、没有任何行为。
**建议**：给 `.blocks-layer` 加 `tabindex="-1" focusable="false"`，并同步在 Safari/Firefox 复测（Chromium 会把含可聚焦子节点的 `<g>` 纳入顺序）。

### M7 触控目标小于简报要求的 44×44
`assets/css/style.css:755-757`（`.item-check` 26×26）、`:279-280`（`.today-button` 高 36）、`:1246`（≤440 时 `.icon-button` 40×40）、`.item-main` 高 20–41
**建议**：勾选按钮用伪元素把命中区撑到 44×44；今日按钮/图标按钮补到 44。

### M8 小字对比度不足：`legend-note` 2.5:1、`hub-doy` 3.47:1（浅色）
`assets/css/style.css:673-680`（8px + `opacity:.62`）、`:563-569`（8px + `opacity:.8`）
深色下 `legend-note` 3.84:1，同样低于 4.5。两者在 ≤700px 被隐藏，所以只影响桌面。
**建议**：去掉 opacity，字号提到 ≥12px，颜色用 `var(--ink-soft)`。

### M9 排版比例与简报不符（简报 12/14/16/20/25/31…，实现有 38 处 8–11px）
`assets/css/style.css` 全文件：8px×6、9px×14、10px×10、11px×8
**建议**：把 8/9/10/11px 收敛到 12px 下限，或更新简报承认小字层级。

### M10「会议」类别用的就是"现在指针"的同一个红，违背简报"红色只做功能色"
`assets/css/style.css:59`（`--cat-meet: #c22f22`，与 `:54 --red` 完全相同）；深色 `#ff7a66` vs `#ff6a55` 几乎同色
表盘上红色弧段与红指针难以区分，"红色 = 此刻/主操作"的语义被稀释。
**建议**：会议改用独立色（钢灰/靛紫），红色只留给 now / 主按钮 / 错误。

---

## Low

| # | 问题 | 位置 | 建议 |
|---|---|---|---|
| L1 | `#datePicker` 同时 `aria-hidden="true"` 又是原生可聚焦 input（`tabindex=-1`），`showPicker()` 的 UI 锚在 aria-hidden 元素上 | `index.html:81` | 去掉 `aria-hidden`，或改自绘日期控件 |
| L2 | 意图输入框聚焦无焦点环，只有外层 1px 底边变色 | `style.css:739` | 保留 `:focus-visible` outline |
| L3 | 弧段键盘焦点只靠 stroke-width 15→20，15 分钟块几乎看不出，且无 2px 环 | `style.css:593-595` | 给 `.block-group:focus-visible` 加 outline |
| L4 | 打印时右侧溢出 8px（`scrollWidth 1448 > 1440`） | `style.css:743-749`（`margin: 0 -8px` 在 :749） | 打印媒体里 `margin: 0` |
| L5 | `<button class="item-main">` 内含 `<h3>`，HTML 内容模型无效，且 `aria-label` 覆盖后标题语义也丢了 | `app.js:224-226` | 换成 `<span>` |
| L6 | 导入备份含重复 id 时两行互相覆盖：编辑改到第一条，删除删掉两条 | `data.js:237` + `app.js` 按 id 查找/过滤 | `sanitizeState` 里去重 id |
| L7 | 跳过链接目标 `#agenda` 不可聚焦：Enter 后 hash/滚动都对，但 `activeElement` 仍是 BODY | `index.html:37,155` | `<aside id="agenda" tabindex="-1">` |
| L8 | 占位符文字约 3.3:1（muted + `opacity:.72`） | `style.css:738`、`:967-968` | placeholder 不降透明度 |
| L9 | 1024px 时 62/38 仪器式分栏塌成单列（断点 1100px），首屏看不到"圆盘 + 账本"并置 | `style.css:1168-1180` | 断点降到 ~980 或窄右栏 |
| L10 | 简报承诺但未实现：两栏间顶部"小十字标记"、刻度首次淡入、删除时弧段收回 | 全局 | 补实现或从简报删除 |
| L11 | 死代码：`.draft-cap`、`.item-cat`、`--paper-2`、`daysBetween()`、`formatHoursCN()` | `style.css:632,822-831,45,80`；`data.js:135,188` | 删除 |
| L12 | 浅色 `--red` 是 `#c22f22`，简报表格写 `#D33B2C`（深色 `#FF6A55` 一致） | `style.css:54` | 二选一对齐 |
| L13 | 无 JS 时页面显示硬编码的假日期（"2026年11月8日 周日"、"第 313 天"、"现在 12:08"），且无 `<noscript>` | `index.html:78,136,139,140` | 加 `<noscript>`，静态值改为中性占位 |

---

## Nit

- N1 `.today-button:disabled { opacity: .38 }` → 禁用态"今天"对比度 1.99:1，几乎看不见（WCAG 豁免禁用控件）。
- N2 `body` 用 `radial-gradient` 画点阵，简报 §4 写"不用渐变"（视觉上是点阵，字面上有出入）。
- N3 备份里 `done: "yes"` 会被 `Boolean()` 强转为 `true`（`data.js:210`）。
- N4 菜单开着时 Tab 会走到菜单外但菜单不关闭（非模态，可接受）。
- N5 `og:image` / `canonical` 写死 `tuantuan1020.github.io`，换域名部署时预览失效。
- N6 `formatCompactDuration` 输出 `2h30`，与其余中文时长文案（"2 小时 30 分"）混用。
- N7 同一个元素里单位不一致：`#hubStat` 空状态是「已安排 0 小时」，有安排时变成「已安排 1h」（`app.js:170`）；`.durationReadout` 又是「1 小时」。建议统一为 `0h` / `1h`。

---

## 附录 A：响应式实测

| 宽度 | scrollW/clientW | 圆盘 | 刻度有效字号 | 弹窗最小边距 |
|---|---|---|---|---|
| 320 | 320/320 | 284px | 4.18px | 19px |
| 375 | 375/375 | 339px | 4.99px | 19px |
| 414 | 414/414 | 378px | 5.56px | 19px |
| 768 | 768/768 | 620px | 9.12px | 74px |
| 1024 | 1024/1024 | 620px（单列） | 9.12px | 202px |
| 1440 | 1440/1440 | 630px | 9.26px | 410px |

页头三块（brand / date-nav / header-actions）在全部宽度均无重叠。

## 附录 B：对比度（浅色 / 深色）

| 元素 | 浅色 | 深色 |
|---|---|---|
| 正文 / 标题 | 14.2 | 15.4 |
| `--muted` 小字（9–11px） | 5.17 | 8.10 |
| 主按钮（白/深字 + 红底） | 5.64（hover 6.88） | 6.25 |
| 危险按钮（红字） | 4.97 | 5.74 |
| `hub-now` / 现在指针 | 4.54 | 6.53 |
| 表盘标签 | 5.17 | 8.10 |
| **`hub-doy`（8px, .8）** | **3.47 ✗** | 5.58 |
| **`legend-note`（8px, .62）** | **2.50 ✗✗** | **3.84 ✗** |
| 占位符（muted .72） | ~3.3 ✗ | ~4.9 |
| 弧段四色 vs 纸面 | 4.54–6.02 | 7.24–9.43 |

## 附录 C：Safari 回退（代码判断，未实机）

- `showPicker()` 有 `typeof` 守卫；`crypto.randomUUID` 有兜底；`matchMedia(...).addEventListener?.` 有可选链。
- `dialog` / `:has()` / `@layer` / `aspect-ratio` / `100dvh` 均要求 Safari ≥ 15.4，无降级但可接受。
- `backdrop-filter`（`style.css:915`）缺 `-webkit-` 前缀，Safari < 18 弹窗背板无模糊（仅观感）。
- `text-wrap: balance`（`:434`）在旧 Safari 无效，只是标题换行差一点。

## 附录 D：评审对象哈希

```
f7614fd7…c601c  index.html
d288217e…a7936  assets/css/style.css
48bc913f…d0cf1  assets/js/app.js
46817ac3…5382  assets/js/data.js
eeda0af7…d2766  assets/js/dial.js
6d73b99a…ea0d0  sw.js
4e3900d6…8ff56c manifest.webmanifest
```

---

# 复审（修复后 · 2026-11-08）

**复审对象**

```
2b1e69c2eb01e80a27343ba34125651b31a67577583a1b76b87a27eeeb431af2  index.html
557e298b1c551b1646b43436ac61200e096303b205bfee9bbafab864b3668b41  assets/css/style.css
a9bdf19e7e5c15fdbb1322b7b3de276588a74ee4879701b0b8b3c4eb714c891a  assets/js/app.js
24d5c99a021071ccd474937a7b33f948deb6d7941db0e6071d71a1974eea77a2  assets/js/data.js
ef48fe6be7aff142d5fdd3e04a6ee05071834a7896d223e40b3cbb9cc056d902  assets/js/dial.js
f2b24f59d706c461c5f436826d0cd647d8ad32e945a96a9129f3e5efb2d195d1  sw.js
4e3900d6e142f47c6ab3b9465e2ad6f61550baa92d62e026b4b80bb9e48ff56c  manifest.webmanifest（未变）
```

## 复审结论

**3 个 High 全部修复，均有实测证据；Medium 修好 9 项，Low 修好 6 项；新增 1 个 Medium 回归（方向键）。**
没有新的 Blocker 或 High，可以发布。建议随后补掉 R1（约 2 行），并对 M1 做一个明确决定。

> **最终发布状态（2026-11-08 收尾）**：发布物为 commit `4ec0895`，工作区与线上**逐字节一致**（7 个文件全部 MATCH，`?cb=` 破缓存后比对 SHA-256）。下方"复审对象"里的哈希是上一个中间构建；最终哈希见文末「附录 E」。复审进行中曾出现过一次构建漂移（app.js 16:13、style.css 16:13/16:14:45），已用最终构建复验收口。

## 已核验修复

| # | 状态 | 实测证据 |
|---|---|---|
| H1 跨午夜拖动 | ✅ | 22:00→02:00 与 02:00→22:00 都得到 **22:00–23:45**；拖动中提示「22:00 – 23:45 / 1 小时 45 分 / 跨午夜，截到 23:45」与对话框、与落库值（1320/1425）三者一致；对话框内 `#formNotice`（`role=status`，对比度 9.02:1）说明"0 点后的部分请放到下一天"；未点保存前 localStorage 为空 |
| H2 SW 缓存 | ✅ | 干净 profile：`caches` 初始为空 → 只有 `daydial-v2`；缓存集合与 `sw.js` core 列表 **14/14 完全一致**；SWR 用路由拦截实测：首次返回**缓存的旧 body**（无探针），后台再验证后缓存内出现新 body（有探针），网络命中 1 次；预置的 `daydial-v1` 在 activate 时被删除；离线刷新完整渲染；全程 0 个 4xx |
| H3 构成环 | ✅ | `#mixRing` / `.mix-seg` / `.mix-base` 均已从 DOM 消失；`#mixBar` 位于 `.agenda-foot`，`aria-hidden`，空数据时隐藏；3 段 flex 360/180/60 → 实测宽 240/120/40 = 60/30/10%，无溢出 |
| M2 完成态 | ✅ | 实测 `opacity 0.35`、`stroke-dasharray: 0.06px 0.04px` 真正生效（上一版是不匹配的 `.dial-block.is-done`） |
| M3 午夜 | ✅ | 点 23:45 → **22:45–23:45**，两个 time input 的 `stepMismatch` 均为 false |
| M4 刻度 | ✅ | 有效字号：320 → **9.19px**（原 4.18）、375 → 10.97、1440 → 10.19；`tick.major` 描边 320 → 1.17px（原 0.54） |
| M5 焦点还原 | ✅ | 菜单关闭 → `#menuButton`；保存 → `#addButton`；删除 → `#addButton` |
| M6 幽灵 Tab 位 | ✅ | Tab 顺序：menuButton → **第一个弧段**（`g.blocks-layer` 已不再停靠）；`tabindex="-1" focusable="false"` 生效 |
| M7 触控目标 | ✅* | `.item-check` 视觉 26×26，`::before inset:-9px` 使**有效命中区 42×42**（逐点扫描确认）；今天按钮 44.3×44；`.item-main` 已达 44 |
| M8 小字对比度 | ✅ | `legend-note` 5.17 / 8.10，`hub-doy` 5.17 / 8.10（浅/深），字号提到 10px，占位符不再降透明度 |
| M9 排版比例 | ✅* | 简报改为 10/11/12/14/16/20/…，并声明 10–11px 仅用于元数据/刻度；1024px 恢复双栏（567 + 340） |
| M10 会议色 | ✅ | `--cat-meet: #7C3F5E`（深色 `#E7A3BC`），与 `--red: #C22F22` 分离；简报原则 3 同步改写 |
| L4 打印溢出 | ✅ | print 媒体 `scrollWidth 1440 == 1440`（原 1448），`.agenda-item` margin 归零 |
| L5 button 内 h3 | ✅ | 现在是 `<span class="item-title">` |
| L6 重复 id | ✅ | 导入重复 id → 内存中第二条被重生成 UUID（`same` + `2493bbca…`） |
| L13 无 JS 占位 | ✅ | `headerDate`="今天"、hub 各字段 "—"、"正在读取本地数据"，`hubNow` 默认 hidden，并新增 `<noscript>` |

\* 见下方残余项。

## 新增问题（回归）

### R1（Medium）弹窗关闭后 ←/→ 静默失效 —— **在后续构建中已修复**

> 现状：`assets/js/app.js`（`ee4a0c57…`，16:13）已把早退条件收窄为
> `const arrowConsumer = target.closest?.("input, textarea, select, [role='menu'], [role='listbox'], [role='slider']")`，
> 实测 `?`→Esc→`ArrowRight` 正常进到次日、`ArrowLeft` 回到当日；对话框打开时方向键仍被 `dialog[open]` 拦住，单选组的方向键行为保留（实测 ←/→ 在类型单选组内正常切换）。
> 下面保留原始记录以便追溯。

`assets/js/app.js`（`rememberFocus`/`restoreFocus` 与 keydown 的 `interactive` 早退）

**现象**：按 `?` 打开快捷键 → Esc → 焦点落到 `#addButton` → 按 → 日期不变。保存、删除、`N` 后 Esc 同样。`T`、`N` 正常（它们在早退之前处理）。
**原因**：M5 的修复把焦点还原到按钮，而方向键分支前有 `const interactive = target.closest?.("button, a, [role='button']"); if (interactive) return;`。旧版焦点落到 `<body>`，所以没暴露。
**影响**：快捷键面板正是用户学会 ←/→ 的地方，学完立刻"失灵"。
**复现**：`?` → Esc → `ArrowRight`（表头停在 2026年11月8日）。
**建议**：把"任意按钮都跳过"收窄为"只跳过会消费方向键的控件"，例如
```js
const arrowConsumer = target.closest?.("input, textarea, select, [role='menu']");
if (arrowConsumer) return;
```
这样保留输入框/单选组的原生方向键行为，普通按钮不再吞掉 ←/→。

## 仍未关闭

| # | 状态 | 说明 |
|---|---|---|
| M1 | ✅ 已结案（声明为有意设计） | `angleFor` 未改，`00`→180°（9 点方向）、`06`→-90°（正上）。设计简报已新增一段明确声明："圆盘以 **06:00 为顶部**，顺时针走到次日 06:00…00:00 因此落在 **9 点方向**，06:00 在正上方，12:00 在右侧，18:00 在底部；刻度标签每 3 小时一枚。" 我按实测角度（00→180°、06→-90°、12→0°、18→90°）核对，**与实现完全一致**，不再是缺陷 |

**残余 Nit（都不阻断发布）**

- ~~`item-check` 有效命中区 42×42~~ **已修**：`inset: -9px` → `-10px`。复验（本地 + 线上）：有效命中区 **44×44**，视觉框仍 26×26，四角可命中，且相邻 `.item-main` / `.item-time` 的点击区域未受影响（elementFromPoint 抽检正常）。
- ~~320px 表头里前/后一天按钮被 flex 压到 41×44~~ **已修**：实测 320/375/1024/1440 全部 **44×44**。
- ~~`.intentionInput` 高 23px~~ **已修**：现在输入框高 **44px**，`.intention` 整行 92px。
- 5 处仍是 9px，低于简报新定的 10px 下限（`.brand-text i`、`.dial-tooltip span/em`、≤440 的 `.hub-month`、≤700 的 `.item-duration`）；其中 tooltip 仍用 `opacity .65/.78`，与简报"不用透明度压暗"一句不一致（但对比度实测 6.62 / 9.01，达标）。
- N2 未变：`body` 仍用 `radial-gradient` 画点阵，简报 §4 仍写"不用渐变"。
- N4/N5 按约定保留（菜单 Tab 不关闭、canonical/og 绑部署域名）。

## 本轮复验通过（回归面）

功能：79 项用例除下述 3 项外全部通过——「duration readout」因统一为 `2.5h` 口径（预期变化）、「ArrowRight → 次日」与随之的「今天按钮启用」为 R1 所致；导入后跳到备份最后一天为既有有意行为。
响应式：320/375/414/768/1024 全部 `scrollWidth === clientWidth`，无越界元素、无文字裁剪、页头三块不重叠；5 个弹窗在 320 上最小边距 19px、无内部横向滚动；1024 为双栏（567+340），980 以下单栏。
对比度（浅/深）：正文 14.2/15.4，muted 小字 5.17/8.10，主按钮 5.64/6.25，危险 4.97/5.74，toast 14.2，formError 5.07，formNotice 9.02，tooltip 14.2/9.01/6.62。
深色模式：0 个残留浅色值。减弱动效：`animation-duration 1e-05s`、`dashoffset 0`、`scroll-behavior auto`。
健壮性：非法 JSON/null/数组/负值/NaN/end≤start/>12h/`__proto__`/重复 id 全部安全降级，无原型污染；XSS 载荷按文本渲染。
PWA：v2 缓存、SWR、activate 清理旧版本、离线可用，均实测。
全程 0 个 console error、0 个 pageerror、0 个 4xx。

## 复审未能核验（与首轮相同）

真实读屏软件播报、原生日期选择器 UI、Safari/iOS 实机、A2HS、真实打印成品、真机触控手势。


## 附录 E：最终发布物校验（commit `4ec0895`）

本地工作区与线上 https://tuantuan1020.github.io/daydial/ 逐字节一致（`?cb=` 破缓存后取回并比对）：

| 文件 | SHA-256 | 线上 |
|---|---|---|
| index.html | `2b1e69c2eb01…a7eeeb431af2` | MATCH |
| assets/css/style.css | `4406ebe584b5…ce68574916` | MATCH |
| assets/js/app.js | `ee4a0c573708…b3c4eb714c891a` | MATCH |
| assets/js/data.js | `24d5c99a0210…a1974eea77a2` | MATCH |
| assets/js/dial.js | `ef48fe6be7af…3b3cbb9cc056d902` | MATCH |
| sw.js | `f2b24f59d706…29f3e5efb2d195d1` | MATCH |
| manifest.webmanifest | `4e3900d6e142…bb9e48ff56c` | MATCH |

`git rev-parse HEAD` = `4ec0895`，工作区干净。线上内容抽查：`style.css` 含 `inset: -10px`、`app.js` 含 `arrowConsumer`、`sw.js` 为 `daydial-v2`、`index.html` 含 `<noscript>`。

**最终确认用例（线上 + 本地，30 项全过）**

- 线上 H1：22:00→02:00 拖动 → 22:00–23:45；提示与对话框一致；对话框内 `#formNotice`；确认前 localStorage 为空。
- 线上 R1：`?`→Esc（焦点在 `#addButton`）→ `→` 进入次日、`←` 回到当日。
- 线上 H2：`daydial-v2` 已 activated 且 `controller=true`。
- 线上：0 个 console error / pageerror / 4xx。
- 本地 320/375/1024/1440：无横向溢出；`item-check` 有效命中区 **44×44**；前/后一天与今天按钮 **44×44**；意图输入框高 **44**；`.item-main` 高 **44–48**；1024 双栏（567+340）。
