import * as T from "three";

export function oceanGrid(low: boolean) {
  const verts = [0, 0, 0],
    indices: number[] = [];
  const rings = low ? 64 : 112,
    sectors = low ? 96 : 176;
  for (let j = 1; j <= rings; j++) {
    const u = j / rings,
      r = 12 * u + 218 * u ** 2.55;
    for (let i = 0; i < sectors; i++) {
      const a = (i * Math.PI * 2) / sectors;
      verts.push(Math.cos(a) * r, 0, Math.sin(a) * r);
      const here = 1 + (j - 1) * sectors + i,
        next = 1 + (j - 1) * sectors + ((i + 1) % sectors);
      if (j === 1) indices.push(0, next, here);
      else
        indices.push(
          here - sectors,
          next,
          here,
          here - sectors,
          next - sectors,
          next,
        );
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
  g.setIndex(indices);
  return g;
}
export const waterVertex = `
uniform float clock,height,steepness,direction;uniform vec2 anchor;
varying vec3 surface,macroNormal;varying float crest;
void wave(vec2 p,float angle,float wavelength,float a,float q,float rate,float phase,inout vec3 delta,inout vec3 dx,inout vec3 dz){
vec2 d=vec2(cos(angle+direction),sin(angle+direction));float k=6.283185/wavelength;
float t=dot(p,d)*k-clock*rate+phase;float s=sin(t),c=cos(t);
a*=height*(1.-smoothstep(wavelength*6.,wavelength*16.,length(p-anchor))); q*=steepness;delta+=a*vec3(q*d.x*c,s,q*d.y*c);
vec3 deriv=a*k*vec3(-q*d.x*s,c,-q*d.y*s);dx+=deriv*d.x;dz+=deriv*d.y;}
void main(){
vec2 p=position.xz+anchor;vec3 w=vec3(0.),dx=vec3(1,0,0),dz=vec3(0,0,1);
wave(p,.88,9.4,.34,.94,1.35,.32,w,dx,dz);
wave(p,1.54,5.7,.18,.81,1.76,1.8,w,dx,dz);
wave(p,.34,3.7,.095,.72,2.13,2.94,w,dx,dz);
wave(p,2.23,2.05,.048,.66,2.83,.75,w,dx,dz);
wave(p,-.26,14.4,.16,.85,1.11,4.1,w,dx,dz);
crest=w.y/max(.03,height);surface=vec3(p.x,0.,p.y)+w;macroNormal=normalize(cross(dz,dx));
gl_Position=projectionMatrix*viewMatrix*vec4(surface,1.);}
`;
export const waterFragment = `
uniform sampler2D opaqueTex,depthTex,mirrorTex,detailA,detailB;
uniform samplerCube sky;
uniform mat4 unproject,mirrorVP,sceneVP;uniform vec2 resolution;uniform vec3 sun,shallow,deep;
uniform float clock,ripple,clarity,distortion,foam,mirrorEnabled;
varying vec3 surface,macroNormal;varying float crest;
vec3 reconstruct(vec2 uv,float z){vec4 w=unproject*vec4(uv*2.-1.,z*2.-1.,1.);return w.xyz/w.w;}
float edge(vec2 uv){vec2 e=min(uv,1.-uv);return smoothstep(0.,.065,min(e.x,e.y));}
void main(){
vec2 uv=gl_FragCoord.xy/resolution;
float z=texture2D(depthTex,uv).r;if(z<gl_FragCoord.z)discard;
vec3 floorPos=reconstruct(uv,z);float separation=length(surface-floorPos);
float depth=max(max(0.,surface.y-floorPos.y),smoothstep(1.,12.,separation)*min(12.,separation*.27));
if(z>=.999999)depth=20.;
vec2 p=surface.xz;vec2 a=p*vec2(.28,.39)+clock*vec2(.022,-.035);
vec2 b=mat2(.78,-.626,.626,.78)*p*vec2(.64,.36)+clock*vec2(-.041,.018);
vec4 n1=texture2D(detailA,a),n2=texture2D(detailB,b);
vec2 fine=(n1.rg-.5)+mat2(.78,.626,-.626,.78)*(n2.rg-.5)*.66;
vec3 N=normalize(macroNormal+vec3(fine.x,0.,fine.y)*.38*ripple);
vec3 V=normalize(cameraPosition-surface);
vec3 transmittedRay=refract(-V,N,1./1.333);
float travel=min(depth,3.5)/max(.21,-transmittedRay.y);
vec4 projected=sceneVP*vec4(surface+transmittedRay*travel,1.);
vec4 flatProjection=sceneVP*vec4(surface+refract(-V,vec3(0.,1.,0.),1./1.333)*travel,1.);
vec2 flatUV=flatProjection.xy/flatProjection.w*.5+.5;
vec2 displacement=projected.xy/projected.w*.5+.5-mix(uv,flatUV,.82);
vec2 offset=displacement/max(1.,length(displacement)/.045)*distortion*edge(uv);
vec2 bent=clamp(uv+offset,0.,1.);float rz=texture2D(depthTex,bent).r;
vec3 hit=reconstruct(bent,rz);
float valid=step(gl_FragCoord.z,rz)*smoothstep(.015,.20,surface.y-hit.y)*edge(bent);
float thicknessChange=abs(hit.y-floorPos.y);
valid*=1.-smoothstep(.35+depth*.12,1.1+depth*.32,thicknessChange);
vec3 floorColor=mix(texture2D(opaqueTex,uv).rgb,texture2D(opaqueTex,bent).rgb,valid);
float path=mix(separation,length(surface-hit),valid);
float submerged=mix(smoothstep(-.02,.10,surface.y-floorPos.y),1.,valid);
floorColor=mix(deep,floorColor,submerged);
float opticalDepth=mix(depth,max(.0,surface.y-hit.y),valid);
vec3 tint=mix(shallow,deep,1.-exp(-max(opticalDepth,path*.52)*.42));
vec3 trans=exp(-min(path,120.)*vec3(1.4,.82,.57)/clarity);
vec3 water=floorColor*trans+tint*(1.-trans);
vec3 R=reflect(-V,N);vec3 reflected=textureCube(sky,vec3(R.x,max(.015,R.y),R.z)).rgb;
if(mirrorEnabled>.5){
// Project along the disturbed reflection ray. Near-horizontal views need
// vertical image displacement even when the slope points toward the viewer.
vec3 flatPoint=vec3(p.x,0.,p.y);
vec3 flatRay=reflect(-V,vec3(0.,1.,0.));
float reach=clamp(length(cameraPosition-surface)*.45,1.,16.);
vec4 pr=mirrorVP*vec4(flatPoint+mix(flatRay,R,.76)*reach,1.);
vec2 m=pr.xy/pr.w*.5+.5;
vec4 col=texture2D(mirrorTex,clamp(m,0.,1.));reflected=mix(reflected,col.rgb/max(col.a,.001),col.a*edge(m)*step(.01,pr.w));}
// Average fine slopes at grazing angles to temper rapid brightness changes.
float facing=clamp(mix(dot(N,V),V.y,.18),0.,1.);
float fres=.028+.94*pow(1.-facing,5.);
vec3 color=mix(water,reflected,fres);
vec3 H=normalize(V+sun);float spec=max(dot(N,H),0.);
float glint=.45+.9*n1.b*n2.b+.32*smoothstep(.52,.73,n2.b);
float power=mix(250.,55.,smoothstep(14.,100.,length(cameraPosition-surface)));
color+=vec3(1.,.86,.62)*pow(spec,power)*glint*1.7;
vec2 flow=p*.24+macroNormal.xz*.34+clock*vec2(.014,-.012);
vec4 cells=texture2D(detailA,flow+vec2(n2.b*.16));
float breakup=.62*cells.b+.38*n2.b;
float contact=(1.-smoothstep(.015,.68,depth))*smoothstep(.22,.70,breakup);
float cap=smoothstep(.24,.56,crest)*smoothstep(.78,.98,macroNormal.y)*smoothstep(.39,.69,breakup);
float coverage=clamp(foam*(contact*2.0+cap*1.55)*(.06+.94*cells.a),0.,.92);
color=mix(color,vec3(.76,.85,.82),coverage);
// Blend only the last few centimeters at the contact.
color=mix(texture2D(opaqueTex,uv).rgb,color,smoothstep(0.,.055,depth));
color=mix(color,vec3(.63,.77,.80),smoothstep(65.,190.,length(cameraPosition-surface))*.78);
gl_FragColor=vec4(color,1.);
#include <colorspace_fragment>
}`;
