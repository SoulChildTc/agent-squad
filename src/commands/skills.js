import { readdir, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import {
  SKILLS_DIR, STATE_MANAGER_SKILL, getSkillsTargetDir, copyDir, section, done, error, meta,
  banner, hasStateManager, parseArgs, resolveTemplates, BOLD, CYAN, GREEN, RED, RESET
} from '../utils.js';

export async function skills(args) {
  const opts = parseArgs(args);

  banner('agent-squad  — 更新 Skills');

  section('Skills');
  const skillsTargetDir = getSkillsTargetDir();
  meta(`位置：${skillsTargetDir}`);

  // 检查 state-manager 是否已启用
  const stateManagerEnabled = await hasStateManager();

  // 拉取远程模板（如果指定了 --remote）
  const remoteSkills = await resolveTemplates('skills', opts);

  let copiedCount = 0;

  if (remoteSkills) {
    // 远程模式：从 GitHub 下载的 Map 写入文件
    for (const [skillName, files] of remoteSkills) {
      if (skillName === STATE_MANAGER_SKILL && !stateManagerEnabled) {
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
      meta(`  ${skillName}`);
    }
  } else {
    // 本地模式：从本地 templates/skills 复制
    const skills = await readdir(SKILLS_DIR);

    for (const skill of skills) {
      if (skill === STATE_MANAGER_SKILL && !stateManagerEnabled) {
        continue;
      }

      const skillSrcDir = join(SKILLS_DIR, skill);
      const skillTargetDir = join(skillsTargetDir, skill);

      await copyDir(skillSrcDir, skillTargetDir);
      copiedCount++;
      meta(`  ${skill}`);
    }
  }

  // 确保 bin 目录下的脚本有执行权限
  const skillsForPerms = remoteSkills
    ? [...remoteSkills.keys()]
    : await readdir(SKILLS_DIR);

  for (const skill of skillsForPerms) {
    if (skill === STATE_MANAGER_SKILL && !stateManagerEnabled) {
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
    done(`${copiedCount} 个 Skill 已更新到 ${skillsTargetDir}`);
  }

  console.log(`\n${GREEN}┌─ ${BOLD}完成${RESET}${GREEN} ${'─'.repeat(47)}${RESET}`);
  done(`${copiedCount} 个 Skill 已更新`);
  console.log(`  ${BOLD}已安装的 Skills：${RESET}`);
  meta(`  agent-manager — 管理团队角色配置`);
  if (stateManagerEnabled) {
    meta(`  state-manager — 任务状态管理`);
  }
  console.log(`  ${GREEN}重启 OpenCode 后即可使用${RESET}\n`);
}
