import test from 'node:test';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {moduleUrl} from './rally-test-loader.mjs';
const {pointerGaze, scrollGaze, swipeTravel, smoothGaze, neutral, radians, settled} =
  await import(await moduleUrl(fileURLToPath(new URL('../lib/portrait/gaze.ts', import.meta.url))));

test('pointer movement within the portrait visibly turns the head and leads with the pupils', () => {
  for (const width of [192, 240, 300]) {
    const pose = (offset) => pointerGaze(900 + offset, 300, 900, 300, width, width);
    assert.deepEqual(pose(0), neutral);
    const near = pose(width / 4);
    assert.ok(near.yaw > radians(9) && near.eyeX > 4);
    const edge = pose(width / 2);
    assert.ok(edge.yaw > near.yaw && edge.eyeX > near.eyeX);
    assert.equal(pose(-width / 2).yaw, -edge.yaw);
    const far = pose(5000);
    assert.ok(far.yaw <= radians(15) && far.eyeX <= 7);
  }
});

test('a short swipe takes precedence over viewport position, then returns to a resting glance', () => {
  const height = 800;
  const idle = swipeTravel(24, 4, 2000);
  assert.equal(idle, 4);
  let travel = idle;
  for (let i = 0; i < 5; i++) travel = swipeTravel(travel, 4, 30);
  assert.equal(travel, 24);

  const bottom = scrollGaze(700, height, travel, 0);
  assert.equal(bottom.pitch, radians(17));
  assert.equal(bottom.eyeY, 3);
  assert.ok(smoothGaze(neutral, bottom, 0.12, true).pitch > radians(10));
  assert.deepEqual(scrollGaze(700, height, travel, 160), bottom);
  assert.ok(scrollGaze(700, height, travel, 400).pitch < bottom.pitch);
  const rest = scrollGaze(700, height, 0, 0);
  assert.ok(rest.pitch < 0);
  assert.deepEqual(scrollGaze(700, height, travel, 660), rest);

  const reversal = swipeTravel(travel, -16, 30);
  const rising = scrollGaze(100, height, reversal, 0);
  assert.ok(rising.pitch < -radians(8) && rising.eyeY < 0);
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
