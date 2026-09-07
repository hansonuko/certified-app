'use client';

import { motion, useReducedMotion } from 'framer-motion';

// docs/design-system.md §2: "Page transition — Fade + 8px slide-up, 250ms
// ease-out." Used from app/(marketing)/template.tsx, which Next.js
// remounts on every navigation within the group (unlike layout.tsx), so
// each marketing page gets the transition on entry.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
