/**
 * LEGENDARY WHITEBOARD - Layers Panel Component
 * Advanced layer management with drag-and-drop
 */

import React, { useState } from 'react';
import { Layer } from '../types';

export interface LayersPanelProps {
  layers: Layer[];
  activeLayerId: string;
  onLayerSelect: (layerId: string) => void;
  onLayerCreate: (name: string) => void;
  onLayerDelete: (layerId: string) => void;
  onLayerReorder: (layers: Layer[]) => void;
  onLayerToggleVisibility: (layerId: string) => void;
  onLayerToggleLock: (layerId: string) => void;
  onLayerRename: (layerId: string, name: string) => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  layers = [],
  activeLayerId,
  onLayerSelect,
  onLayerCreate,
  onLayerDelete,
  onLayerToggleVisibility,
  onLayerToggleLock,
  onLayerRename,
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const styles = {
    container: {
      width: '250px',
      height: '100%',
      backgroundColor: '#f5f5f5',
      borderRight: '1px solid #d0d0d0',
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
    },
    header: {
      padding: '12px',
      borderBottom: '1px solid #d0d0d0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: '14px',
      fontWeight: '700' as const,
      color: '#333333',
    },
    addButton: {
      padding: '4px 8px',
      backgroundColor: '#3b82f6',
      color: '#ffffff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '600' as const,
    },
    layersList: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '8px',
    },
    layerItem: (isActive: boolean) => ({
      padding: '8px',
      marginBottom: '4px',
      backgroundColor: isActive ? '#3b82f6' : '#ffffff',
      color: isActive ? '#ffffff' : '#333333',
      border: isActive ? 'none' : '1px solid #d0d0d0',
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'all 0.2s',
    }),
    layerName: {
      flex: 1,
      fontSize: '12px',
      fontWeight: '500' as const,
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    layerControls: {
      display: 'flex',
      gap: '4px',
    },
    iconButton: {
      width: '24px',
      height: '24px',
      padding: '0',
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontSize: '12px',
      borderRadius: '4px',
      transition: 'background-color 0.2s',
    },
    renameInput: {
      flex: 1,
      padding: '4px',
      fontSize: '12px',
      border: '1px solid #3b82f6',
      borderRadius: '4px',
    },
  };

  const handleRename = (layerId: string, currentName: string) => {
    setRenamingId(layerId);
    setRenameValue(currentName);
  };

  const handleRenameSave = (layerId: string) => {
    onLayerRename(layerId, renameValue);
    setRenamingId(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Layers</span>
        <button
          onClick={() => {
            const name = prompt('Layer name:', 'New Layer');
            if (name) onLayerCreate(name);
          }}
          style={styles.addButton}
          title="Add new layer"
        >
          +
        </button>
      </div>

      <div style={styles.layersList}>
        {layers.length === 0 ? (
          <div style={{ padding: '12px', textAlign: 'center', color: '#999' }}>
            No layers
          </div>
        ) : (
          // Render layers from top to bottom (reverse order)
          [...layers].reverse().map((layer) => (
            <div
              key={layer.id}
              style={styles.layerItem(activeLayerId === layer.id) as React.CSSProperties}
              onClick={() => onLayerSelect(layer.id)}
            >
              {renamingId === layer.id ? (
                <>
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRenameSave(layer.id);
                      } else if (e.key === 'Escape') {
                        setRenamingId(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    style={styles.renameInput}
                  />
                </>
              ) : (
                <>
                  {/* Layer thumbnail */}
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: layer.shapes.length > 0 ? '#ddd' : '#f0f0f0',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                    }}
                    title={`${layer.shapes.length} shapes`}
                  />

                  {/* Layer name */}
                  <span
                    style={styles.layerName}
                    onDoubleClick={() => handleRename(layer.id, layer.name)}
                  >
                    {layer.name}
                  </span>

                  {/* Layer controls */}
                  <div style={styles.layerControls}>
                    {/* Visibility toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLayerToggleVisibility(layer.id);
                      }}
                      style={styles.iconButton}
                      title={layer.visible ? 'Hide layer' : 'Show layer'}
                    >
                      {layer.visible ? '👁️' : '🚫'}
                    </button>

                    {/* Lock toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLayerToggleLock(layer.id);
                      }}
                      style={styles.iconButton}
                      title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                    >
                      {layer.locked ? '🔒' : '🔓'}
                    </button>

                    {/* Delete button */}
                    {layers.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this layer?')) {
                            onLayerDelete(layer.id);
                          }
                        }}
                        style={styles.iconButton}
                        title="Delete layer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LayersPanel;
