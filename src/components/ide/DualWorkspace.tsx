/**
 * DualWorkspace Component
 * Split/Stacked collaborative editing with two independent workspaces
 */

import React, { useState, useCallback, useEffect } from 'react';
import { IDEContainer } from './IDEContainer';
import { useCollaboration } from '@/hooks/useCollaboration';
import { FileOperation } from '@/hooks/useFileSystem.types';
import {
  dualWorkspaceStyles,
  dualWorkspaceAnimations,
} from './DualWorkspace.styles';

type WorkspaceMode = 'single' | 'dual-horizontal' | 'dual-stacked';

interface DualWorkspaceProps {
  userName: string;
  userAvatar?: string;
  initialMode?: WorkspaceMode;
  onModeChange?: (mode: WorkspaceMode) => void;
}



export const DualWorkspace: React.FC<DualWorkspaceProps> = ({
  userName,
  userAvatar = "",
  initialMode = 'single',
  onModeChange,
}) => {
  const [mode, setMode] = useState<WorkspaceMode>(initialMode);
  const [focusedWorkspace, setFocusedWorkspace] = useState<'A' | 'B'>('A');

  const {
    isConnected,
    isHost: _,
    remoteUserName,
    remoteUserColor,
    remoteCursors,
    initializeHost,
    connectToHost,
    disconnect,
    broadcastCursorPosition: __,
    broadcastCodeChange,
  } = useCollaboration();

  // Inject animations
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = dualWorkspaceAnimations;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  // Listen for remote file operations
  useEffect(() => {
    const handleRemoteOperation = (event: CustomEvent<FileOperation>) => {
      // Dispatch to local file system via custom event
      window.dispatchEvent(new CustomEvent('vfs-apply-operation', { detail: event.detail }));
    };

    const handleRemoteSync = (event: CustomEvent<any[]>) => {
      window.dispatchEvent(new CustomEvent('vfs-sync', { detail: event.detail }));
    };

    const handleRemoteCodeChange = (event: CustomEvent<{ fileId: string; content: string }>) => {
      // Update code in the other workspace if needed
      window.dispatchEvent(new CustomEvent('code-sync', { detail: event.detail }));
    };

    window.addEventListener('vfs-remote-operation' as any, handleRemoteOperation as any);
    window.addEventListener('vfs-remote-sync' as any, handleRemoteSync as any);
    window.addEventListener('code-remote-change' as any, handleRemoteCodeChange as any);

    return () => {
      window.removeEventListener('vfs-remote-operation' as any, handleRemoteOperation as any);
      window.removeEventListener('vfs-remote-sync' as any, handleRemoteSync as any);
      window.removeEventListener('code-remote-change' as any, handleRemoteCodeChange as any);
    };
  }, []);

  const handleModeToggle = useCallback(() => {
    const newMode: WorkspaceMode =
      mode === 'single' ? 'dual-horizontal' : mode === 'dual-horizontal' ? 'dual-stacked' : 'single';
    setMode(newMode);
    onModeChange?.(newMode);
  }, [mode, onModeChange]);

  const handleStartCollaboration = useCallback(async () => {
    try {
      const hostPeerId = await initializeHost(userName);
      // In a real app, you'd share this peerId via your signaling mechanism
      return hostPeerId;
    } catch (err) {
      console.error('Failed to initialize host:', err);
    }
  }, [initializeHost, userName]);

  const handleJoinCollaboration = useCallback(async () => {
    const hostPeerId = prompt('Enter host peer ID:');
    if (!hostPeerId) return;

    try {
      await connectToHost(hostPeerId, userName);
    } catch (err) {
      console.error('Failed to connect to host:', err);
      alert('Failed to connect. Please check the peer ID.');
    }
  }, [connectToHost, userName]);

  const handleContentChange = useCallback(
    (_workspace: 'A' | 'B', fileId: string, content: string) => {
      // Broadcast code changes to remote peer
      broadcastCodeChange(fileId, content, Date.now());
    },
    [broadcastCodeChange]
  );



  const handleWorkspaceFocus = useCallback((workspace: 'A' | 'B') => {
    setFocusedWorkspace(workspace);
  }, []);

  const renderWorkspace = (
    workspace: 'A' | 'B',
    user: string,
    avatar: string,
    color: string,
    isFocused: boolean
  ) => (
    <div
      key={workspace}
      style={{
        ...dualWorkspaceStyles.workspaceFrame,
        ...(workspace === 'A' ? dualWorkspaceStyles.workspaceFrameUserA : dualWorkspaceStyles.workspaceFrameUserB),
        ...(isFocused ? dualWorkspaceStyles.workspaceFrameFocused : {}),
      }}
      onClick={() => handleWorkspaceFocus(workspace)}
    >
      {/* Frame Header */}
      <div style={dualWorkspaceStyles.frameHeader}>
        <div style={dualWorkspaceStyles.frameOwner}>
          <img
            src={avatar}
            alt={user}
            style={{
              ...dualWorkspaceStyles.frameOwnerAvatar,
              borderColor: color,
            }}
          />
          <span style={dualWorkspaceStyles.frameOwnerName}>{user}</span>
        </div>
        <div
          style={{
            ...dualWorkspaceStyles.frameStatus,
            ...(isFocused ? dualWorkspaceStyles.frameStatusActive : {}),
          }}
        >
          {isFocused && <div style={dualWorkspaceStyles.collabStatusDot} />}
          {isFocused ? 'Editing' : 'Watching'}
        </div>
      </div>

      {/* Frame Content */}
      <div style={dualWorkspaceStyles.frameContent}>
        <IDEContainer
          workspaceId={`workspace-${workspace}`}
          onContentChange={(fileId, content) => handleContentChange(workspace, fileId, content)}
          remoteCursors={remoteCursors.filter((c) => c.fileId !== null)}
          readOnly={!isFocused}
        />
        {isFocused && <div style={dualWorkspaceStyles.focusOverlay} />}
      </div>
    </div>
  );

  return (
    <div style={dualWorkspaceStyles.container}>
      {/* Toolbar */}
      <div style={dualWorkspaceStyles.toolbar}>
        <h3 style={dualWorkspaceStyles.toolbarTitle}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" style={{ width: 18, height: 18 }}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="12" y1="3" x2="12" y2="21" />
            <line x1="3" y1="12" x2="21" y2="12" />
          </svg>
          Dual-Workspace IDE
        </h3>

        <div style={dualWorkspaceStyles.toolbarActions}>
          {/* Collaboration Status */}
          {isConnected && (
            <div style={dualWorkspaceStyles.collabStatus}>
              <div style={dualWorkspaceStyles.collabStatusDot} />
              <span>Connected to {remoteUserName || 'Peer'}</span>
            </div>
          )}

          {/* Collaboration Buttons */}
          {!isConnected && (
            <>
              <button
                style={dualWorkspaceStyles.toggleBtn}
                onClick={handleStartCollaboration}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(34, 197, 94, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                </svg>
                Host Session
              </button>
              <button
                style={dualWorkspaceStyles.toggleBtn}
                onClick={handleJoinCollaboration}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 212, 255, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                Join Session
              </button>
            </>
          )}

          {/* Mode Toggle */}
          <button
            style={{
              ...dualWorkspaceStyles.toggleBtn,
              ...(mode !== 'single' ? dualWorkspaceStyles.toggleBtnActive : {}),
            }}
            onClick={handleModeToggle}
            title={`Current: ${mode}. Click to change.`}
          >
            {mode === 'single' && (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
                Single
              </>
            )}
            {mode === 'dual-horizontal' && (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="12" y1="3" x2="12" y2="21" />
                </svg>
                Split Horizontal
              </>
            )}
            {mode === 'dual-stacked' && (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                </svg>
                Split Stacked
              </>
            )}
          </button>

          {/* Disconnect */}
          {isConnected && (
            <button
              style={{
                ...dualWorkspaceStyles.toggleBtn,
                background: 'rgba(239, 68, 68, 0.15)',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                color: '#ef4444',
              }}
              onClick={disconnect}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Workspace Area */}
      <div style={dualWorkspaceStyles.workspaceArea}>
        {mode === 'single' && (
          <div style={dualWorkspaceStyles.singleMode}>
            {renderWorkspace('A', userName, userAvatar, '#00d4ff', true)}
          </div>
        )}

        {mode === 'dual-horizontal' && (
          <div style={dualWorkspaceStyles.dualModeHorizontal}>
            {renderWorkspace('A', userName, userAvatar, '#00d4ff', focusedWorkspace === 'A')}
            {renderWorkspace('B', remoteUserName || 'Peer', userAvatar, remoteUserColor || '#ff6b6b', focusedWorkspace === 'B')}
          </div>
        )}

        {mode === 'dual-stacked' && (
          <div style={dualWorkspaceStyles.dualModeStacked}>
            {renderWorkspace('A', userName, userAvatar, '#00d4ff', focusedWorkspace === 'A')}
            {renderWorkspace('B', remoteUserName || 'Peer', userAvatar, remoteUserColor || '#ff6b6b', focusedWorkspace === 'B')}
          </div>
        )}
      </div>
    </div>
  );
};

export default DualWorkspace;
