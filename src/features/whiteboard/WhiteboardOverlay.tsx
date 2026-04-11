/**
 * ════════════════════════════════════════════════════════════════════════════════
 * WhiteboardOverlay — Professional Collaborative Whiteboard with Camera PiP
 *
 * World-class whiteboard inspired by Miro, FigJam & Excalidraw.
 * Features:
 *  • Camera PiP overlays (local + remote) — draggable
 *  • Full drawing toolkit: pen, highlighter, eraser, shapes, arrows, text,
 *    sticky notes, laser pointer
 *  • Infinite canvas with pan + zoom (scroll / pinch / Space+drag)
 *  • Grid overlay, snap-to-grid
 *  • Undo / Redo (Ctrl+Z / Ctrl+Y)
 *  • Color palette, stroke width, opacity
 *  • Export to PNG
 *  • Dark theme
 *  • Keyboard shortcuts
 *  • Real-time shape sync via sendData
 * ════════════════════════════════════════════════════════════════════════════════
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

import { WhiteboardTool, WhiteboardPoint, DrawElement, WhiteboardOverlayProps } from './types';

// Local type alias for Point used internally
type Point = WhiteboardPoint;



/* ═══════════════════════════════════════════════════════════════════════════
   PROPS
   ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */

const COLORS = [
  "#ffffff",
  "#f87171",
  "#fb923c",
  "#facc15",
  "#4ade80",
  "#22d3ee",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#000000",
];
const STROKE_WIDTHS = [1, 2, 3, 5, 8, 12];
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const GRID_SIZE = 30;
const LASER_LIFETIME = 1500;

const TOOLS: { id: WhiteboardTool; icon: string; label: string; shortcut?: string }[] = [
  { id: "select", icon: "⬚", label: "Select", shortcut: "V" },
  { id: "pan", icon: "✋", label: "Pan", shortcut: "H" },
  { id: "pen", icon: "✏️", label: "Pen", shortcut: "P" },
  { id: "highlighter", icon: "🖍️", label: "Highlight", shortcut: "M" },
  { id: "eraser", icon: "⌫", label: "Eraser", shortcut: "E" },
  { id: "line", icon: "╱", label: "Line", shortcut: "L" },
  { id: "arrow", icon: "→", label: "Arrow", shortcut: "A" },
  { id: "rectangle", icon: "▭", label: "Rect", shortcut: "R" },
  { id: "circle", icon: "◯", label: "Circle", shortcut: "O" },
  { id: "diamond", icon: "◇", label: "Diamond", shortcut: "D" },
  { id: "triangle", icon: "△", label: "Triangle", shortcut: "T" },
  { id: "text", icon: "T", label: "Text", shortcut: "X" },
  { id: "sticky", icon: "📝", label: "Sticky", shortcut: "S" },
  { id: "laser", icon: "🔴", label: "Laser", shortcut: "Z" },
];

let _idCounter = 0;
const uid = () => `el_${Date.now()}_${++_idCounter}`;

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export const WhiteboardOverlay: React.FC<WhiteboardOverlayProps> = ({
  sendData,
  onClose,
  localStream = null,
  remoteStream = null,
  pageRemoteVideoRef,
}) => {
  /* ── State ──────────────────────────────────────────────────────────── */
  const [tool, setTool] = useState<WhiteboardTool>("pen");
  const [color, setColor] = useState("#ffffff");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [fillColor, setFillColor] = useState("transparent");
  const [showGrid, setShowGrid] = useState(true);
  const [elements, setElements] = useState<DrawElement[]>([]);
  const [undoStack, setUndoStack] = useState<DrawElement[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawElement[][]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<WhiteboardPoint>({ x: 0, y: 0 });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showStrokeMenu, setShowStrokeMenu] = useState(false);
  const [textInput, setTextInput] = useState<{
    x: number;
    y: number;
    visible: boolean;
  } | null>(null);
  const [textValue, setTextValue] = useState("");

  // Constant opacity value (always 1)
  const opacity = 1;

  /* ── Refs ───────────────────────────────────────────────────────────── */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const panStart = useRef<Point>({ x: 0, y: 0 });
  const currentElement = useRef<DrawElement | null>(null);
  const spaceHeld = useRef(false);
  const animFrameId = useRef<number>(0);

  // Cameras
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Camera dragging
  const [localCamPos, setLocalCamPos] = useState<WhiteboardPoint>({ x: -1, y: -1 });
  const [remoteCamPos, setRemoteCamPos] = useState<WhiteboardPoint>({ x: -1, y: -1 });
  const [localCamMin, setLocalCamMin] = useState(false);
  const [remoteCamMin, setRemoteCamMin] = useState(false);
  const draggingCam = useRef<"local" | "remote" | null>(null);
  const camDragStart = useRef<Point>({ x: 0, y: 0 });
  const camPosStart = useRef<Point>({ x: 0, y: 0 });

  // Reactive remote stream — polls the page-level video element to reliably
  // pick up the LiveKit-attached srcObject even when it wasn't available at mount.
  const [activeRemoteStream, setActiveRemoteStream] = useState<MediaStream | null>(
    remoteStream ?? null,
  );

  /* ── Camera stream attachment ───────────────────────────────────────── */
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Direct prop
  useEffect(() => {
    if (remoteStream) {
      setActiveRemoteStream(remoteStream);
    }
  }, [remoteStream]);

  // Poll the page-level <video> element for its srcObject (LiveKit sets it via
  // DOM mutation, so React never re-renders with the new value).
  useEffect(() => {
    if (!pageRemoteVideoRef) return;
    const check = () => {
      const src = pageRemoteVideoRef.current?.srcObject as MediaStream | null;
      if (src && src !== activeRemoteStream) {
        setActiveRemoteStream(src);
      }
    };
    check(); // immediate
    const id = setInterval(check, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageRemoteVideoRef]);

  // Attach to internal video element
  useEffect(() => {
    if (remoteVideoRef.current && activeRemoteStream) {
      remoteVideoRef.current.srcObject = activeRemoteStream;
    }
  }, [activeRemoteStream]);

  /* ── Init camera positions after mount ──────────────────────────────── */
  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    setLocalCamPos({ x: w - 200, y: h - 170 });
    setRemoteCamPos({ x: 16, y: 70 });
  }, []);

  /* ── Canvas resize ──────────────────────────────────────────────────── */
  useEffect(() => {
    const resize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = r.width * devicePixelRatio;
      canvasRef.current.height = r.height * devicePixelRatio;
      canvasRef.current.style.width = `${r.width}px`;
      canvasRef.current.style.height = `${r.height}px`;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  /* ── Transform helpers ──────────────────────────────────────────────── */
  const screenToWorld = useCallback(
    (sx: number, sy: number): WhiteboardPoint => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: sx, y: sy };
      return {
        x: (sx - rect.left - pan.x) / zoom,
        y: (sy - rect.top - pan.y) / zoom,
      };
    },
    [zoom, pan],
  );

  /* ── Laser cleanup (fade out) ───────────────────────────────────────── */
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setElements((prev) => {
        const filtered = prev.filter(
          (el) =>
            el.tool !== "laser" || now - (el.createdAt || 0) < LASER_LIFETIME,
        );
        if (filtered.length !== prev.length) return filtered;
        return prev;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  /* ══════════════════════════════════════════════════════════════════════
     RENDERING
     ══════════════════════════════════════════════════════════════════════ */
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = devicePixelRatio;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0f0f1a";
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Grid
    if (showGrid) {
      const gs = GRID_SIZE;
      const startX = Math.floor(-pan.x / zoom / gs) * gs - gs;
      const startY = Math.floor(-pan.y / zoom / gs) * gs - gs;
      const endX = startX + w / zoom + gs * 2;
      const endY = startY + h / zoom + gs * 2;

      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 0.5;
      for (let x = startX; x <= endX; x += gs) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }
      for (let y = startY; y <= endY; y += gs) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }

      // Axis lines
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, startY);
      ctx.lineTo(0, endY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(endX, 0);
      ctx.stroke();
    }

    // Draw elements
    for (const el of elements) {
      drawElement(ctx, el);
    }
    // Draw current element (preview)
    if (currentElement.current) {
      drawElement(ctx, currentElement.current);
    }

    ctx.restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, zoom, pan, showGrid]);

  /* ── Draw single element ────────────────────────────────────────────── */
  const drawElement = useCallback(
    (ctx: CanvasRenderingContext2D, el: DrawElement) => {
      ctx.save();
      ctx.globalAlpha =
        el.tool === "highlighter"
          ? 0.35
          : el.tool === "laser"
            ? Math.max(
              0,
              1 - (Date.now() - (el.createdAt || Date.now())) / LASER_LIFETIME,
            )
            : el.opacity;
      ctx.strokeStyle = el.color;
      ctx.fillStyle = el.fill === "transparent" ? "transparent" : el.fill;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      switch (el.tool) {
        case "pen":
        case "highlighter":
        case "laser":
          if (el.tool === "highlighter") ctx.lineWidth = el.strokeWidth * 4;
          if (el.tool === "laser") {
            ctx.strokeStyle = "#ff3333";
            ctx.lineWidth = 3;
            ctx.shadowColor = "#ff0000";
            ctx.shadowBlur = 12;
          }
          drawFreehand(ctx, el.points);
          break;

        case "eraser":
          ctx.globalCompositeOperation = "destination-out";
          ctx.lineWidth = el.strokeWidth * 20;
          drawFreehand(ctx, el.points);
          ctx.globalCompositeOperation = "source-over";
          break;

        case "line":
          if (el.points.length >= 2) {
            const [p1, p2] = [el.points[0], el.points[el.points.length - 1]];
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
          break;

        case "arrow":
          if (el.points.length >= 2) {
            const [p1, p2] = [el.points[0], el.points[el.points.length - 1]];
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            drawArrowHead(ctx, p1, p2, el.strokeWidth);
          }
          break;

        case "rectangle":
          if (el.x != null && el.y != null && el.w != null && el.h != null) {
            if (el.fill !== "transparent") {
              ctx.fillRect(el.x, el.y, el.w, el.h);
            }
            ctx.strokeRect(el.x, el.y, el.w, el.h);
          }
          break;

        case "circle":
          if (el.x != null && el.y != null && el.w != null && el.h != null) {
            const cx = el.x + el.w / 2;
            const cy = el.y + el.h / 2;
            const rx = Math.abs(el.w / 2);
            const ry = Math.abs(el.h / 2);
            ctx.beginPath();
            ctx.ellipse(cx, cy, Math.max(rx, 0.1), Math.max(ry, 0.1), 0, 0, Math.PI * 2);
            if (el.fill !== "transparent") ctx.fill();
            ctx.stroke();
          }
          break;

        case "diamond":
          if (el.x != null && el.y != null && el.w != null && el.h != null) {
            const dcx = el.x + el.w / 2;
            const dcy = el.y + el.h / 2;
            const hw = Math.abs(el.w / 2);
            const hh = Math.abs(el.h / 2);
            ctx.beginPath();
            ctx.moveTo(dcx, dcy - hh);
            ctx.lineTo(dcx + hw, dcy);
            ctx.lineTo(dcx, dcy + hh);
            ctx.lineTo(dcx - hw, dcy);
            ctx.closePath();
            if (el.fill !== "transparent") ctx.fill();
            ctx.stroke();
          }
          break;

        case "triangle":
          if (el.x != null && el.y != null && el.w != null && el.h != null) {
            ctx.beginPath();
            ctx.moveTo(el.x + el.w / 2, el.y);
            ctx.lineTo(el.x + el.w, el.y + el.h);
            ctx.lineTo(el.x, el.y + el.h);
            ctx.closePath();
            if (el.fill !== "transparent") ctx.fill();
            ctx.stroke();
          }
          break;

        case "text":
          if (el.text && el.x != null && el.y != null) {
            ctx.font = `${el.strokeWidth * 6}px 'Inter', 'Segoe UI', sans-serif`;
            ctx.fillStyle = el.color;
            ctx.textBaseline = "top";
            const lines = el.text.split("\n");
            const lineH = el.strokeWidth * 7;
            for (let i = 0; i < lines.length; i++) {
              ctx.fillText(lines[i], el.x, el.y + i * lineH);
            }
          }
          break;

        case "sticky":
          if (el.x != null && el.y != null && el.w != null && el.h != null) {
            const stickyBg: Record<string, string> = {
              "#facc15": "#fef9c3",
              "#4ade80": "#dcfce7",
              "#60a5fa": "#dbeafe",
              "#f472b6": "#fce7f3",
              "#fb923c": "#fed7aa",
              "#ffffff": "#fef9c3",
            };
            ctx.fillStyle = stickyBg[el.color] || "#fef9c3";
            ctx.shadowColor = "rgba(0,0,0,0.15)";
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 4;
            roundRect(ctx, el.x, el.y, el.w, el.h, 8);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            // Fold
            ctx.fillStyle = "rgba(0,0,0,0.06)";
            ctx.beginPath();
            ctx.moveTo(el.x + el.w - 20, el.y);
            ctx.lineTo(el.x + el.w, el.y);
            ctx.lineTo(el.x + el.w, el.y + 20);
            ctx.closePath();
            ctx.fill();
            // Text
            if (el.text) {
              ctx.fillStyle = "#1f2937";
              ctx.font = "14px 'Inter', 'Segoe UI', sans-serif";
              ctx.textBaseline = "top";
              wrapText(ctx, el.text, el.x + 12, el.y + 12, el.w - 24, 18);
            }
          }
          break;
      }
      ctx.restore();
    },
    [],
  );

  /* ── Drawing helpers ────────────────────────────────────────────────── */
  function drawFreehand(ctx: CanvasRenderingContext2D, pts: WhiteboardPoint[]) {
    if (pts.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const xc = (pts[i].x + pts[i - 1].x) / 2;
      const yc = (pts[i].y + pts[i - 1].y) / 2;
      ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, xc, yc);
    }
    if (pts.length > 1) {
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x, last.y);
    }
    ctx.stroke();
  }

  function drawArrowHead(
    ctx: CanvasRenderingContext2D,
    from: WhiteboardPoint,
    to: WhiteboardPoint,
    sw: number,
  ) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const headLen = Math.max(14, sw * 4);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLen * Math.cos(angle - Math.PI / 6),
      to.y - headLen * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      to.x - headLen * Math.cos(angle + Math.PI / 6),
      to.y - headLen * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fill();
  }

  function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxW: number,
    lineH: number,
  ) {
    const words = text.split(" ");
    let line = "";
    let curY = y;
    for (const word of words) {
      const test = line + word + " ";
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line.trim(), x, curY);
        line = word + " ";
        curY += lineH;
      } else {
        line = test;
      }
    }
    if (line.trim()) ctx.fillText(line.trim(), x, curY);
  }

  /* ── Render loop ────────────────────────────────────────────────────── */
  useEffect(() => {
    const loop = () => {
      renderCanvas();
      animFrameId.current = requestAnimationFrame(loop);
    };
    animFrameId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameId.current);
  }, [renderCanvas]);

  /* ══════════════════════════════════════════════════════════════════════
     HISTORY (simple undo/redo)
     ══════════════════════════════════════════════════════════════════════ */
  const pushUndo = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-50), elements]);
    setRedoStack([]);
  }, [elements]);

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, elements]);
      setElements(last);
      return prev.slice(0, -1);
    });
  }, [elements]);

  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setUndoStack((u) => [...u, elements]);
      setElements(last);
      return prev.slice(0, -1);
    });
  }, [elements]);

  /* ══════════════════════════════════════════════════════════════════════
     POINTER EVENTS
     ══════════════════════════════════════════════════════════════════════ */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setShowColorPicker(false);
      setShowStrokeMenu(false);

      const pt = screenToWorld(e.clientX, e.clientY);

      // Pan via space+click or middle button or pan tool
      if (spaceHeld.current || e.button === 1 || tool === "pan") {
        isPanning.current = true;
        panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }

      if (tool === "select") return;

      // Text tool — show input
      if (tool === "text") {
        setTextInput({ x: pt.x, y: pt.y, visible: true });
        setTextValue("");
        return;
      }

      // Sticky note
      if (tool === "sticky") {
        pushUndo();
        const stickyEl: DrawElement = {
          id: uid(),
          tool: "sticky",
          points: [],
          color,
          strokeWidth,
          opacity,
          fill: color,
          x: pt.x,
          y: pt.y,
          w: 200,
          h: 180,
          text: "",
        };
        const stickyText = prompt("📝 Sticky note text:");
        if (stickyText) {
          stickyEl.text = stickyText;
          setElements((prev) => [...prev, stickyEl]);
          sendData({ type: "wb-add", element: stickyEl });
        }
        return;
      }

      // Start drawing
      pushUndo();
      isDrawing.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const shapeTools: WhiteboardTool[] = ["rectangle", "circle", "diamond", "triangle"];
      const newEl: DrawElement = {
        id: uid(),
        tool,
        points: [pt],
        color,
        strokeWidth,
        opacity,
        fill: shapeTools.includes(tool) ? fillColor : "transparent",
        createdAt: tool === "laser" ? Date.now() : undefined,
        ...(shapeTools.includes(tool) || tool === "line" || tool === "arrow"
          ? { x: pt.x, y: pt.y, w: 0, h: 0 }
          : {}),
      };
      currentElement.current = newEl;
    },
    [tool, color, strokeWidth, opacity, fillColor, pan, screenToWorld, pushUndo, sendData],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isPanning.current) {
        setPan({
          x: e.clientX - panStart.current.x,
          y: e.clientY - panStart.current.y,
        });
        return;
      }

      if (!isDrawing.current || !currentElement.current) return;
      const pt = screenToWorld(e.clientX, e.clientY);
      const el = currentElement.current;

      const shapeTools: WhiteboardTool[] = ["rectangle", "circle", "diamond", "triangle", "line", "arrow"];

      if (shapeTools.includes(el.tool)) {
        const origin = el.points[0];
        el.x = Math.min(origin.x, pt.x);
        el.y = Math.min(origin.y, pt.y);
        el.w = Math.abs(pt.x - origin.x);
        el.h = Math.abs(pt.y - origin.y);
        el.points = [origin, pt];
      } else {
        el.points.push(pt);
      }
    },
    [screenToWorld],
  );

  const handlePointerUp = useCallback(
    (_e: React.PointerEvent) => {
      if (isPanning.current) {
        isPanning.current = false;
        return;
      }
      if (!isDrawing.current || !currentElement.current) return;
      isDrawing.current = false;

      const el = currentElement.current;
      currentElement.current = null;

      const isShape = ["rectangle", "circle", "diamond", "triangle"].includes(el.tool);
      if (isShape && (el.w! < 3 && el.h! < 3)) return;
      if (el.points.length < 2 && !isShape) return;

      setElements((prev) => [...prev, el]);
      sendData({ type: "wb-add", element: el });
    },
    [sendData],
  );

  /* ── Zoom with scroll ───────────────────────────────────────────────── */
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor));

      const newPanX = mouseX - ((mouseX - pan.x) / zoom) * newZoom;
      const newPanY = mouseY - ((mouseY - pan.y) / zoom) * newZoom;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    },
    [zoom, pan],
  );

  /* ══════════════════════════════════════════════════════════════════════
     KEYBOARD SHORTCUTS
     ══════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (textInput?.visible) return;

      if (e.key === " ") {
        e.preventDefault();
        spaceHeld.current = true;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const match = TOOLS.find(
          (t) => t.shortcut?.toLowerCase() === e.key.toLowerCase(),
        );
        if (match) setTool(match.id);
        if (e.key === "g" || e.key === "G") setShowGrid((p) => !p);
        if (e.key === "Escape") onClose();
        if ((e.key === "Delete" || e.key === "Backspace") && e.shiftKey) {
          pushUndo();
          setElements([]);
          sendData({ type: "wb-clear" });
        }
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === " ") spaceHeld.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [undo, redo, textInput, onClose, pushUndo, sendData]);

  /* ══════════════════════════════════════════════════════════════════════
     TEXT INPUT CONFIRM
     ══════════════════════════════════════════════════════════════════════ */
  const confirmText = useCallback(() => {
    if (!textInput || !textValue.trim()) {
      setTextInput(null);
      return;
    }
    pushUndo();
    const el: DrawElement = {
      id: uid(),
      tool: "text",
      points: [],
      color,
      strokeWidth,
      opacity,
      fill: "transparent",
      x: textInput.x,
      y: textInput.y,
      text: textValue.trim(),
    };
    setElements((prev) => [...prev, el]);
    sendData({ type: "wb-add", element: el });
    setTextInput(null);
    setTextValue("");
  }, [textInput, textValue, color, strokeWidth, opacity, pushUndo, sendData]);

  /* ══════════════════════════════════════════════════════════════════════
     ZOOM CONTROLS
     ══════════════════════════════════════════════════════════════════════ */
  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, z * 1.25));
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, z / 1.25));
  const zoomFit = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  /* ══════════════════════════════════════════════════════════════════════
     EXPORT
     ══════════════════════════════════════════════════════════════════════ */
  const exportPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `whiteboard_${Date.now()}.png`;
    a.click();
  }, []);

  /* ══════════════════════════════════════════════════════════════════════
     CAMERA DRAG HANDLERS
     ══════════════════════════════════════════════════════════════════════ */
  const onCamDragStart = useCallback(
    (which: "local" | "remote", e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      draggingCam.current = which;
      camDragStart.current = { x: e.clientX, y: e.clientY };
      camPosStart.current =
        which === "local" ? { ...localCamPos } : { ...remoteCamPos };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [localCamPos, remoteCamPos],
  );

  const onCamDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingCam.current) return;
      const dx = e.clientX - camDragStart.current.x;
      const dy = e.clientY - camDragStart.current.y;
      const newPos = {
        x: camPosStart.current.x + dx,
        y: camPosStart.current.y + dy,
      };
      if (draggingCam.current === "local") setLocalCamPos(newPos);
      else setRemoteCamPos(newPos);
    },
    [],
  );

  const onCamDragEnd = useCallback(() => {
    draggingCam.current = null;
  }, []);

  /* ══════════════════════════════════════════════════════════════════════
     CURSOR
     ══════════════════════════════════════════════════════════════════════ */
  const cursor = useMemo(() => {
    if (spaceHeld.current || tool === "pan") return "grab";
    if (tool === "eraser") return "cell";
    if (tool === "text") return "text";
    if (tool === "select") return "default";
    return "crosshair";
  }, [tool]);

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════════ */
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: "#0f0f1a",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        userSelect: "none",
      }}
      className="wb-overlay"
    >
      {/* ── Modern scrollbar styles ───────────────────────────────────── */}
      <style>{`
        .wb-overlay ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .wb-overlay ::-webkit-scrollbar-track {
          background: transparent;
        }
        .wb-overlay ::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.25);
          border-radius: 99px;
          transition: background 0.2s;
        }
        .wb-overlay ::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.5);
        }
        .wb-overlay ::-webkit-scrollbar-corner {
          background: transparent;
        }
        .wb-overlay {
          scrollbar-width: thin;
          scrollbar-color: rgba(99, 102, 241, 0.25) transparent;
        }
      `}</style>

      {/* ── TOP BAR ───────────────────────────────────────────────────── */}
      <div
        style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          background: "rgba(15,15,30,0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          gap: 6,
          zIndex: 1001,
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 12 }}>
          <span style={{ fontSize: 18 }}>🎨</span>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14, letterSpacing: "0.02em" }}>
            Whiteboard
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.08)", margin: "0 4px" }} />

        {/* Tools */}
        <div style={{ display: "flex", gap: 2, overflowX: "auto", flex: 1 }}>
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={`${t.label}${t.shortcut ? ` (${t.shortcut})` : ""}`}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "none",
                background: tool === t.id ? "rgba(99,102,241,0.3)" : "transparent",
                color: tool === t.id ? "#a5b4fc" : "rgba(255,255,255,0.55)",
                fontSize: 15,
                cursor: "pointer",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: 4,
                flexShrink: 0,
                outline: tool === t.id ? "1px solid rgba(99,102,241,0.5)" : "none",
              }}
            >
              <span>{t.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 500 }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.08)", margin: "0 4px" }} />

        {/* Color picker */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => { setShowColorPicker(!showColorPicker); setShowStrokeMenu(false); }}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: "2px solid rgba(255,255,255,0.15)",
              background: color, cursor: "pointer",
              boxShadow: showColorPicker ? "0 0 0 2px rgba(99,102,241,0.5)" : "none",
            }}
            title="Color"
          />
          {showColorPicker && (
            <div
              style={{
                position: "absolute", top: 40, right: 0,
                background: "rgba(20,20,40,0.98)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12, padding: 12,
                display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6,
                zIndex: 1100, boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
              }}
            >
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setShowColorPicker(false); }}
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    border: color === c ? "2px solid #818cf8" : "1px solid rgba(255,255,255,0.1)",
                    background: c, cursor: "pointer", transition: "transform 0.1s",
                  }}
                />
              ))}
              <label
                style={{
                  width: 30, height: 30, borderRadius: 8,
                  border: "1px dashed rgba(255,255,255,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", fontSize: 14, color: "rgba(255,255,255,0.4)",
                }}
                title="Custom color"
              >
                +
                <input
                  type="color" value={color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
                />
              </label>
            </div>
          )}
        </div>

        {/* Stroke width */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => { setShowStrokeMenu(!showStrokeMenu); setShowColorPicker(false); }}
            style={{
              padding: "6px 10px", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              background: showStrokeMenu ? "rgba(99,102,241,0.2)" : "transparent",
              color: "rgba(255,255,255,0.7)", cursor: "pointer",
              fontSize: 12, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 6,
            }}
            title="Stroke width"
          >
            <div style={{ width: 18, height: strokeWidth, background: "currentColor", borderRadius: 99 }} />
            {strokeWidth}px
          </button>
          {showStrokeMenu && (
            <div
              style={{
                position: "absolute", top: 40, right: 0,
                background: "rgba(20,20,40,0.98)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12, padding: 8,
                display: "flex", flexDirection: "column", gap: 4,
                zIndex: 1100, boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
              }}
            >
              {STROKE_WIDTHS.map((w) => (
                <button
                  key={w}
                  onClick={() => { setStrokeWidth(w); setShowStrokeMenu(false); }}
                  style={{
                    padding: "8px 16px", borderRadius: 6, border: "none",
                    background: strokeWidth === w ? "rgba(99,102,241,0.25)" : "transparent",
                    color: "#fff", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 10, fontSize: 12,
                  }}
                >
                  <div style={{ width: 30, height: w, background: "#fff", borderRadius: 99 }} />
                  {w}px
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Fill toggle */}
        <button
          onClick={() => setFillColor((f) => (f === "transparent" ? color : "transparent"))}
          title={fillColor === "transparent" ? "No fill" : "Fill active"}
          style={{
            padding: "6px 10px", borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            background: fillColor !== "transparent" ? "rgba(99,102,241,0.2)" : "transparent",
            color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 12, fontWeight: 600,
          }}
        >
          {fillColor !== "transparent" ? "🎨 Fill" : "◻ No Fill"}
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.08)", margin: "0 4px" }} />

        {/* Undo / Redo */}
        <button
          onClick={undo}
          disabled={undoStack.length === 0}
          title="Undo (Ctrl+Z)"
          style={{ ...btnStyle, opacity: undoStack.length > 0 ? 1 : 0.3 }}
        >
          ↶
        </button>
        <button
          onClick={redo}
          disabled={redoStack.length === 0}
          title="Redo (Ctrl+Y)"
          style={{ ...btnStyle, opacity: redoStack.length > 0 ? 1 : 0.3 }}
        >
          ↷
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.08)", margin: "0 4px" }} />

        {/* Grid toggle */}
        <button
          onClick={() => setShowGrid((g) => !g)}
          title="Toggle grid (G)"
          style={{ ...btnStyle, background: showGrid ? "rgba(99,102,241,0.2)" : "transparent" }}
        >
          ▦
        </button>

        {/* Clear all */}
        <button
          onClick={() => {
            if (confirm("Clear everything?")) {
              pushUndo();
              setElements([]);
              sendData({ type: "wb-clear" });
            }
          }}
          title="Clear all (Shift+Delete)"
          style={{ ...btnStyle, color: "#f87171" }}
        >
          🗑
        </button>

        {/* Export */}
        <button onClick={exportPNG} title="Export PNG" style={btnStyle}>
          📥
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          title="Close whiteboard (Esc)"
          style={{
            ...btnStyle,
            background: "rgba(239,68,68,0.2)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#f87171",
            marginLeft: 4,
          }}
        >
          ✕
        </button>
      </div>

      {/* ── CANVAS AREA ───────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: "relative", overflow: "hidden" }}
        onPointerMove={onCamDragMove}
        onPointerUp={onCamDragEnd}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            cursor,
            touchAction: "none",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
        />

        {/* ── Text input overlay ──────────────────────────────────────── */}
        {textInput?.visible && (
          <div
            style={{
              position: "absolute",
              left: textInput.x * zoom + pan.x,
              top: textInput.y * zoom + pan.y,
              zIndex: 1050,
            }}
          >
            <textarea
              autoFocus
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  confirmText();
                }
                if (e.key === "Escape") setTextInput(null);
              }}
              onBlur={confirmText}
              placeholder="Type here…"
              style={{
                minWidth: 200,
                minHeight: 40,
                padding: "8px 12px",
                fontSize: strokeWidth * 6,
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                background: "rgba(20,20,40,0.95)",
                border: "1px solid rgba(99,102,241,0.4)",
                borderRadius: 8,
                color,
                outline: "none",
                resize: "both",
              }}
            />
          </div>
        )}

        {/* ── Zoom controls (bottom-left) ─────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            display: "flex",
            gap: 4,
            background: "rgba(15,15,30,0.9)",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.08)",
            padding: 4,
            zIndex: 1002,
          }}
        >
          <button onClick={zoomOut} style={zoomBtnStyle} title="Zoom out">−</button>
          <button
            onClick={zoomFit}
            style={{ ...zoomBtnStyle, minWidth: 56, fontSize: 11, fontWeight: 600 }}
            title="Reset zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={zoomIn} style={zoomBtnStyle} title="Zoom in">+</button>
        </div>

        {/* ── Element count (bottom-center) ───────────────────────────── */}
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            color: "rgba(255,255,255,0.3)",
            fontSize: 11,
            fontWeight: 500,
            background: "rgba(15,15,30,0.7)",
            padding: "4px 12px",
            borderRadius: 6,
            zIndex: 1002,
          }}
        >
          {elements.length} elements • Zoom {Math.round(zoom * 100)}%
        </div>

        {/* ── CAMERA PiP: Remote (always visible) ────────────────────── */}
        <div
          onPointerDown={(e) => onCamDragStart("remote", e)}
          style={{
            position: "absolute",
            left: remoteCamPos.x,
            top: remoteCamPos.y,
            width: remoteCamMin ? 50 : 180,
            height: remoteCamMin ? 50 : 135,
            borderRadius: remoteCamMin ? 25 : 14,
            overflow: "hidden",
            border: "2px solid rgba(168,85,247,0.5)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(168,85,247,0.15)",
            zIndex: 1010,
            background: "#111",
            cursor: "move",
            transition: "width 0.3s, height 0.3s, border-radius 0.3s",
          }}
        >
          {activeRemoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            /* Placeholder when no remote stream yet */
            <div
              style={{
                width: "100%", height: "100%",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              }}
            >
              <span style={{ fontSize: remoteCamMin ? 16 : 28, marginBottom: remoteCamMin ? 0 : 6 }}>👤</span>
              {!remoteCamMin && (
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "0 8px" }}>
                  Waiting for the other user
                </span>
              )}
            </div>
          )}
          {!remoteCamMin && (
            <span
              style={{
                position: "absolute", bottom: 6, left: 8,
                fontSize: 10, fontWeight: 600,
                color: "rgba(255,255,255,0.8)",
                background: "rgba(0,0,0,0.55)",
                padding: "2px 8px", borderRadius: 6,
              }}
            >
              👤 Other user
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setRemoteCamMin(!remoteCamMin); }}
            style={{
              position: "absolute", top: 4, right: 4,
              width: 20, height: 20, borderRadius: 10,
              border: "none", background: "rgba(0,0,0,0.5)",
              color: "#fff", fontSize: 10, cursor: "pointer",
              display: remoteCamMin ? "none" : "flex",
              alignItems: "center", justifyContent: "center",
            }}
          >
            −
          </button>
        </div>

        {/* ── CAMERA PiP: Local ───────────────────────────────────────── */}
        {localStream && (
          <div
            onPointerDown={(e) => onCamDragStart("local", e)}
            style={{
              position: "absolute",
              left: localCamPos.x,
              top: localCamPos.y,
              width: localCamMin ? 50 : 180,
              height: localCamMin ? 50 : 135,
              borderRadius: localCamMin ? 25 : 14,
              overflow: "hidden",
              border: "2px solid rgba(99,102,241,0.5)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(99,102,241,0.15)",
              zIndex: 1010,
              background: "#111",
              cursor: "move",
              transition: "width 0.3s, height 0.3s, border-radius 0.3s",
            }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%", height: "100%", objectFit: "cover",
                display: "block", transform: "scaleX(-1)",
              }}
            />
            {!localCamMin && (
              <span
                style={{
                  position: "absolute", bottom: 6, left: 8,
                  fontSize: 10, fontWeight: 600,
                  color: "rgba(255,255,255,0.8)",
                  background: "rgba(0,0,0,0.55)",
                  padding: "2px 8px", borderRadius: 6,
                }}
              >
                📷 You
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setLocalCamMin(!localCamMin); }}
              style={{
                position: "absolute", top: 4, right: 4,
                width: 20, height: 20, borderRadius: 10,
                border: "none", background: "rgba(0,0,0,0.5)",
                color: "#fff", fontSize: 10, cursor: "pointer",
                display: localCamMin ? "none" : "flex",
                alignItems: "center", justifyContent: "center",
              }}
            >
              −
            </button>
          </div>
        )}

        {/* ── Keyboard shortcuts hint (bottom-right) ──────────────────── */}
        <div
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            color: "rgba(255,255,255,0.2)",
            fontSize: 10,
            textAlign: "right",
            lineHeight: 1.6,
            background: "rgba(15,15,30,0.6)",
            padding: "8px 12px",
            borderRadius: 8,
            zIndex: 1002,
          }}
        >
          <b style={{ color: "rgba(255,255,255,0.35)" }}>Shortcuts</b>
          <br />
          Space+Drag: Pan • Scroll: Zoom
          <br />
          Ctrl+Z: Undo • Ctrl+Y: Redo
          <br />
          G: Grid • Esc: Close
        </div>
      </div>
    </div>
  );
};

/* ── Shared button styles ─────────────────────────────────────────────── */
const btnStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "transparent",
  color: "rgba(255,255,255,0.7)",
  cursor: "pointer",
  fontSize: 15,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.15s",
};

const zoomBtnStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "none",
  background: "transparent",
  color: "rgba(255,255,255,0.7)",
  cursor: "pointer",
  fontSize: 16,
  fontWeight: 700,
};

export default WhiteboardOverlay;

