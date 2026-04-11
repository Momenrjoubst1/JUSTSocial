/**
 * Terminal Component
 * Xterm.js integration for integrated terminal
 */

import React, { useRef, useEffect, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface TerminalProps {
  collapsed?: boolean;
  height?: number;
  onCommandExecute?: (command: string) => void;
}

interface CommandHistory {
  command: string;
  output: string;
  timestamp: number;
  success: boolean;
}

// Simulated command responses
const COMMAND_RESPONSES: Record<string, string> = {
  'npm install': `
> npm install
Installing dependencies...

added 142 packages in 3.2s

23 packages are looking for funding
  run \`npm fund\` for details
`,
  'npm run dev': `
> npm run dev

> skill-swap-ide@1.0.0 dev
> vite

  VITE v5.0.0  ready in 320 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h to show help
`,
  'npm build': `
> npm run build

> skill-swap-ide@1.0.0 build
> tsc && vite build

vite v5.0.0 building for production...
✓ 142 modules transformed.
dist/index.html  0.45 kB │ gzip: 0.30 kB
dist/assets/index-abc123.css  12.34 kB │ gzip: 3.21 kB
dist/assets/index-xyz789.js  156.78 kB │ gzip: 52.34 kB
✓ built in 2.1s
`,
  'npm test': `
> npm test

> skill-swap-ide@1.0.0 test
> vitest

 DEV  v1.0.0

 ✓ src/utils.test.ts (12)
 ✓ src/components/Button.test.tsx (8)
 ✓ src/hooks/useAuth.test.ts (5)

 Test Files  3 passed (3)
      Tests  25 passed (25)
   Start at  10:30:45
   Duration  1.2s
`,
  'git status': `
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>...") to update what will be committed)
  (use "git restore <file>...") to discard changes in working directory)
        modified:   src/App.tsx
        modified:   src/index.css

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        src/components/ide/

no changes added to commit (use "git add" and/or "git commit -a")
`,
  'git log': `
commit abc123def456 (HEAD -> main)
Author: Developer <dev@example.com>
Date:   Mon Feb 23 10:30:45 2025

    Add new IDE components

commit 789xyz012abc
Author: Developer <dev@example.com>
Date:   Sun Feb 22 15:20:30 2025

    Update styling
`,
  'ls': `
src/
  components/
  hooks/
  utils/
  App.tsx
  main.tsx
  index.css
package.json
tsconfig.json
vite.config.ts
README.md
`,
  'pwd': '/home/user/skill-swap-ide',
  'whoami': 'user',
  'date': new Date().toString(),
  'node --version': 'v20.10.0',
  'npm --version': '10.2.3',
};

export const Terminal: React.FC<TerminalProps> = ({
  collapsed = false,
  height = 200,
  onCommandExecute,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [commandHistory, setCommandHistory] = useState<CommandHistory[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    if (!terminalRef.current || collapsed) return;

    // Initialize xterm
    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
      theme: {
        background: '#0a0a0f',
        foreground: '#d4d4d4',
        cursor: '#00d4ff',
        cursorAccent: '#0a0a0f',
        selectionBackground: 'rgba(38, 79, 120, 0.5)',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff',
      },
      scrollback: 1000,
      tabStopWidth: 2,
      rightClickSelectsWord: true,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome message
    term.writeln('\x1b[1;36mWelcome to Skill Swap IDE Terminal\x1b[0m');
    term.writeln('\x1b[90mType commands to simulate execution\x1b[0m');
    term.writeln('\x1b[90mSupported: npm install, npm run dev, npm build, npm test, git status, ls, pwd, date\x1b[0m');
    term.writeln('');
    prompt(term);

    // Handle input
    term.onData((data) => {
      const char = data;

      if (char === '\r') {
        // Enter key
        term.write('\r\n');
        executeCommand(currentCommand, term);
        setCurrentCommand('');
        setHistoryIndex(-1);
      } else if (char === '\x7f') {
        // Backspace
        if (currentCommand.length > 0) {
          setCurrentCommand(currentCommand.slice(0, -1));
          term.write('\b \b');
        }
      } else if (char === '\x1b[A') {
        // Up arrow - command history
        if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
          const newIndex = historyIndex + 1;
          const cmd = commandHistory[commandHistory.length - 1 - newIndex].command;
          term.write('\x1b[2K\r$ ' + cmd);
          setCurrentCommand(cmd);
          setHistoryIndex(newIndex);
        }
      } else if (char === '\x1b[B') {
        // Down arrow - command history
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          const cmd = commandHistory[commandHistory.length - 1 - newIndex].command;
          term.write('\x1b[2K\r$ ' + cmd);
          setCurrentCommand(cmd);
          setHistoryIndex(newIndex);
        } else if (historyIndex === 0) {
          term.write('\x1b[2K\r$ ');
          setCurrentCommand('');
          setHistoryIndex(-1);
        }
      } else if (char === '\t') {
        // Tab - simple autocomplete
        handleAutocomplete(currentCommand, term);
      } else if (char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126) {
        // Printable character
        setCurrentCommand(currentCommand + char);
        term.write(char);
      }
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [collapsed]);

  // Re-fit terminal when height changes
  useEffect(() => {
    if (fitAddonRef.current && !collapsed) {
      fitAddonRef.current.fit();
    }
  }, [height, collapsed]);

  const prompt = (term: XTerm) => {
    term.write('\r\n\x1b[1;32muser@skill-swap\x1b[0m:\x1b[1;34m~/project\x1b[0m$ ');
  };

  const executeCommand = (command: string, term: XTerm) => {
    const trimmedCommand = command.trim();
    
    if (!trimmedCommand) {
      prompt(term);
      return;
    }

    // Add to history
    setCommandHistory((prev) => [
      ...prev,
      { command: trimmedCommand, output: '', timestamp: Date.now(), success: true },
    ]);

    // Notify parent
    onCommandExecute?.(trimmedCommand);

    // Find matching command
    let output = '';

    // Check for exact match or partial match
    const exactMatch = COMMAND_RESPONSES[trimmedCommand];
    const partialMatch = Object.entries(COMMAND_RESPONSES).find(([key]) =>
      trimmedCommand.startsWith(key)
    );

    if (exactMatch) {
      output = exactMatch;
    } else if (partialMatch) {
      output = COMMAND_RESPONSES[partialMatch[0]];
    } else if (trimmedCommand === 'clear') {
      term.clear();
      prompt(term);
      return;
    } else if (trimmedCommand === 'help') {
      output = `
Available commands:
  npm install     - Install dependencies
  npm run dev     - Start development server
  npm run build   - Build for production
  npm test        - Run tests
  git status      - Show git status
  git log         - Show commit history
  ls              - List files
  pwd             - Print working directory
  date            - Show current date
  clear           - Clear terminal
  help            - Show this help
`;
    } else {
      output = `\x1b[31mCommand not found: ${trimmedCommand}\x1b[0m\r\nType 'help' for available commands.`;
    }

    // Simulate typing delay for output
    if (output) {
      const lines = output.split('\n');
      let lineIndex = 0;

      const writeLine = () => {
        if (lineIndex < lines.length) {
          term.writeln(lines[lineIndex]);
          lineIndex++;
          setTimeout(writeLine, 50);
        } else {
          prompt(term);
        }
      };

      writeLine();
    } else {
      prompt(term);
    }
  };

  const handleAutocomplete = (command: string, term: XTerm) => {
    const commands = Object.keys(COMMAND_RESPONSES);
    const match = commands.find((cmd) => cmd.startsWith(command));
    
    if (match) {
      term.write('\x1b[2K\r$ ' + match);
      setCurrentCommand(match);
    }
  };

  return (
    <div
      style={{
        height: collapsed ? 0 : height,
        background: '#0a0a0f',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'height 0.3s ease',
        overflow: 'hidden',
      }}
    >
      {/* Terminal Header */}
      <div
        style={{
          padding: '6px 12px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="2" style={{ width: 14, height: 14 }}>
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em' }}>
            TERMINAL
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: 10 }}>
            bash
          </span>
        </div>
      </div>

      {/* Terminal Body */}
      <div
        ref={terminalRef}
        style={{
          flex: 1,
          overflow: 'hidden',
        }}
      />
    </div>
  );
};

export default Terminal;
