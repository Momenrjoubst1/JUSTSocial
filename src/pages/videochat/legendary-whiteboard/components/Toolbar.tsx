/**
 * LEGENDARY WHITEBOARD - Toolbar Component
 * Advanced toolbar with all tools and features
 */

import React from 'react';
import { DrawingTool } from '../types';

export interface ToolbarProps {
  currentTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onClear?: () => void;
  onExport?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  strokeColor?: string;
  onStrokeColorChange?: (color: string) => void;
  strokeWidth?: number;
  onStrokeWidthChange?: (width: number) => void;
  fillColor?: string;
  onFillColorChange?: (color: string) => void;
  opacity?: number;
  onOpacityChange?: (opacity: number) => void;
}

export const WhiteboardToolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onToolChange,
  onUndo,
  onRedo,
  onClear,
  onExport,
  canUndo = false,
  canRedo = false,
  strokeColor = '#000000',
  onStrokeColorChange,
  strokeWidth = 2,
  onStrokeWidthChange,
  fillColor = '#ffffff',
  onFillColorChange,
  opacity = 1,
  onOpacityChange,
}) => {
  const tools: { id: DrawingTool; label: string; icon: string }[] = [
    { id: 'selection', label: 'Select', icon: '▢' },
    { id: 'pen', label: 'Pen', icon: '🖊' },
    { id: 'marker', label: 'Marker', icon: '🖍' },
    { id: 'eraser', label: 'Eraser', icon: '⌫' },
    { id: 'line', label: 'Line', icon: '─' },
    { id: 'arrow', label: 'Arrow', icon: '→' },
    { id: 'rectangle', label: 'Rectangle', icon: '▭' },
    { id: 'circle', label: 'Circle', icon: '●' },
    { id: 'text', label: 'Text', icon: 'A' },
    { id: 'image', label: 'Image', icon: '🖼' },
    { id: 'connector', label: 'Connector', icon: '⟷' },
    { id: 'shape-ai', label: 'AI Shape', icon: '✨' },
  ];

  const styles = {
    container: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px',
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #e0e0e0',
      overflowX: 'auto' as const,
      userSelect: 'none' as const,
    },
    toolGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      paddingRight: '8px',
      borderRight: '1px solid #e0e0e0',
    },
    toolButton: (isActive: boolean) => ({
      padding: '8px 12px',
      backgroundColor: isActive ? '#3b82f6' : '#ffffff',
      color: isActive ? '#ffffff' : '#333333',
      border: isActive ? 'none' : '1px solid #d0d0d0',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '600' as const,
      transition: 'all 0.2s',
      minWidth: '40px',
      ':hover': {
        backgroundColor: isActive ? '#2563eb' : '#f0f0f0',
      },
    }),
    slider: {
      width: '100px',
      height: '6px',
      cursor: 'pointer',
    },
    colorInput: {
      width: '40px',
      height: '40px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
    },
    label: {
      fontSize: '12px',
      fontWeight: '600' as const,
      color: '#666666',
      marginRight: '6px',
    },
  };

  return (
    <div style={styles.container}>
      {/* Main Tools */}
      <div style={styles.toolGroup}>
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            title={tool.label}
            style={{
              ...styles.toolButton(currentTool === tool.id),
            } as React.CSSProperties}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* History Tools */}
      <div style={styles.toolGroup}>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          style={{
            ...styles.toolButton(false),
            opacity: canUndo ? 1 : 0.5,
            cursor: canUndo ? 'pointer' : 'not-allowed',
          } as React.CSSProperties}
        >
          ↶
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          style={{
            ...styles.toolButton(false),
            opacity: canRedo ? 1 : 0.5,
            cursor: canRedo ? 'pointer' : 'not-allowed',
          } as React.CSSProperties}
        >
          ↷
        </button>
      </div>

      {/* Colors & Styles */}
      <div style={styles.toolGroup}>
        <label style={styles.label}>Stroke:</label>
        <input
          type="color"
          value={strokeColor}
          onChange={(e) => onStrokeColorChange?.(e.target.value)}
          style={styles.colorInput}
          title="Stroke Color"
        />

        <label style={styles.label}>Width:</label>
        <input
          type="range"
          min="1"
          max="50"
          value={strokeWidth}
          onChange={(e) => onStrokeWidthChange?.(parseInt(e.target.value))}
          style={styles.slider}
          title="Stroke Width"
        />
        <span style={{ fontSize: '12px', minWidth: '30px' }}>{strokeWidth}px</span>
      </div>

      {/* Fill & Advanced */}
      <div style={styles.toolGroup}>
        <label style={styles.label}>Fill:</label>
        <input
          type="color"
          value={fillColor}
          onChange={(e) => onFillColorChange?.(e.target.value)}
          style={styles.colorInput}
          title="Fill Color"
        />

        <label style={styles.label}>Opacity:</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={opacity}
          onChange={(e) => onOpacityChange?.(parseFloat(e.target.value))}
          style={styles.slider}
          title="Opacity"
        />
        <span style={{ fontSize: '12px', minWidth: '30px' }}>
          {Math.round(opacity * 100)}%
        </span>
      </div>

      {/* Action Buttons */}
      <div style={styles.toolGroup}>
        <button
          onClick={onClear}
          title="Clear Canvas"
          style={styles.toolButton(false) as React.CSSProperties}
        >
          Clear
        </button>
        <button
          onClick={onExport}
          title="Export"
          style={styles.toolButton(false) as React.CSSProperties}
        >
          📥
        </button>
      </div>
    </div>
  );
};

export default WhiteboardToolbar;
