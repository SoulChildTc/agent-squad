import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import {
  SKILLS_DIR, getSkillsTargetDir, copyDir, section, done, error, meta,
  banner, BOLD, CYAN, GREEN, RED, RESET
} from '../utils.js';

export async function skills(args) {
  banner('agent-squad  — 更新 Skills');

  section('Skills');
  const skillsTargetDir = getSkillsTargetDir();
  meta(`位置：${skillsTargetDir}`);

  let copiedCount = 0;
  const skills = await readdir(SKILLS_DIR);
  
  for (const skill of skills) {
    const skillSrcDir = join(SKILLS_DIR, skill);
    const skillTargetDir = join(skillsTargetDir, skill);
    
    await copyDir(skillSrcDir, skillTargetDir);
    copiedCount++;
    meta(`  ${skill}`);
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
    done(`${copiedCount} 个 Skill 已更新到 ${skillsTargetDir}`);
  }

  console.log(`\n${GREEN}┌─ ${BOLD}完成${RESET}${GREEN} ${'─'.repeat(47)}${RESET}`);
  done(`${copiedCount} 个 Skill 已更新`);
  console.log(`  ${BOLD}已安装的 Skills：${RESET}`);
  meta(`  agent-manager — 管理团队角色配置`);
  meta(`  state-manager — 任务状态管理`);
  console.log(`  ${GREEN}重启 OpenCode 后即可使用${RESET}\n`);
}
