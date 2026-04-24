/**
 * LEGENDARY WHITEBOARD - State Management
 * Manages whiteboard state, undo/redo, and changes
 */

import {
  WhiteboardState,
  Shape,
  Layer,
  Selection,
  HistoryAction,
  HistoryState,
  DrawingTool,
} from '../../types';

export class WhiteboardStateManager {
  private state: WhiteboardState;
  private history: HistoryState = { past: [], future: [] };
  private changes: Set<string> = new Set();
  private listeners: Map<string, Set<(state: WhiteboardState) => void>> = new Map();

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): WhiteboardState {
    return {
      shapes: new Map(),
      layers: [
        {
          id: 'default',
          name: 'Layer 1',
          opacity: 1,
          visible: true,
          locked: false,
          blendMode: 'source-over',
          shapes: [],
        },
      ],
      activeLayerId: 'default',
      currentTool: 'pen',
      selection: null,
      zoom: 1,
      panX: 0,
      panY: 0,
      canvasWidth: 1920,
      canvasHeight: 1080,
      backgroundColor: '#ffffff',
      showGrid: false,
      showRulers: false,
      gridSize: 20,
      snapToGrid: false,
    };
  }

  /**
   * LEGENDARY FEATURE: Intelligent State Management
   * Handles complex state changes with automatic history tracking
   */

  public addShape(shape: Shape): void {
    this.state.shapes.set(shape.id, shape);
    
    // Add to active layer
    const layer = (this.state.layers as Layer[]).find((l: Layer) => l.id === this.state.activeLayerId);
    if (layer && !layer.shapes.includes(shape.id)) {
      layer.shapes.push(shape.id);
    }

    this.changes.add(shape.id);
    this.createHistoryAction('add', [shape.id], { shape });
    this.notifyListeners('state-changed');
  }

  public removeShape(id: string): void {
    const shape = this.state.shapes.get(id);
    if (!shape) return;

    this.state.shapes.delete(id);
    
    // Remove from all layers
    for (const layer of this.state.layers) {
      const index = layer.shapes.indexOf(id);
      if (index > -1) {
        layer.shapes.splice(index, 1);
      }
    }

    this.changes.add(id);
    this.createHistoryAction('delete', [id], { shape });
    this.notifyListeners('state-changed');
  }

  public updateShape(id: string, changes: Partial<Shape>): void {
    const shape = this.state.shapes.get(id);
    if (!shape) return;

    const oldShape = { ...shape };
    Object.assign(shape, changes);

    this.changes.add(id);
    this.createHistoryAction('modify', [id], { oldShape, newShape: shape });
    this.notifyListeners('state-changed');
  }

  public moveShape(id: string, deltaX: number, deltaY: number): void {
    const shape = this.state.shapes.get(id);
    if (!shape) return;

    const oldShape = { ...shape };

    switch (shape.type) {
      case 'text':
      case 'image':
      case 'rectangle':
      case 'circle':
        (shape as any).x += deltaX;
        (shape as any).y += deltaY;
        break;
      case 'line':
      case 'arrow':
        const line = shape as any;
        line.x1 += deltaX;
        line.y1 += deltaY;
        line.x2 += deltaX;
        line.y2 += deltaY;
        break;
    }

    this.changes.add(id);
    this.createHistoryAction('move', [id], { oldShape, newShape: shape });
    this.notifyListeners('state-changed');
  }

  public setTool(tool: DrawingTool): void {
    this.state.currentTool = tool;
    this.notifyListeners('tool-changed');
  }

  public setSelection(selection: Selection | null): void {
    this.state.selection = selection;
    this.notifyListeners('selection-changed');
  }

  public setZoom(zoom: number): void {
    this.state.zoom = Math.max(0.1, Math.min(10, zoom));
    this.notifyListeners('zoom-changed');
  }

  public setPan(x: number, y: number): void {
    this.state.panX = x;
    this.state.panY = y;
    this.notifyListeners('pan-changed');
  }

  public createLayer(name: string): Layer {
    const layer: Layer = {
      id: `layer-${Date.now()}`,
      name,
      opacity: 1,
      visible: true,
      locked: false,
      blendMode: 'source-over',
      shapes: [],
    };

    this.state.layers.push(layer);
    this.notifyListeners('layer-created');
    return layer;
  }

  public deleteLayer(layerId: string): void {
    const index = (this.state.layers as Layer[]).findIndex((l: Layer) => l.id === layerId);
    if (index > -1 && this.state.layers.length > 1) {
      const layer = this.state.layers[index];
      
      // Move shapes to next layer
      const nextLayer = this.state.layers[(index + 1) % this.state.layers.length];
      if (nextLayer) {
        nextLayer.shapes.push(...layer.shapes);
      }

      this.state.layers.splice(index, 1);
      this.notifyListeners('layer-deleted');
    }
  }

  public setActiveLayer(layerId: string): void {
    if ((this.state.layers as Layer[]).some((l: Layer) => l.id === layerId)) {
      this.state.activeLayerId = layerId;
      this.notifyListeners('layer-activated');
    }
  }

  public reorderLayers(layerIds: string[]): void {
    const layerMap = new Map((this.state.layers as Layer[]).map((l: Layer) => [l.id, l]));
    this.state.layers = layerIds
      .map(id => layerMap.get(id))
      .filter((l): l is Layer => l !== undefined);
    
    this.notifyListeners('layers-reordered');
  }

  public undo(): void {
    if (this.history.past.length === 0) return;

    const action = this.history.past.pop();
    if (action) {
      this.applyHistoryAction(action, true);
      this.history.future.push(action);
      this.notifyListeners('state-changed');
    }
  }

  public redo(): void {
    if (this.history.future.length === 0) return;

    const action = this.history.future.pop();
    if (action) {
      this.applyHistoryAction(action, false);
      this.history.past.push(action);
      this.notifyListeners('state-changed');
    }
  }

  private createHistoryAction(
    type: 'add' | 'delete' | 'modify' | 'move' | 'batch',
    shapeIds: string[],
    changes: any
  ): void {
    const action: HistoryAction = {
      id: `action-${Date.now()}`,
      type,
      timestamp: Date.now(),
      shapeIds,
      changes,
    };

    this.history.past.push(action);
    this.history.future = []; // Clear redo stack
  }

  private applyHistoryAction(action: HistoryAction, isUndo: boolean): void {
    // Implement undo/redo logic based on action type
    switch (action.type) {
      case 'add':
        if (isUndo) {
          for (const id of action.shapeIds) {
            this.state.shapes.delete(id);
          }
        } else {
          if (action.changes.shape) {
            const shape = action.changes.shape as Shape;
            this.state.shapes.set(shape.id, shape);
          }
        }
        break;
      case 'delete':
        if (isUndo) {
          if (action.changes.shape) {
            const shape = action.changes.shape as Shape;
            this.state.shapes.set(shape.id, shape);
          }
        } else {
          for (const id of action.shapeIds) {
            this.state.shapes.delete(id);
          }
        }
        break;
      case 'modify':
        if (isUndo) {
          const shape = action.changes.oldShape as Shape;
          this.state.shapes.set(shape.id, shape);
        } else {
          const shape = action.changes.newShape as Shape;
          this.state.shapes.set(shape.id, shape);
        }
        break;
    }
  }

  public subscribe(
    event: string,
    callback: (state: WhiteboardState) => void
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private notifyListeners(event: string): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(this.state));
    }
  }

  public getState(): Readonly<WhiteboardState> {
    return Object.freeze({ ...this.state });
  }

  public getShapes(): Map<string, Shape> {
    return new Map(this.state.shapes);
  }

  public getChangedShapes(): string[] {
    return Array.from(this.changes);
  }

  public clearChanges(): void {
    this.changes.clear();
  }

  public canUndo(): boolean {
    return this.history.past.length > 0;
  }

  public canRedo(): boolean {
    return this.history.future.length > 0;
  }

  public exportToJSON(): string {
    return JSON.stringify({
      shapes: Array.from(this.state.shapes.values()),
      layers: this.state.layers,
      backgroundColor: this.state.backgroundColor,
    });
  }

  public importFromJSON(json: string): void {
    try {
      const data = JSON.parse(json);
      this.state.shapes.clear();
      
      for (const shape of data.shapes) {
        this.state.shapes.set(shape.id, shape);
      }

      this.state.layers = data.layers || this.state.layers;
      this.state.backgroundColor = data.backgroundColor || '#ffffff';
      this.notifyListeners('state-changed');
    } catch (error) {
      console.error('Failed to import JSON:', error);
    }
  }
}
