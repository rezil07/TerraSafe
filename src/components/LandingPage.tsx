import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { StarField } from './StarField';
import { Earth } from './Earth';
import { EnterTransition } from './EnterTransition';

interface LandingPageProps {
  onEnter: () => void;
}

export function LandingPage({ onEnter }: LandingPageProps) {
  const [entering, setEntering] = useState(false);
  const [showUI, setShowUI] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const timer = setTimeout(() => setShowUI(true), 700);
    return () => clearTimeout(timer);
  }, []);

  const handleEnter = () => {
    if (entering) return;
    setEntering(true);
  };

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 50%, #031420 0%, #01060A 50%, #000000 100%)',
      }}
    >
      <StarField count={reducedMotion ? 150 : 600} />

      {/* Top accent line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        className="absolute top-0 left-0 right-0 h-px origin-center z-30"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.35), transparent)' }}
      />

      {/* Earth 3D — fills the screen behind all UI */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, ease: 'easeOut' }}
        className="absolute inset-0 z-0"
      >
        <Earth autoRotate={!reducedMotion} className="w-full h-full" />
      </motion.div>

      {/* Cinematic vignette — top and bottom darkening */}
      <div className="absolute inset-0 z-10 pointer-events-none" style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, transparent 22%, transparent 72%, rgba(0,0,0,0.9) 100%)',
      }} />

      {/* ========== CENTER TITLE ========== */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
        <div className="h-[6vh] md:h-[8vh]" />

        <motion.h1
          initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
          animate={showUI ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
          className="terrasafe-wordmark text-4xl sm:text-5xl md:text-7xl lg:text-[5.5rem] leading-none text-center px-4"
          style={{
            textShadow: '0 0 40px rgba(0,245,255,0.5), 0 0 80px rgba(0,245,255,0.2), 0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          TERRASAFE
        </motion.h1>

        {/* Animated divider */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={showUI ? { width: '200px', opacity: 1 } : {}}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.7 }}
          className="h-px mt-4 sm:mt-6"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.6), transparent)' }}
        />
      </div>

      {/* ========== BOTTOM: BUTTON ========== */}
      <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center pb-8 sm:pb-12 px-4">
        <AnimatePresence>
          {showUI && !entering && (
            <motion.button
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.25 } }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.4 }}
              onClick={handleEnter}
              className="group relative flex items-center gap-2 sm:gap-3 px-6 sm:px-9 py-3 sm:py-4 pointer-events-auto"
              style={{
                borderRadius: '4px',
                border: '1px solid rgba(0,245,255,0.4)',
                backgroundColor: 'rgba(2,7,11,0.6)',
                color: '#F5F7FA',
                boxShadow: '0 0 20px rgba(0,245,255,0.1), inset 0 1px 0 rgba(0,245,255,0.06)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0,245,255,0.8)';
                e.currentTarget.style.backgroundColor = 'rgba(0,245,255,0.08)';
                e.currentTarget.style.boxShadow = '0 0 32px rgba(0,245,255,0.3), inset 0 1px 0 rgba(0,245,255,0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0,245,255,0.4)';
                e.currentTarget.style.backgroundColor = 'rgba(2,7,11,0.6)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(0,245,255,0.1), inset 0 1px 0 rgba(0,245,255,0.06)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Glow sweep on hover */}
              <span
                className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: 'linear-gradient(110deg, transparent 30%, rgba(0,245,255,0.08) 50%, transparent 70%)',
                }}
              />
              {/* Corner brackets — aesthetic frame accents */}
              <span className="absolute top-0 left-0 w-2 h-2 border-t border-l pointer-events-none" style={{ borderColor: 'rgba(0,245,255,0.6)' }} />
              <span className="absolute top-0 right-0 w-2 h-2 border-t border-r pointer-events-none" style={{ borderColor: 'rgba(0,245,255,0.6)' }} />
              <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l pointer-events-none" style={{ borderColor: 'rgba(0,245,255,0.6)' }} />
              <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r pointer-events-none" style={{ borderColor: 'rgba(0,245,255,0.6)' }} />

              <span className="text-sm md:text-base font-semibold tracking-[0.18em] uppercase relative">
                Enter System
              </span>
              <ArrowRight className="w-4 h-4 text-cyan transition-transform duration-300 group-hover:translate-x-1 relative" />
            </motion.button>
          )}
        </AnimatePresence>

        {showUI && !entering && !reducedMotion && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            transition={{ delay: 1.6, duration: 0.8 }}
            className="mt-5 text-[10px] font-mono text-fog/50"
          >
            Drag to rotate · Scroll to zoom
          </motion.p>
        )}
      </div>

      {/* Bottom accent line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        className="absolute bottom-0 left-0 right-0 h-px origin-center z-30"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.35), transparent)' }}
      />

      {entering && <EnterTransition onComplete={onEnter} />}
    </div>
  );
}
