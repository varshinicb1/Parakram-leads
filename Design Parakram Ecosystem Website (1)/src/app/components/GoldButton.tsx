"use client";

import { useRef, useState, useCallback, type ReactNode } from "react";
import { motion } from "motion/react";
import { playButtonClick } from "../hooks/useAudio";

interface GoldButtonProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}

function GoldButton({ children, onClick, href, className = "", type = "button", disabled }: GoldButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glowX, setGlowX] = useState(50);
  const [glowY, setGlowY] = useState(50);

  const handleMouse = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setRotateX((y - 0.5) * -12);
    setRotateY((x - 0.5) * 12);
    setGlowX(x * 100);
    setGlowY(y * 100);
  }, []);

  const handleLeave = useCallback(() => {
    setRotateX(0);
    setRotateY(0);
    setGlowX(50);
    setGlowY(50);
  }, []);

  const handleClick = useCallback(() => {
    playButtonClick();
    onClick?.();
  }, [onClick]);

  const content = (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={handleClick}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      className={`relative overflow-hidden font-semibold tracking-[0.04em] cursor-pointer ${className}`}
      style={{
        perspective: "400px",
        transformStyle: "preserve-3d",
        background: "linear-gradient(135deg, #b8903a 0%, #d4b060 25%, #f5e4a8 50%, #c9a96e 75%, #b8903a 100%)",
        backgroundSize: "200% 200%",
        color: "#0a0500",
        border: "none",
        outline: "none",
        transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        boxShadow: `
          0 4px 15px rgba(201, 169, 110, 0.25),
          0 1px 3px rgba(0,0,0,0.2),
          inset 0 1px 0 rgba(255,255,255,0.4),
          inset 0 -1px 0 rgba(0,0,0,0.15)
        `,
        transition: "transform 0.15s ease-out, box-shadow 0.3s ease, background-position 0.6s ease",
        textShadow: "0 1px 1px rgba(255,255,255,0.3)",
      }}
      whileHover={{
        scale: 1.04,
        boxShadow: `
          0 8px 35px rgba(201, 169, 110, 0.5),
          0 2px 8px rgba(0,0,0,0.25),
          inset 0 1px 0 rgba(255,255,255,0.5),
          inset 0 -1px 0 rgba(0,0,0,0.1)
        `,
        backgroundPosition: "100% 100%",
      }}
      whileTap={{
        scale: 0.96,
        boxShadow: `
          0 2px 10px rgba(201, 169, 110, 0.3),
          inset 0 2px 4px rgba(0,0,0,0.2)
        `,
      }}
    >
      <span
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle 80px at ${glowX}% ${glowY}%, rgba(255,255,255,0.35) 0%, transparent 70%)`,
          transition: "background 0.1s ease-out",
        }}
      />
      <span
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100"
        style={{
          background: "repeating-linear-gradient(90deg, transparent 0px, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 3px)",
          backgroundSize: "4px 100%",
          animation: "shimmer 2s linear infinite",
        }}
      />
      <span className="relative z-10 flex items-center gap-2 justify-center">{children}</span>
    </motion.button>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="inline-block">
        {content}
      </a>
    );
  }

  return content;
}

export default GoldButton;
