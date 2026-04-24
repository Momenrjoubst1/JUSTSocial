/**
 * LEGENDARY WHITEBOARD - Custom Hooks
 * React hooks for managing whiteboard state and features
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { WhiteboardStateManager } from '../core/engine/StateManager';
import { DrawingEngine } from '../core/engine/DrawingEngine';
import { AIEngine } from '../core/ai/AIEngine';

import { Shape, DrawingTool, Selection, WhiteboardState, ExportOptions } from '../types';

/**
 * Hook: useLegendaryWhiteboard
 * Main hook for managing whiteboard functionality
 */
export function useLegendaryWhiteboard(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const stateManager = useRef(new WhiteboardStateManager());
  const drawingEngine = useRef<DrawingEngine | null>(null);

  const [state, setState] = useState<WhiteboardState | null>(null);

  // Initialize drawing engine
  useEffect(() => {
    if (canvasRef.current && !drawingEngine.current) {
      drawingEngine.current = new DrawingEngine(canvasRef.current);
    }
  }, [canvasRef]);

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = stateManager.current.subscribe('state-changed', setState);
    return unsubscribe;
  }, []);

  const addShape = useCallback((shape: Shape) => {
    stateManager.current.addShape(shape);
  }, []);

  const removeShape = useCallback((id: string) => {
    stateManager.current.removeShape(id);
  }, []);

  const updateShape = useCallback((id: string, changes: Partial<Shape>) => {
    stateManager.current.updateShape(id, changes);
  }, []);

  const setTool = useCallback((tool: DrawingTool) => {
    stateManager.current.setTool(tool);
  }, []);

  const setSelection = useCallback((selection: Selection | null) => {
    stateManager.current.setSelection(selection);
  }, []);

  const undo = useCallback(() => {
    stateManager.current.undo();
  }, []);

  const redo = useCallback(() => {
    stateManager.current.redo();
  }, []);

  const canUndo = useCallback(() => {
    return stateManager.current.canUndo();
  }, []);

  const canRedo = useCallback(() => {
    return stateManager.current.canRedo();
  }, []);

  const exportCanvas = useCallback((options: ExportOptions) => {
    if (!canvasRef.current) return null;

    switch (options.format) {
      case 'png':
      case 'jpeg':
      case 'webp':
        return canvasRef.current.toDataURL(`image/${options.format}`);
      case 'json':
        return stateManager.current.exportToJSON();
      default:
        return null;
    }
  }, [canvasRef]);

  const clear = useCallback(() => {
    stateManager.current.getShapes().forEach((_, id) => {
      stateManager.current.removeShape(id);
    });
  }, []);

  return {
    state,
    addShape,
    removeShape,
    updateShape,
    setTool,
    setSelection,
    undo,
    redo,
    canUndo,
    canRedo,
    exportCanvas,
    clear,
    stateManager: stateManager.current,
    drawingEngine: drawingEngine.current,

  };
}

/**
 * Hook: useWhiteboardAI
 * AI-powered features for shape recognition and formatting
 */
export function useWhiteboardAI() {
  const aiEngine = useRef(new AIEngine());

  const recognizeShape = useCallback((points: any[]) => {
    return aiEngine.current.recognizeShape(points);
  }, []);

  const recognizeHandwriting = useCallback(async (points: any[]) => {
    return await aiEngine.current.recognizeHandwriting(points);
  }, []);

  const analyzeAndFormat = useCallback((shapes: Shape[]) => {
    return aiEngine.current.analyzeAndFormatDiagram(shapes);
  }, []);

  return {
    recognizeShape,
    recognizeHandwriting,
    analyzeAndFormat,
  };
}

/**
 * Hook: useWhiteboardHistory
 * Manage undo/redo operations
 */
export function useWhiteboardHistory(stateManager: WhiteboardStateManager) {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const unsubscribe = stateManager.subscribe('state-changed', () => {
      setCanUndo(stateManager.canUndo());
      setCanRedo(stateManager.canRedo());
    });

    return unsubscribe;
  }, [stateManager]);

  return {
    canUndo,
    canRedo,
    undo: () => stateManager.undo(),
    redo: () => stateManager.redo(),
  };
}

/**
 * Hook: useWhiteboardExport
 * Export whiteboard in various formats
 */
export function useWhiteboardExport(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const exportToPNG = useCallback(() => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    downloadImage(dataUrl, 'whiteboard.png');
  }, [canvasRef]);

  const exportToJPEG = useCallback(() => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.95);
    downloadImage(dataUrl, 'whiteboard.jpg');
  }, [canvasRef]);

  const exportToWebP = useCallback(() => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/webp');
    downloadImage(dataUrl, 'whiteboard.webp');
  }, [canvasRef]);

  const exportToSVG = useCallback(() => {
    console.log('SVG export feature coming soon');
  }, []);

  const exportToPDF = useCallback(() => {
    console.log('PDF export feature coming soon');
  }, []);

  const exportToJSON = useCallback(() => {
    console.log('JSON export feature coming soon');
  }, []);

  return {
    exportToPNG,
    exportToJPEG,
    exportToWebP,
    exportToSVG,
    exportToPDF,
    exportToJSON,
  };
}

/**
 * Hook: useWhiteboardCollaboration
 * Real-time collaboration features
 */
export function useWhiteboardCollaboration(userId: string) {
  return {
    userId,
    remoteUsers: [],
    isConnected: false,
    broadcastUpdate: (update: any) => {
      // Would connect to WebSocket or PeerJS here
      console.log('Broadcasting update:', update);
    },
    receiveUpdate: (update: any) => {
      // Process updates from remote users
      console.log('Received update:', update);
    },
  };
}

/**
 * Hook: useWhiteboardTools
 * Manage drawing tools and styles
 */
export function useWhiteboardTools() {
  const [selectedTool, setSelectedTool] = useState<DrawingTool>('pen');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('#ffffff');
  const [opacity, setOpacity] = useState(1);

  return {
    selectedTool,
    setSelectedTool,
    strokeWidth,
    setStrokeWidth,
    strokeColor,
    setStrokeColor,
    fillColor,
    setFillColor,
    opacity,
    setOpacity,
  };
}

// Helper function to download image
function downloadImage(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
