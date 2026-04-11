import { useCallback } from 'react';
import useSound from 'use-sound';
import { SOUND_CLICK, SOUND_SEND, SOUND_RECEIVE } from '../constants/sounds';

export function useChatSound() {
    const [playSendSound] = useSound(SOUND_SEND, { volume: 0.6 });
    const [playReceiveSound] = useSound(SOUND_RECEIVE, { volume: 0.6 });
    const [playClickSound] = useSound(SOUND_CLICK, { volume: 0.8, interrupt: false }); // interrupt false ensures fast typing won't cut the sound too abruptly but lets it overlay, though howler handles fast overlapping well.

    const playPopSound = useCallback((type: 'send' | 'receive' = 'receive') => {
        try {
            if (type === 'send') {
                playSendSound();
            } else {
                playReceiveSound();
            }
        } catch (e) {
            console.warn("Sound play failed", e);
        }
    }, [playSendSound, playReceiveSound]);

    const playClick = useCallback(() => {
        try {
            playClickSound();
        } catch (e) {
            console.warn("Click sound failed", e);
        }
    }, [playClickSound]);

    return { playPopSound, playClick };
}
