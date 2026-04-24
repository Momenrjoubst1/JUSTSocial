import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type AgentEntry =
  | { state: 'running'; proc: ChildProcess; lifetimeTimer: NodeJS.Timeout }
  | { state: 'stopping'; proc: ChildProcess };

const runningAgents = new Map<string, AgentEntry>();
const MAX_AGENTS = 5;
const AGENT_LIFETIME_MS = 3_600_000; // 1 hour
const GRACEFUL_SHUTDOWN_MS = 5_000;

export function isValidRoomName(name: string): boolean {
  return /^[a-zA-Z0-9_-]{1,100}$/.test(name);
}

function getAgentKey(roomName: string, identity?: string): string {
  return identity ? `${roomName}_${identity}` : roomName;
}

/**
 * Resolve the Python executable. Prefer venv bundled with the repo if present,
 * otherwise fall back to `python` (Windows) / `python3` (Unix) on PATH.
 */
function resolvePythonBinary(projectRoot: string): string {
  const candidates = process.platform === 'win32'
    ? [
        path.join(projectRoot, '..', '.venv', 'Scripts', 'python.exe'),
        path.join(projectRoot, '.venv', 'Scripts', 'python.exe'),
        'python',
      ]
    : [
        path.join(projectRoot, '..', '.venv', 'bin', 'python'),
        path.join(projectRoot, '.venv', 'bin', 'python'),
        'python3',
        'python',
      ];

  for (const candidate of candidates) {
    if (candidate.includes(path.sep) && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[candidates.length - 1];
}

/**
 * Spawn the text agent script as a child process.
 */
function spawnTextAgent(roomName: string, identity?: string): boolean {
  const agentKey = getAgentKey(roomName, identity);
  if (runningAgents.has(agentKey)) {
    return false;
  }

  const projectRoot = path.join(__dirname, '../..');
  // NOTE: directory is 'agents' (plural), not 'agent'.
  const agentPath = path.join(projectRoot, 'agents', 'livekit_text_agent.py');

  if (!fs.existsSync(agentPath)) {
    logger.error(`Agent script not found at ${agentPath}`);
    return false;
  }

  const env = { ...process.env };
  if (identity) {
    env.TARGET_IDENTITY = identity;
  }
  env.AGENT_ROOM_NAME = roomName;

  const pythonBin = resolvePythonBinary(projectRoot);

  // LiveKit Agents CLI expects a subcommand. `connect --room <name>` instructs
  // the worker to join a specific room immediately — matching this service's
  // spawn-per-room model.
  const agentProcess = spawn(
    pythonBin,
    [agentPath, 'connect', '--room', roomName],
    {
      cwd: projectRoot,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    }
  );

  agentProcess.stdout?.on('data', (chunk: Buffer) => {
    logger.info(`[agent:${agentKey}] ${chunk.toString().trimEnd()}`);
  });
  agentProcess.stderr?.on('data', (chunk: Buffer) => {
    logger.warn(`[agent:${agentKey}] ${chunk.toString().trimEnd()}`);
  });

  agentProcess.on('error', (err) => {
    logger.error(`Failed to spawn agent for ${agentKey}:`, { err: err.message });
    const entry = runningAgents.get(agentKey);
    if (entry && 'lifetimeTimer' in entry) {
      clearTimeout(entry.lifetimeTimer);
    }
    runningAgents.delete(agentKey);
  });

  agentProcess.on('exit', (code, signal) => {
    logger.info(`Agent for ${agentKey} exited (code=${code}, signal=${signal})`);
    const entry = runningAgents.get(agentKey);
    if (entry && 'lifetimeTimer' in entry) {
      clearTimeout(entry.lifetimeTimer);
    }
    runningAgents.delete(agentKey);
  });

  const lifetimeTimer = setTimeout(() => {
    logger.info(`Agent lifetime reached for ${agentKey}, stopping.`);
    stopAgent(roomName, identity);
  }, AGENT_LIFETIME_MS);

  runningAgents.set(agentKey, { state: 'running', proc: agentProcess, lifetimeTimer });

  return true;
}

export function spawnAgent(roomName: string, identity?: string): boolean {
  const agentKey = getAgentKey(roomName, identity);
  if (runningAgents.size >= MAX_AGENTS || runningAgents.has(agentKey)) {
    return false;
  }

  return spawnTextAgent(roomName, identity);
}

export function stopAgent(roomName: string, identity?: string): boolean {
  const agentKey = getAgentKey(roomName, identity);
  const entry = runningAgents.get(agentKey);

  if (!entry) {
    return false;
  }

  if (entry.state === 'stopping') {
    return true; // Already stopping
  }

  // Clear lifetime timer — we're stopping now.
  clearTimeout(entry.lifetimeTimer);

  const proc = entry.proc;
  runningAgents.set(agentKey, { state: 'stopping', proc });

  try {
    proc.kill('SIGTERM');
  } catch (err) {
    logger.warn(`SIGTERM failed for ${agentKey}:`, { err: (err as Error).message });
  }

  setTimeout(() => {
    if (runningAgents.get(agentKey)?.state === 'stopping') {
      try {
        proc.kill('SIGKILL');
      } catch {
        /* already exited */
      }
    }
  }, GRACEFUL_SHUTDOWN_MS);

  logger.info(`Stopping agent for: ${agentKey}`);
  return true;
}

export function getAgentStatus(roomName?: string, identity?: string) {
  if (roomName) {
    const key = getAgentKey(roomName, identity);
    const entry = runningAgents.get(key);
    return {
      active: entry?.state === 'running',
      totalAgents: runningAgents.size,
      maxAgents: MAX_AGENTS,
    };
  }
  return { active: false, totalAgents: runningAgents.size, maxAgents: MAX_AGENTS };
}
