"use client";

import SnakeGame from "../components/SnakeGame";

function PlayPage() {
  return (
    <div className="min-h-screen pt-24 pb-32">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-12 text-center">
          <p className="text-[10px] tracking-[0.32em] text-[#c9a96e] uppercase font-mono mb-4">ARCADE</p>
          <h1 style={{ fontFamily: "'Press Start 2P', monospace" }} className="text-[18px] md:text-[26px] text-[#e8e6e3] mb-5 leading-loose">
            LEAP
          </h1>
          <p className="text-[14px] text-[#5a5a5a] max-w-md mx-auto">Run, jump, collect gold coins, and stomp goombas. Combos = more points. How high can you score?</p>
          <p className="text-[10px] font-mono text-[#2a2a2a] mt-2">Arrows to move · Space/Up to jump · Stomp enemies from above</p>
        </div>

        <div className="flex flex-col items-center gap-6">
          <SnakeGame />
        </div>
      </div>
    </div>
  );
}

export default PlayPage;
