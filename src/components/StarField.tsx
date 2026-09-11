import { useMemo } from 'react';

interface StarFieldProps {
  count?: number;
}

export function StarField({ count = 800 }: StarFieldProps) {
  const stars = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.5 + 0.3,
      opacity: Math.random() * 0.6 + 0.2,
      twinkleDelay: Math.random() * 4,
    }));
  }, [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animation: `pulse-dot ${2 + star.twinkleDelay}s ease-in-out infinite`,
            animationDelay: `${star.twinkleDelay}s`,
          }}
        />
      ))}
    </div>
  );
}
