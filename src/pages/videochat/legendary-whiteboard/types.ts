/**
 * LEGENDARY WHITEBOARD - Type Definitions
 * Advanced type system for next-generation collaborative whiteboard
 */

// ==================== DRAWING TYPES ====================
export type DrawingTool = 
  | 'pen' 
  | 'marker' 
  | 'eraser' 
  | 'line' 
  | 'arrow' 
  | 'rectangle' 
  | 'circle' 
  | 'ellipse' 
  | 'polygon' 
  | 'bezier' 
  | 'freeform' 
  | 'text' 
  | 'image' 
  | 'selection' 
  | 'lasso' 
  | 'magic-wand' 
  | 'pointer' 
  | 'connector' 
  | 'dimension' 
  | 'shape-ai';

export type ShapeType = 
  | 'pen-stroke' 
  | 'line' 
  | 'arrow' 
  | 'rectangle' 
  | 'circle' 
  | 'ellipse' 
  | 'polygon' 
  | 'bezier' 
  | 'text' 
  | 'image' 
  | 'group' 
  | 'connector' 
  | 'ai-shape';

// ==================== STROKE & BRUSH ====================
export interface StrokeStyle {
  width: number;
  color: string;
  opacity: number;
  dashArray?: number[];
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
  blur?: number;
  pattern?: 'solid' | 'dashed' | 'dotted' | 'gradient';
  gradientType?: 'linear' | 'radial' | 'conic';
  gradientStops?: { offset: number; color: string }[];
}

export interface FillStyle {
  enabled: boolean;
  color?: string;
  opacity?: number;
  pattern?: 'solid' | 'gradient' | 'texture' | 'procedural';
  gradientType?: 'linear' | 'radial' | 'conic';
  gradientStops?: { offset: number; color: string }[];
  textureId?: string;
}

export interface ShadowStyle {
  enabled: boolean;
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
  opacity: number;
}

// ==================== SHAPES ====================
export interface BaseShape {
  id: string;
  type: ShapeType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  rotation: number;
  zIndex: number;
  layer?: string;
  metadata?: { [key: string]: unknown };
  createdBy?: string;
  createdAt?: number;
  modifiedAt?: number;
  transformations?: Transform[];
}

export interface PenStroke extends BaseShape {
  type: 'pen-stroke';
  points: Point[];
  stroke: StrokeStyle;
  pressure?: number[];
  timestamp?: number[];
}

export interface TextShape extends BaseShape {
  type: 'text';
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold' | 'italic';
  textAlign: CanvasTextAlign;
  stroke: StrokeStyle;
  fill: FillStyle;
}

export interface ImageShape extends BaseShape {
  type: 'image';
  imageUrl: string;
  imageData?: ImageData;
  x: number;
  y: number;
  width: number;
  height: number;
  crop?: { x: number; y: number; width: number; height: number };
  filters?: ImageFilter[];
}

export interface LineShape extends BaseShape {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: StrokeStyle;
  startMarker?: MarkerType;
  endMarker?: MarkerType;
}

export interface RectangleShape extends BaseShape {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius?: number;
  stroke: StrokeStyle;
  fill: FillStyle;
  shadow?: ShadowStyle;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
  x: number;
  y: number;
  radius: number;
  stroke: StrokeStyle;
  fill: FillStyle;
  shadow?: ShadowStyle;
}

export interface ArrowShape extends BaseShape {
  type: 'arrow';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: StrokeStyle;
  headLength: number;
  headWidth: number;
  style: 'solid' | 'hollow' | 'double' | 'circle';
}

export interface ConnectorShape extends BaseShape {
  type: 'connector';
  startNodeId: string;
  endNodeId: string;
  startPoint?: string; // 'top', 'bottom', 'left', 'right', 'center'
  endPoint?: string;
  path: Point[];
  stroke: StrokeStyle;
  routing: 'direct' | 'orthogonal' | 'curved' | 'avoid-nodes';
  label?: string;
}

export interface GroupShape extends BaseShape {
  type: 'group';
  children: string[]; // shape IDs
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Shape = 
  | PenStroke 
  | TextShape 
  | ImageShape 
  | LineShape 
  | RectangleShape 
  | CircleShape 
  | ArrowShape 
  | ConnectorShape 
  | GroupShape;

// ==================== GEOMETRY ====================
export interface Point {
  x: number;
  y: number;
  pressure?: number;
  timestamp?: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Transform {
  type: 'translate' | 'rotate' | 'scale' | 'skew';
  values: number[];
  timestamp?: number;
}

// ==================== SELECTION ====================
export interface Selection {
  shapeIds: string[];
  bounds?: Bounds;
  isMultiple: boolean;
  isDragging?: boolean;
  dragOffset?: Point;
}

// ==================== IMAGE FILTERS ====================
export type ImageFilterType = 
  | 'brightness' 
  | 'contrast' 
  | 'saturation' 
  | 'hue' 
  | 'blur' 
  | 'sharpen' 
  | 'invert' 
  | 'grayscale' 
  | 'sepia' 
  | 'thumbnail';

export interface ImageFilter {
  type: ImageFilterType;
  value: number;
  enabled: boolean;
}

// ==================== MARKERS ====================
export type MarkerType = 
  | 'arrow' 
  | 'circle' 
  | 'square' 
  | 'diamond' 
  | 'cross' 
  | 'none';

// ==================== LAYERS ====================
export interface Layer {
  id: string;
  name: string;
  opacity: number;
  visible: boolean;
  locked: boolean;
  blendMode: string;
  shapes: string[]; // shape IDs
  thumbnail?: string;
  isGroup?: boolean;
  children?: Layer[];
}

// ==================== CANVAS STATE ====================
export interface WhiteboardState {
  shapes: Map<string, Shape>;
  layers: Layer[];
  activeLayerId: string;
  currentTool: DrawingTool;
  selection: Selection | null;
  zoom: number;
  panX: number;
  panY: number;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  showGrid: boolean;
  showRulers: boolean;
  gridSize: number;
  snapToGrid: boolean;
}

// ==================== UNDO/REDO ====================
export interface HistoryAction {
  id: string;
  type: 'add' | 'delete' | 'modify' | 'move' | 'batch';
  timestamp: number;
  shapeIds: string[];
  changes: { [key: string]: unknown };
  inverse?: HistoryAction;
}

export interface HistoryState {
  past: HistoryAction[];
  future: HistoryAction[];
}

// ==================== COLLABORATION ====================
export interface CollaborativeUpdate {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  action: 'draw' | 'delete' | 'modify' | 'select' | 'pan' | 'zoom';
  shapeIds: string[];
  data: { [key: string]: unknown };
  timestamp: number;
}

export interface RemoteUser {
  id: string;
  name: string;
  color: string;
  cursor?: Point;
  selection?: Selection;
  lastUpdate?: number;
}

// ==================== AI FEATURES ====================
export interface AIShapeRecognitionResult {
  shapeType: string;
  confidence: number;
  properties: { [key: string]: unknown };
  suggestedFix?: ShapeType;
}

export interface HandwritingToTextResult {
  text: string;
  confidence: number;
  bounds: Bounds;
}

export interface AIFormatResult {
  isDiagram: boolean;
  isFlowchart: boolean;
  suggestedLayout: string;
  improvements: string[];
}

// ==================== EXPORT ====================
export type ExportFormat = 
  | 'png' 
  | 'jpeg' 
  | 'svg' 
  | 'pdf' 
  | 'webp' 
  | 'json' 
  | 'html' 
  | 'video';

export interface ExportOptions {
  format: ExportFormat;
  quality: number;
  includeBackground: boolean;
  width?: number;
  height?: number;
  scale?: number;
}

// ==================== TEMPLATES ====================
export interface Template {
  id: string;
  name: string;
  description: string;
  preview?: string;
  category: string;
  shapes: Shape[];
  layers: Layer[];
  tags: string[];
}

// ==================== TOOLS CONFIGURATION ====================
export interface ToolConfig {
  tool: DrawingTool;
  strokeStyle?: StrokeStyle;
  fillStyle?: FillStyle;
  shadowStyle?: ShadowStyle;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
}

// ==================== EVENTS ====================
export interface WhiteboardEventMap {
  'shape:add': Shape;
  'shape:delete': { id: string };
  'shape:modify': { id: string; changes: Partial<Shape> };
  'shape:select': Selection;
  'tool:change': DrawingTool;
  'zoom:change': number;
  'pan:change': { x: number; y: number };
  'layer:create': Layer;
  'layer:delete': { id: string };
  'layer:reorder': { layers: Layer[] };
  'undo': HistoryAction;
  'redo': HistoryAction;
  'export': ExportOptions;
  'ai:process': AIShapeRecognitionResult;
}

// ==================== PERFORMANCE ====================
export interface PerformanceMetrics {
  fps: number;
  drawTime: number;
  updateTime: number;
  renderTime: number;
  memoryUsage: number;
  shapeCount: number;
}
