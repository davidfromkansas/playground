import * as T from "three";
import { patch } from "./coast";
import type { Coast } from "./types";
// Reuse the same path and baked lip sample as the water. Each point gets a
// deterministic launch time and ballistic arc, so scrubbing restores the spray.
export function sprayGeometry(coast: Coast) {
  const count = 4500,
    geometry = new T.BufferGeometry(),
    seeds = new Float32Array(count * 4),
    paths = new Float32Array(count * 4),
    axes = new Float32Array(count * 2);
  let state = 1871;
  const random = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let i = 0; i < count; i++) {
    const s = random();
    seeds.set([s, random(), random(), i % 3], 4 * i);
    const a = patch(coast, s, 0),
      b = patch(coast, s, 1),
      m = patch(coast, s, 0.5);
    paths.set([a[0], a[1], b[1], m[0] - a[0]], i * 4);
    const l = patch(coast, s - 0.001, 0.5),
      r = patch(coast, s + 0.001, 0.5),
      length = Math.hypot(r[0] - l[0], r[1] - l[1]);
    axes.set([-(r[1] - l[1]) / length, (r[0] - l[0]) / length], 2 * i);
  }
  geometry.setAttribute(
    "position",
    new T.BufferAttribute(new Float32Array(count * 3), 3),
  );
  geometry.setAttribute("seed", new T.BufferAttribute(seeds, 4));
  geometry.setAttribute("path", new T.BufferAttribute(paths, 4));
  geometry.setAttribute("axis", new T.BufferAttribute(axes, 2));
  return geometry;
}
export function sprayMaterial(
  uniforms: Record<string, T.IUniform>,
  frontFunctions: string,
) {
  return new T.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: `
uniform float phase,peel,gaps,heightScale,cut;uniform sampler2D atlas;
attribute vec4 seed,path;attribute vec2 axis;varying float opacity;
${frontFunctions}
void main(){
 float id=seed.w,t=fract(phase+id/3.),life=fract(phase*24.+seed.y);
 float birth=t-life/24., age=localAge(birth,seed.x,id), strength=frontStrength(birth,seed.x,id);
 float tube=.485+.12*seed.z;
 float crossTime=birth+(tube-.5)*8./36.;
 vec4 samplePos=sampleAtlas(atlas,vec2(tube,age));
 vec2 xz=vec2(path.x+path.w*sin(3.14159*crossTime),mix(path.y,path.z,crossTime));
 float flight=life*.80;
 xz+=axis*(samplePos.x*strength+flight*(1.6+seed.z));xz.x+=flight*(seed.z-.15);
 float y=samplePos.y*heightScale*strength+flight*(2.0+2.1*seed.y)-4.9*flight*flight;
 opacity=.56*strength*smoothstep(.39,.53,age)*smoothstep(0.,.13,.84-age)*sin(3.14159*life);
 if(cut>.5 && seed.x<.5)opacity=0.;
 vec4 v=modelViewMatrix*vec4(xz.x,y,xz.y,1.);gl_Position=projectionMatrix*v;
 gl_PointSize=clamp((7.+seed.z*13.)/max(1.,-v.z),1.,6.);
}`,
    fragmentShader: `varying float opacity;void main(){float a=opacity*(1.-smoothstep(.12,.5,length(gl_PointCoord-.5)));if(a<.025)discard;gl_FragColor=vec4(.87,.94,.91,a);
#include <colorspace_fragment>
}`,
  });
}
