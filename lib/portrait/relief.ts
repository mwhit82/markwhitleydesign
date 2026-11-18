import {
  BufferAttribute, Camera, Mesh, PlaneGeometry, Scene, ShaderMaterial,
  SRGBColorSpace, Texture, Vector2, WebGLRenderer,
} from 'three';
import {clamp, type Gaze} from './gaze';

// All landmarks are in the original 640px image, measured from the top left.
const size = 640;
const centreX = 320;
const headPivotY = 420;
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
    // Round the silhouette through the narrow tips of the hair and beard.
    // A sharp depth step here would fold the surface during a large turn.
    const roundedWidth = Math.max(60, width);
    const skull = 1 - smoothStep(0.2, 1.3, Math.abs(x) / roundedWidth);
    // The nose sits forward of the cheeks. Depth is used only for parallax:
    // the soft studio shadows and highlights are already painted into the image.
    const nose = Math.exp(-((x / 34) ** 2 + ((y - 285) / 48) ** 2));
    relief[index * 2] = 22 + 54 * skull + 33 * nose;
    // Both eye openings, the nose and mouth receive the full turn. Ease out
    // across the cheeks and forehead so the ears, hair and beard keep their outline.
    const cheekEdge = clamp(width, 110, 148);
    const cheeks = 1 - smoothStep(80, cheekEdge, Math.abs(x));
    const forehead = smoothStep(118, 195, y);
    const chin = 1 - smoothStep(370, 476, y);
    relief[index * 2 + 1] = cheeks * forehead * chin;
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
    vec2 pivot = vec2(${centreX.toFixed(1)}, ${headPivotY.toFixed(1)});
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
  vec3 colourAt(vec2 pixel) {
    return texture2D(portrait, vec2(pixel.x, 640.0 - pixel.y) / 640.0).rgb;
  }

  // Opening is (horizontal centre, corner height, half-width). Lid heights are
  // measured separately above and below those corners for each painted eye.
  vec2 lidsAt(float x, vec3 opening, vec2 heights) {
    float across = (x - opening.x) / opening.z;
    float arch = max(0.0, 1.0 - across * across);
    return opening.y + arch * vec2(-heights.x, heights.y);
  }

  vec3 paintEye(vec3 original, vec2 pixel, vec3 opening, vec2 heights, vec3 iris) {
    vec2 lids = lidsAt(pixel.x, opening, heights);
    float rim = min(pixel.y - lids.x, lids.y - pixel.y);
    float aperture = smoothstep(-0.5, 1.5, rim)
      * smoothstep(0.0, 2.5, opening.z - abs(pixel.x - opening.x));
    if (aperture <= 0.0) return original;

    // Reveal the artwork's own sclera colours beneath the moving iris. Sample
    // both flanks at matching lid height to keep the upper-lid shadow in place.
    float row = clamp((pixel.y - lids.x) / max(1.0, lids.y - lids.x), 0.0, 1.0);
    vec2 flanks = iris.x + vec2(-1.0, 1.0) * (iris.z + 2.0);
    vec2 left = lidsAt(flanks.x, opening, heights);
    vec2 right = lidsAt(flanks.y, opening, heights);
    vec3 leftWhite = colourAt(vec2(flanks.x, mix(left.x + 1.5, left.y - 1.5, row)));
    vec3 rightWhite = colourAt(vec2(flanks.y, mix(right.x + 1.5, right.y - 1.5, row)));
    vec3 white = mix(leftWhite, rightWhite, smoothstep(flanks.x - 1.0, flanks.y + 1.0, pixel.x));
    float oldIris = 1.0 - smoothstep(iris.z + 0.8, iris.z + 4.6, distance(pixel, iris.xy));
    vec3 sclera = mix(original, white, oldIris);

    // Slide the pupil and its original catchlights as one circular texture.
    // For the tiny iris caps hidden in the source, use pigment at the same
    // radius from the visible side. This keeps the iris round at full travel.
    vec2 source = pixel - eyeOffset;
    float radius = distance(source, iris.xy);
    float side = source.x < iris.x ? -1.0 : 1.0;
    vec3 cap = colourAt(iris.xy + vec2(side * min(radius, iris.z - 0.2), 0.0));
    vec2 sourceLids = lidsAt(source.x, opening, heights);
    float sourceRim = min(source.y - sourceLids.x, sourceLids.y - source.y);
    vec3 pigment = mix(cap, colourAt(source), smoothstep(1.2, 2.85, sourceRim));
    float coverage = 1.0 - smoothstep(iris.z - 0.8, iris.z + 0.35, radius);
    float travel = smoothstep(0.0, 1.5, length(eyeOffset));
    return mix(original, mix(sclera, pigment, coverage), travel * aperture);
  }

  void main() {
    vec2 pixel = vec2(portraitUV.x, 1.0 - portraitUV.y) * 640.0;
    vec3 colour = colourAt(pixel);
    if (abs(pixel.x - 267.0) < 24.0 && abs(pixel.y - 243.0) < 12.0) {
      colour = paintEye(colour, pixel, vec3(267.0, 246.0, 24.0), vec2(13.0, 8.0), vec3(265.5, 242.6, 11.7));
    } else if (abs(pixel.x - 377.5) < 25.0 && abs(pixel.y - 238.0) < 12.0) {
      colour = paintEye(colour, pixel, vec3(377.5, 242.0, 25.0), vec2(13.8, 7.1), vec3(379.0, 237.3, 11.6));
    }
    gl_FragColor = vec4(colour, 1.0);
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
