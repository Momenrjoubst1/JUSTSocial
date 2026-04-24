/**
 * Enhanced IDE Mode Styles for VideoChatPage
 */

import React from 'react';

export const enhancedIDEStyles: Record<string, React.CSSProperties> = {
  // Main IDE container overlay
  ideOverlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 30,
    background: '#080810',
    animation: 'fadeIn 0.4s ease-out',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  // IDE header bar
  ideHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    background: 'linear-gradient(135deg, rgba(20, 20, 35, 0.95) 0%, rgba(15, 15, 25, 0.98) 100%)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    flexShrink: 0,
  },

  ideTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '0.05em',
  },

  ideTitleIcon: {
    width: 20,
    height: 20,
    color: '#00d4ff',
  },

  ideActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  // IDE action button
  ideActionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)',
  },

  ideActionBtnPrimary: {
    background: 'linear-gradient(135deg, rgba(0, 123, 255, 0.25) 0%, rgba(0, 212, 255, 0.2) 100%)',
    borderColor: 'rgba(0, 212, 255, 0.4)',
    color: '#00d4ff',
    boxShadow: '0 0 20px rgba(0, 212, 255, 0.15)',
  },

  ideActionBtnDanger: {
    background: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    color: '#ef4444',
  },

  // IDE body
  ideBody: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },

  // Video panel in IDE mode
  ideVideoPanel: {
    width: 280,
    background: 'rgba(10, 10, 15, 0.5)',
    borderRight: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 12,
    overflowY: 'auto',
  },

  ideVideoPanelCollapsed: {
    width: 0,
    padding: 0,
    borderRight: 'none',
    overflow: 'hidden',
  },

  // Video card
  ideVideoCard: {
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(0, 0, 0, 0.3)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
  },

  ideVideo: {
    width: '100%',
    height: 'auto',
    aspectRatio: '16/9',
    objectFit: 'cover',
    display: 'block',
  },

  ideVideoLabel: {
    padding: '6px 10px',
    background: 'rgba(0, 0, 0, 0.5)',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },

  // IDE content area
  ideContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  // Dual workspace container
  dualWorkspaceContainer: {
    flex: 1,
    display: 'flex',
    gap: 8,
    padding: 8,
    overflow: 'hidden',
  },

  // Workspace frame
  workspaceFrame: {
    flex: 1,
    background: 'linear-gradient(145deg, rgba(20, 20, 35, 0.85) 0%, rgba(15, 15, 25, 0.9) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

  workspaceFrameA: {
    borderTop: '2px solid rgba(0, 212, 255, 0.6)',
  },

  workspaceFrameB: {
    borderTop: '2px solid rgba(255, 107, 107, 0.6)',
  },

  // Workspace header
  workspaceHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.02)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  },

  workspaceUserInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  workspaceAvatar: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    border: '2px solid rgba(255, 255, 255, 0.2)',
  },

  workspaceUserName: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: 600,
  },

  workspaceStatus: {
    padding: '3px 8px',
    borderRadius: 10,
    background: 'rgba(34, 197, 94, 0.15)',
    color: '#22c55e',
    fontSize: 10,
    fontWeight: 600,
  },

  // Close button
  ideCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: '1px solid rgba(255, 255, 255, 0.15)',
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(12px)',
    color: 'rgba(255, 255, 255, 0.7)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    fontSize: 18,
  },

  // Mode toggle
  modeToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  modeToggleActive: {
    background: 'rgba(0, 212, 255, 0.15)',
    borderColor: 'rgba(0, 212, 255, 0.4)',
    color: '#00d4ff',
    boxShadow: '0 0 15px rgba(0, 212, 255, 0.2)',
  },

  // Connection indicator
  connectionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 10px',
    borderRadius: 12,
    background: 'rgba(34, 197, 94, 0.15)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    color: '#22c55e',
    fontSize: 11,
    fontWeight: 600,
  },

  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#22c55e',
    boxShadow: '0 0 8px #22c55e',
    animation: 'pulse 2s ease-in-out infinite',
  },

  // Video toggle button
  videoToggleBtn: {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    transition: 'all 0.15s ease',
  },

  videoToggleBtnActive: {
    background: 'rgba(0, 212, 255, 0.15)',
    borderColor: 'rgba(0, 212, 255, 0.3)',
    color: '#00d4ff',
  },
};

// Animation keyframes
export const enhancedIDEAnimations = `
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
  
  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;
