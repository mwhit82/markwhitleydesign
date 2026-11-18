import {
  BufferAttribute, Camera, Mesh, PlaneGeometry, Scene, ShaderMaterial,
  SRGBColorSpace, Texture, Vector2, WebGLRenderer,
} from 'three';
import {clamp, type Gaze} from './gaze';

// All landmarks are in the original 640px image, measured from the top left.
const size = 640;
const centreX = 320;
const neckY = 478;
const outline = [
  [0, 18], [15, 61], [65, 102], [125, 135], [200, 146],
  [250, 161], [281, 161], [328, 138], [380, 135], [432, 126],
  [466, 105], [494, 74], [521, 28], [549, 4],
];

function headWidth(y: number) {
  for (let i = 1; i < outline.length; i++) {
    const [end, width] = outline[i];
    if (y <= end) {
      const [start, previous] = outline[i - 1];
      return previous + (width - previous) * (y - start) / (end - start);
    }
  }
  return 4;
}

function smoothStep(low: number, high: number, x: number) {
  const t = clamp((x - low) / (high - low), 0, 1);
  return t * t * (3 - 2 * t);
}

function makeReliefGeometry() {
  const geometry = new PlaneGeometry(2, 2, 80, 80);
  const uv = geometry.getAttribute('uv');
  const relief = new Float32Array(uv.count * 2);

  for (let index = 0; index < uv.count; index++) {
    const x = size * uv.getX(index) - centreX;
    const y = size * (1 - uv.getY(index));
    const width = headWidth(y);
    const skull = Math.sqrt(Math.max(0, 1 - (x / width) ** 2));
    // The nose sits forward of the cheeks. Depth is used only for parallax:
    // the soft studio shadows and highlights are already painted into the image.
    const nose = Math.exp(-((x / 34) ** 2 + ((y - 285) / 48) ** 2));
    relief[index * 2] = 22 + 54 * skull + 33 * nose;
    const silhouette = 1 - smoothStep(width - 7, width + 24, Math.abs(x));
    const neck = 1 - smoothStep(500, 548, y);
    const topEdge = smoothStep(0, 14, y);
    relief[index * 2 + 1] = silhouette * neck * topEdge;
  }
  geometry.setAttribute('relief', new BufferAttribute(relief, 2));
  return geometry;
}

const vertexShader = `
  attribute vec2 relief;
  uniform vec2 headAngle;
  varying vec2 portraitUV;
  void main() {
    portraitUV = uv;
    vec2 pivot = vec2(${centreX.toFixed(1)}, ${neckY.toFixed(1)});
    vec2 pixel = vec2(uv.x, 1.0 - uv.y) * 640.0;
    vec2 offset = pixel - pivot;
    float turnedX = cos(headAngle.x) * offset.x + sin(headAngle.x) * relief.x;
    float turnedZ = cos(headAngle.x) * relief.x - sin(headAngle.x) * offset.x;
    float turnedY = cos(headAngle.y) * offset.y + sin(headAngle.y) * turnedZ;
    pixel += (vec2(turnedX, turnedY) - offset) * relief.y;
    gl_Position = vec4(pixel.x / 320.0 - 1.0, 1.0 - pixel.y / 320.0, 0.0, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D portrait;
  uniform vec2 eyeOffset;
  varying vec2 portraitUV;
  float eyeWeight(vec2 pixel, vec2 centre) {
    vec2 distance = (pixel - centre) / vec2(24.0, 10.5);
    return 1.0 - smoothstep(0.38, 1.0, length(distance));
  }
  void main() {
    vec2 pixel = vec2(portraitUV.x, 1.0 - portraitUV.y) * 640.0;
    float weight = eyeWeight(pixel, vec2(265.0, 243.0))
                 + eyeWeight(pixel, vec2(379.0, 238.0));
    // Move the iris detail inside each original lid, keeping its painted rim fixed.
    vec2 uvOffset = vec2(eyeOffset.x, -eyeOffset.y) * weight / 640.0;
    gl_FragColor = texture2D(portrait, portraitUV - uvOffset);
    #include <colorspace_fragment>
  }
`;

/** Project the existing clay artwork onto a shallow, movable facial surface. */
export function createRelief(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const renderer = new WebGLRenderer({canvas, alpha: false, antialias: false, powerPreference: 'low-power'});
  const texture = new Texture(image);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  const headAngle = new Vector2();
  const eyeOffset = new Vector2();
  const geometry = makeReliefGeometry();
  const material = new ShaderMaterial({
    uniforms: {
      portrait: {value: texture},
      headAngle: {value: headAngle},
      eyeOffset: {value: eyeOffset},
    },
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  const scene = new Scene();
  const camera = new Camera();
  scene.add(mesh);

  return {
    render(gaze: Gaze) {
      headAngle.set(gaze.yaw, gaze.pitch);
      eyeOffset.set(gaze.eyeX, gaze.eyeY);
      renderer.render(scene, camera);
    },
    resize(width: number, height: number, dpr: number) {
      renderer.setDrawingBufferSize(width, height, dpr);
    },
    dispose() {
      texture.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
