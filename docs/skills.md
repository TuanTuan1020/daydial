# 构建时安装的 Skills

这些 Skill 安装在用户级目录 `~/.dsh/skills/`，因此当前 DSH 会话和后续会话都能直接调用；它们不随 `daydial` 仓库分发，第三方内容版权归原作者。

| Skill | 安装路径 | 来源 | 固定提交 | 用途 |
|---|---|---|---|---|
| `frontend-design` | `~/.dsh/skills/frontend-design` | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | `2c5958e` | 视觉方向、字体/色彩推演、反模板自检 |
| `webapp-testing` | `~/.dsh/skills/webapp-testing` | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/webapp-testing) | `2c5958e` | Playwright 测试流程、截图与浏览器日志 |
| `web-design-guidelines` | `~/.dsh/skills/web-design-guidelines` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | `1a2c79d` | 对照 Vercel Web Interface Guidelines 审查 UI/无障碍 |
| `ui-ux-pro-max` | `~/.dsh/skills/ui-ux-pro-max` | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | `4f2dbb6` | 本地设计系统搜索（风格、配色、字体、UX 规则） |

## 安装方式

```sh
# 只读检查仓库，再把需要的 skill 目录复制到用户级 skills 根目录
git clone --depth 1 https://github.com/anthropics/skills.git /tmp/anthropic-skills
cp -R /tmp/anthropic-skills/skills/frontend-design ~/.dsh/skills/
cp -R /tmp/anthropic-skills/skills/webapp-testing ~/.dsh/skills/

git clone --depth 1 https://github.com/vercel-labs/agent-skills.git /tmp/vercel-agent-skills
cp -R /tmp/vercel-agent-skills/skills/web-design-guidelines ~/.dsh/skills/

git clone --depth 1 https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git /tmp/ui-ux-pro-max
cp -R /tmp/ui-ux-pro-max/.claude/skills/ui-ux-pro-max ~/.dsh/skills/
```

`web-design-guidelines` 额外保存了一份 Vercel 指南快照到 `~/.dsh/skills/web-design-guidelines/guidelines.md`，离线时也能审查；`ui-ux-pro-max` 的脚本路径已改为 `${DSH_HOME:-$HOME/.dsh}/skills/ui-ux-pro-max/scripts/search.py`，避免依赖 Claude 专用环境变量。

## 使用记录

- `frontend-design`：先写设计简报，再对照“暖奶油 + 衬线 + 陶土色”“近黑 + 荧光色”“统一圆角卡片”等默认套路做反模板检查。
- `ui-ux-pro-max`：运行 `--design-system` 搜索“daily planner productivity calendar tool”，把返回的 Flat Design/teal 方案作为对照，没有直接套用；最终采用“日晷/测绘仪器”方向。
- `webapp-testing` + `web-design-guidelines`：用 Playwright 做空状态、添加/编辑、持久化、模板、拖拽、移动端、离线、深色模式检查，并逐条对照可访问性/焦点/表单/动效规则。
- 站点自身的回归测试在 [`tests/smoke.cjs`](../tests/smoke.cjs)，不依赖这些 Skill。

## 搜索方式

```sh
gh search repos "agent skills web design" --limit 10
gh search repos "frontend design skill" --limit 10
gh repo view anthropics/skills
gh repo view vercel-labs/agent-skills
gh repo view nextlevelbuilder/ui-ux-pro-max-skill
```

只安装了与“静态站点设计 + 浏览器验证”直接相关的四个 Skill；没有安装与后端、文档、幻灯片相关的 Skill。
