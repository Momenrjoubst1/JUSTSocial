/**
 * useFileSystem - Virtual File System Hook
 * Manages in-memory file tree with CRUD operations
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  FileNode,
  FileSystemState,
  FileOperation,
  UseFileSystemReturn,
} from './useFileSystem.types';

const DEFAULT_FILES: FileNode[] = [
  {
    id: 'root',
    name: 'project',
    type: 'folder',
    parentId: null,
    children: ['file-1', 'file-2', 'file-3', 'folder-1'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'file-1',
    name: 'index.html',
    type: 'file',
    parentId: 'root',
    content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Skill Swap IDE</title>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n  <script src="app.js"></script>\n</body>\n</html>',
    language: 'html',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'file-2',
    name: 'app.js',
    type: 'file',
    parentId: 'root',
    content: "// Welcome to Skill Swap IDE!\nconsole.log('Hello from the collaborative IDE!');\n\nfunction greet(name) {\n  return `Welcome, ${name}!`;\n}\n\ngreet('Developer');",
    language: 'javascript',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'file-3',
    name: 'styles.css',
    type: 'file',
    parentId: 'root',
    content: '/* Global Styles */\nbody {\n  font-family: \'Inter\', sans-serif;\n  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);\n  color: #ffffff;\n  margin: 0;\n  padding: 20px;\n}\n\nh1 {\n  color: #00d4ff;\n  text-shadow: 0 0 20px rgba(0, 212, 255, 0.5);\n}',
    language: 'css',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'folder-1',
    name: 'utils',
    type: 'folder',
    parentId: 'root',
    children: ['file-4'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'file-4',
    name: 'helpers.js',
    type: 'file',
    parentId: 'folder-1',
    content: '// Utility Functions\nexport function formatDate(date) {\n  return new Intl.DateTimeFormat(\'en-US\').format(date);\n}\n\nexport function debounce(fn, delay) {\n  let timeoutId;\n  return (...args) => {\n    clearTimeout(timeoutId);\n    timeoutId = setTimeout(() => fn(...args), delay);\n  };\n}',
    language: 'javascript',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    json: 'json',
    cpp: 'cpp',
    c: 'cpp',
    java: 'java',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    php: 'php',
    sh: 'shell',
    md: 'markdown',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
  };
  return langMap[ext || ''] || 'plaintext';
}

export function useFileSystem(initialFiles: FileNode[] = DEFAULT_FILES): UseFileSystemReturn {
  const [nodes, setNodes] = useState<Map<string, FileNode>>(() => {
    const map = new Map<string, FileNode>();
    initialFiles.forEach((node) => map.set(node.id, { ...node }));
    return map;
  });

  const [rootId] = useState<string>('root');
  const [openFiles, setOpenFiles] = useState<string[]>(['file-1', 'file-2']);
  const [activeFileId, setActiveFileId] = useState<string | null>('file-1');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root', 'folder-1']));

  // Monaco editor models cache (preserves undo history, cursor position)
  const modelsRef = useRef<Map<string, any>>(new Map());

  const getNode = useCallback((nodeId: string): FileNode | undefined => {
    return nodes.get(nodeId);
  }, [nodes]);

  const getFileContent = useCallback((fileId: string): string | undefined => {
    const node = nodes.get(fileId);
    return node?.type === 'file' ? node.content : undefined;
  }, [nodes]);

  const getChildren = useCallback((parentId: string | null): FileNode[] => {
    const parent = parentId ? nodes.get(parentId) : null;
    const childrenIds = parent?.children || (parentId === null ? ['root'] : []);
    
    if (parentId === null) {
      // Return root's children
      const rootNode = nodes.get(rootId);
      return rootNode?.children?.map((id) => nodes.get(id)).filter((n): n is FileNode => !!n) || [];
    }
    
    return childrenIds
      .map((id) => nodes.get(id))
      .filter((n): n is FileNode => !!n)
      .sort((a, b) => {
        // Folders first, then files, alphabetically
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [nodes, rootId]);

  const getFilePath = useCallback((nodeId: string): string => {
    const path: string[] = [];
    let current: FileNode | undefined = nodes.get(nodeId);
    
    while (current) {
      path.unshift(current.name);
      if (current.parentId === null || current.parentId === 'root') {
        if (current.id !== 'root') path.unshift('');
        break;
      }
      current = nodes.get(current.parentId);
    }
    
    return path.join('/');
  }, [nodes]);

  const createFile = useCallback((parentId: string | null, name: string, content: string = '', language?: string): string => {
    const fileId = generateId();
    const detectedLang = language || detectLanguage(name);
    
    const newFile: FileNode = {
      id: fileId,
      name,
      type: 'file',
      parentId: parentId || rootId,
      content,
      language: detectedLang,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setNodes((prev) => {
      const next = new Map(prev);
      next.set(fileId, newFile);
      
      // Add to parent's children
      const parent = parentId ? next.get(parentId) : next.get(rootId);
      if (parent && parent.type === 'folder') {
        next.set(parent.id, {
          ...parent,
          children: [...(parent.children || []), fileId],
          updatedAt: Date.now(),
        });
      }
      
      return next;
    });

    // Auto-open the new file
    setOpenFiles((prev) => [...prev, fileId]);
    setActiveFileId(fileId);

    return fileId;
  }, [rootId]);

  const createFolder = useCallback((parentId: string | null, name: string): string => {
    const folderId = generateId();
    
    const newFolder: FileNode = {
      id: folderId,
      name,
      type: 'folder',
      parentId: parentId || rootId,
      children: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setNodes((prev) => {
      const next = new Map(prev);
      next.set(folderId, newFolder);
      
      // Add to parent's children
      const parent = parentId ? next.get(parentId) : next.get(rootId);
      if (parent && parent.type === 'folder') {
        next.set(parent.id, {
          ...parent,
          children: [...(parent.children || []), folderId],
          updatedAt: Date.now(),
        });
      }
      
      return next;
    });

    setExpandedFolders((prev) => new Set(prev).add(folderId));

    return folderId;
  }, [rootId]);

  const updateFile = useCallback((fileId: string, content: string) => {
    setNodes((prev) => {
      const node = prev.get(fileId);
      if (!node || node.type !== 'file') return prev;
      
      const next = new Map(prev);
      next.set(fileId, {
        ...node,
        content,
        updatedAt: Date.now(),
      });
      return next;
    });
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    const node = nodes.get(nodeId);
    if (!node || nodeId === 'root') return;

    // Recursively collect all IDs to delete
    const idsToDelete = new Set<string>([nodeId]);
    const collectChildren = (id: string) => {
      const n = nodes.get(id);
      if (n?.type === 'folder' && n.children) {
        n.children.forEach((childId) => {
          idsToDelete.add(childId);
          collectChildren(childId);
        });
      }
    };
    collectChildren(nodeId);

    setNodes((prev) => {
      const next = new Map(prev);
      
      // Remove from parent's children
      const parent = node.parentId ? next.get(node.parentId) : next.get(rootId);
      if (parent && parent.type === 'folder') {
        next.set(parent.id, {
          ...parent,
          children: parent.children?.filter((id) => id !== nodeId) || [],
          updatedAt: Date.now(),
        });
      }
      
      // Delete all nodes
      idsToDelete.forEach((id) => next.delete(id));
      
      return next;
    });

    // Close file if open
    setOpenFiles((prev) => prev.filter((id) => id !== nodeId));
    if (activeFileId === nodeId) {
      setActiveFileId(null);
    }
  }, [nodes, rootId, activeFileId]);

  const renameNode = useCallback((nodeId: string, newName: string) => {
    setNodes((prev) => {
      const node = prev.get(nodeId);
      if (!node) return prev;
      
      const next = new Map(prev);
      const updatedLang = node.type === 'file' ? detectLanguage(newName) : undefined;
      next.set(nodeId, {
        ...node,
        name: newName,
        ...(updatedLang ? { language: updatedLang } : {}),
        updatedAt: Date.now(),
      });
      return next;
    });
  }, []);

  const moveNode = useCallback((nodeId: string, newParentId: string | null) => {
    const node = nodes.get(nodeId);
    if (!node || nodeId === 'root') return;

    const oldParentId = node.parentId;

    setNodes((prev) => {
      const next = new Map(prev);
      
      // Remove from old parent
      if (oldParentId && oldParentId !== 'root') {
        const oldParent = next.get(oldParentId);
        if (oldParent?.type === 'folder') {
          next.set(oldParentId, {
            ...oldParent,
            children: oldParent.children?.filter((id) => id !== nodeId) || [],
            updatedAt: Date.now(),
          });
        }
      }
      
      // Add to new parent
      const newParent = newParentId ? next.get(newParentId) : next.get(rootId);
      if (newParent?.type === 'folder') {
        next.set(newParentId || rootId, {
          ...newParent,
          children: [...(newParent.children || []), nodeId],
          updatedAt: Date.now(),
        });
      }
      
      // Update node's parent
      next.set(nodeId, {
        ...node,
        parentId: newParentId || rootId,
        updatedAt: Date.now(),
      });
      
      return next;
    });
  }, [nodes, rootId]);

  const openFile = useCallback((fileId: string) => {
    const node = nodes.get(fileId);
    if (node?.type !== 'file') return;
    
    setOpenFiles((prev) => {
      if (prev.includes(fileId)) return prev;
      return [...prev, fileId];
    });
    setActiveFileId(fileId);
  }, [nodes]);

  const closeFile = useCallback((fileId: string) => {
    setOpenFiles((prev) => {
      const filtered = prev.filter((id) => id !== fileId);
      // If closing active file, activate another
      if (activeFileId === fileId && filtered.length > 0) {
        setActiveFileId(filtered[filtered.length - 1]);
      } else if (filtered.length === 0) {
        setActiveFileId(null);
      }
      return filtered;
    });
    
    // Clean up model cache
    modelsRef.current.delete(fileId);
  }, [activeFileId]);

  const setActiveFile = useCallback((fileId: string | null) => {
    setActiveFileId(fileId);
  }, []);

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const expandFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => new Set(prev).add(folderId));
  }, []);

  const collapseFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.delete(folderId);
      return next;
    });
  }, []);

  const applyRemoteOperation = useCallback((operation: FileOperation) => {
    switch (operation.type) {
      case 'create':
        if (operation.name) {
          const isFolder = operation.content === undefined;
          const newNode: FileNode = {
            id: operation.nodeId,
            name: operation.name,
            type: isFolder ? 'folder' : 'file',
            parentId: operation.parentId ?? rootId,
            ...(isFolder ? { children: [] } : { content: operation.content || '', language: operation.language }),
            createdAt: operation.timestamp,
            updatedAt: operation.timestamp,
          };
          
          setNodes((prev) => {
            const next = new Map(prev);
            next.set(operation.nodeId, newNode);
            
            const parent = operation.parentId ? next.get(operation.parentId) : next.get(rootId);
            if (parent?.type === 'folder') {
              next.set(parent.id, {
                ...parent,
                children: [...(parent.children || []), operation.nodeId],
                updatedAt: operation.timestamp,
              });
            }
            
            return next;
          });
        }
        break;
        
      case 'update':
        if (operation.content !== undefined) {
          setNodes((prev) => {
            const node = prev.get(operation.nodeId);
            if (!node || node.type !== 'file') return prev;
            const next = new Map(prev);
            next.set(operation.nodeId, {
              ...node,
              content: operation.content,
              updatedAt: operation.timestamp,
            });
            return next;
          });
        }
        break;
        
      case 'delete':
        deleteNode(operation.nodeId);
        break;
        
      case 'rename':
        if (operation.name) {
          renameNode(operation.nodeId, operation.name);
        }
        break;
        
      case 'move':
        moveNode(operation.nodeId, operation.parentId ?? null);
        break;
    }
  }, [rootId, deleteNode, renameNode, moveNode]);

  const syncFromRemote = useCallback((remoteNodes: FileNode[]) => {
    setNodes((prev) => {
      const next = new Map(prev);
      remoteNodes.forEach((node) => {
        const existing = next.get(node.id);
        if (!existing || node.updatedAt > existing.updatedAt) {
          next.set(node.id, { ...node });
        }
      });
      return next;
    });
  }, []);

  const exportState = useCallback((): FileNode[] => {
    return Array.from(nodes.values());
  }, [nodes]);

  return useMemo(() => ({
    nodes,
    rootId,
    openFiles,
    activeFileId,
    expandedFolders,
    getNode,
    getFileContent,
    getChildren,
    getFilePath,
    createFile,
    createFolder,
    updateFile,
    deleteNode,
    renameNode,
    moveNode,
    openFile,
    closeFile,
    setActiveFile,
    toggleFolder,
    expandFolder,
    collapseFolder,
    applyRemoteOperation,
    syncFromRemote,
    exportState,
  }), [
    nodes,
    rootId,
    openFiles,
    activeFileId,
    expandedFolders,
    getNode,
    getFileContent,
    getChildren,
    getFilePath,
    createFile,
    createFolder,
    updateFile,
    deleteNode,
    renameNode,
    moveNode,
    openFile,
    closeFile,
    setActiveFile,
    toggleFolder,
    expandFolder,
    collapseFolder,
    applyRemoteOperation,
    syncFromRemote,
    exportState,
  ]);
}
