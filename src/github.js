import { join } from 'node:path';

const REPO = 'SoulChildTc/agent-squad';
const BRANCH = 'main';
const API_BASE = `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}`;
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;

/**
 * 从 GitHub API 获取 templates/ 下的文件树
 * 返回按类型分组的路径映射
 */
async function fetchTemplateTree() {
  const url = `${API_BASE}?recursive=1`;
  const resp = await fetch(url, {
    headers: { 'Accept': 'application/vnd.github.v3+json' },
    signal: AbortSignal.timeout(10000),
  });

  if (!resp.ok) {
    throw new Error(`GitHub API 请求失败: ${resp.status}`);
  }

  const data = await resp.json();
  if (!data.tree) {
    throw new Error('GitHub API 返回数据异常');
  }

  const result = {
    agents: new Map(),   // <name, path> e.g. <'ceo.md', 'templates/agents/ceo.md'>
    lark: new Map(),     // <name, path>
    skills: new Map(),   // <skillName, Map<relativePath, path>>
  };

  for (const item of data.tree) {
    if (item.type !== 'blob' || !item.path.startsWith('templates/')) continue;

    const parts = item.path.split('/');
    // templates/agents/ceo.md -> type=agents, rest=ceo.md
    // templates/lark/ceo.md -> type=lark, rest=ceo.md
    // templates/skills/agent-manager/SKILL.md -> type=skills, rest=agent-manager/SKILL.md
    const type = parts[1];
    const rest = parts.slice(2).join('/');

    if (type === 'agents' && rest.endsWith('.md')) {
      result.agents.set(rest, item.path);
    } else if (type === 'lark' && rest.endsWith('.md')) {
      result.lark.set(rest, item.path);
    } else if (type === 'skills' && rest) {
      const skillName = parts[2];
      const relativePath = parts.slice(3).join('/');
      if (!result.skills.has(skillName)) {
        result.skills.set(skillName, new Map());
      }
      if (relativePath) {
        result.skills.get(skillName).set(relativePath, item.path);
      }
    }
  }

  return result;
}

/**
 * 从 raw.githubusercontent.com 下载单个文件
 * @param {string} path - 仓库内路径，如 'templates/agents/ceo.md'
 * @returns {string|null} 文件内容，失败返回 null
 */
async function fetchFileContent(path) {
  const url = `${RAW_BASE}/${path}`;
  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

/**
 * 拉取指定类型的模板
 * @param {'agents'|'lark'|'skills'} type
 * @returns {Map|null} 模板内容映射，失败返回 null
 */
export async function fetchTemplates(type) {
  try {
    const tree = await fetchTemplateTree();
    const fileMap = tree[type];
    if (!fileMap || fileMap.size === 0) return null;

    if (type === 'skills') {
      // skills: Map<skillName, Map<relativePath, path>>
      const result = new Map();
      for (const [skillName, files] of fileMap) {
        const skillContent = new Map();
        for (const [relativePath, ghPath] of files) {
          const content = await fetchFileContent(ghPath);
          if (content === null) {
            throw new Error(`下载失败: ${ghPath}`);
          }
          skillContent.set(relativePath, content);
        }
        result.set(skillName, skillContent);
      }
      return result;
    }

    // agents / lark: Map<filename, path>
    const result = new Map();
    for (const [filename, ghPath] of fileMap) {
      const content = await fetchFileContent(ghPath);
      if (content === null) {
        throw new Error(`下载失败: ${ghPath}`);
      }
      result.set(filename, content);
    }
    return result;
  } catch {
    return null;
  }
}
