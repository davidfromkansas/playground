import * as T from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { sectionCap } from "./cutaway";
import { coastMesh, patch } from "./coast";
import { sprayGeometry, sprayMaterial } from "./spray";
import { makeSky, waterMaterial, frontFunctions } from "./material";
import { bakeSection, frames, samples, sectionWidth } from "./profile";
import type { Settings, CameraView } from "./types";
const shots: Record<CameraView, [number[], number[]]> = {
  Shore: [
    [12.3, 3.7, 12.3],
    [-1, 0.8, 3.7],
  ],
  Barrel: [
    [9.4, 1.32, 7.65],
    [0.25, 1.13, 5.68],
  ],
  Cutaway: [
    [-8.5, 1.7, 0.9],
    [0, 0.92, 0.55],
  ],
  Overhead: [
    [1, 30, 9],
    [0, 0, 1.5],
  ],
};
function beach() {
  const geometry = new T.PlaneGeometry(220, 52, 144, 56);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, 28);
  const p = geometry.attributes.position,
    colors = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i),
      shore = 15.7 + 1.6 * Math.sin(x * 0.13) + 0.48 * Math.sin(x * 0.37);
    const h = 0.18 * (z - shore) + 0.09 * Math.sin(z * 0.9 + x * 0.19);
    p.setY(i, h);
    const dry = T.MathUtils.smoothstep(h, 0.02, 0.68);
    const g =
      0.96 +
      0.035 * Math.sin(x * 1.3 + z * 0.8) +
      0.024 * Math.cos(x * 2.3 - z * 0.48);
    colors.push(
      (0.48 + 0.24 * dry) * g,
      (0.385 + 0.23 * dry) * g,
      (0.265 + 0.19 * dry) * g,
    );
  }
  geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return new T.Mesh(
    geometry,
    new T.MeshLambertMaterial({ vertexColors: true }),
  );
}
export function createScene(
  canvas: HTMLCanvasElement,
  chart: HTMLCanvasElement,
  initial: Settings,
  onTime: (phase: number) => void,
) {
  const plot = chart.getContext("2d");
  if (!plot) throw Error("A canvas context is required.");
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.35));
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(46, 1, 0.12, 250);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.minDistance = 3.5;
  controls.maxDistance = 48;
  controls.maxPolarAngle = Math.PI * 0.495;
  const data = bakeSection(),
    { material, atlas, derivatives } = waterMaterial(data);
  const water = new T.Mesh(coastMesh(initial.coast), material);
  water.frustumCulled = false;
  const spray = new T.Points(
    sprayGeometry(initial.coast),
    sprayMaterial(material.uniforms, frontFunctions),
  );
  spray.frustumCulled = false;
  scene.add(spray);
  const sand = beach();
  scene.add(water, sand, makeSky());
  const cap = new T.Mesh(
    new T.BufferGeometry(),
    new T.ShaderMaterial({
      side: T.DoubleSide,
      vertexShader: `varying float h;void main(){h=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying float h;void main(){float v=smoothstep(-1.3,2.6,h);gl_FragColor=vec4(mix(vec3(.011,.072,.095),vec3(.12,.56,.48),v),1.);
 #include <colorspace_fragment>
 }`,
    }),
  );
  cap.visible = false;
  scene.add(cap);
  let capCenter = 0;
  scene.add(new T.HemisphereLight(0xfff4df, 0xb2c6ce, 1.6));
  const sun = new T.DirectionalLight(0xffeed1, 1.65);
  sun.position.set(-0.65, 0.43, -0.48);
  scene.add(sun);
  let settings = initial,
    phase = 0.53,
    playing = true,
    frame = 0,
    visible = true,
    previous = 0,
    lastEvent = 0,
    dirty = true;
  function setShot(name: CameraView) {
    camera.position.fromArray(shots[name][0]);
    capCenter = 0;
    controls.target.fromArray(shots[name][1]);
    controls.update();
    dirty = true;
  }
  function configure(next: Settings) {
    if (next.coast !== settings.coast) {
      water.geometry.dispose();
      water.geometry = coastMesh(next.coast);
      spray.geometry.dispose();
      spray.geometry = sprayGeometry(next.coast);
    }
    if (next.view !== settings.view) setShot(next.view);
    settings = next;
    material.uniforms.cut.value = Number(next.view === "Cutaway");
    cap.visible = next.view === "Cutaway";
    sand.visible = !cap.visible;
    material.uniforms.heightScale.value = next.scale;
    material.uniforms.peel.value = next.peel;
    material.uniforms.gaps.value = next.gaps;
    dirty = true;
  }
  let ink = "",
    accent = "";
  function colors() {
    const css = getComputedStyle(canvas);
    ink = css.getPropertyValue("--muted-foreground");
    accent = css.getPropertyValue("--mesh");
    dirty = true;
  }
  const theme = new MutationObserver(colors);
  theme.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  colors();
  function resize() {
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    renderer.setSize(Math.max(1, w), Math.max(1, h), false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    const d = Math.min(devicePixelRatio, 1.5);
    chart.width = Math.max(1, Math.round(chart.clientWidth * d));
    chart.height = Math.max(1, Math.round(chart.clientHeight * d));
    dirty = true;
  }
  function profile() {
    const w = chart.width,
      h = chart.height;
    plot!.clearRect(0, 0, w, h);
    const baseline = h * 0.91;
    plot!.strokeStyle = ink;
    plot!.globalAlpha = 0.38;
    plot!.setLineDash([3, 4]);
    plot!.beginPath();
    plot!.moveTo(0, baseline);
    plot!.lineTo(w, baseline);
    plot!.stroke();
    plot!.setLineDash([]);
    plot!.globalAlpha = 1;
    plot!.strokeStyle = accent;
    plot!.lineWidth = 2;
    plot!.beginPath();
    const row = phase * (frames - 1),
      lo = Math.floor(row),
      hi = Math.min(frames - 1, lo + 1),
      frac = row - lo;
    const scale = Math.min(w / sectionWidth, h * 0.22);
    for (let i = 0; i < samples; i++) {
      const k = (lo * samples + i) * 4,
        l = (hi * samples + i) * 4;
      const u = i / (samples - 1);
      const dx = data[k] * (1 - frac) + data[l] * frac,
        dy = data[k + 1] * (1 - frac) + data[l + 1] * frac;
      const x = w * 0.5 + ((u - 0.5) * sectionWidth + dx) * scale,
        y = baseline - dy * settings.scale * scale;
      if (i === 0) plot!.moveTo(x, y);
      else plot!.lineTo(x, y);
    }
    plot!.stroke();
  }
  function change() {
    dirty = true;
  }
  controls.addEventListener("change", change);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  observer.observe(chart);
  const vis = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    previous = 0;
  });
  vis.observe(canvas);
  function draw(now: number) {
    frame = requestAnimationFrame(draw);
    if (!visible || document.hidden) {
      previous = 0;
      return;
    }
    const dt = previous ? Math.min((now - previous) / 1000, 0.15) : 0;
    previous = now;
    if (playing) {
      phase = (phase + dt / 19) % 1;
      dirty = true;
    }
    if (dirty) {
      material.uniforms.phase.value = phase;
      if (cap.visible) {
        const center = patch(settings.coast, 0.5, phase)[1];
        camera.position.z += center - capCenter;
        controls.target.z += center - capCenter;
        capCenter = center;
        controls.update();
        cap.geometry.dispose();
        cap.geometry = sectionCap(data, settings, phase);
      }
      renderer.render(scene, camera);
      profile();
      dirty = false;
    }
    if (playing && now - lastEvent > 90) {
      onTime(phase);
      lastEvent = now;
    }
  }
  setShot(initial.view);
  configure(initial);
  resize();
  frame = requestAnimationFrame(draw);
  return {
    configure,
    setPhase(v: number) {
      phase = v;
      onTime(v);
      dirty = true;
    },
    play(value: boolean) {
      playing = value;
      previous = 0;
      onTime(phase);
    },
    dispose() {
      cancelAnimationFrame(frame);
      vis.disconnect();
      theme.disconnect();
      observer.disconnect();
      controls.dispose();
      scene.traverse((obj) => {
        if (obj instanceof T.Mesh || obj instanceof T.Points) {
          obj.geometry.dispose();
          obj.material.dispose();
        }
      });
      atlas.dispose();
      derivatives.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
