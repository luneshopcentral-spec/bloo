"use client";

import { useEffect } from "react";

const DRAG_HANDLE_SELECTOR = [
  ".fred-psel-title",
  ".fred-pdtl-title",
  ".fred-dsel-title",
  ".fred-prsel-title",
  ".fred-reference-titlebar",
  ".fred-onboarding-title",
  ".fred-result-title",
  ".presc-header",
].join(",");

const INTERACTIVE_SELECTOR = "button, input, select, textarea, a, summary, [role='button']";
const EDGE_GAP = 8;

interface DragPosition {
  x: number;
  y: number;
}

interface ActiveDrag {
  dialog: HTMLElement;
  handle: HTMLElement;
  pointerId: number;
  startX: number;
  startY: number;
  startRect: DOMRect;
  origin: DragPosition;
}

function findDragSurface(handle: HTMLElement): HTMLElement | null {
  return handle.closest<HTMLElement>("[role='dialog']");
}

/** Adds bounded pointer dragging to every simulator dialog without changing its form behavior. */
export function DraggableDialogManager() {
  useEffect(() => {
    const positions = new WeakMap<HTMLElement, DragPosition>();
    let active: ActiveDrag | null = null;

    function markHandles(root: ParentNode = document) {
      root.querySelectorAll<HTMLElement>(DRAG_HANDLE_SELECTOR).forEach((handle) => {
        handle.dataset.dragHandle = "true";
        if (!handle.title) handle.title = "Drag to move";
      });
    }

    function stopDragging() {
      if (!active) return;
      active.dialog.removeAttribute("data-dialog-dragging");
      if (active.handle.hasPointerCapture(active.pointerId)) {
        active.handle.releasePointerCapture(active.pointerId);
      }
      active = null;
    }

    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const handle = target.closest<HTMLElement>(DRAG_HANDLE_SELECTOR);
      if (!handle || target.closest(INTERACTIVE_SELECTOR)) return;
      const dialog = findDragSurface(handle);
      if (!dialog) return;

      const origin = positions.get(dialog) ?? { x: 0, y: 0 };
      active = {
        dialog,
        handle,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startRect: dialog.getBoundingClientRect(),
        origin,
      };
      dialog.setAttribute("data-dialog-dragging", "true");
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    }

    function onPointerMove(event: PointerEvent) {
      if (!active || event.pointerId !== active.pointerId) return;
      const rawX = event.clientX - active.startX;
      const rawY = event.clientY - active.startY;
      const deltaX = Math.min(
        window.innerWidth - EDGE_GAP - active.startRect.right,
        Math.max(EDGE_GAP - active.startRect.left, rawX)
      );
      const deltaY = Math.min(
        window.innerHeight - EDGE_GAP - active.startRect.bottom,
        Math.max(EDGE_GAP - active.startRect.top, rawY)
      );
      const next = {
        x: active.origin.x + deltaX,
        y: active.origin.y + deltaY,
      };
      positions.set(active.dialog, next);
      active.dialog.style.translate = `${next.x}px ${next.y}px`;
    }

    function onPointerUp(event: PointerEvent) {
      if (active && event.pointerId === active.pointerId) stopDragging();
    }

    markHandles();
    const observer = new MutationObserver(() => markHandles());
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);

    return () => {
      stopDragging();
      observer.disconnect();
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  return null;
}
