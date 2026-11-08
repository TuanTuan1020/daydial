# 日晷 Daydial

> 把一天，看成一个圆。

**日晷**是一个本地优先的 24 小时日计划工具。它把一天画成一个圆：每一段安排是圆上的一段弧，颜色代表节奏，红色指针代表此刻。右侧清单是圆盘的“账本”，负责精确编辑，也负责让每个人都能用键盘完成同样的事。

- 在线体验：<https://tuantuan1020.github.io/daydial/>
- 设计简报：[docs/design-brief.md](docs/design-brief.md)
- 社交预览：[assets/og.png](assets/og.png)

![日晷 Daydial 预览](assets/og.png)

## 功能

- **圆盘安排**：点击圆盘空白处放下 1 小时；拖动可指定 15 分钟到 12 小时的区间；点击弧段编辑。
- **四种节奏**：深度、会议、生活、休息；颜色只表示类型，不表示优先级。
- **清单编辑**：标题、开始/结束时间、类型、备注、完成勾选、删除。所有圆盘操作都有清单里的键盘等价路径。
- **每天独立**：前后一天、今天按钮、原生日期选择器；日期会同步到 URL（`?date=2026-11-08`），可以收藏或分享某一天。
- **本地优先**：数据保存在 `localStorage`，没有账号、后端和追踪。支持 JSON 备份/导入、ICS 日历导出、打印。
- **模板**：深度日、会议日、休息日、示例一天；替换已有安排前会确认。
- **暗色模式**：跟随首次系统偏好，可手动切换；两套配色分别校准对比度。
- **PWA / 离线**：Service Worker 缓存核心资源，可安装到桌面；离线仍可打开和编辑。
- **无障碍**：原生 `<dialog>`、可见焦点、44px 触控目标、`prefers-reduced-motion`、清单作为圆盘的等价操作面。

## 设计

设计概念是**“一天不是列表，是一个圆”**，视觉语言来自日晷/测绘仪器，而不是常见的 SaaS 仪表盘：

- **冷骨白纸面** `#E7E7E1`、**墨黑** `#151A16`、**信号红** `#C22F22`；红色只用于“此刻”、主操作和错误。会议使用**梅紫** `#7C3F5E`，不占用红色。
- **Bricolage Grotesque**（拉丁/数字）+ **Songti SC**（中文展示）+ **PingFang SC**（正文）+ **IBM Plex Mono**（时间读数）。
- 不对称 62/38 分栏；圆盘是唯一主角，右侧清单保持安静；没有渐变、玻璃拟态和统一的圆角卡片网格。
- 圆盘以 **06:00 为顶部**，顺时针走到次日 06:00；类别构成放在清单底部的比例条，不放在圆盘上，避免被误读成时间。
- 动效只保留一次圆盘绘制、拖拽草稿和操作反馈；`prefers-reduced-motion` 下全部取消。

完整的设计推演、反模板检查和交互模型见 [docs/design-brief.md](docs/design-brief.md)。

## 本地运行

不需要构建步骤，也没有运行时依赖：

```sh
cd daydial
python3 -m http.server 8123
# 打开 http://127.0.0.1:8123/
```

> ES modules 和 Service Worker 需要通过 HTTP 访问；直接双击 `index.html`（`file://`）无法完整运行。

## 测试

```sh
npm install
npm test
```

`tests/smoke.cjs` 会自动在 8137 端口启动静态服务器，然后用 Playwright 跑一遍核心流程：空状态、添加/编辑/完成、刷新持久化、模板替换、暗色模式、圆盘拖拽、移动端无横向溢出。默认使用本机 Chrome（`channel: 'chrome'`）；如果没有 Chrome，先运行 `npx playwright install chromium`，脚本会自动回退到 Playwright 的 Chromium。

## 数据与隐私

- 存储键：`daydial.v1`
- 结构：`{ version, theme, days: { "YYYY-MM-DD": { blocks: [...], note } }, meta }`
- 每段安排：`{ id, title, start, end, category, note, done }`，`start`/`end` 是当天 0 点起的分钟数。
- 导出 JSON 是完整备份；导入会替换当前浏览器里的全部数据，并先确认。
- 没有网络请求发送安排内容；字体、图标、脚本全部本地托管。

## 部署到 GitHub Pages

仓库根目录就是发布目录，不需要 Actions：

1. 推送 `main` 分支。
2. 仓库 **Settings → Pages**：Source 选 **Deploy from a branch**，Branch 选 `main`，目录选 `/ (root)`。
3. 站点地址：`https://<username>.github.io/daydial/`。

`.nojekyll` 已包含，避免 GitHub Pages 的 Jekyll 处理。PWA 的 Service Worker 需要 HTTPS，GitHub Pages 默认提供。

## 技能与参考

构建时通过 GitHub 搜索、检查并安装了以下 Agent Skills（安装在 `~/.dsh/skills/`，不随仓库分发；第三方内容版权归原作者）。完整来源、提交与安装命令见 [docs/skills.md](docs/skills.md)。

| Skill | 来源 | 用途 |
|---|---|---|
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | 视觉方向、字体/色彩推演、反模板自检 |
| `webapp-testing` | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/webapp-testing) | Playwright 测试流程与截图检查 |
| `web-design-guidelines` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | 对照 Vercel Web Interface Guidelines 做 UI/无障碍审查 |
| `ui-ux-pro-max` | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 本地设计系统搜索，作为参考而非直接套用 |

其他参考：

- [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines)
- 字体授权：[Bricolage Grotesque OFL](assets/fonts/OFL-Bricolage-Grotesque.txt)、[IBM Plex Mono OFL](assets/fonts/OFL-IBM-Plex-Mono.txt)

## 目录

```text
daydial/
├── index.html
├── assets/
│   ├── css/style.css
│   ├── js/{app,data,dial}.js
│   ├── fonts/
│   ├── icons/
│   └── og.png
├── docs/
│   ├── design-brief.md
│   ├── skills.md
│   ├── review.md
│   └── og-source.html
├── tests/smoke.cjs
├── package.json
├── manifest.webmanifest
├── sw.js
├── robots.txt
└── .nojekyll
```

## License

代码以 [MIT](LICENSE) 发布。字体遵循各自的 SIL Open Font License；第三方技能与参考资料的授权归原作者。
