/**
 * LEGENDARY WHITEBOARD - Core Drawing Engine
 * High-performance rendering and Shape management
 */

import {
  Shape,
  Point,
  PenStroke,
  TextShape,
  ImageShape,
  LineShape,
  RectangleShape,
  CircleShape,
  ArrowShape,
  StrokeStyle,
  FillStyle,
} from '../../types';

export class DrawingEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: OffscreenCanvas;
  private offscreenCtx: OffscreenCanvasRenderingContext2D;
  private shapes: Map<string, Shape> = new Map();
  private layerCache: Map<string, ImageData> = new Map();
  private pixelRatio: number = window.devicePixelRatio || 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { 
      willReadFrequently: true,
      alpha: true,
    });
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;

    // Offscreen canvas for smooth rendering
    this.offscreenCanvas = new OffscreenCanvas(canvas.width, canvas.height);
    const offscreenCtx = this.offscreenCanvas.getContext('2d');
    if (!offscreenCtx) throw new Error('Failed to get offscreen context');
    this.offscreenCtx = offscreenCtx;

    this.setupContext();
  }

  private setupContext(): void {
    // Enable high-quality rendering
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.offscreenCtx.imageSmoothingEnabled = true;
    this.offscreenCtx.imageSmoothingQuality = 'high';
  }

  /**
   * LEGENDARY FEATURE: Smart Shape Rendering
   * Renders any shape with optimal performance and quality
   */
  public renderShape(shape: Shape, context: CanvasRenderingContext2D = this.ctx): void {
    context.save();

    // Apply opacity and rotation
    context.globalAlpha = shape.opacity;
    
    if (shape.rotation !== 0) {
      const center = this.getShapeCenter(shape);
      context.translate(center.x, center.y);
      context.rotate((shape.rotation * Math.PI) / 180);
      context.translate(-center.x, -center.y);
    }

    switch (shape.type) {
      case 'pen-stroke':
        this.renderPenStroke(shape as PenStroke, context);
        break;
      case 'text':
        this.renderText(shape as TextShape, context);
        break;
      case 'image':
        this.renderImage(shape as ImageShape, context);
        break;
      case 'line':
        this.renderLine(shape as LineShape, context);
        break;
      case 'arrow':
        this.renderArrow(shape as ArrowShape, context);
        break;
      case 'rectangle':
        this.renderRectangle(shape as RectangleShape, context);
        break;
      case 'circle':
        this.renderCircle(shape as CircleShape, context);
        break;
    }

    context.restore();
  }

  private renderPenStroke(stroke: PenStroke, context: CanvasRenderingContext2D): void {
    if (stroke.points.length === 0) return;

    const style = stroke.stroke;
    this.applyStrokeStyle(context, style);

    // Use Path2D for better performance
    const path = new Path2D();
    const points = stroke.points;

    if (points.length === 1) {
      // Single point - draw a dot
      context.beginPath();
      context.arc(points[0].x, points[0].y, style.width / 2, 0, Math.PI * 2);
      context.fill();
      return;
    }

    // Use Catmull-Rom spline for smooth curves
    path.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      const xc = (points[i].x + points[i - 1].x) / 2;
      const yc = (points[i].y + points[i - 1].y) / 2;
      path.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
    }

    context.stroke(path);
  }

  private renderText(text: TextShape, context: CanvasRenderingContext2D): void {
    context.save();

    context.font = `${text.fontWeight} ${text.fontSize}px ${text.fontFamily}`;
    context.textAlign = text.textAlign;
    context.textBaseline = 'top';

    this.applyStrokeStyle(context, text.stroke);

    if (text.fill.enabled) {
      context.fillStyle = text.fill.color || '#000000';
      context.globalAlpha = text.fill.opacity ?? 1;
      context.fillText(text.text, text.x, text.y, text.width);
    }

    if (text.stroke.width > 0) {
      context.strokeStyle = text.stroke.color;
      context.lineWidth = text.stroke.width;
      context.strokeText(text.text, text.x, text.y, text.width);
    }

    context.restore();
  }

  private renderImage(image: ImageShape, context: CanvasRenderingContext2D): void {
    if (!image.imageUrl && !image.imageData) return;

    const img = new Image();
    img.onload = () => {
      context.save();

      if (image.crop) {
        context.drawImage(
          img,
          image.crop.x,
          image.crop.y,
          image.crop.width,
          image.crop.height,
          image.x,
          image.y,
          image.width,
          image.height
        );
      } else {
        context.drawImage(img, image.x, image.y, image.width, image.height);
      }

      // Apply filters
      if (image.filters) {
        this.applyImageFilters(context, image.filters);
      }

      context.restore();
    };
    img.src = image.imageUrl || '';
  }

  private renderLine(line: LineShape, context: CanvasRenderingContext2D): void {
    context.save();
    this.applyStrokeStyle(context, line.stroke);

    const path = new Path2D();
    path.moveTo(line.x1, line.y1);
    path.lineTo(line.x2, line.y2);
    context.stroke(path);

    // Draw markers (arrows, circles, etc.)
    if (line.startMarker && line.startMarker !== 'none') {
      this.drawMarker(context, line.x1, line.y1, line.x2, line.y2, line.startMarker, true);
    }
    if (line.endMarker && line.endMarker !== 'none') {
      this.drawMarker(context, line.x2, line.y2, line.x1, line.y1, line.endMarker, false);
    }

    context.restore();
  }

  private renderArrow(arrow: ArrowShape, context: CanvasRenderingContext2D): void {
    context.save();
    this.applyStrokeStyle(context, arrow.stroke);

    const path = new Path2D();
    path.moveTo(arrow.x1, arrow.y1);
    path.lineTo(arrow.x2, arrow.y2);
    context.stroke(path);

    // Draw arrow head
    const angle = Math.atan2(arrow.y2 - arrow.y1, arrow.x2 - arrow.x1);
    context.translate(arrow.x2, arrow.y2);
    context.rotate(angle);
    
    const headLength = arrow.headLength || 20;
    const headWidth = arrow.headWidth || 15;

    if (arrow.style === 'solid') {
      context.fillStyle = arrow.stroke.color;
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(-headLength, -headWidth / 2);
      context.lineTo(-headLength, headWidth / 2);
      context.closePath();
      context.fill();
    } else if (arrow.style === 'hollow') {
      context.strokeStyle = arrow.stroke.color;
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(-headLength, -headWidth / 2);
      context.lineTo(-headLength, headWidth / 2);
      context.closePath();
      context.stroke();
    }

    context.restore();
  }

  private renderRectangle(rect: RectangleShape, context: CanvasRenderingContext2D): void {
    context.save();

    const cornerRadius = rect.cornerRadius || 0;

    // Draw rectangle path with rounded corners
    const path = new Path2D();
    this.roundRect(path, rect.x, rect.y, rect.width, rect.height, cornerRadius);

    // Fill
    if (rect.fill.enabled) {
      this.applyFillStyle(context, rect.fill);
      context.fill(path);
    }

    // Stroke
    if (rect.stroke.width > 0) {
      this.applyStrokeStyle(context, rect.stroke);
      context.stroke(path);
    }

    context.restore();
  }

  private renderCircle(circle: CircleShape, context: CanvasRenderingContext2D): void {
    context.save();

    const path = new Path2D();
    path.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);

    // Fill
    if (circle.fill.enabled) {
      this.applyFillStyle(context, circle.fill);
      context.fill(path);
    }

    // Stroke
    if (circle.stroke.width > 0) {
      this.applyStrokeStyle(context, circle.stroke);
      context.stroke(path);
    }

    context.restore();
  }

  private applyStrokeStyle(context: CanvasRenderingContext2D, style: StrokeStyle): void {
    context.strokeStyle = style.color;
    context.lineWidth = style.width;
    context.globalAlpha = style.opacity ?? 1;
    context.lineCap = style.lineCap ?? 'round';
    context.lineJoin = style.lineJoin ?? 'round';

    if (style.dashArray) {
      context.setLineDash(style.dashArray);
    }
  }

  private applyFillStyle(context: CanvasRenderingContext2D, style: FillStyle): void {
    if (style.pattern === 'gradient' && style.gradientStops && style.gradientStops.length > 0) {
      // For now, use solid color - gradient implementation would be more complex
      context.fillStyle = style.color || '#000000';
    } else {
      context.fillStyle = style.color || '#000000';
    }
    context.globalAlpha = style.opacity ?? 1;
  }

  private roundRect(
    path: Path2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    radius = Math.min(radius, width / 2, height / 2);
    path.moveTo(x + radius, y);
    path.lineTo(x + width - radius, y);
    path.arcTo(x + width, y, x + width, y + radius, radius);
    path.lineTo(x + width, y + height - radius);
    path.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    path.lineTo(x + radius, y + height);
    path.arcTo(x, y + height, x, y + height - radius, radius);
    path.lineTo(x, y + radius);
    path.arcTo(x, y, x + radius, y, radius);
  }

  private drawMarker(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    fromX: number,
    fromY: number,
    markerType: string,
    isStart: boolean
  ): void {
    const angle = Math.atan2(y - fromY, x - fromX);
    const distance = 15;

    const markerX = x + (isStart ? -distance : distance) * Math.cos(angle);
    const markerY = y + (isStart ? -distance : distance) * Math.sin(angle);

    context.save();
    context.translate(markerX, markerY);
    context.rotate(angle + (isStart ? Math.PI : 0));

    if (markerType === 'arrow') {
      context.fillStyle = context.strokeStyle;
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(-8, -6);
      context.lineTo(-8, 6);
      context.closePath();
      context.fill();
    } else if (markerType === 'circle') {
      context.beginPath();
      context.arc(0, 0, 5, 0, Math.PI * 2);
      context.fill();
    }

    context.restore();
  }

  private applyImageFilters(context: CanvasRenderingContext2D, filters: any[]): void {
    let filterString = '';
    for (const filter of filters) {
      if (!filter.enabled) continue;
      
      switch (filter.type) {
        case 'brightness':
          filterString += `brightness(${filter.value}%) `;
          break;
        case 'contrast':
          filterString += `contrast(${filter.value}%) `;
          break;
        case 'saturation':
          filterString += `saturate(${filter.value}%) `;
          break;
        case 'blur':
          filterString += `blur(${filter.value}px) `;
          break;
        case 'grayscale':
          filterString += `grayscale(${filter.value}%) `;
          break;
      }
    }
    if (filterString) {
      context.filter = filterString;
    }
  }

  private getShapeCenter(shape: Shape): Point {
    switch (shape.type) {
      case 'rectangle':
        const rect = shape as RectangleShape;
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      case 'circle':
        const circle = shape as CircleShape;
        return { x: circle.x, y: circle.y };
      case 'text':
        const text = shape as TextShape;
        return { x: text.x + text.width / 2, y: text.y + text.height / 2 };
      default:
        return { x: 0, y: 0 };
    }
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvas.width = width * this.pixelRatio;
    this.canvas.height = height * this.pixelRatio;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(this.pixelRatio, this.pixelRatio);

    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;
  }

  public clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public addShape(shape: Shape): void {
    this.shapes.set(shape.id, shape);
  }

  public removeShape(id: string): void {
    this.shapes.delete(id);
  }

  public getShape(id: string): Shape | undefined {
    return this.shapes.get(id);
  }

  public getAllShapes(): Shape[] {
    return Array.from(this.shapes.values());
  }

  public dispose(): void {
    this.shapes.clear();
    this.layerCache.clear();
  }
}
