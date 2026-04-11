/**
 * FileExplorer Component
 * Collapsible sidebar with file tree navigation
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useFileSystem } from '@/hooks/useFileSystem';
import { FileNode } from '@/hooks/useFileSystem.types';
import {
  fileExplorerStyles,
  getFileIconSvgPath,
  getFolderIconSvgPath,
} from '@/components/ide/FileExplorer.styles';

interface FileExplorerProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId: string | null;
  nodeType: 'file' | 'folder' | null;
}

interface ModalState {
  visible: boolean;
  type: 'createFile' | 'createFolder' | 'rename' | null;
  nodeId: string | null;
  defaultValue: string;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  collapsed,
  onToggleCollapse,
}) => {
  const fs = useFileSystem();
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    nodeId: null,
    nodeType: null,
  });
  const [modal, setModal] = useState<ModalState>({
    visible: false,
    type: null,
    nodeId: null,
    defaultValue: '',
  });
  const [inputValue, setInputValue] = useState('');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (modal.visible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [modal.visible]);

  // Focus rename input when editing starts
  useEffect(() => {
    if (editingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingId]);

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
    (e: React.MouseEvent, node: FileNode) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        nodeId: node.id,
        nodeType: node.type,
      });
    },
    []
  );

  const handleOpenModal = useCallback(
    (type: ModalState['type'], nodeId: string | null, defaultValue: string = '') => {
      setModal({ visible: true, type, nodeId, defaultValue });
      setInputValue(defaultValue);
      setContextMenu((prev) => ({ ...prev, visible: false }));
    },
    []
  );

  const handleImportFiles = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e: Event) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        Array.from(files).forEach((file) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const content = event.target?.result as string;
            const langMap: Record<string, string> = {
              js: 'javascript', ts: 'typescript', py: 'python', html: 'html',
              css: 'css', json: 'json', cpp: 'cpp', java: 'java', c: 'cpp',
              md: 'markdown', xml: 'xml', yaml: 'yaml', yml: 'yaml', sh: 'shell',
              php: 'php', rb: 'ruby', go: 'go', rs: 'rust', sql: 'sql'
            };
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            fs.createFile('root', file.name, content, langMap[ext] || 'plaintext');
          };
          reader.readAsText(file);
        });
      }
    };
    input.click();
  }, [fs]);

  const handleCloseModal = useCallback(() => {
    setModal({ visible: false, type: null, nodeId: null, defaultValue: '' });
    setInputValue('');
  }, []);

  const handleModalSubmit = useCallback(() => {
    if (!inputValue.trim()) return;

    switch (modal.type) {
      case 'createFile':
        fs.createFile(modal.nodeId, inputValue.trim());
        break;
      case 'createFolder':
        fs.createFolder(modal.nodeId, inputValue.trim());
        break;
      case 'rename':
        if (modal.nodeId) {
          fs.renameNode(modal.nodeId, inputValue.trim());
        }
        break;
    }
    handleCloseModal();
  }, [inputValue, modal, fs, handleCloseModal]);

  const handleDelete = useCallback(() => {
    if (contextMenu.nodeId) {
      fs.deleteNode(contextMenu.nodeId);
      setContextMenu((prev) => ({ ...prev, visible: false }));
    }
  }, [contextMenu.nodeId, fs]);

  const handleStartRename = useCallback((node: FileNode) => {
    setEditingId(node.id);
    setRenameValue(node.name);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleRenameSubmit = useCallback(
    (nodeId: string) => {
      if (renameValue.trim() && renameValue.trim() !== fs.getNode(nodeId)?.name) {
        fs.renameNode(nodeId, renameValue.trim());
      }
      setEditingId(null);
      setRenameValue('');
    },
    [renameValue, fs]
  );

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent, nodeId: string) => {
      if (e.key === 'Enter') {
        handleRenameSubmit(nodeId);
      } else if (e.key === 'Escape') {
        setEditingId(null);
        setRenameValue('');
      }
    },
    [handleRenameSubmit]
  );

  const handleModalKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleModalSubmit();
      } else if (e.key === 'Escape') {
        handleCloseModal();
      }
    },
    [handleModalSubmit, handleCloseModal]
  );

  const renderTreeItem = useCallback(
    (node: FileNode, level: number = 0) => {
      const isExpanded = fs.expandedFolders.has(node.id);
      const isActive = fs.activeFileId === node.id;
      const isFolder = node.type === 'folder';
      const children = isFolder ? fs.getChildren(node.id) : [];

      return (
        <div key={node.id} style={fileExplorerStyles.treeItem}>
          <div
            style={{
              ...fileExplorerStyles.treeItemRow,
              ...fileExplorerStyles.treeItemIndent(level),
              ...(hoveredItem === node.id ? fileExplorerStyles.treeItemRowHover : {}),
              ...(isActive ? fileExplorerStyles.treeItemRowActive : {}),
            }}
            onClick={() => {
              if (isFolder) {
                fs.toggleFolder(node.id);
              } else {
                fs.openFile(node.id);
              }
            }}
            onContextMenu={(e) => handleContextMenu(e, node)}
            onMouseEnter={() => setHoveredItem(node.id)}
            onMouseLeave={() => setHoveredItem(null)}
            onDoubleClick={() => {
              if (!isFolder) {
                fs.openFile(node.id);
              }
            }}
          >
            {/* Expand/Collapse Arrow */}
            <div
              style={{
                ...fileExplorerStyles.treeArrow,
                ...(isExpanded ? fileExplorerStyles.treeArrowExpanded : {}),
                visibility: isFolder ? 'visible' : 'hidden',
              }}
              onClick={(e) => {
                e.stopPropagation();
                fs.toggleFolder(node.id);
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
              </svg>
            </div>

            {/* Icon */}
            <div style={fileExplorerStyles.treeIcon}>
              {isFolder ? (
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20, color: isExpanded ? '#f4b400' : '#f4b400' }}>
                  <path d={getFolderIconSvgPath(isExpanded)} />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20 }}>
                  <path d={getFileIconSvgPath(node.language || 'default')} />
                </svg>
              )}
            </div>

            {/* Name */}
            {editingId === node.id ? (
              <input
                ref={renameInputRef}
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRenameSubmit(node.id)}
                onKeyDown={(e) => handleRenameKeyDown(e, node.id)}
                style={fileExplorerStyles.treeNameEditing}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span style={fileExplorerStyles.treeName} title={node.name}>
                {node.name}
              </span>
            )}
          </div>

          {/* Children */}
          {isFolder && isExpanded && children.map((child) => renderTreeItem(child, level + 1))}
        </div>
      );
    },
    [fs, hoveredItem, editingId, renameValue, handleContextMenu, handleRenameSubmit, handleRenameKeyDown]
  );

  const rootChildren = fs.getChildren(null);

  return (
    <>
      {/* Sidebar */}
      <div
        style={{
          ...fileExplorerStyles.sidebar,
          ...(collapsed ? fileExplorerStyles.sidebarCollapsed : {}),
        }}
      >
        {/* Header */}
        <div style={fileExplorerStyles.header}>
          <h3 style={fileExplorerStyles.headerTitle}>Explorer</h3>
          <div style={fileExplorerStyles.headerActions}>
            <button
              style={fileExplorerStyles.actionBtn}
              onClick={handleImportFiles}
              title="Import Files from Device"
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, fileExplorerStyles.actionBtnHover);
              }}
              onMouseLeave={(e) => {
                Object.assign(e.currentTarget.style, fileExplorerStyles.actionBtn);
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </button>
            <button
              style={fileExplorerStyles.actionBtn}
              onClick={() => handleOpenModal('createFile', 'root')}
              title="New File"
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, fileExplorerStyles.actionBtnHover);
              }}
              onMouseLeave={(e) => {
                Object.assign(e.currentTarget.style, fileExplorerStyles.actionBtn);
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </button>
            <button
              style={fileExplorerStyles.actionBtn}
              onClick={() => handleOpenModal('createFolder', 'root')}
              title="New Folder"
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, fileExplorerStyles.actionBtnHover);
              }}
              onMouseLeave={(e) => {
                Object.assign(e.currentTarget.style, fileExplorerStyles.actionBtn);
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
            </button>
            <button
              style={fileExplorerStyles.actionBtn}
              onClick={onToggleCollapse}
              title="Collapse Sidebar"
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, fileExplorerStyles.actionBtnHover);
              }}
              onMouseLeave={(e) => {
                Object.assign(e.currentTarget.style, fileExplorerStyles.actionBtn);
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* File Tree */}
        <div ref={treeRef} style={fileExplorerStyles.treeContainer}>
          {rootChildren.length === 0 ? (
            <div style={fileExplorerStyles.emptyState}>No files yet</div>
          ) : (
            rootChildren.map((node) => renderTreeItem(node))
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          style={{
            ...fileExplorerStyles.contextMenu,
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          {contextMenu.nodeType === 'folder' && (
            <>
              <button
                style={fileExplorerStyles.contextMenuItem}
                onClick={() => handleOpenModal('createFile', contextMenu.nodeId)}
                onMouseEnter={(e) => {
                  Object.assign(e.currentTarget.style, fileExplorerStyles.contextMenuItemHover);
                }}
                onMouseLeave={(e) => {
                  Object.assign(e.currentTarget.style, fileExplorerStyles.contextMenuItem);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                New File
              </button>
              <button
                style={fileExplorerStyles.contextMenuItem}
                onClick={() => handleOpenModal('createFolder', contextMenu.nodeId)}
                onMouseEnter={(e) => {
                  Object.assign(e.currentTarget.style, fileExplorerStyles.contextMenuItemHover);
                }}
                onMouseLeave={(e) => {
                  Object.assign(e.currentTarget.style, fileExplorerStyles.contextMenuItem);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
                New Folder
              </button>
              <div style={fileExplorerStyles.contextMenuDivider} />
            </>
          )}
          {contextMenu.nodeId && contextMenu.nodeId !== 'root' && (
            <>
              <button
                style={fileExplorerStyles.contextMenuItem}
                onClick={() => handleStartRename(fs.getNode(contextMenu.nodeId!)!)}
                onMouseEnter={(e) => {
                  Object.assign(e.currentTarget.style, fileExplorerStyles.contextMenuItemHover);
                }}
                onMouseLeave={(e) => {
                  Object.assign(e.currentTarget.style, fileExplorerStyles.contextMenuItem);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Rename
              </button>
              <button
                style={fileExplorerStyles.contextMenuItem}
                onClick={handleDelete}
                onMouseEnter={(e) => {
                  Object.assign(e.currentTarget.style, fileExplorerStyles.contextMenuItemHover);
                }}
                onMouseLeave={(e) => {
                  Object.assign(e.currentTarget.style, fileExplorerStyles.contextMenuItem);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
                Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* Modal */}
      {modal.visible && (
        <div
          style={fileExplorerStyles.modalOverlay}
          onClick={handleCloseModal}
        >
          <div
            style={fileExplorerStyles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={fileExplorerStyles.modalTitle}>
              {modal.type === 'createFile' && 'Create New File'}
              {modal.type === 'createFolder' && 'Create New Folder'}
              {modal.type === 'rename' && 'Rename'}
            </h4>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleModalKeyDown}
              placeholder={
                modal.type === 'createFile'
                  ? 'filename.ext'
                  : modal.type === 'createFolder'
                    ? 'Folder name'
                    : 'New name'
              }
              style={fileExplorerStyles.modalInput}
            />
            <div style={fileExplorerStyles.modalActions}>
              <button
                style={{
                  ...fileExplorerStyles.modalBtn,
                  ...fileExplorerStyles.modalBtnSecondary,
                }}
                onClick={handleCloseModal}
              >
                Cancel
              </button>
              <button
                style={{
                  ...fileExplorerStyles.modalBtn,
                  ...fileExplorerStyles.modalBtnPrimary,
                }}
                onClick={handleModalSubmit}
              >
                {modal.type === 'createFile' && 'Create File'}
                {modal.type === 'createFolder' && 'Create Folder'}
                {modal.type === 'rename' && 'Rename'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FileExplorer;
