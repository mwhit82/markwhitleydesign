import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {moduleUrl} from './rally-test-loader.mjs';
const {relativePhotoTilt}=await import(await moduleUrl(resolve('lib/photo-orientation.ts')));
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8);
test('initial pose is neutral and movements are bounded',()=>{
 const origin={beta:10,gamma:20};assert.deepEqual(relativePhotoTilt(10,20,origin,0),{x:0,y:0});
 assert.deepEqual(relativePhotoTilt(25,35,origin,0),{x:1,y:1});
 assert.deepEqual(relativePhotoTilt(100,-100,origin,0),{x:-1,y:1});
});
test('landscape and inverted screens preserve screen-relative movement',()=>{
 const origin={beta:10,gamma:20};let tilt=relativePhotoTilt(10,35,origin,90);near(tilt.x,0);near(tilt.y,-1);
 tilt=relativePhotoTilt(10,35,origin,180);near(tilt.x,-1);near(tilt.y,0);
});
test('sensor wraparound is smooth and invalid readings are ignored',()=>{
 near(relativePhotoTilt(-179,0,{beta:179,gamma:0},0).y,2/15);
 assert.equal(relativePhotoTilt(NaN,0,{beta:0,gamma:0},0),null);
 assert.equal(relativePhotoTilt(0,Infinity,{beta:0,gamma:0},0),null);
});
