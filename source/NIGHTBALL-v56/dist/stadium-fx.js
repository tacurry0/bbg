import * as T from './vendor/three.module.min.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createStadiumEnvMap(gl) {
  if (gl.isSoftwareRenderer || typeof T.PMREMGenerator !== 'function') return null;
  try {
    const pmrem = new T.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader?.();
    const envScene = new T.Scene();
    envScene.background = new T.Color(0x0d1b30);

    // Sky dome + emerald turf bounce hemisphere for natural PBR reflections
    const domeGeo = new T.SphereGeometry(40, 24, 16);
    const domeMat = new T.ShaderMaterial({
      side: T.BackSide,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vDir; void main(){
        vec3 turf = vec3(0.14, 0.30, 0.18);
        vec3 horizon = vec3(0.22, 0.36, 0.52);
        vec3 zenith = vec3(0.05, 0.10, 0.22);
        vec3 col = vDir.y < 0.0 ? mix(horizon * 0.65, turf, smoothstep(0.0, -0.45, vDir.y))
                                : mix(horizon, zenith, smoothstep(0.0, 0.65, vDir.y));
        gl_FragColor = vec4(col, 1.0);
      }`
    });
    envScene.add(new T.Mesh(domeGeo, domeMat));

    // Bright HDR floodlight panels so clearcoat helmets & metal catch crisp stadium highlights
    const panelGeo = new T.PlaneGeometry(7.5, 4.2);
    const warmMat = new T.MeshBasicMaterial({ color: new T.Color(5.5, 5.1, 4.2), side: T.DoubleSide });
    const coolMat = new T.MeshBasicMaterial({ color: new T.Color(2.4, 3.5, 5.0), side: T.DoubleSide });
    for (const [i, a] of [-2.2, -1.15, -0.45, 0.45, 1.15, 2.2].entries()) {
      const m = new T.Mesh(panelGeo, i % 3 === 0 ? coolMat : warmMat);
      m.position.set(Math.sin(a) * 26, 16 + (i % 2) * 4, Math.cos(a) * 26);
      m.lookAt(0, 1, 0);
      envScene.add(m);
    }
    const topLight = new T.Mesh(new T.CircleGeometry(6, 16), new T.MeshBasicMaterial({ color: new T.Color(2.0, 2.3, 2.8), side: T.DoubleSide }));
    topLight.position.set(0, 34, 0);
    topLight.rotation.x = Math.PI / 2;
    envScene.add(topLight);

    const target = pmrem.fromScene(envScene, 0.035);
    domeGeo.dispose();
    domeMat.dispose();
    panelGeo.dispose();
    warmMat.dispose();
    coolMat.dispose();
    topLight.geometry.dispose();
    topLight.material.dispose();
    pmrem.dispose();
    return target.texture;
  } catch {
    return null;
  }
}

export function createContactShadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 256, 256);

  // 4-way stadium floodlight cross-shadow lobes
  for (const angle of [0.62, -0.62, 2.48, -2.48]) {
    x.save();
    x.translate(128, 128);
    x.rotate(angle);
    x.scale(1.0, 0.46);
    const lobe = x.createRadialGradient(26, 0, 4, 34, 0, 86);
    lobe.addColorStop(0, 'rgba(3, 18, 14, 0.24)');
    lobe.addColorStop(0.55, 'rgba(3, 18, 14, 0.10)');
    lobe.addColorStop(1, 'rgba(3, 18, 14, 0)');
    x.fillStyle = lobe;
    x.beginPath();
    x.arc(30, 0, 88, 0, Math.PI * 2);
    x.fill();
    x.restore();
  }

  // Soft central ambient occlusion core right beneath the cleats
  const core = x.createRadialGradient(128, 128, 6, 128, 128, 68);
  core.addColorStop(0, 'rgba(2, 14, 12, 0.56)');
  core.addColorStop(0.42, 'rgba(2, 16, 13, 0.30)');
  core.addColorStop(0.78, 'rgba(2, 18, 14, 0.08)');
  core.addColorStop(1, 'rgba(2, 18, 14, 0)');
  x.fillStyle = core;
  x.fillRect(0, 0, 256, 256);

  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

export function createLightBeamTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255, 248, 220, 0.42)');
  g.addColorStop(0.22, 'rgba(225, 240, 255, 0.18)');
  g.addColorStop(0.65, 'rgba(190, 225, 255, 0.05)');
  g.addColorStop(1, 'rgba(180, 220, 255, 0)');
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(46, 0);
  x.lineTo(82, 0);
  x.lineTo(126, 256);
  x.lineTo(2, 256);
  x.closePath();
  x.fill();

  // Soft horizontal feather
  x.globalCompositeOperation = 'destination-in';
  const h = x.createLinearGradient(0, 0, 128, 0);
  h.addColorStop(0, 'rgba(0,0,0,0)');
  h.addColorStop(0.25, 'rgba(0,0,0,1)');
  h.addColorStop(0.75, 'rgba(0,0,0,1)');
  h.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = h;
  x.fillRect(0, 0, 128, 256);

  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

export function createParticleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.28, 'rgba(255,252,240,0.82)');
  g.addColorStop(0.64, 'rgba(255,244,218,0.28)');
  g.addColorStop(1, 'rgba(255,240,210,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

export function createSkyMaterial() {
  return new T.ShaderMaterial({
    side: T.DoubleSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      zenith: { value: new T.Color(0x061024) },
      horizon: { value: new T.Color(0x284b6b) },
      uNight: { value: 1.0 },
      uRural: { value: 0.0 },
      uTime: { value: 0.0 }
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 zenith;
      uniform vec3 horizon;
      uniform float uNight;
      uniform float uRural;
      uniform float uTime;
      varying vec3 vDir;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise2(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
                   mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        // Center field is +Z in scene-local coordinates (scene.scale.z = -1), so atan(d.x, d.z) puts ±pi behind home plate
        float az = atan(d.x, d.z);
        vec2 azCircle = vec2(sin(az), cos(az));

        // Multi-stop atmospheric sky gradient
        vec3 mid = mix(horizon, zenith, 0.56);
        vec3 sky = h < 0.16
          ? mix(horizon, mid, smoothstep(-0.04, 0.16, h))
          : mix(mid, zenith, smoothstep(0.16, 0.68, h));

        // Stadium horizon light dome glow at night
        float stadiumGlow = exp(-max(0.0, h + 0.02) * 9.5) * (0.55 + 0.45 * cos(az * 2.0));
        sky += uNight * vec3(0.10, 0.19, 0.30) * stadiumGlow;

        // Crisp twinkling stars at night (seamless periodic azimuth cells)
        if (uNight > 0.5 && h > 0.08) {
          vec2 starUV = vec2((az / 6.2831853 + 0.5) * 180.0, h * 52.0);
          vec2 cell = vec2(mod(floor(starUV.x), 180.0), floor(starUV.y));
          vec2 gv = fract(starUV) - 0.5;
          float rnd = hash21(cell);
          if (rnd > 0.86) {
            vec2 offset = (vec2(hash21(cell + 7.1), hash21(cell + 13.7)) - 0.5) * 0.6;
            float dist = length(gv - offset);
            float twinkle = 0.72 + 0.28 * sin(uTime * 2.3 + rnd * 40.0);
            float star = smoothstep(0.09, 0.012, dist) * smoothstep(0.08, 0.28, h) * twinkle;
            vec3 starCol = mix(vec3(0.82, 0.90, 1.0), vec3(1.0, 0.95, 0.82), fract(rnd * 17.0));
            sky += starCol * star * 0.85;
          }
        }

        // Seamless 3D-projected cumulus clouds during day games (zero azimuth seam)
        if (uNight < 0.5 && h > 0.03) {
          vec2 cuv = d.xz / max(0.22, h + 0.16) * 1.45 + vec2(uTime * 0.010, uTime * 0.004);
          float c = noise2(cuv) * 0.62 + noise2(cuv * 2.3 + 4.1) * 0.38;
          float cloud = smoothstep(0.53, 0.82, c) * smoothstep(0.03, 0.16, h) * smoothstep(0.62, 0.24, h);
          sky = mix(sky, vec3(0.97, 0.99, 1.0), cloud * 0.60);
        }

        // Distant horizon silhouette: city skyline + lit windows (urban) or seamless mountain ridge (rural/Toyama)
        if (h > -0.05 && h < 0.14) {
          if (uRural > 0.5) {
            float ridge = 0.028 + 0.038 * noise2(azCircle * 3.8 + 1.2) + 0.016 * noise2(azCircle * 9.2 + 3.7);
            float mMask = smoothstep(ridge + 0.004, ridge - 0.003, h);
            vec3 mCol = uNight > 0.5 ? vec3(0.04, 0.08, 0.14) : vec3(0.36, 0.52, 0.60);
            sky = mix(sky, mCol, mMask * 0.88);
          } else {
            float azNorm = (az / 6.2831853 + 0.5) * 240.0;
            float colIdx = mod(floor(azNorm), 240.0);
            float bRnd = hash21(vec2(colIdx, 3.1));
            float bHeight = (bRnd > 0.22 ? 0.018 + pow(bRnd, 2.2) * 0.068 : 0.010);
            float bMask = smoothstep(bHeight + 0.002, bHeight - 0.002, h) * step(-0.04, h);
            vec3 bCol = uNight > 0.5 ? vec3(0.035, 0.065, 0.115) : vec3(0.56, 0.70, 0.80);
            if (uNight > 0.5 && bMask > 0.5 && h > 0.004) {
              vec2 winUV = vec2(fract(azNorm) * 5.0, h * 260.0);
              vec2 wCell = floor(winUV);
              vec2 wFrac = fract(winUV);
              float wOn = step(0.64, hash21(wCell + colIdx * 1.7));
              float wShape = step(0.22, wFrac.x) * step(wFrac.x, 0.78) * step(0.25, wFrac.y) * step(wFrac.y, 0.75);
              vec3 wColor = mix(vec3(1.0, 0.84, 0.50), vec3(0.58, 0.86, 1.0), step(0.65, hash21(wCell + 9.3)));
              bCol += wColor * wOn * wShape * 0.42 * smoothstep(bHeight, bHeight - 0.008, h);
            }
            sky = mix(sky, bCol, bMask * 0.92);
          }
        }

        gl_FragColor = vec4(sky, 1.0);
        #include <colorspace_fragment>
      }
    `
  });
}

export function enhanceGrassMaterial(material, gl) {
  if (gl.isSoftwareRenderer) return null;
  const uniforms = {
    uFenceAnchors: { value: new T.Vector4(99.06, 112.7, 121.92, 112.7) },
    uFenceRight: { value: 99.06 },
    uIsSchool: { value: 0.0 },
    uIsDome: { value: 0.0 },
    uVenueMow: { value: new T.Vector2(0, 1) },
    uConcourseColor: { value: new T.Color(0x16212c) }
  };
  material.userData.fxUniforms = uniforms;
  material.customProgramCacheKey = () => 'nb-turf-v56';
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vNbWorld;')
      .replace('#include <project_vertex>', 'vec4 nbWorldPos = modelMatrix * vec4(transformed, 1.0);\nvNbWorld = nbWorldPos.xyz;\n#include <project_vertex>');

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vNbWorld;
        uniform vec4 uFenceAnchors;
        uniform float uFenceRight;
        uniform float uIsSchool;
        uniform float uIsDome;
        uniform vec2 uVenueMow;
        uniform vec3 uConcourseColor;

        float nbHash(vec2 p) {
          p = fract(p * vec2(127.1, 311.7));
          p += dot(p, p + 34.23);
          return fract(p.x * p.y);
        }

        float nbNoise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(nbHash(i), nbHash(i + vec2(1.0, 0.0)), f.x),
                     mix(nbHash(i + vec2(0.0, 1.0)), nbHash(i + vec2(1.0, 1.0)), f.x), f.y);
        }

        float nbStripe(float coord, float period) {
          float phase = coord / period * 3.14159265;
          float s = sin(phase);
          float fw = max(0.02, fwidth(phase) * 0.85);
          return smoothstep(-fw, fw, s) * (1.0 - smoothstep(1.2, 3.0, fw));
        }

        float nbFenceDist(float angle) {
          float pos = clamp(angle / 0.39269908 + 2.0, 0.0, 4.0);
          float a0 = uFenceAnchors.x, a1 = uFenceAnchors.y, a2 = uFenceAnchors.z, a3 = uFenceAnchors.w, a4 = uFenceRight;
          float idx = min(3.0, floor(pos));
          float u = pos - idx;
          float p0 = idx < 0.5 ? a0 : idx < 1.5 ? a1 : idx < 2.5 ? a2 : a3;
          float p1 = idx < 0.5 ? a1 : idx < 1.5 ? a2 : idx < 2.5 ? a3 : a4;
          float t0 = idx < 0.5 ? (a1 - a0) : idx < 1.5 ? ((a1 - a0) * (a2 - a1) > 0.0 ? 2.0 * (a1 - a0) * (a2 - a1) / (a2 - a0) : 0.0) : idx < 2.5 ? 0.0 : ((a3 - a2) * (a4 - a3) > 0.0 ? 2.0 * (a3 - a2) * (a4 - a3) / (a4 - a2) : 0.0);
          float t1 = idx < 0.5 ? ((a1 - a0) * (a2 - a1) > 0.0 ? 2.0 * (a1 - a0) * (a2 - a1) / (a2 - a0) : 0.0) : idx < 1.5 ? 0.0 : idx < 2.5 ? ((a3 - a2) * (a4 - a3) > 0.0 ? 2.0 * (a3 - a2) * (a4 - a3) / (a4 - a2) : 0.0) : (a4 - a3);
          float u2 = u * u, u3 = u2 * u;
          return p0 + (p1 - p0) * (3.0 * u2 - 2.0 * u3) + t0 * (u3 - 2.0 * u2 + u) + t1 * (u3 - u2);
        }
      `)
      .replace('#include <map_fragment>', `
        vec2 fp = vec2(vNbWorld.x, -vNbWorld.z);
        float distHome = length(fp);
        float ang = atan(fp.x, max(0.001, fp.y));
        float fDist = nbFenceDist(ang);

        // Outside outfield wall or foul perimeter -> stadium concourse apron instead of infinite green grass
        float beyondOutfield = smoothstep(fDist - 0.10, fDist + 0.35, distHome) * step(-0.795, ang) * step(ang, 0.795) * step(15.0, fp.y);
        float foulLimit = max(max(uFenceAnchors.x, uFenceRight), 85.0);
        float beyondFoul = smoothstep(foulLimit + 6.0, foulLimit + 10.0, distHome) * smoothstep(0.775, 0.805, abs(ang));
        float behindBackstop = smoothstep(-24.0, -28.0, fp.y);
        float apronMask = clamp(max(max(beyondOutfield, beyondFoul), behindBackstop), 0.0, 1.0);

        // Crisp world-space ballpark mowing stripes
        float diamondDist = abs(fp.x) + abs(fp.y - 19.4);
        float inInfield = (1.0 - smoothstep(15.2, 16.0, diamondDist)) * smoothstep(2.8, 3.8, fp.y);

        // Infield: classic 45-degree crisscross checkerboard
        float diagA = nbStripe(fp.x + fp.y, 3.45);
        float diagB = nbStripe(fp.x - fp.y, 3.45);
        float infieldCut = mix(diagA * 0.58 + diagB * 0.42, 0.5, uIsSchool * 0.65);

        // Outfield: radial fan mowing lanes + concentric outfield arcs
        float fanAngle = atan(fp.x, fp.y + 3.0);
        float radialCut = nbStripe(fanAngle, 0.062);
        float arcCut = nbStripe(distHome, 7.6);
        float outfieldCut = mix(radialCut * 0.66 + arcCut * 0.34, 0.5, uIsSchool * 0.72);

        float stadiumCut = mix(outfieldCut, infieldCut, inInfield);
        float straightCut = nbStripe(fp.x + fp.y * 0.17, 5.3);
        float mow = clamp(0.5 + (mix(stadiumCut, straightCut, uVenueMow.x) - 0.5) * uVenueMow.y, 0.0, 1.0);

        // Fine grass blade micro-grain (gracefully filtered at distance)
        float fwBlade = fwidth(fp.x) + fwidth(fp.y);
        float detailFade = 1.0 - smoothstep(0.06, 0.45, fwBlade);
        float micro = (nbNoise(fp * 14.0) - 0.5) * 0.11 * detailFade + (nbNoise(fp * 2.3) - 0.5) * 0.06;

        // Rich light/dark emerald contrast along mowed grass grain
        vec3 baseGrass = diffuseColor.rgb;
        vec3 darkCut = baseGrass * (uIsDome > 0.5 ? vec3(0.84, 0.90, 0.88) : vec3(0.80, 0.88, 0.78));
        vec3 lightCut = baseGrass * (uIsDome > 0.5 ? vec3(1.06, 1.11, 1.05) : vec3(1.12, 1.15, 1.02));
        vec3 turfCol = mix(darkCut, lightCut, mow) * (1.0 + micro);

        // Subtle turf wear & ambient lip near warning track
        float nearTrack = smoothstep(fDist - 7.5, fDist - 4.1, distHome) * (1.0 - smoothstep(fDist - 4.1, fDist - 3.6, distHome));
        turfCol *= 1.0 - nearTrack * 0.06;

        // Concourse concrete expansion grid outside the fence
        float grid = (1.0 - smoothstep(0.0, 0.08, abs(fract(fp.x * 0.16) - 0.5))) * 0.06;
        vec3 apronCol = uConcourseColor * (0.94 + grid + (nbNoise(fp * 0.8) - 0.5) * 0.05);

        diffuseColor.rgb = mix(turfCol, apronCol, apronMask);
        float nbMowRough = mix(0.90, 0.74, mow);
      `)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(nbMowRough, 0.92, apronMask);
      `);
  };
  return uniforms;
}

export function enhanceDirtMaterial(material, gl) {
  if (gl.isSoftwareRenderer) return;
  material.customProgramCacheKey = () => 'nb-dirt-v56';
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vNbDirtWorld;')
      .replace('#include <project_vertex>', 'vec4 nbDirtWp = modelMatrix * vec4(transformed, 1.0);\nvNbDirtWorld = nbDirtWp.xyz;\n#include <project_vertex>');

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vNbDirtWorld;
        float nbDirtHash(vec2 p) {
          p = fract(p * vec2(234.13, 567.89));
          p += dot(p, p + 19.19);
          return fract(p.x * p.y);
        }
        float nbDirtNoise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(nbDirtHash(i), nbDirtHash(i + vec2(1.0, 0.0)), f.x),
                     mix(nbDirtHash(i + vec2(0.0, 1.0)), nbDirtHash(i + vec2(1.0, 1.0)), f.x), f.y);
        }
      `)
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec2 fp = vec2(vNbDirtWorld.x, -vNbDirtWorld.z);
        float fw = fwidth(fp.x) + fwidth(fp.y);
        float detail = 1.0 - smoothstep(0.05, 0.35, fw);

        // Groundskeeping concentric rake rings on mound & home circle + arc raking on infield skin
        float dMound = distance(fp, vec2(0.0, 18.4));
        float dHome = length(fp);
        float rakeMound = sin(dMound * 26.0) * smoothstep(3.1, 2.2, dMound);
        float rakeHome = sin(dHome * 24.0) * smoothstep(3.8, 2.6, dHome);
        float rakeArc = sin(distance(fp, vec2(0.0, 18.0)) * 20.0) * smoothstep(15.0, 18.0, distance(fp, vec2(0.0, 18.0)));
        float rake = (rakeMound + rakeHome + rakeArc * 0.65) * 0.032 * detail;

        // Damp clay richness near mound rubber & batter's boxes
        float damp = smoothstep(2.9, 0.5, dMound) * 0.10 + smoothstep(2.8, 0.7, dHome) * 0.08;
        float grain = (nbDirtNoise(fp * 22.0) - 0.5) * 0.09 * detail + (nbDirtNoise(fp * 3.5) - 0.5) * 0.05;

        diffuseColor.rgb *= (1.0 - damp + rake + grain);
      `)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(0.92 - damp * 0.35 - rake * 1.5, 0.72, 0.98);
      `);
  };
}

export function enhanceCrowdMaterial(material, gl, crowdUniforms) {
  if (gl.isSoftwareRenderer || material.userData.crowdEnhanced) return;
  material.userData.crowdEnhanced = true;
  material.customProgramCacheKey = () => 'nb-crowd-v56';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCrowdTime = crowdUniforms.uCrowdTime;
    shader.uniforms.uCrowdExcite = crowdUniforms.uCrowdExcite;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uCrowdTime;
        uniform float uCrowdExcite;
      `)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 instPos = instanceMatrix[3].xyz;
          float seed = fract(sin(dot(instPos.xz, vec2(12.9898, 78.233))) * 43758.5453);
          float speed = mix(3.4, 11.5, uCrowdExcite);
          float amp = mix(0.055, 0.34, uCrowdExcite);
          float wave = instPos.x * 0.045;
          float bounce = abs(sin(uCrowdTime * speed + seed * 6.2831 + wave));
          transformed.y += bounce * amp;
          transformed.x += sin(uCrowdTime * (speed * 0.5) + seed * 12.0) * (0.02 + uCrowdExcite * 0.06);
        #endif
      `);
  };
}

const RIBBON_POINTS = 18;
const MAX_PARTICLES = 120;

export class StadiumVFX {
  constructor(renderer) {
    this.r = renderer;
    this.software = renderer.gl.isSoftwareRenderer;
    this.crowdUniforms = {
      uCrowdTime: { value: 0 },
      uCrowdExcite: { value: 0 }
    };
    if (this.software) return;

    const scene = renderer.scene;
    this.particleTex = createParticleTexture();

    // 1. Tapered 3D camera-facing ball ribbon trail (works for both pitches and batted/thrown balls)
    const ribbonGeo = new T.BufferGeometry();
    this.ribbonPos = new Float32Array(RIBBON_POINTS * 2 * 3);
    this.ribbonCol = new Float32Array(RIBBON_POINTS * 2 * 4);
    const ribbonIdx = [];
    for (let i = 0; i < RIBBON_POINTS - 1; i++) {
      const k = i * 2;
      ribbonIdx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
    ribbonGeo.setAttribute('position', new T.BufferAttribute(this.ribbonPos, 3));
    ribbonGeo.setAttribute('color', new T.BufferAttribute(this.ribbonCol, 4));
    ribbonGeo.setIndex(ribbonIdx);
    this.ribbon = new T.Mesh(ribbonGeo, new T.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      side: T.DoubleSide,
      fog: false
    }));
    this.ribbon.frustumCulled = false;
    this.ribbon.visible = false;
    this.ribbon.userData.dynamic = true;
    scene.add(this.ribbon);

    // 2. Bat-swing motion-blur crescent arc
    const arcSegs = 14;
    const arcGeo = new T.BufferGeometry();
    this.arcPos = new Float32Array((arcSegs + 1) * 2 * 3);
    this.arcCol = new Float32Array((arcSegs + 1) * 2 * 4);
    const arcIdx = [];
    for (let i = 0; i < arcSegs; i++) {
      const k = i * 2;
      arcIdx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
    arcGeo.setAttribute('position', new T.BufferAttribute(this.arcPos, 3));
    arcGeo.setAttribute('color', new T.BufferAttribute(this.arcCol, 4));
    arcGeo.setIndex(arcIdx);
    this.swingArc = new T.Mesh(arcGeo, new T.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      side: T.DoubleSide,
      fog: false
    }));
    this.swingArc.frustumCulled = false;
    this.swingArc.visible = false;
    this.swingArc.userData.dynamic = true;
    scene.add(this.swingArc);

    // 3. Contact shockwave ring (bat-ball contact & mitt pop)
    this.shockRing = new T.Mesh(
      new T.RingGeometry(0.68, 1.0, 36),
      new T.MeshBasicMaterial({
        color: 0xfff3a8,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: T.AdditiveBlending,
        side: T.DoubleSide,
        fog: false
      })
    );
    this.shockRing.visible = false;
    this.shockRing.userData.dynamic = true;
    scene.add(this.shockRing);
    this.shockState = null;

    // 4. Unified 3D Instanced Particle Pool (sparks, dirt dust, slide plumes, HR fireworks)
    const pGeo = new T.PlaneGeometry(1, 1);
    this.sparkMesh = new T.InstancedMesh(pGeo, new T.MeshBasicMaterial({
      map: this.particleTex,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: T.AdditiveBlending,
      side: T.DoubleSide,
      fog: false
    }), MAX_PARTICLES);
    this.dustMesh = new T.InstancedMesh(pGeo, new T.MeshBasicMaterial({
      map: this.particleTex,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
      side: T.DoubleSide
    }), MAX_PARTICLES);
    for (const m of [this.sparkMesh, this.dustMesh]) {
      m.instanceMatrix.setUsage(T.DynamicDrawUsage);
      m.frustumCulled = false;
      m.count = 0;
      m.userData.dynamic = true;
      scene.add(m);
    }

    this.sparks = [];
    this.dust = [];
    this.lastField = null;
    this.lastImpactTime = -1;
    this.lastSlideEmit = 0;
    this.lastFirework = 0;
    this.lastTimeSec = null;
    this._dummy = new T.Object3D();
    this._color = new T.Color();
    this._camLocal = new T.Vector3();
    this._dir = new T.Vector3();
    this._side = new T.Vector3();
    this._p = new T.Vector3();
    this._next = new T.Vector3();
  }

  spawnSpark(x, y, z, vx, vy, vz, colorHex, size = 0.22, maxLife = 0.38, gravity = 9.0) {
    if (this.sparks.length >= MAX_PARTICLES) this.sparks.shift();
    this.sparks.push({ x, y, z, vx, vy, vz, colorHex, size, age: 0, maxLife, gravity });
  }

  spawnDust(x, y, z, vx, vy, vz, colorHex = 0xd7ad84, size = 0.45, maxLife = 0.55) {
    if (this.dust.length >= MAX_PARTICLES) this.dust.shift();
    this.dust.push({ x, y, z, vx, vy, vz, colorHex, size, age: 0, maxLife });
  }

  burstContact(x, y, z, perfect, power) {
    const count = perfect ? 26 : power ? 18 : 12;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (i % 3) * 0.21;
      const spd = (perfect ? 5.5 : 3.6) + (i % 5) * 1.45;
      const col = perfect ? (i % 3 === 0 ? 0x8ef6ff : 0xffdf5e) : power ? 0xffae42 : 0xfff1b8;
      this.spawnSpark(
        x, y, z,
        Math.cos(a) * spd,
        Math.sin(a) * spd * 0.72 + 1.4,
        1.8 + (i % 4) * 1.3,
        col,
        perfect ? 0.26 : 0.18,
        perfect ? 0.42 : 0.28,
        8.5
      );
    }
    this.shockState = {
      x, y, z,
      age: 0,
      maxLife: perfect ? 0.28 : 0.20,
      maxScale: perfect ? 1.85 : 1.15,
      color: perfect ? 0x9cf8ff : power ? 0xffbe55 : 0xfff0aa
    };
  }

  burstFirework(x, y, z, palette) {
    for (let i = 0; i < 28; i++) {
      const phi = Math.acos(1 - 2 * ((i + 0.5) / 28));
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const spd = 9 + (i % 4) * 3.2;
      this.spawnSpark(
        x, y, z,
        Math.sin(phi) * Math.cos(theta) * spd,
        Math.cos(phi) * spd + 2.2,
        Math.sin(phi) * Math.sin(theta) * spd,
        palette[i % palette.length],
        0.95,
        0.95,
        6.2
      );
    }
  }

  updateRibbonFromPoints(points, headWidth, headHex, tailHex, opacity = 0.78) {
    if (!points || points.length < 2) {
      this.ribbon.visible = false;
      return;
    }
    const cam = this.r.camera.position;
    // Convert camera world pos to scene local space (scene.scale.z = -1)
    this._camLocal.set(cam.x, cam.y, -cam.z);
    const headCol = new T.Color(headHex);
    const tailCol = new T.Color(tailHex);
    const n = points.length;

    for (let i = 0; i < RIBBON_POINTS; i++) {
      const u = i / (RIBBON_POINTS - 1);
      const srcIdx = u * (n - 1);
      const i0 = Math.floor(srcIdx), i1 = Math.min(n - 1, i0 + 1), f = srcIdx - i0;
      const a = points[i0], b = points[i1];
      this._p.set(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, a.z + (b.z - a.z) * f);

      const adj = i < RIBBON_POINTS - 1 ? points[Math.min(n - 1, i0 + 1)] : points[Math.max(0, i0 - 1)];
      this._dir.set(adj.x - a.x, adj.y - a.y, adj.z - a.z);
      if (this._dir.lengthSq() < 1e-6) this._dir.set(0, 0, 1);
      this._dir.normalize();

      this._side.subVectors(this._camLocal, this._p).cross(this._dir);
      if (this._side.lengthSq() < 1e-6) this._side.set(1, 0, 0);
      this._side.normalize();

      // u=0 is tail, u=1 is head at ball
      const width = headWidth * (0.08 + 0.92 * Math.pow(u, 1.35));
      const alpha = opacity * Math.pow(u, 1.65) * (u > 0.96 ? 0.65 : 1.0);
      this._color.copy(tailCol).lerp(headCol, Math.pow(u, 0.85));

      const vIdx = i * 6, cIdx = i * 8;
      this.ribbonPos[vIdx] = this._p.x + this._side.x * width;
      this.ribbonPos[vIdx + 1] = this._p.y + this._side.y * width;
      this.ribbonPos[vIdx + 2] = this._p.z + this._side.z * width;
      this.ribbonPos[vIdx + 3] = this._p.x - this._side.x * width;
      this.ribbonPos[vIdx + 4] = this._p.y - this._side.y * width;
      this.ribbonPos[vIdx + 5] = this._p.z - this._side.z * width;

      for (const off of [0, 4]) {
        this.ribbonCol[cIdx + off] = this._color.r;
        this.ribbonCol[cIdx + off + 1] = this._color.g;
        this.ribbonCol[cIdx + off + 2] = this._color.b;
        this.ribbonCol[cIdx + off + 3] = alpha;
      }
    }
    this.ribbon.geometry.attributes.position.needsUpdate = true;
    this.ribbon.geometry.attributes.color.needsUpdate = true;
    this.ribbon.visible = true;
  }

  updateSwingArc(g, batter, fieldMode) {
    const swinging = !fieldMode && g && !g.bunt && g.swingAge >= 0 && g.swingAge < 230;
    const contactFollow = fieldMode && g?.field && !g.replayView && g.field.elapsed < 0.14 && !g.field.foul && !g.derby;
    if (!swinging && !contactFollow) {
      this.swingArc.visible = false;
      return;
    }
    const progress = contactFollow ? clamp(0.45 + g.field.elapsed * 3.8, 0, 1) : clamp(g.swingAge / 210, 0, 1);
    const side = (g.battingHand || g.batter?.hand) === 'L' ? -1 : 1;
    const bx = side === -1 ? 1.65 : -1.65, bz = -0.25;
    const hotCol = g.power || g.field?.perfect ? new T.Color(0xffb84a) : new T.Color(0xb8f0ff);
    const tipCol = g.power || g.field?.perfect ? new T.Color(0xfff6c4) : new T.Color(0xffffff);
    const arcSegs = 14;
    const span = 0.42;
    const startP = Math.max(0, progress - span);
    const fade = 1 - Math.pow(progress, 2.2);

    for (let i = 0; i <= arcSegs; i++) {
      const t = i / arcSegs;
      const s = startP + (progress - startP) * t;
      const yaw = (side === -1 ? -0.65 : 0.65) - side * s * 3.15;
      const baseR = 0.52, tipR = 2.18;
      const yBase = 1.72 - s * 0.12, yTip = 1.88 - Math.sin(s * Math.PI) * 0.28;

      const sinY = Math.sin(yaw + side * 1.15), cosY = Math.cos(yaw + side * 1.15);
      const vIdx = i * 6, cIdx = i * 8;
      this.arcPos[vIdx] = bx + sinY * baseR;
      this.arcPos[vIdx + 1] = yBase;
      this.arcPos[vIdx + 2] = bz + cosY * baseR;
      this.arcPos[vIdx + 3] = bx + sinY * tipR;
      this.arcPos[vIdx + 4] = yTip;
      this.arcPos[vIdx + 5] = bz + cosY * tipR;

      const aInner = 0.08 * Math.pow(t, 1.8) * fade;
      const aOuter = (g.power ? 0.56 : 0.40) * Math.pow(t, 1.6) * fade;
      this.arcCol[cIdx] = hotCol.r; this.arcCol[cIdx + 1] = hotCol.g; this.arcCol[cIdx + 2] = hotCol.b; this.arcCol[cIdx + 3] = aInner;
      this.arcCol[cIdx + 4] = tipCol.r; this.arcCol[cIdx + 5] = tipCol.g; this.arcCol[cIdx + 6] = tipCol.b; this.arcCol[cIdx + 7] = aOuter;
    }
    this.swingArc.geometry.attributes.position.needsUpdate = true;
    this.swingArc.geometry.attributes.color.needsUpdate = true;
    this.swingArc.visible = fade > 0.02;
  }

  update(g, timeMs, fieldMode) {
    const tSec = timeMs * 0.001;
    this.crowdUniforms.uCrowdTime.value = tSec;
    const isHR = g?.hit?.kind === 'hr' || g?.field?.outcome === 'hr';
    const isHit = fieldMode && g?.field && !g.field.foul;
    const targetExcite = isHR ? 1.0 : (g?.phase === 'result' && ['single', 'double', 'triple'].includes(g?.hit?.kind)) ? 0.72 : isHit ? 0.35 : 0.0;
    this.crowdUniforms.uCrowdExcite.value += (targetExcite - this.crowdUniforms.uCrowdExcite.value) * 0.08;

    if (this.r.sky?.material?.uniforms?.uTime) {
      this.r.sky.material.uniforms.uTime.value = tSec;
    }
    if (this.software) return;

    const parkId = g?.park?.id || null;
    if (this.lastParkId !== parkId) {
      this.lastParkId = parkId;
      this.sparks.length = 0;
      this.dust.length = 0;
      this.shockState = null;
      this.hrCelebratedField = null;
    }

    const dt = this.lastTimeSec == null ? 0.016 : clamp(tSec - this.lastTimeSec, 0, 0.05);
    this.lastTimeSec = tSec;

    // Update 3D Ball Ribbon Trail
    if (fieldMode && g?.field) {
      const f = g.field;
      // Trigger contact flash once per new live batted ball
      if (this.lastField !== f) {
        this.lastField = f;
        this.lastImpactTime = -1;
        if (f.elapsed < 0.12 && !f.foul && !g.replayView) {
          this.burstContact(0, 1.05, 0.55, !!f.perfect, !!g.power || (g.hit?.exitKmh >= 150));
        }
      }
      const hot = isHR || f.perfect || (g.hit?.exitKmh >= 152);
      const runningAfterHomer=g.phase==='result'&&f.outcome==='hr'&&!g.derby;
      const pts = runningAfterHomer?[]:f.trail.slice(-RIBBON_POINTS).map(p => ({ x: p.x, y: p.z + 0.08, z: p.y }));
      if(!runningAfterHomer)pts.push({ x: f.ball.x, y: f.ball.z + 0.08, z: f.ball.y });
      this.updateRibbonFromPoints(
        pts,
        hot ? 0.15 : 0.095,
        hot ? 0xfff8c8 : 0xfffce8,
        isHR ? 0xff6e2e : hot ? 0xffa834 : 0xffe08a,
        hot ? 0.86 : 0.64
      );

      // Bounce / wall impact particles
      if (f.impact && f.impact.time !== this.lastImpactTime && f.elapsed - f.impact.time < 0.25) {
        this.lastImpactTime = f.impact.time;
        const wall = f.impact.type === 'wall';
        for (let i = 0; i < (wall ? 12 : 9); i++) {
          const a = (i / 9) * Math.PI * 2;
          const spd = 1.6 + (i % 3) * 1.1;
          if (wall) {
            this.spawnSpark(f.impact.x, Math.max(0.8, f.ball.z), f.impact.y, Math.cos(a) * spd, 1.5 + (i % 3), -Math.abs(Math.sin(a)) * spd, 0xffe394, 0.24, 0.34, 7.5);
          } else {
            const onDirt = Math.hypot(f.impact.x, f.impact.y - 18.4) < 28 && f.impact.y < 43;
            this.spawnDust(f.impact.x, 0.16, f.impact.y, Math.cos(a) * spd * 0.7, 1.2 + (i % 3) * 0.6, Math.sin(a) * spd * 0.7, onDirt ? 0xd8aa7e : 0x8fc088, 0.36, 0.42);
          }
        }
      }

      // Runner slide dust plumes & Fielder dive dust
      if (tSec - this.lastSlideEmit > 0.045) {
        this.lastSlideEmit = tSec;
        const elapsed = f.elapsed + (g.phase === 'result' ? g.phaseTime / 1000 : 0);
        for (const r of f.runners) {
          const sAge = elapsed - (r.slide?.time ?? -9);
          if (sAge >= 0 && sAge < 0.42 && !r.out) {
            this.spawnDust(r.x + (Math.random() - 0.5) * 0.4, 0.18, r.y + (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 1.1, 0.7 + Math.random() * 0.6, (Math.random() - 0.5) * 1.1, 0xe2ba91, 0.62, 0.52);
          }
        }
        for (const fd of f.fielders) {
          const aAge = elapsed - (fd.action?.time ?? -9);
          if (fd.action?.type === 'dive' && aAge >= 0 && aAge < 0.32) {
            this.spawnDust(fd.x, 0.20, fd.y, (Math.random() - 0.5) * 1.3, 0.8, (Math.random() - 0.5) * 1.3, fd.y < 42 ? 0xd9ad82 : 0x8ab882, 0.55, 0.46);
          }
        }
      }

      // Home Run Stadium Fireworks!
      if (isHR && !g.park?.roofHeight) {
        const palettes = [
          [0xffdf59, 0xff7b39, 0xffffff],
          [0x6ce8ff, 0x4f9dff, 0xfff5c0],
          [0xff66a3, 0xffe46b, 0x9effb8]
        ];
        const centerZ = g.park?.center || 122;
        if (this.hrCelebratedField !== f) {
          this.hrCelebratedField = f;
          this.lastFirework = tSec;
          this.burstFirework(-11, 17.5, centerZ + 7, palettes[0]);
          this.burstFirework(11, 19.5, centerZ + 9, palettes[1]);
        } else if (tSec - this.lastFirework > 0.38) {
          this.lastFirework = tSec;
          const fx = (Math.random() - 0.5) * 34;
          const fy = 15 + Math.random() * 13;
          const fz = centerZ + 6 + Math.random() * 9;
          this.burstFirework(fx, fy, fz, palettes[Math.floor(Math.random() * palettes.length)]);
        }
      }
    } else if (g && ['pitch', 'miss'].includes(g.phase) && g.pitch) {
      this.lastField = null;
      const uEnd = Math.min(1.24, g.pitch.progress + (g.phase === 'miss' ? g.phaseTime / g.pitch.duration : 0));
      if (uEnd > 0.05) {
        const pts = [];
        const span = 0.24, steps = 10;
        for (let i = 0; i <= steps; i++) {
          const u = Math.max(0, uEnd - span * (1 - i / steps));
          const p = g.pitchAt(u);
          pts.push({ x: p.x * 0.68, y: 2.10 - 0.85 * u - p.y * 0.62, z: 17.2 * (1 - u) + 0.6 });
        }
        const fast = (g.pitch.speed || 145) >= 149 || g.pitch.id === 'fast';
        this.updateRibbonFromPoints(
          pts,
          fast ? 0.088 : 0.072,
          0xffffff,
          fast ? 0xffd97d : 0x7fd8ff,
          fast ? 0.68 : 0.52
        );
      } else {
        this.ribbon.visible = false;
      }
    } else {
      this.ribbon.visible = false;
    }

    this.updateSwingArc(g, this.r.batter, fieldMode);

    // Update shockwave ring
    if (this.shockState) {
      this.shockState.age += dt;
      const u = this.shockState.age / this.shockState.maxLife;
      if (u >= 1) {
        this.shockRing.visible = false;
        this.shockState = null;
      } else {
        this.shockRing.visible = true;
        this.shockRing.position.set(this.shockState.x, this.shockState.y, this.shockState.z);
        this.shockRing.lookAt(this.r.camera.position);
        const sc = 0.18 + this.shockState.maxScale * (1 - Math.pow(1 - u, 2.4));
        this.shockRing.scale.setScalar(sc);
        this.shockRing.material.color.setHex(this.shockState.color);
        this.shockRing.material.opacity = (1 - u) * 0.85;
      }
    } else {
      this.shockRing.visible = false;
    }

    // Step & upload instanced sparks (billboarded in scene-local space where scene.scale.z = -1)
    const camPos = this.r.camera.position;
    this._camLocal.set(camPos.x, camPos.y, -camPos.z);
    let sCount = 0;
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i];
      p.age += dt;
      if (p.age >= p.maxLife) { this.sparks.splice(i, 1); continue; }
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const life = 1 - p.age / p.maxLife;
      this._dummy.position.set(p.x, p.y, p.z);
      this._dummy.lookAt(this._camLocal);
      this._dummy.scale.setScalar(p.size * (0.35 + 0.65 * life));
      this._dummy.updateMatrix();
      this.sparkMesh.setMatrixAt(sCount, this._dummy.matrix);
      this._color.setHex(p.colorHex).multiplyScalar(life);
      this.sparkMesh.setColorAt(sCount, this._color);
      sCount++;
    }
    this.sparkMesh.count = sCount;
    if (sCount > 0) {
      this.sparkMesh.instanceMatrix.needsUpdate = true;
      if (this.sparkMesh.instanceColor) this.sparkMesh.instanceColor.needsUpdate = true;
    }

    // Step & upload instanced dust plumes
    let dCount = 0;
    for (let i = this.dust.length - 1; i >= 0; i--) {
      const p = this.dust[i];
      p.age += dt;
      if (p.age >= p.maxLife) { this.dust.splice(i, 1); continue; }
      p.vx *= 0.94; p.vz *= 0.94; p.vy *= 0.96;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const u = p.age / p.maxLife;
      this._dummy.position.set(p.x, p.y, p.z);
      this._dummy.lookAt(this._camLocal);
      this._dummy.scale.setScalar(p.size * (0.55 + 1.35 * u) * (1 - u * 0.45));
      this._dummy.updateMatrix();
      this.dustMesh.setMatrixAt(dCount, this._dummy.matrix);
      this._color.setHex(p.colorHex).multiplyScalar(0.65 + 0.35 * (1 - u));
      this.dustMesh.setColorAt(dCount, this._color);
      dCount++;
    }
    this.dustMesh.count = dCount;
    if (dCount > 0) {
      this.dustMesh.instanceMatrix.needsUpdate = true;
      if (this.dustMesh.instanceColor) this.dustMesh.instanceColor.needsUpdate = true;
    }
  }
}
