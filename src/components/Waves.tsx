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
  lineColor = 'rgba(255, 255, 255, 0.15)',
  backgroundColor = 'transparent',
  waveSpeedX = 0.015,
  waveSpeedY = 0.008,
  waveAmpX = 35,
  waveAmpY = 25,
  friction = 0.92,
  tension = 0.012,
  maxCursorMove = 160,
  xGap = 24,
  yGap = 44,
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

    const bleed = 120; // Generous bleed margin past screen borders so ends never appear broken or cut off

    const init = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      points = [];
      for (let y = -bleed; y <= height + bleed; y += yGap) {
        const row = [];
        for (let x = -bleed; x <= width + bleed; x += xGap) {
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

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1.1;

      for (let r = 0; r < points.length; r++) {
        const row = points[r];
        if (row.length < 2) continue;

        for (let c = 0; c < row.length; c++) {
          const p = row[c];

          // Harmonic multi-frequency waves for natural, elegant flowing curves
          const dx =
            Math.sin(time * waveSpeedX + p.originY * 0.008) * waveAmpX +
            Math.cos(time * (waveSpeedX * 0.6) + p.originX * 0.004) * (waveAmpX * 0.35);

          const dy =
            Math.cos(time * waveSpeedY + p.originX * 0.007) * waveAmpY +
            Math.sin(time * (waveSpeedY * 0.8) + p.originY * 0.005) * (waveAmpY * 0.4);

          const targetX = p.originX + dx;
          const targetY = p.originY + dy;

          // Smooth interactive cursor deformation with inverse distance falloff
          const distX = mouse.x - p.x;
          const distY = mouse.y - p.y;
          const dist = Math.sqrt(distX * distX + distY * distY);

          if (dist < maxCursorMove) {
            const force = Math.cos((dist / maxCursorMove) * (Math.PI / 2));
            p.vx -= (distX / (dist || 1)) * force * 3.5;
            p.vy -= (distY / (dist || 1)) * force * 3.5;
          }

          // Elastic spring physics
          p.vx += (targetX - p.x) * tension;
          p.vy += (targetY - p.y) * tension;

          p.vx *= friction;
          p.vy *= friction;

          p.x += p.vx;
          p.y += p.vy;
        }

        // Draw fluid quadratic Bézier spline through midpoints for silky curves
        ctx.beginPath();
        ctx.moveTo(row[0].x, row[0].y);

        for (let c = 0; c < row.length - 1; c++) {
          const current = row[c];
          const next = row[c + 1];
          const midX = (current.x + next.x) / 2;
          const midY = (current.y + next.y) / 2;
          ctx.quadraticCurveTo(current.x, current.y, midX, midY);
        }

        const last = row[row.length - 1];
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
      }

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
