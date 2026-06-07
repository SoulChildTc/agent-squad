import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '..', '..', 'templates');
const AGENTS_DIR = join(TEMPLATES_DIR, 'agents');
const LARK_DIR = join(TEMPLATES_DIR, 'lark');
const MODEL_PLACEHOLDER = '{{model}}';

const LARK_SKILLS = ['lark-doc', 'lark-drive', 'lark-shared'];
const LARK_SKILLS_SOURCE = 'larksuite/cli';

let rl = null;

function getRl() {
  if (!rl) {
    rl = createInterface({ input: process.stdin, output: process.stdout });
  }
  return rl;
}

function ask(question) {
  return getRl().question(question + ' ');
}

async function confirm(question) {
  const answer = await ask(question + ' (y/N)');
  return answer.toLowerCase() === 'y';
}

function getTargetDir(scope) {
  if (scope === 'global') {
    return join(homedir(), '.config', 'opencode', 'agents');
  }
  return join(process.cwd(), '.opencode', 'agents');
}

async function getTemplateFiles() {
  const files = await readdir(AGENTS_DIR);
  return files.filter(f => f.endsWith('.md'));
}

async function copyAndTransform(agentFiles, targetDir, models) {
  await mkdir(targetDir, { recursive: true });
  for (const file of agentFiles) {
    let content = await readFile(join(AGENTS_DIR, file), 'utf-8');
    const roleName = file.replace('.md', '');
    const model = models[roleName] || models['_default'];
    if (model) {
      content = content.replaceAll(MODEL_PLACEHOLDER, model);
    }
    await writeFile(join(targetDir, file), content);
  }
}

async function installLarkSkills() {
  console.log('\n📦 Installing Lark skills...');
  try {
    const skills = LARK_SKILLS.map(s => `-s ${s}`).join(' ');
    execSync(`npx skills add ${LARK_SKILLS_SOURCE} ${skills} -g -y`, { stdio: 'inherit', timeout: 120000 });
    console.log('✅ Lark skills installed');
  } catch {
    console.log('⚠️  Lark skills install failed. Try manually: npx skills add larksuite/cli -s lark-doc -s lark-drive -s lark-shared -g -y');
  }
}

async function appendLarkPatches(agentFiles, targetDir) {
  let patchedCount = 0;
  for (const file of agentFiles) {
    const roleName = file.replace('.md', '');
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
    console.log(`✅ Lark patches appended to ${patchedCount} agents`);
  }
}

function parseArgs(args) {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--scope': opts.scope = args[++i]; break;
      case '--model': opts.model = args[++i]; break;
      case '--lark': opts.lark = true; break;
      case '--no-lark': opts.lark = false; break;
      case '--yes': opts.yes = true; break;
    }
  }
  return opts;
}

export async function init(args) {
  const opts = parseArgs(args);

  try {
    // Step 1: Scope
    const scope = opts.scope || await ask('Install to global (~/.config/opencode/) or current project (.opencode/)? (g/P)');
    const isGlobal = scope.toLowerCase() === 'g';
    const targetDir = getTargetDir(isGlobal ? 'global' : 'project');

    try {
      await access(targetDir);
      if (!opts.yes) {
        const overwrite = await confirm(`⚠️  ${targetDir} already exists. Overwrite?`);
        if (!overwrite) { console.log('Cancelled.'); return; }
      }
    } catch {
      // doesn't exist
    }

    // Step 2: Model
    const roles = (await getTemplateFiles()).map(f => f.replace('.md', ''));
    const models = await resolveModels(roles, opts);

    // Step 3: Process
    const agentFiles = await getTemplateFiles();
    await copyAndTransform(agentFiles, targetDir, models);

    console.log(`\n✅ ${agentFiles.length} agents installed to ${targetDir}`);

    // Step 4: Lark integration (optional)
    const wantLark = opts.lark === true || (opts.lark !== false && await confirm('\n📋 Integrate with Feishu/Lark (docs, tasks, IM, etc.)?'));
    if (wantLark) {
      await installLarkSkills();
      await appendLarkPatches(agentFiles, targetDir);
      console.log('   Restart OpenCode to use Lark-integrated agents.');
    } else {
      console.log('   Restart OpenCode to use them.');
    }
  } finally {
    if (rl) rl.close();
  }
}

async function fetchModels() {
  try {
    const output = execSync('opencode models 2>/dev/null', { encoding: 'utf-8', timeout: 10000 });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return null;
  }
}

async function selectModel(prompt, modelsList) {
  if (!modelsList || modelsList.length === 0) {
    const manual = await ask(`${prompt} (enter model ID)`);
    return manual || 'opencode/deepseek-v4-flash-free';
  }
  console.log(`\n${prompt}:`);
  modelsList.forEach((m, i) => console.log(`  ${i + 1}. ${m}`));
  const n = parseInt(await ask('Enter number (or model ID directly):'), 10);
  if (n >= 1 && n <= modelsList.length) return modelsList[n - 1];
  return n ? `opencode/${n}` : 'opencode/deepseek-v4-flash-free';
}

async function resolveModels(roles, opts) {
  const models = {};
  if (opts.model) {
    models['_default'] = opts.model;
    return models;
  }
  const available = await fetchModels();

  if (!available) {
    const mode = await ask('Single model for all agents or multi-model per agent? (s/M)');
    if (mode.toLowerCase() === 's') {
      const model = await ask('Enter model ID (e.g. opencode/deepseek-v4-flash-free):');
      models['_default'] = model || 'opencode/deepseek-v4-flash-free';
    } else {
      for (const role of roles) {
        const model = await ask(`Model for ${role}:`);
        models[role] = model || 'opencode/deepseek-v4-flash-free';
      }
    }
    return models;
  }

  const mode = await ask('Single model for all agents or multi-model per agent? (s/M)');
  if (mode.toLowerCase() === 's') {
    models['_default'] = await selectModel('Select model for all agents', available);
  } else {
    for (const role of roles) {
      models[role] = await selectModel(`Select model for ${role}`, available);
    }
  }
  return models;
}
