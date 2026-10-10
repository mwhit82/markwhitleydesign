import * as T from "three";
import {SurfaceEffects,createMud} from "./surface-effects";
import {RallyHaptics,defaultControls,type ControlSettings} from "./controls";
import {lighting,WeatherParticles} from "./conditions";
import {CheckpointEffects} from "./checkpoint-effects";
import { advanceCheckpoints, CheckpointNotifications, type CheckpointNotice, type Eligibility, type RunReason } from "./checkpoints";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { cars, type Mode } from "./data";
import { RallyAudio } from "./audio";
import { handling, engine } from "./handling";
import { initialStage, stageDefinition, stagePoints, checkpointIndices, boardKey, surfaceGrip, timeOfDay, timesOfDay, type StageSelection } from "./stages";
import { Atmosphere } from "./atmosphere";
import { type Replay, type GhostSource, matchingReplay, replayKey, replayPose, headingBetween, checkpointSplits } from "./replay";
type Callbacks = {
  stats: (s: {
    time: number;
    speed: number;
    rpm: number;
    limited: boolean;
    progress: number;
    count: number;
  }) => void;
  mode: (m: Mode) => void;
  pad: (s: string) => void;
  select: (i: number) => void;
  best: (n: number | null) => void;
  audio?: (muted: boolean) => void;
  start?: () => void;
  finish?: (time: number, trace: number[][], replay: Replay | undefined, eligibility:Eligibility) => void;
  checkpoints?: (notices:CheckpointNotice[]) => void;
  practice?: (reasons:RunReason[]) => void;
  menu?: (action:"next"|"previous"|"activate"|"back") => void;
  ghost?: (status:string) => void;
  ghostVisibility?: (visible:boolean) => void;
};
export class RallyWorld {
  controls:ControlSettings={...defaultControls};
  touchSteer=0;touchHeld=false;touchActive=false;
  private haptics=new RallyHaptics();
  private surfaceEffects!:SurfaceEffects;
  private mud:T.InstancedMesh|null=null;
  obstacles: { x: number; z: number; radius: number }[] = [];
  scene = new T.Scene();
  camera = new T.OrthographicCamera();
  renderer: T.WebGLRenderer;
  root = new T.Group();
  vehicle = new T.Group();
  wheels: T.Mesh[] = [];
  mode: Mode = "garage";
  selected = 0;
  time = 0;
  countdown = 3;
  checkpoint = 0;
  points: T.Vector3[];
  checkpoints: number[];
  keys = new Set<string>();
  previousButtons: boolean[] = [];
  velocity = new T.Vector3();
  angle = 0;
  rpm = 950;
  limited = false;
  frame = 0;
  last = 0;
  report = 0;
  best: number | null = null;
  observer: ResizeObserver;
  audio: RallyAudio | null = null;
  muted = true;
  padConnected = false;
  disposed = false;
  dust: T.Mesh[] = [];
  dustCursor = 0;
  dustClock = 0;
  selection: StageSelection = { ...initialStage };
  precipitation: WeatherParticles | null = null;
  checkpointEffects!:CheckpointEffects;
  splitReference:(number|undefined)[]=[];
  private hemisphere=new T.HemisphereLight();
  private sun=new T.DirectionalLight();
  trace: number[][] = [];
  traceAt = 0;
  cleanRun = true;
  reasons:RunReason[]=[];
  notifications=new CheckpointNotifications();
  resumeMode: "race"|"countdown"="race";
  menuOpen=false;
  private movementFrom=new T.Vector3();
  atmosphere!: Atmosphere;
  arrival = 0;
  arrivalFrom = new T.Vector3();
  arrivalAngle = 0;
  ghostSource: GhostSource = "personal";
  ghostVisible = true;
  ghostReplay: Replay | null = null;
  ghostCar: T.Group | null = null;
  ghostGeneration = 0;
  ghostAbort: AbortController | null = null;
  replaySamples: number[][] = [];
  constructor(
    public host: HTMLDivElement,
    public callbacks: Callbacks,
  ) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.setClearColor("#c6c5a8");
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.host.appendChild(this.renderer.domElement);
    this.scene.add(this.root);
    this.scene.add(this.hemisphere);
    const sun = this.sun;
    sun.position.set(-35, 75, 25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -130,
      right: 130,
      top: 130,
      bottom: -130,
      far: 200,
    });
    sun.shadow.bias = -0.001;
    this.scene.add(sun);
    this.points = stagePoints(this.selection);
    this.checkpoints = [...checkpointIndices];
    try {const stored=localStorage.getItem("rally-ghost-source");if(stored==="off"||stored==="personal"||stored==="leader")this.ghostSource=stored;}catch{}
    try {const day=localStorage.getItem("rally-time-of-day");if(timesOfDay.includes(day as typeof timesOfDay[number]))this.selection.timeOfDay=day as typeof timesOfDay[number];}catch{}
    this.buildStage();
    this.choose(0);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    window.addEventListener("keydown", this.keydown);
    window.addEventListener("keyup", this.keyup);
    window.addEventListener("blur", this.blur);
    document.addEventListener("visibilitychange", this.visibility);
    this.prepareAudio();
    this.frame = requestAnimationFrame(this.tick);
  }
  material(color: string) {
    return new T.MeshStandardMaterial({ color, roughness: 0.94, metalness: 0 });
  }
  box(
    w: number,
    h: number,
    d: number,
    color: string,
    x = 0,
    y = 0,
    z = 0,
    parent: T.Object3D = this.root,
  ) {
    const mesh = new T.Mesh(
      new RoundedBoxGeometry(w, h, d, 2, 0.12),
      this.material(color),
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  configure(selection: StageSelection) {
    if (this.mode !== "garage") return;
    this.selection = { ...selection };
    this.clearGhost();
    this.checkpointEffects?.dispose();
    this.release(this.root);
    this.root.clear();
    this.obstacles = [];
    this.dust = [];
    this.precipitation = null;
    this.checkpoint = 0;
    this.points = stagePoints(selection);
    this.buildStage();
    this.choose(this.selected);
    this.audio?.setEnvironment(selection.stage);
  }
  buildStage() {
    this.atmosphere = new Atmosphere(this.points);
    const stage = stageDefinition(this.selection);
    const weather = this.selection.weather,preset=lighting(this.selection),sky=timeOfDay(this.selection)==='midday'?stage.sky:preset.sky;
    const fogColor=new T.Color(sky);if(weather==="fog"||weather==="haze")fogColor.lerp(new T.Color(timeOfDay(this.selection)==="night"?"#657487":"#c2c9c4"),.55);
    this.renderer.setClearColor(fogColor);this.scene.fog=new T.Fog(fogColor,preset.near,preset.far);
    this.hemisphere.color.set(preset.fill);this.hemisphere.groundColor.set(preset.ground);this.hemisphere.intensity=preset.ambient;
    this.sun.color.set(preset.sun);this.sun.intensity=preset.power;this.sun.position.set(...preset.position as [number,number,number]);
    this.checkpointEffects=new CheckpointEffects(this.atmosphere.reduced);this.root.add(this.checkpointEffects.group);
    const service=this.atmosphere.layout.center;
    this.box(Math.max(170,Math.abs(service.x)*2+32), 3, Math.max(160,Math.abs(service.z)*2+32), stage.ground, 0, -1.8, 0);
    // A single stamped surface cannot fold over itself at tight bends, unlike the old ribbon triangles.
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 2048;
    const paint = canvas.getContext("2d");
    if (!paint) throw new Error("Track texture could not be created");
    paint.scale(2048 / 170, 2048 / 160);
    paint.translate(85, 80);
    paint.lineJoin = "round";
    paint.lineCap = "round";
    paint.beginPath();
    this.points.forEach((p, i) => {
      if (i === 0) paint.moveTo(p.x, p.z);
      else paint.lineTo(p.x, p.z);
    });
    // Feather the shoulder outwards while retaining the original 11.2-unit route.
    paint.strokeStyle = stage.edge;
    for(let width=15;width>=11.4;width-=.45){paint.globalAlpha=.09;paint.lineWidth=width;paint.stroke();}
    paint.globalAlpha=1;
    paint.strokeStyle = stage.road;
    paint.lineWidth = 11.2;
    paint.stroke();
    paint.globalCompositeOperation = "source-atop";
    paint.fillStyle = "#69583b15";
    let grain = 37;
    for (let i = 0; i < 14000; i++) {
      grain = (grain * 16807) % 2147483647;
      const x = (grain / 2147483647 - 0.5) * 170;
      grain = (grain * 16807) % 2147483647;
      const z = (grain / 2147483647 - 0.5) * 160;
      paint.fillRect(x, z, 0.13, 0.1);
    }
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    texture.anisotropy = Math.min(
      4,
      this.renderer.capabilities.getMaxAnisotropy(),
    );
    const road = new T.Mesh(
      new T.PlaneGeometry(170, 160),
      new T.MeshStandardMaterial({
        map: texture,
        transparent:true,depthWrite:false,alphaTest:.015,
        roughness: weather === "rain" ? 0.35 : 1,
      }),
    );
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.04;
    road.receiveShadow = true;
    this.root.add(road);
    this.surfaceEffects=new SurfaceEffects(this.selection,this.points,this.atmosphere.reduced);this.root.add(this.surfaceEffects.group);
    let seed = 42;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 170; i++) {
      const x = (random() - 0.5) * 158,
        z = (random() - 0.5) * 148;
      if (this.nearest(x, z).distance < 9 || this.atmosphere.reserved(x,z)) continue;
      this.obstacles.push({ x, z, radius: 1.5 });
      const h = 3 + random() * 5;
      if (stage.id === "desert") {
        this.box(.9,h,.9,"#74836a",x,h/2,z);
        this.box(2.5,.6,.6,"#74836a",x+.6,h*.55,z);
        this.box(.6,1.6,.6,"#74836a",x+1.5,h*.7,z);
        continue;
      }
      if (stage.id === "mountain") {
        const rock = new T.Mesh(new T.DodecahedronGeometry(2 + random()*3,0), this.material("#858984"));
        rock.position.set(x,1.5,z); rock.scale.y=1.5; rock.castShadow=true; this.root.add(rock);
        continue;
      }
      this.box(0.6, h * 0.6, 0.6, "#705b42", x, h * 0.25, z);
      for (let j = 0; j < 3; j++) {
        const crown = new T.Mesh(
          new T.ConeGeometry(2.5 - j * 0.55, h * 0.65, 7),
          this.material(stage.id === "alpine" ? ["#dde8e8", "#b9cecc", "#e8ece8"][j] : ["#48694c", "#56794e", "#6c8055"][i % 3]),
        );
        crown.position.set(x, h * 0.5 + j * h * 0.21, z);
        crown.rotation.y = random();
        crown.castShadow = true;
        this.root.add(crown);
      }
    }
    for (let i = 0; i < 90; i++) {
      const x = (random() - 0.5) * 150,
        z = (random() - 0.5) * 140;
      if (this.nearest(x, z).distance < 7 || this.atmosphere.reserved(x,z)) continue;
      const rock = new T.Mesh(
        new T.DodecahedronGeometry(0.5 + random(), 0),
        this.material(stage.id === "desert" ? "#b68057" : stage.id === "alpine" ? "#eceded" : "#a3a48e"),
      );
      rock.position.set(x, 0.3, z);
      rock.scale.y = 0.65;
      rock.castShadow = true;
      this.root.add(rock);
    }
    this.checkpoints.forEach((idx, i) => {
      const p = this.points[idx],
        a = this.points[Math.max(0, idx - 1)],
        dir = new T.Vector3(p.z - a.z, 0, a.x - p.x).normalize();
      for (const side of [-1, 1]) {
        const x = p.x + dir.x * 6 * side,
          z = p.z + dir.z * 6 * side;
        this.box(0.25, 2.6, 0.25, "#eee3ca", x, 1.3, z);
        const flag=this.box(2, 1.5, 0.12, i === 17 ? "#e4bb48" : "#d65c3f", x, 2.3, z);flag.rotation.y=Math.PI/4;this.checkpointEffects.register(i,flag);
      }
    });
    for (const idx of [0, 650]) {
      const p = this.points[idx];
      const gate = new T.Group();
      gate.position.copy(p);
      const tangent = this.points[Math.min(idx + 1, 650)]
        .clone()
        .sub(this.points[Math.max(0, idx - 1)]);
      gate.rotation.y = Math.atan2(tangent.x, tangent.z);
      this.root.add(gate);
      this.box(0.4, 5, 0.4, "#f1e3c7", -6, 2.5, 0, gate);
      this.box(0.4, 5, 0.4, "#f1e3c7", 6, 2.5, 0, gate);
      this.box(
        12.5,
        1.4,
        0.5,
        idx === 0 ? "#d65c3f" : "#263c32",
        0,
        5,
        0,
        gate,
      );
      const labelCanvas=document.createElement("canvas");labelCanvas.width=512;labelCanvas.height=64;
      const labelPaint=labelCanvas.getContext("2d");
      if(labelPaint){
        labelPaint.fillStyle=idx===0?"#d65c3f":"#263c32";labelPaint.fillRect(0,0,512,64);
        labelPaint.fillStyle="#fff1d5";labelPaint.font="900 42px sans-serif";labelPaint.textAlign="center";labelPaint.textBaseline="middle";
        labelPaint.fillText(idx===0?"START":"FINISH",256,34);
        const texture=new T.CanvasTexture(labelCanvas);texture.colorSpace=T.SRGBColorSpace;
        const label=new T.Mesh(new T.PlaneGeometry(10,1.15),new T.MeshStandardMaterial({map:texture}));
        label.position.set(0,5,-.26);label.rotation.y=Math.PI;gate.add(label);
        const back=label.clone();back.position.z=.26;back.rotation.y=0;gate.add(back);
      }
      for (let j = 0; j < 12; j++)
        this.box(
          1,
          0.04,
          1,
          j % 2 ? "#eddfc7" : "#344637",
          j - 5.5,
          0.09,
          0,
          gate,
        );
    }
    this.root.add(this.atmosphere.group);
    for (let i = 0; i < 24; i++) {
      const mesh = new T.Mesh(
        new T.IcosahedronGeometry(0.3, 0),
        new T.MeshStandardMaterial({
          color: weather === "rain" ? "#adbdc4" : stage.dust,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      this.root.add(mesh);
      this.dust.push(mesh);
    }
    if (["rain","snow","wind","haze"].includes(weather)) {
      this.precipitation=new WeatherParticles(weather,this.atmosphere.reduced);this.root.add(this.precipitation.object);
    }
  }
  updateWeather(dt:number){this.precipitation?.update(dt,this.vehicle.position);}
  nearest(x: number, z: number) {
    let index = 0,
      distance = Infinity;
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i],
        d = Math.hypot(x - p.x, z - p.z);
      if (d < distance) {
        distance = d;
        index = i;
      }
    }
    return { index, distance };
  }
  release(group: T.Object3D) {
    group.traverse((obj) => {
      if (obj instanceof T.InstancedMesh) obj.dispose();
      if (obj instanceof T.Mesh || obj instanceof T.Points || obj instanceof T.LineSegments) {
        obj.geometry.dispose();
        const materials = Array.isArray(obj.material)
          ? obj.material
          : [obj.material];
        materials.forEach((m) => {
          if ("map" in m) (m as T.MeshStandardMaterial).map?.dispose();
          m.dispose();
        });
      }
    });
  }
  choose(index: number) {
    this.clearGhost();
    this.selected = (index + cars.length) % cars.length;
    this.audio?.setCar(this.selected);
    this.callbacks.select(this.selected);
    this.root.remove(this.vehicle);
    this.release(this.vehicle);
    this.vehicle = new T.Group();
    this.root.add(this.vehicle);
    this.wheels = [];
    const c = cars[this.selected];
    this.box(2.15, 0.8, 4.1, c.color, 0, 0.95, 0, this.vehicle);
    this.box(
      1.8,
      0.8,
      c.shape === "hatch" ? 2.25 : 1.9,
      c.color,
      0,
      1.65,
      -0.25,
      this.vehicle,
    );
    this.box(1.83, 0.52, 1.5, "#344b50", 0, 1.67, -0.12, this.vehicle);
    this.box(1.82, 0.18, 1.6, c.color, 0, 2, -0.12, this.vehicle);
    this.box(0.44, 0.05, 3.9, c.accent, -0.53, 1.38, 0, this.vehicle);
    this.box(0.44, 0.05, 3.9, c.accent, 0.53, 1.38, 0, this.vehicle);
    this.box(1.5, 0.14, 0.5, c.color, 0, 1.47, 1.08, this.vehicle);
    this.box(1.1, 0.13, 0.12, "#243b39", 0, 1.5, 1.31, this.vehicle);
    this.box(
      2.2,
      0.17,
      0.5,
      c.accent,
      0,
      c.shape === "wing" ? 2.05 : 1.45,
      -1.85,
      this.vehicle,
    );
    if (c.shape === "wing")
      for (const x of [-0.7, 0.7])
        this.box(0.12, 0.65, 0.15, c.color, x, 1.72, -1.85, this.vehicle);
    for (const x of [-0.7, 0.7]) {
      const lamps=lighting(this.selection).lamps;
      const front=this.box(0.55,0.25,0.08,"#fff1b8",x,1.05,2.08,this.vehicle),rear=this.box(0.5,0.2,0.09,"#b93625",x,1.05,-2.08,this.vehicle);
      for(const [mesh,color] of [[front,'#fff1b8'],[rear,'#b93625']] as const){const m=mesh.material as T.MeshStandardMaterial;m.emissive.set(color);m.emissiveIntensity=lamps?1.5:0;}
      if(lamps){const light=new T.SpotLight('#fff0cf',lamps,28,Math.PI/5,.65,1);light.position.set(x,1.2,2.1);light.target.position.set(x,.05,18);light.castShadow=false;this.vehicle.add(light,light.target);}

    }
    for (const x of [-1.08, 1.08])
      for (const z of [-1.3, 1.3]) {
        const wheel = new T.Mesh(
          new T.CylinderGeometry(0.52, 0.52, 0.42, 12),
          this.material("#303530"),
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.54, z);
        wheel.castShadow = true;
        this.vehicle.add(wheel);
        this.wheels.push(wheel);
        const hub = new T.Mesh(
          new T.CylinderGeometry(0.29, 0.29, 0.44, 10),
          this.material("#d8c88f"),
        );
        hub.rotation.z = Math.PI / 2;
        hub.position.copy(wheel.position);
        this.vehicle.add(hub);
      }
    try {
      const value = Number(
        localStorage.getItem(`pocket-rally-best-${boardKey(this.selection)}-${this.selected}`),
      );
      this.best = Number.isFinite(value) && value > 0 ? value : null;
    } catch {
      this.best = null;
    }
    this.mud=createMud(this.selection.stage==="alpine"?"#8b8b79":this.selection.stage==="desert"?"#a17c47":"#6b5035");this.vehicle.add(this.mud);
    this.callbacks.best(this.best);
    this.resetPosition();
    void this.prepareGhost();
  }
  clearGhost() {
    this.ghostGeneration++;this.ghostAbort?.abort();this.ghostAbort=null;
    if(this.ghostCar){this.root.remove(this.ghostCar);this.release(this.ghostCar);this.ghostCar=null;}
    this.ghostReplay=null;
  }
  toggleGhost(){this.ghostVisible=!this.ghostVisible;this.callbacks.ghostVisibility?.(this.ghostVisible);}
  setGhost(source:GhostSource){
    this.ghostSource=source;this.ghostVisible=true;this.callbacks.ghostVisibility?.(true);
    try{localStorage.setItem("rally-ghost-source",source);}catch{}
    if(this.mode==="garage")void this.prepareGhost();
  }
  async prepareGhost(){
    this.clearGhost();
    if(this.ghostSource==="off"){this.callbacks.ghost?.("Ghost off");return;}
    const generation=this.ghostGeneration;
    let replay:unknown=null,label="My best";
    try{
      if(this.ghostSource==="personal"){
        replay=JSON.parse(localStorage.getItem(replayKey(this.selection,this.selected))||"null");
        if(!matchingReplay(replay,this.selection,this.selected,this.best ?? undefined)){this.callbacks.ghost?.(this.best?"Set a new best to record your ghost":"Complete a clean run to record your ghost");return;}
      }else{
        this.callbacks.ghost?.("Loading leader’s ghost…");
        const controller=new AbortController();this.ghostAbort=controller;
        const timeout=setTimeout(()=>controller.abort(),5000);
        try {
          const query=new URLSearchParams({stage:this.selection.stage,weather:this.selection.weather,reverse:String(this.selection.reverse),timeOfDay:timeOfDay(this.selection),car:String(this.selected)});
          const response=await fetch(`/api/rally/ghost?${query}`,{signal:this.ghostAbort.signal});
          if(!response.ok)throw new Error("unavailable");const data=await response.json();replay=data.replay;label=data.name?`Leader: ${data.name}`:"Leader";
        }finally{clearTimeout(timeout);}
      }
      if(generation!==this.ghostGeneration || this.disposed || (this.mode!=="garage" && this.mode!=="finished"))return;
      if(!matchingReplay(replay,this.selection,this.selected)){this.callbacks.ghost?.("Leader’s ghost unavailable");return;}
      this.ghostReplay=replay;
      this.ghostCar=this.vehicle.clone(true);
      this.ghostCar.getObjectByName("car-mud")?.removeFromParent();
      this.ghostCar.traverse(obj=>{if(obj instanceof T.Mesh){obj.geometry=obj.geometry.clone();const material=(obj.material as T.MeshStandardMaterial).clone();material.transparent=true;material.opacity=.3;material.depthWrite=false;material.color.lerp(new T.Color("#b6f7ed"),.4);obj.material=material;obj.castShadow=false;obj.receiveShadow=false;}});
      const lights:T.Object3D[]=[];this.ghostCar.traverse(obj=>{if(obj instanceof T.Light)lights.push(obj);});lights.forEach(light=>light.removeFromParent());
      this.ghostCar.visible=false;this.root.add(this.ghostCar);this.callbacks.ghost?.(label);
    }catch{if(generation===this.ghostGeneration)this.callbacks.ghost?.("Ghost unavailable · racing still works");}
  }
  completeRun(){
    if(this.mode!=="race")return;
    if(this.time>600)this.markPractice("time-limit");
    if((this.trace.at(-1)?.[0] ?? -1)>=this.time){this.trace.pop();this.replaySamples.pop();}
    this.trace.push([this.time,this.vehicle.position.x,this.vehicle.position.z]);
    this.replaySamples.push([this.time,Number(this.vehicle.position.x.toFixed(2)),Number(this.vehicle.position.z.toFixed(2)),Number(this.angle.toFixed(4))]);
    const replay:Replay|undefined=this.cleanRun && this.time<=600 && this.replaySamples.length<=2600 ? {version:1,selection:{...this.selection},car:this.selected,time:this.time,samples:this.replaySamples}:undefined;
    if (this.cleanRun && (!this.best || this.time < this.best)) {
      this.best=this.time;
      try {
        localStorage.setItem(`pocket-rally-best-${boardKey(this.selection)}-${this.selected}`,String(this.best));
        if(replay)localStorage.setItem(replayKey(this.selection,this.selected),JSON.stringify(replay));
      }catch{}
      this.callbacks.best(this.best);
    }
    this.callbacks.finish?.(this.time,this.cleanRun ? this.trace : [],replay,{eligible:this.cleanRun,reasons:[...this.reasons]});
    this.arrival=0;this.arrivalFrom.copy(this.vehicle.position);this.arrivalAngle=this.angle;
    this.velocity.set(0,0,0);this.setMode("celebrating");
  }
  skipCelebration(){
    if(this.mode!=="celebrating")return;
    this.vehicle.position.copy(this.atmosphere.layout.center);this.vehicle.rotation.y=this.atmosphere.layout.angle;
    this.velocity.set(0,0,0);this.atmosphere.celebrate();this.setMode("finished");
  }
  setMode(mode: Mode) {
    this.keys.clear();this.touchSteer=0;this.touchHeld=false;this.touchActive=false;this.haptics.stop();
    this.mode = mode;
    this.audio?.setMode(mode);
    this.callbacks.mode(mode);
    if(mode==="finished")void this.prepareGhost();
  }
  markPractice(reason:RunReason){
    this.cleanRun=false;
    if(!this.reasons.includes(reason)){this.reasons.push(reason);this.callbacks.practice?.([...this.reasons]);}
  }
  clearFeedback(){this.surfaceEffects?.reset();if(this.mud)(this.mud.material as T.MeshStandardMaterial).opacity=0;this.checkpointEffects?.reset();this.splitReference=[];this.notifications.clear();this.callbacks.checkpoints?.([]);this.reasons=[];this.callbacks.practice?.([]);}
  resetPosition() {
    if(this.mode === "race") this.markPractice('car-recovered');
    const idx = this.checkpoint ? this.checkpoints[this.checkpoint - 1] : 0;
    const p = this.points[idx],
      next = this.points[Math.min(idx + 3, 650)];
    this.vehicle.position.copy(p);
    this.angle = Math.atan2(next.x - p.x, next.z - p.z);
    this.vehicle.rotation.y = this.angle;
    this.velocity.set(0, 0, 0);
    this.rpm = 950;
    this.limited = false;
  }
  uiCue(kind:"select"|"start"|"restart"="select"){if(!this.muted)this.audio?.cue(kind);}
  start() {
    this.uiCue(this.mode==="garage"?"start":"restart");
    this.setMode("countdown");
    this.clearFeedback();
    this.checkpoint = 0;
    this.time = 0;
    this.countdown = 3;
    this.cleanRun = true;
    this.replaySamples = [];
    this.atmosphere.reset();
    let reference=this.ghostReplay;
    if(this.ghostSource==='off'){try{const personal=JSON.parse(localStorage.getItem(replayKey(this.selection,this.selected))||'null');if(matchingReplay(personal,this.selection,this.selected,this.best??undefined))reference=personal;}catch{}}
    this.splitReference=reference?checkpointSplits(reference):[];
    this.ghostGeneration++;this.ghostAbort?.abort();
    if(this.ghostSource!=="off" && !this.ghostReplay)this.callbacks.ghost?.("No ghost for this attempt");
    this.trace = [];
    this.traceAt = 0;
    this.callbacks.start?.();
    this.resetPosition();
    this.setMode("countdown");
    void this.ensureAudio().catch(() => {
      this.muted = true;
    });
  }
  garage() {
    this.clearFeedback();
    this.atmosphere.reset();
    this.setMode("garage");
    void this.prepareGhost();
    this.checkpoint = 0;
    this.resetPosition();
    void this.ensureAudio().catch(() => {
      this.muted = true;
      this.callbacks.audio?.(true);
    });
  }
  pause() {
    if (this.mode === "paused") {
      this.setMode(this.resumeMode);
      void this.ensureAudio().catch(() => {
        this.muted = true;
        this.callbacks.audio?.(true);
      });
    } else if (this.mode === "race" || this.mode === "countdown") {
      this.resumeMode=this.mode;this.setMode("paused");
    }
  }
  async sound(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.audio?.pause();
      return;
    }
    try {
      await this.ensureAudio();
    } catch (error) {
      this.audio?.pause();
      this.muted = true;
      this.callbacks.audio?.(true);
      throw error;
    }
  }
  prepareAudio() {
    if (this.audio) return;
    this.audio = new RallyAudio(() => {
      this.muted = true;
      if (!this.disposed) this.callbacks.audio?.(true);
    });
    this.audio.setCar(this.selected);
    this.audio.setMode(this.mode);
  }
  async ensureAudio() {
    if (
      this.muted ||
      this.disposed ||
      document.hidden ||
      this.mode === "paused"
    )
      return;
    this.prepareAudio();
    await this.audio?.enable();
  }
  keydown = (event: KeyboardEvent) => {
    if(event.code==="Escape"){
      event.preventDefault();
      if(this.menuOpen || this.mode==="paused" || this.mode==="garage" || this.mode==="finished")this.callbacks.menu?.("back");else this.pause();
      return;
    }
    const target=event.target;
    if(target instanceof HTMLElement && (target.matches("input,select,textarea,button") || target.isContentEditable)) return;
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
        event.code,
      )
    )
      event.preventDefault();
    this.keys.add(event.code);
    if (event.repeat) return;
    if(this.mode==="celebrating" && (event.code==="Enter"||event.code==="Space")){this.skipCelebration();return;}
    if(event.code==="KeyG"){this.toggleGhost();return;}
    if (this.mode === "garage") {
      if (event.code === "ArrowLeft") this.choose(this.selected - 1);
      if (event.code === "ArrowRight") this.choose(this.selected + 1);
      if (event.code === "Enter") this.start();
    } else if (event.code === "Escape") this.pause();
    else if (event.code === "KeyR" && this.mode === "race")
      this.resetPosition();
    else if (event.code === "Enter" && this.mode === "finished") this.start();
  };
  keyup = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };
  blur = () => {
    this.keys.clear();
    if (this.mode === "race" || this.mode === "countdown") this.pause();
  };
  visibility = () => {
    if (document.hidden) {
      this.audio?.pause();
      this.blur();
    } else if (this.mode === "garage")
      void this.ensureAudio().catch(() => {
        this.muted = true;
        this.callbacks.audio?.(true);
      });
  };
  resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    this.renderer.setSize(w, h);
    const span = this.mode === "garage" ? 17 : 31;
    this.camera.left = (-span * w) / h;
    this.camera.right = (span * w) / h;
    this.camera.top = span;
    this.camera.bottom = -span;
    this.camera.near = 0.1;
    this.camera.far = 350;
    this.camera.updateProjectionMatrix();
  }
  tick = (now: number) => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.tick);
    const dt = Math.min((now - (this.last || now)) / 1000, 0.04);
    this.last = now;
    const pad = navigator.getGamepads?.()?.find((p) => p?.connected);
    let steer = 0,
      throttle = 0,
      brake = 0,
      hand = false;
    if (!!pad !== this.padConnected) {
      if (!pad && this.padConnected) this.blur();
      this.padConnected = !!pad;
      this.callbacks.pad(pad ? "Controller connected" : "Controller disconnected");
    }
    if (pad) {
      const buttons = pad.buttons.map((b) => b.pressed),
        edge = (i: number) => buttons[i] && !this.previousButtons[i];
      steer = Math.abs(pad.axes[0] || 0) > 0.12 ? pad.axes[0] : 0;
      throttle = pad.buttons[7]?.value || 0;
      brake = pad.buttons[6]?.value || 0;
      hand = buttons[0];
      if(this.menuOpen || this.mode==="garage" || this.mode==="paused" || this.mode==="finished"){
        if(edge(12)||edge(14))this.callbacks.menu?.("previous");
        if(edge(13)||edge(15))this.callbacks.menu?.("next");
        if(edge(0))this.callbacks.menu?.("activate");
        if(edge(1)||edge(9))this.callbacks.menu?.("back");
        if(this.mode==="garage" && !this.menuOpen){if(edge(4))this.choose(this.selected-1);if(edge(5))this.choose(this.selected+1);}
      }else{
        if(edge(9))this.pause();
        if(edge(3) && this.mode==="race")this.resetPosition();
        if(edge(2) && this.mode==="race")this.toggleGhost();
        if(edge(0) && this.mode==="celebrating")this.skipCelebration();
      }
      this.previousButtons = buttons;
    } else this.previousButtons = [];
    if(!this.touchHeld)this.touchSteer*=Math.exp(-dt*13);
    if(this.touchHeld||Math.abs(this.touchSteer)>.005)steer=this.touchSteer;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) steer = -1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) steer = 1;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) throttle = 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) brake = 1;
    hand = hand || this.keys.has("Space");
    this.haptics.update(now,dt,this.controls.haptics,this.mode==="race",this.velocity.length(),steer,pad??undefined,this.touchActive);
    if (this.audio) {
      // Publish telemetry only; the audio mixer runs independently at 20 Hz.
      this.audio.crowdDistance=this.atmosphere.crowdDistance(this.vehicle.position);
      this.audio.drive.speed = this.velocity.length();
      this.audio.drive.throttle = throttle;
      this.audio.drive.brake = brake;
      this.audio.drive.rpm = this.rpm;
      this.audio.drive.limited = this.limited;
      this.audio.drive.sliding =
        hand || (Math.abs(steer) > 0.6 && this.velocity.length() > 8);
    }
    if (this.mode === "countdown") {
      this.countdown -= dt;
      if (this.countdown <= 0) this.setMode("race");
    }
    if (this.mode === "race") {
      this.movementFrom.copy(this.vehicle.position);
      this.time += dt;
      const c = cars[this.selected];
      const forward = new T.Vector3(
        Math.sin(this.angle),
        0,
        Math.cos(this.angle),
      );
      const speed = this.velocity.dot(forward);
      const road = this.nearest(
        this.vehicle.position.x,
        this.vehicle.position.z,
      );
      const tuning = handling(speed, steer, c.grip * surfaceGrip(this.selection), hand, road.distance > 5.6);
      const motor = engine(speed, throttle, this.rpm, this.limited, dt);
      this.rpm = motor.rpm;
      this.limited = motor.limited;
      this.angle -=
        steer *
        c.steer *
        Math.min(Math.abs(speed) / 7, 1) *
        Math.sign(speed || 1) *
        dt;
      const longitudinal = forward.clone().multiplyScalar(speed);
      this.velocity.lerp(longitudinal, 1 - Math.exp(-tuning.grip * dt));
      const acceleration = (this.limited ? 0 : throttle * c.power) - brake * (speed > 1 ? 25 : 8);
      this.velocity.addScaledVector(forward, acceleration * dt);
      this.velocity.multiplyScalar(
        Math.exp(-tuning.drag * dt),
      );
      if (this.velocity.length() > 25) this.velocity.setLength(25);
      this.vehicle.position.addScaledVector(this.velocity, dt);
      for (const obstacle of this.obstacles) {
        const dx = this.vehicle.position.x - obstacle.x,
          dz = this.vehicle.position.z - obstacle.z,
          d = Math.hypot(dx, dz);
        if (d < obstacle.radius + 1 && d > 0) {
          this.vehicle.position.x =
            obstacle.x + (dx / d) * (obstacle.radius + 1);
          this.vehicle.position.z =
            obstacle.z + (dz / d) * (obstacle.radius + 1);
          this.velocity.multiplyScalar(0.35);
        }
      }
      this.vehicle.rotation.y = this.angle;
      this.vehicle.rotation.z = -steer * Math.min(Math.abs(speed) / 200, 0.07);
      this.vehicle.position.y =
        Math.sin(now * 0.033) * Math.min(Math.abs(speed) * 0.002, 0.035);
      if (
        Math.abs(this.vehicle.position.x) > 81 ||
        Math.abs(this.vehicle.position.z) > 76
      ) {
        this.vehicle.position.x = T.MathUtils.clamp(
          this.vehicle.position.x,
          -81,
          81,
        );
        this.vehicle.position.z = T.MathUtils.clamp(
          this.vehicle.position.z,
          -76,
          76,
        );
        this.velocity.multiplyScalar(0.3);
      }
      if(this.time >= this.traceAt && this.time<=600 && this.trace.length<2599) {
        this.trace.push([Number(this.time.toFixed(3)), Number(this.vehicle.position.x.toFixed(2)), Number(this.vehicle.position.z.toFixed(2))]);
        this.replaySamples.push([Number(this.time.toFixed(3)),Number(this.vehicle.position.x.toFixed(2)),Number(this.vehicle.position.z.toFixed(2)),Number(this.angle.toFixed(4))]);
        this.traceAt=this.time+.25;
      }
      const passage=advanceCheckpoints(this.points,this.checkpoints,this.checkpoint,this.movementFrom,this.vehicle.position,this.time);
      this.checkpoint=passage.cursor;
      if(passage.events.length){
        if(passage.events.some(e=>e.outcome==="missed"))this.markPractice("missed-checkpoint");
        this.checkpointEffects.emit(passage.events);
        for(const event of passage.events){const reference=this.splitReference[event.checkpoint-1];if(this.cleanRun&&event.outcome==='accepted'&&reference!==undefined)event.delta=event.time-reference;}
        this.notifications.push(passage.events);this.callbacks.checkpoints?.([...this.notifications.items]);
      }
      if(passage.finished)this.completeRun();
      if (Math.abs(speed) > 4) {
        const sliding = hand || Math.abs(steer) > 0.5;
        const tarmac = this.selection.stage === "mountain" && this.selection.weather !== "rain";
        this.dustClock += dt;
        if (this.dustClock >= 1 / 24) {
          this.dustClock %= 1 / 24;
          const dust = this.dust[this.dustCursor++ % this.dust.length];
          dust.position.copy(this.vehicle.position).addScaledVector(forward, -2);
          const side = (Math.random() - 0.5) * (sliding ? 3 : 1.8);
          dust.position.x += Math.cos(this.angle) * side;
          dust.position.z -= Math.sin(this.angle) * side;
          dust.position.y = 0.6;
          dust.scale.set(sliding ? 2.5 : 1.8, 1.4, 2);
          (dust.material as T.MeshStandardMaterial).opacity = tarmac ? (sliding ? .16 : 0) : sliding ? 0.65 : 0.5;
          dust.visible = true;
        }
      }
    }
    if(this.mode==="celebrating"){
      this.arrival+=dt;const t=Math.min(1,this.arrival/3),ease=1-Math.pow(1-t,3);
      const {finish,approach}=this.atmosphere.layout;
      const lead=this.arrivalFrom.distanceTo(finish),length=approach.getLength(),travel=ease*(lead+length);
      const u=Math.max(0,Math.min(1,(travel-lead)/length));
      if(travel<lead)this.vehicle.position.lerpVectors(this.arrivalFrom,finish,travel/lead);
      else this.vehicle.position.copy(approach.getPointAt(u));
      const tangent=travel<lead?finish.clone().sub(this.arrivalFrom):approach.getTangentAt(u);
      this.vehicle.rotation.set(0,headingBetween(this.arrivalAngle,Math.atan2(tangent.x,tangent.z),Math.min(1,t*6)),0);
      if(t===1){this.atmosphere.celebrate();this.setMode("finished");}
    }
    if(this.ghostCar){
      const pose=this.ghostReplay && (this.mode==="race"||this.mode==="paused")?replayPose(this.ghostReplay,this.time):null;
      this.ghostCar.visible=Boolean(pose && this.ghostVisible);
      if(pose){this.ghostCar.position.set(pose.x,.08,pose.z);this.ghostCar.rotation.set(0,pose.angle,0);}
    }
    if(this.notifications.tick(dt,this.mode==="paused"))this.callbacks.checkpoints?.([...this.notifications.items]);
    this.surfaceEffects.update(this.mode==="paused"?0:dt,this.vehicle.position,this.angle,this.velocity.length(),this.mode==="race");
    if(this.mud)(this.mud.material as T.MeshStandardMaterial).opacity=this.surfaceEffects.mud*.9;
    this.atmosphere.update(this.mode==="paused"?0:dt,now/1000,this.vehicle.position,this.velocity.length(),this.mode==="race");
    this.checkpointEffects.update(this.mode==="paused"?0:dt);
    if(this.mode!=="paused")this.updateWeather(dt);
    this.dust.forEach((d) => {
      const m = d.material as T.MeshStandardMaterial;
      m.opacity = Math.max(0, m.opacity - dt * 0.35);
      d.visible = m.opacity > 0;
      d.scale.addScalar(dt * 1.8);
      d.position.y += dt * 0.65;
    });
    const target = this.vehicle.position.clone();
    let desired: T.Vector3;
    if (this.mode === "garage") {
      this.vehicle.rotation.y = now * 0.00017;
      target.y = 0.5;
      if(this.host.clientWidth>this.host.clientHeight)target.add(new T.Vector3(18,0,-14).normalize().multiplyScalar(5));else target.y-=4;
      desired = target.clone().add(new T.Vector3(14, 13, 18));
      this.camera.zoom = 2.2;
    } else if(this.mode==="celebrating" || this.mode==="finished") {
      target.lerp(this.atmosphere.layout.center,.6);
      if(this.mode==="finished"){if(this.host.clientWidth>this.host.clientHeight)target.add(new T.Vector3(8,0,-8));else target.y-=8;}
      desired=target.clone().add(new T.Vector3(20,24,20));this.camera.zoom=1.3;
    } else {
      target.addScaledVector(this.velocity, 0.35);
      desired = target.clone().add(new T.Vector3(28, 36, 28));
      this.camera.zoom = 1;
    }
    this.camera.position.lerp(
      desired,
      this.mode === "garage" ? 0.05 : 1 - Math.exp(-dt * 7),
    );
    this.camera.lookAt(target);
    this.resizeCamera();
    if (now - this.report > 70) {
      this.report = now;
      this.callbacks.stats({
        time: this.time,
        speed: Math.round(this.velocity.length() * 4),
        rpm: Math.round(this.rpm / 50) * 50,
        limited: this.limited,
        progress: this.checkpoint / this.checkpoints.length,
        count: Math.ceil(this.countdown),
      });
    }
    this.renderer.render(this.scene, this.camera);
  };
  resizeCamera() {
    const span = this.mode === "garage" ? 17 : 31,
      ratio = this.host.clientWidth / Math.max(1, this.host.clientHeight);
    this.camera.left = -span * ratio;
    this.camera.right = span * ratio;
    this.camera.top = span;
    this.camera.bottom = -span;
    this.camera.updateProjectionMatrix();
  }
  dispose() {
    this.disposed = true;this.haptics.stop();
    this.clearGhost();
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    window.removeEventListener("keydown", this.keydown);
    window.removeEventListener("keyup", this.keyup);
    window.removeEventListener("blur", this.blur);
    document.removeEventListener("visibilitychange", this.visibility);
    this.checkpointEffects?.dispose();
    this.release(this.root);
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.audio?.dispose();
  }
}
