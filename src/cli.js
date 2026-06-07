#!/usr/bin/env node
import { init } from './commands/init.js';
import { agents } from './commands/agents.js';
import { skills } from './commands/skills.js';
import { lark } from './commands/lark.js';
import { model } from './commands/model.js';

function showHelp() {
  console.log(`
Usage: agent-squad <command> [options]

Commands:
  init      全量初始化（Agent + Skills + 飞书）
  agents    只更新 Agent
  skills    只更新内置 Skills（agent-manager、state-manager）
  lark      只更新飞书 Skills
  model     更新指定角色的模型

Options:
  --model <model>  指定模型（init 和 agents 命令可用）
  --lark           启用飞书集成（init 命令可用）
  --no-lark        禁用飞书集成（init 命令可用）
  --yes            跳过确认提示

Examples:
  agent-squad init
  agent-squad init --model opencode/deepseek-v4-flash-free --lark
  agent-squad agents
  agent-squad agents --model opencode/deepseek-v4-flash-free
  agent-squad skills
  agent-squad lark
  agent-squad model                              # 显示当前模型配置
  agent-squad model ceo                          # 交互式选择 ceo 的模型
  agent-squad model ceo opencode/deepseek-v4-flash-free  # 直接指定 ceo 的模型
`);
}

async function main() {
  const [, , command, ...args] = process.argv;
  
  try {
    switch (command) {
      case 'init':
        await init(args);
        break;
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
