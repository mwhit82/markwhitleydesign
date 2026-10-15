"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

// Seeded, local surface maps: no downloads, texture synthesis or new rendering passes at runtime.
function random(seed: number) {
  let state = seed;
  return () =>
    (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
}
function surface(kind: "wood" | "floor" | "plaster" | "metal") {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  const data = context.createImageData(size, size);
  const rand = random(73);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const noise = rand() - 0.5;
      let r = 0,
        g = 0,
        b = 0;
      if (kind === "plaster") {
        const mottling =
          Math.sin(x * 0.037 + Math.sin(y * 0.02)) * 7 +
          Math.sin(y * 0.06 + x * 0.014) * 5;
        const edge = Math.pow(Math.abs(x / size - 0.5) * 2, 8) * 25;
        const damp = Math.pow(y / size, 5) * (22 + 15 * Math.sin(x * 0.024));
        const v = mottling + noise * 24 - edge - damp;
        r = 117 + v;
        g = 108 + v;
        b = 88 + v;
      } else if (kind === "metal") {
        const rust =
          Math.max(
            0,
            Math.sin(x * 0.08 + Math.sin(y * 0.05)) * Math.cos(y * 0.03) - 0.3,
          ) * 50;
        r = 74 + noise * 24 + rust;
        g = 70 + noise * 20 - rust * 0.3;
        b = 57 + noise * 16 - rust * 0.5;
      } else {
        const grain =
          Math.sin(
            x * 0.42 + Math.sin(y * 0.016) * 2 + Math.sin(x * 0.025) * 0.8,
          ) *
            3.5 +
          Math.sin(x * 1.7 + y * 0.007) * 3;
        const board = kind === "floor" ? Math.floor(x / 16) : 0;
        const shift = kind === "floor" ? Math.sin(board * 7.1) * 15 : 0;
        const seam =
          kind === "floor" && (x % 16 < 1 || (y + (board % 3) * 64) % 192 < 1)
            ? -32
            : 0;
        const v = grain + noise * 14 + shift + seam;
        r = 106 + v;
        g = 75 + v * 0.8;
        b = 44 + v * 0.6;
      }
      data.data.set([r, g, b, 255], i);
    }
  }
  context.putImageData(data, 0, 0);
  // Thin fibres, hairline cracks and scratches are baked into the maps.
  context.lineWidth = 0.5;
  for (let i = 0; i < (kind === "plaster" ? 24 : 180); i++) {
    const x = rand() * size,
      y = rand() * size;
    context.strokeStyle =
      kind === "plaster" ? "rgba(35,31,23,.19)" : "rgba(210,182,124,.15)";
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (rand() - 0.5) * 8, y + rand() * 65);
    context.lineTo(x + (rand() - 0.5) * 15, y + rand() * 90);
    context.stroke();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const relief = new THREE.CanvasTexture(canvas);
  relief.anisotropy = 4;
  return { map, relief };
}
export function useRoomMaterials() {
  const resources = useMemo(() => {
    const wood = surface("wood"),
      floor = surface("floor"),
      plaster = surface("plaster"),
      metal = surface("metal");
    const reflectionCanvas = document.createElement("canvas");
    reflectionCanvas.width = 256;
    reflectionCanvas.height = 128;
    const reflection = reflectionCanvas.getContext("2d")!;
    reflection.fillStyle = "#18140e";
    reflection.fillRect(0, 0, 256, 128);
    const glow = reflection.createRadialGradient(128, 35, 1, 128, 35, 65);
    glow.addColorStop(0, "#f6dca6");
    glow.addColorStop(0.13, "#cbaa6c");
    glow.addColorStop(1, "#18140e");
    reflection.fillStyle = glow;
    reflection.fillRect(0, 0, 256, 128);
    reflection.fillStyle = "#ffe6b9";
    reflection.fillRect(108, 28, 40, 4);
    reflection.fillStyle = "#5b7168";
    reflection.fillRect(15, 55, 20, 12);
    const environment = new THREE.CanvasTexture(reflectionCanvas);
    environment.mapping = THREE.EquirectangularReflectionMapping;
    environment.colorSpace = THREE.SRGBColorSpace;
    const materials = {
      wood: new THREE.MeshStandardMaterial({
        map: wood.map,
        bumpMap: wood.relief,
        bumpScale: 0.018,
        roughness: 0.72,
        color: "#d4c8b3",
      }),
      floor: new THREE.MeshStandardMaterial({
        map: floor.map,
        bumpMap: floor.relief,
        bumpScale: 0.025,
        roughness: 0.79,
      }),
      plaster: new THREE.MeshStandardMaterial({
        map: plaster.map,
        bumpMap: plaster.relief,
        bumpScale: 0.025,
        roughness: 0.98,
      }),
      metal: new THREE.MeshStandardMaterial({
        map: metal.map,
        bumpMap: metal.relief,
        bumpScale: 0.008,
        roughness: 0.57,
        metalness: 0.62,
      }),
      brass: new THREE.MeshStandardMaterial({
        color: "#b38a4e",
        metalness: 0.72,
        roughness: 0.31,
        envMap: environment,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: "#d8dfc9",
        metalness: 0.05,
        roughness: 0.07,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        envMap: environment,
        envMapIntensity: 1.4,
        side: THREE.FrontSide,
      }),
      mirror: new THREE.MeshStandardMaterial({
        color: "#c9c6b7",
        bumpMap: metal.relief,
        bumpScale: 0.012,
        roughnessMap: metal.relief,
        metalness: 0.94,
        roughness: 0.22,
        envMap: environment,
        envMapIntensity: 1.25,
      }),
      dark: new THREE.MeshStandardMaterial({
        color: "#181913",
        roughness: 0.85,
      }),
    };
    return {
      materials,
      textures: [
        ...[wood, floor, plaster, metal].flatMap((s) => [s.map, s.relief]),
        environment,
      ],
    };
  }, []);
  useEffect(
    () => () => {
      Object.values(resources.materials).forEach((m) => m.dispose());
      resources.textures.forEach((t) => t.dispose());
    },
    [resources],
  );
  return resources.materials;
}
export type RoomMaterials = ReturnType<typeof useRoomMaterials>;
