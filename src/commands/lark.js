import { readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import {
  AGENTS_DIR, LARK_DIR, LARK_SKILLS, LARK_SKILLS_SOURCE,
  getTargetDir, getTemplateFiles, section, done, warn, error, meta,
  banner, parseArgs, resolveTemplates, BOLD, CYAN, GREEN, YELLOW, RED, GRAY, RESET
} from '../utils.js';

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

export async function lark(args) {
  const opts = parseArgs(args);

  banner('agent-squad  — 更新飞书 Skills');

  section('飞书 Skills');
  const targetDir = getTargetDir();
  meta(`位置：${targetDir}`);

  // 检查 Agent 目录是否存在
  try {
    await access(targetDir);
  } catch {
    error('Agent 目录不存在，请先运行 `agent-squad init` 或 `agent-squad agents`');
    return;
  }

  // 安装飞书 Skills
  await installLarkSkills();

  // 拉取远程模板（如果指定了 --remote）
  const remoteLark = await resolveTemplates('lark', opts);

  // 追加飞书补丁
  const agentFiles = await getTemplateFiles();
  await appendLarkPatches(agentFiles, targetDir, remoteLark);

  console.log(`\n${GREEN}┌─ ${BOLD}完成${RESET}${GREEN} ${'─'.repeat(47)}${RESET}`);
  done('飞书 Skills 已更新');
  console.log(`  ${YELLOW}打开 OpenCode，对你的 CEO Agent 说：${RESET}`);
  console.log(`  ${BOLD}  帮我安装飞书 CLI：https://open.feishu.cn/document/no_class/mcp-archive/feishu-cli-installation-guide.md${RESET}`);
  console.log(`  ${GRAY}重启 OpenCode 后即可使用${RESET}\n`);
}
