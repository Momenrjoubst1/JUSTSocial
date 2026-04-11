/**
 * IDE Components Export
 * Central export for all IDE-related components
 */

export { FileExplorer } from './FileExplorer';
export { EditorTabs } from './EditorTabs';
export { CodeEditor } from './CodeEditor';
export { Terminal } from './Terminal';
export { IDEContainer } from './IDEContainer';
export { DualWorkspace } from './DualWorkspace';

// Styles
export { fileExplorerStyles } from './FileExplorer.styles';
export { editorTabsStyles, getTabFileIconSvgPath as getTabFileIcon } from './EditorTabs.styles';
export { dualWorkspaceStyles, dualWorkspaceAnimations } from './DualWorkspace.styles';

// Types
export type { FileNode, FileSystemState, FileOperation, RemoteCursor } from '@/hooks/useFileSystem.types';

// Hooks
export { useFileSystem } from '@/hooks/useFileSystem';
export { useCollaboration } from '@/hooks/useCollaboration';
