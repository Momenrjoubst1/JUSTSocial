/**
 * File Explorer Sidebar Styles - Google Drive Style Icons
 */

import React from 'react';

export const fileExplorerStyles: any = {
  sidebar: {
    width: 260,
    minWidth: 200,
    maxWidth: 400,
    height: '100%',
    background: 'linear-gradient(180deg, rgba(17, 17, 27, 0.95) 0%, rgba(10, 10, 18, 0.98) 100%)',
    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column' as const,
    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s ease',
    overflow: 'hidden',
  },
  sidebarCollapsed: {
    width: 0,
    minWidth: 0,
    maxWidth: 0,
    borderRight: 'none',
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(255, 255, 255, 0.02)',
    flexShrink: 0,
  },
  headerTitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    gap: 4,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.04)',
    color: 'rgba(255, 255, 255, 0.6)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  actionBtnHover: {
    background: 'rgba(255, 255, 255, 0.08)',
    color: 'rgba(255, 255, 255, 0.9)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  treeContainer: {
    flex: 1,
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    padding: '8px 0',
  },
  treeContainerScroll: {
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(255, 255, 255, 0.1) transparent',
  },
  treeItem: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  treeItemRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 12px',
    gap: 8,
    cursor: 'pointer',
    transition: 'background 0.12s ease',
    userSelect: 'none' as const,
    position: 'relative' as const,
  },
  treeItemRowHover: {
    background: 'rgba(255, 255, 255, 0.04)',
  },
  treeItemRowActive: {
    background: 'rgba(0, 212, 255, 0.12)',
    borderLeft: '2px solid #00d4ff',
    paddingLeft: 10,
  },
  treeItemIndent: (level: number) => ({
    paddingLeft: 12 + level * 16,
  }),
  treeArrow: {
    width: 16,
    height: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255, 255, 255, 0.4)',
    transition: 'transform 0.2s ease',
    flexShrink: 0,
  },
  treeArrowExpanded: {
    transform: 'rotate(90deg)',
  },
  treeIcon: {
    width: 20,
    height: 20,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  treeName: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontWeight: 400,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    minWidth: 0,
  },
  treeNameEditing: {
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(0, 212, 255, 0.5)',
    borderRadius: 4,
    padding: '2px 6px',
    outline: 'none',
    color: '#fff',
    fontSize: 13,
  },
  contextMenu: {
    position: 'absolute' as const,
    background: 'rgba(20, 20, 30, 0.98)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
    padding: '4px 0',
    minWidth: 160,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    animation: 'fadeIn 0.15s ease-out',
  },
  contextMenuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'background 0.12s ease',
    border: 'none',
    background: 'transparent',
    width: '100%',
    textAlign: 'left' as const,
  },
  contextMenuItemHover: {
    background: 'rgba(0, 212, 255, 0.15)',
    color: '#00d4ff',
  },
  contextMenuDivider: {
    height: '1px',
    background: 'rgba(255, 255, 255, 0.08)',
    margin: '4px 0',
  },
  modalOverlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    animation: 'fadeIn 0.2s ease-out',
  },
  modal: {
    background: 'linear-gradient(145deg, rgba(30, 30, 45, 0.98) 0%, rgba(20, 20, 30, 0.98) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    padding: 24,
    minWidth: 320,
    maxWidth: 400,
    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)',
    animation: 'slideUp 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    margin: '0 0 16px 0',
  },
  modalInput: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.15)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box' as const,
  },
  modalInputFocus: {
    borderColor: '#00d4ff',
    boxShadow: '0 0 0 2px rgba(0, 212, 255, 0.15)',
  },
  modalActions: {
    display: 'flex',
    gap: 8,
    marginTop: 20,
    justifyContent: 'flex-end' as const,
  },
  modalBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  modalBtnPrimary: {
    background: 'linear-gradient(135deg, #007bff 0%, #00d4ff 100%)',
    color: '#fff',
    boxShadow: '0 2px 8px rgba(0, 123, 255, 0.3)',
  },
  modalBtnSecondary: {
    background: 'rgba(255, 255, 255, 0.08)',
    color: 'rgba(255, 255, 255, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
  },
  emptyState: {
    padding: '24px 16px',
    textAlign: 'center' as const,
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 13,
  },
  // Google Drive style colors
  fileIconHtml: { color: '#f4b400' },
  fileIconCss: { color: '#4285f4' },
  fileIconJs: { color: '#f4b400' },
  fileIconTs: { color: '#3178c6' },
  fileIconPython: { color: '#4285f4' },
  fileIconJson: { color: '#f4b400' },
  fileIconMarkdown: { color: '#ea4335' },
  fileIconDefault: { color: '#8ab4f8' },
  folderIcon: { color: '#f4b400' },
  folderIconOpen: { color: '#f4b400' },
};

export function getFileIconSvgPath(language: string): string {
  switch (language) {
    case 'html':
      return 'M14.23 12.08L14.66 7.2H5.41l-.4-4.54h13.98l.21-2.3H2.83l.81 9.12h10.23l-.57 6.66-5.28 1.44-5.28-1.44-.27-3.04H2.03l.49 5.48 5.5 1.5 5.5-1.5.76-8.54H14.23z';
    case 'css':
      return 'M14.23 12.08L14.66 7.2H5.41l-.4-4.54h13.98l.21-2.3H2.83l.81 9.12h10.23l-.57 6.66-5.28 1.44-5.28-1.44-.27-3.04H2.03l.49 5.48 5.5 1.5 5.5-1.5.76-8.54H14.23z';
    case 'javascript':
      return 'M3 3h18v18H3V3zm10.2 14.1c.7-.4 1.2-1 1.5-1.8.3-.8.4-1.8.2-3-.2-1-.6-1.8-1.3-2.4-.7-.6-1.6-.9-2.7-.9-.8 0-1.5.1-2.1.4-.6.3-1.1.7-1.4 1.2l1.3.9c.2-.3.5-.6.9-.8.4-.2.8-.3 1.3-.3.7 0 1.3.2 1.7.6.4.4.6 1 .6 1.7 0 .5-.1.9-.3 1.3-.2.4-.5.7-.9.9v1.4h-1.4v1.3h2.6v-1.5zm-4.4-1.4h1.6v3.8H8.8v-3.8z';
    case 'typescript':
      return 'M3 3h18v18H3V3zm11.3 14.3c.6.4 1.4.6 2.3.6.5 0 1-.1 1.4-.2.4-.2.8-.4 1.1-.7.3-.3.5-.6.7-1 .2-.4.2-.8.2-1.3 0-.7-.2-1.3-.5-1.8-.3-.5-.8-.9-1.4-1.2.5-.2.9-.5 1.2-.9.3-.4.4-.9.4-1.4 0-.5-.1-.9-.3-1.3-.2-.4-.5-.7-.9-.9-.4-.3-.8-.4-1.3-.5-.5-.1-1-.2-1.6-.2-.9 0-1.7.1-2.4.4-.7.3-1.2.7-1.6 1.2l1.2 1c.3-.4.7-.7 1.2-.9.5-.2 1-.3 1.6-.3.5 0 1 .1 1.3.3.3.2.5.5.5.9 0 .3-.1.5-.3.7-.2.2-.5.3-.8.4-.3.1-.7.2-1.1.2h-.8v1.3h.8c.5 0 .9.1 1.3.2.4.1.7.3.9.5.2.2.3.5.3.9 0 .4-.1.7-.4.9-.3.2-.7.3-1.2.3-.5 0-1-.1-1.4-.3-.4-.2-.8-.5-1.1-.9l-1.1 1.1c.3.5.7.9 1.2 1.2z';
    case 'python':
      return 'M9.5 3C7.5 3 7 3.8 7 5v2h5v1H6c-2 0-3 1-3 3s1 3 3 3h2v-2c0-1 1-2 2-2h5c1 0 2-1 2-3s-1-3-3-3h-2V5c0-1-.5-2-2.5-2zm-1 3c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zm7 8c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1z';
    case 'json':
      return 'M5 3h2v2H5v4H3V5c0-1.1.9-2 2-2zm14 0c1.1 0 2 .9 2 2v4h-2V5h-2V3h2zM5 19h2v2H5c-1.1 0-2-.9-2-2v-4h2v4zm14 0v-4h2v4c0 1.1-.9 2-2 2h-2v-2h2zM8 7h8v2H8V7zm0 8h8v2H8v-2z';
    case 'markdown':
      return 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 15H7v-4.5L5.5 12 4 10.5V15H2V9h2l1.5 1.5L7 9h2v6zm8 0h-2v-3.5L13.5 13 12 11.5V15h-2V9h2l1.5 1.5L15 9h2v6z';
    default:
      return 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 9V3.5L18.5 9H13z';
  }
}

export function getFolderIconSvgPath(isExpanded: boolean): string {
  if (isExpanded) {
    return 'M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z';
  }
  return 'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2h-8l-2-2z';
}
