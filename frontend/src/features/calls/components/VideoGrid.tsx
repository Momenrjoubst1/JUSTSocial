import React from 'react';

export function VideoGrid() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {/* Video streams will be mapped here */}
            <div className="aspect-video bg-black/40 rounded-3xl flex items-center justify-center border border-white/10 backdrop-blur-md">
                <span className="text-white/40 font-bold uppercase tracking-widest text-xs">Waiting for stream...</span>
            </div>
        </div>
    );
}
