import React, { useRef, useEffect } from 'react';

interface WavesProps {
  lineColor?: string;
  backgroundColor?: string;
  waveSpeedX?: number;
  waveSpeedY?: number;
  waveAmpX?: number;
  waveAmpY?: number;
  friction?: number;
  tension?: number;
  maxCursorMove?: number;
  xGap?: number;
  yGap?: number;
  className?: string;
}

export const Waves: React.FC<WavesProps> = ({
  lineColor = '#fcf7fa',
  backgroundColor = 'transparent',
  waveSpeedX = 0.02,
  waveSpeedY = 0.01,
  waveAmpX = 40,
  waveAmpY = 20,
  friction = 0.9,
  tension = 0.01,
  maxCursorMove = 200,
  xGap = 12,
  yGap = 36,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let points: any[] = [];
    let mouse = { x: -1000, y: -1000 };

    const init = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      points = [];
      for (let y = 0; y <= height + yGap; y += yGap) {
        const row = [];
        for (let x = 0; x <= width + xGap; x += xGap) {
          row.push({
            x,
            y,
            originX: x,
            originY: y,
            vx: 0,
            vy: 0,
          });
        }
        points.push(row);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('resize', init);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    init();

    let time = 0;

    const render = () => {
      if (backgroundColor === 'transparent') {
        ctx.clearRect(0, 0, width, height);
      } else {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
      }

      time += 1;

      ctx.beginPath();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;

      for (let r = 0; r < points.length; r++) {
        for (let c = 0; c < points[r].length; c++) {
          const p = points[r][c];

          // Wave movement
          const dx = Math.sin(time * waveSpeedX + p.originY * 0.05) * waveAmpX;
          const dy = Math.cos(time * waveSpeedY + p.originX * 0.05) * waveAmpY;

          const targetX = p.originX + dx;
          const targetY = p.originY + dy;

          // Mouse interaction
          const distX = mouse.x - p.x;
          const distY = mouse.y - p.y;
          const dist = Math.sqrt(distX * distX + distY * distY);

          if (dist < maxCursorMove) {
            const force = (maxCursorMove - dist) / maxCursorMove;
            p.vx -= (distX / dist) * force * 5;
            p.vy -= (distY / dist) * force * 5;
          }

          // Spring physics
          p.vx += (targetX - p.x) * tension;
          p.vy += (targetY - p.y) * tension;
          
          p.vx *= friction;
          p.vy *= friction;

          p.x += p.vx;
          p.y += p.vy;

          if (c === 0) {
            ctx.moveTo(p.x, p.y);
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
      }
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', init);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [lineColor, backgroundColor, waveSpeedX, waveSpeedY, waveAmpX, waveAmpY, friction, tension, maxCursorMove, xGap, yGap]);

  return <canvas ref={canvasRef} className={`block w-full h-full ${className || ''}`} />;
};
