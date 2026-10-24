"use client";
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '@/lib/deader/store';
import { useCoop, remotePoses, sendAction } from '@/lib/deader/multiplayer/client';
import { type Member, type Pose } from '@/lib/deader/multiplayer/types';
import { roomPlayerPose } from '../player-reflection';
import { Cone } from '../character';
import { PetModel } from '../sidekick';
import { GunModel } from '../weapon';
import { Sign } from '../environment';
import { trackedHands } from '../vr/runtime';
function Peer({ member }: {
    member: Member;
}) {
    const root = useRef<THREE.Group>(null), head = useRef<THREE.Group>(null), left = useRef<THREE.Mesh>(null), right = useRef<THREE.Mesh>(null);
    const target = useMemo(() => new THREE.Vector3(), []);
    useFrame((_, dt) => {
        const p = remotePoses.get(member.id) ?? member.pose, g = root.current;
        if (!g)
            return;
        g.position.lerp(target.set(p.x, 0, p.z), 1 - Math.exp(-dt * 14));
        g.rotation.y += Math.atan2(Math.sin(p.yaw + Math.PI - g.rotation.y), Math.cos(p.yaw + Math.PI - g.rotation.y)) * (1 - Math.exp(-dt * 14));
        if (head.current)
            head.current.rotation.x = -p.pitch * .15;
        for (const [mesh, v] of [[left.current, p.left], [right.current, p.right]] as const) {
            if (!mesh)
                continue;
            mesh.visible = member.alive && !!v;
            if (v) {
                mesh.position.set(v[0], v[1], v[2]);
                mesh.quaternion.set(v[3], v[4], v[5], v[6]);
            }
        }
    });
    return <><group ref={root} position={[member.pose.x, 0, member.pose.z]} userData={{ ignoreBullet: true }} visible={member.alive}>
  <group ref={head}><Cone colour={member.appearance.colour} outfit={member.appearance.outfit} lowDetail armed={member.weapon.collected}/></group>
  <Billboard position={[0, 1.9, 0]}><Sign text={`${member.name}${member.connected ? '' : ' · RECONNECTING'}`} position={[0, 0, 0]} width={.8} height={.13}/></Billboard>
  {member.weapon.collected && <group position={[.35, .9, -.3]}><GunModel /></group>}
  {member.appearance.pet && <group position={[-.6, 0, .4]} scale={.6}><PetModel id={member.appearance.pet} colour={member.appearance.colour}/></group>}
 </group><mesh ref={left} userData={{ ignoreBullet: true }}><sphereGeometry args={[.065, 8, 6]}/><meshStandardMaterial color={member.appearance.colour}/></mesh><mesh ref={right} userData={{ ignoreBullet: true }}><sphereGeometry args={[.065, 8, 6]}/><meshStandardMaterial color={member.appearance.colour}/></mesh></>;
}
export function CoopPlayers() {
    const c = useCoop(), last = useRef(0), lastObserve = useRef(0), metrics = useRef({ samples: [] as number[], last: 0 });
    const scratch = useMemo(() => ({ position: new THREE.Vector3(), rotation: new THREE.Quaternion(), euler: new THREE.Euler(0, 0, 0, 'YXZ') }), []);
    useFrame(({ camera, gl, clock }, dt) => {
        if (process.env.NODE_ENV === 'development') {
            const m = metrics.current;
            m.samples.push(dt * 1000);
            if (m.samples.length > 300)
                m.samples.shift();
            if (clock.elapsedTime - m.last > 1) {
                m.last = clock.elapsedTime;
                gl.domElement.dataset.coopStats = JSON.stringify({ players: useCoop.getState().room?.members.length ?? 0, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, meanMs: m.samples.reduce((a, b) => a + b, 0) / m.samples.length, p95Ms: [...m.samples].sort((a, b) => a - b)[Math.floor(m.samples.length * .95)] });
            }
        }
        const state = useCoop.getState(), s = useGame.getState(), me = state.room?.members.find(p => p.id === state.membership?.id);
        if (!me)
            return;
        if (!me.alive && !gl.xr.isPresenting && !s.room.judgement && !s.panel && !s.suspension) {
            const follow = state.room?.members.find(p => p.alive && p.id === state.spectating) ?? state.room?.members.find(p => p.alive);
            if (follow) {
                const p = remotePoses.get(follow.id) ?? follow.pose;
                camera.position.lerp(scratch.position.set(p.x, 1.6, p.z), 1 - Math.exp(-dt * 10));
                camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
            }
        }
        if (clock.elapsedTime - last.current < 1 / 15 || !state.connected || !me.alive || state.room?.paused)
            return;
        last.current = clock.elapsedTime;
        camera.getWorldQuaternion(scratch.rotation);
        scratch.euler.setFromQuaternion(scratch.rotation, 'YXZ');
        const pose: Pose = { x: roomPlayerPose.x, z: roomPlayerPose.z, yaw: Math.atan2(Math.sin(roomPlayerPose.yaw),Math.cos(roomPlayerPose.yaw)), pitch: scratch.euler.x, view: s.room.view, feed: s.room.feed };
        if (gl.xr.isPresenting) {
            const pack = (o: THREE.Object3D) => { o.getWorldPosition(scratch.position); o.getWorldQuaternion(scratch.rotation); return [...scratch.position.toArray(), ...scratch.rotation.toArray()]; };
            pose.head = pack(gl.xr.getCamera());
            for (const hand of ['left', 'right'] as const) {
                if (trackedHands[hand === 'left' ? 'leftVisible' : 'rightVisible']) {
                    scratch.position.setFromMatrixPosition(trackedHands[hand]);
                    scratch.rotation.setFromRotationMatrix(trackedHands[hand]);
                    pose[hand] = [...scratch.position.toArray(), ...scratch.rotation.toArray()];
                }
            }
        }
        sendAction({ type: 'pose', pose });
        if (clock.elapsedTime - lastObserve.current > .2) {
            lastObserve.current = clock.elapsedTime;
            const sight = s.room.stalkerSight;
            if (sight.camera || sight.gaze || sight.anchor >= 0)
                sendAction({ type: 'observe', ...sight });
        }
    });
    if (!c.membership)
        return null;
    return <>{c.room?.members.filter(p => p.id !== c.membership?.id).map(member => <Peer key={member.id} member={member}/>)}</>;
}
