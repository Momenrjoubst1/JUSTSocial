import React from 'react';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';

interface StatusIndicatorProps {
    status: 'sent' | 'delivered' | 'read' | 'failed';
    isOptimistic?: boolean;
    isDark: boolean;
}

export const StatusIndicator = React.memo(({ status, isOptimistic, isDark }: StatusIndicatorProps) => {
    if (isOptimistic) {
        return <Clock size={14} className="opacity-70 ml-1" />;
    }

    switch (status) {
        case 'read':
            return <CheckCheck size={14} className={`ml-1 ${isDark ? 'text-cyan-500' : 'text-blue-600'}`} />;
        case 'failed':
            return <AlertCircle size={14} className="text-red-500 ml-1" />;
        case 'delivered':
            return <CheckCheck size={14} className="opacity-70 ml-1" />;
        default:
            return <Check size={14} className="opacity-70 ml-1" />;
    }
});

StatusIndicator.displayName = 'StatusIndicator';