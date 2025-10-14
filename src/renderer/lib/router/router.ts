import { compileRoutes, matchPath } from './matcher';
import { getPathFromLocation, normalizePath } from './paths';
import type { RouterOptions, RouterState, Guard, Matched, CompiledRecord } from './types';
import { getLoggerBy } from '@/shared/logging/helpers';

type Listener = (s: RouterState) => void;

const MAX_REDIRECTS = 10;

export class Router {
  private logger = getLoggerBy('router', 'core');
  private table: CompiledRecord[];
  private nameMap: Map<string, CompiledRecord>;
  private listeners = new Set<Listener>();
  private _state: RouterState = { path: '/', matches: [] };
  private beforeEachGuards: Guard[] = [];
  private afterEachGuards: Guard[] = [];
  private navToken = 0;

  constructor(opts: RouterOptions) {
    this.table = compileRoutes(opts.routes);
    this.nameMap = new Map();
    for (const r of this.table) {
      if (!r.name) continue;
      if (this.nameMap.has(r.name)) {
        this.logger.warn('Duplicate route name "{name}" -> {path}', { name: r.name, path: r.fullPath });
      }
      this.nameMap.set(r.name, r);
    }
    this.handleHashChange = this.handleHashChange.bind(this);
  }

  get state() {
    return this._state;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this._state);
    return () => this.listeners.delete(fn);
  }

  beforeEach(guard: Guard) {
    this.beforeEachGuards.push(guard);
    return () => (this.beforeEachGuards = this.beforeEachGuards.filter((g) => g !== guard));
  }
  afterEach(guard: Guard) {
    this.afterEachGuards.push(guard);
    return () => (this.afterEachGuards = this.afterEachGuards.filter((g) => g !== guard));
  }

  mount() {
    window.addEventListener('hashchange', this.handleHashChange);
    // initial navigation with guards
    // Prefer hash path if present; otherwise use pathname. This unifies "#/" and "/" deep links.
    const initialPath = getPathFromLocation() || (this.defaultRoute()?.fullPath ?? '/');
    // Run guards on initial navigation; fallback to default if unmatched
    this.navigateTo(initialPath, true)
      .then((ok) => {
        if (!ok) {
          const fallback = this.defaultRoute()?.fullPath ?? '/';
          if (initialPath !== fallback) {
            void this.navigateTo(fallback, true);
          }
        }
      })
      .catch((error) => this.logger.error('Initial navigation error: {error}', { error }));
  }

  destroy() {
    window.removeEventListener('hashchange', this.handleHashChange);
    this.listeners.clear();
    this.beforeEachGuards = [];
    this.afterEachGuards = [];
  }

  private defaultRoute() {
    // pick first concrete route without redirect, or fallback to first route
    return this.table.find((r) => !r.redirect && r.component) ?? this.table[0];
  }

  private notify() {
    for (const l of [...this.listeners]) l(this._state);
  }

  private normalizeInput(input: string) {
    return normalizePath(input.startsWith('#') ? input.slice(1) : input);
  }

  private async runGuards(to: Matched[], from: Matched[]) {
    const toLeaf = to[to.length - 1] ?? null;
    const fromLeaf = from[from.length - 1] ?? null;
    const run = async (g: Guard, current: Matched | null = toLeaf) => g(current!, fromLeaf);
    for (const g of this.beforeEachGuards) {
      try {
        const res = await run(g);
        if (res !== true && res !== undefined) return res;
      } catch (err) {
        this.logger.error('beforeEach guard error: {error}', { error: err });
        return false;
      }
    }
    // run per-record beforeEnter from root to leaf
    for (const m of to) {
      for (const g of m.record.beforeEnter) {
        try {
          const res = await run(g, m);
          if (res !== true && res !== undefined) return res;
        } catch (err) {
          this.logger.error('beforeEnter guard error: {error}', { error: err });
          return false;
        }
      }
    }
    return true;
  }

  private async navigateTo(path: string, replace: boolean, redirectDepth = 0): Promise<boolean> {
    if (redirectDepth > MAX_REDIRECTS) {
      this.logger.error('Max redirects exceeded');
      return false;
    }
    const token = ++this.navToken;
    const current = this._state.matches;
    const nextMatches = matchPath(path, this.table);
    if (!nextMatches.length) return false;

    // handle redirect
    const redirectRec = nextMatches[nextMatches.length - 1].record;
    if (redirectRec.redirect) {
      const to = redirectRec.redirect;
      const href = to.path ? this.resolve(to.path) : this.resolve({ name: to.name!, params: to.params });
      return this.navigateTo(href, replace, redirectDepth + 1);
    }

    const guardRes = await this.runGuards(nextMatches, current);
    if (token !== this.navToken) return false; // cancelled by a new nav

    if (guardRes === true || guardRes === undefined) {
      if (replace) location.replace('#' + path);
      else location.hash = path;
      // Synchronously apply state
      this._state = { path, matches: nextMatches };
      this.notify();
      // hashchange will also trigger but won't change state
      await Promise.resolve();
      for (const g of this.afterEachGuards) {
        try {
          await g(nextMatches[nextMatches.length - 1]!, current[current.length - 1] ?? null);
        } catch (err) {
          this.logger.error('afterEach guard error: {error}', { error: err });
        }
      }
      return true;
    }
    if (guardRes === false) return false;
    // redirect target
    const href =
      typeof guardRes === 'string'
        ? this.resolve(guardRes)
        : guardRes.path
          ? this.resolve(guardRes.path)
          : this.resolve({ name: guardRes.name!, params: guardRes.params });
    return this.navigateTo(href, !!(typeof guardRes !== 'string' && guardRes.replace), redirectDepth + 1);
  }

  private async handleHashChange() {
    const newPath = getPathFromLocation();
    if (newPath !== this._state.path) {
      await this.navigateTo(newPath, true);
    }
  }

  resolve(target: string | { name?: string; params?: Record<string, string> }) {
    if (typeof target === 'string') return this.normalizeInput(target);
    const rec = this.nameMap.get(target.name!);
    if (!rec) throw new Error(`Unknown route: ${target.name}`);
    let path = rec.fullPath;
    if (target.params) {
      for (const [k, v] of Object.entries(target.params)) {
        path = path.replace(new RegExp(`:${k}\\??`), encodeURIComponent(String(v)));
      }
    }
    // Remove leftover optional params segments if not provided
    path = path.replace(/\/:([A-Za-z0-9_]+)\?/g, '');
    // Fail fast on missing required params
    if (/:([A-Za-z0-9_]+)(?!\?)/.test(path)) {
      throw new Error(`Missing required params for route "${rec.name ?? rec.fullPath}": ${path}`);
    }
    return path;
  }

  async push(target: string | { name?: string; params?: Record<string, string> }) {
    const p = this.resolve(target);
    if (p === this._state.path) return true;
    return this.navigateTo(p, false);
  }
  async replace(target: string | { name?: string; params?: Record<string, string> }) {
    const p = this.resolve(target);
    if (p === this._state.path) return true;
    return this.navigateTo(p, true);
  }
  back() {
    history.back();
  }
  forward() {
    history.forward();
  }
  go(n: number) {
    history.go(n);
  }
}

export function createRouter(opts: RouterOptions) {
  return new Router(opts);
}
