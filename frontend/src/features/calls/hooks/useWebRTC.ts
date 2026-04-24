import { useCallContext } from '../CallProvider';

export function useWebRTC() {
    return useCallContext();
}
