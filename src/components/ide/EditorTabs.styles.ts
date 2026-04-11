/**
 * Editor Tabs Styles - Google Drive Style Icons
 */

import React from 'react';

export const editorTabsStyles: any = {
  tabsContainer: {
    display: 'flex',
    alignItems: 'center',
    height: 36,
    background: 'rgba(10, 10, 15, 0.95)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    overflowX: 'auto' as const,
    overflowY: 'hidden' as const,
    flexShrink: 0,
    scrollbarWidth: 'none',
    msOverflowStyle: 'none' as const,
  },
  tabsContainerScroll: {
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    '&::-webkit-scrollbar': {
      display: 'none',
    },
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 12px',
    height: '100%',
    minWidth: 120,
    maxWidth: 200,
    background: 'transparent',
    border: 'none',
    borderRight: '1px solid rgba(255, 255, 255, 0.04)',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
    position: 'relative' as const,
    userSelect: 'none' as const,
  },
  tabHover: {
    background: 'rgba(255, 255, 255, 0.04)',
  },
  tabActive: {
    background: 'rgba(20, 20, 30, 0.95)',
    borderTop: '2px solid #00d4ff',
    paddingTop: 0,
  },
  tabModified: {
    borderTop: '2px solid #f59e0b',
    paddingTop: 0,
  },
  tabIcon: {
    width: 18,
    height: 18,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabName: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: 400,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    minWidth: 0,
  },
  tabNameActive: {
    color: '#fff',
    fontWeight: 500,
  },
  tabClose: {
    width: 20,
    height: 20,
    borderRadius: 4,
    border: 'none',
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.4)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'all 0.15s ease',
    flexShrink: 0,
  },
  tabCloseVisible: {
    opacity: 1,
  },
  tabCloseHover: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
  },
  tabContextMenu: {
    position: 'absolute' as const,
    background: 'rgba(20, 20, 30, 0.98)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
    padding: '4px 0',
    minWidth: 140,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    animation: 'fadeIn 0.15s ease-out',
  },
  tabContextMenuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'background 0.12s ease',
    border: 'none',
    background: 'transparent',
    width: '100%',
    textAlign: 'left' as const,
  },
  tabContextMenuItemHover: {
    background: 'rgba(0, 212, 255, 0.15)',
    color: '#00d4ff',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 13,
    fontStyle: 'italic',
  },
};

export const tabFileIconColors: Record<string, string> = {
  html: '#f4b400',
  css: '#4285f4',
  javascript: '#f4b400',
  typescript: '#3178c6',
  python: '#4285f4',
  json: '#f4b400',
  markdown: '#ea4335',
  default: '#8ab4f8',
};

export function getTabFileIconSvgPath(language: string): string {
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
