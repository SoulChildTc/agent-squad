# agent-squad

为 [OpenCode](https://opencode.ai) 项目初始化多 Agent 协作团队的 CLI 工具。

## 快速开始

```bash
# 克隆项目
git clone <repo-url>
cd agent-squad

# 安装依赖（本项目无运行时依赖，确保 node >= 18 即可）
npm install

# 初始化多 Agent 团队
node src/cli.js init
```

## 使用方式

```bash
agent-squad init [选项]
```

### 选项

| 参数 | 说明 |
|------|------|
| `--scope <project\|global>` | 安装到项目目录（`.opencode/agents/`）或全局（`~/.config/opencode/agents/`） |
| `--model <id>` | 为所有 Agent 指定同一个模型（跳过交互选择） |
| `--lark` | 启用飞书集成（安装 skills + 追加 prompt 补丁） |
| `--no-lark` | 跳过飞书集成询问 |
| `--yes` | 跳过所有确认提示 |

### 示例

```bash
# 交互模式
node src/cli.js init

# 安装到项目，指定模型，不使用飞书
node src/cli.js init --scope project --model opencode/deepseek-v4-flash-free --yes --no-lark

# 安装到项目，启用飞书集成
node src/cli.js init --scope project --model opencode/deepseek-v4-flash-free --yes --lark

# 安装到全局配置
node src/cli.js init --scope global
```

## 工作流程

1. **选择安装范围** — 当前项目（`.opencode/agents/`）或全局（`~/.config/opencode/agents/`）
2. **选择模型** — 自动拉取 `opencode models` 列表，支持编号选择或手动输入。支持统一模型和每 Agent 独立模型两种模式
3. **生成 8 个 Agent 文件** — CEO、PM、开发、设计、营销、客服、安全、顾问
4. **可选飞书集成** — 安装 `lark-doc`、`lark-drive`、`lark-shared` 技能并追加 prompt 补丁

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
