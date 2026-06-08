# agent-squad

为 [OpenCode](https://opencode.ai) 项目初始化多 Agent 协作团队的 CLI 工具。

## 快速开始

### NPX（推荐）

```bash
npx @soulchildtc/agent-squad init --yes --no-lark
```

### 本地运行

```bash
git clone <repo-url>
cd agent-squad
npm install

# 一键初始化
node src/cli.js init --yes --no-lark
```

## 使用方式

```bash
# NPX
npx @soulchildtc/agent-squad init [选项]

# 本地
node src/cli.js init [选项]
```

### 选项

| 参数 | 说明 |
|------|------|
| `--model <id>` | 直接指定模型（跳过交互选择） |
| `--lark` | 启用飞书集成 |
| `--no-lark` | 跳过飞书集成 |
| `--yes` | 跳过所有交互，使用默认模型 |

### 示例

```bash
# 交互式：选择模型 → 统一或独立设置 → 飞书集成
npx @soulchildtc/agent-squad init

# 全自动
npx @soulchildtc/agent-squad init --yes --no-lark

# 指定模型 + 飞书
npx @soulchildtc/agent-squad init --model opencode/deepseek-v4-flash-free --lark
```

### 模型搜索

交互式选择模型时，支持关键词搜索过滤：

```
  为所有 Agent 选择模型（输入关键词搜索，输入空值取消）：
    1. opencode/big-pickle
    2. opencode/deepseek-v4-flash-free
    ...
  搜索：deepseek

  为所有 Agent 选择模型（输入关键词搜索，输入空值取消）：
    1. opencode/deepseek-v4-flash-free
    2. deepseek/deepseek-chat
    ...
  搜索（5 个匹配）：2
```

输入编号即可选中，输入关键词过滤列表，输入空值取第一个结果。

## Agent 角色

| 角色 | 说明 |
|------|------|
| CEO | 总协调者，负责任务分配和结果整合 |
| Product Manager | 产品经理，负责需求分析和产品规划 |
| Fullstack Developer | 全栈开发工程师，负责技术选型和代码开发 |
| UI/UX Designer | UI/UX 设计师，负责界面设计和用户体验 |
| Marketing & Growth | 营销增长负责人，负责获客和转化优化 |
| Customer Service | 客户服务与运营专员，负责用户运营 |
| Security Engineer | 安全工程师，负责代码安全审计 |
| Advisor | 智囊团，提供决策建议和解决方案 |

## 项目结构

```
agent-squad/
├── package.json
├── .gitignore
├── src/
│   ├── cli.js            # CLI 入口
│   └── commands/
│       └── init.js       # init 命令实现
├── templates/
│   ├── agents/           # Agent 角色 Markdown 模板
│   │   ├── ceo.md
│   │   ├── product-manager.md
│   │   └── ...
│   └── lark/             # 飞书集成 prompt 补丁
│       ├── ceo.md
│       └── ...
└── .opencode/
    └── agents/           # 本地工作副本（会同步到生成的文件）
```

## 开发

```bash
git clone <repo-url>
cd agent-squad
npm install
node src/cli.js init
```

不发布 npm 时，通过 `node src/cli.js` 直接运行即可。

已发布 npm，可通过 `npx @soulchildtc/agent-squad` 直接运行。
