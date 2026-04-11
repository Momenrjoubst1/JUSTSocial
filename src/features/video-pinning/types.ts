export interface UseVideoPinningReturn {
    isPinned: boolean;
    position: { x: number; y: number };
    isDragging: boolean;
    pinnedSize: { width: number; height: number } | null;
    wrapperRef: React.RefObject<HTMLDivElement | null>;
    handlePointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    togglePin: () => void;
}
