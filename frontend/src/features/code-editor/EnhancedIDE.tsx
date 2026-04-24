/**
 * EnhancedIDE Component
 * Full-featured IDE integration for VideoChatPage with collaborative features
 * Single Mode: Both users edit the SAME file together
 * Dual Mode: Each user has their own workspace
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { IDEContainer } from '@/components/ide/IDEContainer';
import { DualWorkspace } from '@/components/ide/DualWorkspace';
import { enhancedIDEStyles, enhancedIDEAnimations } from '@/features/code-editor/EnhancedIDE.styles';

interface EnhancedIDEProps {
  userEmail?: string;
  onClose: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

type IDEMode = 'single' | 'dual';
type LayoutMode = 'horizontal' | 'stacked';

export const EnhancedIDE: React.FC<EnhancedIDEProps> = React.memo(({
  userEmail = 'user@skillswap.dev',
  onClose,
  localStream,
  remoteStream,
}) => {
  const userName = userEmail.split('@')[0];
  const userAvatar = "";

  const [ideMode, setIdeMode] = useState<IDEMode>('single');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('horizontal');
  const [showVideos, setShowVideos] = useState(true);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [, setIsHost] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const collaborationInitialized = useRef(false);

  // Inject animations
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = enhancedIDEAnimations;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  // Sync video streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream, showVideos]);

  // Initialize collaboration automatically when IDE opens
  useEffect(() => {
    if (!collaborationInitialized.current && remoteStream) {
      // We're connected to someone, auto-start collaboration
      initializeCollaboration();
      collaborationInitialized.current = true;
    }
  }, [remoteStream]);

  const initializeCollaboration = useCallback(async () => {
    // In a real implementation, you would use PeerJS to connect
    // For now, we'll just enable the collaborative mode
    setIsCollaborating(true);
    // Randomly assign host/client for demo
    setIsHost(Math.random() > 0.5);
  }, []);

  const handleModeToggle = useCallback(() => {
    setIdeMode((prev) => {
      const newMode = prev === 'single' ? 'dual' : 'single';
      return newMode;
    });
  }, []);

  const handleLayoutToggle = useCallback(() => {
    setLayoutMode((prev) => (prev === 'horizontal' ? 'stacked' : 'horizontal'));
  }, []);

  const handleContentChange = useCallback((fileId: string, content: string) => {
    // In single mode with collaboration, broadcast changes to remote peer
    if (isCollaborating && ideMode === 'single') {
      // Broadcast to PeerJS data channel
      const dataChannel = (window as any).dataChannelRef?.current;
      if (dataChannel?.readyState === 'open') {
        dataChannel.send(JSON.stringify({
          type: 'code-update',
          content,
          fileId,
          timestamp: Date.now(),
        }));
      }
    }
  }, [isCollaborating, ideMode]);

  const handleCommandExecute = useCallback((_command: string) => {
    // Command execution handled by terminal
  }, []);

  return (
    <div style={enhancedIDEStyles.ideOverlay}>
      {/* Header */}
      <div style={enhancedIDEStyles.ideHeader}>
        <div style={enhancedIDEStyles.ideTitle}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={enhancedIDEStyles.ideTitleIcon}>
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span>Skill Swap IDE - Collaborative Editor</span>
          {isCollaborating && (
            <div style={enhancedIDEStyles.connectionBadge}>
              <div style={enhancedIDEStyles.connectionDot} />
              <span>
                {ideMode === 'single'
                  ? 'Collaborating on Same File'
                  : 'Dual Workspace Mode'}
              </span>
            </div>
          )}
        </div>

        <div style={enhancedIDEStyles.ideActions}>
          {/* Video Toggle */}
          <button
            style={{
              ...enhancedIDEStyles.ideActionBtn,
              ...(showVideos ? enhancedIDEStyles.ideActionBtnPrimary : {}),
            }}
            onClick={() => setShowVideos(!showVideos)}
            title={showVideos ? 'Hide Videos' : 'Show Videos'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            {showVideos ? 'Videos On' : 'Videos Off'}
          </button>

          {/* Collaboration Toggle */}
          <button
            style={{
              ...enhancedIDEStyles.ideActionBtn,
              ...(isCollaborating ? enhancedIDEStyles.ideActionBtnPrimary : {}),
            }}
            onClick={() => {
              setIsCollaborating(!isCollaborating);
              if (!isCollaborating) {
                initializeCollaboration();
              }
            }}
            title={isCollaborating ? 'Disable Collaboration' : 'Enable Collaboration'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              {isCollaborating ? (
                <>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  <line x1="2" y1="2" x2="22" y2="22" stroke="#22c55e" strokeWidth="3" />
                </>
              ) : (
                <>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </>
              )}
            </svg>
            {isCollaborating ? 'Collaborating' : 'Collaborate'}
          </button>

          {/* Mode Toggle (only when collaborating) */}
          {isCollaborating && (
            <button
              style={{
                ...enhancedIDEStyles.modeToggle,
                ...(ideMode === 'dual' ? enhancedIDEStyles.modeToggleActive : {}),
              }}
              onClick={handleModeToggle}
              title={ideMode === 'single'
                ? 'Switch to Dual Workspace (each person has their own editor)'
                : 'Switch to Single Workspace (both edit the same file)'}
            >
              {ideMode === 'single' ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v2" />
                    <path d="M12 20v2" />
                    <path d="M2 12h2" />
                    <path d="M20 12h2" />
                  </svg>
                  Single (Together)
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                    {layoutMode === 'horizontal' ? (
                      <>
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <line x1="12" y1="3" x2="12" y2="21" />
                      </>
                    ) : (
                      <>
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                      </>
                    )}
                  </svg>
                  Dual (Separate)
                </>
              )}
            </button>
          )}

          {/* Layout Toggle (only in dual mode) */}
          {isCollaborating && ideMode === 'dual' && (
            <button
              style={enhancedIDEStyles.modeToggle}
              onClick={handleLayoutToggle}
              title={`Layout: ${layoutMode === 'horizontal' ? 'Side by Side' : 'Stacked'}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                {layoutMode === 'horizontal' ? (
                  <>
                    <rect x="3" y="3" width="7" height="18" rx="1" />
                    <rect x="14" y="3" width="7" height="18" rx="1" />
                  </>
                ) : (
                  <>
                    <rect x="3" y="3" width="18" height="7" rx="1" />
                    <rect x="3" y="14" width="18" height="7" rx="1" />
                  </>
                )}
              </svg>
            </button>
          )}

          {/* Close Button */}
          <button
            style={{
              ...enhancedIDEStyles.ideCloseBtn,
              ...enhancedIDEStyles.ideActionBtnDanger,
            }}
            onClick={onClose}
            title="Close IDE"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{
        ...enhancedIDEStyles.ideBody,
        flexDirection: 'row-reverse', // Video panel on the RIGHT side
      }}>
        {/* Video Panel (optional) */}
        {showVideos && (
          <div style={{
            ...enhancedIDEStyles.ideVideoPanel,
            borderRight: '1px solid rgba(255, 255, 255, 0.06)',
            borderLeft: 'none',
          }}>
            {/* Local Video - Mirror effect */}
            <div style={enhancedIDEStyles.ideVideoCard}>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  ...enhancedIDEStyles.ideVideo,
                  transform: 'scaleX(-1)', // Mirror effect - like looking in mirror
                }}
              />
              <div style={enhancedIDEStyles.ideVideoLabel}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                You ({userName})
              </div>
            </div>

            {/* Remote Video - Always show when connected */}
            {remoteStream && (
              <div style={enhancedIDEStyles.ideVideoCard}>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  style={enhancedIDEStyles.ideVideo}
                />
                <div style={enhancedIDEStyles.ideVideoLabel}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Remote Peer
                </div>
              </div>
            )}

            {/* No Remote Video Placeholder */}
            {!remoteStream && (
              <div style={{
                ...enhancedIDEStyles.ideVideoCard,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 100,
              }}>
                <div style={{
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: 12,
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 32, height: 32, margin: '0 auto 8px' }}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Waiting for peer...
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main IDE Content */}
        <div style={enhancedIDEStyles.ideContent}>
          {ideMode === 'single' ? (
            // SINGLE MODE: Both users edit the SAME file together
            <div style={enhancedIDEStyles.workspaceFrame}>
              {/* Collaboration Banner for Single Mode */}
              {isCollaborating && (
                <div style={enhancedIDEStyles.mergeBanner}>
                  <div style={enhancedIDEStyles.mergeBannerText}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" style={{ width: 18, height: 18 }}>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>
                      <strong>Collaborative Editing Enabled</strong> - Both of you are editing this file together in real-time
                    </span>
                  </div>
                </div>
              )}
              <IDEContainer
                workspaceId="shared"
                onContentChange={handleContentChange}
                onCommandExecute={handleCommandExecute}
              />
            </div>
          ) : (
            // DUAL MODE: Each user has their own workspace
            <DualWorkspace
              userName={userName}
              userAvatar={userAvatar}
              initialMode={layoutMode === 'horizontal' ? 'dual-horizontal' : 'dual-stacked'}
              onModeChange={(mode) => {
                if (mode === 'single') setIdeMode('single');
                else if (mode === 'dual-horizontal') setLayoutMode('horizontal');
                else if (mode === 'dual-stacked') setLayoutMode('stacked');
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
});

export default EnhancedIDE;
