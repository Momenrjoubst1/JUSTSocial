import React, { useState } from 'react';
import { ImageLightbox } from '@/components/ui/ImageLightbox';

interface ImagePreviewProps {
    src: string;
    onImageLoad?: () => void;
}

export const ImagePreview = React.memo(({ src, onImageLoad }: ImagePreviewProps) => {
    const [showLightbox, setShowLightbox] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <>
            <div 
                className={`relative overflow-hidden rounded-[24px] ${!isLoaded ? 'bg-white/5' : ''} min-w-[120px] min-h-[100px] max-w-[220px] sm:max-w-[250px] md:max-w-[280px] max-h-[320px] cursor-pointer group/img`}
                onClick={(e) => {
                    e.stopPropagation();
                    setShowLightbox(true);
                }}
            >
                <img
                    src={src}
                    className="block rounded-[24px] max-w-full max-h-full w-auto h-auto object-contain transition-all duration-500 group-hover/img:scale-105 group-hover/img:brightness-110 shadow-md border border-white/10"
                    alt="sent"
                    loading="lazy"
                    onLoad={() => {
                        setIsLoaded(true);
                        onImageLoad?.();
                    }}
                />
            </div>
            <ImageLightbox 
                isOpen={showLightbox} 
                onClose={() => setShowLightbox(false)} 
                src={src} 
            />
        </>
    );
});

ImagePreview.displayName = 'ImagePreview';
