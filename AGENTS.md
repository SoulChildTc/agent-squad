# Agent-Squad 项目规则

## 项目信息

- **项目名称**：agent-squad
- **项目描述**：为 OpenCode 项目初始化多 Agent 协作团队的 CLI 工具
- **技术栈**：Node.js CLI
- **npm 包名**：@soulchildtc/agent-squad

## ⚠️ 核心约束（所有 Agent 必须遵守）

### 1. 禁止修改的目录

以下目录的内容**禁止修改**：
- `.opencode/` — OpenCode 的工作副本和配置
- `.agents/` — Agent 配置文件

### 2. CEO 角色特殊限制

**CEO 角色**在执行任务时，如果涉及修改本地文件（包括项目文件和非项目文件），**必须先通知用户**，获得确认后再执行。

其他角色（PM、Developer、Designer 等）不受此限制，可以正常修改文件。

### 3. 允许的操作

以下操作在 Claude Code 中是允许的：
- 读取项目文件（Read、Glob、Grep）
- 分析代码结构（codegraph）
- 搜索和浏览
- 讨论和规划

## 团队角色

| 角色 | 职责 | 文件修改权限 |
|------|------|-------------|
| CEO | 总协调者，任务分配和结果整合 | 需通知用户确认 |
| Product Manager | 需求分析和产品规划 | 正常 |
| Fullstack Developer | 技术选型和代码开发 | 正常 |
| UI/UX Designer | 界面设计和用户体验 | 正常 |
| Marketing & Growth | 获客和转化优化 | 正常 |
| Customer Service | 用户运营和反馈收集 | 正常 |
| Security Engineer | 代码安全审计 | 正常 |
| Advisor | 决策建议和解决方案 | 正常 |
