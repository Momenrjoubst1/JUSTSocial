/**
 * EditorTabs Component
 * Tabbed interface for switching between open files
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useFileSystem } from '@/hooks/useFileSystem';
import {
  editorTabsStyles,
  getTabFileIconSvgPath,
  tabFileIconColors,
} from './EditorTabs.styles';

interface EditorTabsProps {
  onContentChange?: (fileId: string, content: string) => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  fileId: string | null;
}

export const EditorTabs: React.FC<EditorTabsProps> = ({ onContentChange }) => {
  const fs = useFileSystem();
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    fileId: null,
  });
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => {
      if (contextMenu.visible) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu.visible]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, fileId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        fileId,
      });
    },
    []
  );

  const handleCloseTab = useCallback(
    (e: React.MouseEvent, fileId: string) => {
      e.stopPropagation();
      fs.closeFile(fileId);
    },
    [fs]
  );

  const handleCloseOtherTabs = useCallback(() => {
    if (contextMenu.fileId) {
      fs.openFiles.forEach((id) => {
        if (id !== contextMenu.fileId) {
          fs.closeFile(id);
        }
      });
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, [contextMenu.fileId, fs.openFiles, fs]);

  const handleCloseAllTabs = useCallback(() => {
    fs.openFiles.forEach((id) => fs.closeFile(id));
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, [fs.openFiles, fs]);

  const handleContextMenuAction = useCallback((action: string) => {
    switch (action) {
      case 'close':
        if (contextMenu.fileId) {
          fs.closeFile(contextMenu.fileId);
        }
        break;
      case 'closeOthers':
        handleCloseOtherTabs();
        break;
      case 'closeAll':
        handleCloseAllTabs();
        break;
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, [contextMenu.fileId, fs, handleCloseOtherTabs, handleCloseAllTabs]);

  if (fs.openFiles.length === 0) {
    return (
      <div style={editorTabsStyles.tabsContainer}>
        <div style={editorTabsStyles.emptyState}>No files open</div>
      </div>
    );
  }

  return (
    <>
      <div ref={tabsContainerRef} style={editorTabsStyles.tabsContainer}>
        {fs.openFiles.map((fileId) => {
          const node = fs.getNode(fileId);
          if (!node || node.type !== 'file') return null;

          const isActive = fs.activeFileId === fileId;

          return (
            <div
              key={fileId}
              style={{
                ...editorTabsStyles.tab,
                ...(hoveredTab === fileId ? editorTabsStyles.tabHover : {}),
                ...(isActive ? editorTabsStyles.tabActive : {}),
              }}
              onClick={() => fs.setActiveFile(fileId)}
              onContextMenu={(e) => handleContextMenu(e, fileId)}
              onMouseEnter={() => setHoveredTab(fileId)}
              onMouseLeave={() => setHoveredTab(null)}
            >
              {/* Icon */}
              <div style={editorTabsStyles.tabIcon}>
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18, color: tabFileIconColors[node.language || 'default'] || tabFileIconColors.default }}>
                  <path d={getTabFileIconSvgPath(node.language || 'default')} />
                </svg>
              </div>

              {/* Name */}
              <span
                style={{
                  ...editorTabsStyles.tabName,
                  ...(isActive ? editorTabsStyles.tabNameActive : {}),
                }}
                title={node.name}
              >
                {node.name}
              </span>

              {/* Close Button */}
              <button
                style={{
                  ...editorTabsStyles.tabClose,
                  ...(hoveredTab === fileId || isActive ? editorTabsStyles.tabCloseVisible : {}),
                }}
                onClick={(e) => handleCloseTab(e, fileId)}
                onMouseEnter={(e) => {
                  Object.assign(e.currentTarget.style, editorTabsStyles.tabCloseHover);
                }}
                onMouseLeave={(e) => {
                  Object.assign(e.currentTarget.style, editorTabsStyles.tabClose);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          style={{
            ...editorTabsStyles.contextMenu,
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            style={editorTabsStyles.tabContextMenuItem}
            onClick={() => handleContextMenuAction('close')}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, editorTabsStyles.tabContextMenuItemHover);
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, editorTabsStyles.tabContextMenuItem);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Close
          </button>
          <button
            style={editorTabsStyles.tabContextMenuItem}
            onClick={() => handleContextMenuAction('closeOthers')}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, editorTabsStyles.tabContextMenuItemHover);
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, editorTabsStyles.tabContextMenuItem);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="9" x2="15" y2="9" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="15" x2="13" y2="15" />
            </svg>
            Close Others
          </button>
          <button
            style={editorTabsStyles.tabContextMenuItem}
            onClick={() => handleContextMenuAction('closeAll')}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, editorTabsStyles.tabContextMenuItemHover);
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, editorTabsStyles.tabContextMenuItem);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="9" x2="15" y2="15" />
              <line x1="15" y1="9" x2="9" y2="15" />
            </svg>
            Close All
          </button>
        </div>
      )}
    </>
  );
};

export default EditorTabs;
