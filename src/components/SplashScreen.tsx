import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 1000); // Wait for exit animation to finish
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#000000]"
          exit={{ opacity: 0, scale: 1.2, filter: "blur(20px)" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative flex flex-col items-center justify-center">
            {/* Glowing background blob */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0, 0.5, 0.3], scale: [0.5, 1.2, 1] }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="absolute h-48 w-48 rounded-full bg-white/10 blur-[50px]"
            />
            
            {/* Logo SVG */}
            <motion.svg
              width="80"
              height="80"
              viewBox="0 0 80 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="relative z-10"
            >
              {/* Outer Diamond */}
              <motion.rect
                x="40"
                y="10"
                width="42.4264"
                height="42.4264"
                rx="8"
                transform="rotate(45 40 10)"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />
              {/* Inner Diamond */}
              <motion.rect
                x="40"
                y="22"
                width="25.4558"
                height="25.4558"
                rx="4"
                transform="rotate(45 40 22)"
                stroke="white"
                strokeWidth="3"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, delay: 0.3, ease: "easeInOut" }}
              />
              {/* Center dot */}
              <motion.circle
                cx="40"
                cy="40"
                r="3"
                fill="white"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 1.2, type: "spring" }}
              />
            </motion.svg>

            {/* App Name */}
            <motion.div
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.8, delay: 1 }}
              className="mt-6 text-2xl font-light tracking-[0.2em] text-white"
            >
              GLASS LEDGER
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
