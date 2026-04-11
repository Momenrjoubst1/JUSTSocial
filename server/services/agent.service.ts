import { execFile, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runningAgents = new Map<string, ChildProcess>();
const MAX_AGENTS = 5;

export function isValidRoomName(name: string): boolean {
  return /^[a-zA-Z0-9_\-]{1,100}$/.test(name);
}

export function spawnAgent(roomName: string): boolean {
  if (runningAgents.size >= MAX_AGENTS || runningAgents.has(roomName)) {
    return false;
  }

  const projectRoot = path.join(__dirname, '../..');
  const agentPath = path.join(projectRoot, 'livekit-agent-lite.py');
  
  const agentProcess = execFile(
    'python',
    [agentPath, roomName],
    { cwd: projectRoot, timeout: 300000 },
    (error, stdout, stderr) => {
      runningAgents.delete(roomName);
      if (error) {
        if (error.killed) {
          logger.warn(`Agent for ${roomName} timed out`);
        } else {
          logger.error(`Agent error for ${roomName}:`, { stderr });
        }
      } else {
         logger.info(`Agent output for ${roomName}:`, { stdout });
      }
    }
  );

  runningAgents.set(roomName, agentProcess);

  setTimeout(() => {
    stopAgent(roomName);
  }, 3600000); // 1 hour

  return true;
}

export function stopAgent(roomName: string): boolean {
  const agentProcess = runningAgents.get(roomName);
  if (agentProcess) {
    agentProcess.kill();
    runningAgents.delete(roomName);
    logger.info(`Auto-stopped agent for room: ${roomName}`);
    return true;
  }
  return false;
}
