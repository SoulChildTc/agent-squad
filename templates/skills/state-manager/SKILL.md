---
name: state-manager
description: 任务状态管理：保存、恢复、列出任务状态，支持任务中断后恢复上下文继续执行
license: MIT
compatibility: opencode
metadata:
  audience: all
  workflow: task-state-management
---

## 功能说明

这是一个任务状态管理工具，用于在任务中断后恢复上下文继续执行。

## 使用场景

- **subAgent 启动时**：检查是否有未完成的任务，恢复上下文继续执行
- **subAgent 执行中**：定期保存任务进度，以便中断后恢复
- **CEO 启动时**：检查所有未完成任务，向用户展示并询问是否继续
- **任务完成时**：标记任务为已完成

## 存储位置

所有任务状态文件存储在：`.agent/tasks/`

文件命名格式：`<task-id>.json`

## 状态文件格式

```json
{
  "taskId": "fix-login-bug",
  "agent": "fullstack-developer",
  "status": "in_progress",
  "summary": "修复登录 bug",
  "userRequest": "用户说登录页面点击登录按钮没反应",
  "context": {
    "files": ["src/auth.js"],
    "variables": { "errorLine": 42 }
  },
  "createdAt": "2026-06-08T12:00:00Z",
  "updatedAt": "2026-06-08T12:30:00Z"
}
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| taskId | ✅ | 任务唯一标识 |
| agent | ✅ | 负责此任务的 Agent 名称 |
| status | ✅ | 任务状态：`in_progress`、`completed`、`failed` |
| summary | ✅ | 任务摘要（一句话描述） |
| userRequest | ✅ | 用户原始需求 |
| context | ❌ | 上下文信息（可选，根据实际情况填写） |
| createdAt | ✅ | 任务创建时间（ISO 8601） |
| updatedAt | ✅ | 最后更新时间（ISO 8601） |

### context 字段说明

`context` 是可选字段，用于保存任务相关的上下文信息。结构灵活，可根据实际情况填写：

```json
{
  "context": {
    "files": ["src/auth.js", "src/utils.js"],
    "variables": { "errorLine": 42, "bugType": "event-binding" },
    "notes": "已定位问题在 onclick 事件绑定"
  }
}
```

## CLI 命令

### 保存任务状态

```bash
.opencode/skills/state-manager/bin/task-state save <task-id> [options]
```

**选项：**
- `--agent <name>` - Agent 名称（必填）
- `--status <status>` - 任务状态：`in_progress`、`completed`、`failed`（必填）
- `--summary <msg>` - 任务摘要（必填）
- `--user-request <msg>` - 用户原始需求（必填）
- `--context <json>` - 上下文信息（可选）

**示例：**
```bash
.opencode/skills/state-manager/bin/task-state save fix-login-bug \
  --agent fullstack-developer \
  --status in_progress \
  --summary "修复登录 bug" \
  --user-request "用户说登录页面点击登录按钮没反应" \
  --context '{"files": ["src/auth.js"], "variables": {"errorLine": 42}}'
```

### 读取任务状态

```bash
.opencode/skills/state-manager/bin/task-state load <task-id>
```

**示例：**
```bash
.opencode/skills/state-manager/bin/task-state load fix-login-bug
```

**输出：** JSON 格式的任务状态

### 列出任务

```bash
.opencode/skills/state-manager/bin/task-state list [options]
```

**选项：**
- `--all` - 列出所有任务（包括已完成的）
- `--agent <name>` - 只列出指定 Agent 的任务

**示例：**
```bash
.opencode/skills/state-manager/bin/task-state list
.opencode/skills/state-manager/bin/task-state list --all
.opencode/skills/state-manager/bin/task-state list --agent fullstack-developer
```

**输出格式：**
```
未完成任务：
| 任务ID | Agent | 摘要 | 状态 | 更新时间 |
|--------|-------|------|------|----------|
| fix-login-bug | fullstack-developer | 修复登录 bug | in_progress | 2026-06-08 12:30 |
```

### 清除任务状态

```bash
.opencode/skills/state-manager/bin/task-state clear <task-id>
```

**示例：**
```bash
.opencode/skills/state-manager/bin/task-state clear fix-login-bug
```

## 工作流程

### CEO 启动时

1. 执行 `.opencode/skills/state-manager/bin/task-state list` 检查未完成任务
2. 如果有未完成任务，向用户展示
3. 用户决定是否继续
4. 如果继续，调度对应 Agent 执行

### subAgent 启动时

1. 执行 `.opencode/skills/state-manager/bin/task-state list --agent <当前agent>` 检查自己的未完成任务
2. 如果有未完成任务，执行 `.opencode/skills/state-manager/bin/task-state load <task-id>` 读取上下文
3. 根据上下文继续执行任务

### subAgent 执行中

1. 定期执行 `.opencode/skills/state-manager/bin/task-state save` 保存进度
2. 任务完成时，执行 `.opencode/skills/state-manager/bin/task-state save --status completed`

### CEO 恢复任务时

1. 用户选择要恢复的任务
2. CEO 调度对应 Agent 执行
3. Agent 自动用 skill 读取状态并继续

## 注意事项

1. **task-id 命名规范**：使用小写字母、数字和连字符，如 `fix-login-bug`、`write-prd`
2. **状态更新时机**：开始任务时保存，进度更新时保存，完成时保存
3. **context 字段**：只保存必要的上下文，避免文件过大
4. **并发安全**：同一任务同时只有一个 Agent 执行
