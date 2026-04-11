import React from "react";
import { VerifiedBadge, Avatar } from "@/components/ui/core";

export interface RemoteUserInfo {
  name: string;
  country: string;
  flag: string;
  countryCode: string;
  avatar: string | null;
  userId: string;
  fingerprint: string | null;
}

interface RemotePeerInfoOverlayProps {
  remoteUserInfo: RemoteUserInfo | null;
  localUserInfo: any | null;
  remotePeerIdentity: string;
  connected: boolean;
  styles: Record<string, any>;
  isFollowingRemote: boolean;
  followLoading: boolean;
  peerInfoHovered: boolean;
  setPeerInfoHovered: (hovered: boolean) => void;
  handleFollowRemote: () => void;
  handleReportUser: () => void;
  moderation: {
    reportLoading: boolean;
    reportSuccess: boolean;
  };
  t: (key: string) => any;
  isUserVerified: (userId?: string) => boolean;
}

export function RemotePeerInfoOverlay({
  remoteUserInfo,
  localUserInfo,
  remotePeerIdentity,
  connected,
  styles,
  isFollowingRemote,
  followLoading,
  peerInfoHovered,
  setPeerInfoHovered,
  handleFollowRemote,
  handleReportUser,
  moderation,
  t,
  isUserVerified
}: RemotePeerInfoOverlayProps) {
  if (!connected || !remoteUserInfo) return null;

  return (
    <div
      style={{ ...styles.peerInfoOverlay, pointerEvents: 'auto', cursor: 'default' }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onMouseEnter={() => setPeerInfoHovered(true)}
      onMouseLeave={() => setPeerInfoHovered(false)}
    >
      <div
        onClick={() => {
          if (remoteUserInfo?.userId) {
            window.open(`/profile/${remoteUserInfo.userId}`, '_blank');
          }
        }}
        style={{ cursor: remoteUserInfo?.userId ? 'pointer' : 'default' }}
      >
        <Avatar
          src={remoteUserInfo?.avatar}
          name={remoteUserInfo?.name || "User"}
          size={30}
          className="transition-transform duration-150 ease-in-out hover:scale-110"
          style={{
            border: '2px solid rgba(99,102,241,0.5)'
          }}
        />
      </div>
      <div style={styles.peerInfo}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={styles.peerUsername}>
            {remoteUserInfo?.name || remotePeerIdentity || "Guest"}
          </span>
          {isUserVerified(remoteUserInfo?.userId) && <VerifiedBadge size={15} />}
          {remoteUserInfo?.countryCode && remoteUserInfo.countryCode !== "" && (
            <img
              src={`https://flagcdn.com/${remoteUserInfo.countryCode.toLowerCase()}.svg`}
              alt="Flag"
              style={{ width: 16, height: 11, objectFit: 'cover', borderRadius: 2 }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
        </div>
        <div style={styles.peerCountry}>
          {remoteUserInfo ? remoteUserInfo.country : String(t("videochat.connected"))}
        </div>
      </div>
      {/* Follow/Unfollow button — appears on hover */}
      {remoteUserInfo?.userId && localUserInfo?.userId && remoteUserInfo.userId !== localUserInfo.userId && (
        <button
          onClick={handleFollowRemote}
          disabled={followLoading}
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            border: isFollowingRemote ? '1.5px solid rgba(99,102,241,0.6)' : '1.5px solid rgba(255,255,255,0.3)',
            background: isFollowingRemote ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.1)',
            color: isFollowingRemote ? '#a5b4fc' : '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: followLoading ? 'wait' : 'pointer',
            padding: 0,
            flexShrink: 0,
            opacity: peerInfoHovered ? 1 : 0,
            transform: peerInfoHovered ? 'scale(1)' : 'scale(0.7)',
            transition: 'all 0.2s ease',
            pointerEvents: peerInfoHovered ? 'auto' : 'none',
            outline: 'none',
          }}
          title={isFollowingRemote ? 'Unfollow' : 'Add Friend'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            {isFollowingRemote ? (
              <>
                <polyline points="20 6 9 17 4 12" />
              </>
            ) : (
              <>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </>
            )}
          </svg>
        </button>
      )}
      {/* Report button — appears on hover */}
      {connected && remotePeerIdentity && (
        <button
          onClick={handleReportUser}
          disabled={moderation.reportLoading}
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            border: '1.5px solid rgba(239,68,68,0.3)',
            background: moderation.reportSuccess ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.1)',
            color: moderation.reportSuccess ? '#86efac' : '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: moderation.reportLoading ? 'wait' : 'pointer',
            padding: 0,
            flexShrink: 0,
            opacity: peerInfoHovered ? 1 : 0,
            transform: peerInfoHovered ? 'scale(1)' : 'scale(0.7)',
            transition: 'all 0.2s ease',
            pointerEvents: peerInfoHovered ? 'auto' : 'none',
            outline: 'none',
          }}
          title="Report User"
        >
          {moderation.reportSuccess ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
