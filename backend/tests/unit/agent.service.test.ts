import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidRoomName } from '../../src/services/agent.service';

describe('agent.service — isValidRoomName', () => {
  it('accepts valid room names', () => {
    expect(isValidRoomName('room-123')).toBe(true);
    expect(isValidRoomName('abc_XYZ')).toBe(true);
    expect(isValidRoomName('skillswap-room-99')).toBe(true);
  });

  it('rejects names with shell-injection characters', () => {
    expect(isValidRoomName('room; rm -rf /')).toBe(false);
    expect(isValidRoomName('room && curl evil.com')).toBe(false);
    expect(isValidRoomName('room$(whoami)')).toBe(false);
    expect(isValidRoomName('room|cat /etc/passwd')).toBe(false);
    expect(isValidRoomName('room"quote"')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidRoomName('')).toBe(false);
  });

  it('rejects names longer than 100 characters', () => {
    expect(isValidRoomName('a'.repeat(101))).toBe(false);
  });

  // ── Edge Cases ──────────────────────────────────────────
  it('accepts exactly 100 characters (max boundary)', () => {
    expect(isValidRoomName('a'.repeat(100))).toBe(true);
  });

  it('rejects exactly 101 characters (over boundary)', () => {
    expect(isValidRoomName('a'.repeat(101))).toBe(false);
  });

  it('accepts single character', () => {
    expect(isValidRoomName('a')).toBe(true);
  });

  it('rejects whitespace only', () => {
    expect(isValidRoomName('   ')).toBe(false);
  });

  it('rejects newline characters', () => {
    expect(isValidRoomName('room\nname')).toBe(false);
  });

  it('rejects unicode characters', () => {
    expect(isValidRoomName('غرفة-١')).toBe(false);
  });
});

vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

import { spawnAgent, stopAgent } from '../../src/services/agent.service';
import { execFile } from 'child_process';

describe('agent.service — spawnAgent / stopAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Try to stop any lingering agents from previous tests
    for(let i=0; i<6; i++) {
        stopAgent(`room-${i}`);
    }
    stopAgent('room-123');
    stopAgent('room-stop');
  });

  it('spawns agent and returns true on success', () => {
    vi.mocked(execFile).mockReturnValue({ kill: vi.fn() } as any);
    const result = spawnAgent('room-123');
    expect(result).toBe(true);
    expect(execFile).toHaveBeenCalled();
  });

  it('rejects when 5 agents are already running', () => {
    vi.mocked(execFile).mockReturnValue({ kill: vi.fn() } as any);
    for(let i=0; i<5; i++) {
        spawnAgent(`room-${i}`);
    }
    const result = spawnAgent('room-over-limit');
    expect(result).toBe(false);
  });

  it('stops agent correctly', () => {
    vi.mocked(execFile).mockReturnValue({ kill: vi.fn() } as any);
    spawnAgent('room-stop');
    const result = stopAgent('room-stop');
    expect(result).toBe(true);
  });

  it('returns false when stopping non-existent agent', () => {
    const result = stopAgent('no-agent');
    expect(result).toBe(false);
  });
});


