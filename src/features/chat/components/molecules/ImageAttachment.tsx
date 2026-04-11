import React, { useState } from 'react';
import { ImageLightbox } from '@/components/ui/ImageLightbox';

interface ImageAttachmentProps {
    src: string;
    onImageLoad?: () => void;
}

export const ImageAttachment = React.memo(({ src, onImageLoad }: ImageAttachmentProps) => {
    const [showLightbox, setShowLightbox] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <>
            <div 
                className={`relative overflow-hidden rounded-[24px] ${!isLoaded ? 'bg-white/5' : ''} min-w-[140px] min-h-[120px] max-w-[280px] sm:max-w-[320px] md:max-w-[400px] max-h-[450px] cursor-pointer group/img`}
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

ImageAttachment.displayName = 'ImageAttachment';