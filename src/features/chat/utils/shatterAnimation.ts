import { toCanvas } from 'html-to-image';

export interface ShatterOptions {
    /** The duration of the particle animation in MS */
    duration?: number;
    /** The density of particles (1 is every pixel, 4 is every 4x4 block, 8 is every 8x8 block) */
    particleSize?: number;
    /** Call when the animation completely finishes */
    onComplete?: () => void;
    /** Dispersal forces */
    spreadX?: number;
    spreadY?: number;
}

export const shatterElement = async (element: HTMLElement, options: ShatterOptions = {}) => {
    const { 
        duration = 600, 
        particleSize = 4, 
        spreadX = 2.5, 
        spreadY = -2.5, 
        onComplete 
    } = options;

    // 1. Snapshot the element
    let snapshotCanvas: HTMLCanvasElement;
    try {
        snapshotCanvas = await toCanvas(element, { 
            backgroundColor: 'transparent', 
            pixelRatio: 1, // keep scale 1 for 1:1 pixel mapping mapped to particle size
            skipAutoScale: true,
            filter: (node: HTMLElement) => {
                // Ignore IMG tags to prevent ANY external CORS fetches breaking the canvas build
                return node?.tagName !== 'IMG';
            }
        });
    } catch (err) {
        console.error("html-to-image failed", err);
        if (onComplete) onComplete();
        return;
    }
    
    const ctx = snapshotCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
        if (onComplete) onComplete();
        return;
    }

    // 2. Hide original element immediately
    element.style.opacity = '0';
    element.style.pointerEvents = 'none'; // disable clicks

    const width = snapshotCanvas.width;
    const height = snapshotCanvas.height;

    let imageData: ImageData;
    try {
        imageData = ctx.getImageData(0, 0, width, height);
    } catch (err) {
        console.error("getImageData failed (likely tainted canvas)", err);
        if (onComplete) onComplete();
        return;
    }
    const data = imageData.data;

    // 3. Create Particles
    interface Particle {
        x: number;
        y: number;
        startX: number;
        startY: number;
        vx: number;
        vy: number;
        color: string;
        delay: number;
        life: number;
        maxLife: number;
        size: number;
    }

    const particles: Particle[] = [];
    
    // Scan the image data and create particles for opaque visual blocks
    for (let y = 0; y < height; y += particleSize) {
        for (let x = 0; x < width; x += particleSize) {
            const i = (y * width + x) * 4;
            const a = data[i + 3];
            
            if (a > 20) { // If pixel is highly visible
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // Thanos sweep effect bias (particles on the left/top start earlier)
                const delayBias = (x / width) * 0.4 + (y / height) * 0.4;
                const baseDelay = delayBias * (duration * 0.5); // Sweeps across half the duration
                
                particles.push({
                    x,
                    y,
                    startX: x,
                    startY: y,
                    vx: (Math.random() - 0.5) * spreadX + (x / width - 0.5) * spreadX * 0.5,
                    vy: (Math.random() - 1) * spreadY + (y / height - 0.5) * Math.abs(spreadY) * 0.5, // generally floats up/out
                    color: `rgba(${r}, ${g}, ${b}, ${a / 255})`,
                    delay: baseDelay + Math.random() * 100, // micro-randomness
                    life: 0,
                    maxLife: duration * 0.5 + Math.random() * (duration * 0.3), // Random lifetime
                    size: particleSize * (0.8 + Math.random() * 0.8) // slightly randomized sizes
                });
            }
        }
    }

    // 4. Create an overlay canvas to render the explosion
    const rect = element.getBoundingClientRect();
    const animCanvas = document.createElement('canvas');
    animCanvas.width = width;
    animCanvas.height = height + 100; // allow overflowing up
    animCanvas.style.position = 'fixed';
    animCanvas.style.top = (rect.top - 50) + 'px'; // offset for overflow
    animCanvas.style.left = rect.left + 'px';
    animCanvas.style.width = width + 'px';
    animCanvas.style.height = (height + 100) + 'px';
    animCanvas.style.pointerEvents = 'none';
    animCanvas.style.zIndex = '9999';
    
    document.body.appendChild(animCanvas);
    
    const animCtx = animCanvas.getContext('2d');
    if (!animCtx) {
        document.body.removeChild(animCanvas);
        if (onComplete) onComplete();
        return;
    }

    // 5. Animation Loop
    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const render = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const elapsed = timestamp - startTimestamp;

        animCtx.clearRect(0, 0, animCanvas.width, animCanvas.height);
        
        let activeParticles = 0;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            
            if (elapsed < p.delay) {
                // Not active yet, draw at starting position
                animCtx.fillStyle = p.color;
                animCtx.fillRect(p.x, p.y + 50, p.size, p.size); // +50 accounts for canvas top offset
                activeParticles++;
                continue;
            }

            const pElapsed = elapsed - p.delay;
            
            if (pElapsed < p.maxLife) {
                activeParticles++;
                
                // Physics: accelerate outwards and downwards slightly (gravity)
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.05; // tiny gravity
                
                // Fade out
                const progress = pElapsed / p.maxLife;      
                const opacity = 1 - Math.pow(progress, 2); // Ease-in fade curve

                animCtx.globalAlpha = opacity;
                animCtx.fillStyle = p.color;
                
                // Draw circle or square
                animCtx.beginPath();
                animCtx.arc(p.x + p.size/2, p.y + 50 + p.size/2, p.size/2, 0, Math.PI * 2);
                animCtx.fill();
            }
        }
        
        animCtx.globalAlpha = 1.0;

        if (activeParticles > 0 && elapsed < duration * 1.5) {
            animationFrameId = requestAnimationFrame(render);
        } else {
            // Cleanup
            document.body.removeChild(animCanvas);
            if (onComplete) onComplete();
        }
    };

    animationFrameId = requestAnimationFrame(render);
};
