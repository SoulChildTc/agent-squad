import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const TEMPLATES_DIR = join(__dirname, '..', 'templates');
export const AGENTS_DIR = join(TEMPLATES_DIR, 'agents');
export const LARK_DIR = join(TEMPLATES_DIR, 'lark');
export const SKILLS_DIR = join(TEMPLATES_DIR, 'skills');
export const MODEL_PLACEHOLDER = '{{model}}';

export const DEFAULT_MODEL = 'opencode/deepseek-v4-flash-free';

export const LARK_SKILLS = ['lark-doc', 'lark-drive', 'lark-shared'];
export const LARK_SKILLS_SOURCE = 'larksuite/cli';

export const ROLE_NAMES = {
  'ceo': 'ceo（总协调）',
  'product-manager': 'product-manager（产品经理）',
  'fullstack-developer': 'fullstack-developer（全栈工程师）',
  'ui-ux-designer': 'ui-ux-designer（UI/UX 设计师）',
  'marketing-growth': 'marketing-growth（营销增长）',
  'customer-service': 'customer-service（客户服务）',
  'security-engineer': 'security-engineer（安全工程师）',
  'advisor': 'advisor（顾问）',
};

export const BOLD = '\x1b[1m';
export const CYAN = '\x1b[36m';
export const GREEN = '\x1b[32m';
export const YELLOW = '\x1b[33m';
export const RED = '\x1b[31m';
export const GRAY = '\x1b[90m';
export const RESET = '\x1b[0m';

export function getTargetDir() {
  return join(process.cwd(), '.opencode', 'agents');
}

export function getSkillsTargetDir() {
  return join(process.cwd(), '.opencode', 'skills');
}

export async function getTemplateFiles() {
  const files = await readdir(AGENTS_DIR);
  return files.filter(f => f.endsWith('.md'));
}

export async function askConfirm(msg) {
  const confirm = (await import('@inquirer/confirm')).default;
  return confirm({ message: msg, theme: { prefix: '  ' } });
}

export function section(title) {
  console.log(`\n${CYAN}┌─ ${BOLD}${title}${RESET}${CYAN} ${'─'.repeat(50 - title.length)}${RESET}`);
}

export function done(msg) {
  console.log(`  ${GREEN}✔${RESET} ${msg}`);
}

export function warn(msg) {
  console.log(`  ${YELLOW}⚠${RESET} ${msg}`);
}

export function error(msg) {
  console.log(`  ${RED}✘${RESET} ${msg}`);
}

export function meta(msg) {
  console.log(`  ${GRAY}${msg}${RESET}`);
}

export async function copyDir(src, dest) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      const content = await readFile(srcPath);
      await writeFile(destPath, content);
    }
  }
}

export async function fetchModels() {
  try {
    const output = execSync('opencode models 2>/dev/null', { encoding: 'utf-8', timeout: 10000 });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return null;
  }
}

export async function pickModel(allModels, prompt) {
  const input = (await import('@inquirer/input')).default;
  const search = (await import('@inquirer/search')).default;
  
  if (!allModels || allModels.length === 0) {
    const m = await input({ message: prompt, theme: { prefix: '  ' } });
    return m || DEFAULT_MODEL;
  }

  const answer = await search({
    message: prompt,
    source: (input) => {
      if (!input) return allModels;
      const q = input.toLowerCase();
      return allModels.filter(m => m.toLowerCase().includes(q));
    },
    theme: { prefix: '  ' },
  });

  done(answer);
  return answer;
}

export function parseArgs(args) {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--model': opts.model = args[++i]; break;
      case '--lark': opts.lark = true; break;
      case '--no-lark': opts.lark = false; break;
      case '--yes': opts.yes = true; break;
    }
  }
  return opts;
}
