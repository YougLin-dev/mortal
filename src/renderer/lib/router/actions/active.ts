import { useRouter } from '../context';
import { getPathFromHref } from '../paths';

type Params = { exact?: boolean; className?: string };

export function active(node: Element, params: Params = { exact: false, className: 'active' }) {
  const router = useRouter();
  const getHref = () => (node as HTMLAnchorElement).getAttribute('href') || '';
  const cls = params.className ?? 'active';

  function update() {
    const href = getHref();
    const path = getPathFromHref(href);
    if (!path) return;
    const current = router.state.path;
    const isActive = params.exact ? current === path : current === path || current.startsWith(path + '/');
    node.classList.toggle(cls, isActive);
    if (isActive) node.setAttribute('aria-current', 'page');
    else node.removeAttribute('aria-current');
  }

  const unsub = router.subscribe(update);
  update();
  return {
    update(newParams: Params) {
      params = newParams;
      update();
    },
    destroy() {
      unsub();
    }
  };
}
