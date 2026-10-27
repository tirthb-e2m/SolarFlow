import * as THREE from "three";

function canvasTexture(draw: (ctx: CanvasRenderingContext2D, size: number) => void, size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not draw an installation texture");
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createGlowTexture() {
  return canvasTexture((ctx, size) => {
    const glow = ctx.createRadialGradient(size / 2, size / 2, size * 0.04, size / 2, size / 2, size * 0.48);
    glow.addColorStop(0, "rgba(255,255,255,0.95)");
    glow.addColorStop(0.32, "rgba(255,255,255,0.38)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);
  }, 128);
}

export function createHaloTexture() {
  return canvasTexture((ctx, size) => {
    const halo = ctx.createRadialGradient(size / 2, size / 2, size * 0.08, size / 2, size / 2, size * 0.48);
    halo.addColorStop(0, "rgba(255,255,255,0.62)");
    halo.addColorStop(0.5, "rgba(255,255,255,0.24)");
    halo.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, size, size);
  }, 256);
}

export function createPanelTexture() {
  return canvasTexture((ctx, size) => {
    ctx.fillStyle = "#102033";
    ctx.fillRect(0, 0, size, size);
    const cols = 6;
    const rows = 10;
    const pad = size * 0.045;
    const gap = size * 0.012;
    const cellW = (size - pad * 2 - gap * (cols - 1)) / cols;
    const cellH = (size - pad * 2 - gap * (rows - 1)) / rows;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = pad + col * (cellW + gap);
        const y = pad + row * (cellH + gap);
        const shade = 18 + ((row + col) % 3) * 6;
        ctx.fillStyle = `rgb(${shade}, ${shade + 22}, ${shade + 46})`;
        ctx.fillRect(x, y, cellW, cellH);
      }
    }
    ctx.strokeStyle = "rgba(214, 222, 228, 0.8)";
    ctx.lineWidth = Math.max(1, size * 0.008);
    ctx.beginPath();
    ctx.moveTo(size * 0.5, pad);
    ctx.lineTo(size * 0.5, size - pad);
    ctx.moveTo(pad, size * 0.5);
    ctx.lineTo(size - pad, size * 0.5);
    ctx.stroke();
    ctx.strokeStyle = "#c5ced6";
    ctx.lineWidth = size * 0.02;
    ctx.strokeRect(size * 0.012, size * 0.012, size * 0.976, size * 0.976);
  }, 256);
}
