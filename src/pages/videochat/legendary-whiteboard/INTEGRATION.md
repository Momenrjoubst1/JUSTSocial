# 🚀 LEGENDARY WHITEBOARD - Integration Guide

## Quick Integration into VideoChatPage

The Legendary Whiteboard is now fully integrated into your VideoChatPage. Here's what was changed:

### 1. Import Updated
```typescript
// OLD
import { CollaborativeWhiteboard } from "./whiteboard/CollaborativeWhiteboard";

// NEW  
import { LegendaryWhiteboard } from "./legendary-whiteboard/LegendaryWhiteboard";
```

### 2. Usage Updated
```typescript
{isWhiteboardMode && (
  <div style={{
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  }}>
    <div style={{
      position: 'relative',
      width: '95%',
      height: '95%',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    }}>
      {/* Exit Button */}
      <button
        onClick={() => setIsWhiteboardMode(false)}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 1000,
          padding: '8px 16px',
          backgroundColor: '#ef4444',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600',
        }}
      >
        ✕ Exit Whiteboard
      </button>

      {/* Legendary Whiteboard Component */}
      <LegendaryWhiteboard
        width={window.innerWidth * 0.95}
        height={window.innerHeight * 0.95}
        enableAI={true}
        enableCollaboration={true}
        backgroundColor="#ffffff"
        darkMode={false}
        onShapeAdd={(shape) => {
          // Broadcast shape to remote peer
          if (dataChannelRef.current?.readyState === 'open') {
            dataChannelRef.current.send(JSON.stringify({
              type: 'whiteboard-shape-add',
              shape,
            }));
          }
        }}
        onShapeRemove={(id) => {
          // Broadcast shape removal to remote peer
          if (dataChannelRef.current?.readyState === 'open') {
            dataChannelRef.current.send(JSON.stringify({
              type: 'whiteboard-shape-remove',
              shapeId: id,
            }));
          }
        }}
      />
    </div>
  </div>
)}
```

## Advanced Integration with Full Container

For a complete, professional experience with toolbar and layers panel:

```typescript
import React, { useState } from 'react';
import { LegendaryWhiteboardContainer } from './legendary-whiteboard/components';

function EnhancedVideoChatPage() {
  const [isWhiteboardMode, setIsWhiteboardMode] = useState(false);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  return (
    <>
      {/* Existing video chat UI */}
      <div>{/* Your video UI */}</div>

      {/* Legendary Whiteboard Container */}
      {isWhiteboardMode && (
        <LegendaryWhiteboardContainer
          width={window.innerWidth}
          height={window.innerHeight}
          enableAI={true}
          enableCollaboration={true}
          darkMode={false}
          onClose={() => setIsWhiteboardMode(false)}
          onCollaborate={(update) => {
            // Send collaboration updates to peers
            if (dataChannelRef.current?.readyState === 'open') {
              dataChannelRef.current.send(JSON.stringify(update));
            }
          }}
        />
      )}
    </>
  );
}
```

## Using Custom Hooks

```typescript
import React, { useRef } from 'react';
import {
  LegendaryWhiteboard,
  useLegendaryWhiteboard,
  useWhiteboardAI,
  useWhiteboardExport,
  useWhiteboardTools,
  useWhiteboardHistory,
} from './legendary-whiteboard';

function CustomWhiteboardApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Main whiteboard functionality
  const whiteboard = useLegendaryWhiteboard(canvasRef);

  // AI features
  const { recognizeShape, analyzeAndFormat } = useWhiteboardAI();

  // Export functionality
  const { exportToPNG, exportToJSON, exportToWebP, exportToSVG } =
    useWhiteboardExport(canvasRef);

  // Tool management
  const {
    selectedTool,
    setSelectedTool,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    fillColor,
    setFillColor,
    opacity,
    setOpacity,
  } = useWhiteboardTools();

  // History/Undo
  const { canUndo, canRedo, undo, redo } = useWhiteboardHistory(
    whiteboard.stateManager
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          padding: '12px',
          backgroundColor: '#f0f0f0',
          borderBottom: '1px solid #d0d0d0',
        }}
      >
        {/* Tool selection */}
        <select
          value={selectedTool}
          onChange={(e) => setSelectedTool(e.target.value as any)}
        >
          <option value="pen">Pen</option>
          <option value="rectangle">Rectangle</option>
          <option value="circle">Circle</option>
          <option value="text">Text</option>
          <option value="selection">Selection</option>
        </select>

        {/* Color picker */}
        <input
          type="color"
          value={strokeColor}
          onChange={(e) => setStrokeColor(e.target.value)}
        />

        {/* Stroke width */}
        <input
          type="range"
          min="1"
          max="50"
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
        />

        {/* History buttons */}
        <button onClick={undo} disabled={!canUndo}>
          Undo
        </button>
        <button onClick={redo} disabled={!canRedo}>
          Redo
        </button>

        {/* Export buttons */}
        <button onClick={exportToPNG}>Export PNG</button>
        <button onClick={exportToJSON}>Export JSON</button>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <LegendaryWhiteboard
          ref={canvasRef}
          width={window.innerWidth}
          height={window.innerHeight - 60}
          enableAI={true}
          enableCollaboration={true}
        />
      </div>
    </div>
  );
}

export default CustomWhiteboardApp;
```

## Handling Real-Time Collaboration

```typescript
// In your data channel message handler
function handleDataChannelMessage(event: RTCDataChannelMessageEvent) {
  try {
    const message = JSON.parse(event.data);

    switch (message.type) {
      case 'whiteboard-shape-add':
        // Add shape from remote peer
        whiteboardRef.current?.addShape(message.shape);
        break;

      case 'whiteboard-shape-remove':
        // Remove shape from remote peer
        whiteboardRef.current?.removeShape(message.shapeId);
        break;

      case 'whiteboard-shape-modify':
        // Update shape from remote peer
        whiteboardRef.current?.updateShape(
          message.shapeId,
          message.changes
        );
        break;

      case 'whiteboard-sync-request':
        // Send full state to remote peer
        const fullState = whiteboardRef.current?.exportCanvas({
          format: 'json',
        });
        dataChannelRef.current?.send(
          JSON.stringify({
            type: 'whiteboard-sync-response',
            state: fullState,
          })
        );
        break;

      case 'whiteboard-sync-response':
        // Receive full state
        if (message.state) {
          whiteboardRef.current?.stateManager.importFromJSON(
            message.state
          );
        }
        break;
    }
  } catch (error) {
    console.error('Error handling whiteboard message:', error);
  }
}
```

## Using AI Features

```typescript
import { useWhiteboardAI } from './legendary-whiteboard';

function DiagramAnalyzer() {
  const { recognizeShape, analyzeAndFormat } = useWhiteboardAI();

  // Recognize a hand-drawn shape
  const handleShapeRecognition = (points) => {
    const result = recognizeShape(points);

    if (result.confidence > 0.85) {
      console.log(`Recognized: ${result.shapeType}`);
      console.log(`Confidence: ${result.confidence}`);
      console.log(`Properties:`, result.properties);

      // Could auto-convert to perfect shape:
      // createPerfectShape(result);
    }
  };

  // Analyze and suggest diagram improvements
  const handleDiagramAnalysis = (shapes) => {
    const analysis = analyzeAndFormat(shapes);

    if (analysis.isFlowchart) {
      console.log('Detected as flowchart');
      console.log('Suggested layout:', analysis.suggestedLayout);
      console.log(
        'Improvements:',
        analysis.improvements
      );
    }
  };

  return (
    <div>
      {/* Whiteboard UI with AI buttons */}
    </div>
  );
}
```

## Setup Collaboration with WebSocket

```typescript
import { useWhiteboardCollaboration } from './legendary-whiteboard';

function CollaborativeWhiteboard() {
  const collaboration = useWhiteboardCollaboration('user-123');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket server
    wsRef.current = new WebSocket('ws://your-server/whiteboard');

    wsRef.current.onmessage = (event) => {
      const update = JSON.parse(event.data);
      collaboration.receiveUpdate(update);
    };

    return () => {
      wsRef.current?.close();
    };
  }, []);

  // Broadcast local changes
  const broadcastChange = (update) => {
    collaboration.broadcastUpdate(update);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(update));
    }
  };

  return (
    <LegendaryWhiteboard
      onShapeAdd={(shape) =>
        broadcastChange({
          type: 'shape-add',
          shape,
          userId: collaboration.userId,
          timestamp: Date.now(),
        })
      }
      enableCollaboration={true}
    />
  );
}
```

## Exporting and Importing Documents

```typescript
// Export document
async function saveWhiteboard(stateManager) {
  const json = stateManager.exportToJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `whiteboard-${Date.now()}.json`;
  link.click();
}

// Import document
async function loadWhiteboard(stateManager, file) {
  const text = await file.text();
  stateManager.importFromJSON(text);
}
```

## Performance Optimization Tips

```typescript
// Monitor performance
function MonitorPerformance(whiteboardRef) {
  const [fps, setFps] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (performance.memory) {
        setMemoryUsage(
          (performance.memory.usedJSHeapSize / 1048576).toFixed(2)
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <p>FPS: {fps}</p>
      <p>Memory: {memoryUsage} MB</p>
      <p>
        Shapes: {whiteboardRef.current?.state?.shapes.size || 0}
      </p>
    </div>
  );
}
```

---

## Architecture Overview

```
legendary-whiteboard/
├── Core
│   ├── engine/
│   │   ├── DrawingEngine.ts     # Canvas rendering
│   │   └── StateManager.ts      # State management
│   ├── rendering/               # Advanced rendering
│   ├── ai/
│   │   └── AIEngine.ts          # AI features
│   └── performance/             # Optimization
├── Collaboration
│   ├── Sync.ts                  # Real-time sync
│   ├── Conflict.ts              # Conflict resolution
│   └── Transport.ts             # Communication
├── Features
│   ├── Export.ts                # Export formats
│   ├── Templates.ts             # Template system
│   └── Utils.ts                 # Utilities
├── Hooks
│   └── useLegendaryWhiteboard.ts # React hooks
├── Components
│   ├── LegendaryWhiteboard.tsx   # Main component
│   ├── Toolbar.tsx              # Toolbar UI
│   ├── LayersPanel.tsx          # Layers UI
│   └── LegendaryWhiteboardContainer.tsx
├── Types
│   └── types.ts                 # TypeScript types
└── README.md & FEATURES.md
```

---

## Support & Documentation

- 📖 **API Reference**: See `./README.md`
- ✨ **Features**: See `./FEATURES.md`
- 🎯 **Examples**: See `/examples`
- 🔧 **Troubleshooting**: See `./docs/TROUBLESHOOTING.md`

---

**Your legendary whiteboard is ready to revolutionize collaboration!**
