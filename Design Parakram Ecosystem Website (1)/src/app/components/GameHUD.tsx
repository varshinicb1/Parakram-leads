"use client";

import { useState, useEffect } from "react";
import { animate } from "animejs";

const COINS_KEY = "parakram_coins";

export function getCoins(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(COINS_KEY) || "0", 10);
}

export function addCoins(amount: number) {
  const current = getCoins();
  const next = current + amount;
  localStorage.setItem(COINS_KEY, String(next));
  window.dispatchEvent(new CustomEvent("coins-updated", { detail: next }));
  return next;
}

export function GameHUD() {
  const [coins, setCoins] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setCoins(getCoins());
    setShow(true);

    const handle = (e: Event) => setCoins((e as CustomEvent).detail);
    window.addEventListener("coins-updated", handle);
    return () => window.removeEventListener("coins-updated", handle);
  }, []);

  useEffect(() => {
    if (coins > 0) {
      animate("#coin-hud", {
        scale: [1, 1.3, 1],
        duration: 300,
        easing: "easeOutQuad",
      });
    }
  }, [coins]);

  if (!show) return null;

  return (
    <div
      id="coin-hud"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3 py-2 border border-[#c9a96e]/20 bg-[#070707]/80 backdrop-blur-sm"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="url(#coinGrad)" stroke="#c9a96e" strokeWidth="1.5" />
        <text x="12" y="15" textAnchor="middle" fill="#0a0a0a" fontSize="11" fontWeight="bold">$</text>
        <defs>
          <radialGradient id="coinGrad" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#f5e4a8" />
            <stop offset="50%" stopColor="#c9a96e" />
            <stop offset="100%" stopColor="#8a6030" />
          </radialGradient>
        </defs>
      </svg>
      <span className="text-[12px] font-mono text-[#c9a96e]">{coins}</span>
    </div>
  );
}
