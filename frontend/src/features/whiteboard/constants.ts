import type { WhiteboardTool } from "./types";

export const WHITEBOARD_COLORS = [
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

export const WHITEBOARD_STROKE_WIDTHS = [1, 2, 3, 5, 8, 12];
export const WHITEBOARD_MIN_ZOOM = 0.1;
export const WHITEBOARD_MAX_ZOOM = 10;
export const WHITEBOARD_GRID_SIZE = 30;
export const WHITEBOARD_LASER_LIFETIME = 1500;

export const WHITEBOARD_TOOLS: { id: WhiteboardTool; icon: string; label: string; shortcut?: string }[] = [
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

let whiteboardIdCounter = 0;
export const createWhiteboardId = () => `el_${Date.now()}_${++whiteboardIdCounter}`;
