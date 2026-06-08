#!/usr/bin/env node
import { init } from './commands/init.js';
import { agents } from './commands/agents.js';
import { skills } from './commands/skills.js';
import { lark } from './commands/lark.js';
import { model } from './commands/model.js';
import { enable } from './commands/enable.js';
import { disable } from './commands/disable.js';

function showHelp() {
  console.log(`
Usage: agent-squad <command> [options]

Commands:
  init              全量初始化（Agent + Skills + 飞书）
  update agents     只更新 Agent
  update skills     只更新内置 Skills（agent-manager）
  update lark       只更新飞书 Skills
  update model      更新指定角色的模型
  enable            启用功能（如 state-manager）
  disable           禁用功能（如 state-manager）

Options:
  --model <model>      指定模型（init 和 update agents 命令可用）
  --lark               启用飞书集成（init 命令可用）
  --no-lark            禁用飞书集成（init 命令可用）
  --state-manager      启用状态管理（init 命令可用）
  --remote             从 GitHub 拉取最新模板（init/update agents/update skills/update lark 可用）
  --yes                跳过确认提示

Examples:
  agent-squad init
  agent-squad init --model opencode/deepseek-v4-flash-free --lark
  agent-squad init --state-manager
  agent-squad init --remote
  agent-squad update agents
  agent-squad update agents --remote
  agent-squad update skills
  agent-squad update skills --remote
  agent-squad update lark
  agent-squad update lark --remote
  agent-squad update model                              # 显示当前模型配置
  agent-squad update model ceo                          # 交互式选择 ceo 的模型
  agent-squad update model ceo opencode/deepseek-v4-flash-free  # 直接指定 ceo 的模型
  agent-squad enable state-manager                      # 启用状态管理
  agent-squad disable state-manager                     # 禁用状态管理
`);
}

async function main() {
  const [, , command, subcommand, ...args] = process.argv;
  
  try {
    // 处理 update 子命令
    if (command === 'update') {
      switch (subcommand) {
        case 'agents':
          await agents(args);
          break;
        case 'skills':
          await skills(args);
          break;
        case 'lark':
          await lark(args);
          break;
        case 'model':
          await model(args);
          break;
        default:
          if (subcommand) {
            console.error(`Unknown update subcommand: ${subcommand}`);
          }
          showHelp();
          process.exit(1);
      }
      return;
    }
    
    // 处理 enable/disable 子命令
    if (command === 'enable') {
      await enable([subcommand, ...args]);
      return;
    }
    
    if (command === 'disable') {
      await disable([subcommand, ...args]);
      return;
    }
    
    // 处理其他命令
    switch (command) {
      case 'init':
        await init([subcommand, ...args]);
        break;
      case '--help':
      case '-h':
        showHelp();
        break;
      default:
        if (command) {
          console.error(`Unknown command: ${command}`);
        }
        showHelp();
        process.exit(1);
    }
  } catch (err) {
    // 处理用户按 CTRL+C 退出的情况
    if (err.name === 'ExitPromptError') {
      console.log('\n已取消');
      process.exit(0);
    }
    throw err;
  }
}

main();
