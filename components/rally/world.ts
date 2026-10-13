import {specialVehicle} from './special-vehicle';
import {stageVehicle} from './stages';
import {pacedFrame} from './frame-pacing';
import {RouteIndex} from './route-index';
import {RenderMetrics} from './render-metrics';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {MiniatureRenderer,groundGrain,clayMaps,textureClay,miniatureTrees,roadsideDetails,type Graphics} from './miniature';
import {VehicleVisual,loadVehicle,loadSpecialProps} from './vehicle-visual';
import {releaseVisual,cloneGhost} from './visual-resources';
import {selectRamps,type Ramp} from './jumps';
import {RallyPlume,JumpFountains,internationalFlags,roughShoulders} from './rally-effects';
import {LiveRivals} from './live-rivals';
import type {LivePose} from './room-types';
import {DriverCamera} from './driver-camera';
import {kartFlagPosition,kartBarrierSegments,kartFloor,kartLapProgress,type KartFinish} from "./kart-venue";
import {paceNotes,PaceScheduler} from "./codriver";
import * as T from "three";
import {roadRelief} from "./road-relief";
import {StageScenery,elevationPose,rampHeight} from "./scenery";
import {SurfaceEffects,createMud,createSnow,createKartCoating} from "./surface-effects";
import {RallyHaptics,defaultControls,type ControlSettings} from "./controls";
import {lighting,WeatherParticles} from "./conditions";
import {CheckpointEffects} from "./checkpoint-effects";
import { advanceCheckpoints, CheckpointNotifications, type CheckpointNotice, type Eligibility, type RunReason } from "./checkpoints";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { cars, type Mode } from "./data";
import { RallyAudio } from "./audio";
import { handling, engine } from "./handling";
import { isCircuit, lapCount, initialStage, stageDefinition, stagePoints, checkpointIndices, boardKey, surfaceGrip, timeOfDay, timesOfDay, type StageSelection } from "./stages";
import { Atmosphere } from "./atmosphere";
import { type Replay, type GhostSource, matchingReplay, replayKey, replayPose, headingBetween, checkpointSplits } from "./replay";
type Callbacks = {
  preparation?: (text:string)=>void;
  subtitle?: (text:string)=>void;
  stats: (s: {
    time: number;
    speed: number;
    rpm: number;
    limited: boolean;
    progress: number;
    lapProgress:number;
    count: number;
    lap:number;
    lastLap:number;
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
  live=false;liveMenu=false;liveStartAt=0;roomJoined=false;roomMenuOpen=false;onRoomBack:(()=>void)|null=null;
  rivals=new LiveRivals();
  onLivePose:((pose:Omit<LivePose,'id'|'sent'>,recovered:boolean)=>void)|null=null;
  onLiveFinish:((time:number,trace:number[][],practice:boolean)=>void)|null=null;
  onLiveMenu:((open:boolean)=>void)|null=null;
  private sentPose=0;
  private modelPending:Promise<void>=Promise.resolve();
  private preparationId=0;
  private preparedKey="";
  private preparation:Promise<boolean>|null=null;
  private routeIndex:RouteIndex|null=null;
  private nearestCache=new Map<string,{index:number;distance:number}>();
  private viewport={width:1,height:1};
  private projectionKey='';
  private renderedAt=0;
  async prepareRace(){
    const key=boardKey(this.selection)+":"+this.selected+":"+this.ghostSource;
    if(this.preparedKey===key)return true;
    if(this.preparation)return this.preparation;
    const id=++this.preparationId;
    this.preparation=(async()=>{
      this.callbacks.preparation?.('Loading car…');
      await this.modelPending;
      if(id!==this.preparationId||this.disposed)return false;
      this.callbacks.preparation?.('Preparing rivals and sound…');
      await Promise.allSettled([this.prepareGhost(),this.ensureAudio(),this.driverCamera.prepare(this.selected===9?'hover':this.selected===10?'bike':this.selected===8)]);
      if(id!==this.preparationId||this.disposed)return false;
      this.rivals.prewarm(this.vehicle);
      this.callbacks.preparation?.('Warming lights and materials…');
      const textures=new Set<T.Texture>();this.scene.traverse(o=>{if(o instanceof T.Mesh)for(const material of Array.isArray(o.material)?o.material:[o.material])for(const value of Object.values(material))if(value instanceof T.Texture)textures.add(value);});for(const texture of textures)this.renderer.initTexture(texture);
      await this.renderer.compileAsync(this.scene,this.camera);
      const cockpitVisible=this.driverCamera.cockpit.visible;this.driverCamera.cockpit.visible=true;await this.renderer.compileAsync(this.scene,this.driverCamera.camera);this.driverCamera.cockpit.visible=cockpitVisible;
      if(id!==this.preparationId||this.disposed)return false;
      this.renderer.render(this.scene,this.camera);this.rivals.hidePool();this.preparedKey=key;
      return true;
    })().catch(()=>false).finally(()=>{if(id===this.preparationId){this.preparation=null;this.rivals.hidePool();this.callbacks.preparation?.('');}});
    return this.preparation;
  }
  cancelPreparation(){this.preparedKey="";this.preparationId++;this.preparation=null;this.rivals.hidePool();this.callbacks.preparation?.('');}
  async requestStart(){if(await this.prepareRace())this.start();}

  beginLive(at:number){this.live=true;this.liveStartAt=at;this.liveMenu=false;this.start(true);this.countdown=Math.max(0,(at-Date.now())/1000);}
  leaveLive(){this.live=false;this.liveStartAt=0;this.liveMenu=false;this.rivals.clear();this.onLiveMenu?.(false);this.garage();}
  codriverEnabled=true;
  private pace:PaceScheduler|null=null;
  private routeDistances:number[]=[];
  private subtitleUntil=0;
  private subtitleText="";
  private showSubtitle(text:string){if(text!==this.subtitleText){this.subtitleText=text;this.callbacks.subtitle?.(text);}}
  private paceDistance(){const index=Math.max(0,Math.min(650,this.routeProgress(this.vehicle.position))),i=Math.floor(index);return (this.routeDistances[i]??0)+((this.routeDistances[Math.min(650,i+1)]??0)-(this.routeDistances[i]??0))*(index-i);}
  toggleCodriver(){this.codriverEnabled=!this.codriverEnabled;try{localStorage.setItem("rally-codriver",String(this.codriverEnabled));}catch{}this.audio?.stopVoice();this.showSubtitle("");this.pace?.resync(this.paceDistance());}
  controls:ControlSettings={...defaultControls};
  touchSteer=0;touchHeld=false;touchActive=false;
  private haptics=new RallyHaptics();
  private ramps:Ramp[]=[];
  private plume!:RallyPlume;
  private fountains!:JumpFountains;
  private brakeLamps:T.Mesh[]=[];
  private brakeHalos:T.Sprite[]=[];
  private scenery!:StageScenery;
  private roadSurface:T.Mesh|null=null;
  private surfaceRay=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0));
  private playbackHeight(x:number,z:number,desired:number){this.surfaceRay.ray.origin.set(x,20,z);const hit=this.roadSurface?this.surfaceRay.intersectObject(this.roadSurface,false)[0]:null;return Math.max(desired,(hit?.point.y??0)+.04);}
  private lastRallyCar=0;
  private surfaceEffects!:SurfaceEffects;
  private mud:T.InstancedMesh|null=null;
  private snow:T.InstancedMesh|null=null;
  recoveryPenalty=0;
  obstacles: { x: number; z: number; radius: number }[] = [];
  scene = new T.Scene();
  camera = new T.OrthographicCamera();
  driverCamera=new DriverCamera();
  toggleCamera(){this.driverCamera.enabled=!this.driverCamera.enabled;try{localStorage.setItem('rally-camera',this.driverCamera.enabled?'driver':'isometric');}catch{}}

  renderer: T.WebGLRenderer;
  root = new T.Group();
  vehicle = new T.Group();
  wheels: T.Mesh[] = [];
  private visual:VehicleVisual|null=null;
  private visualGeneration=0;
  private environmentMap:T.WebGLRenderTarget|null=null;
  miniature!:MiniatureRenderer;
  private metrics!:RenderMetrics;
  setGraphics(g:Graphics){this.miniature.set(g);this.resize();}

  mode: Mode = "garage";
  selected = 0;
  time = 0;
  countdown = 3;
  checkpoint = 0;
  lap = 1;
  circuitFinishArmed=false;
  lapTimes:number[]=[];
  resultReplay:Replay|null=null;
  replayClock=0;
  replayEnabled=!(typeof matchMedia!=="undefined"&&matchMedia("(prefers-reduced-motion: reduce)").matches);
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
  muted = false;
  padConnected = false;
  disposed = false;
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
    try{this.muted=localStorage.getItem("rally-muted")==="true";}catch{}
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.setClearColor("#c6c5a8");
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.host.appendChild(this.renderer.domElement);this.metrics=new RenderMetrics(this.renderer,this.host);this.rivals.onPacket=gap=>this.metrics.packet(gap);
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
    const pmrem=new T.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.environmentMap=pmrem.fromScene(room,.05);this.scene.environment=this.environmentMap.texture;this.scene.environmentIntensity=.35;room.dispose();pmrem.dispose();
    this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;
    this.miniature=new MiniatureRenderer(this.renderer,this.scene,this.camera,sun);
    this.nearestCache.clear();this.points = stagePoints(this.selection);this.routeIndex=new RouteIndex(this.points);
    this.checkpoints = [...checkpointIndices];
    try {const stored=localStorage.getItem("rally-ghost-source");if(stored==="off"||stored==="personal"||stored==="leader")this.ghostSource=stored;}catch{}
    try {const day=localStorage.getItem("rally-time-of-day");if(timesOfDay.includes(day as typeof timesOfDay[number]))this.selection.timeOfDay=day as typeof timesOfDay[number];}catch{}
    this.buildStage();
    this.choose(0);
    this.miniature.set(this.miniature.graphics);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    window.addEventListener("keydown", this.keydown);
    window.addEventListener("keyup", this.keyup);
    window.addEventListener("blur", this.blur);
    document.addEventListener("visibilitychange", this.visibility);
    try{this.codriverEnabled=localStorage.getItem("rally-codriver")!=="false";}catch{}
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
    if(this.selected<8)this.lastRallyCar=this.selected;
    this.selection = isCircuit(selection)?{...selection,laps:selection.laps??3,circuitVersion:2}:{...selection,laps:undefined,circuitVersion:undefined};
    this.clearGhost();
    this.checkpointEffects?.dispose();
    this.release(this.root);
    this.root.clear();this.vehicle=new T.Group();this.visual=null;this.visualGeneration++;
    this.obstacles = [];
    this.precipitation = null;
    this.checkpoint = 0;
    this.nearestCache.clear();this.points = stagePoints(this.selection);this.routeIndex=new RouteIndex(this.points);
    this.buildStage();
    this.choose(stageVehicle(selection.stage)??this.lastRallyCar);
    this.miniature.set(this.miniature.graphics);
    this.audio?.setEnvironment(selection.stage);
  }
  buildStage() {
    this.rivals.clear();this.scene.add(this.rivals.group);
    this.scene.add(this.driverCamera.camera);try{this.driverCamera.enabled=localStorage.getItem('rally-camera')==='driver';}catch{}
    this.ramps=selectRamps(this.points,this.selection);
    this.atmosphere = new Atmosphere(this.points,this.selection);
    const stage = stageDefinition(this.selection);
    const weather = this.selection.weather,preset=lighting(this.selection),sky=timeOfDay(this.selection)==='midday'?stage.sky:preset.sky;
    const fogColor=new T.Color(sky);if(weather==="fog"||weather==="haze")fogColor.lerp(new T.Color(timeOfDay(this.selection)==="night"?"#657487":"#c2c9c4"),.55);
    this.scene.background=fogColor;this.renderer.setClearColor(fogColor);this.scene.fog=new T.Fog(fogColor,preset.near,preset.far);
    this.hemisphere.color.set(preset.fill);this.hemisphere.groundColor.set(preset.ground);this.hemisphere.intensity=preset.ambient;
    this.sun.color.set(preset.sun);this.sun.intensity=preset.power;this.sun.position.set(...preset.position as [number,number,number]);
    this.checkpointEffects=new CheckpointEffects(this.atmosphere.reduced);this.root.add(this.checkpointEffects.group);
    const service=this.atmosphere.layout.center;
    if(this.selection.stage==='kart')this.root.add(kartFloor(this.atmosphere.layout as KartFinish,this.selection.weather==='snow'));
    else {const ground=this.box(Math.max(170,Math.abs(service.x)*2+32), 3, Math.max(160,Math.abs(service.z)*2+32), "#ffffff", 0, -1.8, 0);(ground.material as T.MeshStandardMaterial).map=groundGrain(stage.ground);}
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
    paint.strokeStyle = stage.ground;
    if(!isCircuit(this.selection)||this.selection.stage==='mx')for(let width=21;width>=13;width-=.7){paint.globalAlpha=.06;paint.lineWidth=width;paint.stroke();}
    paint.strokeStyle = stage.edge;
    for(let width=this.selection.stage==='kart'?11.7:15;width>=11.4;width-=.45){paint.globalAlpha=.09;paint.lineWidth=width;paint.stroke();}
    paint.globalAlpha=1;
    paint.strokeStyle = stage.road;
    paint.lineWidth = 11.2;
    paint.stroke();
    if(this.selection.stage==='mx'){paint.strokeStyle='#493825';paint.globalAlpha=.22;paint.lineWidth=.32;for(const offset of [-1.4,1.4]){paint.beginPath();this.points.forEach((p,i)=>{const q=this.points[Math.min(i+1,650)],a=Math.atan2(q.x-p.x,q.z-p.z),x=p.x+Math.cos(a)*offset,z=p.z-Math.sin(a)*offset;if(i)paint.lineTo(x,z);else paint.moveTo(x,z);});paint.stroke();}paint.globalAlpha=1;}
    // Irregular biome-coloured shoulder flecks break the uniform road outline.
    if(!isCircuit(this.selection)||this.selection.stage==='mx')for(let i=0;i<this.points.length-1;i+=2){
      const p=this.points[i],q=this.points[i+1],a=Math.atan2(q.x-p.x,q.z-p.z);
      for(const side of [-1,1]){const d=5.6+(Math.sin(i*17)*.5+.5)*2;paint.fillStyle=stage.ground;paint.globalAlpha=.58;paint.beginPath();paint.ellipse(p.x+Math.cos(a)*side*d,p.z-Math.sin(a)*side*d,.3+(i%5)*.17,.55,a,0,Math.PI*2);paint.fill();}
    }paint.globalAlpha=1;
    paint.globalCompositeOperation = "source-atop";
    paint.fillStyle = "#69583b28";
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
    const relief=this.selection.stage==='kart'?null:roadRelief(this.points,this.ramps);
    const roadGeometry=relief?.road??new T.PlaneGeometry(170,160);
    if(relief?.earth.attributes.position){const terrain=new T.Mesh(relief.earth,new T.MeshStandardMaterial({color:stage.ground,roughness:1}));terrain.rotation.x=-Math.PI/2;terrain.receiveShadow=true;this.root.add(terrain);}
    const road = new T.Mesh(
      roadGeometry,
      new T.MeshStandardMaterial({
        map: texture,
        transparent:true,depthWrite:false,alphaTest:.015,
        roughness: weather === "rain" ? 0.35 : 1,
      }),
    );
    road.renderOrder = -10; // Transparent road first, then decals/weather and ghosts.
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.04;
    road.receiveShadow = true;
    this.roadSurface=road;road.updateMatrixWorld(true);
    this.root.add(road);
    this.scenery=new StageScenery(this.selection,this.points,(x,z)=>this.atmosphere.reserved(x,z));this.root.add(this.scenery.group);
    this.surfaceEffects=new SurfaceEffects(this.selection,this.points,this.atmosphere.reduced,this.points,this.ramps);this.root.add(this.surfaceEffects.group);
    const treePlaces:{x:number;z:number;h:number}[]=[];
    let seed = 42;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < (isCircuit(this.selection)?0:170); i++) {
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
      treePlaces.push({x,z,h});
    }
    this.root.add(miniatureTrees(treePlaces,stage.id==='alpine'));
    if(this.selection.stage!=='neon')this.root.add(roadsideDetails(this.points,(x,z)=>this.atmosphere.reserved(x,z),stage.id==='desert'?'#b39a70':stage.id==='alpine'?'#cbd4c9':'#82905b'));
    for (let i = 0; i < (isCircuit(this.selection)?0:90); i++) {
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
    const kartEdges=this.selection.stage==="kart"?kartBarrierSegments(this.points,()=>false):[];
    this.checkpoints.forEach((idx, i) => {
      const p = this.points[idx],
        a = this.points[Math.max(0, idx - 1)],
        dir = new T.Vector3(p.z - a.z, 0, a.x - p.x).normalize();
      for (const side of [-1, 1]) {
        let x = p.x + dir.x * 6 * side,
          z = p.z + dir.z * 6 * side;
        if(kartEdges.length){
          const flagPoint=kartFlagPosition(kartEdges,p,dir,side,this.points);x=flagPoint.x;z=flagPoint.z;
        }
        const rise=rampHeight(idx,this.ramps)*.82;
        this.box(0.25, 1.7, 0.25, "#eee3ca", x, .85+rise, z);
        const flag=this.box(2, 1.5, 0.12, i === 17 ? "#e4bb48" : "#d65c3f", x, 2.3+rise, z);flag.rotation.y=Math.PI/4;this.checkpointEffects.register(i,flag);
      }
    });
    for (const idx of (isCircuit(this.selection)?[650]:[0,650])) {
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
        labelPaint.fillText(isCircuit(this.selection)?"START / FINISH":idx===0?"START":"FINISH",256,34);
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
    textureClay(this.root,clayMaps());
    if(['forest','desert','alpine'].includes(this.selection.stage))this.root.add(roughShoulders(this.points,stage.edge,(x,z)=>this.atmosphere.reserved(x,z)));
    this.plume=new RallyPlume(weather==='rain'?'#adbdc4':weather==='snow'?'#e7eeee':stage.dust,weather==='rain',this.atmosphere.reduced);this.root.add(this.plume.group);
    const jumpFlags=this.ramps.flatMap(r=>{const p=this.points[r.index],d=this.points[r.index+1].clone().sub(this.points[r.index-1]).normalize();return [-1,1].map(side=>p.clone().add(new T.Vector3(d.z*side*11,0,-d.x*side*11)));}).filter(p=>this.points.every(q=>Math.hypot(q.x-p.x,q.z-p.z)>7)&&!this.atmosphere.reserved(p.x,p.z));this.root.add(internationalFlags(jumpFlags));
    this.fountains=new JumpFountains(this.ramps,this.points);this.root.add(this.fountains.group);
    if (["rain","snow","wind","haze"].includes(weather)) {
      this.precipitation=new WeatherParticles(weather,this.atmosphere.reduced);this.root.add(this.precipitation.object);
    }
  }
  updateWeather(dt:number){if(this.precipitation){this.precipitation.object.geometry.setDrawRange(0,this.precipitation.count*(this.precipitation.object instanceof T.LineSegments?2:1)*(this.miniature.low?.5:1));this.precipitation.update(dt,this.vehicle.position);}}
  routeProgress(p:{x:number;z:number}){const i=this.nearest(p.x,p.z).index,a=this.points[Math.min(i,649)],b=this.points[Math.min(i+1,650)],dx=b.x-a.x,dz=b.z-a.z;return Math.min(i,649)+T.MathUtils.clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/Math.max(.0001,dx*dx+dz*dz),-.5,1);}
  nearest(x: number, z: number) {
    const key=x+","+z,cached=this.nearestCache.get(key);if(cached)return cached;
    const {index,distance}=this.routeIndex!.nearest(x,z);
    const result={index,distance};if(this.nearestCache.size>64)this.nearestCache.clear();this.nearestCache.set(key,result);return result;
  }
  release(group:T.Object3D){releaseVisual(group);}
  choose(index: number) {
    this.cancelPreparation();
    this.clearGhost();this.visualGeneration++;this.visual=null;this.host.dataset.visualModel="procedural";
    this.selected = stageVehicle(this.selection.stage)??((index%8)+8)%8;
    this.audio?.setCar(this.selected);
    this.callbacks.select(this.selected);
    this.root.remove(this.vehicle);
    this.release(this.vehicle);
    this.vehicle = new T.Group();
    this.root.add(this.vehicle);
    this.wheels = [];this.brakeLamps=[];this.brakeHalos=[];
    const c = cars[this.selected];
    if(c.shape==='hover'||c.shape==='bike'){
      this.vehicle.add(specialVehicle(c.shape==='bike'));
      const lamps=lighting(this.selection).lamps;for(const x of (c.shape==='bike'?[0]:[-.6,.6])){const light=new T.SpotLight('#d9f5ff',lamps,28,Math.PI/5,.65,1);light.position.set(x,1.4,1.2);light.target.position.set(x,0,18);this.vehicle.add(light,light.target);}
    }else if(c.shape==='kart'){
      this.box(2.2,.22,3.3,'#343c3a',0,.43,0,this.vehicle);
      this.box(1.5,.3,.9,c.color,0,.7,1.15,this.vehicle);
      for(const x of [-.85,.85])this.box(.4,.45,1.8,c.color,x,.7,-.1,this.vehicle);
      this.box(.7,.6,.65,'#303c40',0,.85,-.55,this.vehicle);
      this.box(.65,.65,.6,'#44484b',0,1.08,-.4,this.vehicle);
      const head=new T.Mesh(new T.SphereGeometry(.43,10,8),this.material('#f0d4a6'));head.position.set(0,1.7,-.35);this.vehicle.add(head);
      const helmet=new T.Mesh(new T.SphereGeometry(.47,10,8,0,Math.PI*2,0,Math.PI*.65),this.material('#eeeeea'));helmet.position.copy(head.position);this.vehicle.add(helmet);
      this.box(.64,.2,.1,'#233f4a',0,1.72,.05,this.vehicle);
      for(const x of [-.27,.27]){const arm=this.box(.22,.22,.65,'#44484b',x,1.12,.12,this.vehicle);arm.rotation.x=-.3;}
      const wheel=new T.Mesh(new T.TorusGeometry(.32,.05,5,12),this.material('#303c40'));wheel.position.set(0,1.05,.52);wheel.rotation.x=.65;this.vehicle.add(wheel);
      this.box(.65,.5,.65,'#444a47',.68,.88,-1.05,this.vehicle);
      for(const x of [-.65,.65]){const lamp=this.box(.3,.18,.1,'#fff0c8',x,.8,1.7,this.vehicle);const lamps=lighting(this.selection).lamps;(lamp.material as T.MeshStandardMaterial).emissive.set('#fff0c8');if(lamps){const light=new T.SpotLight('#fff0cf',lamps,28,Math.PI/5,.65,1);light.position.set(x,1,1.7);light.target.position.set(x,0,18);this.vehicle.add(light,light.target);}const rear=this.box(.2,.15,.1,'#b9392a',x,.7,-1.7,this.vehicle);(rear.material as T.MeshStandardMaterial).emissive.set('#b9392a');this.brakeLamps.push(rear);}
    }else{
    const compact=["golf","peugeot","clio"].includes(c.shape);
    const bodyLength=compact?3.65:c.shape==="sierra"?4.5:4.1;
    this.box(2.15, 0.8, bodyLength, c.color, 0, 0.95, 0, this.vehicle);
    this.box(
      1.8,
      0.8,
      compact||c.shape === "hatch" ? 2.25 : 1.9,
      c.color,
      0,
      1.65,
      -0.25,
      this.vehicle,
    );
    if(c.shape==="golf")this.box(1.9,.17,.12,"#d73529",0,.98,1.88,this.vehicle);
    if(c.shape==="peugeot")for(const x of [-1.08,1.08])this.box(.12,.24,3.4,"#303632",x,.78,0,this.vehicle);
    if(c.shape==="clio")this.box(1.5,.12,.2,c.accent,0,.74,1.88,this.vehicle);
    if(c.shape==="sierra")this.box(2.25,.16,.5,c.accent,0,1.58,-2.05,this.vehicle);
    this.box(1.83, 0.52, 1.5, "#344b50", 0, 1.67, -0.12, this.vehicle);
    this.box(1.82, 0.18, 1.6, c.color, 0, 2, -0.12, this.vehicle);
    this.box(0.44, 0.05, bodyLength-.2, c.accent, -0.53, 1.38, 0, this.vehicle);
    this.box(0.44, 0.05, bodyLength-.2, c.accent, 0.53, 1.38, 0, this.vehicle);
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
      const front=this.box(0.55,0.25,0.08,"#fff1b8",x,1.05,bodyLength/2+.03,this.vehicle),rear=this.box(0.5,0.2,0.09,"#b93625",x,1.05,-bodyLength/2-.03,this.vehicle);
      this.brakeLamps.push(rear);
      for(const [mesh,color] of [[front,'#fff1b8'],[rear,'#b93625']] as const){const m=mesh.material as T.MeshStandardMaterial;m.emissive.set(color);m.emissiveIntensity=lamps?1.5:0;}
      if(lamps){const light=new T.SpotLight('#fff0cf',lamps,28,Math.PI/5,.65,1);light.position.set(x,1.2,2.1);light.target.position.set(x,.05,18);light.castShadow=false;this.vehicle.add(light,light.target);}

    }
    }
    for (const x of (this.selected>=9?[]:[-1.08, 1.08]))
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
    this.mud=this.selected>=9?null:this.selected===8?createKartCoating(false):createMud(this.selection.stage==="alpine"?"#8b8b79":this.selection.stage==="desert"?"#a17c47":"#6b5035",[5,6,7].includes(this.selected)?3.65:this.selected===4?4.5:4.1);if(this.mud)this.vehicle.add(this.mud);
    this.snow=this.selected>=9?null:this.selected===8?createKartCoating(true):createSnow([5,6,7].includes(this.selected)?3.65:this.selected===4?4.5:4.1);if(this.snow)this.vehicle.add(this.snow);
    this.callbacks.best(this.best);
    const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=32;const gp=glowCanvas.getContext('2d')!;const gradient=gp.createRadialGradient(16,16,1,16,16,16);gradient.addColorStop(0,'rgba(255,80,50,.8)');gradient.addColorStop(1,'rgba(255,30,10,0)');gp.fillStyle=gradient;gp.fillRect(0,0,32,32);const glowTexture=new T.CanvasTexture(glowCanvas);
    for(const rear of this.brakeLamps){const halo=new T.Sprite(new T.SpriteMaterial({map:glowTexture,color:'#ff4935',transparent:true,depthWrite:false,opacity:0}));halo.name='brake-halo';halo.position.copy(rear.position);halo.position.z-=.08;halo.scale.set(1.6,1.6,1);this.vehicle.add(halo);this.brakeHalos.push(halo);}
    this.resetPosition();if(this.selection.stage==='nyc'&&this.mode==='garage')this.vehicle.position.copy(this.atmosphere.layout.center);
    void this.prepareGhost();
    this.modelPending=Promise.all([this.installVehicle(this.selected,this.visualGeneration,this.vehicle),this.installSpecialProps(this.visualGeneration)]).then(()=>{});
  }
  private async installSpecialProps(generation:number){
    const stage=this.selection.stage;if(stage!=='neon'&&stage!=='mx')return;
    try{const props=await loadSpecialProps(stage);if(this.disposed||generation!==this.visualGeneration){releaseVisual(props);return;}
      const old=this.root.getObjectByName('special-service-props');if(old){old.removeFromParent();releaseVisual(old);}
      props.name='special-service-props';props.position.copy(this.atmosphere.layout.center).add(new T.Vector3(10,0,0).applyAxisAngle(new T.Vector3(0,1,0),this.atmosphere.layout.angle));props.rotation.y=this.atmosphere.layout.angle;this.root.add(props);
    }catch{/* The procedural service area is the offline fallback. */}
  }
  private async installVehicle(index:number,generation:number,fallback:T.Group){
    try{const model=await loadVehicle(index);if(this.disposed||generation!==this.visualGeneration||this.vehicle!==fallback){releaseVisual(model);return;}
      // Never change visible models halfway through a timed attempt.
      if(this.mode!=='garage'){releaseVisual(model);return;}
      this.clearGhost();this.rivals.clear();const visual=new VehicleVisual(model).bind();
      // Keep the existing effects and light positions in the unchanged gameplay coordinate system.
      const keep=fallback.children.filter(o=>o instanceof T.Light||o.name==='car-mud'||o.name==='car-snow'||o.name==='brake-halo'||fallback.children.some(l=>l instanceof T.SpotLight&&l.target===o));
      for(const o of keep){o.removeFromParent();model.add(o);}
      visual.fitCoatings();model.position.copy(fallback.position);model.quaternion.copy(fallback.quaternion);this.root.remove(fallback);releaseVisual(fallback);this.vehicle=model;this.root.add(model);this.visual=visual;this.host.dataset.visualModel=String(index);this.brakeLamps=visual.rear;this.wheels=[];
      const maps=clayMaps();textureClay(model,maps);void this.prepareGhost();
    }catch{/* Existing procedural model remains fully playable. */}
  }
  clearGhost() {
    this.ghostGeneration++;this.ghostAbort?.abort();this.ghostAbort=null;
    if(this.ghostCar){this.root.remove(this.ghostCar);this.release(this.ghostCar);this.ghostCar=null;}
    this.ghostReplay=null;
  }
  toggleGhost(){this.ghostVisible=!this.ghostVisible;this.callbacks.ghostVisibility?.(this.ghostVisible);}
  setGhost(source:GhostSource){
    this.cancelPreparation();this.ghostSource=source;this.ghostVisible=true;this.callbacks.ghostVisibility?.(true);
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
          const query=new URLSearchParams({stage:this.selection.stage,weather:this.selection.weather,reverse:String(this.selection.reverse),timeOfDay:timeOfDay(this.selection),...(isCircuit(this.selection)?{laps:String(lapCount(this.selection)),circuitVersion:"2"}:{}),track:String(this.selection.track??1),car:String(this.selected)});
          const response=await fetch(`/api/rally/ghost?${query}`,{signal:this.ghostAbort.signal});
          if(!response.ok)throw new Error("unavailable");const data=await response.json();replay=data.replay;label=data.name?`Leader: ${data.name}`:"Leader";
        }finally{clearTimeout(timeout);}
      }
      if(generation!==this.ghostGeneration || this.disposed || (this.mode!=="garage" && this.mode!=="finished"))return;
      if(!matchingReplay(replay,this.selection,this.selected)){this.callbacks.ghost?.("Leader’s ghost unavailable");return;}
      this.ghostReplay=replay;
      this.ghostCar=cloneGhost(this.vehicle,"#b6f7ed",.3);
      this.ghostCar.visible=false;this.root.add(this.ghostCar);this.callbacks.ghost?.(label);
    }catch{if(generation===this.ghostGeneration)this.callbacks.ghost?.("Ghost unavailable · racing still works");}
  }
  private replaySample(time:number){const p=this.vehicle.position,s=[time,Number(p.x.toFixed(2)),Number(p.z.toFixed(2)),Number(this.angle.toFixed(4))];if(this.selected>=9)s.push(Number(p.y.toFixed(3)),Number(this.vehicle.rotation.x.toFixed(4)),Number(this.vehicle.rotation.z.toFixed(4)));return s;}
  completeRun(){
    if(this.mode!=="race")return;
    if(this.time>600)this.markPractice("time-limit");
    if((this.trace.at(-1)?.[0] ?? -1)>=this.time){this.trace.pop();this.replaySamples.pop();}
    this.trace.push([this.time,this.vehicle.position.x,this.vehicle.position.z]);
    this.replaySamples.push(this.replaySample(this.time));
    const replay:Replay|undefined=this.cleanRun && this.time<=600 && this.replaySamples.length<=2600 ? {version:this.selected>=9?2:1,selection:{...this.selection},car:this.selected,time:this.time,samples:this.replaySamples}:undefined;
    this.resultReplay={version:this.selected>=9?2:1,selection:{...this.selection},car:this.selected,time:this.time,samples:this.replaySamples.map(s=>[...s])};this.replayClock=0;
    const personalBest=this.cleanRun && (!this.best || this.time < this.best);
    this.audio?.finishResult(this.cleanRun,Boolean(personalBest));
    if (personalBest) {
      this.best=this.time;
      try {
        localStorage.setItem(`pocket-rally-best-${boardKey(this.selection)}-${this.selected}`,String(this.best));
        if(replay)localStorage.setItem(replayKey(this.selection,this.selected),JSON.stringify(replay));
      }catch{}
      this.callbacks.best(this.best);
    }
    if(this.live)this.onLiveFinish?.(this.time,this.trace,!this.cleanRun);
    this.callbacks.finish?.(this.time,this.cleanRun ? this.trace : [],replay,{eligible:this.cleanRun,reasons:[...this.reasons]});
    this.arrival=0;this.arrivalFrom.copy(this.vehicle.position);this.arrivalAngle=this.angle;
    this.velocity.set(0,0,0);this.setMode("celebrating");
    if(this.selection.stage==='kart'&&this.atmosphere.reduced)this.skipCelebration();
  }
  skipCelebration(){
    if(this.mode!=="celebrating")return;
    this.vehicle.position.copy(this.atmosphere.layout.center);this.vehicle.rotation.set(0,this.atmosphere.layout.angle,0);
    this.velocity.set(0,0,0);this.atmosphere.celebrate();this.setMode("finished");
  }
  setMode(mode: Mode) {
    if(!(this.mode==="countdown"&&mode==="race")){this.keys.clear();this.touchSteer=0;this.touchHeld=false;this.touchActive=false;}this.haptics.stop();
    if(mode!=="race")this.showSubtitle("");
    if(mode==="race"&&this.mode==="paused")this.pace?.resync(this.paceDistance());
    this.mode = mode;
    this.audio?.setMode(mode);
    this.callbacks.mode(mode);
    if(mode==="finished")void this.prepareGhost();
  }
  markPractice(reason:RunReason){
    this.cleanRun=false;
    if(!this.reasons.includes(reason)){this.reasons.push(reason);this.callbacks.practice?.([...this.reasons]);}
  }
  toggleReplay(){this.replayEnabled=!this.replayEnabled;if(!this.replayEnabled){this.vehicle.position.copy(this.atmosphere.layout.center);this.vehicle.rotation.set(0,this.atmosphere.layout.angle,0);}}
  clearFeedback(){this.plume?.reset();this.fountains?.reset();this.resultReplay=null;this.replayClock=0;this.surfaceEffects?.reset();if(this.mud)(this.mud.material as T.MeshStandardMaterial).opacity=0;if(this.snow)(this.snow.material as T.MeshStandardMaterial).opacity=0;this.checkpointEffects?.reset();this.splitReference=[];this.notifications.clear();this.callbacks.checkpoints?.([]);this.reasons=[];this.callbacks.practice?.([]);}
  resetPosition() {
    this.surfaceEffects?.drag.reset();
    if(this.mode === "race"){this.markPractice('car-recovered');this.time+=1.5;this.recoveryPenalty+=1.5;this.callbacks.pad(`RECOVER +1.50s · Total penalty +${this.recoveryPenalty.toFixed(2)}s · Practice run`);}
    const idx = this.checkpoint ? this.checkpoints[this.checkpoint - 1] : 0;
    const p = this.points[idx],
      next = this.points[Math.min(idx + 3, 650)];
    this.vehicle.position.copy(p);this.vehicle.position.y=rampHeight(idx,this.ramps)+(this.selected===9?.85:.08);
    this.angle = Math.atan2(next.x - p.x, next.z - p.z);
    this.vehicle.rotation.set(0,this.angle,0,'XYZ');
    this.velocity.set(0, 0, 0);
    this.rpm = 950;
    this.limited = false;
    this.audio?.stopVoice();this.showSubtitle("");this.pace?.resync(this.paceDistance());
  }
  uiCue(kind:"select"|"start"|"restart"="select"){if(!this.muted)this.audio?.cue(kind);}
  start(fromRoom=false) {
    if(this.roomJoined&&!fromRoom)return;
    this.uiCue(this.mode==="garage"?"start":"restart");
    this.setMode("countdown");
    this.clearFeedback();
    this.pace=new PaceScheduler(paceNotes(this.selection));this.routeDistances=[0];for(let i=1;i<this.points.length;i++)this.routeDistances.push(this.routeDistances[i-1]+this.points[i].distanceTo(this.points[i-1]));
    this.checkpoint = 0;
    this.time = 0;this.recoveryPenalty=0;this.lap=1;this.lapTimes=[];this.circuitFinishArmed=false;
    this.countdown = this.selection.stage==='nyc'?6:3;
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
    this.miniature.set(this.miniature.graphics);
    if(this.preparation)this.cancelPreparation();
    this.clearFeedback();
    this.atmosphere.reset();
    this.setMode("garage");
    if(!this.visual)this.modelPending=Promise.all([this.installVehicle(this.selected,this.visualGeneration,this.vehicle),this.installSpecialProps(this.visualGeneration)]).then(()=>{});
    void this.prepareGhost();
    this.checkpoint = 0;
    this.resetPosition();
    if(this.selection.stage==='nyc')this.vehicle.position.copy(this.atmosphere.layout.center);
    void this.ensureAudio().catch(() => {
      this.muted = true;
      this.callbacks.audio?.(true);
    });
  }
  pause() {
    if(this.live){this.liveMenu=!this.liveMenu;this.onLiveMenu?.(this.liveMenu);return;}
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
    try{localStorage.setItem("rally-muted",String(muted));}catch{}
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
    this.audio.setEnvironment(this.selection.stage);
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
    this.viewport={width:w,height:h};this.projectionKey="";
    this.renderer.setSize(w, h);this.miniature?.resize(w,h);
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
    if(document.hidden){this.last=now;return;}
    const interval=(this.mode==='garage'||this.mode==='paused')?1000/30:1000/60;
    const nextFrame=this.miniature.graphics==='high'?now:pacedFrame(now,this.renderedAt,interval);
    if(nextFrame===null)return;this.renderedAt=nextFrame;
    this.nearestCache.clear();this.metrics.cpuStart();
    const frameDt=(now-(this.last||now))/1000;
    const dt = Math.min(frameDt, 0.04);
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
    steer=T.MathUtils.clamp(steer*this.controls.sensitivity,-1,1);
    this.haptics.update(now,dt,this.controls.haptics,this.mode==="race",this.velocity.length(),steer,pad??undefined,this.touchActive);
    if (this.audio) {
      // Publish telemetry only; the audio mixer runs independently at 20 Hz.
      this.audio.crowdDistance=this.atmosphere.crowdDistance(this.vehicle.position);
      this.audio.drive.speed = this.velocity.length();
      this.audio.drive.throttle = throttle;
      this.audio.drive.brake = brake;
      this.audio.drive.corner = Math.abs(steer);
      this.audio.drive.rpm = this.rpm;
      this.audio.drive.limited = this.limited;
      this.audio.drive.sliding =
        hand || (Math.abs(steer) > 0.6 && this.velocity.length() > 8);
    }
    if (this.mode === "countdown") {
      this.countdown = this.live?Math.max(0,(this.liveStartAt-Date.now())/1000):this.countdown-dt;
      if(this.selection.stage==='nyc'&&this.countdown>3){const u=T.MathUtils.clamp((this.countdown-3)/3,0,1);this.vehicle.position.copy(this.atmosphere.layout.approach.getPointAt(u));const d=this.atmosphere.layout.approach.getTangentAt(u);this.vehicle.rotation.y=Math.atan2(-d.x,-d.z);}else if(this.selection.stage==='nyc'){this.vehicle.position.copy(this.points[0]);this.vehicle.rotation.y=this.angle;}

      if (this.countdown <= 0) this.setMode("race");
    }
    if(this.live&&this.liveMenu){throttle=0;steer=0;brake=1;hand=false;}
    if (this.mode === "race") {
      this.movementFrom.copy(this.vehicle.position);
      this.time = this.live?Math.max(this.time,(Date.now()-this.liveStartAt)/1000+this.recoveryPenalty):this.time+dt;
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
      const motor = engine(speed, throttle, this.rpm, this.limited, dt, c.shape === "kart");
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
      const acceleration = (this.limited ? 0 : throttle * c.power) - brake * (speed > 1 ? (c.shape === "kart" ? 28 : 25) : 8);
      this.velocity.addScaledVector(forward, acceleration * dt);
      if(this.selected!==9)this.velocity.multiplyScalar(this.surfaceEffects.drag.step(dt,this.vehicle.position,this.surfaceEffects.puddles));
      this.velocity.multiplyScalar(
        Math.exp(-tuning.drag * dt),
      );
      const maxSpeed=c.shape === "kart" ? 28 : 25;
      if (this.velocity.length() > maxSpeed) this.velocity.setLength(maxSpeed);
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
      if(this.selected>=9){const profile=elevationPose(this.routeProgress(this.vehicle.position),this.velocity.length(),this.atmosphere.reduced,this.ramps),shoulder=T.MathUtils.clamp((7.8-this.nearest(this.vehicle.position.x,this.vehicle.position.z).distance)/2.2,0,1);this.vehicle.position.y=this.playbackHeight(this.vehicle.position.x,this.vehicle.position.z,profile.y*shoulder+.08)+(this.selected===9?.85:0);this.vehicle.rotation.x=profile.pitch;this.vehicle.rotation.z=profile.roll+steer*Math.min(.28,this.velocity.length()*.012);}
      if(this.time >= this.traceAt && this.time<=600 && this.trace.length<2599) {
        this.trace.push([Number(this.time.toFixed(3)), Number(this.vehicle.position.x.toFixed(2)), Number(this.vehicle.position.z.toFixed(2))]);
        this.replaySamples.push(this.replaySample(Number(this.time.toFixed(3))));
        this.traceAt=this.time+.25;
      }
      if(this.selection.circuitVersion===2&&this.vehicle.position.distanceTo(this.points[0])>14)this.circuitFinishArmed=true;
      const passage=advanceCheckpoints(this.points,this.checkpoints,this.checkpoint,this.movementFrom,this.vehicle.position,this.time,this.selection.circuitVersion===2,this.circuitFinishArmed);
      this.checkpoint=passage.cursor;
      if(passage.events.length){
        if(passage.events.some(e=>e.outcome==="missed"))this.markPractice("missed-checkpoint");
        this.checkpointEffects.emit(passage.events);
        for(const event of passage.events){const reference=this.splitReference[(this.lap-1)*18+event.checkpoint-1];if(this.cleanRun&&event.outcome==='accepted'&&reference!==undefined)event.delta=event.time-reference;}
        this.notifications.push(passage.events);this.callbacks.checkpoints?.([...this.notifications.items]);
      }
      if(passage.finished){
        this.lapTimes.push(this.time-this.lapTimes.reduce((a,b)=>a+b,0));
        if(this.lap<lapCount(this.selection)){this.lap++;this.checkpoint=0;this.circuitFinishArmed=false;this.checkpointEffects.reset();this.fountains.reset();this.pace=new PaceScheduler(paceNotes(this.selection));}
        else this.completeRun();
      }

    }
    if(this.mode==="celebrating"){
      this.arrival+=dt;const t=Math.min(1,this.arrival/(this.selection.stage==='kart'?6:3)),ease=this.selection.stage==='kart'?t*t*(3-2*t):1-Math.pow(1-t,3);
      const {finish,approach}=this.atmosphere.layout;
      const lead=this.arrivalFrom.distanceTo(finish),length=approach.getLength(),travel=ease*(lead+length);
      const u=Math.max(0,Math.min(1,(travel-lead)/length));
      if(travel<lead)this.vehicle.position.lerpVectors(this.arrivalFrom,finish,travel/lead);
      else this.vehicle.position.copy(approach.getPointAt(u));
      const tangent=travel<lead?finish.clone().sub(this.arrivalFrom):approach.getTangentAt(u);
      this.vehicle.rotation.set(this.selection.stage==='kart'?T.MathUtils.lerp(this.vehicle.rotation.x,-Math.atan2(tangent.y,Math.hypot(tangent.x,tangent.z)),1-Math.exp(-dt*10)):0,headingBetween(this.arrivalAngle,Math.atan2(tangent.x,tangent.z),Math.min(1,t*6)),0,this.selection.stage==='kart'?'YXZ':'XYZ');
      if(t===1){this.atmosphere.celebrate();this.setMode("finished");}
    }
    if(this.mode==="finished"&&this.replayEnabled&&this.resultReplay){
      this.replayClock=(this.replayClock+dt)%this.resultReplay.time;
      const pose=replayPose(this.resultReplay,this.replayClock);
      if(pose){const profile=elevationPose(this.routeProgress(pose),pose.speed,this.atmosphere.reduced,this.ramps);const shoulder=T.MathUtils.clamp((8-this.nearest(pose.x,pose.z).distance)/2.4,0,1);this.vehicle.position.set(pose.x,this.playbackHeight(pose.x,pose.z,profile.y*shoulder+.08)+(this.selected===9?.85:0),pose.z);if(pose.y!==undefined)this.vehicle.position.y=this.playbackHeight(pose.x,pose.z,pose.y);this.vehicle.rotation.set(pose.pitch??profile.pitch,pose.angle,pose.roll??profile.roll);}
    }
    if(this.mode==="race"&&this.selected<9){const profile=elevationPose(this.routeProgress(this.vehicle.position),this.velocity.length(),this.atmosphere.reduced,this.ramps),shoulder=T.MathUtils.clamp((7.8-this.nearest(this.vehicle.position.x,this.vehicle.position.z).distance)/2.2,0,1);this.vehicle.position.y=this.playbackHeight(this.vehicle.position.x,this.vehicle.position.z,profile.y*shoulder+.08)+(this.selected===9?.85:0);this.vehicle.rotation.x=profile.pitch;this.vehicle.rotation.z+=profile.roll;}
    if(this.ghostCar){
      const pose=this.ghostReplay && (this.mode==="race"||this.mode==="paused")?replayPose(this.ghostReplay,this.time):null;
      this.ghostCar.visible=Boolean(pose && this.ghostVisible);
      if(pose){const profile=elevationPose(this.routeProgress(pose),pose.speed,this.atmosphere.reduced,this.ramps);const shoulder=T.MathUtils.clamp((8-this.nearest(pose.x,pose.z).distance)/2.4,0,1);this.ghostCar.position.set(pose.x,this.playbackHeight(pose.x,pose.z,profile.y*shoulder+.08)+(this.selected===9?.85:0),pose.z);if(pose.y!==undefined)this.ghostCar.position.y=this.playbackHeight(pose.x,pose.z,pose.y);this.ghostCar.rotation.set(pose.pitch??profile.pitch,pose.angle,pose.roll??profile.roll);}
    }
    if(this.mode==="race"&&this.codriverEnabled){
      const note=this.pace?.update(this.paceDistance(),this.velocity.length(),this.time);
      if(note){this.showSubtitle(note.text);this.subtitleUntil=this.time+Math.max(2.5,note.clips.length*1.7);if(!this.muted){this.audio?.speak(note.clips);if(this.audio)this.metrics.voice(this.audio.diagnostics);}}
      if(this.time>=this.subtitleUntil)this.showSubtitle("");
    }
    if(this.notifications.tick(dt,this.mode==="paused"))this.callbacks.checkpoints?.([...this.notifications.items]);
    this.scenery.update(this.mode==="paused"?0:dt,this.atmosphere.reduced);
    this.surfaceEffects.update(this.mode==="paused"?0:dt,this.vehicle.position,this.angle,this.velocity.length(),this.mode==="race"&&this.selected!==9);
    if(this.mud)(this.mud.material as T.MeshStandardMaterial).opacity=this.surfaceEffects.mud*.95;
    if(this.snow)(this.snow.material as T.MeshStandardMaterial).opacity=this.surfaceEffects.snow*.95;
    this.atmosphere.update(this.mode==="paused"?0:dt,now/1000,this.vehicle.position,this.velocity.length(),this.mode==="race");
    this.checkpointEffects.update(this.mode==="paused"?0:dt);
    if(this.mode!=="paused")this.updateWeather(dt);
    const effectDt=this.mode==='paused'?0:dt;
    const spray=this.selection.weather==='rain'||this.selection.weather==='snow',dirt=!['kart','nyc','neon','mountain'].includes(this.selection.stage),emitting=this.mode==='race'&&this.selected!==9&&(dirt||spray);
    this.plume.update(effectDt,this.vehicle.position,this.angle,this.velocity.length(),emitting?(hand||Math.abs(steer)>.5?1:.8):0,this.driverCamera.enabled);
    this.fountains.update(effectDt,this.routeProgress(this.vehicle.position),this.mode==='race',this.atmosphere.reduced);
    const braking=this.mode==='race'&&brake>.05;
    for(const lamp of this.brakeLamps)(lamp.material as T.MeshStandardMaterial).emissiveIntensity=braking?3:timeOfDay(this.selection)==='midday'?.15:.65;
    for(const halo of this.brakeHalos){halo.visible=braking&&!this.driverCamera.enabled;(halo.material as T.SpriteMaterial).opacity=braking?(dirt||spray||this.selection.weather==='fog'?.3:.14):0;}
    const target = this.vehicle.position.clone();
    let desired: T.Vector3;
    if (this.mode === "garage") {
      this.vehicle.rotation.y = now * 0.00017;
      target.y = 0.5;
      if(this.host.clientWidth>this.host.clientHeight)target.add(new T.Vector3(18,0,-14).normalize().multiplyScalar(5));else target.y-=4;
      desired = target.clone().add(new T.Vector3(14, 13, 18));
      this.camera.zoom = 2.2;
    } else if(this.mode==="finished"&&this.replayEnabled&&this.resultReplay){
      target.add(new T.Vector3(8,0,-8));desired=target.clone().add(new T.Vector3(24,22,30));this.camera.zoom=1.1;
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
        progress: ((this.lap-1)+this.checkpoint / this.checkpoints.length)/lapCount(this.selection),
        lapProgress:this.mode==='countdown'?0:this.mode==='celebrating'||this.mode==='finished'?1:kartLapProgress(this.routeProgress(this.vehicle.position),this.checkpoint,this.checkpoints),
        lap:this.lap,lastLap:this.lapTimes.at(-1)??0,
        count: Math.ceil(this.countdown),
      });
    }
    const activeCamera=this.driverCamera.update(this.mode==='paused'?0:dt,this.vehicle,this.angle,steer,this.camera,this.mode==='race'||this.mode==='countdown'||this.mode==='paused',this.atmosphere.reduced,this.viewport.width,this.viewport.height,(this.selected===8||this.selected===10),this.velocity.length()*4,this.rpm,this.limited,timeOfDay(this.selection)==='night',cars[this.selected].color);
    const transition=this.driverCamera.blend;this.renderer.domElement.style.filter=!this.atmosphere.reduced&&transition>0&&transition<1?`blur(${Math.sin(transition*Math.PI)*2}px)`:'none';
    if(this.live){if(this.ghostCar)this.ghostCar.visible=false;this.rivals.update(now,(x,z,speed)=>{const nearest=this.nearest(x,z),shoulder=T.MathUtils.clamp((8-nearest.distance)/2.4,0,1);return this.playbackHeight(x,z,elevationPose(this.routeProgress({x,z}),speed,true,this.ramps).y*shoulder+.08)+(this.selected===9?.85:0);});if(this.mode==='race'&&now-this.sentPose>=100){this.sentPose=now;this.onLivePose?.({...(this.selected>=9?{y:this.vehicle.position.y,pitch:this.vehicle.rotation.x,roll:this.vehicle.rotation.z}:{}),x:this.vehicle.position.x,z:this.vehicle.position.z,heading:this.angle,speed:this.velocity.length(),progress:((this.lap-1)+this.checkpoint/18)/lapCount(this.selection)},!this.cleanRun);}}
    this.visual?.update(this.mode==='paused'?0:dt,(this.velocity.x*Math.sin(this.angle)+this.velocity.z*Math.cos(this.angle)),steer,braking,timeOfDay(this.selection)!=='midday');
    this.metrics.begin();this.miniature.render(activeCamera,frameDt,this.mode==='race');this.metrics.end(frameDt,this.mode==='race');
  };
  resizeCamera() {
    const span = this.mode === "garage" ? 17 : 31,
      ratio = this.viewport.width / Math.max(1, this.viewport.height);
    const key=span+","+ratio+","+this.camera.zoom;if(key===this.projectionKey)return;this.projectionKey=key;
    this.camera.left = -span * ratio;
    this.camera.right = span * ratio;
    this.camera.top = span;
    this.camera.bottom = -span;
    this.camera.updateProjectionMatrix();
  }
  dispose() {
    this.cancelPreparation();
    this.rivals.clear();this.driverCamera.dispose();
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
    this.metrics.dispose();this.miniature.dispose();this.environmentMap?.dispose();this.renderer.dispose();
    this.renderer.domElement.remove();
    this.audio?.dispose();
  }
}
