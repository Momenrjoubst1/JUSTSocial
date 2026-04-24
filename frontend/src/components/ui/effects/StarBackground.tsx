import React, { useEffect, useRef } from 'react';

export const StarBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let stars: Star[] = [];

    const numStars = 140;

    class Star {
      x: number;
      y: number;
      size: number;
      speedY: number;
      opacity: number;
      opacityChange: number;
      driftSeed: number;
      driftSpeed: number;

      constructor(canvasWidth: number, canvasHeight: number) {
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.size = Math.random() * 2.2 + 0.3; // 0.3 to 2.5
        this.speedY = Math.random() * 0.3 + 0.1; // slow movement upwards
        this.opacity = Math.random() * 0.85 + 0.05; // 0.05 to 0.9
        this.opacityChange = (Math.random() * 0.01 + 0.005) * (Math.random() > 0.5 ? 1 : -1);
        this.driftSeed = Math.random() * Math.PI * 2;
        this.driftSpeed = Math.random() * 0.02 + 0.01;
      }

      update(canvasWidth: number, canvasHeight: number) {
        // Move upwards
        this.y -= this.speedY;

        // Drift horizontally
        this.driftSeed += this.driftSpeed;
        this.x += Math.sin(this.driftSeed) * 0.5;

        // Twinkling
        this.opacity += this.opacityChange;
        if (this.opacity > 0.9) {
          this.opacity = 0.9;
          this.opacityChange *= -1;
        } else if (this.opacity < 0.05) {
          this.opacity = 0.05;
          this.opacityChange *= -1;
        }

        // Loop from bottom
        if (this.y < -this.size) {
          this.y = canvasHeight + this.size;
          this.x = Math.random() * canvasWidth; // random horizontal position
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.fill();
      }
    }

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stars = [];
      for (let i = 0; i < numStars; i++) {
        stars.push(new Star(canvas.width, canvas.height));
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(star => {
        star.update(canvas.width, canvas.height);
        star.draw(ctx);
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};
