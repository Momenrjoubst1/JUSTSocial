/**
 * LEGENDARY WHITEBOARD - Export Index
 * Central export point for all whiteboard components and utilities
 */

// Main Component
export { LegendaryWhiteboard } from './LegendaryWhiteboard';
export type { LegendaryWhiteboardProps } from './LegendaryWhiteboard';

// Types
export type {
  DrawingTool,
  ShapeType,
  Shape,
  PenStroke,
  TextShape,
  ImageShape,
  LineShape,
  RectangleShape,
  CircleShape,
  ArrowShape,
  ConnectorShape,
  GroupShape,
  Point,
  Bounds,
  StrokeStyle,
  FillStyle,
  ShadowStyle,
  Selection,
  Layer,
  WhiteboardState,
  HistoryAction,
  HistoryState,
  CollaborativeUpdate,
  RemoteUser,
  AIShapeRecognitionResult,
  HandwritingToTextResult,
  AIFormatResult,
  ExportFormat,
  ExportOptions,
  Template,
  ToolConfig,
  PerformanceMetrics,
} from './types';

// Core Engines
// Core Engines
export { DrawingEngine } from './core/engine/DrawingEngine';
export { WhiteboardStateManager } from './core/engine/StateManager';

// Hooks
export {
  useLegendaryWhiteboard,
  useWhiteboardAI,
  useWhiteboardHistory,
  useWhiteboardExport,
  useWhiteboardCollaboration,
  useWhiteboardTools,
} from './hooks/useLegendaryWhiteboard';
