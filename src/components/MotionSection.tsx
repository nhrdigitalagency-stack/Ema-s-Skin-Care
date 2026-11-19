import React from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';

export const EDITORIAL_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const PRODUCT_GRID_VARIANTS: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.085,
      delayChildren: 0.04,
    },
  },
};

export const PRODUCT_CARD_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.48,
      ease: EDITORIAL_EASE,
    },
  },
};

const GRID_VARIANTS: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.065,
      delayChildren: 0.04,
    },
  },
};

const GRID_ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 22, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.45,
      ease: EDITORIAL_EASE,
    },
  },
};

export function MotionPage({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.32, ease: EDITORIAL_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionSection({
  children,
  className = '',
  delay = 0,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  id?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <section id={id} className={className}>
        {children}
      </section>
    );
  }

  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.56, delay, ease: EDITORIAL_EASE }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export function MotionProductGrid({
  children,
  className = '',
  animateOnMount = false,
}: {
  children: React.ReactNode;
  className?: string;
  animateOnMount?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={PRODUCT_GRID_VARIANTS}
      initial="hidden"
      animate={animateOnMount ? 'visible' : undefined}
      whileInView={animateOnMount ? undefined : 'visible'}
      viewport={animateOnMount ? undefined : { once: true, amount: 0.03 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionGrid({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={GRID_VARIANTS}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.06 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionGridItem({
  children,
  className = '',
  hoverScale = true,
}: {
  children: React.ReactNode;
  className?: string;
  hoverScale?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={GRID_ITEM_VARIANTS}
      whileHover={hoverScale ? { y: -4, scale: 1.01 } : undefined}
      transition={{ duration: 0.22, ease: EDITORIAL_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionItem({
  children,
  className = '',
  index = 0,
  hoverLift = true,
}: {
  children: React.ReactNode;
  className?: string;
  index?: number;
  hoverLift?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.988 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{
        duration: 0.45,
        delay: Math.min(index * 0.06, 0.36),
        ease: EDITORIAL_EASE,
      }}
      whileHover={hoverLift ? { y: -4, scale: 1.01 } : undefined}
      className={className}
    >
      {children}
    </motion.div>
  );
}
