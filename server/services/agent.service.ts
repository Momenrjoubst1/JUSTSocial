import { execFile, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runningAgents = new Map<string, ChildProcess | 'dispatched' | { id: string } | 'stopping'>();
const MAX_AGENTS = 10;

const LIVEKIT_URL = process.env.LIVEKIT_URL || '';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';

// Detect if the phi4 agent server is running (started with `python livekit_agent_phi4.py dev`)
const USE_DISPATCH = process.env.AGENT_MODE !== 'lite';

export function isValidRoomName(name: string): boolean {
  return /^[a-zA-Z0-9_\-]{1,100}$/.test(name);
}

function getAgentKey(roomName: string, identity?: string): string {
  return identity ? `${roomName}_${identity}` : roomName;
}

/**
 * Dispatch agent to a room via LiveKit Agent Dispatch API.
 * This works when `livekit_agent_phi4.py dev` is running separately.
 */
async function dispatchAgent(roomName: string, identity?: string): Promise<boolean> {
  const agentKey = getAgentKey(roomName, identity);
  try {
    // Use LiveKit Agent Dispatch API
    const { AgentDispatchClient } = await import('livekit-server-sdk');
    const client = new AgentDispatchClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
    
    // Pass the target identity in the metadata so the agent knows who to exclusively serve
    const metadata = identity ? JSON.stringify({ targetIdentity: identity }) : '';
    const dispatch = await client.createDispatch(roomName, 'phi4-vision-agent', { metadata });

    logger.info(`âœ… Agent dispatched to room: ${roomName} for participant: ${identity || 'all'}`);
    
    // If the frontend sent a stop request while we were dispatching, stop it now
    if (runningAgents.get(agentKey) === 'stopping') {
      runningAgents.delete(agentKey);
      client.deleteDispatch(dispatch.id, roomName).catch(e => {
        logger.error(`Failed to immediately stop dispatch ${dispatch.id}:`, e);
      });
      return false;
    } else {
      runningAgents.set(agentKey, { id: dispatch.id });
      return true;
    }
  } catch (dispatchError: any) {
    runningAgents.delete(agentKey); // Allow fallback to instantiate
    logger.warn(`Agent dispatch failed (${dispatchError.message}), falling back to lite agent...`);
    return spawnLiteAgent(roomName, identity);
  }
}

/**
 * Spawn the lite agent as a child process (fallback).
 */
function spawnAgentScript(roomName: string, scriptName: string, identity?: string): boolean {
  const agentKey = getAgentKey(roomName, identity);
  if (runningAgents.has(agentKey)) {
    return false;
  }

  const projectRoot = path.join(__dirname, '../..');
  const agentPath = path.join(projectRoot, 'agent', scriptName);
  
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

function spawnLiteAgent(roomName: string, identity?: string): boolean {
  return spawnAgentScript(roomName, 'livekit-agent-lite.py', identity);
}

function spawnTextAgent(roomName: string, identity?: string): boolean {
  return spawnAgentScript(roomName, 'livekit_text_agent.py', identity);
}

export function spawnAgent(roomName: string, identity?: string): boolean {
  const agentKey = getAgentKey(roomName, identity);
  if (runningAgents.size >= MAX_AGENTS || runningAgents.has(agentKey)) {
    return false;
  }

  if (USE_DISPATCH) {
    // Try dispatch to running AgentServer first
    runningAgents.set(agentKey, 'dispatched');
    dispatchAgent(roomName, identity).catch(err => {
      logger.error(`Dispatch error for ${agentKey}: ${err}`);
      runningAgents.delete(agentKey);
    });
    return true;
  }

  // Fallback: spawn lite agent as child process (supports direct room connection)
  return spawnLiteAgent(roomName, identity);
}

export function stopAgent(roomName: string, identity?: string): boolean {
  const agentKey = getAgentKey(roomName, identity);
  const entry = runningAgents.get(agentKey);

  if (entry) {
    if (entry === 'dispatched') {
      // The dispatch request is still in flight. Mark it as stopping so when it finishes, it deletes itself.
      runningAgents.set(agentKey, 'stopping');
      logger.info(`Marked pending agent dispatch for: ${agentKey} to stop upon completion`);
      return true;
    } else if (entry === 'stopping') {
      return true; // Already stopping
    } else if (typeof entry === 'object' && entry !== null && 'id' in entry && typeof entry.id === 'string') {
      // For dispatched agents, kill the dispatch via LiveKit REST API
      const dispatchId = entry.id;
      import('livekit-server-sdk').then(({ AgentDispatchClient }) => {
        const client = new AgentDispatchClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
        client.deleteDispatch(dispatchId, roomName).catch(e => {
          logger.error(`Failed to delete dispatch ${dispatchId} for ${agentKey}:`, e);
        });
      }).catch(err => logger.error('Failed to import livekit-server-sdk', err));
      
      runningAgents.delete(agentKey);
      logger.info(`Auto-stopped dispatch agent for: ${agentKey}`);
      return true;
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

