import { readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AGENTS_DIR, MODEL_PLACEHOLDER, DEFAULT_MODEL, ROLE_NAMES,
  getTargetDir, getTemplateFiles, section, done, warn, error, meta,
  banner, fetchModels, pickModel, BOLD, CYAN, GREEN, YELLOW, RED, GRAY, RESET
} from '../utils.js';

async function getAgentModel(targetDir, roleName) {
  try {
    const filePath = join(targetDir, `${roleName}.md`);
    const content = await readFile(filePath, 'utf-8');
    const match = content.match(/^model:\s*(.+)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

async function updateAgentModel(targetDir, roleName, newModel) {
  const filePath = join(targetDir, `${roleName}.md`);
  const content = await readFile(filePath, 'utf-8');
  
  // 替换 model 行
  const updatedContent = content.replace(/^model:\s*.+$/m, `model: ${newModel}`);
  await writeFile(filePath, updatedContent);
}

export async function model(args) {
  banner('agent-squad  — 更新模型');

  const targetDir = getTargetDir();
  
  // 检查 Agent 目录是否存在
  try {
    await access(targetDir);
  } catch {
    error('Agent 目录不存在，请先运行 `agent-squad init` 或 `agent-squad agents`');
    return;
  }

  // 解析参数
  const roleName = args[0];
  const newModel = args[1];

  // 如果没有指定角色，显示当前配置
  if (!roleName) {
    section('当前模型配置');
    const roles = Object.keys(ROLE_NAMES);
    for (const role of roles) {
      const model = await getAgentModel(targetDir, role);
      if (model) {
        meta(`  ${ROLE_NAMES[role] || role}: ${model}`);
      }
    }
    console.log(`\n  ${GRAY}用法: agent-squad model <角色> [模型]${RESET}`);
    console.log(`  ${GRAY}例如: agent-squad model ceo opencode/deepseek-v4-flash-free${RESET}\n`);
    return;
  }

  // 验证角色是否存在
  if (!ROLE_NAMES[roleName]) {
    error(`角色 '${roleName}' 不存在`);
    meta(`可用角色: ${Object.keys(ROLE_NAMES).join(', ')}`);
    return;
  }

  // 如果没有指定模型，让用户选择
  const allModels = await fetchModels();
  let selectedModel = newModel;
  
  if (!selectedModel) {
    const currentModel = await getAgentModel(targetDir, roleName);
    if (currentModel) {
      meta(`当前模型: ${currentModel}`);
    }
    selectedModel = await pickModel(allModels, `为 ${ROLE_NAMES[roleName]} 选择模型`);
  }

  // 更新模型
  await updateAgentModel(targetDir, roleName, selectedModel);
  done(`${ROLE_NAMES[roleName]} 的模型已更新为: ${selectedModel}`);
  console.log(`  ${GRAY}重启 OpenCode 后即可使用${RESET}\n`);
}
