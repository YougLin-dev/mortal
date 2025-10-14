import { useRouter } from '../context';
import { getPathFromHref } from '../paths';

export function link(node: HTMLAnchorElement) {
  const router = useRouter();
  function onClick(e: MouseEvent) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const href = node.getAttribute('href') || '';
    const path = getPathFromHref(href);
    if (!path) return;
    e.preventDefault(); // treat in-app links uniformly
    router.push(path);
  }
  node.addEventListener('click', onClick);
  return {
    destroy() {
      node.removeEventListener('click', onClick);
    }
  };
}
