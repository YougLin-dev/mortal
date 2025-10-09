export type Orientation = 'horizontal' | 'vertical';

export const TRIGGERS = {
  DRAG_STARTED: 'DRAG_STARTED',
  DRAGGED_OVER_INDEX: 'DRAGGED_OVER_INDEX',
  DRAG_STOPPED: 'DRAG_STOPPED',
  DRAG_OUT: 'DRAG_OUT'
} as const;

export const ATTRIBUTE_ID_NAME = 'data-id';

export type Trigger = (typeof TRIGGERS)[keyof typeof TRIGGERS];

export interface DndZoneOptions<T> {
  items: T[];
  orientation?: Orientation;
  getId?: (item: T) => string;
  transformDraggedElement?: (el?: HTMLElement) => void;
  zoneTabIndex?: number;
  animationDuration?: number;
  animationEasing?: string;
  /**
   * Pixels of pointer movement required before a drag starts.
   * If not provided, defaults to 5.
   */
  dragStartThreshold?: number;
  /**
   * Pixels of vertical overflow threshold for detecting out-of-zone drag.
   * If not provided, defaults to 12.
   */
  outOfZoneThreshold?: number;
}

export interface DndInfo {
  trigger: Trigger;
  id?: string;
  fromIndex?: number;
  toIndex?: number;
  draggable?: HTMLElement | null;
  outOfZone?: boolean;
  pointer?: {
    clientX: number;
    clientY: number;
    screenX: number;
    screenY: number;
  };
}

export interface DndEvent<T> {
  items: T[];
  info: DndInfo;
}

function isHTMLElement(n: EventTarget | null): n is HTMLElement {
  return !!n && n instanceof HTMLElement;
}

function isFunction(n: unknown): n is (...args: unknown[]) => unknown {
  return typeof n === 'function';
}

function closestDataId(el: HTMLElement | null, stopAt: HTMLElement): HTMLElement | null {
  let cur: HTMLElement | null = el;
  while (cur && cur !== stopAt) {
    if (cur.hasAttribute(ATTRIBUTE_ID_NAME)) return cur;
    cur = cur.parentElement;
  }
  return null;
}

function indexOfId<T>(items: T[], id: string, getId: (item: T) => string): number {
  for (let i = 0; i < items.length; i++) if (getId(items[i]) === id) return i;
  return -1;
}

function moveItemImmutable<T>(arr: T[], from: number, to: number): T[] {
  if (from === to) return arr.slice();
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function _getId<T>(item: T): string {
  const id = (item as unknown as { id: string }).id;
  if (typeof id !== 'string')
    throw new Error('Default getId function expects item to have an "id" property of type string. Please provide a custom getId function.');
  return id;
}

function childElementsWithId(root: HTMLElement): HTMLElement[] {
  return Array.from(root.children).filter((el): el is HTMLElement => isHTMLElement(el) && el.hasAttribute(ATTRIBUTE_ID_NAME));
}

export function dndzone<T>(element: HTMLElement, options: DndZoneOptions<T>) {
  let items: T[] = options.items ?? [];
  const getId = options.getId ?? _getId;
  let draggedEl: HTMLElement | null = null;
  let draggedId: string | undefined;
  let fromIndex = -1;
  let dragging = false;
  const orientation: Orientation = options.orientation ?? 'horizontal';
  let animationDuration = options.animationDuration ?? 180;
  let animationEasing = options.animationEasing ?? 'ease';

  let startOffsetX = 0;
  let startOffsetY = 0;
  let startClientX = 0;
  let startClientY = 0;
  let hasPointerMovedBeyondThreshold = false;
  let dragStartThreshold = options.dragStartThreshold ?? 5; // Movement needed before starting drag
  let outOfZoneThreshold = options.outOfZoneThreshold ?? 12;
  let isOutOfZone = false;
  let lastClientX = 0;
  let lastClientY = 0;
  let lastScreenX = 0;
  let lastScreenY = 0;
  let baseLeft = 0;
  let baseTop = 0;
  let containerRect: DOMRect | null = null;
  let draggedWidth = 0;
  let draggedHeight = 0;
  let prev = {
    position: '',
    left: '',
    top: '',
    width: '',
    height: '',
    zIndex: '',
    pointerEvents: '',
    userSelect: '',
    transition: '',
    transform: '',
    willChange: ''
  };

  let placeholderEl: HTMLElement | null = null;
  let lastTargetIndex: number | null = null;

  function nonDraggedChildren(): HTMLElement[] {
    return childElementsWithId(element).filter((el) => el !== draggedEl);
  }

  let raf = 0;
  const pendingTransforms = new Map<HTMLElement, { dx: number; dy: number }>();
  function captureSiblingRects(): Map<HTMLElement, DOMRect> {
    const map = new Map<HTMLElement, DOMRect>();
    const others = nonDraggedChildren();
    for (const el of others) {
      map.set(el, el.getBoundingClientRect());
    }
    return map;
  }

  function animateSiblingsFrom(prevRects: Map<HTMLElement, DOMRect>) {
    const others = nonDraggedChildren();
    for (const el of others) {
      const prev = prevRects.get(el);
      if (!prev) continue;
      const next = el.getBoundingClientRect();
      const dx = prev.left - next.left;
      const dy = prev.top - next.top;
      if (dx === 0 && dy === 0) continue;

      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      el.style.willChange = 'transform';
      pendingTransforms.set(el, { dx, dy });
    }

    if (raf) cancelAnimationFrame(raf);

    raf = requestAnimationFrame(() => {
      pendingTransforms.forEach((_, node) => {
        node.style.transition = `transform ${animationDuration}ms ${animationEasing}`;
        node.style.transform = 'translate(0px, 0px)';
        const cleanup = () => {
          node.style.willChange = '';
          node.removeEventListener('transitionend', cleanup);
        };
        node.addEventListener('transitionend', cleanup);
      });
      pendingTransforms.clear();
    });
  }

  function ensurePlaceholderAt(index: number) {
    if (!draggedEl) return;
    if (!placeholderEl) {
      placeholderEl = document.createElement('div');
      placeholderEl.setAttribute('aria-hidden', 'true');
      placeholderEl.style.visibility = 'hidden';
      placeholderEl.style.pointerEvents = 'none';
      placeholderEl.style.width = `${Math.max(1, Math.round(draggedWidth))}px`;
      placeholderEl.style.height = `${Math.max(1, Math.round(draggedHeight))}px`;
      placeholderEl.style.flex = `0 0 ${Math.max(1, Math.round(draggedWidth))}px`;
    }
    const others = nonDraggedChildren();
    const before = others[index] ?? null;
    if (before) {
      if (placeholderEl.nextSibling !== before) element.insertBefore(placeholderEl, before);
    } else {
      const afterLastOther = others[others.length - 1] ?? null;
      const next = afterLastOther ? afterLastOther.nextSibling : element.firstChild;
      if (placeholderEl !== next) element.insertBefore(placeholderEl, next);
    }
  }
  function computeTargetIndex(clientX: number, clientY: number): number {
    const children = nonDraggedChildren();
    if (children.length === 0) return 0;
    const axis = orientation === 'horizontal' ? 'x' : 'y';
    let insertIdx = children.length; // default append to end
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const before = axis === 'x' ? clientX < centerX : clientY < centerY;
      if (before) {
        insertIdx = i;
        break;
      }
    }
    return insertIdx;
  }

  function cleanupPlaceholder() {
    if (placeholderEl && placeholderEl.parentElement) placeholderEl.parentElement.removeChild(placeholderEl);
    placeholderEl = null;
  }

  function restoreDraggedElStyles() {
    if (!draggedEl) return;
    draggedEl.style.position = prev.position;
    draggedEl.style.left = prev.left;
    draggedEl.style.top = prev.top;
    draggedEl.style.width = prev.width;
    draggedEl.style.height = prev.height;
    draggedEl.style.zIndex = prev.zIndex;
    draggedEl.style.pointerEvents = prev.pointerEvents;
    draggedEl.style.userSelect = prev.userSelect;
    draggedEl.style.transition = prev.transition;
    draggedEl.style.transform = prev.transform;
    draggedEl.style.willChange = prev.willChange;
  }

  function resetDragState() {
    lastTargetIndex = null;
    draggedEl = null;
    draggedId = undefined;
    fromIndex = -1;
  }

  function finishCleanup() {
    cleanupPlaceholder();
    restoreDraggedElStyles();
    resetDragState();
  }

  function finalizeCleanupWithAnimation() {
    if (!draggedEl) {
      finishCleanup();
      return;
    }

    const el = draggedEl;
    const prevRect = el.getBoundingClientRect();

    cleanupPlaceholder();

    el.style.position = prev.position;
    el.style.left = prev.left;
    el.style.top = prev.top;
    el.style.width = prev.width;
    el.style.height = prev.height;
    el.style.pointerEvents = prev.pointerEvents;
    el.style.userSelect = prev.userSelect;

    const finalRect = el.getBoundingClientRect();
    const dx = prevRect.left - finalRect.left;
    const dy = prevRect.top - finalRect.top;

    if (dx === 0 && dy === 0) {
      el.style.transition = prev.transition;
      el.style.transform = prev.transform;
      el.style.willChange = '';
      resetDragState();
      return;
    }
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px)` + (prev.transform ? ` ${prev.transform}` : '');
    el.style.willChange = 'transform';

    requestAnimationFrame(() => {
      const cleanup = () => {
        el.style.willChange = '';
        el.style.transition = prev.transition;
        el.style.transform = prev.transform;
        el.style.zIndex = prev.zIndex;

        el.removeEventListener('transitionend', cleanup);
        resetDragState();
      };
      el.style.transition = `transform ${animationDuration}ms ${animationEasing}`;
      el.style.transform = prev.transform || 'translate(0px, 0px)';
      if (animationDuration === 0) cleanup();
      else el.addEventListener('transitionend', cleanup, { once: true });
    });
  }

  function removeWindowListeners() {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerCancel);
  }

  function endDrag(finalize = true) {
    if (!dragging) return;
    dragging = false;
    element.style.cursor = 'unset';
    document.body.style.userSelect = 'auto';

    if (finalize) {
      const detail: DndEvent<T> = {
        items,
        info: {
          trigger: TRIGGERS.DRAG_STOPPED,
          id: draggedId,
          fromIndex,
          outOfZone: isOutOfZone,
          pointer: isOutOfZone ? { clientX: lastClientX, clientY: lastClientY, screenX: lastScreenX, screenY: lastScreenY } : undefined,
          draggable: draggedEl
        }
      };
      element.dispatchEvent(new CustomEvent('finalize', { detail }));
      requestAnimationFrame(finalizeCleanupWithAnimation);
      return;
    }

    finishCleanup();
  }

  function maybeStartDrag(ev: PointerEvent) {
    if (dragging || !draggedEl) return;
    const dx = Math.abs(ev.clientX - startClientX);
    const dy = Math.abs(ev.clientY - startClientY);
    hasPointerMovedBeyondThreshold = dx > dragStartThreshold || dy > dragStartThreshold;
    if (!hasPointerMovedBeyondThreshold) return;

    dragging = true;
    element.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    const target = draggedEl;
    const rect = target.getBoundingClientRect();
    containerRect = element.getBoundingClientRect();
    startOffsetX = ev.clientX - rect.left;
    startOffsetY = ev.clientY - rect.top;
    baseLeft = rect.left;
    baseTop = rect.top;
    draggedWidth = rect.width;
    draggedHeight = rect.height;
    prev = {
      position: target.style.position,
      left: target.style.left,
      top: target.style.top,
      width: target.style.width,
      height: target.style.height,
      zIndex: target.style.zIndex,
      pointerEvents: target.style.pointerEvents,
      userSelect: target.style.userSelect,
      transition: target.style.transition,
      transform: target.style.transform,
      willChange: target.style.willChange
    };
    target.style.position = 'fixed';
    target.style.left = `${rect.left}px`;
    target.style.top = `${rect.top}px`;
    target.style.width = `${rect.width}px`;
    target.style.height = `${rect.height}px`;
    target.style.zIndex = '9999';
    target.style.pointerEvents = 'none';
    target.style.userSelect = 'none';
    target.style.transition = 'none';
    target.style.transform = 'translateZ(0)';
    target.style.willChange = 'left, top';

    if (isFunction(options.transformDraggedElement)) {
      try {
        options.transformDraggedElement(target);
      } catch (error) {
        console.error('Error in transformDraggedElement:', error);
      }
    }

    ensurePlaceholderAt(fromIndex);

    const startDetail: DndEvent<T> = {
      items: items.slice(),
      info: { trigger: TRIGGERS.DRAG_STARTED, id: draggedId, fromIndex, draggable: draggedEl }
    };
    element.dispatchEvent(new CustomEvent('consider', { detail: startDetail }));
  }

  function onPointerMove(ev: PointerEvent) {
    if (!dragging) {
      maybeStartDrag(ev);
    }
    if (!dragging || !draggedEl) return;
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));
    let left = ev.clientX - startOffsetX;
    let top = ev.clientY - startOffsetY;
    if (containerRect) {
      if (orientation === 'horizontal') {
        top = baseTop;
        left = clamp(left, containerRect.left, containerRect.right - draggedWidth);
      } else {
        left = baseLeft;
        top = clamp(top, containerRect.top, containerRect.bottom - draggedHeight);
      }
    } else {
      if (orientation === 'horizontal') top = baseTop;
      else left = baseLeft;
    }
    draggedEl.style.left = `${left}px`;
    draggedEl.style.top = `${top}px`;

    // Record pointer position for potential out-of-zone event
    lastClientX = ev.clientX;
    lastClientY = ev.clientY;
    lastScreenX = ev.screenX;
    lastScreenY = ev.screenY;

    // Detect out-of-zone (vertical overflow for horizontal orientation)
    const wasOutOfZone = isOutOfZone;
    if (orientation === 'horizontal' && containerRect) {
      isOutOfZone = ev.clientY < containerRect.top - outOfZoneThreshold || ev.clientY > containerRect.bottom + outOfZoneThreshold;
    } else {
      isOutOfZone = false;
    }

    if (isOutOfZone !== wasOutOfZone && isOutOfZone) {
      const detail: DndEvent<T> = {
        items: items.slice(),
        info: {
          trigger: TRIGGERS.DRAG_OUT,
          id: draggedId,
          fromIndex,
          outOfZone: true,
          pointer: { clientX: ev.clientX, clientY: ev.clientY, screenX: ev.screenX, screenY: ev.screenY },
          draggable: draggedEl
        }
      };
      element.dispatchEvent(new CustomEvent('consider', { detail }));
    }

    // Determine new index based on pointer
    const targetIndex = computeTargetIndex(ev.clientX, ev.clientY);
    if (targetIndex < 0 || fromIndex < 0) return;

    if (lastTargetIndex !== targetIndex) {
      const prevRects = captureSiblingRects();
      ensurePlaceholderAt(targetIndex);
      lastTargetIndex = targetIndex;
      animateSiblingsFrom(prevRects);
    }

    const curIndex = indexOfId(items, draggedId!, getId);

    if (targetIndex !== curIndex) {
      const newItems = moveItemImmutable(items, curIndex, targetIndex);
      items = newItems;
      const detail: DndEvent<T> = {
        items: newItems,
        info: {
          trigger: TRIGGERS.DRAGGED_OVER_INDEX,
          id: draggedId,
          fromIndex,
          toIndex: targetIndex,
          draggable: draggedEl
        }
      };
      element.dispatchEvent(new CustomEvent('consider', { detail }));
    }
  }
  function onPointerCancel() {
    endDrag(false);
    removeWindowListeners();
  }

  function onPointerUp() {
    if (!dragging) {
      removeWindowListeners();
      draggedEl = null;
      draggedId = undefined;
      fromIndex = -1;
      return;
    }
    endDrag(true);
    removeWindowListeners();
  }
  function onPointerdDown(ev: PointerEvent) {
    if (!isHTMLElement(ev.target)) return;
    const target = closestDataId(ev.target, element);
    if (!target) return;

    draggedEl = target;
    draggedId = target.getAttribute(ATTRIBUTE_ID_NAME) || undefined;
    if (!draggedId) return;
    fromIndex = indexOfId(items, draggedId, getId);
    if (fromIndex === -1) return;

    hasPointerMovedBeyondThreshold = false;
    startClientX = ev.clientX;
    startClientY = ev.clientY;

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerCancel, { passive: true });
  }
  element.addEventListener('pointerdown', onPointerdDown);

  return {
    update(newOptions: DndZoneOptions<T>) {
      items = newOptions.items ?? items;
      if (newOptions.getId) options.getId = newOptions.getId;
      if (newOptions.orientation) options.orientation = newOptions.orientation;
      if (newOptions.transformDraggedElement) options.transformDraggedElement = newOptions.transformDraggedElement;
      if (newOptions.zoneTabIndex !== undefined) options.zoneTabIndex = newOptions.zoneTabIndex;
      if (newOptions.animationDuration !== undefined) animationDuration = newOptions.animationDuration;
      if (newOptions.animationEasing !== undefined) animationEasing = newOptions.animationEasing;
      if (newOptions.dragStartThreshold !== undefined) dragStartThreshold = newOptions.dragStartThreshold;
      if (newOptions.outOfZoneThreshold !== undefined) outOfZoneThreshold = newOptions.outOfZoneThreshold;
    },
    destroy() {
      element.removeEventListener('pointerdown', onPointerdDown);
      endDrag(false);
    }
  };
}
