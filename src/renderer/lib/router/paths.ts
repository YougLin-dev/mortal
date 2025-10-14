// Centralized helpers for turning URLs and hrefs into normalized app paths
// and back. The router works internally with normalized absolute paths
// like "/settings/general". Anchors can be "#/settings/general" or "/settings/general".

const APP_SCHEMES = ['content:', 'titlebar:', 'loading:'];

function isAppScheme(href: string) {
  return APP_SCHEMES.some((s) => href.startsWith(s));
}

export function ensureLeadingSlash(p: string): string {
  if (!p) return '/';
  return p.startsWith('/') ? p : '/' + p;
}

export function stripQueryAndHash(p: string): string {
  let out = p;
  const q = out.indexOf('?');
  if (q >= 0) out = out.slice(0, q);
  const h = out.indexOf('#');
  if (h >= 0) out = out.slice(0, h);
  return out;
}

export function normalizePath(raw: string): string {
  const s = ensureLeadingSlash(raw);
  const noJunk = stripQueryAndHash(s);
  // collapse multiple slashes and trim trailing slash (except root)
  const collapsed = noJunk.replace(/\/+/g, '/').replace(/\/$/, '');
  return collapsed || '/';
}

// Extract normalized app path from an <a href="..."> value.
// Supports:
// - "#/foo/bar"
// - "/foo/bar"
// - "content://localhost/#/foo" or "content://localhost/foo"
export function getPathFromHref(href: string): string | null {
  if (!href) return null;

  // Hash form: "#/foo" or "content://...#/foo"
  const hashIndex = href.indexOf('#');
  if (hashIndex >= 0) {
    const hash = href.slice(hashIndex + 1); // remove '#'
    if (!hash) return null;
    return normalizePath(hash);
  }

  // Scheme URLs without hash: "content://localhost/foo"
  if (isAppScheme(href)) {
    try {
      const u = new URL(href);
      return normalizePath(u.pathname || '/');
    } catch {
      // fallthrough
    }
  }

  // Path-only: "/foo"
  if (href.startsWith('/')) return normalizePath(href);

  // Not an app route (likely external or relative asset)
  return null;
}

// Current location -> normalized app path.
// Prefers hash path (#/foo), falls back to pathname (/foo).
export function getPathFromLocation(): string {
  const h = window.location.hash;
  if (h && h.startsWith('#/')) {
    return normalizePath(h.slice(1));
  }
  return normalizePath(window.location.pathname || '/');
}

// Build href suitable for anchor tags in hash mode.
export function toHashHref(path: string): string {
  const p = normalizePath(path);
  return '#' + p;
}
