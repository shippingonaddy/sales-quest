import { useRef, useEffect } from "react";

export function Background() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let raf: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const stars = Array.from({ length: 180 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.2, speed: Math.random() * 0.00006 + 0.00002, hue: Math.random() > 0.65 ? 270 : 210, phase: Math.random() * Math.PI * 2 }));
    const wisps = [{ x: 0.25, y: 0.20, r: 180, hue: 265, phase: 0.0 }, { x: 0.70, y: 0.50, r: 140, hue: 285, phase: 2.1 }, { x: 0.40, y: 0.80, r: 160, hue: 250, phase: 4.3 }];
    // Slow drifting grid nodes — replaces flower rings
    const nodes = Array.from({ length: 6 }, (_, i) => ({
      x: 0.15 + (i % 3) * 0.35,
      y: 0.2 + Math.floor(i / 3) * 0.55,
      vx: (Math.random() - 0.5) * 0.00015,
      vy: (Math.random() - 0.5) * 0.00015,
      hue: 260 + i * 12,
      phase: Math.random() * Math.PI * 2,
    }));
    let t = 0;
    const drawNodes = () => {
      // Draw faint lines between nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const ax = nodes[i].x * canvas.width, ay = nodes[i].y * canvas.height;
          const bx = nodes[j].x * canvas.width, by = nodes[j].y * canvas.height;
          const dist = Math.hypot(ax - bx, ay - by);
          if (dist < 280) {
            const alpha = (1 - dist / 280) * 0.045;
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
            ctx.strokeStyle = `hsla(270, 70%, 65%, ${alpha})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      // Draw node dots
      nodes.forEach(n => {
        const x = n.x * canvas.width, y = n.y * canvas.height;
        const pulse = Math.sin(t * 0.003 + n.phase) * 0.3 + 0.7;
        ctx.beginPath(); ctx.arc(x, y, 1.5 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${n.hue}, 70%, 75%, ${0.12 * pulse})`; ctx.fill();
        // Drift
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0.05 || n.x > 0.95) n.vx *= -1;
        if (n.y < 0.05 || n.y > 0.95) n.vy *= -1;
      });
    };
    const draw = () => {
      ctx.fillStyle = "rgba(5, 2, 16, 0.20)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      wisps.forEach(w => { const gx = (w.x + Math.sin(t * 0.00025 + w.phase) * 0.07) * canvas.width, gy = (w.y + Math.cos(t * 0.00018 + w.phase) * 0.06) * canvas.height; const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, w.r); grad.addColorStop(0, `hsla(${w.hue}, 65%, 38%, 0.075)`); grad.addColorStop(0.5, `hsla(${w.hue}, 55%, 25%, 0.03)`); grad.addColorStop(1, "transparent"); ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height); });
      drawNodes();
      stars.forEach(s => { s.phase += s.speed * 55; const pulse = Math.sin(s.phase) * 0.35 + 0.65; const x = s.x * canvas.width, y = s.y * canvas.height; if (s.r > 0.9) { const halo = ctx.createRadialGradient(x, y, 0, x, y, s.r * 4); halo.addColorStop(0, `hsla(${s.hue}, 80%, 85%, ${0.12 * pulse})`); halo.addColorStop(1, "transparent"); ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, s.r * 4, 0, Math.PI * 2); ctx.fill(); } ctx.beginPath(); ctx.arc(x, y, s.r * pulse, 0, Math.PI * 2); ctx.fillStyle = `hsla(${s.hue}, 75%, 88%, ${0.75 * pulse})`; ctx.fill(); });
      t++; raf = requestAnimationFrame(draw);
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgb(10, 6, 20)", zIndex: 0, pointerEvents: "none", display: "block" }} />;
}
