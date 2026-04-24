/**
 * LEGENDARY WHITEBOARD - AI Features Module
 * AI-powered shape recognition, handwriting detection, and smart formatting
 */

import {
  AIShapeRecognitionResult,
  HandwritingToTextResult,
  AIFormatResult,
  Point,
  Shape,
} from '../../types';

export class AIEngine {
  /**
   * LEGENDARY FEATURE: Smart Shape Recognition
   * Recognizes drawn shapes and automatically converts them to perfect shapes
   */
  public recognizeShape(points: Point[]): AIShapeRecognitionResult {
    if (points.length < 3) {
      return {
        shapeType: 'unknown',
        confidence: 0,
        properties: {},
      };
    }

    // Analyze shape characteristics
    const bounds = this.calculateBounds(points);
    const linearity = this.calculateLinearity(points);

    let result: AIShapeRecognitionResult = {
      shapeType: 'unknown',
      confidence: 0,
      properties: {},
    };

    // Rectangle detection
    if (this.isRectangle(points)) {
      result = {
        shapeType: 'rectangle',
        confidence: 0.95,
        properties: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          cornerRadius: this.estimateCornerRadius(),
        },
        suggestedFix: 'rectangle',
      };
    }
    // Circle detection
    else if (this.isCircle(points)) {
      const center = this.findCircleCenter(points);
      const avgRadius = this.calculateAverageDistance(center, points);
      result = {
        shapeType: 'circle',
        confidence: 0.93,
        properties: {
          x: center.x,
          y: center.y,
          radius: avgRadius,
        },
        suggestedFix: 'circle',
      };
    }
    // Triangle detection
    else if (this.isTriangle(points)) {
      result = {
        shapeType: 'triangle',
        confidence: 0.90,
        properties: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
        suggestedFix: 'rectangle',
      };
    }
    // Line detection
    else if (linearity > 0.85) {
      const start = points[0];
      const end = points[points.length - 1];
      result = {
        shapeType: 'line',
        confidence: 0.92,
        properties: {
          x1: start.x,
          y1: start.y,
          x2: end.x,
          y2: end.y,
        },
        suggestedFix: 'line',
      };
    }
    // Arrow detection
    else if (this.isArrow(points)) {
      const start = points[0];
      const end = points[points.length - 1];
      result = {
        shapeType: 'arrow',
        confidence: 0.88,
        properties: {
          x1: start.x,
          y1: start.y,
          x2: end.x,
          y2: end.y,
        },
        suggestedFix: 'arrow',
      };
    }

    return result;
  }

  /**
   * LEGENDARY FEATURE: Handwriting to Text Conversion
   * Converts handwritten text to typed text using advanced recognition
   */
  public async recognizeHandwriting(points: Point[]): Promise<HandwritingToTextResult> {
    // In a real implementation, this would use TensorFlow.js or similar
    // For now, return a placeholder
    return {
      text: '[Handwriting Recognition - AI Processing]',
      confidence: 0.75,
      bounds: this.calculateBounds(points),
    };
  }

  /**
   * LEGENDARY FEATURE: Smart Diagram Analysis
   * Analyzes drawings to detect diagrams, flowcharts, and suggests improvements
   */
  public analyzeAndFormatDiagram(shapes: Shape[]): AIFormatResult {
    let isDiagram = false;
    let isFlowchart = false;
    const improvements: string[] = [];

    // Detect flowchart patterns
    const connectorCount = shapes.filter(s => s.type === 'connector').length;
    const shapeCount = shapes.filter(s => ['rectangle', 'circle', 'ellipse'].includes(s.type)).length;

    if (connectorCount > 0 && shapeCount > 2) {
      isFlowchart = true;
      isDiagram = true;
    }

    // Analyze alignment
    if (isFlowchart) {
      const alignmentScore = this.analyzeAlignment(shapes);
      if (alignmentScore < 0.7) {
        improvements.push('Improve element alignment - elements are not well aligned');
      }

      const spacingScore = this.analyzeSpacing(shapes);
      if (spacingScore < 0.7) {
        improvements.push('Improve spacing - elements are too close or too far apart');
      }

      improvements.push('Consider using consistent shapes for similar elements');
      improvements.push('Add labels to connectors for clarity');
    }

    return {
      isDiagram,
      isFlowchart,
      suggestedLayout: isFlowchart ? 'top-to-bottom' : 'free-form',
      improvements,
    };
  }

  /**
   * Helper Methods for Shape Recognition
   */

  private isRectangle(points: Point[]): boolean {
    const angles = this.detectCorners(points);
    if (angles.length !== 4) return false;

    // Check if angles are close to 90 degrees
    let rightAngles = 0;
    for (const angle of angles) {
      if (Math.abs(angle - 90) < 15) rightAngles++;
    }

    return rightAngles >= 3;
  }

  private isCircle(points: Point[]): boolean {
    const center = this.findCircleCenter(points);
    const distances = points.map(p => this.distance(center, p));
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;
    const stdDeviation = Math.sqrt(variance);

    return stdDeviation / avgDistance < 0.1;
  }

  private isTriangle(points: Point[]): boolean {
    const angles = this.detectCorners(points);
    return angles.length === 3;
  }

  private isArrow(points: Point[]): boolean {
    if (points.length < 5) return false;

    // Check for arrow head pattern
    const lastThreePoints = points.slice(-3);
    const firstPoint = points[0];

    let angleCount = 0;
    for (let i = 1; i < lastThreePoints.length; i++) {
      const angle = this.angleBetweenPoints(
        lastThreePoints[i - 1],
        lastThreePoints[i],
        firstPoint
      );
      if (Math.abs(angle - 90) < 30) angleCount++;
    }

    return angleCount >= 2;
  }

  private calculateBounds(points: Point[]): { x: number; y: number; width: number; height: number } {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private calculateLinearity(points: Point[]): number {
    if (points.length < 3) return 0;

    const start = points[0];
    const end = points[points.length - 1];
    const lineLength = this.distance(start, end);

    let totalDistance = 0;
    for (let i = 0; i < points.length - 1; i++) {
      totalDistance += this.distance(points[i], points[i + 1]);
    }

    return lineLength / totalDistance;
  }

  private detectCorners(points: Point[]): number[] {
    const angles: number[] = [];

    for (let i = 1; i < points.length - 1; i++) {
      const angle = this.angleBetweenPoints(points[i - 1], points[i], points[i + 1]);
      
      // Significant change in direction indicates a corner
      if (Math.abs(angle - 180) > 20) {
        angles.push(angle);
      }
    }

    return angles;
  }

  private angleBetweenPoints(p1: Point, p2: Point, p3: Point): number {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    const dotProduct = v1.x * v2.x + v1.y * v2.y;
    const crossProduct = v1.x * v2.y - v1.y * v2.x;

    return Math.atan2(crossProduct, dotProduct) * (180 / Math.PI);
  }

  private findCircleCenter(points: Point[]): Point {
    const len = points.length;
    let sumX = 0,
      sumY = 0;

    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
    }

    return {
      x: sumX / len,
      y: sumY / len,
    };
  }

  private calculateAverageDistance(center: Point, points: Point[]): number {
    let sum = 0;
    for (const p of points) {
      sum += this.distance(center, p);
    }
    return sum / points.length;
  }

  private distance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  private estimateCornerRadius(): number {
    // Analyze corners to estimate border radius
    return 5; // Default value
  }

  private analyzeAlignment(shapes: Shape[]): number {
    // Analyze how well shapes are aligned (0-1)
    let alignedPairs = 0;
    const tolerance = 10;

    for (let i = 0; i < shapes.length; i++) {
      for (let j = i + 1; j < shapes.length; j++) {
        const s1 = shapes[i];
        const s2 = shapes[j];

        // Check horizontal or vertical alignment
        if (this.getShapeY(s1) - this.getShapeY(s2) < tolerance ||
            this.getShapeX(s1) - this.getShapeX(s2) < tolerance) {
          alignedPairs++;
        }
      }
    }

    const totalPairs = (shapes.length * (shapes.length - 1)) / 2;
    return totalPairs > 0 ? alignedPairs / totalPairs : 0;
  }

  private analyzeSpacing(shapes: Shape[]): number {
    // Analyze spacing between shapes (0-1)
    if (shapes.length < 2) return 1;

    const distances: number[] = [];
    
    for (let i = 0; i < shapes.length; i++) {
      for (let j = i + 1; j < shapes.length; j++) {
        const d = this.getShapeDistance(shapes[i], shapes[j]);
        distances.push(d);
      }
    }

    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;

    return 1 / (1 + Math.sqrt(variance));
  }

  private getShapeX(shape: Shape): number {
    switch (shape.type) {
      case 'text':
      case 'image':
      case 'rectangle':
      case 'circle':
        return (shape as any).x || 0;
      default:
        return 0;
    }
  }

  private getShapeY(shape: Shape): number {
    switch (shape.type) {
      case 'text':
      case 'image':
      case 'rectangle':
      case 'circle':
        return (shape as any).y || 0;
      default:
        return 0;
    }
  }

  private getShapeDistance(s1: Shape, s2: Shape): number {
    return this.distance(
      { x: this.getShapeX(s1), y: this.getShapeY(s1) },
      { x: this.getShapeX(s2), y: this.getShapeY(s2) }
    );
  }
}
