/**
 * Virtual File System Types
 */

export type FileType = 'file' | 'folder';

export interface FileNode {
  id: string;
  name: string;
  type: FileType;
  parentId: string | null;
  content?: string;
  language?: string;
  children?: string[]; // Array of child node IDs
  createdAt: number;
  updatedAt: number;
}

export interface FileSystemState {
  nodes: Map<string, FileNode>;
  rootId: string;
  openFiles: string[]; // Array of file IDs open in tabs
  activeFileId: string | null;
  expandedFolders: Set<string>;
}

export interface FileOperation {
  type: 'create' | 'update' | 'delete' | 'rename' | 'move';
  nodeId: string;
  parentId?: string | null;
  name?: string;
  content?: string;
  language?: string;
  timestamp: number;
  userId: string;
}

export interface RemoteCursor {
  userId: string;
  userName: string;
  fileId: string | null;
  position: { line: number; column: number };
  selection?: { start: { line: number; column: number }; end: { line: number; column: number } };
  color: string;
  lastUpdated: number;
}

export interface FileSystemActions {
  // File operations
  createFile: (parentId: string | null, name: string, content?: string, language?: string) => string;
  createFolder: (parentId: string | null, name: string) => string;
  updateFile: (fileId: string, content: string) => void;
  deleteNode: (nodeId: string) => void;
  renameNode: (nodeId: string, newName: string) => void;
  moveNode: (nodeId: string, newParentId: string | null) => void;
  
  // Tab management
  openFile: (fileId: string) => void;
  closeFile: (fileId: string) => void;
  setActiveFile: (fileId: string | null) => void;
  
  // Folder expansion
  toggleFolder: (folderId: string) => void;
  expandFolder: (folderId: string) => void;
  collapseFolder: (folderId: string) => void;
  
  // Bulk operations for sync
  applyRemoteOperation: (operation: FileOperation) => void;
  syncFromRemote: (nodes: FileNode[]) => void;
  
  // Export
  exportState: () => FileNode[];
}

export interface UseFileSystemReturn extends FileSystemState, FileSystemActions {
  getNode: (nodeId: string) => FileNode | undefined;
  getFileContent: (fileId: string) => string | undefined;
  getChildren: (parentId: string | null) => FileNode[];
  getFilePath: (nodeId: string) => string;
}
