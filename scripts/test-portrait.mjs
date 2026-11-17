import test from 'node:test';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {moduleUrl} from './rally-test-loader.mjs';
const {pointerGaze,scrollGaze,smoothGaze,neutral,radians,settled}=await import(await moduleUrl(fileURLToPath(new URL('../lib/portrait/gaze.ts',import.meta.url))));
test('pointer gaze uses portrait centre, follows both axes and clamps extremes',()=>{
 assert.deepEqual(pointerGaze(300,200,300,200,1200,800),neutral);
 const right=pointerGaze(2000,2000,300,200,1200,800);
 assert.equal(right.yaw,radians(20));assert.equal(right.pitch,radians(12));
 assert.equal(right.eyeYaw,radians(10));assert.equal(right.eyePitch,radians(6));
 const left=pointerGaze(-2000,-2000,300,200,1200,800);
 assert.equal(left.yaw,-right.yaw);assert.equal(left.pitch,-right.pitch);
});
test('mobile position looks into the viewport and scroll direction adds bounded bias',()=>{
 assert.ok(scrollGaze(100,800,0,0).pitch>0);
 assert.ok(scrollGaze(700,800,0,0).pitch<0);
 assert.ok(scrollGaze(400,800,1,0).pitch>0);
 assert.ok(scrollGaze(400,800,-1,0).pitch<0);
 assert.equal(scrollGaze(-1000,800,99,0).pitch,radians(12));
 assert.equal(scrollGaze(2000,800,-99,0).pitch,-radians(12));
 assert.equal(scrollGaze(400,800,1,400).pitch,0);
 assert.equal(scrollGaze(400,800,1,900).pitch,0);
});
test('eyes lead head without overshooting and smoothing is frame-rate independent',()=>{
 const target={pitch:.2,yaw:.2,eyePitch:.2,eyeYaw:.2};
 const result=smoothGaze(neutral,target,.1);
 assert.ok(result.eyePitch>result.pitch);assert.ok(result.eyePitch<target.eyePitch);
 let split=neutral;for(let i=0;i<10;i++)split=smoothGaze(split,target,.01);
 for(const key of Object.keys(target))assert.ok(Math.abs(split[key]-result[key])<1e-10);
 let resting=result;for(let i=0;i<180;i++)resting=smoothGaze(resting,neutral,1/60);
 assert.ok(settled(resting,neutral));
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
