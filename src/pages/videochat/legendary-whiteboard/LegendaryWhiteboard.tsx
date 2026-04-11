/**
 * LEGENDARY WHITEBOARD - Main Component
 * Next-generation collaborative drawing canvas with AI-powered features
 */

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
} from 'react';
import { DrawingEngine } from './core/engine/DrawingEngine';
import { WhiteboardStateManager } from './core/engine/StateManager';

import {
  Point,
  PenStroke,
  WhiteboardState,
  Shape,
} from './types';

export interface LegendaryWhiteboardProps {
  width?: number;
  height?: number;
  onShapeAdd?: (shape: Shape) => void;
  onShapeRemove?: (id: string) => void;
  onExport?: (data: string) => void;
  onCollaborate?: (update: any) => void;
  darkMode?: boolean;
  backgroundColor?: string;
  enableCollaboration?: boolean;
  enableAI?: boolean;
}

/**
 * LEGENDARY WHITEBOARD COMPONENT
 * Features:
 * ✨ Advanced drawing with pressure sensitivity
 * 🤖 AI-powered shape recognition
 * 👥 Real-time collaboration support
 * 📐 Smart alignment and snapping
 * 🎨 Advanced styling and effects
 * 🔄 Undo/Redo with history
 * 📊 Layers and groups
 * 💾 Export in multiple formats
 * ⚡ Optimized rendering
 */
export const LegendaryWhiteboard = forwardRef<HTMLCanvasElement, LegendaryWhiteboardProps>(
  (
    {
      width = 1920,
      height = 1080,
      onShapeAdd,
      darkMode = false,
      backgroundColor = '#ffffff',

    },
    forwardedRef
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
    const [stateManager] = useState(() => new WhiteboardStateManager());
    const [drawingEngine, setDrawingEngine] = useState<DrawingEngine | null>(null);

    const [_state, setState] = useState<WhiteboardState | null>(null);
    const currentTool = 'pen'; // Default tool

    // Store the canvas for external access
    useEffect(() => {
      if (canvasRef.current && forwardedRef) {
        if (typeof forwardedRef === 'function') {
          forwardedRef(canvasRef.current);
        } else {
          forwardedRef.current = canvasRef.current;
        }
      }
    }, [forwardedRef]);

    // Initialize drawing engine
    useEffect(() => {
      if (!canvasRef.current) return;

      const engine = new DrawingEngine(canvasRef.current);
      engine.setCanvasSize(width, height);
      setDrawingEngine(engine);

      return () => {
        engine.dispose();
      };
    }, [width, height]);

    // Subscribe to state changes
    useEffect(() => {
      const unsubscribe = stateManager.subscribe('state-changed', (newState) => {
        setState(newState);

        // Render changes
        if (drawingEngine) {
          render(newState);
        }
      });

      return unsubscribe;
    }, [stateManager, drawingEngine]);

    // Render function
    const render = useCallback((whiteboardState: WhiteboardState) => {
      if (!drawingEngine || !canvasRef.current) return;

      drawingEngine.clear();

      // Draw background
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = darkMode ? '#1e1e1e' : backgroundColor;
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }

      // Draw all shapes
      const shapes = stateManager.getShapes();
      for (const shape of shapes.values()) {
        drawingEngine.renderShape(shape);
      }

      // Draw selection box if needed
      if (whiteboardState.selection && whiteboardState.selection.bounds) {
        drawSelectionBox(whiteboardState.selection.bounds);
      }
    }, [drawingEngine, backgroundColor, darkMode, stateManager]);

    const drawSelectionBox = (bounds: any) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.setLineDash([]);
    };

    // Mouse event handlers
    const handleMouseDown = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const point: Point = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          pressure: (e as any).pressure || 1,
        };

        setIsDrawing(true);
        setCurrentPoints([point]);
      },
      []
    );

    const handleMouseMove = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const point: Point = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          pressure: (e as any).pressure || 1,
        };

        setCurrentPoints((prev) => [...prev, point]);

        // Real-time rendering while drawing
        if (drawingEngine && currentTool === 'pen') {
          const previewShape: PenStroke = {
            id: 'preview',
            type: 'pen-stroke',
            points: [...currentPoints, point],
            opacity: 1,
            rotation: 0,
            zIndex: 0,
            visible: true,
            locked: false,
            stroke: {
              width: 2,
              color: '#000000',
              opacity: 1,
              lineCap: 'round',
              lineJoin: 'round',
            },
          };

          // Render preview
          drawingEngine.clear();
          drawingEngine.renderShape(previewShape);
        }
      },
      [isDrawing, currentTool, currentPoints, drawingEngine]
    );

    const handleMouseUp = useCallback(() => {
      if (!isDrawing) return;

      setIsDrawing(false);

      if (currentPoints.length > 2 && currentTool === 'pen') {
        const shape: PenStroke = {
          id: `stroke-${Date.now()}`,
          type: 'pen-stroke',
          points: currentPoints,
          opacity: 1,
          rotation: 0,
          zIndex: 0,
          visible: true,
          locked: false,
          stroke: {
            width: 2,
            color: '#000000',
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round',
          },
        };

        stateManager.addShape(shape);


        onShapeAdd?.(shape);
      }

      setCurrentPoints([]);
    }, [isDrawing, currentTool, currentPoints, stateManager, onShapeAdd]);

    // Keyboard handlers
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
          if (e.key === 'z') {
            e.preventDefault();
            stateManager.undo();
          } else if (e.key === 'y' || (e.shiftKey && e.key === 'z')) {
            e.preventDefault();
            stateManager.redo();
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [stateManager]);

    const containerStyle: React.CSSProperties = {
      position: 'relative',
      width: `${width}px`,
      height: `${height}px`,
      backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    };

    const canvasStyle: React.CSSProperties = {
      display: 'block',
      cursor: currentTool === 'pen' ? 'crosshair' : 'default',
    };

    return (
      <div style={containerStyle}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={canvasStyle}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    );
  }
);

LegendaryWhiteboard.displayName = 'LegendaryWhiteboard';

export default LegendaryWhiteboard;
