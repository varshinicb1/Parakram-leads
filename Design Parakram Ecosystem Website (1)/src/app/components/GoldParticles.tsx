"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";

export function GoldParticles() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const particles: HTMLDivElement[] = [];
    for (let i = 0; i < 30; i++) {
      const el = document.createElement("div");
      el.style.cssText = `
        position: absolute;
        width: ${Math.random() * 3 + 1}px;
        height: ${Math.random() * 3 + 1}px;
        background: ${Math.random() > 0.5 ? "rgba(201,169,110,0.8)" : "rgba(16,185,129,0.6)"};
        border-radius: 50%;
        pointer-events: none;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        box-shadow: 0 0 ${Math.random() * 4 + 1}px ${Math.random() > 0.5 ? "rgba(201,169,110,0.3)" : "rgba(16,185,129,0.2)"};
      `;
      container.appendChild(el);
      particles.push(el);
    }

    const anims = particles.map((el) => {
      const xDrift = (Math.random() - 0.5) * 80;
      return animate(el, {
        translateY: [0, -(window.innerHeight * 0.3 + Math.random() * 200)],
        translateX: [0, xDrift],
        opacity: [
          { value: 0, duration: 0 },
          { value: 0.8, duration: 800 },
          { value: 0.8, duration: 1200 },
          { value: 0, duration: 800 },
        ],
        duration: 5000 + Math.random() * 8000,
        delay: Math.random() * 10000,
        loop: true,
        easing: "easeOutCubic",
      });
    });

    return () => {
      anims.forEach((a) => a.pause());
      particles.forEach((p) => p.remove());
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden z-0" />;
}
