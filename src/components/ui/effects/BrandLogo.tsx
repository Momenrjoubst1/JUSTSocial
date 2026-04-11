import React from 'react';

interface BrandLogoProps {
    className?: string;
    glowColor?: string;
    strokeWidth?: number;
    size?: { width: number; height: number };
}

/**
 * SkillSwap Brand Logo (Optimized SVG)
 * Hand-optimized path data and removed unnecessary metadata for minimal footprint.
 */
export const BrandLogo = ({
    className = "w-10 h-12",
    glowColor = "#00d2ff",
    strokeWidth = 4,
    size
}: BrandLogoProps) => {
    const filterId = `glow-${glowColor.replace('#', '')}`;

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 200 300"
            className={className}
            style={size ? { width: size.width, height: size.height } : undefined}
        >
            <defs>
                <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b1" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="b2" />
                    <feMerge>
                        <feMergeNode in="b2" />
                        <feMergeNode in="b1" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            <path
                d="M120 40L60 160h35L70 260l70-130h-35Z"
                fill="none"
                stroke={glowColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={`url(#${filterId})`}
            />
        </svg>
    );
};
