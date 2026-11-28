import * as THREE from "three";
import { Board } from "./life";
import { maxVoxels, species } from "./species";
import { scene as palette } from "./data";
import type { Settings, Stats } from "./types";

const TILT = (45 * Math.PI) / 180;
const U = 1 / 6; // One voxel is a sixth of a cell.
const BLADES = 4;
// Cells are stretched in depth so they look square on screen after the camera tilt.
const DEPTH = 1 / Math.sin(TILT);

/** Cheap deterministic hash in 0..1. */
function hash(a: number, b: number) {
  let h =
    Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^
    Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}
const ease = (t: number) => 1 - (1 - t) ** 3;
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

/** Linear RGB for every voxel of every species, so the frame loop never allocates. */
const voxelRGB = species.map((s) => {
  const out = new Float32Array(s.voxels.length * 3);
  const c = new THREE.Color();
  s.voxels.forEach((v, i) => {
    c.setHex(v[3]);
    out.set([c.r, c.g, c.b], i * 3);
  });
  return out;
});
const voxelTop = species.map((s) => Math.max(...s.voxels.map((v) => v[1])) + 1);

type Options = { onStats: (s: Stats) => void };

export class GardenScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera();
  private hemi = new THREE.HemisphereLight();
  private sun = new THREE.DirectionalLight();
  private box = new THREE.BoxGeometry(1, 1, 1);
  private material = new THREE.MeshLambertMaterial();
  private tiles?: THREE.InstancedMesh;
  private blades?: THREE.InstancedMesh;
  private plants?: THREE.InstancedMesh;
  private raycaster = new THREE.Raycaster();
  private ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private board = new Board(1, 1, species.length);
  private bornAt = new Float32Array(1);
  private diedAt = new Float32Array(1);
  private wilt = new THREE.Color(palette.wilt);
  private frame = 0;
  private last = 0;
  private acc = 0;
  private width = 0;
  private height = 0;
  private generation = 0;
  private history: number[] = [];
  private stalled = 0;
  private settings: Settings;
  private running = true;
  private reduced = false;

  constructor(
    private canvas: HTMLCanvasElement,
    settings: Settings,
    private opts: Options,
  ) {
    this.settings = settings;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.add(this.hemi, this.sun, this.sun.target);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.02;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.setTheme(true);
    this.loop = this.loop.bind(this);
    this.frame = requestAnimationFrame(this.loop);
  }

  setTheme(dark: boolean) {
    const l = dark ? palette.light.dark : palette.light.light;
    this.hemi.color.setHex(l.sky);
    this.hemi.groundColor.setHex(l.ground);
    this.hemi.intensity = l.hemiI;
    this.sun.color.setHex(l.sun);
    this.sun.intensity = l.sunI;
    this.scene.background = new THREE.Color(l.ground);
  }

  setSettings(s: Settings) {
    const resized = s.cellSize !== this.settings.cellSize;
    this.settings = s;
    if (resized) this.resize(this.width, this.height);
  }

  setRunning(on: boolean) {
    this.running = on;
    this.acc = 0;
  }

  resize(width: number, height: number) {
    if (!width || !height) return;
    this.width = width;
    this.height = height;
    const ppu = this.settings.cellSize;
    const cols = Math.ceil(width / ppu) + 1;
    const rows = Math.ceil(height / ppu) + 3;
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, cols * rows > 2500 ? 1.5 : 2),
    );
    this.renderer.setSize(width, height, false);
    const cam = this.camera;
    Object.assign(cam, {
      left: -width / 2 / ppu,
      right: width / 2 / ppu,
      top: height / 2 / ppu,
      bottom: -height / 2 / ppu,
      near: 0.1,
      far: 400,
    });
    // Look slightly behind centre so tall plants on the back rows fill the top edge.
    const target = new THREE.Vector3(0, 0, -0.8);
    cam.position
      .copy(target)
      .add(
        new THREE.Vector3(0, Math.sin(TILT), Math.cos(TILT)).multiplyScalar(
          100,
        ),
      );
    cam.lookAt(target);
    cam.updateProjectionMatrix();
    if (cols !== this.board.cols || rows !== this.board.rows)
      this.rebuild(cols, rows);
  }

  private rebuild(cols: number, rows: number) {
    const old = this.board;
    const fresh = old.cols === 1;
    this.board = new Board(cols, rows, species.length);
    this.bornAt = new Float32Array(cols * rows).fill(-1e9);
    this.diedAt = new Float32Array(cols * rows).fill(-1e9);
    if (!fresh)
      for (let r = 0; r < Math.min(rows, old.rows); r++)
        for (let c = 0; c < Math.min(cols, old.cols); c++) {
          this.board.alive[r * cols + c] = old.alive[r * old.cols + c];
          this.board.kind[r * cols + c] = old.kind[r * old.cols + c];
        }
    for (const m of [this.tiles, this.blades, this.plants]) {
      if (!m) continue;
      this.scene.remove(m);
      m.dispose();
    }
    const n = cols * rows;
    this.tiles = this.instanced(n, false, true);
    this.blades = this.instanced(n * BLADES, true, true);
    this.plants = this.instanced(n * Math.min(maxVoxels, 34), true, true);
    this.layoutGrass();
    const reach = Math.max(cols, rows) * 0.75 + 4;
    Object.assign(this.sun.shadow.camera, {
      left: -reach,
      right: reach,
      top: reach,
      bottom: -reach,
      near: 1,
      far: reach * 4,
    });
    this.sun.shadow.camera.updateProjectionMatrix();
    this.sun.position.set(-0.45, 1, 0.55).multiplyScalar(reach * 1.5);
    const size = matchMedia("(pointer: coarse)").matches ? 1024 : 2048;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    if (fresh) this.randomize();
    else this.report();
  }

  private instanced(count: number, cast: boolean, receive: boolean) {
    const m = new THREE.InstancedMesh(this.box, this.material, count);
    m.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(count * 3),
      3,
    );
    m.castShadow = cast;
    m.receiveShadow = receive;
    m.frustumCulled = false;
    this.scene.add(m);
    return m;
  }

  private center(i: number): [number, number] {
    const { cols, rows } = this.board;
    return [
      (i % cols) - cols / 2 + 0.5,
      (Math.floor(i / cols) - rows / 2 + 0.5) * DEPTH,
    ];
  }

  private layoutGrass() {
    const tiles = this.tiles!;
    const blades = this.blades!;
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    const n = this.board.cols * this.board.rows;
    for (let i = 0; i < n; i++) {
      const [x, z] = this.center(i);
      m.makeScale(0.98, 0.24, DEPTH - 0.02).setPosition(x, -0.12, z);
      tiles.setMatrixAt(i, m);
      c.setHex(
        palette.grass[Math.floor(hash(i, 1) * palette.grass.length)],
      ).multiplyScalar(0.94 + hash(i, 2) * 0.12);
      tiles.setColorAt(i, c);
      for (let b = 0; b < BLADES; b++) {
        const bx = Math.floor(hash(i, 10 + b) * 5) - 2;
        const bz = Math.floor(hash(i, 20 + b) * 5) - 2;
        const h = hash(i, 30 + b) < 0.35 ? 2 : 1;
        m.makeScale(U * 0.7, U * h, U * 0.7).setPosition(
          x + bx * U,
          (h * U) / 2,
          z + bz * U * DEPTH,
        );
        blades.setMatrixAt(i * BLADES + b, m);
        c.setHex(
          palette.blade[Math.floor(hash(i, 40 + b) * palette.blade.length)],
        );
        blades.setColorAt(i * BLADES + b, c);
      }
    }
    for (const mesh of [tiles, blades]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor!.needsUpdate = true;
    }
  }

  randomize() {
    this.board.randomize(this.settings.density / 100);
    const now = performance.now();
    // Sprout in a gentle wave instead of all at once.
    for (let i = 0; i < this.bornAt.length; i++) {
      this.bornAt[i] = now + (this.reduced ? 0 : hash(i, now) * 900);
      this.diedAt[i] = -1e9;
    }
    this.generation = 0;
    this.history = [];
    this.report();
  }

  clear() {
    const now = performance.now();
    this.board.alive.forEach((a, i) => a && (this.diedAt[i] = now));
    this.board.alive.fill(0);
    this.generation = 0;
    this.report();
  }

  step() {
    const now = performance.now();
    const { born, died } = this.board.step();
    for (const i of born) {
      this.bornAt[i] = now;
      this.diedAt[i] = -1e9;
    }
    for (const i of died) this.diedAt[i] = now;
    this.generation++;
    if (this.settings.reseed) this.keepGrowing(now);
    this.report();
  }

  private keepGrowing(now: number) {
    const sig = this.board.signature();
    const pop = this.board.population();
    const sparse = pop < this.board.alive.length * 0.06;
    this.stalled = this.history.includes(sig) || sparse ? this.stalled + 1 : 0;
    this.history = [sig, ...this.history].slice(0, 6);
    if (this.stalled < 3) return;
    const before = this.board.alive.slice();
    this.board.sprinkle(Math.max(2, Math.round(this.board.alive.length / 160)));
    this.board.alive.forEach((a, i) => {
      if (a && !before[i]) {
        this.bornAt[i] = now;
        this.diedAt[i] = -1e9;
      }
    });
    this.stalled = 0;
  }

  /** Returns the cell under a screen point, or -1. */
  cellAt(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.ray.intersectPlane(
      this.ground,
      new THREE.Vector3(),
    );
    if (!hit) return -1;
    const { cols, rows } = this.board;
    const c = Math.floor(hit.x + cols / 2);
    const r = Math.floor(hit.z / DEPTH + rows / 2);
    return c < 0 || r < 0 || c >= cols || r >= rows ? -1 : r * cols + c;
  }

  isAlive(i: number) {
    return this.board.alive[i] === 1;
  }

  /** Plants or removes one cell by hand. New plants copy a neighbouring species. */
  paint(i: number, alive: boolean) {
    if (i < 0 || this.isAlive(i) === alive) return;
    const now = performance.now();
    const b = this.board;
    if (alive) {
      const c = i % b.cols;
      const r = Math.floor(i / b.cols);
      let kind = Math.floor(Math.random() * species.length);
      for (let d = 0; d < 8; d++) {
        const j = b.index(
          c + [-1, 0, 1, -1, 1, -1, 0, 1][d],
          r + [-1, -1, -1, 0, 0, 1, 1, 1][d],
        );
        if (b.alive[j]) kind = b.kind[j];
      }
      b.alive[i] = 1;
      b.kind[i] = kind;
      this.bornAt[i] = now;
      this.diedAt[i] = -1e9;
    } else {
      b.alive[i] = 0;
      this.diedAt[i] = now;
    }
    this.report();
  }

  private report() {
    this.opts.onStats({
      generation: this.generation,
      population: this.board.population(),
    });
  }

  private loop(now: number) {
    this.frame = requestAnimationFrame(this.loop);
    const dt = Math.min(now - (this.last || now), 250);
    this.last = now;
    const interval = 1000 / this.settings.speed;
    if (this.running) {
      this.acc += dt;
      if (this.acc >= interval) {
        this.acc %= interval;
        this.step();
      }
    }
    this.drawPlants(now, Math.min(900, interval * 0.95));
    this.renderer.render(this.scene, this.camera);
  }

  private drawPlants(now: number, dur: number) {
    const mesh = this.plants;
    if (!mesh) return;
    const mat = mesh.instanceMatrix.array as Float32Array;
    const col = mesh.instanceColor!.array as Float32Array;
    const cap = mat.length / 16;
    const { alive, kind } = this.board;
    const t = now / 1000;
    const sway = this.reduced ? 0 : 1;
    const w = this.wilt;
    let n = 0;
    for (let i = 0; i < alive.length && n < cap; i++) {
      let grow = 1;
      let die = 0;
      if (alive[i])
        grow = this.reduced ? 1 : clamp01((now - this.bornAt[i]) / dur);
      else {
        const q = (now - this.diedAt[i]) / dur;
        if (q < 0 || q >= 1 || this.reduced) continue;
        die = q;
      }
      if (grow <= 0) continue;
      const k = kind[i];
      const vox = species[k].voxels;
      const rgb = voxelRGB[k];
      const top = voxelTop[k];
      const [cx, cz] = this.center(i);
      const rot = Math.floor(hash(i, 7) * 4);
      const shade = 0.9 + hash(i, 8) * 0.2;
      const phase = hash(i, 9) * 6.28;
      const sx = Math.sin(t * 1.3 + phase) * 0.03 * U * sway;
      const sz = Math.cos(t * 1.1 + phase) * 0.02 * U * sway;
      for (let v = 0; v < vox.length && n < cap; v++) {
        const [vx, vy, vz] = vox[v];
        const h = vy / top;
        let s: number;
        let drop = 0;
        let fade = 0;
        if (die > 0) {
          // Wilt: brown from the top down, then shrink and sink into the grass.
          const local = clamp01((die - (1 - h) * 0.45) / 0.55);
          fade = clamp01(local * 2.2);
          const shrink = clamp01(local * 1.6 - 0.6);
          s = 1 - ease(shrink);
          drop = shrink * (vy + 1) * U * 0.6;
        } else {
          // Grow: voxels appear from the ground up.
          s = ease(clamp01((grow - h * 0.55) / 0.45));
        }
        if (s <= 0.01) continue;
        let x = vx;
        let z = vz;
        if (rot === 1) [x, z] = [-vz, vx];
        else if (rot === 2) [x, z] = [-vx, -vz];
        else if (rot === 3) [x, z] = [vz, -vx];
        const size = U * s;
        const o = n * 16;
        mat.fill(0, o, o + 16);
        mat[o] = size;
        mat[o + 5] = size;
        mat[o + 10] = size;
        mat[o + 12] = cx + x * U + sx * vy;
        mat[o + 13] = (vy + 0.5) * U - drop;
        mat[o + 14] = cz + z * U + sz * vy;
        mat[o + 15] = 1;
        const jitter = shade * (0.94 + hash(i * 97 + v, 3) * 0.12);
        const c = n * 3;
        const r0 = rgb[v * 3] * jitter;
        const g0 = rgb[v * 3 + 1] * jitter;
        const b0 = rgb[v * 3 + 2] * jitter;
        col[c] = r0 + (w.r - r0) * fade;
        col[c + 1] = g0 + (w.g - g0) * fade;
        col[c + 2] = b0 + (w.b - b0) * fade;
        n++;
      }
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor!.needsUpdate = true;
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    for (const m of [this.tiles, this.blades, this.plants]) m?.dispose();
    this.box.dispose();
    this.material.dispose();
    this.renderer.dispose();
  }
}
