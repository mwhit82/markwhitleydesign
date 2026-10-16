"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/lib/deader/store';
import { move, LOBBY_OBSTACLES } from '@/lib/deader/game';
import { moveInRooms } from '@/lib/deader/lounge';
import { pets, petHint } from '@/lib/deader/pets';
import { visitorForDifficulty } from '@/lib/deader/visitors';
import { roomAudio } from '@/lib/deader/audio/room-audio';
import { roomPlayerPose } from './player-reflection';
import { lobbyPlayerPose } from './controllers';
import { createCharacterWear } from './character-wear';
import styles from './game.module.css';
export function Puppy({ colour = '#ffc928', walking = false, warning = false, paused = false, resting = false }: {
    colour?: string;
    walking?: boolean;
    warning?: boolean;
    paused?: boolean;
    resting?: boolean;
}) {
    const legs = useRef<THREE.Group>(null);
    const body = useRef<THREE.Group>(null);
    const time = useRef(0);
    const reduced = useGame(s => s.save.settings.reducedMotion);
    const wear = useMemo(() => createCharacterWear(), []);
    const geometry = useMemo(() => {
        const shape = new THREE.Shape();
        shape.moveTo(-.28, .24);
        shape.lineTo(.28, .24);
        shape.lineTo(0, .85);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: .85, bevelEnabled: true, bevelSize: .035, bevelThickness: .035, bevelSegments: 2, steps: 1 });
        g.translate(0, 0, -.5);
        return g;
    }, []);
    useEffect(() => () => { geometry.dispose(); wear.map.dispose(); wear.relief.dispose(); }, [geometry, wear]);
    useFrame((_,dt) => {
        if(paused)return;
        time.current+=Math.min(dt,.05);
        if(body.current){body.current.scale.y=resting?.86:1;}
        if(body.current)body.current.rotation.z=reduced?0:Math.sin(time.current*(warning?12:2))*(warning?.035:.008);
        if(legs.current)legs.current.children.forEach((leg,i)=>{leg.rotation.x=walking&&!reduced?Math.sin(time.current*12+(i%2)*Math.PI)*.35:resting?.8:0;});
    });
    return <group ref={body}>
    <mesh geometry={geometry}><meshStandardMaterial color={colour} map={wear.map} roughnessMap={wear.relief} roughness={.52} metalness={.08}/></mesh>
    <group ref={legs}>{[-.2, .2].flatMap((x, i) => [-.32, .25].map((z, j) => <group position={[x, .28, z]} key={`${i}-${j}`}><mesh position={[0, -.13, 0]}><capsuleGeometry args={[.045, .19, 3, 6]}/><meshStandardMaterial color="#151516" roughness={.8}/></mesh></group>))}</group>
    {[-.105, .105].map(x => <mesh key={x} position={[x, .49, .395]}><sphereGeometry args={[.044, 10, 8]}/><meshStandardMaterial color="#101011"/></mesh>)}
    <mesh position={[0, .39, .405]}><sphereGeometry args={[.047, 10, 8]}/><meshStandardMaterial color="#101011"/></mesh>
    <mesh position={[0, .335, .402]} rotation={[0, 0, Math.PI]}><torusGeometry args={[.055, .012, 6, 12, Math.PI]}/><meshStandardMaterial color="#101011"/></mesh>
    <mesh position={[0, .45, -.6]} rotation={[-.7, 0, 0]}><capsuleGeometry args={[.04, .22, 3, 6]}/><meshStandardMaterial color={colour}/></mesh>
  </group>;
}
export function Sidekick({ lobby = false }: {
    lobby?: boolean;
}) {
    const id = useGame(s => s.save.equippedPet);
    const paused = useGame(s => !!s.panel || !!s.suspension || !s.focused);
    const warning = useGame(s => !lobby && s.room.encounters.active?.phase === "waiting");
    const group = useRef<THREE.Group>(null), position = useRef(new THREE.Vector3()), initialized = useRef(false);
    const trail=useRef<{x:number;z:number}[]>([]), idleTime=useRef(0);
    const [walking, setWalking] = useState(false);
    const [resting,setResting]=useState(false);
    useFrame((_, dt) => {
        const s = useGame.getState(), g = group.current;
        if (!g || s.panel || s.suspension || !s.focused || s.room.judgement)
            return;
        const p = lobby ? lobbyPlayerPose : roomPlayerPose;
        // Trail on the player's travelled path; never participate in movement collision.
        if (!initialized.current) {
            position.current.set(p.x, 0, p.z);
            initialized.current = true;
        }
        const last=trail.current.at(-1);
        if(!last||Math.hypot(last.x-p.x,last.z-p.z)>.3)trail.current.push({x:p.x,z:p.z});
        if(trail.current.length>100)trail.current.shift();
        const distance=Math.hypot(p.x-position.current.x,p.z-position.current.z);
        idleTime.current+=Math.min(dt,.05);
        let target={x:p.x,z:p.z};
        if(distance>1.8){
          while(trail.current.length>1&&Math.hypot(trail.current[0].x-position.current.x,trail.current[0].z-position.current.z)<.45)trail.current.shift();
          target=trail.current[0]??target;
        }else{
          // Wander briefly, then rest; stop wandering to watch the door on arrival.
          const phase=idleTime.current%9, angle=Math.floor(idleTime.current/9)*2.4;
          target=phase<3&&!warning?{x:p.x+Math.sin(angle)*1.2,z:p.z+Math.cos(angle)*1.2}:{x:position.current.x,z:position.current.z};
          if(distance<1.4)trail.current=trail.current.slice(-1);
        }
        const dx=target.x-position.current.x,dz=target.z-position.current.z,d=Math.hypot(dx,dz);
        const before={x:position.current.x,z:position.current.z};
        const speed=distance>1.8?1:.35;
        const step=d>.15?(lobby?move(before,dx/d*speed,dz/d*speed,dt,5,LOBBY_OBSTACLES):moveInRooms(before,dx/d*speed,dz/d*speed,dt,s.room.door==='OPEN')):before;
        position.current.set(step.x,0,step.z);
        const moving=Math.hypot(step.x-before.x,step.z-before.z)>.0001;
        if(moving)g.rotation.y=Math.atan2(dx,dz);
        else if(!warning)g.rotation.y+=Math.sin(idleTime.current*.6)*Math.min(dt,.05)*.15;
        if(warning&&!moving)g.rotation.y=Math.atan2(.25-position.current.x,-5.9-position.current.z);
        g.position.copy(position.current);
        const rest=!moving&&!warning&&idleTime.current%9>=5;
        if(rest!==resting)setResting(rest);
        if (walking !== moving)
            setWalking(moving);
    });
    const pet = pets.find(p => p.id === id);
    return pet ? <group ref={group} scale={.65} userData={{ sidekick: true }}><Puppy colour={pet.colour} walking={walking} warning={warning} paused={paused} resting={resting}/></group> : null;
}
export function PetHints() {
    const s = useGame(), e = s.room.encounters.active;
    const evidence = useRef<{
        id: string;
        sources: ('visual' | 'cctv')[];
        hint: string | null;
        barked: boolean;
    }>({ id: '', sources: [], hint: null, barked: false });
    const [caption, setCaption] = useState('');
    useEffect(() => {
        if (!s.save.equippedPet || !e) {
            setCaption('');
            evidence.current = { id: '', sources: [], hint: null, barked: false };
            return;
        }
        const pet = pets.find(p => p.id === s.save.equippedPet)!;
        if (evidence.current.id !== e.id)
            evidence.current = { id: e.id, sources: [], hint: null, barked: false };
        const v = evidence.current;
        if (s.panel || s.suspension || !s.focused)
            return;
        if (e.phase === 'waiting' && !v.barked) {
            v.barked = true;
            roomAudio.play('bark');
            setCaption(`${pet.name} barks. Someone is at the door.`);
        }
        if (s.room.view === 'inspect' && e.phase === 'waiting' && !v.sources.includes('visual'))
            v.sources.push('visual');
        if (s.room.view === 'cctv' && [2, 3, 4].includes(s.room.feed) && !v.sources.includes('cctv'))
            v.sources.push('cctv');
        if (!v.hint && v.sources.length) {
            const hint = petHint(visitorForDifficulty(e.visitor, s.session?.difficulty), v.sources);
            if (hint) {
                v.hint = hint;
                setCaption(`${pet.name}: ${hint}`);
                roomAudio.play('bark');
            }
        }
    }, [e?.id, e?.phase, s.room.view, s.room.feed, s.save.equippedPet, s.panel, s.suspension, s.focused, s.session?.difficulty, e]);
    if (!caption || s.panel || s.suspension || s.room.survival.phase !== 'idle' || s.room.night?.status === 'completed' || e?.phase === 'departing')
        return null;
    return <p className={styles.petCaption} role="status">{caption}</p>;
}
