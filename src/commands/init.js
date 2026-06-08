import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import {
  AGENTS_DIR, LARK_DIR, SKILLS_DIR, MODEL_PLACEHOLDER, DEFAULT_MODEL, ROLE_NAMES,
  LARK_SKILLS, LARK_SKILLS_SOURCE,
  getTargetDir, getTemplateFiles, askConfirm, section, done, warn, error, meta,
  banner, copyDir, processTemplate, hasStateManager, getStateManagerSkillDir,
  fetchModels, pickModel, parseArgs, resolveTemplates,
  BOLD, CYAN, GREEN, YELLOW, RED, GRAY, RESET
} from '../utils.js';

async function generateFiles(targetDir, modelMap, stateManager, remoteAgents) {
  section('生成文件');
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
}

async function installLarkSkills() {
  try {
    const skills = LARK_SKILLS.map(s => `-s ${s}`).join(' ');
    execSync(`npx skills add ${LARK_SKILLS_SOURCE} ${skills} -y`, { stdio: 'pipe', timeout: 120000 });
    done('飞书技能安装完成');
  } catch {
    console.log(`  ${RED}✘ 飞书技能安装失败，可手动安装：npx skills add larksuite/cli -s lark-doc -s lark-drive -s lark-shared -y${RESET}`);
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

async function copySkills(targetDir, stateManager, remoteSkills) {
  const skillsTargetDir = join(dirname(targetDir), 'skills');
  await mkdir(skillsTargetDir, { recursive: true });

  let copiedCount = 0;

  if (remoteSkills) {
    // 远程模式：从 GitHub 下载的 Map 写入文件
    for (const [skillName, files] of remoteSkills) {
      if (!stateManager && skillName === 'state-manager') {
        continue;
      }

      const skillTargetDir = join(skillsTargetDir, skillName);
      await mkdir(skillTargetDir, { recursive: true });

      for (const [relativePath, content] of files) {
        const filePath = join(skillTargetDir, relativePath);
        await mkdir(join(filePath, '..'), { recursive: true });
        await writeFile(filePath, content);
      }
      copiedCount++;
    }
  } else {
    // 本地模式：从本地 templates/skills 复制
    const skills = await readdir(SKILLS_DIR);

    for (const skill of skills) {
      if (!stateManager && skill === 'state-manager') {
        continue;
      }

      const skillSrcDir = join(SKILLS_DIR, skill);
      const skillTargetDir = join(skillsTargetDir, skill);

      await copyDir(skillSrcDir, skillTargetDir);
      copiedCount++;
    }
  }

  // 确保 bin 目录下的脚本有执行权限
  const skillsForPerms = remoteSkills
    ? [...remoteSkills.keys()]
    : await readdir(SKILLS_DIR);

  for (const skill of skillsForPerms) {
    if (!stateManager && skill === 'state-manager') {
      continue;
    }

    const binDir = join(skillsTargetDir, skill, 'bin');
    try {
      const binFiles = await readdir(binDir);
      for (const binFile of binFiles) {
        const binPath = join(binDir, binFile);
        execSync(`chmod +x "${binPath}"`);
      }
    } catch {
      // no bin directory
    }
  }

  if (copiedCount > 0) {
    done(`${copiedCount} 个 Skill 已安装到 ${skillsTargetDir}`);
  }
}

export async function init(args) {
  const opts = parseArgs(args);

  banner('agent-squad  — 团队初始化工具');

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

    // 拉取远程模板（如果指定了 --remote）
    const remoteAgents = await resolveTemplates('agents', opts);
    const remoteSkills = await resolveTemplates('skills', opts);
    const remoteLark = await resolveTemplates('lark', opts);

    section('模型');
    const allModels = await fetchModels();
    if (opts.model) {
      meta(`模型：${opts.model}`);
      await generateFiles(targetDir, { _default: opts.model }, opts.stateManager, remoteAgents);
    } else if (opts.yes) {
      const m = allModels?.[0] || DEFAULT_MODEL;
      meta(`模型：${m}`);
      await generateFiles(targetDir, { _default: m }, opts.stateManager, remoteAgents);
    } else {
      const unified = await askConfirm('所有角色使用同一模型？');
      const roles = (await getTemplateFiles()).map(f => f.replace('.md', ''));
      if (unified) {
        const m = await pickModel(allModels, '为所有 Agent 选择模型');
        await generateFiles(targetDir, { _default: m }, opts.stateManager, remoteAgents);
      } else {
        const modelMap = {};
        for (const role of roles) {
          modelMap[role] = await pickModel(allModels, `为 ${ROLE_NAMES[role] || role} 选择模型`);
        }
        await generateFiles(targetDir, modelMap, opts.stateManager, remoteAgents);
      }
    }

    const agentFiles = await getTemplateFiles();

    section('Skills');
    await copySkills(targetDir, opts.stateManager, remoteSkills);

    section('飞书');
    const wantLark = opts.lark === true || (opts.lark !== false && await askConfirm('集成飞书文档/云盘能力（需 lark-cli 环境）？'));
    if (wantLark) {
      await installLarkSkills();
      await appendLarkPatches(agentFiles, targetDir, remoteLark);
    } else {
      meta('跳过');
    }

    console.log(`\n${GREEN}┌─ ${BOLD}完成${RESET}${GREEN} ${'─'.repeat(47)}${RESET}`);
    done(`${agentFiles.length} 个 Agent 已安装到 ${targetDir}`);
    if (opts.stateManager) {
      meta('状态管理已启用');
    }
    console.log(`  ${YELLOW}打开 OpenCode，对你的 CEO Agent 说：${RESET}`);
    console.log(`  ${BOLD}  帮我安装飞书 CLI：https://open.feishu.cn/document/no_class/mcp-archive/feishu-cli-installation-guide.md${RESET}`);
    console.log(`  ${GRAY}重启 OpenCode 后即可使用${RESET}\n`);
}
