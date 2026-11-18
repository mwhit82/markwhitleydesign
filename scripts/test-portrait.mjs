import test from 'node:test';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {moduleUrl} from './rally-test-loader.mjs';
const {pointerGaze, scrollGaze, scrollVelocity, smoothGaze, neutral, radians, settled} =
  await import(await moduleUrl(fileURLToPath(new URL('../lib/portrait/gaze.ts', import.meta.url))));

test('pointer gaze starts from the portrait centre and stays inside the painted eyelids', () => {
  assert.deepEqual(pointerGaze(300, 200, 300, 200, 1200, 800), neutral);
  const right = pointerGaze(2000, 2000, 300, 200, 1200, 800);
  assert.deepEqual(right, {yaw: radians(8.5), pitch: radians(6), eyeX: 3.8, eyeY: 1.9});
  const left = pointerGaze(-2000, -2000, 300, 200, 1200, 800);
  for (const key of Object.keys(right)) assert.equal(left[key], -right[key]);
});

test('touch gaze follows portrait position and can reverse promptly even after a pause', () => {
  const height = 800;
  const bottom = scrollGaze(700, height, 0, 0);
  const top = scrollGaze(100, height, 0, 0);
  assert.ok(bottom.pitch < 0 && top.pitch > 0);

  const firstSwipe = scrollVelocity(32, 6000);
  assert.ok(scrollGaze(700, height, firstSwipe, 0).pitch > 0);
  assert.ok(scrollGaze(100, height, -firstSwipe, 0).pitch < 0);
  assert.equal(scrollGaze(0, height, firstSwipe, 0).pitch, radians(11));
  assert.equal(scrollGaze(800, height, -firstSwipe, 0).pitch, -radians(11));

  const atStart = scrollGaze(400, height, firstSwipe, 0);
  assert.deepEqual(scrollGaze(400, height, firstSwipe, 90), atStart);
  const fading = scrollGaze(400, height, firstSwipe, 350);
  assert.ok(fading.pitch > 0 && fading.pitch < atStart.pitch);
  assert.deepEqual(scrollGaze(400, height, firstSwipe, 540), neutral);
  assert.deepEqual(scrollGaze(100, height, firstSwipe, 900), top);
  assert.ok(smoothGaze(neutral, atStart, 0.09, true).pitch > radians(3));
});

test('eyes lead the head and smoothing is frame-rate independent', () => {
  const target = {pitch: 0.2, yaw: 0.2, eyeX: 0.2, eyeY: 0.2};
  const result = smoothGaze(neutral, target, 0.1);
  assert.ok(result.eyeY > result.pitch && result.eyeY < target.eyeY);
  let split = neutral;
  for (let i = 0; i < 10; i++) split = smoothGaze(split, target, 0.01);
  for (const key of Object.keys(target)) assert.ok(Math.abs(split[key] - result[key]) < 1e-10);
  let resting = result;
  for (let i = 0; i < 180; i++) resting = smoothGaze(resting, neutral, 1 / 60);
  assert.ok(settled(resting, neutral));
});

test('published model meets size, topology and rig contract',async()=>{
 const {readFile}=await import('node:fs/promises');
 const bytes=await readFile(new URL('../public/portfolio/avatars/mark-clay.glb',import.meta.url));
 assert.ok(bytes.length<3*1024*1024);
 assert.equal(bytes.toString('ascii',0,4),'glTF');
 const gltf=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
 for(const name of ['Head','EyeLeft','EyeRight'])assert.ok(gltf.nodes.some(node=>node.name===name),name);
 const triangles=gltf.meshes.reduce((sum,mesh)=>sum+mesh.primitives.reduce((sum,p)=>sum+gltf.accessors[p.indices].count/3,0),0);
 assert.ok(triangles<40000,`${triangles} triangles`);
 assert.ok(gltf.skins.length>0,'weighted neck rig');
});
