import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AGENTS_DIR, LARK_DIR, MODEL_PLACEHOLDER, DEFAULT_MODEL, ROLE_NAMES,
  getTargetDir, getTemplateFiles, askConfirm, section, done, warn, error, meta,
  banner, copyDir, processTemplate, hasStateManager,
  fetchModels, pickModel, parseArgs, resolveTemplates,
  BOLD, CYAN, GREEN, YELLOW, RED, GRAY, RESET
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

async function hasLarkPatch(targetDir, roleName) {
  try {
    const filePath = join(targetDir, `${roleName}.md`);
    const content = await readFile(filePath, 'utf-8');
    return content.includes('# 飞书集成');
  } catch {
    return false;
  }
}

async function appendLarkPatches(agentFiles, targetDir, remoteLark) {
  let patchedCount = 0;
  for (const file of agentFiles) {
    let patch;
    if (remoteLark && remoteLark.has(file)) {
      patch = remoteLark.get(file);
    } else {
      const patchFile = join(LARK_DIR, file);
      try {
        patch = await readFile(patchFile, 'utf-8');
      } catch {
        continue;
      }
    }
    
    const content = await readFile(join(targetDir, file), 'utf-8');
    await writeFile(join(targetDir, file), content + '\n' + patch);
    patchedCount++;
  }
  if (patchedCount > 0) {
    done(`飞书补丁已追加到 ${patchedCount} 个 Agent`);
  }
}

async function generateFiles(targetDir, modelMap, preserveLark, stateManager, remoteAgents, remoteLark) {
  section('生成 Agent 文件');
  const agentFiles = await getTemplateFiles();
  await mkdir(targetDir, { recursive: true });
  
  for (const file of agentFiles) {
    const roleName = file.replace('.md', '');
    const model = modelMap[roleName] || modelMap['_default'];
    const data = { model, stateManager };
    
    let template;
    if (remoteAgents && remoteAgents.has(file)) {
      template = remoteAgents.get(file);
    } else {
      template = await readFile(join(AGENTS_DIR, file), 'utf-8');
    }
    
    let content = processTemplate(template, data);
    await writeFile(join(targetDir, file), content);
  }
  
  done(`${agentFiles.length} 个 Agent 已生成`);
  agentFiles.forEach(f => meta(`  ${ROLE_NAMES[f.replace('.md', '')] || f.replace('.md', '')}`));
  
  // 如果需要保留飞书配置，追加飞书补丁
  if (preserveLark) {
    await appendLarkPatches(agentFiles, targetDir, remoteLark);
  }
}

export async function agents(args) {
  const opts = parseArgs(args);

  banner('agent-squad  — 更新 Agent');

  section('安装范围');
  const targetDir = getTargetDir();
  meta(`位置：${targetDir}`);

  // 检测现有配置
  let existingModels = {};
  let hasLark = false;
  
  try {
    await access(targetDir);
    
    // 检测现有模型配置
    const roles = Object.keys(ROLE_NAMES);
    for (const role of roles) {
      const model = await getAgentModel(targetDir, role);
      if (model) {
        existingModels[role] = model;
      }
    }
    
    // 检测飞书配置
    hasLark = await hasLarkPatch(targetDir, 'ceo');
    
    if (!opts.yes) {
      const overwrite = await askConfirm(`${targetDir} 已存在，覆盖？`);
      if (!overwrite) { console.log(`\n  ${GRAY}已取消${RESET}\n`); return; }
    }
  } catch {
    // doesn't exist
  }

  // 检测状态管理配置
  const stateManager = await hasStateManager();
  if (stateManager) {
    meta('检测到 state-manager skill，启用状态管理');
  }

  section('模型');
  const allModels = await fetchModels();
  
  // 确定模型配置
  let modelMap = {};
  
  if (opts.model) {
    // 用户指定了模型，使用指定的模型
    meta(`模型：${opts.model}`);
    modelMap = { _default: opts.model };
  } else if (opts.yes) {
    // 非交互模式，使用现有模型或默认模型
    if (Object.keys(existingModels).length > 0) {
      meta('保留现有模型配置');
      modelMap = existingModels;
    } else {
      const m = allModels?.[0] || DEFAULT_MODEL;
      meta(`模型：${m}`);
      modelMap = { _default: m };
    }
  } else {
    // 交互模式
    if (Object.keys(existingModels).length > 0) {
      const keepExisting = await askConfirm('检测到现有模型配置，是否保留？');
      if (keepExisting) {
        meta('保留现有模型配置');
        modelMap = existingModels;
      } else {
        const unified = await askConfirm('所有角色使用同一模型？');
        const roles = (await getTemplateFiles()).map(f => f.replace('.md', ''));
        if (unified) {
          const m = await pickModel(allModels, '为所有 Agent 选择模型');
          modelMap = { _default: m };
        } else {
          for (const role of roles) {
            modelMap[role] = await pickModel(allModels, `为 ${ROLE_NAMES[role] || role} 选择模型`);
          }
        }
      }
    } else {
      const unified = await askConfirm('所有角色使用同一模型？');
      const roles = (await getTemplateFiles()).map(f => f.replace('.md', ''));
      if (unified) {
        const m = await pickModel(allModels, '为所有 Agent 选择模型');
        modelMap = { _default: m };
      } else {
        for (const role of roles) {
          modelMap[role] = await pickModel(allModels, `为 ${ROLE_NAMES[role] || role} 选择模型`);
        }
      }
    }
  }

  // 确定是否保留飞书配置
  let preserveLark = hasLark;
  
  if (hasLark) {
    if (opts['no-lark']) {
      preserveLark = false;
      meta('移除飞书配置');
    } else if (!opts.yes) {
      preserveLark = await askConfirm('检测到飞书配置，是否保留？');
    }
  }

  // 拉取远程模板（如果指定了 --remote）
  const remoteAgents = await resolveTemplates('agents', opts);
  const remoteLark = preserveLark ? await resolveTemplates('lark', opts) : null;

  // 生成文件
  await generateFiles(targetDir, modelMap, preserveLark, stateManager, remoteAgents, remoteLark);

  const agentFiles = await getTemplateFiles();

  console.log(`\n${GREEN}┌─ ${BOLD}完成${RESET}${GREEN} ${'─'.repeat(47)}${RESET}`);
  done(`${agentFiles.length} 个 Agent 已更新到 ${targetDir}`);
  if (preserveLark) {
    meta('飞书配置已保留');
  }
  if (stateManager) {
    meta('状态管理已启用');
  }
  console.log(`  ${GRAY}重启 OpenCode 后即可使用${RESET}\n`);
}
