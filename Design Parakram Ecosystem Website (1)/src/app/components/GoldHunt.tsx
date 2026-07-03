"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "motion/react";
import { animate } from "animejs";
import confetti from "canvas-confetti";
import { GoldChest } from "./GoldChest";

type Tile = "empty" | "wall" | "chest";

const MAP_W = 20;
const MAP_H = 14;
const TILE = 28;

function generateMap(level: number): { map: Tile[][]; chestX: number; chestY: number; playerX: number; playerY: number } {
  const map: Tile[][] = Array.from({ length: MAP_H }, () => Array(MAP_W).fill("empty"));

  const numWalls = 10 + level * 3;
  for (let i = 0; i < numWalls; i++) {
    const wx = 1 + Math.floor(Math.random() * (MAP_W - 2));
    const wy = 1 + Math.floor(Math.random() * (MAP_H - 2));
    if (map[wy][wx] === "empty") map[wy][wx] = "wall";
  }

  let chestX: number, chestY: number;
  do {
    chestX = Math.floor(Math.random() * (MAP_W - 4)) + 2;
    chestY = Math.floor(Math.random() * (MAP_H - 4)) + 2;
  } while (map[chestY][chestX] !== "empty" || (Math.abs(chestX - 1) < 3 && Math.abs(chestY - 1) < 3));
  map[chestY][chestX] = "chest";

  return { map, chestX, chestY, playerX: 1, playerY: 1 };
}

function proximity(a: number, b: number, x: number, y: number): string {
  const dist = Math.sqrt((a - x) ** 2 + (b - y) ** 2);
  if (dist < 2) return "BURNING!";
  if (dist < 4) return "HOT!";
  if (dist < 6) return "Warm";
  if (dist < 9) return "Cold";
  return "Freezing";
}

function proximityColor(p: string): string {
  if (p === "BURNING!") return "#ef4444";
  if (p === "HOT!") return "#f97316";
  if (p === "Warm") return "#eab308";
  if (p === "Cold") return "#10b981";
  return "#6b7280";
}

export function GoldHunt({ onTreasureFound, className = "" }: { onTreasureFound?: () => void; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [level, setLevel] = useState(1);
  const [coins, setCoins] = useState(0);
  const [gameState, setGameState] = useState<"playing" | "won">("playing");
  const [proximityText, setProximityText] = useState("---");
  const [moves, setMoves] = useState(0);

  const stateRef = useRef({ px: 1, py: 1, cx: 0, cy: 0, map: [] as Tile[][], level: 1 });
  const chestFoundRef = useRef(false);

  const initLevel = useCallback((lvl: number) => {
    const { map, chestX, chestY, playerX, playerY } = generateMap(lvl);
    stateRef.current = { px: playerX, py: playerY, cx: chestX, cy: chestY, map, level: lvl };
    chestFoundRef.current = false;
    setGameState("playing");
    setProximityText(proximity(playerX, playerY, chestX, chestY));
    setMoves(0);
  }, []);

  useEffect(() => {
    initLevel(1);
  }, [initLevel]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const s = stateRef.current;
    ctx.clearRect(0, 0, MAP_W * TILE, MAP_H * TILE);

    // Background grid
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const tile = s.map[y]?.[x];
        if (tile === "wall") {
          ctx.fillStyle = "#2a2a2a";
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
          ctx.fillStyle = "#3a3a3a";
          ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
        } else {
          ctx.fillStyle = (x + y) % 2 === 0 ? "#141414" : "#181818";
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
      }
    }

    // Chest (visible only when won or very close)
    if (chestFoundRef.current || proximity(s.px, s.py, s.cx, s.cy) === "BURNING!") {
      ctx.fillStyle = "#c9a96e";
      ctx.fillRect(s.cx * TILE + 4, s.cy * TILE + 6, TILE - 8, TILE - 8);
      ctx.fillStyle = "#7a5020";
      ctx.fillRect(s.cx * TILE + 10, s.cy * TILE + 12, 8, 6);
      ctx.fillStyle = "#f5e4a8";
      ctx.fillRect(s.cx * TILE + 6, s.cy * TILE + 8, TILE - 12, 3);
      ctx.fillStyle = "#f5e4a8";
      ctx.fillRect(s.cx * TILE + 6, s.cy * TILE + 18, TILE - 12, 2);
    } else if (proximity(s.px, s.py, s.cx, s.cy) === "HOT!") {
      // Faint glow where chest is
      ctx.fillStyle = "rgba(201, 169, 110, 0.08)";
      ctx.beginPath();
      ctx.arc(s.cx * TILE + TILE / 2, s.cy * TILE + TILE / 2, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player (torch/character)
    const px = s.px * TILE + TILE / 2;
    const py = s.py * TILE + TILE / 2;
    ctx.shadowColor = "#10b981";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Light aura around player
    const gradient = ctx.createRadialGradient(px, py, 2, px, py, TILE * 2);
    gradient.addColorStop(0, "rgba(16, 185, 129, 0.12)");
    gradient.addColorStop(1, "rgba(16, 185, 129, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(px, py, TILE * 2, 0, Math.PI * 2);
    ctx.fill();

    // Fog of war tiles (darken tiles far from player)
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const dist = Math.sqrt((x - s.px) ** 2 + (y - s.py) ** 2);
        if (dist > 4) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        } else if (dist > 2.5) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
      }
    }
  }, []);

  const movePlayer = useCallback((dx: number, dy: number) => {
    if (gameState !== "playing") return;
    const s = stateRef.current;
    const nx = s.px + dx;
    const ny = s.py + dy;
    if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) return;
    if (s.map[ny]?.[nx] === "wall") return;

    s.px = nx;
    s.py = ny;
    setMoves(m => m + 1);

    const prox = proximity(nx, ny, s.cx, s.cy);
    setProximityText(prox);

    // Shake canvas on HOT or BURNING
    if (prox === "HOT!" || prox === "BURNING!") {
      const canvas = canvasRef.current;
      if (canvas) {
        animate({
          targets: canvas,
          translateX: [0, -2, 2, -1, 1, 0],
          duration: 200,
          ease: "easeOutQuad",
        });
      }
    }

    if (nx === s.cx && ny === s.cy && !chestFoundRef.current) {
      chestFoundRef.current = true;
      setGameState("won");
      setCoins(c => c + 10 + Math.floor(50 / (moves + 1)));

      // Big confetti burst
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.5 },
        colors: ["#c9a96e", "#f5e4a8", "#10b981", "#22c55e"],
      });

      animate({
        targets: canvasRef.current,
        scale: [1, 1.03, 1],
        duration: 400,
        ease: "easeOutQuad",
      });

      onTreasureFound?.();
    }

    draw();
  }, [gameState, draw, onTreasureFound, moves]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    const keyMap: Record<string, [number, number]> = {
      ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
      W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0],
    };
    const dir = keyMap[e.key];
    if (dir) {
      e.preventDefault();
      movePlayer(dir[0], dir[1]);
    }
  }, [movePlayer]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  useEffect(() => {
    draw();
  }, [draw, level]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ex = e.clientX - rect.left;
    const ey = e.clientY - rect.top;
    const tx = Math.floor(ex / TILE);
    const ty = Math.floor(ey / TILE);
    const s = stateRef.current;
    if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return;
    if (s.map[ty]?.[tx] === "wall") return;

    // Simple pathfinding: move towards clicked tile
    const dx = Math.sign(tx - s.px);
    const dy = Math.sign(ty - s.py);
    if (dx !== 0) movePlayer(dx, 0);
    else if (dy !== 0) movePlayer(0, dy);
  }, [gameState, movePlayer]);

  const nextLevel = () => {
    const next = level + 1;
    setLevel(next);
    initLevel(next);
  };

  const restart = () => {
    setLevel(1);
    setCoins(0);
    initLevel(1);
  };

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      {/* HUD */}
      <div className="w-full flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <GoldChest size={18} />
            <span className="text-[11px] font-mono text-[#c9a96e]">x {coins}</span>
          </div>
          <span className="text-[9px] font-mono text-[#10b981]/50">LV {level}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-mono ${proximityText === "BURNING!" ? "text-red-400 animate-pulse" : proximityText === "HOT!" ? "text-orange-400" : proximityText === "Warm" ? "text-yellow-500" : "text-[#10b981]"}`}>
            [{proximityText}]
          </span>
          <span className="text-[9px] font-mono text-[#10b981]/30">{moves} moves</span>
        </div>
      </div>

      {/* Game canvas */}
      <canvas
        ref={canvasRef}
        width={MAP_W * TILE}
        height={MAP_H * TILE}
        onClick={handleClick}
        className="cursor-crosshair border border-[#c9a96e]/20 rounded"
        style={{ imageRendering: "pixelated" }}
      />

      {/* Controls hint */}
      <div className="flex items-center gap-4 mt-3">
        <span className="text-[8px] font-mono text-[#10b981]/30">Arrow keys / WASD to move · Click to pathfind</span>
      </div>

      {/* Win overlay */}
      {gameState === "won" && (
        <motion.div
          className="mt-4 p-4 border border-[#c9a96e]/30 bg-[#0a0a0a] text-center w-full"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <GoldChest size={24} open />
            <span className="text-[16px] font-semibold text-[#c9a96e]">Treasure Found!</span>
          </div>
          <p className="text-[11px] font-mono text-[#10b981] mb-3">
            +{10 + Math.floor(50 / (moves + 1))} gold coins in {moves} moves
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={nextLevel}
              className="px-4 py-2 text-[11px] font-mono text-[#c9a96e] border border-[#c9a96e]/30 hover:bg-[#c9a96e]/[0.06] transition-colors"
            >
              [ Next Level {level + 1} ]
            </button>
            <button
              onClick={restart}
              className="px-4 py-2 text-[11px] font-mono text-[#10b981] border border-[#10b981]/30 hover:bg-[#10b981]/[0.06] transition-colors"
            >
              [ Restart ]
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
