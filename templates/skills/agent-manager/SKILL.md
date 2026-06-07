---
name: agent-manager
description: 管理团队角色配置，包括查看、修改代理的skill权限、温度、工具权限等参数
license: MIT
compatibility: opencode
metadata:
  audience: ceo
  workflow: agent-management
---

## 功能说明

这是一个专为 CEO 设计的角色管理工具，可以方便地查看和修改团队中所有代理的配置。

## 使用场景

当需要以下操作时使用此 skill：
- 查看所有角色的当前配置
- 修改某个角色可用的 skills
- 调整角色的温度参数
- 修改角色的工具权限
- 调整角色之间的调用权限
- 禁用或启用某个角色

## 可管理的配置项

### 1. Skill 权限
```yaml
permission:
  skill:
    "*": deny           # 默认禁止所有
    "skill-name-*": allow  # 允许特定模式的 skills
```

### 2. 温度参数
```yaml
temperature: 0.3  # 0.0-1.0，越低越确定，越高越创意
```

### 3. 工具权限
```yaml
tools:
  read: true
  write: true
  edit: true
  bash: false
  webfetch: false
```

### 4. 任务调用权限
```yaml
permission:
  task:
    "*": deny
    "agent-name": allow
```

### 5. 操作权限
```yaml
permission:
  edit: ask/allow/deny
  bash: ask/allow/deny
  webfetch: ask/allow/deny
```

## 操作流程

### 查看所有角色配置
1. 读取 `.opencode/agents/` 目录下所有 `.md` 文件
2. 解析每个文件的 YAML frontmatter
3. 以表格形式展示所有角色的关键配置

### 修改角色配置
1. 确认要修改的角色名称
2. 确认要修改的配置项
3. 读取该角色的 `.md` 文件
4. 修改对应的 YAML frontmatter
5. 保存文件
6. 提示用户重启 opencode 使配置生效

## 配置文件位置

所有角色配置文件位于：`.opencode/agents/`

| 角色 | 文件名 | 模式 |
|------|--------|------|
| CEO | ceo.md | primary |
| 产品经理 | product-manager.md | subagent |
| 全栈开发工程师 | fullstack-developer.md | subagent |
| UI/UX设计师 | ui-ux-designer.md | subagent |
| 营销增长负责人 | marketing-growth.md | subagent |
| 客户服务专员 | customer-service.md | subagent |
| 安全工程师 | security-engineer.md | subagent |

## 输出格式

### 查看配置时输出
```
角色配置总览：
| 角色 | 温度 | 可用Skills | 可调用角色 | 工具权限 |
|------|------|-----------|-----------|---------|
| CEO | 0.3 | 所有 | 所有 | 全部 |
| 产品经理 | 0.2 | product-*, market-research* | 无 | read,write,edit |
...
```

### 修改配置时输出
```
已更新 [角色名] 的配置：
- 修改项：[配置项名称]
- 原值：[旧值]
- 新值：[新值]

请重启 opencode 使配置生效。
```

## 注意事项

1. 修改配置后需要重启 opencode 才能生效
2. CEO 的 `permission.task: {"*": allow}` 不要修改，否则无法自动调用子代理
3. 温度建议范围：0.0-1.0
4. 修改前建议先查看当前配置
