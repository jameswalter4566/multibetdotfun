import React, { useMemo } from 'react';
import '@/styles/illuminate.css';

type Props = {
  text: string;
  className?: string;
  reverse?: boolean; // if true, illuminate from last to first
};

export default function WordGlow({ text, className, reverse }: Props) {
  const words = useMemo(() => text.split(/\s+/g), [text]);
  const total = words.length;
  return (
    <p className={['glow-text', className].filter(Boolean).join(' ')}>
      {words.map((w, i) => {
        const idx = reverse ? (total - 1 - i) : i;
        return (
          <span key={i} className="glow-word" style={{ ['--i' as any]: idx }}>
            {w}{i < total - 1 ? ' ' : ''}
          </span>
        );
      })}
    </p>
  );
}

