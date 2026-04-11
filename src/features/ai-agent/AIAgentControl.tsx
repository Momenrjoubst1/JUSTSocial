/**
 * AIAgentControl — Component for controlling the AI Agent
 * مكون للتحكم بالوكيل الذكي
 */

import { useState } from 'react';
import { Cpu, Play, Square } from 'lucide-react';

interface AIAgentControlProps {
  roomName: string;
  agentActive: boolean;
  agentLoading: boolean;
  agentError: string | null;
  onStart: (room: string) => Promise<void>;
  onStop: (room: string) => Promise<void>;
}

export function AIAgentControl({
  roomName,
  agentActive,
  agentLoading,
  agentError,
  onStart,
  onStop
}: AIAgentControlProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleToggleAgent = async () => {
    try {
      if (agentActive) {
        await onStop(roomName);
      } else {
        await onStart(roomName);
      }
    } catch (error) {
      console.error('Error toggling agent:', error);
    }
  };

  return (
    <div className="relative">
      {/* Main Button */}
      <button
        onClick={handleToggleAgent}
        disabled={agentLoading}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-semibold
          transition-all duration-200
          ${agentActive
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
          }
          ${agentLoading ? 'opacity-60 cursor-not-allowed' : ''}
          shadow-lg
        `}
        title={agentActive ? 'إيقاف الوكيل' : 'تفعيل الوكيل'}
      >
        <Cpu size={18} />
        {agentLoading ? (
          <>
            <span className="flex gap-0.5"><span className="w-1 h-1 rounded-full bg-white animate-pulse" /><span className="w-1 h-1 rounded-full bg-white animate-pulse" style={{ animationDelay: '150ms' }} /><span className="w-1 h-1 rounded-full bg-white animate-pulse" style={{ animationDelay: '300ms' }} /></span>
            جاري...
          </>
        ) : agentActive ? (
          <>
            <Square size={16} />
            إيقاف الوكيل
          </>
        ) : (
          <>
            <Play size={16} />
            تفعيل الوكيل
          </>
        )}
      </button>

      {/* Error Message */}
      {agentError && (
        <div className="
          absolute top-full left-0 mt-2 p-3 bg-red-100 text-red-700
          rounded-lg text-sm max-w-xs z-50 shadow-lg
        ">
          ❌ {agentError}
        </div>
      )}

      {/* Status Badge */}
      {agentActive && (
        <div className="
          absolute -top-2 -right-2 w-3 h-3 bg-green-500 rounded-full
          animate-pulse shadow-lg
        " title="الوكيل نشط" />
      )}
    </div>
  );
}

export default AIAgentControl;
