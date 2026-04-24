import { useState, useEffect } from 'react';
import { Cpu, Play, Square, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [localError, setLocalError] = useState<string | null>(null);

  // Sync and auto-clear local error
  useEffect(() => {
    if (agentError) {
      setLocalError(agentError);
      const timer = setTimeout(() => setLocalError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [agentError]);

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
    <div className="relative inline-flex flex-col items-center">
      {/* Main Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleToggleAgent}
        disabled={agentLoading}
        className={`
          relative flex items-center gap-3 px-5 py-2.5 rounded-xl font-bold
          transition-all duration-300 shadow-xl overflow-hidden
          ${agentActive
            ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
            : 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white'
          }
          ${agentLoading ? 'opacity-70 cursor-wait' : ''}
        `}
      >
        {/* Shine Animation */}
        <motion.div
           className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
           animate={agentActive ? { translateX: ['100%', '-100%'] } : {}}
           transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        />

        <Cpu className={`w-5 h-5 ${agentActive ? 'animate-spin-slow' : ''}`} />
        
        <span className="relative z-10">
            {agentLoading ? (
            <span className="flex items-center gap-1.5">
                <motion.span 
                    animate={{ opacity: [0.4, 1, 0.4] }} 
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-1.5 h-1.5 bg-white rounded-full" 
                />
                <motion.span 
                    animate={{ opacity: [0.4, 1, 0.4] }} 
                    transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                    className="w-1.5 h-1.5 bg-white rounded-full" 
                />
                <motion.span 
                    animate={{ opacity: [0.4, 1, 0.4] }} 
                    transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                    className="w-1.5 h-1.5 bg-white rounded-full" 
                />
            </span>
            ) : agentActive ? 'إيقاف Sigma' : 'تفعيل Sigma'}
        </span>

        {agentActive && !agentLoading && <Square className="w-4 h-4" />}
        {!agentActive && !agentLoading && <Play className="w-4 h-4" />}
      </motion.button>

      {/* Premium Toast-like Error Notification */}
      <AnimatePresence>
        {localError && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className="
              absolute top-full mt-3 p-3 min-w-[200px]
              bg-white/10 backdrop-blur-xl border border-red-500/30
              rounded-xl shadow-2xl z-[100] flex items-start gap-3
            "
          >
            <div className="bg-red-500/20 p-1.5 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex-1">
                <p className="text-[11px] font-bold text-red-200 uppercase tracking-widest mb-0.5">حدث خطأ</p>
                <p className="text-sm text-white/90 leading-tight">{localError}</p>
            </div>
            <button 
                onClick={() => setLocalError(null)}
                className="hover:bg-white/10 p-1 rounded-md transition-colors"
            >
                <X className="w-3.5 h-3.5 text-white/40" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Pulse indicator */}
      {agentActive && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
        </span>
      )}
    </div>
  );
}

export default AIAgentControl;
