import { useEffect, useRef, useState } from 'react';
import '@/styles/grid.css';

export default function GridBackground() {
  const rafRef = useRef<number | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const w = window.innerWidth || 1;
        const h = window.innerHeight || 1;
        setPos({ x: e.clientX / w, y: e.clientY / h });
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('pointermove', onMove as any);
    };
  }, []);

  const style = {
    // center in pixels for mask
    ['--mx' as any]: `calc(${pos.x * 100}% )`,
    ['--my' as any]: `calc(${pos.y * 100}% )`,
  } as React.CSSProperties;

  return (
    <div className="gridbg-root" aria-hidden>
      <div className="gridbg-base" />
      <div className="gridbg-highlight" style={style} />
      {/* Mask the header area so grid doesn't show under header */}
      <div className="gridbg-header-mask" />
    </div>
  );
}

