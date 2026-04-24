/**
 * LEGENDARY WHITEBOARD - Toolbar Component
 * Advanced toolbar with all tools and features
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation("videochat");
  const tools: { id: DrawingTool; labelKey: string; icon: string }[] = [
    { id: 'selection', labelKey: 'whiteboard.tool.selection', icon: '▢' },
    { id: 'pen', labelKey: 'whiteboard.tool.pen', icon: '🖊' },
    { id: 'marker', labelKey: 'whiteboard.tool.marker', icon: '🖍' },
    { id: 'eraser', labelKey: 'whiteboard.tool.eraser', icon: '⌫' },
    { id: 'line', labelKey: 'whiteboard.tool.line', icon: '─' },
    { id: 'arrow', labelKey: 'whiteboard.tool.arrow', icon: '→' },
    { id: 'rectangle', labelKey: 'whiteboard.tool.rectangle', icon: '▭' },
    { id: 'circle', labelKey: 'whiteboard.tool.circle', icon: '●' },
    { id: 'text', labelKey: 'whiteboard.tool.text', icon: 'A' },
    { id: 'image', labelKey: 'whiteboard.tool.image', icon: '🖼' },
    { id: 'connector', labelKey: 'whiteboard.tool.connector', icon: '⟷' },
    { id: 'shape-ai', labelKey: 'whiteboard.tool.shapeAi', icon: '✨' },
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
            title={t(tool.labelKey)}
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
          title={t("whiteboard.undo")}
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
          title={t("whiteboard.redo")}
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
        <label style={styles.label}>{t("whiteboard.strokeLabel")}</label>
        <input
          type="color"
          value={strokeColor}
          onChange={(e) => onStrokeColorChange?.(e.target.value)}
          style={styles.colorInput}
          title={t("whiteboard.strokeColor")}
        />

        <label style={styles.label}>{t("whiteboard.widthLabel")}</label>
        <input
          type="range"
          min="1"
          max="50"
          value={strokeWidth}
          onChange={(e) => onStrokeWidthChange?.(parseInt(e.target.value))}
          style={styles.slider}
          title={t("whiteboard.strokeWidth")}
        />
        <span style={{ fontSize: '12px', minWidth: '30px' }}>{strokeWidth}px</span>
      </div>

      {/* Fill & Advanced */}
      <div style={styles.toolGroup}>
        <label style={styles.label}>{t("whiteboard.fillLabel")}</label>
        <input
          type="color"
          value={fillColor}
          onChange={(e) => onFillColorChange?.(e.target.value)}
          style={styles.colorInput}
          title={t("whiteboard.fillColor")}
        />

        <label style={styles.label}>{t("whiteboard.opacityLabel")}</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={opacity}
          onChange={(e) => onOpacityChange?.(parseFloat(e.target.value))}
          style={styles.slider}
          title={t("whiteboard.opacity")}
        />
        <span style={{ fontSize: '12px', minWidth: '30px' }}>
          {Math.round(opacity * 100)}%
        </span>
      </div>

      {/* Action Buttons */}
      <div style={styles.toolGroup}>
        <button
          onClick={onClear}
          title={t("whiteboard.clearCanvas")}
          style={styles.toolButton(false) as React.CSSProperties}
        >
          {t("whiteboard.clearButton")}
        </button>
        <button
          onClick={onExport}
          title={t("whiteboard.export")}
          style={styles.toolButton(false) as React.CSSProperties}
        >
          📥
        </button>
      </div>
    </div>
  );
};

export default WhiteboardToolbar;
