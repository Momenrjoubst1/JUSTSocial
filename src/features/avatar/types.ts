type PublishableTrack = {
    stop: () => void;
};

export interface AvatarSceneProps {
    isEnabled: boolean;
    onToggle: () => void;
    room: {
        localParticipant: {
            publishTrack: (t: PublishableTrack) => Promise<unknown>;
            unpublishTrack: (t: PublishableTrack) => void
        };
    } | null;
    isCameraEnabled: boolean;
}

export interface AvatarWorkerResult {
    type: string;
    blendshapes?: { categoryName: string; score: number }[] | null;
    matrix?: number[] | null;
    error?: string;
}

export interface AvatarModel {
    label: string;
    url: string;
}
