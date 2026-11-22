import * as T from "three";
import { frames, samples } from "./profile";
const sky = `
vec3 skyColor(vec3 ray) {
 float up=max(ray.y,0.);
 vec3 haze=vec3(.70,.80,.80), blue=vec3(.16,.38,.56);
 vec3 color=mix(haze,blue,pow(up,.55));
 vec3 sunDir=normalize(vec3(-.65,.43,-.48));
 float light=max(0.,dot(ray,sunDir));
 color+=vec3(.65,.47,.27)*pow(light,26.)+vec3(1.,.94,.76)*smoothstep(.9990,.9998,light);
 return color;
}`;
export const frontFunctions = `vec4 sampleAtlas(sampler2D table,vec2 uv){
 vec2 f=clamp(uv,0.,1.)*vec2(191.,95.);ivec2 lo=ivec2(floor(f)),hi=min(lo+ivec2(1),ivec2(191,95));
 vec2 w=fract(f);
 return mix(mix(texelFetch(table,lo,0),texelFetch(table,ivec2(hi.x,lo.y),0),w.x),mix(texelFetch(table,ivec2(lo.x,hi.y),0),texelFetch(table,hi,0),w.x),w.y);
}

float localAge(float t,float s,float id){
 return clamp(t+peel*(s-.5)*.72+.035*sin((s-.5)*12.+id)*sin(3.14159*t),0.,1.);
}
float frontStrength(float t,float s,float id){
 float edges=smoothstep(0.,.09,s)*smoothstep(0.,.09,1.-s)*smoothstep(0.,.12,t)*smoothstep(0.,.13,1.-t);
 float gap=exp(-pow((s-.68-.12*sin(id*3.))/ .085,2.));

 return edges*(1.-gaps*gap);
}
`;
export function makeSky() {
  return new T.Mesh(
    new T.SphereGeometry(230, 36, 20),
    new T.ShaderMaterial({
      side: T.BackSide,
      depthWrite: false,
      vertexShader: `varying vec3 ray;void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec3 ray;${sky}
void main(){vec3 d=normalize(ray);vec3 c=skyColor(d);float a=atan(d.x,d.z);
float ridge=(.013+.008*sin(a*17.)+.006*sin(a*33.)+.002*sin(a*97.))*smoothstep(.10,.85,cos(a*2.1+1.4));
c=mix(vec3(.45,.57,.59),c,smoothstep(ridge-.001,ridge+.001,d.y));gl_FragColor=vec4(c,1.);
#include <colorspace_fragment>
}`,
    }),
  );
}
export function waterMaterial(data: Float32Array) {
  const atlas = new T.DataTexture(
    data,
    samples,
    frames,
    T.RGBAFormat,
    T.FloatType,
  );
  // Nearest taps are bilinearly combined explicitly so float-linear filtering
  // is optional on WebGL 2 devices.
  atlas.needsUpdate = true;
  const slopes = new Float32Array(data.length);
  for (let j = 0; j < frames; j++)
    for (let i = 0; i < samples; i++) {
      const a = Math.max(0, i - 1),
        b = Math.min(samples - 1, i + 1);
      for (let k = 0; k < 2; k++)
        slopes[(j * samples + i) * 4 + k] =
          ((data[(j * samples + b) * 4 + k] - data[(j * samples + a) * 4 + k]) *
            (samples - 1)) /
          ((b - a) * 8);
    }
  const derivatives = new T.DataTexture(
    slopes,
    samples,
    frames,
    T.RGBAFormat,
    T.FloatType,
  );
  derivatives.needsUpdate = true;
  const uniforms = {
    atlas: { value: atlas },
    cut: { value: 0 },
    derivatives: { value: derivatives },
    phase: { value: 0.53 },
    heightScale: { value: 1 },
    peel: { value: 0.42 },
    gaps: { value: 0.35 },
  };
  const material = new T.ShaderMaterial({
    side: T.DoubleSide,
    uniforms,
    vertexShader: `
attribute vec2 axis,domain;uniform sampler2D atlas,derivatives;uniform float phase,heightScale,peel,gaps;
varying vec3 world,macroNormal;varying vec2 rest;varying float froth,arc,altitude,across;
${frontFunctions}
void main(){
 vec3 p=position;across=domain.x;macroNormal=vec3(0,1,0);rest=p.xz;froth=0.;arc=0.;altitude=0.;
 for(int i=0;i<3;i++){
 float id=float(i),travel=fract(phase+id/3.);
 float local=(domain.y-travel)*36./8.+.5;
 if(local>0. && local<1. && domain.x>0. && domain.x<1.){
 float age=localAge(travel,domain.x,id),strength=frontStrength(travel,domain.x,id);
 vec4 d=sampleAtlas(atlas,vec2(local,age));
 vec2 tangent=sampleAtlas(derivatives,vec2(local,age)).xy*strength;
 macroNormal=normalize(vec3(-axis.x*tangent.y*heightScale,1.+tangent.x,-axis.y*tangent.y*heightScale));
 p.xz+=axis*d.x*strength;p.y+=d.y*heightScale*strength;
 froth+=d.z*strength;arc+=(d.w-local*8.)*strength*smoothstep(0.,.14,1.-local);altitude+=d.y*strength;
 }}
 p.y+=.055*sin(p.x*.69+p.z*.93-phase*18.84956)+.026*sin(p.z*1.81-p.x*.39-phase*31.4159);
 float s1=.055*cos(p.x*.69+p.z*.93-phase*18.84956),s2=.026*cos(p.z*1.81-p.x*.39-phase*31.4159);
 macroNormal.xz-=macroNormal.y*vec2(.69*s1-.39*s2,.93*s1+1.81*s2);
 world=p;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
}`,
    fragmentShader: `
varying vec3 world,macroNormal;varying vec2 rest;varying float froth,arc,altitude,across;uniform float phase,cut;
${sky}
float hash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
void main(){
 if(cut>.5 && across<.5)discard;
 vec3 normal=normalize(macroNormal);vec3 eye=normalize(cameraPosition-world);
 float cavity=1.-smoothstep(-.66,.18,normal.y);
 if(dot(normal,eye)<0.)normal=-normal;
 vec2 drift=vec2(cos(phase*6.283),sin(phase*6.283));
 vec2 uv=rest+vec2(0.,arc);
 float broad=noise(uv*.85+drift*.32),grain=noise(uv*3.8-drift*.39),micro=noise(uv*10.7);
 float ripple=.058*sin(uv.y*6.+broad*13.+drift.x*2.)+.032*sin(uv.x*10.+grain*7.);
 float shortWave=sin(uv.y*11.7+uv.x*3.9+grain*8.+drift.y);
 float detailFade=1.-smoothstep(23.,74.,distance(world,cameraPosition));
 normal=normalize(normal+detailFade*vec3(ripple,0.,.07*shortWave+.06*(grain-.5)));
 vec3 ray=reflect(-eye,normal),sunDir=normalize(vec3(-.65,.43,-.48));
 float facing=max(dot(eye,normal),0.);
 float shallow=smoothstep(-6.,16.,world.z+.8*sin(world.x*.3));
 vec3 base=mix(vec3(.012,.112,.148),vec3(.049,.40,.36),shallow);
 float glow=smoothstep(.2,2.3,altitude)*(.55+.45*broad);
 base=mix(base,vec3(.06,.55,.42),glow*.73);
 float diffuse=.44+.40*max(dot(normal,sunDir),0.)+.22*max(normal.y,0.);
 float fres=.032+.69*pow(1.-facing,4.);
 vec3 c=mix(base*diffuse*(1.-.46*cavity),skyColor(normalize(vec3(ray.x,max(.035,ray.y),ray.z))),fres);
 float glint=pow(max(dot(normal,normalize(eye+sunDir)),0.),165.);
 c+=vec3(1.,.89,.68)*glint*(.12+.45*grain);
 vec2 foamUV=uv*3.8+vec2(broad*3.3,grain*.72);
 float mottled=.52*noise(foamUV)+.27*noise(foamUV*2.3)+.14*noise(foamUV*5.6)+.07*micro;
 float cells=abs(mottled-.50);
 float lace=1.-smoothstep(.014,.062,cells);
 float mask=smoothstep(.38,.86,froth+.53*(broad-.5)+.31*(grain-.5));
 float foam=mask*(.15+.32*lace+.58*smoothstep(.35,.66,mottled));
 float runup=15.7+1.6*sin(world.x*.13)+.48*sin(world.x*.37)-world.z;
 foam+=smoothstep(-.15,.2,runup)*(1.-smoothstep(.35,1.15,runup))*(.17+.55*lace)*smoothstep(.24,.63,broad);
 c=mix(c,vec3(.78,.89,.84),clamp(foam,0.,.97));c=mix(c,vec3(.62,.76,.77),smoothstep(38.,145.,distance(world,cameraPosition))*.92);
 gl_FragColor=vec4(c,1.);
 #include <colorspace_fragment>
}`,
  });
  return { material, atlas, derivatives };
}
