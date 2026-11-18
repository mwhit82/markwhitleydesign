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

test('downward scroll looks screen-left, upward scroll looks screen-right and rest faces forward', () => {
  let travel = swipeTravel(24, 4, 2000);
  assert.equal(travel, 4, 'a new swipe starts fresh after a pause');
  for (let i = 0; i < 5; i++) travel = swipeTravel(travel, 4, 30);

  const down = scrollGaze(travel, 0);
  assert.deepEqual(down, {yaw: -radians(15), pitch: 0, eyeX: -7, eyeY: 0});
  assert.deepEqual(scrollGaze(travel, 160), down);
  const fading = scrollGaze(travel, 400);
  assert.ok(fading.yaw > down.yaw && fading.yaw < 0);
  assert.deepEqual(scrollGaze(travel, 660), neutral);
  assert.deepEqual(scrollGaze(0, 0), neutral);

  const reverse = swipeTravel(travel, -16, 30);
  const up = scrollGaze(reverse, 0);
  assert.ok(up.yaw > radians(9) && up.eyeX > 4);
  assert.equal(up.pitch, 0);
  assert.equal(up.eyeY, 0);
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
