export const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        // Add more TURN/STUN servers here for production
    ]
};

export const MULTIPATH_CONFIG = {
    BLOCK_MODULO: 20,
    CHECK_INTERVAL: 200,
    DEGRADED_THRESHOLD: 2
};

export const WATERMARK_CONFIG = {
    BASE_FREQ: 14000,
    FREQ_STEP: 500,
    INTERVAL: 1000,
    AMPLITUDE: {
        BASE: 0.05,
        MODERATE: 0.1,
        STRONG: 0.15
    }
};
