import { useEffect, useState } from 'react';

interface EnterTransitionProps {
  onComplete: () => void;
}

export function EnterTransition({ onComplete }: EnterTransitionProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 700),
      setTimeout(() => setPhase(3), 1400),
      setTimeout(() => onComplete(), 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
      style={{ background: '#000000' }}
    >
      {/* Expanding cyan glow — camera pushing into Earth */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transition: 'all 1.4s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: phase >= 1 ? 'scale(4)' : 'scale(1)',
          opacity: phase >= 3 ? 0 : 1,
        }}
      >
        <div
          className="w-48 h-48 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0,245,255,0.5) 0%, rgba(0,180,255,0.15) 40%, transparent 70%)',
            transition: 'all 1s ease-out',
            transform: phase >= 2 ? 'scale(3)' : 'scale(1)',
          }}
        />
      </div>

      {/* Bright flash at peak */}
      {phase >= 2 && (
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at center, rgba(255,255,255,0.7) 0%, rgba(0,245,255,0.3) 20%, transparent 50%)',
            animation: 'pulse-dot 0.3s ease-out',
          }}
        />
      )}

      {/* Scan lines — two directional sweeps */}
      <div className="absolute inset-0 overflow-hidden opacity-40">
        <div
          className="absolute w-full h-0.5"
          style={{
            background: 'linear-gradient(90deg, transparent, #00F5FF 50%, transparent)',
            animation: 'scan-line 1.4s linear',
          }}
        />
      </div>

      {/* Expanding ring */}
      {phase >= 1 && (
        <div
          className="absolute top-1/2 left-1/2 rounded-full"
          style={{
            width: '100px',
            height: '100px',
            marginLeft: '-50px',
            marginTop: '-50px',
            border: '1px solid rgba(0,245,255,0.5)',
            transition: 'all 1.3s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: phase >= 2 ? 'scale(8)' : 'scale(1)',
            opacity: phase >= 3 ? 0 : 0.8,
          }}
        />
      )}
    </div>
  );
}
