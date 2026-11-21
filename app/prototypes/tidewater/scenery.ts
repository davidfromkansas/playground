import * as T from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { noise } from "./textures";
export const sun = new T.Vector3(-0.4, 0.31, -0.86).normalize();
export function bed(x: number, z: number) {
  const shelf = 5.6 * Math.exp(-((x - 4) ** 2 / 95 + (z + 24) ** 2 / 52));
  return Math.max(
    -10,
    0.2 * (z - 9 + 0.28 * x + 1.4 * Math.sin(x * 0.22)) +
      0.12 * Math.sin(x * 0.8 + z * 0.36) +
      0.18 * Math.cos(z * 0.55) +
      shelf,
  );
}
export function skyMap(renderer: T.WebGLRenderer) {
  const source = new T.Scene();
  const dome = new T.Mesh(
    new T.SphereGeometry(10, 32, 16),
    new T.ShaderMaterial({
      side: T.BackSide,
      uniforms: { sun: { value: sun } },
      vertexShader: `
varying vec3 dir;
void main(){dir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `
varying vec3 dir;uniform vec3 sun;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
void main(){vec3 d=normalize(dir);float y=max(0.,d.y);
vec3 c=mix(vec3(.68,.82,.83),vec3(.13,.36,.56),pow(y,.53));float s=max(0.,dot(d,sun));
vec2 p=d.xz/(y+.12);float clouds=.52*n(p*2.)+.28*n(p*4.)+.14*n(p*9.)+.06*n(p*21.);
c=mix(c,vec3(.89,.88,.8),smoothstep(.48,.72,clouds)*smoothstep(0.,.12,y)*.68);
c+=vec3(.9,.63,.34)*pow(s,36.)*.45+vec3(1.,.9,.68)*smoothstep(.9992,.99986,s);
gl_FragColor=vec4(c,1.);}`,
    }),
  );
  source.add(dome);
  const target = new T.WebGLCubeRenderTarget(256, {
    type: T.HalfFloatType,
    generateMipmaps: true,
    minFilter: T.LinearMipmapLinearFilter,
  });
  new T.CubeCamera(0.1, 25, target).update(renderer, source);
  dome.geometry.dispose();
  dome.material.dispose();
  return target;
}
export function buildCoast(scene: T.Scene, grain: T.Texture) {
  const geo = new T.PlaneGeometry(210, 220, 140, 145);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, -42);
  const pos = geo.attributes.position,
    cols = [];
  const rockCenters = [
    [-5, 1, 2.7],
    [-8, 2, 1.9],
    [-4, 3, 1.4],
    [4, -5, 1.75],
    [6, -6, 1.1],
    [1, 6, 0.62],
    [-1, 1, 0.55],
  ];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getZ(i),
      y = bed(x, z);
    pos.setY(i, y);
    const graininess = noise(x * 0.38, z * 0.38);
    let shade = 1;
    for (const [rx, rz, r] of rockCenters) {
      shade -=
        0.26 *
        Math.exp(-((x - rx - 0.4) ** 2 + (z - rz - 0.4) ** 2) / (r * r * 1.2));
    }
    const wet = T.MathUtils.smoothstep(y, 0.08, 0.8);
    cols.push(
      (0.56 + 0.23 * wet) * shade * (0.86 + 0.16 * graininess),
      (0.46 + 0.17 * wet) * shade * (0.86 + 0.16 * graininess),
      (0.29 + 0.13 * wet) * shade,
    );
  }
  geo.setAttribute("color", new T.Float32BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  function textured(rock: boolean) {
    const mat = new T.MeshLambertMaterial({ vertexColors: true });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.grain = { value: grain };
      shader.vertexShader =
        "varying vec3 terrainPoint;\n" +
        shader.vertexShader.replace(
          "#include <worldpos_vertex>",
          "#include <worldpos_vertex>\n terrainPoint=(modelMatrix*vec4(transformed,1.)).xyz;",
        );
      shader.fragmentShader =
        "varying vec3 terrainPoint; uniform sampler2D grain;\n" +
        shader.fragmentShader.replace(
          "#include <color_fragment>",
          `#include <color_fragment>
vec3 p=terrainPoint;vec2 uv=p.xz+vec2(.34,.86)*p.y;
float g=texture2D(grain,uv*.42).b, fine=texture2D(grain,uv*2.3).b;
${rock ? `float bands=sin(p.y*32.+p.x*5.5+p.z*3.+g*3.5);diffuseColor.rgb*=.44+.68*g+.25*fine+.24*smoothstep(.60,.94,bands);diffuseColor.rgb*=mix(.66,1.,smoothstep(.0,.65,p.y));` : `diffuseColor.rgb*=.84+.20*g+.12*fine; diffuseColor.rgb+=.035*sin(uv.y*13.+uv.x*2.+g*9.)*exp(-abs(p.y+1.)*.7);`}
`,
        );
    };
    mat.customProgramCacheKey = () => (rock ? "shale" : "sand");
    return mat;
  }
  scene.add(new T.Mesh(geo, textured(false)));
  const rockMat = textured(true);
  function rock(
    x: number,
    z: number,
    r: number,
    seed: number,
    submerged = false,
  ) {
    const raw = new T.IcosahedronGeometry(1, r > 1 ? 12 : 4);
    raw.deleteAttribute("normal");
    raw.deleteAttribute("uv");
    const g = mergeVertices(raw);
    raw.dispose();
    const p = g.attributes.position,
      c = [];
    for (let i = 0; i < p.count; i++) {
      const a = p.getX(i),
        b = p.getY(i),
        d = p.getZ(i);
      const n = noise(2 * a + seed, 2 * d + 2 * b),
        m = noise(a * 7 + b * 4 + seed, d * 7);
      const scale = 0.74 + 0.38 * n + 0.13 * m;
      const foot = Math.min(0, bed(x, z) + 0.45);
      p.setXYZ(
        i,
        (a * scale + b * 0.18) * r * 1.3,
        Math.sign(b) * Math.pow(Math.abs(b), 0.71) * scale * r * 0.83 +
          (submerged ? 0 : Math.min(0, -foot * b)),
        d * r * scale,
      );
      const l = 0.085 + 0.16 * n + 0.11 * m;
      c.push(l * 1.1, l * 1.04, l * 0.95);
    }
    g.setAttribute("color", new T.Float32BufferAttribute(c, 3));
    g.computeVertexNormals();
    const obj = new T.Mesh(g, rockMat);
    obj.position.set(x, submerged ? bed(x, z) : Math.max(bed(x, z), -0.45), z);
    obj.rotation.y = seed;
    scene.add(obj);
  }
  rockCenters.forEach(([x, z, r], i) => rock(x, z, r, i * 7));
  for (let i = 0; i < 34; i++) {
    const x = noise(i * 0.98, 31) * 36 - 18,
      z = noise(i * 0.93, 42) * 25 - 13;
    rock(x, z, 0.16 + 0.68 * noise(i * 0.82, 77), i, true);
  }
  // An eroded sandstone arch follows an irregular spine above two submerged feet.
  const arch = new T.TorusGeometry(1, 0.35, 24, 72, Math.PI);
  const ap = arch.attributes.position,
    ac = [];
  for (let i = 0; i < ap.count; i++) {
    const x = ap.getX(i),
      y = ap.getY(i),
      z = ap.getZ(i);
    const n = noise(x * 4 + y * 2, z * 7 + 2),
      m = noise(x * 12 + y * 4, z * 9);
    ap.setXYZ(
      i,
      x * (4.5 + 0.5 * n) + y * 0.8,
      y * (4.7 + 0.7 * n) + 0.3 * m - 1.0,
      z * (4.3 + n) + 0.17 * m + 0.45 * x,
    );
    const l = 0.17 + 0.15 * n + 0.08 * m;
    ac.push(l * 1.27, l * 1.07, l * 0.85);
  }
  arch.setAttribute("color", new T.Float32BufferAttribute(ac, 3));
  arch.computeVertexNormals();
  const stack = new T.Mesh(arch, rockMat);
  stack.position.set(4, 0, -25);
  stack.scale.set(1.0, 0.69, 0.84);
  stack.rotation.y = -0.27;
  scene.add(stack);
  rock(9, -21, 1.95, 42);
  rock(10.6, -20, 1.05, 43);
  rock(-0.8, -22, 1.62, 47);
  // Layered, receding headlands with an open channel on the right.
  for (let layer = 0; layer < 3; layer++) {
    const g = new T.PlaneGeometry(290, 29, 220, 12);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position,
      c = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i),
        v = (z + 14.5) / 29;
      const island =
        Math.max(0, 1 - ((x + 48 + layer * 8) / 53) ** 2) +
        0.54 * Math.max(0, 1 - ((x - 65) / 27) ** 2);
      const ridge =
        (2 +
          10 * noise(x * 0.105, layer + 3) +
          3 * noise(x * 0.29, layer) +
          1.3 * noise(x * 0.65, layer + 2)) *
        island;
      const h =
        ridge * Math.sin(v * Math.PI) ** 0.8 +
        island * 1.25 * noise(x * 0.67, z * 0.5) -
        1.2;
      p.setY(i, h);
      const l = 0.86 + 0.28 * noise(x * 0.54, z * 0.43);
      c.push(
        (0.14 + 0.072 * layer) * l,
        (0.245 + 0.081 * layer) * l,
        (0.25 + 0.092 * layer) * l,
      );
    }
    g.setAttribute("color", new T.Float32BufferAttribute(c, 3));
    g.computeVertexNormals();
    const m = new T.Mesh(g, new T.MeshLambertMaterial({ vertexColors: true }));
    m.position.z = -56 - layer * 24;
    scene.add(m);
  }
  scene.add(new T.HemisphereLight(0xe3f1ff, 0xc3af86, 1.38));
  const light = new T.DirectionalLight(0xffecd1, 2.1);
  light.position.copy(sun);
  scene.add(light);
}
