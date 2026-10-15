import * as THREE from "three";

// Neutral wear multiplies the selected cosmetic colour; no extra geometry or render pass.
export function createCharacterWear() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  let seed = 927;
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  ctx.fillStyle = "#eeeae1";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 380; i++) {
    const x = random() * 256,
      y = random() * 256,
      radius = 2 + random() * 13;
    const stain = ctx.createRadialGradient(x, y, 0, x, y, radius);
    stain.addColorStop(0, `rgba(44,36,25,${0.04 + random() * 0.2})`);
    stain.addColorStop(1, "rgba(44,36,25,0)");
    ctx.fillStyle = stain;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  // Lathe UVs follow the profile points: the broad lower rim lies near v=.5.
  for (let i = 0; i < 220; i++) {
    const x = random() * 256,
      y = 124 + random() * 30;
    ctx.fillStyle = `rgba(35,30,22,${random() * 0.36})`;
    ctx.fillRect(x, y, 1 + random() * 5, 1 + random() * 3);
  }
  for (let i = 0; i < 90; i++) {
    const x = random() * 256,
      y = 45 + random() * 120,
      length = 2 + random() * 16;
    ctx.lineWidth = 0.4 + random() * 0.7;
    ctx.strokeStyle = "rgba(48,41,31,.5)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y - length * 0.35);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,248,.85)";
    ctx.beginPath();
    ctx.moveTo(x, y + 1);
    ctx.lineTo(x + length, y - length * 0.35 + 1);
    ctx.stroke();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const relief = new THREE.CanvasTexture(canvas);
  return { map, relief };
}
