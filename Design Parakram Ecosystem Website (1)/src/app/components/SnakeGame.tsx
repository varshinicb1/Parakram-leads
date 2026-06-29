"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "motion/react";
import Panel from "./Panel";
import Scanlines from "./Scanlines";
import { playJumpSfx, playCoinSfx, playStompSfx, playDeathSfx } from "../hooks/useAudio";

const W = 480, H = 360;
const T = 14;
const COLS = Math.floor(W / T), ROWS = Math.floor(H / T);
const MOVE_SPEED = 1.5;

type Tile = "g" | "s" | "w" | "r";

interface TreasureState {
  x: number; y: number; found: boolean;
  digProgress: number;
}

interface Enemy {
  x: number; y: number; dir: number; alive: boolean;
  patrol: { start: number; end: number; axis: "x" | "y" };
}

interface GameState {
  map: Tile[][];
  player: { x: number; y: number; px: number; py: number };
  treasures: TreasureState[];
  enemies: Enemy[];
  coins: { x: number; y: number; collected: boolean }[];
  level: number;
  particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[];
  foundThisLevel: number;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function generateMap(level: number) {
  const map: Tile[][] = [];
  for (let y = 0; y < ROWS; y++) {
    map[y] = [];
    for (let x = 0; x < COLS; x++) {
      if (x === 0 || x === COLS - 1 || y === 0 || y === ROWS - 1) map[y][x] = "w";
      else if (Math.random() < 0.04) map[y][x] = "r";
      else if (Math.random() < 0.03) map[y][x] = "w";
      else map[y][x] = Math.random() < 0.5 ? "g" : "s";
    }
  }
  return map;
}

function generateTreasures(map: Tile[][], count: number): TreasureState[] {
  const t: TreasureState[] = [];
  let tries = 0;
  while (t.length < count && tries < 200) {
    tries++;
    const x = 1 + Math.floor(Math.random() * (COLS - 2));
    const y = 1 + Math.floor(Math.random() * (ROWS - 2));
    if (map[y][x] === "g" || map[y][x] === "s") {
      if (!t.some(ot => dist(ot, { x, y }) < 5)) {
        t.push({ x, y, found: false, digProgress: 0 });
      }
    }
  }
  return t;
}

function generateEnemies(map: Tile[][], level: number): Enemy[] {
  const e: Enemy[] = [];
  const count = 1 + Math.floor(level * 1.2);
  for (let i = 0; i < count; i++) {
    let x = 2 + Math.floor(Math.random() * (COLS - 4));
    let y = 2 + Math.floor(Math.random() * (ROWS - 4));
    if (map[y][x] === "g" || map[y][x] === "s") {
      const axis = Math.random() < 0.5 ? "x" : "y";
      const range = 2 + Math.floor(Math.random() * 4);
      const start = axis === "x" ? Math.max(1, x - range) : Math.max(1, y - range);
      const end = axis === "x" ? Math.min(COLS - 2, x + range) : Math.min(ROWS - 2, y + range);
      e.push({ x, y, dir: 1, alive: true, patrol: { start, end, axis } });
    }
  }
  return e;
}

function TreasureGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gs = useRef<GameState | null>(null);
  const animRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const digRef = useRef(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [phase, setPhase] = useState<"idle" | "playing" | "dead">("idle");
  const [proximity, setProximity] = useState("");
  const [level, setLevel] = useState(1);
  const [msg, setMsg] = useState("");

  const spawnParticles = useCallback((state: GameState, x: number, y: number, color: string, count = 10) => {
    for (let i = 0; i < count; i++) {
      state.particles.push({
        x: x * T + T / 2, y: y * T + T / 2,
        vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5 - 2,
        life: 25 + Math.random() * 15, color,
      });
    }
  }, []);

  const showMsg = useCallback((text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(""), 1200);
  }, []);

  useEffect(() => {
    try { const hs = localStorage.getItem("treasure_high"); if (hs) setHighScore(parseInt(hs)); } catch {}
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const state = gs.current; if (!state) return;
    const { map, player, treasures, enemies, coins, particles } = state;

    /* parchment bg */
    const bg = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 300);
    bg.addColorStop(0, "#1c1812");
    bg.addColorStop(1, "#0a0806");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    /* grid lines */
    ctx.strokeStyle = "rgba(201,169,110,0.04)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * T, 0); ctx.lineTo(x * T, H); ctx.stroke(); }
    for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * T); ctx.lineTo(W, y * T); ctx.stroke(); }

    /* tiles */
    for (let gy = 0; gy < ROWS; gy++) {
      for (let gx = 0; gx < COLS; gx++) {
        const t = map[gy][gx];
        const tx = gx * T, ty = gy * T;
        if (t === "w") { ctx.fillStyle = "#0a0a14"; ctx.fillRect(tx, ty, T, T); ctx.fillStyle = "rgba(100,130,200,0.06)"; ctx.fillRect(tx + 1, ty + 1, T - 2, T - 2); }
        else if (t === "r") { ctx.fillStyle = "#1a1410"; ctx.fillRect(tx, ty, T, T); ctx.fillStyle = "rgba(80,60,40,0.15)"; ctx.fillRect(tx + 1, ty + 1, T - 2, 2); }
        else if (t === "s") { ctx.fillStyle = "#14100a"; ctx.fillRect(tx, ty, T, T); ctx.fillStyle = "rgba(201,169,110,0.03)"; ctx.fillRect(tx, ty + T - 3, T, 3); }
        else { ctx.fillStyle = "#0f0e0a"; ctx.fillRect(tx, ty, T, T); ctx.fillStyle = "rgba(100,180,60,0.03)"; ctx.fillRect(tx + 1, ty + 1, T - 2, 2); }
      }
    }

    /* coins */
    coins.forEach(c => {
      if (c.collected) return;
      const cx = c.x * T + T / 2, cy = c.y * T + T / 2;
      const pulse = Math.sin(Date.now() / 300) * 1.5;
      const g = ctx.createRadialGradient(cx, cy + pulse, 1, cx, cy + pulse, 5);
      g.addColorStop(0, "#f5e4a8"); g.addColorStop(1, "rgba(201,169,110,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy + pulse, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f5e4a8"; ctx.font = "6px monospace"; ctx.textAlign = "center"; ctx.fillText("$", cx, cy + pulse + 2);
    });

    /* treasures */
    treasures.forEach(t => {
      if (t.found) return;
      const tx = t.x * T, ty = t.y * T;
      const digging = t.digProgress > 0;
      const pulse = Math.sin(Date.now() / 400 + t.x) * 1;
      if (digging) {
        ctx.fillStyle = `rgba(201,169,110,${0.2 + t.digProgress * 0.6})`;
        ctx.fillRect(tx + 2, ty + 2 - pulse, T - 4, T - 4);
        ctx.fillStyle = "#c9a96e"; ctx.font = "7px monospace"; ctx.textAlign = "center";
        ctx.fillText(t.digProgress >= 1 ? "!" : "?", tx + T / 2, ty + T / 2 + 3);
      } else {
        ctx.fillStyle = "rgba(201,169,110,0.04)";
        ctx.fillRect(tx + 2, ty + 2, T - 4, T - 4);
      }
    });

    /* enemies (snakes) */
    enemies.forEach(e => {
      if (!e.alive) return;
      const ex = e.x * T + T / 2, ey = e.y * T + T / 2;
      ctx.fillStyle = "#3a2010";
      for (let i = 0; i < 3; i++) {
        const sx = ex + Math.sin(Date.now() / 200 + i * 2) * 2;
        const sy = ey + i * 3 - 3;
        ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#c92020";
      ctx.fillRect(ex + 2, ey - 5, 3, 2);
    });

    /* dig indicator on player */
    if (digRef.current > 0) {
      const px = player.px + T / 2, py = player.py + T / 2;
      ctx.fillStyle = `rgba(201,169,110,${0.1 + digRef.current * 0.15})`;
      ctx.beginPath();
      ctx.arc(px, py, 8 + digRef.current * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    /* player */
    const px = player.px, py = player.py;
    ctx.shadowBlur = 10; ctx.shadowColor = "#c9a96e";
    ctx.fillStyle = "#f5e4a8";
    ctx.fillRect(px + 2, py + 4, T - 4, 6);
    ctx.fillRect(px + 4, py + 2, T - 8, T - 6);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#c9a96e";
    ctx.fillRect(px + 3, py + 6, T - 6, 2);
    ctx.fillStyle = "#1a0f00";
    ctx.fillRect(px + 4, py + 4, 2, 2);
    ctx.fillRect(px + T - 6, py + 4, 2, 2);
    /* hat */
    ctx.fillStyle = "#2a1a0a";
    ctx.fillRect(px + 2, py, T - 4, 3);
    ctx.fillRect(px + 1, py + 2, T - 2, 2);

    /* particles */
    particles.forEach(p => {
      ctx.globalAlpha = p.life / 25; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.font = "8px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`LV ${state.level}`, 6, 12);
    ctx.textAlign = "right";
    ctx.fillText(`HI ${highScore}`, W - 6, 12);
  }, [highScore]);

  const checkProximity = useCallback((state: GameState) => {
    const { player, treasures } = state;
    let minD = Infinity;
    treasures.forEach(t => {
      if (t.found) return;
      const d = dist({ x: player.x, y: player.y }, { x: t.x, y: t.y });
      if (d < minD) minD = d;
    });
    if (minD === Infinity) setProximity("");
    else if (minD <= 1) setProximity("BURNING!");
    else if (minD <= 2) setProximity("HOT!");
    else if (minD <= 4) setProximity("Warm");
    else if (minD <= 7) setProximity("Cold");
    else setProximity("Freezing");
  }, []);

  const dig = useCallback((state: GameState) => {
    const { player, treasures } = state;
    const target = treasures.find(t => !t.found && t.x === player.x && t.y === player.y);
    if (target) {
      playJumpSfx();
      target.digProgress += 0.25;
      if (target.digProgress >= 1) {
        target.found = true;
        playCoinSfx();
        state.foundThisLevel++;
        const pts = 50 + state.level * 20;
        setScore(s => s + pts);
        spawnParticles(state, target.x, target.y, "#f5e4a8", 18);
        showMsg(`TREASURE FOUND! +${pts}`);
        if (state.foundThisLevel >= treasures.filter(t => !t.found).length + 1) {
          state.level++;
          setLevel(state.level);
          const newMap = generateMap(state.level);
          const newTreasures = generateTreasures(newMap, 2 + Math.floor(state.level * 0.8));
          const newEnemies = generateEnemies(newMap, state.level);
          const newCoins = Array.from({ length: 3 + state.level }, () => {
            let x, y;
            do { x = 1 + Math.floor(Math.random() * (COLS - 2)); y = 1 + Math.floor(Math.random() * (ROWS - 2)); } while (newMap[y][x] === "w" || newMap[y][x] === "r");
            return { x, y, collected: false };
          });
          state.map = newMap;
          state.treasures = newTreasures;
          state.enemies = newEnemies;
          state.coins = newCoins;
          state.foundThisLevel = 0;
          state.player.x = 1; state.player.y = 1;
          state.player.px = 1 * T; state.player.py = 1 * T;
          showMsg(`LEVEL ${state.level}!`);
        }
      }
    } else {
      playStompSfx();
      showMsg("Nothing here...");
    }
  }, [spawnParticles, showMsg]);

  const gameLoop = useCallback(() => {
    const state = gs.current; if (!state) return;
    const { player, enemies, coins, particles, treasures } = state;
    const keys = keysRef.current;

    let dx = 0, dy = 0;
    if (keys.has("ArrowLeft") || keys.has("a")) dx = -MOVE_SPEED;
    if (keys.has("ArrowRight") || keys.has("d")) dx = MOVE_SPEED;
    if (keys.has("ArrowUp") || keys.has("w")) dy = -MOVE_SPEED;
    if (keys.has("ArrowDown") || keys.has("s")) dy = MOVE_SPEED;

    if (keys.has(" ") || keys.has("e")) {
      if (digRef.current === 0) dig(state);
      digRef.current = Math.min(digRef.current + 0.03, 1);
    } else {
      digRef.current = Math.max(digRef.current - 0.05, 0);
    }

    if (dx !== 0 || dy !== 0) {
      const nx = player.px + dx;
      const ny = player.py + dy;
      const ngx = Math.round(nx / T);
      const ngy = Math.round(ny / T);
      if (ngx >= 1 && ngx < COLS - 1 && ngy >= 1 && ngy < ROWS - 1) {
        const tile = state.map[ngy][ngx];
        if (tile !== "w" && tile !== "r") {
          player.px = nx;
          player.py = ny;
          player.x = ngx;
          player.y = ngy;
        }
      }
    }

    /* enemy movement */
    enemies.forEach(e => {
      if (!e.alive) return;
      if (e.patrol.axis === "x") {
        e.x += e.dir * 0.02;
        if (e.x <= e.patrol.start || e.x >= e.patrol.end) e.dir *= -1;
      } else {
        e.y += e.dir * 0.02;
        if (e.y <= e.patrol.start || e.y >= e.patrol.end) e.dir *= -1;
      }
      if (Math.abs(e.x - player.x) < 0.8 && Math.abs(e.y - player.y) < 0.8) {
        playDeathSfx();
        setPhase("dead");
        cancelAnimationFrame(animRef.current);
        const fs = score;
        if (fs > highScore) { setHighScore(fs); localStorage.setItem("treasure_high", String(fs)); }
        return;
      }
    });

    /* coin pickup */
    coins.forEach(c => {
      if (c.collected) return;
      if (player.x === c.x && player.y === c.y) {
        c.collected = true;
        playCoinSfx();
        setScore(s => s + 10);
        spawnParticles(state, c.x, c.y, "#f5e4a8", 8);
        showMsg("+10 Gold");
      }
    });

    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life--; });
    for (let i = particles.length - 1; i >= 0; i--) { if (particles[i].life <= 0) particles.splice(i, 1); }

    checkProximity(state);
    draw();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [draw, score, highScore, dig, checkProximity, spawnParticles, showMsg]);

  const start = useCallback(() => {
    const lv = 1;
    const map = generateMap(lv);
    const treasures = generateTreasures(map, 2 + Math.floor(lv * 0.8));
    const enemies = generateEnemies(map, lv);
    const coins = Array.from({ length: 3 + lv }, () => {
      let x, y;
      do { x = 1 + Math.floor(Math.random() * (COLS - 2)); y = 1 + Math.floor(Math.random() * (ROWS - 2)); } while (map[y][x] === "w" || map[y][x] === "r");
      return { x, y, collected: false };
    });
    gs.current = { map, player: { x: 1, y: 1, px: 1 * T, py: 1 * T }, treasures, enemies, coins, level: lv, particles: [], foundThisLevel: 0 };
    setScore(0); setLevel(lv); setProximity(""); setMsg("");
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

  const px = gs.current?.player;

  const digBtn = (action: string) => {
    if (phase !== "playing") return;
    if (gs.current) dig(gs.current);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Panel title="TREASURE.EXE" className="p-2">
        <div className="relative">
          <canvas ref={canvasRef} width={W} height={H} className="block" style={{ imageRendering: "pixelated" }} />
          {phase !== "playing" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
              <Scanlines />
              <div className="relative z-10 text-center px-6">
                {phase === "dead" && (
                  <><p style={{ fontFamily: "'Press Start 2P', monospace" }} className="text-[#c9a96e] text-sm mb-3 leading-relaxed">SNAKE BITE!</p>
                  <p className="text-[#5a5a5a] text-xs font-mono mb-2">Score: {score}</p>
                  {score >= highScore && score > 0 && <p className="text-[#f5e4a8] text-[10px] font-mono mb-2 animate-pulse">NEW HIGH SCORE!</p>}
                  <p className="text-[#3a3a3a] text-[10px] font-mono mb-6">Best: {highScore}</p></>
                )}
                {phase === "idle" && (
                  <><p style={{ fontFamily: "'Press Start 2P', monospace" }} className="text-[#c9a96e] text-sm mb-4 leading-loose">PARAKRAM'S QUEST</p>
                  <p className="text-[#5a5a5a] text-xs font-mono mb-1">Explore the island. Find the treasure!</p>
                  <p className="text-[#5a5a5a] text-xs font-mono mb-1">Watch for snakes. Use detector.</p>
                  <p className="text-[#3a3a3a] text-xs font-mono mb-1">Arrows/WASD to move · Space/E to dig</p>
                  <p className="text-[#2a2a2a] text-[10px] font-mono mb-6">Best: {highScore}</p></>
                )}
                <button onClick={start}
                  className="px-5 py-3 text-[9px] text-[#c9a96e] tracking-[0.15em] hover:bg-[#c9a96e]/10 transition-colors leading-relaxed"
                  style={{ fontFamily: "'Press Start 2P', monospace", border: "1px solid rgba(201,169,110,0.4)" }}>
                  {phase === "dead" ? "RETRY" : "EMBARK"}
                </button>
              </div>
            </div>
          )}
          {msg && phase === "playing" && (
            <motion.div
              key={msg}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-20"
              initial={{ opacity: 1, y: 0, scale: 0.5 }}
              animate={{ opacity: 0, y: -20, scale: 1.1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            >
              <p className="text-[#f5e4a8] text-[9px] font-mono whitespace-nowrap">{msg}</p>
            </motion.div>
          )}
        </div>
      </Panel>
      <div className="flex items-center justify-between w-full px-1">
        <span className="text-[11px] font-mono text-[#c9a96e]">SCORE: <span className="text-[#f5e4a8]">{score}</span></span>
        <span className={`text-[10px] font-mono ${proximity === "BURNING!" ? "text-red-400 animate-pulse" : proximity === "HOT!" ? "text-orange-400" : proximity === "Warm" ? "text-yellow-500" : "text-[#3a3a3a]"}`}>[{proximity || "---"}]</span>
        <span className="text-[11px] font-mono text-[#2a2a2a]">LV {level}</span>
      </div>
      <div className="flex items-center gap-2">
        <button onPointerDown={() => keysRef.current.add("ArrowLeft")} onPointerUp={() => keysRef.current.delete("ArrowLeft")} onPointerLeave={() => keysRef.current.delete("ArrowLeft")} className="w-11 h-11 flex items-center justify-center text-[#c9a96e] font-mono text-sm" style={{ border: "1px solid rgba(201,169,110,0.2)" }}>◀</button>
        <button onPointerDown={() => keysRef.current.add("ArrowUp")} onPointerUp={() => keysRef.current.delete("ArrowUp")} onPointerLeave={() => keysRef.current.delete("ArrowUp")} className="w-11 h-11 flex items-center justify-center text-[#c9a96e] font-mono text-sm" style={{ border: "1px solid rgba(201,169,110,0.2)" }}>▲</button>
        <button onPointerDown={() => keysRef.current.add("ArrowDown")} onPointerUp={() => keysRef.current.delete("ArrowDown")} onPointerLeave={() => keysRef.current.delete("ArrowDown")} className="w-11 h-11 flex items-center justify-center text-[#c9a96e] font-mono text-sm" style={{ border: "1px solid rgba(201,169,110,0.2)" }}>▼</button>
        <button onPointerDown={() => keysRef.current.add("ArrowRight")} onPointerUp={() => keysRef.current.delete("ArrowRight")} onPointerLeave={() => keysRef.current.delete("ArrowRight")} className="w-11 h-11 flex items-center justify-center text-[#c9a96e] font-mono text-sm" style={{ border: "1px solid rgba(201,169,110,0.2)" }}>▶</button>
        <button onPointerDown={() => { if (phase === "playing" && gs.current) dig(gs.current); }} className="w-16 h-11 flex items-center justify-center text-[#f5e4a8] font-mono text-[9px] tracking-[0.1em]" style={{ border: "1px solid rgba(201,169,110,0.3)" }}>DIG</button>
      </div>
    </div>
  );
}

export default TreasureGame;
