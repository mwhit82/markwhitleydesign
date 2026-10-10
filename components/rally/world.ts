import * as T from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { cars, type Mode } from "./data";
import { RallyAudio } from "./audio";
import { handling, engine } from "./handling";
import { initialStage, stageDefinition, stagePoints, checkpointIndices, boardKey, surfaceGrip, type StageSelection } from "./stages";
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
  finish?: (time: number, trace: number[][]) => void;
};
export class RallyWorld {
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
  precipitation: T.Points | null = null;
  trace: number[][] = [];
  traceAt = 0;
  cleanRun = true;
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
    this.scene.add(new T.HemisphereLight("#fff0d1", "#597968", 2.6));
    const sun = new T.DirectionalLight("#fff0d3", 3.2);
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
    const stage = stageDefinition(this.selection);
    const weather = this.selection.weather;
    this.renderer.setClearColor(stage.sky);
    this.scene.fog = new T.Fog(stage.sky, weather === "fog" ? 28 : weather === "haze" ? 38 : 95, weather === "fog" ? 100 : weather === "haze" ? 115 : 240);
    this.box(170, 3, 160, stage.ground, 0, -1.8, 0);
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
    paint.strokeStyle = stage.edge;
    paint.lineWidth = 11.8;
    paint.stroke();
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
        alphaTest: 0.5,
        roughness: weather === "rain" ? 0.35 : 1,
      }),
    );
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.04;
    road.receiveShadow = true;
    this.root.add(road);
    let seed = 42;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 170; i++) {
      const x = (random() - 0.5) * 158,
        z = (random() - 0.5) * 148;
      if (this.nearest(x, z).distance < 9) continue;
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
      if (this.nearest(x, z).distance < 7) continue;
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
        this.box(0.8, 0.6, 0.12, i === 17 ? "#e4bb48" : "#d65c3f", x, 2.3, z);
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
    this.box(8, 2, 5, "#e6dfc8", -36, 1, 57);
    this.box(10, 0.5, 7, "#c95137", -36, 2.3, 57);
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
      const geometry = new T.BufferGeometry();
      const positions = new Float32Array(180 * 3);
      for(let i=0;i<180;i++) positions.set([(random()-.5)*170,random()*26,(random()-.5)*160],i*3);
      geometry.setAttribute("position",new T.BufferAttribute(positions,3));
      this.precipitation = new T.Points(geometry,new T.PointsMaterial({color:weather==="snow"?"#ffffff":weather==="rain"?"#b9d7e7":"#e6c38c",size:weather==="snow"?.24:.13,transparent:true,opacity:.55,depthWrite:false}));
      this.root.add(this.precipitation);
    }
  }
  updateWeather(dt: number) {
    if (!this.precipitation) return;
    const p = this.precipitation.geometry.attributes.position;
    const snow = this.selection.weather === "snow";
    const wind = this.selection.weather === "wind" || this.selection.weather === "haze";
    for (let i=0;i<p.count;i++) {
      p.setY(i, (p.getY(i) - dt * (snow ? 3 : wind ? 1 : 24) + 26) % 26);
      p.setX(i, (p.getX(i) + dt * (wind ? 12 : snow ? 1.5 : 4) + 85) % 170 - 85);
    }
    p.needsUpdate=true;
  }
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
      if (obj instanceof T.Mesh || obj instanceof T.Points) {
        obj.geometry.dispose();
        const materials = Array.isArray(obj.material)
          ? obj.material
          : [obj.material];
        materials.forEach((m) => {
          if (m instanceof T.MeshStandardMaterial) m.map?.dispose();
          m.dispose();
        });
      }
    });
  }
  choose(index: number) {
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
      this.box(0.55, 0.25, 0.08, "#fff1b8", x, 1.05, 2.08, this.vehicle);
      this.box(0.5, 0.2, 0.09, "#b93625", x, 1.05, -2.08, this.vehicle);
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
    this.callbacks.best(this.best);
    this.resetPosition();
  }
  setMode(mode: Mode) {
    this.keys.clear();
    this.mode = mode;
    this.audio?.setMode(mode);
    this.callbacks.mode(mode);
  }
  resetPosition() {
    if(this.mode === "race") this.cleanRun=false;
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
  start() {
    this.checkpoint = 0;
    this.time = 0;
    this.countdown = 3;
    this.cleanRun = true;
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
    this.setMode("garage");
    this.checkpoint = 0;
    this.resetPosition();
    void this.ensureAudio().catch(() => {
      this.muted = true;
      this.callbacks.audio?.(true);
    });
  }
  pause() {
    if (this.mode === "paused") {
      this.setMode("race");
      void this.ensureAudio().catch(() => {
        this.muted = true;
        this.callbacks.audio?.(true);
      });
    } else if (this.mode === "race" || this.mode === "countdown")
      this.setMode("paused");
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
      this.mode === "paused" ||
      this.mode === "finished"
    )
      return;
    this.prepareAudio();
    await this.audio?.enable();
  }
  keydown = (event: KeyboardEvent) => {
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
      this.callbacks.pad(pad ? "Controller connected" : "Keyboard ready");
    }
    if (pad) {
      const buttons = pad.buttons.map((b) => b.pressed),
        edge = (i: number) => buttons[i] && !this.previousButtons[i];
      steer = Math.abs(pad.axes[0] || 0) > 0.12 ? pad.axes[0] : 0;
      throttle = pad.buttons[7]?.value || 0;
      brake = pad.buttons[6]?.value || 0;
      hand = buttons[0];
      if (this.mode === "garage") {
        if (edge(14) || edge(4)) this.choose(this.selected - 1);
        if (edge(15) || edge(5)) this.choose(this.selected + 1);
        if (edge(0)) this.start();
      } else {
        if (edge(9)) this.pause();
        if (edge(3) && this.mode === "race") this.resetPosition();
        if (this.mode === "finished" && edge(0)) this.start();
        if ((this.mode === "paused" || this.mode === "finished") && edge(1))
          this.garage();
      }
      this.previousButtons = buttons;
    } else this.previousButtons = [];
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) steer = -1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) steer = 1;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) throttle = 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) brake = 1;
    hand = hand || this.keys.has("Space");
    if (this.audio) {
      // Publish telemetry only; the audio mixer runs independently at 20 Hz.
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
      if(this.time >= this.traceAt) {
        this.trace.push([Number(this.time.toFixed(3)), Number(this.vehicle.position.x.toFixed(2)), Number(this.vehicle.position.z.toFixed(2))]);
        this.traceAt=this.time+.25;
      }
      const next = this.checkpoints[this.checkpoint];
      if (
        next !== undefined &&
        this.vehicle.position.distanceTo(this.points[next]) < 7
      ) {
        this.checkpoint++;
        if (this.checkpoint === this.checkpoints.length) {
          if (!this.best || this.time < this.best) {
            this.best = this.time;
            try {
              localStorage.setItem(
                `pocket-rally-best-${boardKey(this.selection)}-${this.selected}`,
                String(this.best),
              );
            } catch {}
            this.callbacks.best(this.best);
          }
          this.trace.push([this.time,this.vehicle.position.x,this.vehicle.position.z]);
          this.callbacks.finish?.(this.time,this.cleanRun ? this.trace : []);
          this.setMode("finished");
        }
      }
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
    if(this.mode === "race" || this.mode === "garage") this.updateWeather(dt);
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
      desired = target.clone().add(new T.Vector3(14, 13, 18));
      this.camera.zoom = 2.2;
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
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    window.removeEventListener("keydown", this.keydown);
    window.removeEventListener("keyup", this.keyup);
    window.removeEventListener("blur", this.blur);
    document.removeEventListener("visibilitychange", this.visibility);
    this.release(this.root);
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.audio?.dispose();
  }
}
