import { MetallicPaint } from './MetallicPaint';

interface BrandLogoProps extends React.SVGProps<SVGSVGElement> {
    className?: string;
    simple?: boolean;
}

export const BrandLogo = ({
    className = "w-10 h-12",
    simple = false,
    ...props
}: BrandLogoProps) => {
    if (simple) {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" className={className} {...props}>
                <path d="M120 40L60 160h35L70 260l70-130h-35Z" fill="currentColor" />
            </svg>
        );
    }

    return (
        <div className={className} style={{ position: 'relative', minWidth: '40px', minHeight: '48px' }}>
            <MetallicPaint
                imageSrc="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMzAwIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCI+PHBhdGggZD0iTTEyMCA0MEw2MCAxNjBoMzVMNzAgMjYwbDcwLTEzMGgtMzVaIiBmaWxsPSJibGFjayIgLz48L3N2Zz4="
                seed={11}
                scale={2}
                patternSharpness={1.5}
                noiseScale={0.8}
                speed={0.2}
                liquid={0.6}
                brightness={1.5}
                contrast={0.8}
                refraction={0.02}
                blur={0.01}
                chromaticSpread={1.5}
                fresnel={1}
                angle={45}
                waveAmplitude={1}
                distortion={0.5}
                contour={0.4}
                lightColor="#ffffff"
                darkColor="#000000"
                tintColor="#ffffff"
                style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
            />
        </div>
    );
};
