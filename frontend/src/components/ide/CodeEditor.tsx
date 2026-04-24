/**
 * CodeEditor Component
 * Monaco Editor wrapper with multi-model support for preserving state
 */

import React, { useRef, useEffect, useCallback } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import { useFileSystem } from '@/hooks/useFileSystem';
import { RemoteCursor } from '@/hooks/useFileSystem.types';

interface CodeEditorProps {
  height?: string;
  onContentChange?: (fileId: string, content: string) => void;
  remoteCursors?: RemoteCursor[];
  readOnly?: boolean;
  workspaceId?: string; // For dual-workspace mode
}

// Store editor instances and models
const editorInstances = new Map<string, unknown>();
const monacoRef: { current: unknown } = { current: null };

export const CodeEditor: React.FC<CodeEditorProps> = ({
  height = '100%',
  onContentChange,
  remoteCursors = [],
  readOnly = false,
  workspaceId = 'default',
}) => {
  const fs = useFileSystem();
  const editorRef = useRef<any>(null);
  const monacoRefLocal = useRef<any>(null);
  const decorationsRef = useRef<Map<string, string[]>>(new Map());

  const activeFile = fs.activeFileId ? fs.getNode(fs.activeFileId) : null;

  // Handle editor mount
  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRefLocal.current = monaco;
    monacoRef.current = monaco;

    // Store editor instance for this workspace
    editorInstances.set(workspaceId, editor);

    // Configure Monaco
    monaco.editor.defineTheme('skillswap-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
        { token: 'string', foreground: 'ce9178' },
        { token: 'number', foreground: 'b5cea8' },
        { token: 'keyword', foreground: '569cd6' },
        { token: 'type', foreground: '4ec9b0' },
        { token: 'function', foreground: 'dcdcaa' },
        { token: 'variable', foreground: '9cdcfe' },
        { token: 'operator', foreground: 'd4d4d4' },
      ],
      colors: {
        'editor.background': '#0a0a0f',
        'editor.foreground': '#d4d4d4',
        'editor.lineHighlightBackground': '#1a1a2e',
        'editorLineNumber.foreground': '#6a6a7a',
        'editorLineNumber.activeForeground': '#00d4ff',
        'editorCursor.foreground': '#00d4ff',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#1a2f3f',
        'editorIndentGuide.background': '#1a1a2e',
        'editorIndentGuide.activeBackground': '#2a2a3e',
        'editorHoverWidget.background': '#1a1a2e',
        'editorHoverWidget.border': '#2a2a3e',
        'editorWidget.background': '#1a1a2e',
        'editorWidget.border': '#2a2a3e',
        'input.background': '#0a0a0f',
        'input.border': '#2a2a3e',
        'scrollbarSlider.background': '#2a2a3e80',
        'scrollbarSlider.hoverBackground': '#3a3a4e80',
        'scrollbarSlider.activeBackground': '#4a4a5e80',
      },
    });

    monaco.editor.setTheme('skillswap-dark');

    // Update editor options
    editor.updateOptions({
      minimap: { enabled: true },
      fontSize: 14,
      padding: { top: 10, bottom: 10 },
      lineNumbers: 'on',
      roundedSelection: true,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
      fontLigatures: true,
      smoothScrolling: true,
      cursorSmoothCaretAnimation: 'on',
      cursorBlinking: 'smooth',
      suggestSelection: 'first',
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      tabSize: 2,
      insertSpaces: true,
      detectIndentation: true,
      wordWrap: 'off',
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
      },
      readOnly,
    });

    // Listen for content changes
    editor.onDidChangeModelContent(() => {
      if (fs.activeFileId) {
        const content = editor.getValue();
        fs.updateFile(fs.activeFileId, content);
        onContentChange?.(fs.activeFileId, content);
      }
    });
  }, [fs, onContentChange, readOnly, workspaceId]);

  // Handle content change
  const handleChange: OnChange = useCallback((value) => {
    if (fs.activeFileId && value !== undefined) {
      fs.updateFile(fs.activeFileId, value);
      onContentChange?.(fs.activeFileId, value);
    }
  }, [fs, onContentChange]);

  // Update editor when active file changes
  useEffect(() => {
    if (!editorRef.current || !monacoRefLocal.current) return;

    const editor = editorRef.current;
    const monaco = monacoRefLocal.current;

    if (activeFile && activeFile.type === 'file') {
      // Check if we already have a model for this file
      let model = editor.getModel();
      const existingModel = monaco.editor.getModel(monaco.Uri.parse(`file:///${activeFile.id}`));

      if (existingModel) {
        // Use existing model (preserves undo history, cursor position)
        editor.setModel(existingModel);
      } else {
        // Create new model
        const newModel = monaco.editor.createModel(
          activeFile.content || '',
          activeFile.language || 'plaintext',
          monaco.Uri.parse(`file:///${activeFile.id}`)
        );
        editor.setModel(newModel);
      }

      // Update model content if needed
      const currentModel = editor.getModel();
      if (currentModel && currentModel.getValue() !== activeFile.content) {
        const position = editor.getPosition();
        currentModel.setValue(activeFile.content || '');
        if (position) {
          editor.setPosition(position);
        }
      }
    }
  }, [activeFile?.id]);

  // Update read-only state
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ readOnly });
    }
  }, [readOnly]);

  // Render remote cursors
  useEffect(() => {
    if (!editorRef.current || !monacoRefLocal.current || !fs.activeFileId) return;

    const editor = editorRef.current;
    const monaco = monacoRefLocal.current;
    const currentFileId = fs.activeFileId;

    // Clear existing decorations
    decorationsRef.current.forEach((decorationIds, userId) => {
      editor.deltaDecorations(decorationIds, []);
    });
    decorationsRef.current.clear();

    // Add decorations for remote cursors in current file
    const cursorsForFile = remoteCursors.filter((c) => c.fileId === currentFileId);

    cursorsForFile.forEach((cursor) => {
      const position = {
        lineNumber: cursor.position.line + 1,
        column: cursor.position.column + 1,
      };

      const newDecorations = editor.deltaDecorations([], [
        {
          range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column + 1),
          options: {
            isWholeLine: false,
            className: 'remote-cursor',
            overviewRuler: {
              color: cursor.color,
              position: monaco.editor.OverviewRulerLane.Left,
            },
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        },
        {
          range: new monaco.Range(position.lineNumber, 1, position.lineNumber, 1),
          options: {
            isWholeLine: true,
            className: 'remote-cursor-label',
            glyphMarginClassName: 'remote-cursor-glyph',
            glyphMarginHoverMessage: { value: cursor.userName },
          },
        },
      ]);

      decorationsRef.current.set(cursor.userId, newDecorations);
    });
  }, [remoteCursors, fs.activeFileId]);

  if (!activeFile || activeFile.type !== 'file') {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255, 255, 255, 0.35)',
          fontSize: 14,
          fontStyle: 'italic',
          background: '#0a0a0f',
        }}
      >
        No file selected
      </div>
    );
  }

  return (
    <div style={{ height, position: 'relative' }}>
      <Editor
        height={height}
        language={activeFile.language || 'plaintext'}
        value={activeFile.content || ''}
        theme="skillswap-dark"
        onChange={handleChange}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          padding: { top: 10, bottom: 10 },
          lineNumbers: 'on',
          roundedSelection: true,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
          fontLigatures: true,
          smoothScrolling: true,
          cursorSmoothCaretAnimation: 'on',
          cursorBlinking: 'smooth',
          suggestSelection: 'first',
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          tabSize: 2,
          insertSpaces: true,
          detectIndentation: true,
          wordWrap: 'off',
          readOnly,
        }}
      />

      {/* Remote cursors will be rendered by Monaco's decoration system */}
      <style>{`
        .remote-cursor {
          border-left: 2px solid;
          animation: cursor-blink 1s infinite;
        }
        
        .remote-cursor-glyph {
          width: 8px !important;
          margin-left: 4px;
        }
        
        .remote-cursor-label::after {
          content: attr(data-label);
          position: absolute;
          top: 0;
          left: 12px;
          padding: 2px 6px;
          font-size: 10px;
          font-weight: 600;
          color: #fff;
          background: var(--cursor-color);
          border-radius: 3px;
          white-space: nowrap;
          z-index: 100;
        }
        
        @keyframes cursor-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default CodeEditor;
