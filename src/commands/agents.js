import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AGENTS_DIR, MODEL_PLACEHOLDER, DEFAULT_MODEL, ROLE_NAMES,
  getTargetDir, getTemplateFiles, askConfirm, section, done, warn, error, meta,
  fetchModels, pickModel, parseArgs, BOLD, CYAN, GREEN, YELLOW, RED, GRAY, RESET
} from '../utils.js';

async function generateFiles(targetDir, modelMap) {
  section('生成 Agent 文件');
  const agentFiles = await getTemplateFiles();
  await mkdir(targetDir, { recursive: true });
  for (const file of agentFiles) {
    let content = await readFile(join(AGENTS_DIR, file), 'utf-8');
    const roleName = file.replace('.md', '');
    const model = modelMap[roleName] || modelMap['_default'];
    content = content.replaceAll(MODEL_PLACEHOLDER, model);
    await writeFile(join(targetDir, file), content);
  }
  done(`${agentFiles.length} 个 Agent 已生成`);
  agentFiles.forEach(f => meta(`  ${ROLE_NAMES[f.replace('.md', '')] || f.replace('.md', '')}`));
}

export async function agents(args) {
  const opts = parseArgs(args);

  console.log(`\n${CYAN}╔══════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}║   ${BOLD}agent-squad  — 更新 Agent${RESET}${CYAN}       ║${RESET}`);
  console.log(`${CYAN}╚══════════════════════════════════════╝${RESET}`);

  section('安装范围');
  const targetDir = getTargetDir();
  meta(`位置：${targetDir}`);

  try {
    await access(targetDir);
    if (!opts.yes) {
      const overwrite = await askConfirm(`${targetDir} 已存在，覆盖？`);
      if (!overwrite) { console.log(`\n  ${GRAY}已取消${RESET}\n`); return; }
    }
  } catch {
    // doesn't exist
  }

  section('模型');
  const allModels = await fetchModels();
  if (opts.model) {
    meta(`模型：${opts.model}`);
    await generateFiles(targetDir, { _default: opts.model });
  } else if (opts.yes) {
    const m = allModels?.[0] || DEFAULT_MODEL;
    meta(`模型：${m}`);
    await generateFiles(targetDir, { _default: m });
  } else {
    const unified = await askConfirm('所有角色使用同一模型？');
    const roles = (await getTemplateFiles()).map(f => f.replace('.md', ''));
    if (unified) {
      const m = await pickModel(allModels, '为所有 Agent 选择模型');
      await generateFiles(targetDir, { _default: m });
    } else {
      const modelMap = {};
      for (const role of roles) {
        modelMap[role] = await pickModel(allModels, `为 ${ROLE_NAMES[role] || role} 选择模型`);
      }
      await generateFiles(targetDir, modelMap);
    }
  }

  const agentFiles = await getTemplateFiles();

  console.log(`\n${GREEN}┌─ ${BOLD}完成${RESET}${GREEN} ${'─'.repeat(47)}${RESET}`);
  done(`${agentFiles.length} 个 Agent 已更新到 ${targetDir}`);
  console.log(`  ${GRAY}重启 OpenCode 后即可使用${RESET}\n`);
}
