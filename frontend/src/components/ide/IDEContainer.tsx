/**
 * IDEContainer Component
 * Main IDE layout integrating sidebar, editor, tabs, and terminal
 */

import React, { useState, useCallback, useRef } from 'react';
import { FileExplorer } from '@/components/ide/FileExplorer';
import { EditorTabs } from '@/components/ide/EditorTabs';
import { CodeEditor } from '@/components/ide/CodeEditor';
import { Terminal } from '@/components/ide/Terminal';
import { RemoteCursor } from '@/hooks/useFileSystem.types';

interface IDEContainerProps {
  onContentChange?: (fileId: string, content: string) => void;
  onCommandExecute?: (command: string) => void;
  remoteCursors?: RemoteCursor[];
  readOnly?: boolean;
  workspaceId?: string;
}

export const IDEContainer: React.FC<IDEContainerProps> = ({
  onContentChange,
  onCommandExecute,
  remoteCursors = [],
  readOnly = false,
  workspaceId = 'default',
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [terminalCollapsed, setTerminalCollapsed] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(200);
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);
  const terminalResizeStartY = useRef(0);
  const terminalStartHeight = useRef(0);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const handleTerminalResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingTerminal(true);
    terminalResizeStartY.current = e.clientY;
    terminalStartHeight.current = terminalHeight;
  }, [terminalHeight]);

  const handleTerminalResize = useCallback((e: MouseEvent) => {
    if (!isResizingTerminal) return;

    const deltaY = terminalResizeStartY.current - e.clientY;
    const newHeight = Math.max(100, Math.min(400, terminalStartHeight.current + deltaY));
    setTerminalHeight(newHeight);
  }, [isResizingTerminal]);

  const handleTerminalResizeEnd = useCallback(() => {
    setIsResizingTerminal(false);
  }, []);

  React.useEffect(() => {
    if (isResizingTerminal) {
      window.addEventListener('mousemove', handleTerminalResize);
      window.addEventListener('mouseup', handleTerminalResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleTerminalResize);
        window.removeEventListener('mouseup', handleTerminalResizeEnd);
      };
    }
  }, [isResizingTerminal, handleTerminalResize, handleTerminalResizeEnd]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column' as const,
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        background: '#0a0a0f',
      }}
    >
      {/* Main content area */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Sidebar */}
        <FileExplorer
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />

        {/* Editor area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column' as const,
            overflow: 'hidden',
          }}
        >
          {/* Tabs */}
          <EditorTabs onContentChange={onContentChange} />

          {/* Editor */}
          <div
            style={{
              flex: 1,
              overflow: 'hidden',
            }}
          >
            <CodeEditor
              height="100%"
              onContentChange={onContentChange}
              remoteCursors={remoteCursors}
              readOnly={readOnly}
              workspaceId={workspaceId}
            />
          </div>
        </div>
      </div>

      {/* Terminal resizer handle */}
      {!terminalCollapsed && (
        <div
          onMouseDown={handleTerminalResizeStart}
          style={{
            height: 8,
            background: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            cursor: 'row-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.2)',
            }}
          />
        </div>
      )}

      {/* Terminal */}
      <Terminal
        collapsed={terminalCollapsed}
        height={terminalHeight}
        onCommandExecute={onCommandExecute}
      />

      {/* Terminal collapse button */}
      <button
        onClick={() => setTerminalCollapsed((prev) => !prev)}
        style={{
          position: 'absolute' as const,
          bottom: terminalCollapsed ? 8 : terminalHeight + 8,
          right: 16,
          zIndex: 100,
          width: 28,
          height: 28,
          borderRadius: 6,
          border: '1px solid rgba(255, 255, 255, 0.15)',
          background: 'rgba(20, 20, 30, 0.9)',
          backdropFilter: 'blur(10px)',
          color: 'rgba(255, 255, 255, 0.6)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(30, 30, 45, 0.95)';
          e.currentTarget.style.color = '#fff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(20, 20, 30, 0.9)';
          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
        }}
        title={terminalCollapsed ? 'Open Terminal' : 'Close Terminal'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
          {terminalCollapsed ? (
            <polyline points="18 15 12 9 6 15" />
          ) : (
            <polyline points="6 9 12 15 18 9" />
          )}
        </svg>
      </button>
    </div>
  );
};

export default IDEContainer;
