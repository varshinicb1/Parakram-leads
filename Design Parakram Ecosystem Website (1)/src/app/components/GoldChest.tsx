"use client";

import { motion } from "motion/react";

interface GoldChestProps {
  size?: number;
  open?: boolean;
  className?: string;
}

export function GoldChest({ size = 48, open = false, className = "" }: GoldChestProps) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      animate={open ? { scale: [1, 1.15, 1] } : { y: [0, -2, 0] }}
      transition={open ? { duration: 0.4 } : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Chest body */}
      <rect x="18" y="55" width="64" height="35" rx="3" fill="url(#chestGold)" stroke="#7a5020" strokeWidth="2" />
      {/* Chest lid */}
      <motion.path
        d={open ? "M18,55 Q50,30 82,55" : "M18,55 Q50,25 82,55"}
        fill="url(#lidGold)"
        stroke="#7a5020"
        strokeWidth="2.5"
        animate={open ? { d: "M18,55 Q50,30 82,55" } : { d: "M18,55 Q50,25 82,55" }}
        transition={{ duration: 0.3 }}
      />
      {/* Lock */}
      <rect x="44" y="62" width="12" height="10" rx="4" fill="#7a5020" />
      <rect x="47" y="64" width="6" height="6" rx="2" fill="#5a3a10" />
      {/* Gold bands */}
      <rect x="18" y="60" width="64" height="3" fill="#f5e4a8" opacity="0.4" rx="1" />
      <rect x="18" y="80" width="64" height="3" fill="#f5e4a8" opacity="0.4" rx="1" />
      {/* Coins spilling out when open */}
      {open && (
        <>
          <motion.circle cx="36" cy="67" r="3" fill="#f5e4a8" stroke="#c9a96e" strokeWidth="0.5" initial={{ y: 0 }} animate={{ y: -8, opacity: 0 }} transition={{ duration: 0.6, delay: 0.2 }} />
          <motion.circle cx="56" cy="65" r="3" fill="#f5e4a8" stroke="#c9a96e" strokeWidth="0.5" initial={{ y: 0 }} animate={{ y: -10, opacity: 0 }} transition={{ duration: 0.6, delay: 0.3 }} />
          <motion.circle cx="64" cy="70" r="2.5" fill="#f5e4a8" stroke="#c9a96e" strokeWidth="0.5" initial={{ y: 0 }} animate={{ y: -6, opacity: 0 }} transition={{ duration: 0.6, delay: 0.15 }} />
          <motion.circle cx="44" cy="58" r="3.5" fill="#f5e4a8" stroke="#c9a96e" strokeWidth="0.5" initial={{ y: 0 }} animate={{ y: -14, opacity: 0 }} transition={{ duration: 0.7, delay: 0.25 }} />
        </>
      )}
      {/* Shine */}
      <ellipse cx="35" cy="48" rx="6" ry="3" fill="white" opacity="0.15" transform="rotate(-20,35,48)" />
      {/* Gradients */}
      <defs>
        <linearGradient id="chestGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c9a96e" />
          <stop offset="50%" stopColor="#b8903a" />
          <stop offset="100%" stopColor="#8a6030" />
        </linearGradient>
        <linearGradient id="lidGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d4b060" />
          <stop offset="50%" stopColor="#f5e4a8" />
          <stop offset="100%" stopColor="#c9a96e" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
}
