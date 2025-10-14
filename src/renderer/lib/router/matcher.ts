import type { RouteRecord, CompiledRecord, Matched } from './types';

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizePath(raw: string): string {
  // 去除多余斜杠、确保前导斜杠、去除尾斜杠
  const normalized = ('/' + raw).replace(/\/+/g, '/').replace(/\/$/, '');
  return normalized || '/';
}

function safeDecode(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

function pathToRegex(path: string, keys: string[]) {
  // normalize leading/trailing slashes; allow optional trailing slash
  // segments: static | :param | :param?
  const segs = path.split('/').filter(Boolean);
  const parts = segs.map((seg) => {
    if (seg.startsWith(':')) {
      const optional = seg.endsWith('?');
      const key = seg.replace(/^:/, '').replace(/\?$/, '');
      keys.push(key);
      const group = '([^/]+)';
      return optional ? `(?:/${group})?` : `/${group}`;
    }
    // static
    return `/${escapeRe(seg)}`;
  });
  const re = new RegExp(`^${parts.join('') || '/'}(?:/)?$`);
  return re;
}

function joinPaths(parent: string, child: string) {
  if (!parent) return normalizePath(child);
  if (child.startsWith('/')) return normalizePath(child);
  return normalizePath(parent + '/' + child);
}

function scoreOf(fullPath: string) {
  // Higher score = more specific:
  // static segment: +3, required param: +2, optional param: +1
  const segs = fullPath.split('/').filter(Boolean);
  let s = 0;
  for (const seg of segs) {
    if (seg.startsWith(':')) s += seg.endsWith('?') ? 1 : 2;
    else s += 3;
  }
  return s;
}

export function compileRoutes(routes: RouteRecord[], parent?: CompiledRecord | null, base = ''): CompiledRecord[] {
  const out: CompiledRecord[] = [];
  for (const r of routes) {
    const fullPath = normalizePath(joinPaths(base, r.path));
    const keys: string[] = [];
    const re = pathToRegex(fullPath, keys);
    const record: CompiledRecord = {
      name: r.name,
      fullPath,
      component: r.component,
      meta: r.meta ?? {},
      redirect: r.redirect,
      beforeEnter: Array.isArray(r.beforeEnter) ? r.beforeEnter : r.beforeEnter ? [r.beforeEnter] : [],
      parent: parent ?? null,
      re,
      keys,
      score: scoreOf(fullPath)
    };
    out.push(record);
    if (r.children?.length) {
      out.push(...compileRoutes(r.children, record, fullPath));
    }
  }
  // sort by specificity then by path length (deeper first)
  out.sort((a, b) => {
    if (a.fullPath === b.fullPath) return 0;
    const sa = a.fullPath.split('/').filter(Boolean).length;
    const sb = b.fullPath.split('/').filter(Boolean).length;
    if (a.score !== b.score) return b.score - a.score;
    return sb - sa;
  });
  return out;
}

export function matchPath(path: string, table: CompiledRecord[]): Matched[] {
  const normalizedPath = normalizePath(path);
  for (const rec of table) {
    const mm = rec.re.exec(normalizedPath);
    if (!mm) continue;

    // Build leaf param map once from the matched result
    const leafParams: Record<string, string> = {};
    rec.keys.forEach((k, i) => {
      const val = mm[i + 1];
      if (val !== undefined) leafParams[k] = safeDecode(val);
    });

    // Build chain root -> leaf using parent pointers, copying only the keys each record owns
    const chain: Matched[] = [];
    let cur: CompiledRecord | null | undefined = rec;
    while (cur) {
      const p: Record<string, string> = {};
      for (const k of cur.keys) {
        const v = leafParams[k];
        if (v !== undefined) p[k] = v;
      }
      chain.unshift({ path: cur.fullPath, params: p, record: cur });
      cur = cur.parent ?? null;
    }
    return chain;
  }
  return [];
}
