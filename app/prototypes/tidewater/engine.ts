import * as T from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { bed, buildCoast, skyMap, sun } from "./scenery";
import { surfaceTexture } from "./textures";
import { oceanGrid, waterVertex, waterFragment } from "./water";
import type { Settings, View } from "./types";

const poses: Record<View, [number[], number[]]> = {
  Beach: [
    [8, 4.5, 14],
    [-1, 0.48, -5],
  ],
  Surface: [
    [2, 1.68, 5],
    [-4, 0.38, -8],
  ],
  Overhead: [
    [4, 23, 6],
    [0, 0, 2],
  ],
};
export function startOcean(
  canvas: HTMLCanvasElement,
  initial: Settings,
  onFps: (n: number) => void,
) {
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "high-performance",
    alpha: false,
  });
  const coast = new T.Scene(),
    waterScene = new T.Scene(),
    backdrop = new T.Scene();
  const sky = skyMap(renderer);
  coast.background = sky.texture;
  coast.fog = new T.FogExp2(0xc5dadd, 0.011);
  const detailA = surfaceTexture(19),
    detailB = surfaceTexture(71);
  buildCoast(coast, detailA);
  const camera = new T.PerspectiveCamera(48, 1, 0.09, 300),
    mirror = camera.clone();
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.13;
  controls.minDistance = 3;
  controls.maxDistance = 39;
  controls.maxPolarAngle = Math.PI * 0.49;
  const opaque = new T.WebGLRenderTarget(1, 1);
  opaque.depthTexture = new T.DepthTexture(1, 1, T.UnsignedIntType);
  const reflection = new T.WebGLRenderTarget(1, 1);
  const uniforms = {
    clock: { value: 0 },
    height: { value: 1 },
    steepness: { value: 1 },
    direction: { value: 0 },
    anchor: { value: new T.Vector2() },
    opaqueTex: { value: opaque.texture },
    depthTex: { value: opaque.depthTexture },
    mirrorTex: { value: reflection.texture },
    detailA: { value: detailA },
    detailB: { value: detailB },
    sky: { value: sky.texture },
    sun: { value: sun },
    unproject: { value: new T.Matrix4() },
    sceneVP: { value: new T.Matrix4() },
    mirrorVP: { value: new T.Matrix4() },
    resolution: { value: new T.Vector2() },
    shallow: { value: new T.Color() },
    deep: { value: new T.Color() },
    ripple: { value: 1 },
    clarity: { value: 1 },
    distortion: { value: 1 },
    foam: { value: 1 },
    mirrorEnabled: { value: 1 },
  };
  const material = new T.ShaderMaterial({
    uniforms,
    vertexShader: waterVertex,
    fragmentShader: waterFragment,
    depthTest: true,
    depthWrite: true,
  });
  const ocean = new T.Mesh(oceanGrid(initial.quality === "Low"), material);
  ocean.frustumCulled = false;
  waterScene.add(ocean);
  const screen = new T.Mesh(
    new T.PlaneGeometry(2, 2),
    new T.ShaderMaterial({
      uniforms: { source: { value: opaque.texture } },
      depthTest: false,
      depthWrite: false,
      vertexShader:
        "varying vec2 coords;void main(){coords=uv;gl_Position=vec4(position.xy,0.,1.);}",
      fragmentShader: `uniform sampler2D source;varying vec2 coords;void main(){gl_FragColor=texture2D(source,coords);
#include <colorspace_fragment>
}`,
    }),
  );
  screen.frustumCulled = false;
  backdrop.add(screen);
  let settings = initial,
    dirty = true,
    paused = false,
    frame = 0,
    last = 0,
    elapsed = 0,
    frames = 0,
    visible = true;
  let preset: View = "Beach";
  const eye = new T.Vector3(),
    aim = new T.Vector3();
  let flying = false;
  function view(v: View, instant = false) {
    preset = v;
    eye.fromArray(poses[v][0]);
    aim.fromArray(poses[v][1]);
    flying = !instant;
    if (instant) {
      camera.position.copy(eye);
      controls.target.copy(aim);
      controls.update();
    }
    dirty = true;
  }
  function resize() {
    const w = Math.max(1, canvas.clientWidth),
      h = Math.max(1, canvas.clientHeight);
    const scale = { Low: 0.44, Balanced: 0.9, High: 1.4 }[settings.quality];
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6) * scale);
    renderer.setSize(w, h, false);
    renderer.getDrawingBufferSize(uniforms.resolution.value);
    const { x, y } = uniforms.resolution.value;
    opaque.setSize(x, y);
    const ratio = { Low: 0, Balanced: 0.5, High: 0.85 }[settings.quality];
    reflection.setSize(
      Math.max(1, Math.floor(x * ratio)),
      Math.max(1, Math.floor(y * ratio)),
    );
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    mirror.copy(camera);
    dirty = true;
  }
  function configure(next: Settings) {
    const changed = next.quality !== settings.quality;
    settings = next;
    for (const k of [
      "height",
      "steepness",
      "ripple",
      "clarity",
      "distortion",
      "foam",
    ] as const)
      uniforms[k].value = next[k];
    uniforms.direction.value = T.MathUtils.degToRad(next.direction);
    uniforms.shallow.value.set(next.shallow);
    uniforms.deep.value.set(next.deep);
    uniforms.mirrorEnabled.value = next.quality === "Low" ? 0 : 1;
    if (changed) {
      ocean.geometry.dispose();
      ocean.geometry = oceanGrid(next.quality === "Low");
      resize();
    }
  }
  function moved() {
    dirty = true;
  }
  function interrupt() {
    flying = false;
  }
  controls.addEventListener("change", moved);
  controls.addEventListener("start", interrupt);
  const clip = [new T.Plane(new T.Vector3(0, 1, 0), 0)],
    look = new T.Vector3();
  function capture() {
    camera.updateMatrixWorld();
    uniforms.unproject.value.multiplyMatrices(
      camera.matrixWorld,
      camera.projectionMatrixInverse,
    );
    uniforms.sceneVP.value.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    renderer.setRenderTarget(opaque);
    renderer.clear();
    renderer.render(coast, camera);
    if (uniforms.mirrorEnabled.value) {
      mirror.position.copy(camera.position);
      mirror.position.y *= -1;
      look.copy(controls.target);
      look.y *= -1;
      mirror.up.set(0, -1, 0);
      mirror.lookAt(look);
      mirror.updateMatrixWorld();
      uniforms.mirrorVP.value.multiplyMatrices(
        mirror.projectionMatrix,
        mirror.matrixWorldInverse,
      );
      renderer.setRenderTarget(reflection);
      coast.background = null;
      renderer.clippingPlanes = clip;
      renderer.setClearColor(0, 0);
      renderer.clear();
      renderer.render(coast, mirror);
      renderer.clippingPlanes = [];
      coast.background = sky.texture;
    }
    renderer.setRenderTarget(null);
    dirty = false;
  }
  function tick(now: number) {
    frame = requestAnimationFrame(tick);
    if (!visible || document.hidden) {
      last = 0;
      elapsed = 0;
      frames = 0;
      return;
    }
    const dt = last ? (now - last) / 1000 : 0;
    last = now;
    if (flying) {
      const blend = 1 - Math.exp(-Math.min(dt, 0.12) * 9);
      camera.position.lerp(eye, blend);
      controls.target.lerp(aim, blend);
      if (camera.position.distanceToSquared(eye) < 0.0001) {
        view(preset, true);
      }
    }
    controls.update();
    const minY = Math.max(
      1.34,
      bed(camera.position.x, camera.position.z) + 0.55,
    );
    if (camera.position.y < minY) {
      camera.position.y = minY;
      camera.lookAt(controls.target);
      dirty = true;
    }
    if (!paused) uniforms.clock.value += Math.min(dt, 0.15) * settings.speed;
    uniforms.anchor.value.set(camera.position.x, camera.position.z);
    if (dirty) capture();
    renderer.clearDepth();
    renderer.render(backdrop, camera);
    renderer.render(waterScene, camera);
    if (dt) {
      elapsed += dt;
      frames++;
    }
    if (elapsed >= 1) {
      onFps(Math.round(frames / elapsed));
      elapsed = 0;
      frames = 0;
    }
  }
  renderer.autoClear = false;
  view("Beach", true);
  configure(initial);
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  });
  visibility.observe(canvas);
  frame = requestAnimationFrame(tick);
  return {
    configure,
    view,
    pause: (p: boolean) => {
      paused = p;
    },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibility.disconnect();
      controls.dispose();
      const resources = new Set<T.BufferGeometry | T.Material>();
      for (const scene of [coast, backdrop, waterScene])
        scene.traverse((obj) => {
          if (obj instanceof T.Mesh) {
            resources.add(obj.geometry);
            resources.add(obj.material);
          }
        });
      resources.forEach((r) => r.dispose());
      opaque.dispose();
      reflection.dispose();
      sky.dispose();
      detailA.dispose();
      detailB.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
