import * as THREE from "three";

export type HouseSpec = {
  id: string;
  width: number;
  height: number;
  floors: number;
  wall: string;
  door: boolean;
};

export type CurtainSpec = {
  id: string;
  width: number;
  height: number;
  floors: number;
};

export type IndustrialSpec = {
  id: string;
  width: number;
  height: number;
  docks: boolean;
  wall: string;
};

function canvasTexture(canvas: HTMLCanvasElement, wrap = false) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.wrapS = wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.wrapT = wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function dataTexture(canvas: HTMLCanvasElement) {
  const texture = canvasTexture(canvas, true);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(8, width);
  canvas.height = Math.max(8, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create a city texture.");
  return { canvas, context };
}

function fitPpm(width: number, height: number, ppm: number) {
  const maxEdge = Math.max(width * ppm, height * ppm, 1);
  return maxEdge > 1024 ? ppm * (1024 / maxEdge) : ppm;
}

function hash(index: number) {
  const value = Math.sin(index * 127.1 + 4.7) * 43758.5453;
  return value - Math.floor(value);
}

/** Value noise whose integer cells repeat, so `size` pixels tiled with feature `scale` match at the edges. */
function periodicNoise(px: number, py: number, size: number, scale: number) {
  const period = size / scale;
  const wrap = (value: number) => ((value % period) + period) % period;
  const x = px / scale;
  const y = py / scale;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const cell = (ix: number, iy: number) => hash(wrap(ix) * 19.1 + wrap(iy) * 47.7);
  const a = cell(x0, y0);
  const b = cell(x0 + 1, y0);
  const c = cell(x0, y0 + 1);
  const d = cell(x0 + 1, y0 + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fillNoise(
  context: CanvasRenderingContext2D,
  size: number,
  colorAt: (noise: number, x: number, y: number) => [number, number, number],
) {
  const image = context.createImageData(size, size);
  const data = image.data;
  const coarse = size >= 512 ? 32 : 16;
  const fine = size >= 512 ? 8 : 4;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const noise = periodicNoise(x, y, size, coarse) * 0.62 + periodicNoise(x, y, size, fine) * 0.38;
      const [r, g, b] = colorAt(noise, x, y);
      const i = (y * size + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
}

function grainTexture() {
  const size = 256;
  const { canvas, context } = makeCanvas(size, size);
  fillNoise(context, size, (noise) => {
    const shade = 168 + noise * 70;
    return [shade, shade, shade];
  });
  return dataTexture(canvas);
}

function grassTexture() {
  const size = 512;
  const { canvas, context } = makeCanvas(size, size);
  fillNoise(context, size, (noise) => [
    78 + noise * 18,
    108 + noise * 16,
    62 + noise * 8,
  ]);
  return canvasTexture(canvas, true);
}

function lawnTexture() {
  const size = 256;
  const { canvas, context } = makeCanvas(size, size);
  fillNoise(context, size, (noise) => [
    96 + noise * 14,
    128 + noise * 12,
    68 + noise * 8,
  ]);
  return canvasTexture(canvas, true);
}

function plasterTexture() {
  const size = 256;
  const { canvas, context } = makeCanvas(size, size);
  fillNoise(context, size, (noise) => {
    const shade = 206 + noise * 34;
    return [shade, shade - 1, shade - 4];
  });
  return canvasTexture(canvas, true);
}

function asphaltTexture() {
  const size = 256;
  const { canvas, context } = makeCanvas(size, size);
  fillNoise(context, size, (noise, x, y) => {
    const speckle = hash(x * 3 + y * 11) > 0.92 ? 18 : 0;
    const shade = 46 + noise * 22 + speckle;
    return [shade, shade + 1, shade + 2];
  });
  return canvasTexture(canvas, true);
}

function sidewalkTexture() {
  const size = 256;
  const { canvas, context } = makeCanvas(size, size);
  context.fillStyle = "#d7d1c6";
  context.fillRect(0, 0, size, size);
  const brickW = 64;
  const brickH = 32;
  for (let row = 0; row < size / brickH; row += 1) {
    const offset = row % 2 === 0 ? 0 : brickW / 2;
    for (let col = -1; col < size / brickW + 1; col += 1) {
      const x = col * brickW + offset;
      const y = row * brickH;
      const n = hash(row * 13 + col * 7);
      context.fillStyle = `rgba(${210 + n * 20}, ${204 + n * 16}, ${192 + n * 12}, 0.45)`;
      context.fillRect(x + 1, y + 1, brickW - 2, brickH - 2);
    }
  }
  return canvasTexture(canvas, true);
}

function courseTexture() {
  const size = 256;
  const { canvas, context } = makeCanvas(size, size);
  context.fillStyle = "#8d8d8d";
  context.fillRect(0, 0, size, size);
  const row = 28;
  const tile = 40;
  for (let y = -row; y < size + row; y += row) {
    const offset = (Math.round(y / row) % 2) * (tile / 2);
    for (let x = -tile + offset; x < size + tile; x += tile) {
      const shade = 150 + hash(x + y) * 40;
      context.fillStyle = `rgb(${shade}, ${shade - 4}, ${shade - 8})`;
      context.beginPath();
      context.moveTo(x + 1, y + row - 1);
      context.quadraticCurveTo(x + tile / 2, y + 6, x + tile - 1, y + row - 1);
      context.lineTo(x + 1, y + row - 1);
      context.fill();
      context.strokeStyle = "rgba(40,40,40,0.35)";
      context.stroke();
    }
  }
  return canvasTexture(canvas, true);
}

function brickTexture() {
  const size = 256;
  const { canvas, context } = makeCanvas(size, size);
  context.fillStyle = "#a35340";
  context.fillRect(0, 0, size, size);
  const brickW = 52;
  const brickH = 22;
  for (let row = 0; row < size / brickH + 1; row += 1) {
    const offset = row % 2 === 0 ? 0 : brickW / 2;
    context.fillStyle = "rgba(92,48,38,0.85)";
    context.fillRect(0, row * brickH, size, 2);
    for (let col = -1; col < size / brickW + 2; col += 1) {
      const x = col * brickW + offset;
      const n = hash(row * 9 + col * 3);
      context.fillStyle = `rgb(${150 + n * 40}, ${70 + n * 18}, ${52 + n * 10})`;
      context.fillRect(x + 2, row * brickH + 2, brickW - 4, brickH - 4);
    }
  }
  return canvasTexture(canvas, true);
}

function membraneTexture() {
  const size = 256;
  const { canvas, context } = makeCanvas(size, size);
  fillNoise(context, size, (noise) => {
    const shade = 168 + noise * 24;
    return [shade, shade + 2, shade + 4];
  });
  context.strokeStyle = "rgba(90,96,102,0.35)";
  context.lineWidth = 2;
  for (let y = 0; y < size; y += 64) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(size, y);
    context.stroke();
  }
  return canvasTexture(canvas, true);
}

function metalTexture() {
  const size = 256;
  const { canvas, context } = makeCanvas(size, size);
  context.fillStyle = "#b7bcc2";
  context.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 6) {
    context.fillStyle = y % 12 === 0 ? "rgba(255,255,255,0.18)" : "rgba(70,76,84,0.12)";
    context.fillRect(0, y, size, 2);
  }
  for (let i = 0; i < 300; i += 1) {
    context.fillStyle = "rgba(60,64,70,0.05)";
    context.fillRect((i * 29) % size, (i * 67) % size, 3, 1);
  }
  return canvasTexture(canvas, true);
}

function meterScale(width: number, height: number) {
  const ppm = fitPpm(width, height, 48);
  return {
    ppm,
    width: Math.max(8, Math.round(width * ppm)),
    height: Math.max(8, Math.round(height * ppm)),
  };
}

function paintBand(
  color: CanvasRenderingContext2D,
  emissive: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
  warm: string,
) {
  color.fillStyle = "#f7f4ee";
  color.fillRect(x, y, w, h);
  const inset = Math.max(2, Math.round(Math.min(w, h) * 0.06));
  const gradient = color.createLinearGradient(0, y, 0, y + h);
  gradient.addColorStop(0, "#d5e4ee");
  gradient.addColorStop(0.45, "#8ea9b8");
  gradient.addColorStop(1, "#6e8794");
  color.fillStyle = gradient;
  color.fillRect(x + inset, y + inset, w - inset * 2, h - inset * 2);
  color.strokeStyle = "rgba(36, 42, 48, 0.55)";
  color.lineWidth = Math.max(1.5, inset * 0.4);
  color.strokeRect(x + inset * 0.6, y + inset * 0.6, w - inset * 1.2, h - inset * 1.2);
  const cols = Math.max(1, Math.round(w / 52));
  color.strokeStyle = "rgba(247,244,238,0.85)";
  color.lineWidth = 1.5;
  for (let col = 1; col < cols; col += 1) {
    const line = x + (w * col) / cols;
    color.beginPath();
    color.moveTo(line, y + inset);
    color.lineTo(line, y + h - inset);
    color.stroke();
  }
  const blind = hash(seed) > 0.72;
  if (blind) {
    color.fillStyle = "rgba(232,226,214,0.55)";
    color.fillRect(x + inset, y + inset, w - inset * 2, (h - inset * 2) * 0.42);
  }
  const glow = hash(seed + 3);
  if (glow > 0.18) {
    emissive.fillStyle = warm;
    emissive.globalAlpha = 0.35 + glow * 0.65;
    emissive.fillRect(x + inset + 1, y + inset + 1, w - inset * 2 - 2, h - inset * 2 - 2);
    emissive.globalAlpha = 1;
  }
}

function drawBrickCourses(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  ppm: number,
) {
  const brickW = Math.max(8, Math.round(0.24 * ppm));
  const brickH = Math.max(4, Math.round(0.08 * ppm));
  for (let row = 0; row * brickH < height; row += 1) {
    const y = row * brickH;
    const offset = row % 2 === 0 ? 0 : brickW / 2;
    context.fillStyle = "rgba(88,42,34,0.55)";
    context.fillRect(0, y, width, Math.max(1, Math.round(ppm * 0.012)));
    for (let x = -brickW + offset; x < width; x += brickW) {
      context.fillRect(x, y, Math.max(1, Math.round(ppm * 0.012)), brickH);
    }
  }
}

function windowRow(
  color: CanvasRenderingContext2D,
  emissive: CanvasRenderingContext2D,
  left: number,
  right: number,
  y: number,
  h: number,
  ppm: number,
  floor: number,
  seed: number,
) {
  const span = right - left;
  const cols = Math.max(1, Math.round(span / (1.05 * ppm)));
  const gap = Math.max(4, Math.round(0.18 * ppm));
  const winW = (span - gap * (cols + 1)) / cols;
  if (winW < 5) return;
  for (let i = 0; i < cols; i += 1) {
    const x = left + gap + i * (winW + gap);
    paintBand(color, emissive, x, y, winW, h, floor * 17 + seed + i, "#ffc48a");
    color.fillStyle = "#f4f0e8";
    color.fillRect(x - 1, y + h, winW + 2, Math.max(2, Math.round(0.07 * ppm)));
  }
}

function houseMaps(spec: HouseSpec) {
  const scale = meterScale(spec.width, spec.height);
  const { canvas, context } = makeCanvas(scale.width, scale.height);
  const emissiveCanvas = makeCanvas(scale.width, scale.height);
  const emissive = emissiveCanvas.context;
  context.fillStyle = spec.wall;
  context.fillRect(0, 0, scale.width, scale.height);
  emissive.fillStyle = "#000";
  emissive.fillRect(0, 0, scale.width, scale.height);
  const brick = spec.wall === "#c45c48" || spec.wall === "#8f4638";
  if (brick) drawBrickCourses(context, scale.width, scale.height, scale.ppm);
  for (let i = 0; i < 500; i += 1) {
    context.fillStyle = `rgba(90,80,68,${0.02 + (i % 5) * 0.006})`;
    context.fillRect((i * 47) % scale.width, (i * 91) % scale.height, 2, 2);
  }
  const plinth = Math.round(0.34 * scale.ppm);
  context.fillStyle = "rgba(70,64,56,0.28)";
  context.fillRect(0, scale.height - plinth, scale.width, plinth);

  const floorH = spec.height / spec.floors;
  const margin = Math.round(0.32 * scale.ppm);
  for (let floor = 0; floor < spec.floors; floor += 1) {
    const base = floor * floorH;
    const sill = 0.95;
    const winH = 1.22;
    const y = Math.round((spec.height - (base + sill + winH)) * scale.ppm);
    const h = Math.round(winH * scale.ppm);
    if (spec.door && floor === 0) {
      const doorW = Math.round(1.05 * scale.ppm);
      const doorH = Math.round(2.2 * scale.ppm);
      const doorX = Math.round((scale.width - doorW) / 2);
      const doorY = scale.height - doorH - Math.round(0.04 * scale.ppm);
      context.fillStyle = "#3a332c";
      context.fillRect(doorX - 3, doorY - 3, doorW + 6, doorH + 3);
      context.fillStyle = "#6d543f";
      context.fillRect(doorX, doorY, doorW, doorH);
      context.fillStyle = "#c5dde6";
      context.fillRect(doorX + 5, doorY + 6, doorW - 10, Math.round(doorH * 0.32));
      emissive.fillStyle = "#ffc48a";
      emissive.fillRect(doorX + 6, doorY + 8, doorW - 12, Math.round(doorH * 0.24));
      const gap = Math.max(4, Math.round(0.12 * scale.ppm));
      windowRow(context, emissive, margin, doorX - gap, y, h, scale.ppm, floor, 2);
      windowRow(context, emissive, doorX + doorW + gap, scale.width - margin, y, h, scale.ppm, floor, 6);
    } else {
      windowRow(context, emissive, margin, scale.width - margin, y, h, scale.ppm, floor, 1);
    }
    context.fillStyle = "rgba(255,255,255,0.22)";
    const line = Math.round((spec.height - (base + floorH)) * scale.ppm);
    context.fillRect(0, line, scale.width, Math.max(2, Math.round(0.05 * scale.ppm)));
  }
  return {
    map: canvasTexture(canvas),
    emissiveMap: canvasTexture(emissiveCanvas.canvas),
  };
}

function curtainMaps(spec: CurtainSpec) {
  const scale = meterScale(spec.width, spec.height);
  const { canvas, context } = makeCanvas(scale.width, scale.height);
  const emissiveCanvas = makeCanvas(scale.width, scale.height);
  const emissive = emissiveCanvas.context;
  context.fillStyle = "#d5dee6";
  context.fillRect(0, 0, scale.width, scale.height);
  emissive.fillStyle = "#000";
  emissive.fillRect(0, 0, scale.width, scale.height);
  const floorPx = scale.height / spec.floors;
  const spandrel = Math.max(4, Math.round(floorPx * 0.16));
  const bay = Math.max(8, Math.round(1.28 * scale.ppm));
  for (let floor = 0; floor < spec.floors; floor += 1) {
    const top = Math.round(floor * floorPx);
    context.fillStyle = floor === spec.floors - 1 ? "#c3ccd4" : "#b7c3cc";
    context.fillRect(0, top, scale.width, spandrel);
    const glassTop = top + spandrel;
    const glassH = Math.max(4, Math.round(floorPx - spandrel));
    for (let x = 0; x < scale.width; x += bay) {
      const w = Math.min(bay, scale.width - x);
      const gradient = context.createLinearGradient(0, glassTop, 0, glassTop + glassH);
      gradient.addColorStop(0, "#d7e6ef");
      gradient.addColorStop(0.4, "#8eacbb");
      gradient.addColorStop(1, "#7593a3");
      context.fillStyle = gradient;
      context.fillRect(x + 1, glassTop, w - 2, glassH);
      const glow = hash(floor * 19 + x);
      if (glow > 0.22) {
        emissive.fillStyle = "#d5e6f4";
        emissive.globalAlpha = 0.28 + glow * 0.55;
        emissive.fillRect(x + 2, glassTop + 1, w - 4, glassH - 2);
        emissive.globalAlpha = 1;
      }
    }
  }
  return {
    map: canvasTexture(canvas),
    emissiveMap: canvasTexture(emissiveCanvas.canvas),
  };
}

function industrialMaps(spec: IndustrialSpec) {
  const scale = meterScale(spec.width, spec.height);
  const { canvas, context } = makeCanvas(scale.width, scale.height);
  const emissiveCanvas = makeCanvas(scale.width, scale.height);
  const emissive = emissiveCanvas.context;
  context.fillStyle = spec.wall;
  context.fillRect(0, 0, scale.width, scale.height);
  emissive.fillStyle = "#000";
  emissive.fillRect(0, 0, scale.width, scale.height);
  context.strokeStyle = "rgba(90,94,98,0.28)";
  context.lineWidth = 2;
  const seam = Math.max(6, Math.round(0.85 * scale.ppm));
  for (let y = seam; y < scale.height; y += seam) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(scale.width, y);
    context.stroke();
  }
  if (spec.docks) {
    const doorW = Math.round(2.7 * scale.ppm);
    const doorH = Math.round(3.05 * scale.ppm);
    const gap = Math.round(1.35 * scale.ppm);
    const y = scale.height - doorH - Math.round(0.08 * scale.ppm);
    let x = Math.round(0.7 * scale.ppm);
    let index = 0;
    while (x + doorW < scale.width - 8) {
      context.fillStyle = "#3e444c";
      context.fillRect(x, y, doorW, doorH);
      context.strokeStyle = "#d5d8dc";
      context.strokeRect(x + 1.5, y + 1.5, doorW - 3, doorH - 3);
      context.fillStyle = "#8fb4c2";
      context.fillRect(x + 8, y + 8, doorW - 16, Math.round(doorH * 0.16));
      emissive.fillStyle = "#ffd2a4";
      emissive.globalAlpha = 0.45 + hash(index + 4) * 0.4;
      emissive.fillRect(x + 10, y + 10, doorW - 20, Math.round(doorH * 0.1));
      emissive.globalAlpha = 1;
      x += doorW + gap;
      index += 1;
    }
  }
  const winH = Math.round(0.7 * scale.ppm);
  const winY = Math.round(0.55 * scale.ppm);
  const winW = Math.round(1.5 * scale.ppm);
  const step = Math.round(2.1 * scale.ppm);
  for (let x = Math.round(0.4 * scale.ppm); x + winW < scale.width; x += step) {
    context.fillStyle = "#f4f7f8";
    context.fillRect(x, winY, winW, winH);
    context.fillStyle = "#7f9eae";
    context.fillRect(x + 2, winY + 2, winW - 4, winH - 4);
    emissive.fillStyle = "#d7e7f2";
    emissive.globalAlpha = 0.35;
    emissive.fillRect(x + 3, winY + 3, winW - 6, winH - 6);
    emissive.globalAlpha = 1;
  }
  return {
    map: canvasTexture(canvas),
    emissiveMap: canvasTexture(emissiveCanvas.canvas),
  };
}

function standard(
  params: ConstructorParameters<typeof THREE.MeshStandardMaterial>[0],
  textures: THREE.Texture[],
  materials: THREE.Material[],
) {
  const material = new THREE.MeshStandardMaterial(params);
  materials.push(material);
  return material;
}

export const WALL_COLORS = [
  "#f6f3ec",
  "#efe2cf",
  "#e4d3b8",
  "#f7f7f4",
  "#c45c48",
  "#8f4638",
  "#e3ebe3",
  "#5c656e",
] as const;

export function createCityMaterials() {
  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];
  const glow: THREE.MeshStandardMaterial[] = [];
  const grain = grainTexture();
  const plaster = plasterTexture();
  const grassMap = grassTexture();
  const lawnMap = lawnTexture();
  const asphaltMap = asphaltTexture();
  const walkMap = sidewalkTexture();
  const membraneMap = membraneTexture();
  const metalMap = metalTexture();
  const courseMap = courseTexture();
  const brickMap = brickTexture();
  textures.push(grain, plaster, grassMap, lawnMap, asphaltMap, walkMap, membraneMap, metalMap, courseMap, brickMap);

  const grass = standard(
    { map: grassMap, roughness: 0.96, metalness: 0, roughnessMap: grain },
    textures,
    materials,
  );
  const terrainMap = grassMap.clone();
  terrainMap.wrapS = THREE.RepeatWrapping;
  terrainMap.wrapT = THREE.RepeatWrapping;
  terrainMap.repeat.set(6.5, 5.2);
  textures.push(terrainMap);
  const terrain = standard(
    { map: terrainMap, vertexColors: true, roughness: 0.97, metalness: 0 },
    textures,
    materials,
  );
  const lawn = standard(
    { map: lawnMap, color: "#e5efe0", roughness: 0.94, metalness: 0 },
    textures,
    materials,
  );
  const lawnDry = standard(
    { map: lawnMap, color: "#e3ecda", roughness: 0.95, metalness: 0 },
    textures,
    materials,
  );
  const lawnDeep = standard(
    { map: lawnMap, color: "#d7e6d2", roughness: 0.94, metalness: 0 },
    textures,
    materials,
  );
  const asphalt = standard(
    { map: asphaltMap, roughness: 0.78, metalness: 0.06, roughnessMap: grain },
    textures,
    materials,
  );
  const walk = standard(
    { map: walkMap, roughness: 0.88, metalness: 0 },
    textures,
    materials,
  );
  const curb = standard({ color: "#d4cfc6", roughness: 0.9, metalness: 0 }, textures, materials);
  const concrete = standard({ color: "#d8d4cc", roughness: 0.86, metalness: 0.02 }, textures, materials);
  const walls = WALL_COLORS.map((color) =>
    standard({ color, map: plaster, roughness: 0.86, metalness: 0.02, roughnessMap: grain }, textures, materials),
  );
  walls.forEach((material) => {
    material.side = THREE.DoubleSide;
  });
  const basin = standard(
    { color: "#7ec4cc", roughness: 0.18, metalness: 0.22 },
    textures,
    materials,
  );
  const stone = standard({ color: "#d9d3c8", roughness: 0.84, metalness: 0.03 }, textures, materials);
  const metal = standard(
    { map: metalMap, color: "#c5cacf", roughness: 0.42, metalness: 0.62 },
    textures,
    materials,
  );
  metal.side = THREE.DoubleSide;
  const metalDark = standard(
    { map: metalMap, color: "#9aa1a8", roughness: 0.46, metalness: 0.58 },
    textures,
    materials,
  );
  metalDark.side = THREE.DoubleSide;
  const membrane = ["#c5ccd2", "#b7c0c6", "#aeb6bd"].map((color) =>
    standard({ map: membraneMap, color, roughness: 0.78, metalness: 0.04 }, textures, materials),
  );
  const tile = standard(
    { map: courseMap, color: "#c4563c", roughness: 0.72, metalness: 0.04 },
    textures,
    materials,
  );
  tile.side = THREE.DoubleSide;
  const slate = standard(
    { map: courseMap, color: "#5d6872", roughness: 0.7, metalness: 0.16 },
    textures,
    materials,
  );
  slate.side = THREE.DoubleSide;
  const shingle = standard(
    { map: courseMap, color: "#6e5646", roughness: 0.8, metalness: 0.03 },
    textures,
    materials,
  );
  shingle.side = THREE.DoubleSide;
  const brick = standard(
    { map: brickMap, color: "#ffffff", roughness: 0.86, metalness: 0.02 },
    textures,
    materials,
  );
  const flower = standard({ color: "#d46a78", roughness: 0.82, metalness: 0 }, textures, materials);
  const glass = standard(
    { color: "#9aafbd", roughness: 0.05, metalness: 0.55, transparent: true, opacity: 0.62, envMapIntensity: 1 },
    textures,
    materials,
  );
  const parapet = standard({ color: "#c9c4ba", roughness: 0.88, metalness: 0 }, textures, materials);
  const cap = standard({ color: "#f3f0ea", roughness: 0.72, metalness: 0.02 }, textures, materials);
  const hedge = standard({ color: "#3f6b34", roughness: 0.9, metalness: 0 }, textures, materials);
  const trunk = standard({ color: "#6d5342", roughness: 0.92, metalness: 0 }, textures, materials);
  const canopy = standard({ color: "#ffffff", roughness: 0.92, metalness: 0 }, textures, materials);
  const canopyPine = standard({ color: "#ffffff", roughness: 0.94, metalness: 0 }, textures, materials);
  const car = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    roughness: 0.36,
    metalness: 0.4,
    clearcoat: 0.65,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.8,
  });
  materials.push(car);
  const tire = standard({ color: "#171b1f", roughness: 0.92, metalness: 0.04 }, textures, materials);
  const lampPole = standard({ color: "#2e343c", roughness: 0.45, metalness: 0.7 }, textures, materials);
  const lampHead = standard(
    { color: "#e7ebef", emissive: "#ffd7a4", emissiveIntensity: 0, roughness: 0.35, metalness: 0.4 },
    textures,
    materials,
  );
  const glassRail = standard(
    { color: "#dfe7ec", roughness: 0.28, metalness: 0.12 },
    textures,
    materials,
  );
  const hvac = standard({ color: "#b7bcc2", roughness: 0.55, metalness: 0.35 }, textures, materials);
  const soil = standard({ color: "#8a7358", roughness: 1, metalness: 0 }, textures, materials);
  const marking = standard({ color: "#f5f7f8", roughness: 0.6, metalness: 0 }, textures, materials);
  const waterWall = standard({ color: "#c5c9ce", roughness: 0.78, metalness: 0.04 }, textures, materials);
  waterWall.side = THREE.DoubleSide;
  const quay = standard({ color: "#ddd8d0", roughness: 0.82, metalness: 0.02 }, textures, materials);
  quay.side = THREE.DoubleSide;
  const gable = standard({ color: "#d8d4cc", roughness: 0.86, metalness: 0.02 }, textures, materials);
  gable.side = THREE.DoubleSide;

  const facadeCache = new Map<string, THREE.MeshStandardMaterial>();
  const curtainCache = new Map<string, THREE.MeshStandardMaterial>();
  const industrialCache = new Map<string, THREE.MeshStandardMaterial>();

  function mappedFacade(
    cache: Map<string, THREE.MeshStandardMaterial>,
    id: string,
    maps: { map: THREE.Texture; emissiveMap: THREE.Texture },
    params: ConstructorParameters<typeof THREE.MeshStandardMaterial>[0],
  ) {
    const existing = cache.get(id);
    if (existing) return existing;
    textures.push(maps.map, maps.emissiveMap);
    const material = standard(
      {
        ...params,
        map: maps.map,
        emissiveMap: maps.emissiveMap,
        emissive: "#ffffff",
        emissiveIntensity: 0.08,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -2,
      },
      textures,
      materials,
    );
    material.name = id;
    glow.push(material);
    cache.set(id, material);
    return material;
  }

  return {
    grass,
    terrain,
    lawn,
    lawns: [lawn, lawnDry, lawnDeep],
    asphalt,
    walk,
    curb,
    concrete,
    walls,
    basin,
    stone,
    metal,
    metalDark,
    membrane,
    tile,
    slate,
    shingle,
    brick,
    flower,
    glass,
    parapet,
    cap,
    hedge,
    trunk,
    canopy,
    canopyPine,
    car,
    tire,
    lampPole,
    lampHead,
    glassRail,
    hvac,
    soil,
    marking,
    waterWall,
    quay,
    gable,
    house(spec: HouseSpec) {
      return mappedFacade(facadeCache, spec.id, houseMaps(spec), {
        roughness: 0.78,
        metalness: 0.04,
      });
    },
    curtain(spec: CurtainSpec) {
      return mappedFacade(curtainCache, spec.id, curtainMaps(spec), {
        roughness: 0.16,
        metalness: 0.58,
      });
    },
    industrial(spec: IndustrialSpec) {
      return mappedFacade(industrialCache, spec.id, industrialMaps(spec), {
        roughness: 0.72,
        metalness: 0.08,
      });
    },
    glow,
    materials,
    textures,
    dispose() {
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
    },
  };
}

export type CityMaterials = ReturnType<typeof createCityMaterials>;
