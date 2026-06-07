import {
  removeDir, section, done, error, meta,
  banner, getStateManagerSkillTargetDir,
  BOLD, CYAN, GREEN, RED, RESET
} from '../utils.js';
import { agents } from './agents.js';

export async function disable(args) {
  const feature = args[0];

  if (!feature) {
    error('请指定要禁用的功能，例如：agent-squad disable state-manager');
    return;
  }

  if (feature !== 'state-manager') {
    error(`未知功能：${feature}`);
    meta('可用功能：state-manager');
    return;
  }

  banner('agent-squad  — 禁用功能');

  section('State Manager');
  
  // 删除 state-manager skill
  const destDir = getStateManagerSkillTargetDir();
  const removed = await removeDir(destDir);
  
  if (removed) {
    done('state-manager skill 已删除');
  } else {
    meta('state-manager skill 不存在，跳过');
  }

  // 调用 update agents
  section('更新 Agent');
  await agents(['--yes']);

  console.log(`\n${GREEN}┌─ ${BOLD}完成${RESET}${GREEN} ${'─'.repeat(47)}${RESET}`);
  done('state-manager 已禁用');
  console.log(`  ${GREEN}重启 OpenCode 后, 开启新会话生效${RESET}\n`);
}
