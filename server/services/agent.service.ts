import { execFile, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runningAgents = new Map<string, ChildProcess | 'stopping'>();
const MAX_AGENTS = 10;

export function isValidRoomName(name: string): boolean {
  return /^[a-zA-Z0-9_\-]{1,100}$/.test(name);
}

function getAgentKey(roomName: string, identity?: string): string {
  return identity ? `${roomName}_${identity}` : roomName;
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
  const agentPath = path.join(projectRoot, 'agent', 'livekit_text_agent.py');
  
  const env = { ...process.env };
  if (identity) {
    env.TARGET_IDENTITY = identity;
  }
  
  const agentProcess = execFile(
    'python',
    [agentPath, roomName],
    { cwd: projectRoot, timeout: 300000, env, maxBuffer: 10 * 1024 * 1024 },
    (error, stdout, stderr) => {
      runningAgents.delete(agentKey);
      if (error) {
        if (error.killed) {
          logger.warn(`Agent for ${agentKey} timed out`);
        } else {
          logger.error(`Agent error for ${agentKey}:`, { stderr });
        }
      } else {
         logger.info(`Agent output for ${agentKey}:`, { stdout });
      }
    }
  );

  runningAgents.set(agentKey, agentProcess);

  setTimeout(() => {
    stopAgent(roomName, identity);
  }, 3600000); // 1 hour

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

  if (entry) {
    if (entry === 'stopping') {
      return true; // Already stopping
    } else if (typeof entry === 'object' && entry !== null && 'kill' in entry && typeof entry.kill === 'function') {
      // It's a local child process — graceful SIGTERM first, force SIGKILL after 5s
      const proc = entry as ChildProcess;
      proc.kill('SIGTERM');
      setTimeout(() => { try { proc.kill('SIGKILL'); } catch (_) { /* already exited */ } }, 5000);
      runningAgents.delete(agentKey);
      logger.info(`Stopped local agent for: ${agentKey}`);
      return true;
    }
  }
  return false;
}

export function getAgentStatus(roomName?: string, identity?: string) {
  if (roomName) {
    const key = getAgentKey(roomName, identity);
    return { active: runningAgents.has(key), totalAgents: runningAgents.size, maxAgents: MAX_AGENTS };
  }
  return { active: false, totalAgents: runningAgents.size, maxAgents: MAX_AGENTS };
}

