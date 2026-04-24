/**
 * LEGENDARY WHITEBOARD - Complete Container Component
 * Full-featured whiteboard application with toolbar, layers, and canvas
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { LegendaryWhiteboard } from '../LegendaryWhiteboard';
import { WhiteboardToolbar } from './Toolbar';
import { useTranslation } from 'react-i18next';
import { LayersPanel } from './LayersPanel';
import {
  useLegendaryWhiteboard,
  useWhiteboardTools,
  useWhiteboardHistory,
  useWhiteboardExport,
} from '../hooks/useLegendaryWhiteboard';

export interface LegendaryWhiteboardContainerProps {
  width?: number;
  height?: number;
  enableAI?: boolean;
  enableCollaboration?: boolean;
  onCollaborate?: (update: any) => void;
  onClose?: () => void;
  darkMode?: boolean;
}

/**
 * Complete Legendary Whiteboard Container
 * Includes: Canvas, Toolbar, Layers Panel, Status Bar
 */
export const LegendaryWhiteboardContainer: React.FC<LegendaryWhiteboardContainerProps> = ({
  width = 1920,
  height = 1080,
  enableAI = true,
  enableCollaboration = true,
  onCollaborate,
  onClose,
  darkMode = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showLayers, setShowLayers] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [fps, setFps] = useState(60);
  const { t } = useTranslation("videochat");

  // Whiteboard hooks
  const whiteboardState = useLegendaryWhiteboard(canvasRef);
  const tools = useWhiteboardTools();
  const history = useWhiteboardHistory(whiteboardState.stateManager);
  const { exportToPNG, exportToJSON } = useWhiteboardExport(canvasRef);

  // Simulate FPS counter
  useEffect(() => {
    let lastTime = performance.now();
    let frameCount = 0;
    const interval = setInterval(() => {
      const now = performance.now();
      const delta = now - lastTime;
      if (delta >= 1000) {
        setFps(Math.round(frameCount / (delta / 1000)));
        frameCount = 0;
        lastTime = now;
      }
      frameCount++;
    }, 0);

    return () => clearInterval(interval);
  }, []);

  const handleExport = useCallback(() => {
    const format = prompt(
      t("whiteboard.exportFormatPrompt"),
      t("whiteboard.exportDefault")
    ) as any;

    if (format === 'png') {
      exportToPNG();
    } else if (format === 'json') {
      exportToJSON();
    }
  }, [exportToPNG, exportToJSON, t]);

  const handleClear = useCallback(() => {
    if (confirm(t("whiteboard.clearCanvasConfirm"))) {
      whiteboardState.clear();
    }
  }, [t, whiteboardState]);

  const styles = {
    container: {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
    },
    toolbar: {
      height: '60px',
      borderBottom: '1px solid #e0e0e0',
      display: 'flex',
      alignItems: 'center',
      paddingRight: '12px',
      justifyContent: 'space-between',
    },
    toolbarLeft: {
      flex: 1,
      overflowX: 'auto' as const,
    },
    toolbarRight: {
      display: 'flex',
      gap: '12px',
      paddingLeft: '12px',
      borderLeft: '1px solid #e0e0e0',
    },
    content: {
      flex: 1,
      display: 'flex',
      overflow: 'hidden',
    },
    mainCanvas: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: darkMode ? '#2e2e2e' : '#f5f5f5',
      overflow: 'auto',
    },
    statusBar: {
      height: '32px',
      backgroundColor: darkMode ? '#1e1e1e' : '#f8f9fa',
      borderTop: '1px solid #e0e0e0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: '12px',
      paddingRight: '12px',
      fontSize: '12px',
      color: '#666666',
    },
    iconButton: {
      padding: '6px 12px',
      backgroundColor: 'transparent',
      border: '1px solid #d0d0d0',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '600' as const,
      transition: 'all 0.2s',
    },
    toggleButton: (isActive: boolean) => ({
      ...{
        padding: '6px 12px',
        backgroundColor: isActive ? '#3b82f6' : 'transparent',
        color: isActive ? '#ffffff' : '#333333',
        border: isActive ? 'none' : '1px solid #d0d0d0',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '600' as const,
        transition: 'all 0.2s',
      },
    }),
  };

  return (
    <div style={styles.container}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <WhiteboardToolbar
            currentTool={tools.selectedTool}
            onToolChange={(tool) => {
              tools.setSelectedTool(tool);
              whiteboardState.setTool(tool);
            }}
            onUndo={() => whiteboardState.undo()}
            onRedo={() => whiteboardState.redo()}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            strokeColor={tools.strokeColor}
            onStrokeColorChange={tools.setStrokeColor}
            strokeWidth={tools.strokeWidth}
            onStrokeWidthChange={tools.setStrokeWidth}
            fillColor={tools.fillColor}
            onFillColorChange={tools.setFillColor}
            opacity={tools.opacity}
            onOpacityChange={tools.setOpacity}
            onClear={handleClear}
            onExport={handleExport}
          />
        </div>
        <div style={styles.toolbarRight}>
          <button
            onClick={() => setShowLayers(!showLayers)}
            style={styles.toggleButton(showLayers) as React.CSSProperties}
            title={t("whiteboard.toggleLayersPanel")}
          >
            {t("whiteboard.layersButton")}
          </button>
          <button
            onClick={() => setShowStats(!showStats)}
            style={styles.toggleButton(showStats) as React.CSSProperties}
            title={t("whiteboard.toggleStatistics")}
          >
            {t("whiteboard.statsButton")}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                ...styles.iconButton,
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
              } as React.CSSProperties}
              title={t("whiteboard.closeWhiteboard")}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {/* Layers Panel */}
        {showLayers && (
          <LayersPanel
            layers={whiteboardState.state?.layers || []}
            activeLayerId={whiteboardState.state?.activeLayerId || ''}
            onLayerSelect={(id) => whiteboardState.stateManager.setActiveLayer(id)}
            onLayerCreate={(name) => {
              const layer = whiteboardState.stateManager.createLayer(name);
              whiteboardState.stateManager.setActiveLayer(layer.id);
            }}
            onLayerDelete={(id) => whiteboardState.stateManager.deleteLayer(id)}
            onLayerReorder={(layers: any) => {
              const ids = (layers as any).map((l: any) => l.id);
              whiteboardState.stateManager.reorderLayers(ids);
            }}
            onLayerToggleVisibility={(id) => {
              const layer = whiteboardState.state?.layers.find((l) => l.id === id);
              if (layer) {
                layer.visible = !layer.visible;
              }
            }}
            onLayerToggleLock={(id) => {
              const layer = whiteboardState.state?.layers.find((l) => l.id === id);
              if (layer) {
                layer.locked = !layer.locked;
              }
            }}
            onLayerRename={(id, name) => {
              const layer = whiteboardState.state?.layers.find((l) => l.id === id);
              if (layer) {
                layer.name = name;
              }
            }}
          />
        )}

        {/* Canvas */}
        <div style={styles.mainCanvas}>
          <LegendaryWhiteboard
            ref={canvasRef}
            width={Math.min(width, window.innerWidth - (showLayers ? 250 : 0))}
            height={height - 60 - 32}
            enableAI={enableAI}
            enableCollaboration={enableCollaboration}
            backgroundColor={darkMode ? '#2e2e2e' : '#ffffff'}
            darkMode={darkMode}
            onShapeAdd={(shape) => {
              onCollaborate?.({
                type: 'shape-add',
                shape,
                timestamp: Date.now(),
              });
            }}
            onShapeRemove={(id) => {
              onCollaborate?.({
                type: 'shape-remove',
                shapeId: id,
                timestamp: Date.now(),
              });
            }}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div style={styles.statusBar}>
        <div>
          <span style={{ marginRight: '20px' }}>
            {t("whiteboard.shapesLabel")} {whiteboardState.state?.shapes.size || 0}
          </span>
          <span style={{ marginRight: '20px' }}>
            {t("whiteboard.layersLabel")} {whiteboardState.state?.layers.length || 1}
          </span>
          {showStats && (
            <>
              <span style={{ marginRight: '20px' }}>
                {t("whiteboard.fpsLabel")} {fps}
              </span>
              <span>
                {t("whiteboard.zoomLabel")} {Math.round((whiteboardState.state?.zoom || 1) * 100)}%
              </span>
            </>
          )}
        </div>
        <div style={{ textAlign: 'right', fontSize: '11px', color: '#999' }}>
          {enableAI && t("whiteboard.aiEnabled")}
          {enableCollaboration && ((enableAI ? " • " : "") + t("whiteboard.collaborationReady"))}
        </div>
      </div>
    </div>
  );
};

export default LegendaryWhiteboardContainer;
