import { execSync } from 'node:child_process';
import {
  copyDir, section, done, error, meta,
  banner, getStateManagerSkillDir, getStateManagerSkillTargetDir,
  BOLD, CYAN, GREEN, RED, RESET
} from '../utils.js';
import { agents } from './agents.js';

export async function enable(args) {
  const feature = args[0];

  if (!feature) {
    error('请指定要启用的功能，例如：agent-squad enable state-manager');
    return;
  }

  if (feature !== 'state-manager') {
    error(`未知功能：${feature}`);
    meta('可用功能：state-manager');
    return;
  }

  banner('agent-squad  — 启用功能');

  section('State Manager');
  
  // 复制 state-manager skill
  const srcDir = getStateManagerSkillDir();
  const destDir = getStateManagerSkillTargetDir();
  
  await copyDir(srcDir, destDir);
  done('state-manager skill 已复制');

  // 确保 bin 目录下的脚本有执行权限
  const binDir = `${destDir}/bin`;
  try {
    const { readdir } = await import('node:fs/promises');
    const binFiles = await readdir(binDir);
    for (const binFile of binFiles) {
      execSync(`chmod +x "${binDir}/${binFile}"`);
    }
  } catch {
    // no bin directory
  }

  // 调用 update agents
  section('更新 Agent');
  await agents(['--yes']);

  console.log(`\n${GREEN}┌─ ${BOLD}完成${RESET}${GREEN} ${'─'.repeat(47)}${RESET}`);
  done('state-manager 已启用');
  console.log(`  ${BOLD}功能：${RESET}`);
  meta('  状态管理 — 任务中断后可恢复上下文继续执行');
  console.log(`  ${GREEN}重启 OpenCode 后即可使用${RESET}\n`);
}
