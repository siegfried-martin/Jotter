import { useEffect, useRef, useState } from 'react';

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2;

const POINTER_EVENTS = ['pointermove', 'pointerup', 'mouseup', 'click'] as const;

function storageKey(scope: string) {
  return `jotter_editor_zoom_${scope}`;
}

function clamp(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 100) / 100));
}

function readZoom(scope: string): number {
  try {
    const v = Number(localStorage.getItem(storageKey(scope)));
    return v ? clamp(v) : 1;
  } catch {
    return 1;
  }
}

function writeZoom(scope: string, zoom: number) {
  try {
    if (zoom === 1) localStorage.removeItem(storageKey(scope));
    else localStorage.setItem(storageKey(scope), String(zoom));
  } catch {
    /* localStorage unavailable */
  }
}

function touchDistance(t: TouchList): number {
  return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
}

/**
 * Two-finger pinch → a CSS zoom factor for the element at `ref`, for editors that have no
 * zoom of their own. Single-finger touches pass straight through to the editor; a pinch is
 * captured before the editor sees it and the browser's page zoom is suppressed. The level
 * is remembered per `scope` (the section type) on this device.
 */
export function usePinchZoom<T extends HTMLElement>(scope: string, enabled: boolean) {
  const ref = useRef<T>(null);
  const [zoom, setZoom] = useState(() => readZoom(scope));
  const [pinching, setPinching] = useState(false);
  const zoomRef = useRef(zoom);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let active = false;
    let startDist = 0;
    let startZoom = 1;
    let frame = 0;
    // The first finger of a pinch has already reached the editor as a touchstart/pointerdown;
    // swallow the touch-end/pointer/click events that follow until shortly after the pinch,
    // so it doesn't also land as a tap (e.g. the calendar selecting a day).
    let suppressUntil = 0;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      e.stopPropagation();
      active = true;
      suppressUntil = Infinity;
      startDist = touchDistance(e.touches) || 1;
      startZoom = zoomRef.current;
      setPinching(true);
    };
    const onMove = (e: TouchEvent) => {
      if (!active || e.touches.length !== 2) return;
      e.preventDefault();
      e.stopPropagation();
      const next = clamp((startZoom * touchDistance(e.touches)) / startDist);
      if (next === zoomRef.current) return;
      zoomRef.current = next;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setZoom(next));
    };
    const onEnd = (e: TouchEvent) => {
      // Every finger-lift of a pinch is the pinch's, not a tap for the editor underneath.
      if (performance.now() < suppressUntil) e.stopPropagation();
      if (!active || e.touches.length >= 2) return;
      active = false;
      suppressUntil = performance.now() + 400;
      setPinching(false);
      writeZoom(scope, zoomRef.current);
    };
    // iOS Safari fires its own gesture events for page zoom; swallow them inside the editor.
    const onGesture = (e: Event) => e.preventDefault();
    const onPointer = (e: Event) => {
      if (performance.now() < suppressUntil) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const opts = { capture: true, passive: false } as const;
    el.addEventListener('touchstart', onStart, opts);
    el.addEventListener('touchmove', onMove, opts);
    el.addEventListener('touchend', onEnd, opts);
    el.addEventListener('touchcancel', onEnd, opts);
    el.addEventListener('gesturestart', onGesture, opts);
    el.addEventListener('gesturechange', onGesture, opts);
    for (const type of POINTER_EVENTS) el.addEventListener(type, onPointer, opts);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('touchstart', onStart, opts);
      el.removeEventListener('touchmove', onMove, opts);
      el.removeEventListener('touchend', onEnd, opts);
      el.removeEventListener('touchcancel', onEnd, opts);
      el.removeEventListener('gesturestart', onGesture, opts);
      el.removeEventListener('gesturechange', onGesture, opts);
      for (const type of POINTER_EVENTS) el.removeEventListener(type, onPointer, opts);
    };
  }, [scope, enabled]);

  return { ref, zoom: enabled ? zoom : 1, pinching };
}
