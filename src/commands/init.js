import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import {
  AGENTS_DIR, LARK_DIR, SKILLS_DIR, MODEL_PLACEHOLDER, DEFAULT_MODEL, ROLE_NAMES,
  LARK_SKILLS, LARK_SKILLS_SOURCE,
  getTargetDir, getTemplateFiles, askConfirm, section, done, warn, error, meta,
  banner, copyDir, fetchModels, pickModel, parseArgs, BOLD, CYAN, GREEN, YELLOW, RED, GRAY, RESET
} from '../utils.js';

async function generateFiles(targetDir, modelMap) {
  section('生成文件');
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

async function installLarkSkills() {
  try {
    const skills = LARK_SKILLS.map(s => `-s ${s}`).join(' ');
    execSync(`npx skills add ${LARK_SKILLS_SOURCE} ${skills} -y`, { stdio: 'pipe', timeout: 120000 });
    done('飞书技能安装完成');
  } catch {
    console.log(`  ${RED}✘ 飞书技能安装失败，可手动安装：npx skills add larksuite/cli -s lark-doc -s lark-drive -s lark-shared -y${RESET}`);
  }
}

async function appendLarkPatches(agentFiles, targetDir) {
  let patchedCount = 0;
  for (const file of agentFiles) {
    const patchFile = join(LARK_DIR, file);
    try {
      await access(patchFile);
      const patch = await readFile(patchFile, 'utf-8');
      const content = await readFile(join(targetDir, file), 'utf-8');
      await writeFile(join(targetDir, file), content + '\n' + patch);
      patchedCount++;
    } catch {
      // no patch for this role
    }
  }
  if (patchedCount > 0) {
    done(`飞书补丁已追加到 ${patchedCount} 个 Agent`);
  }
}

async function copySkills(targetDir) {
  const skillsTargetDir = join(dirname(targetDir), 'skills');
  await mkdir(skillsTargetDir, { recursive: true });
  
  let copiedCount = 0;
  const skills = await readdir(SKILLS_DIR);
  
  for (const skill of skills) {
    const skillSrcDir = join(SKILLS_DIR, skill);
    const skillTargetDir = join(skillsTargetDir, skill);
    
    // 复制整个 skill 目录
    await copyDir(skillSrcDir, skillTargetDir);
    copiedCount++;
  }
  
  // 确保 bin 目录下的脚本有执行权限
  for (const skill of skills) {
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

    section('Skills');
    await copySkills(targetDir);

    section('飞书');
    const wantLark = opts.lark === true || (opts.lark !== false && await askConfirm('集成飞书文档/云盘能力（需 lark-cli 环境）？'));
    if (wantLark) {
      await installLarkSkills();
      await appendLarkPatches(agentFiles, targetDir);
    } else {
      meta('跳过');
    }

    console.log(`\n${GREEN}┌─ ${BOLD}完成${RESET}${GREEN} ${'─'.repeat(47)}${RESET}`);
    done(`${agentFiles.length} 个 Agent 已安装到 ${targetDir}`);
    console.log(`  ${YELLOW}打开 OpenCode，对你的 CEO Agent 说：${RESET}`);
    console.log(`  ${BOLD}  帮我安装飞书 CLI：https://open.feishu.cn/document/no_class/mcp-archive/feishu-cli-installation-guide.md${RESET}`);
    console.log(`  ${GRAY}重启 OpenCode 后即可使用${RESET}\n`);
}
