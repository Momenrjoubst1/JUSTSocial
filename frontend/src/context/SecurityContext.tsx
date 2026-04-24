import React, { createContext, useContext, useState, ReactNode } from 'react';

// ─── Private Chat Security Settings ────────────────────────────
export interface PrivateChatSecurity {
    screenshotProtection: boolean;    // "Gaze-Lock" - obscure on blur/screenshot
    e2eeEnabled: boolean;             // End-to-End Encryption active
    multiPathEnabled: boolean;        // Multi-Path Data Stripping for voice calls
    whiteNoiseCamouflage: boolean;    // Fill stripped audio blocks with matched noise
    voiceWatermarking: boolean;       // Live Voice Watermarking
    geoLockCalls: boolean;            // Geo-Lock for voice calls
    vanishingMessages: boolean;       // Disappearing messages
    panicModeEnabled: boolean;        // Panic Mode (emergency key wipe)
}

// ─── Random Video Chat Security Settings ───────────────────────
export interface RandomChatSecurity {
    contentModeration: boolean;       // AI content moderation
    profanityFilter: boolean;         // Text profanity filtering
    reportingEnabled: boolean;        // User reporting system
}

interface SecurityContextType {
    privateChatSecurity: PrivateChatSecurity;
    setPrivateChatSecurity: React.Dispatch<React.SetStateAction<PrivateChatSecurity>>;
    randomChatSecurity: RandomChatSecurity;
    setRandomChatSecurity: React.Dispatch<React.SetStateAction<RandomChatSecurity>>;
}

const defaultPrivateSecurity: PrivateChatSecurity = {
    screenshotProtection: true,
    e2eeEnabled: true,
    multiPathEnabled: true,
    whiteNoiseCamouflage: true,
    voiceWatermarking: true,
    geoLockCalls: true,
    vanishingMessages: false,
    panicModeEnabled: false,
};

const defaultRandomSecurity: RandomChatSecurity = {
    contentModeration: true,
    profanityFilter: true,
    reportingEnabled: true,
};

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: ReactNode }) {
    const [privateChatSecurity, setPrivateChatSecurity] = useState<PrivateChatSecurity>(() => {
        try {
            const saved = localStorage.getItem('private_chat_security');
            return saved ? { ...defaultPrivateSecurity, ...JSON.parse(saved) } : defaultPrivateSecurity;
        } catch {
            return defaultPrivateSecurity;
        }
    });

    const [randomChatSecurity, setRandomChatSecurity] = useState<RandomChatSecurity>(() => {
        try {
            const saved = localStorage.getItem('random_chat_security');
            return saved ? { ...defaultRandomSecurity, ...JSON.parse(saved) } : defaultRandomSecurity;
        } catch {
            return defaultRandomSecurity;
        }
    });

    // Persist to localStorage
    React.useEffect(() => {
        localStorage.setItem('private_chat_security', JSON.stringify(privateChatSecurity));
    }, [privateChatSecurity]);

    React.useEffect(() => {
        localStorage.setItem('random_chat_security', JSON.stringify(randomChatSecurity));
    }, [randomChatSecurity]);

    return (
        <SecurityContext.Provider value={{
            privateChatSecurity, setPrivateChatSecurity,
            randomChatSecurity, setRandomChatSecurity,
        }}>
            {children}
        </SecurityContext.Provider>
    );
}

export function useSecurityContext() {
    const context = useContext(SecurityContext);
    if (!context) throw new Error("useSecurityContext must be used within SecurityProvider");
    return context;
}
