"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "motion/react";
import Panel from "./Panel";
import Scanlines from "./Scanlines";

const W = 400, H = 300;
const GRAVITY = 0.5;
const JUMP_FORCE = -9;
const MOVE_SPEED = 4;
const PLAYER_W = 20, PLAYER_H = 28;

interface Player { x: number; y: number; vx: number; vy: number; w: number; h: number; onGround: boolean; }
interface Platform { x: number; y: number; w: number; h: number; }
interface Coin { x: number; y: number; w: number; h: number; collected: boolean; }
interface Enemy { x: number; y: number; w: number; h: number; vx: number; alive: boolean; }

function rectCollide(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function generateLevel(score: number) {
  const level = score < 10 ? 1 : score < 25 ? 2 : score < 50 ? 3 : 4;
  const platforms: Platform[] = [{ x: 0, y: H - 40, w: 80, h: 40 }, { x: 110, y: H - 60, w: 60, h: 20 }, { x: 200, y: H - 90, w: 60, h: 20 }, { x: 290, y: H - 70, w: 50, h: 20 }, { x: 350, y: H - 40, w: 50, h: 40 }];
  if (level >= 2) { platforms.push({ x: 50, y: H - 130, w: 40, h: 20 }, { x: 160, y: H - 140, w: 40, h: 20 }); }
  if (level >= 3) { platforms.push({ x: 240, y: H - 160, w: 50, h: 20 }, { x: 310, y: H - 130, w: 40, h: 20 }); }
  const coins: Coin[] = [
    { x: 125, y: H - 80, w: 10, h: 10, collected: false },
    { x: 215, y: H - 110, w: 10, h: 10, collected: false },
    { x: 305, y: H - 90, w: 10, h: 10, collected: false },
  ];
  if (level >= 2) { coins.push({ x: 65, y: H - 150, w: 10, h: 10, collected: false }, { x: 175, y: H - 160, w: 10, h: 10, collected: false }); }
  if (level >= 3) { coins.push({ x: 255, y: H - 180, w: 10, h: 10, collected: false }, { x: 325, y: H - 150, w: 10, h: 10, collected: false }); }
  const enemies: Enemy[] = [
    { x: 130, y: H - 52, w: 18, h: 14, vx: level >= 2 ? 1.2 : 0.8, alive: true },
  ];
  if (level >= 2) { enemies.push({ x: 260, y: H - 82, w: 18, h: 14, vx: 1, alive: true }); }
  if (level >= 3) { enemies.push({ x: 50, y: H - 122, w: 18, h: 14, vx: 1.5, alive: true }); }
  return { platforms, coins, enemies, level, scrollX: 0 };
}

type GameState = ReturnType<typeof generateLevel> & { player: Player; combo: number; maxCombo: number; particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] };

function MarioGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gs = useRef<GameState | null>(null);
  const animRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [phase, setPhase] = useState<"idle" | "playing" | "dead">("idle");
  const [comboText, setComboText] = useState("");

  useEffect(() => {
    try { const hs = localStorage.getItem("mario_high"); if (hs) setHighScore(parseInt(hs)); } catch {}
  }, []);

  const spawnParticles = useCallback((state: GameState, x: number, y: number, color: string, count = 8) => {
    for (let i = 0; i < count; i++) {
      state.particles.push({ x, y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4 - 2, life: 30 + Math.random() * 20, color });
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const state = gs.current; if (!state) return;
    const { player, platforms, coins, enemies, particles, combo, scrollX } = state;

    ctx.fillStyle = "#07070a";
    ctx.fillRect(0, 0, W, H);

    const backgroundGrad = ctx.createLinearGradient(0, 0, 0, H);
    backgroundGrad.addColorStop(0, "#0a0a12");
    backgroundGrad.addColorStop(1, "#050508");
    ctx.fillStyle = backgroundGrad;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 6; i++) {
      const bx = (i * 80 - scrollX * 0.3) % (W + 80);
      ctx.fillStyle = "rgba(201,169,110,0.03)";
      ctx.fillRect(bx, H - 80 - i * 12, 40, 8);
    }

    platforms.forEach(p => {
      const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
      grad.addColorStop(0, "#2a2015");
      grad.addColorStop(1, "#1a1208");
      ctx.fillStyle = grad;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = "rgba(201,169,110,0.3)";
      ctx.fillRect(p.x, p.y, p.w, 2);
    });

    enemies.forEach(e => {
      if (!e.alive) return;
      const bodyColor = "#5a3a1a";
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, e.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a2010";
      ctx.fillRect(e.x + 3, e.y + 3, 5, 4);
      ctx.fillRect(e.x + e.w - 8, e.y + 3, 5, 4);
      ctx.fillStyle = "#fff";
      ctx.fillRect(e.x + 4, e.y + 6, 3, 3);
      ctx.fillRect(e.x + e.w - 7, e.y + 6, 3, 3);
      ctx.fillStyle = "#1a0a00";
      ctx.fillRect(e.x + 5, e.y + 7, 2, 2);
      ctx.fillRect(e.x + e.w - 6, e.y + 7, 2, 2);
    });

    coins.forEach(c => {
      if (c.collected) return;
      const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
      const pulse = Math.sin(Date.now() / 300) * 2;
      const grad = ctx.createRadialGradient(cx, cy + pulse, 1, cx, cy + pulse, 8);
      grad.addColorStop(0, "#f5e4a8");
      grad.addColorStop(0.5, "#c9a96e");
      grad.addColorStop(1, "rgba(201,169,110,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy + pulse, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f5e4a8";
      ctx.font = "8px monospace";
      ctx.textAlign = "center";
      ctx.fillText("$", cx, cy + pulse + 3);
    });

    const px = player.x, py = player.y;
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#c9a96e";
    ctx.fillStyle = "#f5e4a8";
    ctx.fillRect(px + 2, py, player.w - 4, player.h);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#c9a96e";
    ctx.fillRect(px, py + 6, player.w, 4);
    ctx.fillRect(px, py + player.h - 6, player.w, 4);
    ctx.fillStyle = "#1a0f00";
    ctx.fillRect(px + 4, py + 8, 3, 3);
    ctx.fillRect(px + player.w - 7, py + 8, 3, 3);
    if (!player.onGround) {
      ctx.fillStyle = "#c9a96e";
      ctx.fillRect(px + player.w / 2 - 1, py + player.h, 2, 4);
    }

    particles.forEach(p => {
      ctx.globalAlpha = p.life / 50;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.font = "8px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`LVL ${state.level}`, 8, 14);
    ctx.textAlign = "right";
    ctx.fillText(`HI ${highScore}`, W - 8, 14);
  }, [highScore]);

  const gameLoop = useCallback(() => {
    const state = gs.current; if (!state) return;
    const { player, platforms, coins, enemies, particles } = state;
    const keys = keysRef.current;

    player.vx = 0;
    if (keys.has("ArrowLeft") || keys.has("a")) player.vx = -MOVE_SPEED;
    if (keys.has("ArrowRight") || keys.has("d")) player.vx = MOVE_SPEED;
    if ((keys.has("ArrowUp") || keys.has("w") || keys.has(" ")) && player.onGround) {
      player.vy = JUMP_FORCE;
      player.onGround = false;
    }

    player.vy += GRAVITY;
    player.x += player.vx;
    player.y += player.vy;

    player.onGround = false;
    platforms.forEach(p => {
      if (rectCollide(player, p)) {
        if (player.vy > 0 && player.y + player.h - player.vy <= p.y + 4) {
          player.y = p.y - player.h;
          player.vy = 0;
          player.onGround = true;
        } else if (player.vy < 0 && player.y - player.vy >= p.y + p.h - 4) {
          player.y = p.y + p.h;
          player.vy = 0;
        } else {
          const mid = p.x + p.w / 2;
          if (player.x + player.w / 2 < mid) player.x = p.x - player.w;
          else player.x = p.x + p.w;
        }
      }
    });

    enemies.forEach(e => {
      if (!e.alive) return;
      e.x += e.vx;
      if (e.x <= 0 || e.x + e.w >= W) e.vx *= -1;
      if (rectCollide(player, e)) {
        if (player.vy > 0 && player.y + player.h - player.vy <= e.y + 8) {
          e.alive = false;
          player.vy = JUMP_FORCE / 1.5;
          state.combo++;
          if (state.combo > state.maxCombo) state.maxCombo = state.combo;
          const bonus = state.combo * 10;
          state.particles.push({ x: e.x, y: e.y, vx: 0, vy: -3, life: 40, color: "#ff4444" });
          setComboText(state.combo >= 3 ? `COMBO x${state.combo}! +${bonus}` : `+${bonus}`);
          setTimeout(() => setComboText(""), 800);
        } else {
          state.player.alive = false;
          setPhase("dead");
          cancelAnimationFrame(animRef.current);
          const hs = parseInt(localStorage.getItem("mario_high") || "0");
          const finalScore = score;
          if (finalScore > highScore) {
            setHighScore(finalScore);
            localStorage.setItem("mario_high", String(finalScore));
          }
          return;
        }
      }
    });

    coins.forEach(c => {
      if (c.collected) return;
      if (rectCollide(player, c)) {
        c.collected = true;
        state.combo++;
        if (state.combo > state.maxCombo) state.maxCombo = state.combo;
        const bonus = state.combo * 5;
        spawnParticles(state, c.x, c.y, "#f5e4a8", 10);
        const pointValue = 10 + bonus;
        setScore(prev => prev + pointValue);
        setComboText(state.combo >= 3 ? `COMBO x${state.combo}! +${pointValue}` : `+${pointValue}`);
        setTimeout(() => setComboText(""), 600);
      }
    });

    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--; });
    for (let i = particles.length - 1; i >= 0; i--) { if (particles[i].life <= 0) particles.splice(i, 1); }

    if (player.y > H + 50) {
      setPhase("dead");
      cancelAnimationFrame(animRef.current);
      const finalScore = score;
      if (finalScore > highScore) {
        setHighScore(finalScore);
        localStorage.setItem("mario_high", String(finalScore));
      }
      return;
    }

    draw();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [draw, score, highScore, spawnParticles]);

  const start = useCallback(() => {
    const player: Player = { x: 30, y: H - 70, vx: 0, vy: 0, w: PLAYER_W, h: PLAYER_H, onGround: false };
    setScore(0);
    setComboText("");
    const level = generateLevel(0);
    gs.current = { ...level, player, combo: 0, maxCombo: 0, particles: [] };
    setPhase("playing");
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(gameLoop);
    draw();
  }, [gameLoop, draw]);

  useEffect(() => {
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    };
    const hu = (e: KeyboardEvent) => { keysRef.current.delete(e.key); };
    window.addEventListener("keydown", h);
    window.addEventListener("keyup", hu);
    return () => { window.removeEventListener("keydown", h); window.removeEventListener("keyup", hu); };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <Panel title="MARIO.EXE" className="p-2">
        <div className="relative">
          <canvas ref={canvasRef} width={W} height={H} className="block" style={{ imageRendering: "pixelated" }} />
          {phase !== "playing" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
              <Scanlines />
              <div className="relative z-10 text-center px-6">
                {phase === "dead" && (
                  <><p style={{ fontFamily: "'Press Start 2P', monospace" }} className="text-[#c9a96e] text-sm mb-3 leading-relaxed">GAME OVER</p>
                  <p className="text-[#5a5a5a] text-xs font-mono mb-2">Score: {score}</p>
                  {score >= highScore && score > 0 && <p className="text-[#f5e4a8] text-[10px] font-mono mb-2 animate-pulse">NEW HIGH SCORE!</p>}
                  <p className="text-[#3a3a3a] text-[10px] font-mono mb-6">Best: {highScore}</p></>
                )}
                {phase === "idle" && (
                  <><p style={{ fontFamily: "'Press Start 2P', monospace" }} className="text-[#c9a96e] text-sm mb-4 leading-loose">LEAP</p>
                  <p className="text-[#5a5a5a] text-xs font-mono mb-1">Run, jump, collect coins.</p>
                  <p className="text-[#5a5a5a] text-xs font-mono mb-1">Stomp enemies for bonus points.</p>
                  <p className="text-[#3a3a3a] text-xs font-mono mb-2">Arrows / WASD + Space to jump</p>
                  <p className="text-[#2a2a2a] text-[10px] font-mono mb-6">Best: {highScore}</p></>
                )}
                <button onClick={start}
                  className="px-5 py-3 text-[9px] text-[#c9a96e] tracking-[0.15em] hover:bg-[#c9a96e]/10 transition-colors leading-relaxed"
                  style={{ fontFamily: "'Press Start 2P', monospace", border: "1px solid rgba(201,169,110,0.4)" }}>
                  {phase === "dead" ? "RETRY" : "START"}
                </button>
              </div>
            </div>
          )}
          {comboText && phase === "playing" && (
            <motion.div
              key={comboText}
              className="absolute top-8 left-1/2 -translate-x-1/2 z-20"
              initial={{ opacity: 1, y: 0, scale: 0.5 }}
              animate={{ opacity: 0, y: -30, scale: 1.2 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <p className="text-[#f5e4a8] text-xs font-mono whitespace-nowrap" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                {comboText}
              </p>
            </motion.div>
          )}
        </div>
      </Panel>
      <div className="flex items-center justify-between w-full px-1">
        <span className="text-[11px] font-mono text-[#c9a96e]">SCORE: <span className="text-[#f5e4a8]">{score}</span></span>
        <span className="text-[11px] font-mono text-[#2a2a2a]">Arrows + Space</span>
      </div>
      <div className="flex items-center gap-2">
        <button onPointerDown={() => keysRef.current.add("ArrowLeft")} onPointerUp={() => keysRef.current.delete("ArrowLeft")} onPointerLeave={() => keysRef.current.delete("ArrowLeft")} className="w-12 h-12 flex items-center justify-center text-[#c9a96e] font-mono text-sm" style={{ border: "1px solid rgba(201,169,110,0.2)" }}>◀</button>
        <button onPointerDown={() => { keysRef.current.add("ArrowUp"); }} onPointerUp={() => keysRef.current.delete("ArrowUp")} onPointerLeave={() => keysRef.current.delete("ArrowUp")} className="w-12 h-12 flex items-center justify-center text-[#c9a96e] font-mono text-sm" style={{ border: "1px solid rgba(201,169,110,0.2)" }}>▲</button>
        <button onPointerDown={() => keysRef.current.add("ArrowRight")} onPointerUp={() => keysRef.current.delete("ArrowRight")} onPointerLeave={() => keysRef.current.delete("ArrowRight")} className="w-12 h-12 flex items-center justify-center text-[#c9a96e] font-mono text-sm" style={{ border: "1px solid rgba(201,169,110,0.2)" }}>▶</button>
        <button onPointerDown={() => keysRef.current.add(" ")} onPointerUp={() => keysRef.current.delete(" ")} onPointerLeave={() => keysRef.current.delete(" ")} className="w-16 h-12 flex items-center justify-center text-[#5a5a5a] font-mono text-[10px]" style={{ border: "1px solid rgba(201,169,110,0.2)" }}>JUMP</button>
      </div>
    </div>
  );
}

export default MarioGame;
