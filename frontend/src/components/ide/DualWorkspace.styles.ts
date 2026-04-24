/**
 * DualWorkspace Styles
 * Glassmorphism theme for split/stacked collaborative editing
 */

import React from 'react';

export const dualWorkspaceStyles: Record<string, React.CSSProperties> = {
  // Main container
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, rgba(10, 10, 20, 0.95) 0%, rgba(15, 15, 30, 0.9) 100%)',
  },

  // Toolbar
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    background: 'rgba(255, 255, 255, 0.03)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    flexShrink: 0,
  },

  toolbarTitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.08em',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  toolbarActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  // Toggle button
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    letterSpacing: '0.03em',
  },

  toggleBtnActive: {
    background: 'rgba(0, 212, 255, 0.15)',
    borderColor: 'rgba(0, 212, 255, 0.4)',
    color: '#00d4ff',
    boxShadow: '0 0 20px rgba(0, 212, 255, 0.2)',
  },

  // Collaboration status
  collabStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 12,
    background: 'rgba(34, 197, 94, 0.15)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    color: '#22c55e',
    fontSize: 11,
    fontWeight: 600,
  },

  collabStatusDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#22c55e',
    boxShadow: '0 0 8px #22c55e',
    animation: 'pulse 2s ease-in-out infinite',
  },

  // Workspace area
  workspaceArea: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    position: 'relative' as const,
  },

  // Single mode
  singleMode: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },

  // Dual mode - horizontal split
  dualModeHorizontal: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row' as const,
    gap: 8,
    padding: 8,
    overflow: 'hidden',
  },

  // Dual mode - stacked (vertical)
  dualModeStacked: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    padding: 8,
    overflow: 'hidden',
  },

  // Individual workspace frame
  workspaceFrame: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    background: 'linear-gradient(145deg, rgba(20, 20, 35, 0.85) 0%, rgba(15, 15, 25, 0.9) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative' as const,
  },

  workspaceFrameFocused: {
    borderColor: 'rgba(0, 212, 255, 0.5)',
    boxShadow: '0 0 40px rgba(0, 212, 255, 0.15), 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  },

  workspaceFrameUserA: {
    borderTop: '2px solid rgba(0, 212, 255, 0.6)',
  },

  workspaceFrameUserB: {
    borderTop: '2px solid rgba(255, 107, 107, 0.6)',
  },

  // Frame header
  frameHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.02)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    flexShrink: 0,
  },

  frameOwner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  frameOwnerAvatar: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    objectFit: 'cover' as const,
  },

  frameOwnerName: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: 600,
  },

  frameStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    borderRadius: 10,
    background: 'rgba(255, 255, 255, 0.05)',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: 500,
  },

  frameStatusActive: {
    background: 'rgba(34, 197, 94, 0.15)',
    color: '#22c55e',
  },

  // Frame content
  frameContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    position: 'relative' as const,
  },

  // Focus overlay
  focusOverlay: {
    position: 'absolute' as const,
    inset: 0,
    background: 'rgba(0, 212, 255, 0.03)',
    pointerEvents: 'none' as const,
    transition: 'background 0.3s ease',
  },

  // Connection indicator
  connectionIndicator: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    zIndex: 100,
  },

  // Merge banner
  mergeBanner: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    padding: '10px 16px',
    background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(34, 197, 94, 0.1) 100%)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(0, 212, 255, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 200,
    animation: 'slideDown 0.3s ease-out',
  },

  mergeBannerText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  mergeBannerAction: {
    padding: '6px 14px',
    borderRadius: 6,
    border: 'none',
    background: 'linear-gradient(135deg, #007bff 0%, #00d4ff 100%)',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0, 123, 255, 0.3)',
  },

  // Empty state
  emptyState: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 13,
    fontStyle: 'italic',
  },

  // Resizer handle
  resizerHandle: {
    width: 8,
    background: 'rgba(255, 255, 255, 0.05)',
    border: 'none',
    cursor: 'col-resize',
    transition: 'background 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  resizerHandleHover: {
    background: 'rgba(0, 212, 255, 0.2)',
  },

  resizerHandleVertical: {
    height: 8,
    width: '100%',
    cursor: 'row-resize',
  },
};

// Animation keyframes
export const dualWorkspaceAnimations = `
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.1); }
  }
  
  @keyframes slideDown {
    from { transform: translateY(-100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;
