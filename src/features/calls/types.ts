export type CallState = 'idle' | 'checking_geo' | 'calling' | 'ringing' | 'connected' | 'geo_failed';

export interface CallData {
    status: CallState;
    partnerId: string | null;
    partnerName: string | null;
    partnerAvatar: string | null;
    isMuted: boolean;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    callDuration: number;
    isGeoSecure: boolean;
    geoFailMessage: string | null;
    isHumanVerified: boolean;
    multiPathState?: 'active' | 'degraded' | 'inactive';
}
