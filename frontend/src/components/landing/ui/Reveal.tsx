import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}

const isServer = typeof window === 'undefined';

// En el prerender (SSG) el contenido debe quedar visible: nunca opacity:0 en el HTML horneado.
export default function Reveal({
  children,
  className,
  delay = 0,
  y = 20,
}: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (isServer || reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      transition={{ duration: 0.7, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
