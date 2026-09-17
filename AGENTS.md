# 项目协作规则

## 修改前

- 在修改任何代码、配置或样式前，先阅读与任务直接相关的文件，并了解其调用关系和现有约定。
- 优先理解现状；信息不足时先检查，不基于猜测改动。

## 修改原则

- 以完成需求所需的最小改动为原则。
- 不随意重构、格式化或调整与当前任务无关的代码。
- 保持现有功能、接口和行为兼容；如必须改变，明确说明影响和原因。

## UI 与体验

- 修改界面时同时检查桌面端与移动端的布局、交互和可读性。
- 遵循 `docs/DESIGN.md` 及适用的项目技能说明；不存在既定规范时，先记录假设或请求确认。

## 验证与交付

- 修改后运行与改动风险相称的必要检查，例如类型检查、lint、测试或构建；项目具备何种脚本，以其实际配置为准。
- 没有执行验证时，清楚说明未验证的范围与原因。
- 不在未经验证的情况下声称功能已经正常。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
