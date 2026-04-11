/**
 * ════════════════════════════════════════════════════════════════════════════════
 * useVideoPinning — Draggable / pinnable remote video overlay
 *
 * Used in both the main video chat view and the code-editor mode.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseVideoPinningReturn {
  isPinned: boolean;
  position: { x: number; y: number };
  isDragging: boolean;
  pinnedSize: { width: number; height: number } | null;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  handlePointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  togglePin: () => void;
}

export function useVideoPinning(enabled: boolean = true): UseVideoPinningReturn {
  const [isPinned, setIsPinned] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [pinnedSize, setPinnedSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(dragOffset);

  useEffect(() => {
    dragOffsetRef.current = dragOffset;
  }, [dragOffset]);

  /* ── Pointer down ───────────────────────────────────────────────────── */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled) return;
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      const rect = wrapper.getBoundingClientRect();

      if (!isPinned) {
        setIsPinned(true);
        setPinnedSize({ width: rect.width, height: rect.height });
        setPosition({ x: rect.left, y: rect.top });
      }

      setIsDragging(true);
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      try {
        (e.target as Element).setPointerCapture(e.pointerId);
      } catch (_) {}
    },
    [isPinned, enabled],
  );

  /* ── Drag movement via RAF ──────────────────────────────────────────── */
  useEffect(() => {
    if (!isDragging) return;

    const onPointerMove = (ev: PointerEvent) => {
      lastPointerRef.current = { x: ev.clientX, y: ev.clientY };
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const last = lastPointerRef.current;
          if (!last) return;

          const wrapper = wrapperRef.current;
          const wW = wrapper
            ? wrapper.offsetWidth
            : pinnedSize?.width || 320;
          const wH = wrapper
            ? wrapper.offsetHeight
            : pinnedSize?.height || 240;

          const offset = dragOffsetRef.current;
          let newX = last.x - offset.x;
          let newY = last.y - offset.y;

          newX = Math.max(0, Math.min(newX, window.innerWidth - wW));
          newY = Math.max(0, Math.min(newY, window.innerHeight - wH));

          setPosition({ x: newX, y: newY });
        });
      }
    };

    const onPointerUp = () => {
      setIsDragging(false);
      lastPointerRef.current = null;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);

    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isDragging, pinnedSize]);

  /* ── Toggle pin ─────────────────────────────────────────────────────── */
  const togglePin = useCallback(() => {
    setIsPinned((prev) => {
      if (prev) setPosition({ x: 0, y: 0 });
      return !prev;
    });
  }, []);

  return {
    isPinned,
    position,
    isDragging,
    pinnedSize,
    wrapperRef,
    handlePointerDown,
    togglePin,
  };
}
