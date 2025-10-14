import { getContext, setContext } from 'svelte';
import type { Router } from './router';

export const ROUTER_CTX = Symbol('router');

export function setRouterContext(router: Router) {
  setContext(ROUTER_CTX, router);
}

export function useRouter(): Router {
  const router = getContext<Router>(ROUTER_CTX);
  if (!router) {
    throw new Error('useRouter must be called within a Router component');
  }
  return router;
}
