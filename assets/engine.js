/**
 * 《山海汴京圖》v4 — Vast 4-Realm Fine-Art Splash-Ink WebGL2 Engine & 7 Living Creatures
 * Features:
 *   - 380m x 400m Explorable Fine-Art Song World with Live Realm Discovery Whisper
 *   - 7 Animated Mythic Creatures: 70m Winged Yinglong Dragon, Twin Celestial Kuns, 3 Vermilion Phoenixes,
 *     2 Nine-Tailed Spirit Foxes, 2 Golden-Antlered Spirit Stags, 28 Leaping Spirit Koi, 18 Ink Cranes + 4 Lantern Boats
 *   - Preserves v3 Museum Aesthetics: Splash-Ink Mineral Washes, Mountain-Base Mist Dissolution,
 *     True Planar Mirror Water + Boatman Ripples, Capillary Xuan-Paper Ink-Bleed, Wet-Edge Pooling & Gold-Flecked Paper
 *   - Unobstructed 360° First-Person Flight (Shift Wind-Boost!) + 4 Guided Mythic Realm Tours
 *
 * 100% Zero External Dependencies · Native WebGL2 + GLSL ES 3.00 · Built by Gemini 4 Neon
 */
const ShanHaiEngine = (() => {
  "use strict";

  /* ==========================================================================
     1. Mat4 Math Utilities
     ========================================================================== */
  function mat4Identity() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; }
  function mat4Mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }
  function mat4Perspective(fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy * 0.5), nf = 1.0 / (near - far), m = new Float32Array(16);
    m[0] = f / aspect; m[5] = f; m[10] = (far + near) * nf; m[11] = -1; m[14] = 2 * far * near * nf;
    return m;
  }
  function mat4Ortho(l, r, b, t, n, f) {
    const m = new Float32Array(16);
    m[0] = 2 / (r - l); m[5] = 2 / (t - b); m[10] = -2 / (f - n);
    m[12] = -(r + l) / (r - l); m[13] = -(t + b) / (t - b); m[14] = -(f + n) / (f - n); m[15] = 1;
    return m;
  }
  function mat4LookAt(eye, target, up) {
    let zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
    let len = Math.hypot(zx, zy, zz) || 1; zx /= len; zy /= len; zz /= len;
    let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
    len = Math.hypot(xx, xy, xz) || 1; xx /= len; xy /= len; xz /= len;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    const m = new Float32Array(16);
    m[0] = xx; m[1] = yx; m[2] = zx; m[4] = xy; m[5] = yy; m[6] = zy; m[8] = xz; m[9] = yz; m[10] = zz;
    m[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
    m[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
    m[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]); m[15] = 1;
    return m;
  }
  function mat4ModelTRS(tx, ty, tz, rx, ry, rz, sx, sy, sz) {
    const cx = Math.cos(rx), sxr = Math.sin(rx), cy = Math.cos(ry), syr = Math.sin(ry), cz = Math.cos(rz), szr = Math.sin(rz);
    const m = new Float32Array(16);
    m[0] = (cy * cz + syr * sxr * szr) * sx; m[1] = (cx * szr) * sx; m[2] = (-syr * cz + cy * sxr * szr) * sx;
    m[4] = (-cy * szr + syr * sxr * cz) * sy; m[5] = (cx * cz) * sy; m[6] = (syr * szr + cy * sxr * cz) * sy;
    m[8] = (syr * cx) * sz; m[9] = (-sxr) * sz; m[10] = (cy * cx) * sz;
    m[12] = tx; m[13] = ty; m[14] = tz; m[15] = 1;
    return m;
  }
  function projectPoint(vp, x, y, z) {
    const cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12];
    const cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13];
    const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
    if (cw <= 0.001) return { u: 0.5, v: 0.65, inFront: false };
    return { u: (cx / cw) * 0.5 + 0.5, v: (cy / cw) * 0.5 + 0.5, inFront: true };
  }
  function invertMat4(m) {
    const inv = new Float32Array(16);
    inv[0] = m[5]*m[10]*m[15] - m[5]*m[11]*m[14] - m[9]*m[6]*m[15] + m[9]*m[7]*m[14] + m[13]*m[6]*m[11] - m[13]*m[7]*m[10];
    inv[4] = -m[4]*m[10]*m[15] + m[4]*m[11]*m[14] + m[8]*m[6]*m[15] - m[8]*m[7]*m[14] - m[12]*m[6]*m[11] + m[12]*m[7]*m[10];
    inv[8] = m[4]*m[9]*m[15] - m[4]*m[11]*m[13] - m[8]*m[5]*m[15] + m[8]*m[7]*m[13] + m[12]*m[5]*m[11] - m[12]*m[7]*m[9];
    inv[12] = -m[4]*m[9]*m[14] + m[4]*m[10]*m[13] + m[8]*m[5]*m[14] - m[8]*m[6]*m[13] - m[12]*m[5]*m[10] + m[12]*m[6]*m[9];
    inv[1] = -m[1]*m[10]*m[15] + m[1]*m[11]*m[14] + m[9]*m[2]*m[15] - m[9]*m[3]*m[14] - m[13]*m[2]*m[11] + m[13]*m[3]*m[10];
    inv[5] = m[0]*m[10]*m[15] - m[0]*m[11]*m[14] - m[8]*m[2]*m[15] + m[8]*m[3]*m[14] + m[12]*m[2]*m[11] - m[12]*m[3]*m[10];
    inv[9] = -m[0]*m[9]*m[15] + m[0]*m[11]*m[13] + m[8]*m[1]*m[15] - m[8]*m[3]*m[13] - m[12]*m[1]*m[11] + m[12]*m[3]*m[9];
    inv[13] = m[0]*m[9]*m[14] - m[0]*m[10]*m[13] - m[8]*m[1]*m[14] + m[8]*m[2]*m[13] + m[12]*m[1]*m[10] - m[12]*m[2]*m[9];
    inv[2] = m[1]*m[6]*m[15] - m[1]*m[7]*m[14] - m[5]*m[2]*m[15] + m[5]*m[3]*m[14] + m[13]*m[2]*m[7] - m[13]*m[3]*m[6];
    inv[6] = -m[0]*m[6]*m[15] + m[0]*m[7]*m[14] + m[4]*m[2]*m[15] - m[4]*m[3]*m[14] - m[12]*m[2]*m[7] + m[12]*m[3]*m[6];
    inv[10] = m[0]*m[5]*m[15] - m[0]*m[7]*m[13] - m[4]*m[1]*m[15] + m[4]*m[3]*m[13] + m[12]*m[1]*m[7] - m[12]*m[3]*m[5];
    inv[14] = -m[0]*m[5]*m[14] + m[0]*m[6]*m[13] + m[4]*m[1]*m[14] - m[4]*m[2]*m[13] - m[12]*m[1]*m[6] + m[12]*m[2]*m[5];
    inv[3] = -m[1]*m[6]*m[11] + m[1]*m[7]*m[10] + m[5]*m[2]*m[11] - m[5]*m[3]*m[10] - m[9]*m[2]*m[7] + m[9]*m[3]*m[6];
    inv[7] = m[0]*m[6]*m[11] - m[0]*m[7]*m[10] - m[4]*m[2]*m[11] + m[4]*m[3]*m[10] + m[8]*m[2]*m[7] - m[8]*m[3]*m[6];
    inv[11] = -m[0]*m[5]*m[11] + m[0]*m[7]*m[9] + m[4]*m[1]*m[11] - m[4]*m[3]*m[9] - m[8]*m[1]*m[7] + m[8]*m[3]*m[5];
    inv[15] = m[0]*m[5]*m[10] - m[0]*m[6]*m[9] - m[4]*m[1]*m[10] + m[4]*m[2]*m[9] + m[8]*m[1]*m[6] - m[8]*m[2]*m[5];
    let det = 1.0 / ((m[0]*inv[0] + m[1]*inv[4] + m[2]*inv[8] + m[3]*inv[12]) || 1.0);
    for (let i = 0; i < 16; i++) inv[i] *= det;
    return inv;
  }

  /* ==========================================================================
     2. Shared Museum Palette & Extended Long-Range Paper-Mist GLSL
     ========================================================================== */
  const GLSL_COMMON = /* glsl */`
    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }
    float vnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
        mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }
    float fbm2(vec2 p) {
      float v = 0.0, a = 0.5;
      mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
      for (int i = 0; i < 4; i++) {
        v += a * vnoise(p);
        p = rot * p * 2.05 + vec2(7.3, 4.1);
        a *= 0.5;
      }
      return v;
    }

    vec3 getPaperColor(float nightV, float monoV) {
      vec3 xuanJade = vec3(0.935, 0.892, 0.798);
      vec3 xuanMono = vec3(0.945, 0.915, 0.848);
      vec3 xuanNgt  = vec3(0.065, 0.115, 0.195);
      vec3 c = mix(xuanJade, xuanNgt, nightV);
      return mix(c, xuanMono, monoV);
    }

    vec3 getSkyColor(vec3 dir, vec3 sunDir, float nightV, float monoV) {
      float h = clamp(dir.y, -0.1, 1.0);
      vec3 dayHor = vec3(0.955, 0.905, 0.795);
      vec3 dayMid = vec3(0.875, 0.885, 0.822);
      vec3 dayTop = vec3(0.665, 0.768, 0.758);
      vec3 dayCol = mix(dayHor, dayMid, smoothstep(0.0, 0.30, h));
      dayCol = mix(dayCol, dayTop, smoothstep(0.26, 0.85, h));

      vec3 ngtHor = vec3(0.085, 0.145, 0.235);
      vec3 ngtMid = vec3(0.045, 0.085, 0.165);
      vec3 ngtTop = vec3(0.015, 0.032, 0.075);
      vec3 ngtCol = mix(ngtHor, ngtMid, smoothstep(0.0, 0.32, h));
      ngtCol = mix(ngtCol, ngtTop, smoothstep(0.28, 0.85, h));

      vec3 col = mix(dayCol, ngtCol, nightV);
      vec3 monoCol = mix(vec3(0.955, 0.922, 0.852), vec3(0.845, 0.822, 0.768), smoothstep(0.0, 0.82, h));
      col = mix(col, monoCol, monoV);

      float sunCos = max(dot(normalize(dir), normalize(sunDir)), 0.0);
      vec3 glowCol = mix(vec3(1.0, 0.74, 0.42), vec3(0.55, 0.76, 0.98), nightV);
      glowCol = mix(glowCol, vec3(0.98, 0.56, 0.36), monoV);
      col += glowCol * (pow(sunCos, 7.0) * 0.22 + pow(sunCos, 45.0) * 0.32);
      return col;
    }

    // Extended Open-World Song Mist (reveals colossal distant landmarks like Mount Buzhou Gate & Dragon across 260m!)
    vec3 applyInkMist(vec3 col, vec3 worldPos, vec3 camPos, vec3 sunDir, float nightV, float monoV, float isTerrain) {
      vec3 v = worldPos - camPos;
      float dist = length(v);
      vec3 dir = v / max(dist, 0.001);

      float distFog = 1.0 - exp(-pow(max(dist - 24.0, 0.0) * 0.0078, 1.32));
      float farWeight = smoothstep(32.0, 74.0, dist);
      float baseDissolve = isTerrain * farWeight * (1.0 - smoothstep(0.8, 19.0 + dist * 0.055, worldPos.y)) * 0.90;
      float lowValleyMist = exp(-max(worldPos.y - 0.8, 0.0) * 0.105) * smoothstep(28.0, 82.0, dist) * 0.65;

      float fogAmt = clamp(max(distFog, max(baseDissolve, lowValleyMist)), 0.0, 0.95);
      float sunAmt = pow(max(dot(dir, normalize(sunDir)), 0.0), 4.0);
      vec3 paper = getPaperColor(nightV, monoV);
      vec3 warmSunMist = mix(vec3(0.99, 0.89, 0.72), vec3(0.22, 0.34, 0.48), nightV);
      warmSunMist = mix(warmSunMist, vec3(0.98, 0.92, 0.82), monoV);
      return mix(col, mix(paper, warmSunMist, sunAmt * 0.45), fogAmt);
    }
  `;

  /* ==========================================================================
     3. Shaders (Including Unified Multi-Species Mythic Spirit Shader!)
     ========================================================================== */
  const VS_SHADOW = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aPos;
    layout(location=4) in vec4 aExtra;
    uniform mat4 uLightVP;
    uniform mat4 uModel;
    uniform float uTime;
    void main() {
      vec3 pos = aPos;
      if (aExtra.x > 8.5 && aExtra.x < 9.5 && aExtra.z > 0.05) pos.y += sin(uTime * 5.2 + aExtra.z * 2.0) * aExtra.z * 0.55;
      gl_Position = uLightVP * uModel * vec4(pos, 1.0);
    }
  `;
  const FS_SHADOW = `#version 300 es
    precision highp float;
    void main() {}
  `;

  const VS_SKY = `#version 300 es
    precision highp float;
    out vec2 vNDC;
    void main() {
      vec2 p = vec2((gl_VertexID == 1) ? 3.0 : -1.0, (gl_VertexID == 2) ? 3.0 : -1.0);
      vNDC = p;
      gl_Position = vec4(p, 0.9999, 1.0);
    }
  `;
  const FS_SKY = `#version 300 es
    precision highp float;
    in vec2 vNDC;
    uniform mat4 uInvVP;
    uniform vec3 uCamPos;
    uniform vec3 uSunDir;
    uniform float uTime;
    uniform float uNight;
    uniform float uMono;
    ${GLSL_COMMON}
    layout(location=0) out vec4 oColor;
    layout(location=1) out vec4 oData;
    layout(location=2) out vec4 oWire;

    void main() {
      vec4 wp = uInvVP * vec4(vNDC, 1.0, 1.0);
      vec3 dir = normalize(wp.xyz / wp.w - uCamPos);
      vec3 sunD = normalize(uSunDir);
      vec3 col = getSkyColor(dir, sunD, uNight, uMono);

      if (dir.y > 0.01) {
        vec2 cuv = dir.xz / (dir.y + 0.28) * 0.55 + vec2(uTime * 0.003, -uTime * 0.0015);
        float c1 = fbm2(cuv * 1.3);
        float c2 = fbm2(cuv * 2.5 + vec2(c1 * 1.4, -c1 * 0.8));
        float wash = smoothstep(0.46, 0.80, c2) * smoothstep(0.02, 0.24, dir.y) * smoothstep(0.85, 0.25, dir.y);
        vec3 washTint = mix(vec3(0.72, 0.80, 0.77), vec3(0.14, 0.24, 0.36), uNight);
        washTint = mix(washTint, vec3(0.82, 0.80, 0.74), uMono);
        col = mix(col, washTint, wash * 0.26);
      }

      float cosA = dot(dir, sunD);
      float disc = smoothstep(0.9980, 0.9989, cosA);
      float halo = pow(max(cosA, 0.0), 140.0);
      vec3 discCol = mix(vec3(0.88, 0.28, 0.19), vec3(0.96, 0.96, 0.92), uNight);
      discCol = mix(discCol, vec3(0.86, 0.20, 0.16), uMono);
      float sunEdge = smoothstep(0.9968, 0.9984, cosA) * (1.0 - disc);
      col = mix(col, discCol, disc * 0.86 + sunEdge * 0.28);
      col += mix(vec3(1.0, 0.68, 0.38), vec3(0.55, 0.78, 1.0), uNight) * halo * 0.48;

      if (uNight > 0.05 && dir.y > 0.08) {
        vec2 suv = floor(dir.xz / (dir.y + 0.18) * 145.0);
        float st = hash12(suv);
        float star = step(0.9968, st) * smoothstep(0.08, 0.34, dir.y) * (0.55 + 0.45 * sin(uTime * 2.2 + st * 90.0));
        col += vec3(0.92, 0.88, 0.74) * star * uNight * (1.0 - uMono) * 0.75;
      }

      float skyEm = disc * mix(0.45, 0.95, uNight) + halo * 0.35;
      oColor = vec4(col, 0.0);
      oData  = vec4(0.5, 0.5, 1.0, 0.0);
      oWire  = vec4(0.04, 0.0, clamp(skyEm, 0.0, 1.0), 1.0);
    }
  `;

  const VS_SOLID = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aPos;
    layout(location=1) in vec3 aNorm;
    layout(location=2) in vec3 aCol;
    layout(location=3) in vec3 aBary;
    layout(location=4) in vec4 aExtra;

    uniform mat4 uModel;
    uniform mat4 uView;
    uniform mat4 uProj;
    uniform mat4 uLightVP;
    uniform float uTime;

    out vec3 vWorldPos;
    out vec3 vNorm;
    out vec3 vCol;
    out vec3 vBary;
    out vec4 vExtra;
    out vec4 vLightPos;

    void main() {
      vec3 pos = aPos;
      // Crane wing flap (matId == 9.0)
      if (aExtra.x > 8.5 && aExtra.x < 9.5 && aExtra.z > 0.05) {
        pos.y += sin(uTime * 5.2 + aExtra.z * 2.0) * aExtra.z * 0.55;
      }
      // Fluttering Lantern Silk Tassels (matId == 8.0)
      if (aExtra.x > 7.5 && aExtra.x < 8.5) {
        float t = aExtra.y;
        pos.x += sin(uTime * 2.8 - t * 4.5 + pos.z) * t * 0.25;
        pos.z += cos(uTime * 2.1 - t * 3.8 + pos.x) * t * 0.14;
      }
      vec4 wp = uModel * vec4(pos, 1.0);
      vWorldPos = wp.xyz;
      vNorm = normalize(mat3(uModel) * aNorm);
      vCol = aCol; vBary = aBary; vExtra = aExtra;
      vLightPos = uLightVP * wp;
      gl_Position = uProj * uView * wp;
    }
  `;

  const FS_SOLID = `#version 300 es
    precision highp float;
    in vec3 vWorldPos;
    in vec3 vNorm;
    in vec3 vCol;
    in vec3 vBary;
    in vec4 vExtra;
    in vec4 vLightPos;

    uniform sampler2D uShadowMap;
    uniform vec3 uCamPos;
    uniform vec3 uSunDir;
    uniform float uTime;
    uniform float uNight;
    uniform float uMono;
    uniform float uClipY;

    ${GLSL_COMMON}

    layout(location=0) out vec4 oColor;
    layout(location=1) out vec4 oData;
    layout(location=2) out vec4 oWire;

    float calcShadow(vec4 lp, vec3 n, vec3 l) {
      vec3 sc = lp.xyz / lp.w * 0.5 + 0.5;
      if (sc.x < 0.01 || sc.x > 0.99 || sc.y < 0.01 || sc.y > 0.99 || sc.z > 0.995) return 1.0;
      float bias = max(0.0022 * (1.0 - dot(n, l)), 0.0007);
      vec2 t = vec2(1.0 / 1024.0);
      float sh = 0.0;
      sh += (sc.z - bias <= texture(uShadowMap, sc.xy).r) ? 1.0 : 0.0;
      sh += (sc.z - bias <= texture(uShadowMap, sc.xy + vec2( t.x,  t.y)).r) ? 1.0 : 0.0;
      sh += (sc.z - bias <= texture(uShadowMap, sc.xy + vec2(-t.x,  t.y)).r) ? 1.0 : 0.0;
      sh += (sc.z - bias <= texture(uShadowMap, sc.xy + vec2( t.x, -t.y)).r) ? 1.0 : 0.0;
      sh += (sc.z - bias <= texture(uShadowMap, sc.xy + vec2(-t.x, -t.y)).r) ? 1.0 : 0.0;
      return sh * 0.2;
    }

    void main() {
      if (uClipY > 0.5 && vWorldPos.y < -0.15) discard;
      vec3 N = normalize(vNorm), V = normalize(uCamPos - vWorldPos), L = normalize(uSunDir);
      float matId = vExtra.x, ao = clamp(vExtra.w, 0.35, 1.0), emissive = 0.0, edgeCtrl = 0.85;
      vec3 litCol;

      if (matId < 0.5) {
        edgeCtrl = 0.48;
        float h = vWorldPos.y, slope = 1.0 - clamp(N.y, 0.0, 1.0);
        vec2 mp = vec2(vWorldPos.x * 0.042 + vWorldPos.z * 0.032, h * 0.075);
        vec2 q = vec2(fbm2(mp), fbm2(mp + vec2(5.2, 1.3)));
        float splash = fbm2(mp + 2.9 * q);
        float cun = fbm2(vec2(vWorldPos.x * 0.16 + vWorldPos.z * 0.16, h * 0.44) + q * 0.85);
        float dryStroke = smoothstep(0.28, 0.78, cun);
        float crestDark = smoothstep(2.0, 28.0, h);
        float sunFace = dot(N, L) * 0.5 + 0.5;
        float inkStep = mix(sunFace, floor(sunFace * 4.5 + cun * 0.9) / 4.5, 0.38);

        float camDist = length(vWorldPos - uCamPos);
        float nearCrag = 1.0 - smoothstep(42.0, 66.0, camDist);

        vec3 sumiInk   = vec3(0.06, 0.10, 0.14);
        vec3 malachite = vec3(0.08, 0.44, 0.40);
        vec3 azurite   = vec3(0.07, 0.25, 0.46);
        vec3 ochreWash = vec3(0.54, 0.43, 0.28);
        vec3 paperMist = vec3(0.92, 0.88, 0.78);

        vec3 mineral = mix(malachite, azurite, smoothstep(0.28, 0.70, splash + crestDark * 0.38));
        mineral = mix(mineral, ochreWash, smoothstep(0.62, 0.90, sunFace) * (1.0 - crestDark * 0.70) * 0.32);
        vec3 jadeMount = mix(sumiInk, mineral, 0.28 + 0.72 * inkStep * dryStroke);
        float lowFade = smoothstep(0.0, 10.5, h);
        float baseWashAmt = (1.0 - lowFade) * (1.0 - nearCrag * 0.86);
        jadeMount = mix(jadeMount, mix(paperMist, vec3(0.24, 0.42, 0.44), 0.32 + 0.25 * dryStroke), baseWashAmt * 0.68);

        float rimView = pow(1.0 - max(dot(N, V), 0.0), 2.4);
        float goldLine = smoothstep(0.42, 0.84, sunFace) * smoothstep(4.0, 20.0, h) * (rimView * 0.80 + smoothstep(0.64, 0.90, cun) * 0.45);
        jadeMount += vec3(0.82, 0.60, 0.24) * goldLine * 0.82;

        vec3 ngtMount = mix(vec3(0.025, 0.055, 0.105), vec3(0.075, 0.165, 0.265), inkStep * dryStroke * (0.4 + 0.6 * crestDark));
        ngtMount += mix(vec3(0.85, 0.68, 0.34), vec3(0.42, 0.72, 0.95), 0.42) * rimView * smoothstep(3.5, 19.0, h) * (0.45 + 0.55 * sunFace) * 0.85;
        litCol = mix(jadeMount, ngtMount, uNight);

        if (uMono > 0.01) {
          float nearInkBoost = mix(lowFade, 0.92, nearCrag);
          float inkDensity = clamp(0.20 + 0.80 * (1.0 - inkStep * 0.56) * (0.45 + 0.55 * dryStroke) * (0.42 + 0.58 * nearInkBoost), 0.0, 1.0);
          vec3 sumiWash = mix(vec3(0.88, 0.85, 0.78), vec3(0.06, 0.07, 0.09), smoothstep(0.10, 0.86, inkDensity));
          sumiWash = mix(sumiWash, vec3(0.93, 0.90, 0.83), smoothstep(0.72, 0.92, cun) * slope * 0.42);
          litCol = mix(litCol, sumiWash, uMono);
        }

        float waterEdge = 1.0 - smoothstep(-0.2, 0.78, h);
        litCol = mix(litCol, getPaperColor(uNight, uMono) * mix(0.86, 1.08, uNight), waterEdge * 0.46);
        litCol = applyInkMist(litCol, vWorldPos, uCamPos, L, uNight, uMono, 1.0 - nearCrag * 0.72);
      } else {
        vec3 albedo = vCol;
        if (matId < 1.5) {
          float rib = sin(vExtra.y * 6.28318 * 1.4) * 0.5 + 0.5;
          albedo *= (0.78 + 0.32 * rib);
          vec3 H = normalize(L + V);
          albedo += mix(vec3(0.95, 0.78, 0.44), vec3(0.55, 0.74, 0.96), uNight) * pow(max(dot(N, H), 0.0), 26.0) * 0.45;
        } else if (matId > 3.5 && matId < 4.5) {
          float flick = 0.93 + 0.07 * sin(uTime * 3.6 + vWorldPos.x * 1.8 + vWorldPos.z * 1.3);
          float gx = abs(fract(vWorldPos.x * 2.5 + vWorldPos.z * 2.5) - 0.5);
          float gy = abs(fract(vWorldPos.y * 2.7) - 0.5);
          float mull = smoothstep(0.41, 0.48, max(gx, gy));
          vec3 glow = mix(albedo * 1.15, vec3(1.0, 0.56, 0.20), uNight * 0.35) * flick * mix(1.06, 1.55, uNight);
          albedo = mix(glow, vec3(0.12, 0.09, 0.08), mull * 0.48 * step(0.85, vExtra.w));
          emissive = mix(0.75, 1.0, uNight) * (1.0 - mull * 0.32);
        } else if (matId > 7.5 && matId < 8.5) {
          albedo = vec3(0.86, 0.17, 0.14);
          emissive = mix(0.18, 0.42, uNight);
        } else {
          albedo *= (0.84 + 0.28 * fbm2(vec2(vWorldPos.x * 2.2 + vWorldPos.z * 2.2, vWorldPos.y * 1.2)));
        }

        float shadow = (matId > 3.5 && matId < 4.5) ? 1.0 : calcShadow(vLightPos, N, L);
        float ndl = max(dot(N, L), 0.0);
        vec3 sunC = mix(vec3(1.08, 0.90, 0.66), vec3(0.38, 0.52, 0.80), uNight);
        vec3 ambC = mix(vec3(0.56, 0.62, 0.62), vec3(0.12, 0.18, 0.28), uNight);
        float dBridge = length(vWorldPos - vec3(0.0, 6.0, -19.0));
        float dPav = length(vWorldPos - vec3(-16.8, 7.5, -18.5));
        vec3 warmB = vec3(1.0, 0.48, 0.18) * (exp(-dBridge * 0.09) * 0.8 + exp(-dPav * 0.12) * 0.7) * mix(0.16, 0.92, uNight);

        litCol = (matId > 3.5 && matId < 4.5) ? albedo : albedo * (ambC * 0.75 + sunC * (ndl * shadow * 0.82 + 0.16)) * ao + warmB * albedo;
        if (uMono > 0.01) {
          float lum = dot(litCol, vec3(0.299, 0.587, 0.114));
          vec3 inkA = mix(vec3(0.07, 0.08, 0.10), vec3(0.88, 0.85, 0.78), smoothstep(0.04, 0.88, lum));
          float isRed = smoothstep(0.16, 0.36, litCol.r - max(litCol.g, litCol.b));
          if (matId > 3.5 && matId < 4.5) inkA = mix(vec3(0.95, 0.34, 0.18), vec3(1.0, 0.70, 0.34), 0.35);
          else inkA = mix(inkA, vec3(0.86, 0.16, 0.13), isRed * 0.95);
          litCol = mix(litCol, inkA, uMono);
        }
        litCol = applyInkMist(litCol, vWorldPos, uCamPos, L, uNight, uMono, 0.0);
      }

      vec3 fw = fwidth(vBary);
      vec3 a3 = smoothstep(vec3(0.0), fw * 1.35, vBary);
      float wire = 1.0 - min(min(a3.x, a3.y), a3.z);
      float clay = clamp((dot(N, normalize(vec3(0.4, 0.8, 0.4))) * 0.45 + 0.55) * ao, 0.15, 1.0);
      oColor = vec4(litCol, 1.0);
      oData  = vec4(N.x * 0.5 + 0.5, N.z * 0.5 + 0.5, clamp(length(vWorldPos - uCamPos) / 280.0, 0.0, 1.0), edgeCtrl);
      oWire  = vec4(clay, wire, emissive, 0.0);
    }
  `;

  // --- UNIFIED MYTHIC SPIRIT CREATURE SHADER (Kun 7 | Yinglong Dragon 10 | Vermilion Phoenix 11 | Nine-Tailed Fox 12!) ---
  const VS_SPIRIT = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aPos;
    layout(location=1) in vec3 aNorm;
    layout(location=2) in vec3 aCol;
    layout(location=3) in vec3 aBary;
    layout(location=4) in vec4 aExtra; // [speciesId, spineS, wingOrTailU, chordOrIdx]

    uniform mat4 uModel;
    uniform mat4 uView;
    uniform mat4 uProj;
    uniform float uTime;

    out vec3 vWorldPos;
    out vec3 vNorm;
    out vec3 vCol;
    out vec3 vBary;
    out vec4 vExtra;

    void main() {
      vec3 pos = aPos;
      float sp = aExtra.x, s = aExtra.y, wU = aExtra.z, cV = aExtra.w;

      if (sp < 8.5) {
        // 7.0: Celestial Giant Kun — sweeping whale undulation + silk wing wave
        float ph = uTime * 1.45 - s * 4.2;
        pos.y += sin(ph) * (0.30 + s * 1.25);
        pos.x += cos(ph * 0.72) * (0.14 + s * 0.70);
        if (wU > 0.04) { float w = max(0.0, wU - 0.06); pos.y += sin(uTime * 1.55 - w * 2.4 - cV * 1.2) * (w * w * 2.6); }
      } else if (sp < 10.5) {
        // 10.0: 70m Winged Yinglong Sky-Dragon — dramatic sinuous 3D serpentine wave + wing beats!
        float ph = uTime * 2.05 - s * 10.2;
        pos.x += sin(ph) * (0.35 + s * 4.2);
        pos.y += cos(ph * 0.85) * (0.28 + s * 2.6);
        if (wU > 0.04) { float w = max(0.0, wU - 0.06); pos.y += sin(uTime * 2.2 - w * 2.0 - cV) * (w * w * 3.8); }
      } else if (sp < 11.5) {
        // 11.0: Vermilion Phoenix — stately wing beats + 5 billowing ribbon tails!
        if (s > 0.35) {
          float tWave = uTime * 3.8 - s * 6.5;
          pos.y += sin(tWave) * (s - 0.35) * 1.35;
          pos.x += cos(tWave * 0.75) * (s - 0.35) * 0.75;
        } else if (wU > 0.04) {
          float w = max(0.0, wU - 0.06);
          pos.y += sin(uTime * 3.6 - w * 1.8) * (w * 2.35);
        }
      } else {
        // 12.0: Qingqiu Nine-Tailed Spirit Fox — 9 translucent silk tails gently undulating like mist fans!
        if (wU > 0.08) {
          float tailPh = uTime * 1.85 - s * 3.4 + cV * 6.283;
          pos.x += sin(tailPh) * s * 0.95;
          pos.y += cos(tailPh * 0.8) * s * 0.55;
        }
      }

      vec4 wp = uModel * vec4(pos, 1.0);
      vWorldPos = wp.xyz;
      vNorm = normalize(mat3(uModel) * aNorm);
      vCol = aCol; vBary = aBary; vExtra = aExtra;
      gl_Position = uProj * uView * wp;
    }
  `;

  const FS_SPIRIT = `#version 300 es
    precision highp float;
    in vec3 vWorldPos;
    in vec3 vNorm;
    in vec3 vCol;
    in vec3 vBary;
    in vec4 vExtra;

    uniform vec3 uCamPos;
    uniform vec3 uSunDir;
    uniform float uTime;
    uniform float uNight;
    uniform float uMono;
    uniform float uClipY;

    ${GLSL_COMMON}
    layout(location=0) out vec4 oColor;
    layout(location=1) out vec4 oData;
    layout(location=2) out vec4 oWire;

    void main() {
      if (uClipY > 0.5 && vWorldPos.y < -0.15) discard;
      vec3 N = normalize(vNorm); if (!gl_FrontFacing) N = -N;
      vec3 V = normalize(uCamPos - vWorldPos), L = normalize(uSunDir);
      float sp = vExtra.x, s = vExtra.y, wU = vExtra.z, cV = vExtra.w;

      float flow = fbm2(vec2(s * 6.8 - uTime * 0.30, wU * 4.2 + cV * 3.2));
      float filigree = pow(1.0 - abs(sin((s * 22.0 - uTime * 1.05) + flow * 5.0)), 11.0);
      float silkLines = pow(abs(sin(cV * 24.0 + flow * 3.0)), 12.0) * smoothstep(0.08, 0.45, wU);
      float veins = clamp(filigree * 1.1 + silkLines * 0.65, 0.0, 1.0);
      float fres = pow(1.0 - abs(dot(N, V)), 2.1);

      vec3 col = vCol;
      float alpha = 0.94;
      float em = 0.25;

      if (sp < 8.5) {
        // KUN: Splash-ink azurite-turquoise & gold filigree
        vec3 inkCore = mix(vec3(0.05, 0.13, 0.24), vec3(0.11, 0.46, 0.48), smoothstep(0.22, 0.82, flow));
        vec3 goldL = vec3(0.96, 0.76, 0.36);
        col = inkCore * (0.72 + 0.42 * max(dot(N, L), 0.0)) + goldL * veins * mix(0.75, 1.25, uNight)
            + mix(vec3(0.24, 0.68, 0.72), vec3(0.48, 0.88, 1.0), uNight) * fres * mix(0.45, 0.95, uNight);
        if (wU > 0.04) {
          float tailEnd = 1.0 - smoothstep(1.02, 1.56, s);
          alpha = clamp(smoothstep(0.04, 0.15, wU) * (1.0 - smoothstep(0.38, 0.96, wU)) * smoothstep(0.0, 0.16, cV) * (1.0 - smoothstep(0.55, 0.96, cV)) * tailEnd * (0.48 + 0.52 * flow) * 0.88, 0.0, 0.88);
          if (alpha < 0.025) discard;
          col = mix(col, mix(vec3(0.12, 0.44, 0.48), goldL, 0.38), wU * 0.55);
        }
        if (uMono > 0.01) col = mix(col, mix(vec3(0.07, 0.08, 0.10), vec3(0.32, 0.34, 0.36), flow) + vec3(0.92, 0.20, 0.15) * veins * 0.95, uMono);
        em = clamp((veins * 0.7 + fres * 0.4) * mix(0.45, 1.0, uNight), 0.0, 1.0);
      } else if (sp < 10.5) {
        // YINGLONG DRAGON: Deep imperial obsidian-lapis scales + molten gold spine/antlers/filigree (strong daytime & night pop!)
        float scales = smoothstep(0.32, 0.80, sin(s * 95.0) * sin(cV * 36.0) * 0.5 + 0.5);
        vec3 dragonInk = mix(vec3(0.03, 0.09, 0.18), vec3(0.09, 0.34, 0.44), scales * 0.58 + flow * 0.42);
        float isGoldPart = smoothstep(0.55, 0.82, vCol.r);
        vec3 baseC = mix(dragonInk, vec3(0.92, 0.68, 0.24), isGoldPart);
        col = baseC * (0.68 + 0.44 * max(dot(N, L), 0.0)) + vec3(1.0, 0.80, 0.34) * (veins * 0.72 + fres * 0.48);
        if (wU > 0.04) {
          alpha = clamp(smoothstep(0.04, 0.16, wU) * (1.0 - smoothstep(0.45, 0.98, wU)) * (0.50 + 0.50 * flow) * 0.88, 0.0, 0.88);
          if (alpha < 0.025) discard;
        }
        if (uMono > 0.01) col = mix(col, mix(vec3(0.05, 0.06, 0.08), vec3(0.24, 0.26, 0.28), scales) + vec3(0.92, 0.20, 0.14) * (veins + isGoldPart) * 0.9, uMono);
        em = clamp((veins * 0.65 + fres * 0.48 + isGoldPart * 0.42) * mix(0.38, 1.0, uNight), 0.0, 1.0);
      } else if (sp < 11.5) {
        // VERMILION PHOENIX: Rich Deep Cinnabar-Crimson Body & Wings + Gold Filigree Rim (vivid against bright Xuan sky!)
        vec3 deepCrim = vec3(0.62, 0.06, 0.07);
        vec3 brightVerm = vec3(0.86, 0.16, 0.10);
        vec3 goldPlume = vec3(0.92, 0.56, 0.14);
        vec3 phxCol = mix(deepCrim, brightVerm, smoothstep(0.25, 0.78, flow));
        phxCol = mix(phxCol, goldPlume, smoothstep(0.55, 0.90, vCol.g) * 0.55);
        col = phxCol * (0.72 + 0.34 * max(dot(N, L), 0.0)) + vec3(0.98, 0.68, 0.24) * (veins * 0.60 + fres * 0.35);
        if (wU > 0.04) {
          float tailFade = 1.0 - smoothstep(0.95, 1.52, s);
          alpha = clamp(smoothstep(0.04, 0.14, wU) * (1.0 - smoothstep(0.45, 0.98, wU)) * tailFade * (0.68 + 0.32 * flow) * 0.96, 0.0, 0.96);
          if (alpha < 0.025) discard;
        }
        em = clamp((0.28 + veins * 0.45) * mix(0.32, 1.0, uNight), 0.0, 1.0);
      } else {
        // QINGQIU NINE-TAILED FOX: Crisp Z-buffered Xuan-white fur, sumi-ink nose/paws, glowing amber eyes & cinnabar tail tips!
        float isDark = 1.0 - smoothstep(0.18, 0.42, max(vCol.r, max(vCol.g, vCol.b)));
        float isEye  = smoothstep(0.45, 0.72, vCol.r - vCol.b) * smoothstep(0.45, 0.72, vCol.g);
        float isRed  = smoothstep(0.38, 0.66, vCol.r - vCol.g);
        float ndl = max(dot(N, L), 0.0) * 0.55 + max(dot(N, normalize(vec3(0.4, 0.6, 0.7))), 0.0) * 0.30;
        vec3 furLight = mix(vec3(0.62, 0.67, 0.73), vec3(0.99, 0.96, 0.90), clamp(ndl + 0.34, 0.0, 1.0));
        // Subtle cool-celadon depth shadow behind fox shoulders on tail roots so her white face & chest pop clearly in front!
        float tailRootShadow = (wU > 0.08) ? mix(0.76, 1.0, smoothstep(0.08, 0.58, s)) : 1.0;
        vec3 baseFox = furLight * tailRootShadow;
        // Blend smooth cinnabar brush gradient on tail tips & inner ears/forehead mark/collar
        float redAmt = clamp(smoothstep(0.56, 0.80, s) * step(0.08, wU) + isRed, 0.0, 1.0);
        baseFox = mix(baseFox, vec3(0.86, 0.14, 0.12) * (0.78 + 0.32 * ndl), redAmt);
        // Preserve crisp sumi-ink nose/eyelashes/ear-tips/paws and luminous golden phoenix-fox eyes
        baseFox = mix(baseFox, vec3(0.08, 0.10, 0.13), isDark);
        baseFox = mix(baseFox, vec3(1.0, 0.78, 0.22), isEye);
        col = baseFox + vec3(1.0, 0.86, 0.56) * fres * (1.0 - isDark) * 0.34;
        if (uMono > 0.01) {
          float g = dot(col, vec3(0.3, 0.59, 0.11));
          col = mix(col, mix(vec3(g), vec3(0.88, 0.16, 0.12), redAmt * 0.95), uMono);
        }
        alpha = 1.0;
        em = clamp((isEye * 0.95 + fres * 0.32 * (1.0 - isDark)) * mix(0.45, 0.95, uNight), 0.0, 1.0);
      }

      col = applyInkMist(col, vWorldPos, uCamPos, L, uNight, uMono, 0.0);
      vec3 fw = fwidth(vBary);
      vec3 a3 = smoothstep(vec3(0.0), fw * 1.4, vBary);
      float wire = 1.0 - min(min(a3.x, a3.y), a3.z);

      oColor = vec4(col, alpha);
      oData  = vec4(N.x * 0.5 + 0.5, N.z * 0.5 + 0.5, clamp(length(vWorldPos - uCamPos) / 280.0, 0.0, 1.0), 0.14);
      oWire  = vec4(0.62, wire, em, alpha);
    }
  `;

  // --- Water, Foliage, Waterfall, Clouds, Particles, Bloom & Final Composite (Preserving v3 Museum Perfection!) ---
  const VS_WATER = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aPos;
    layout(location=1) in vec3 aBary;
    uniform mat4 uView;
    uniform mat4 uProj;
    uniform mat4 uRefVP;
    out vec3 vWorldPos;
    out vec3 vBary;
    out vec4 vRefClip;
    void main() { vWorldPos = aPos; vBary = aBary; vRefClip = uRefVP * vec4(aPos, 1.0); gl_Position = uProj * uView * vec4(aPos, 1.0); }
  `;
  const FS_WATER = `#version 300 es
    precision highp float;
    in vec3 vWorldPos;
    in vec3 vBary;
    in vec4 vRefClip;
    uniform sampler2D uReflectTex;
    uniform vec3 uCamPos;
    uniform vec3 uSunDir;
    uniform vec3 uBoatPos;
    uniform float uTime;
    uniform float uNight;
    uniform float uMono;
    ${GLSL_COMMON}
    layout(location=0) out vec4 oColor;
    layout(location=1) out vec4 oData;
    layout(location=2) out vec4 oWire;
    void main() {
      vec3 V = normalize(uCamPos - vWorldPos), L = normalize(uSunDir);
      float dist = length(vWorldPos - uCamPos);
      vec2 p = vWorldPos.xz;
      float w1 = fbm2(vec2(p.x * 0.34, p.y * 0.14 - uTime * 0.24));
      float w2 = fbm2(vec2(p.x * 0.72 + 4.1, p.y * 0.28 + uTime * 0.18));
      float rx = (w1 - 0.5) * 0.022 + (w2 - 0.5) * 0.012;
      float ry = (w2 - 0.5) * 0.014 + sin(p.y * 1.15 - uTime * 1.3 + w1 * 3.5) * 0.006;
      float dBoat = length(p - uBoatPos.xz);
      float ringWave = sin(dBoat * 3.2 - uTime * 2.6) * exp(-dBoat * 0.14) * smoothstep(1.2, 2.8, dBoat);
      rx += ringWave * 0.014; ry += ringWave * 0.010;
      vec3 N = normalize(vec3(rx * 4.0, 1.0, ry * 6.0));
      vec2 refUV = (vRefClip.xy / max(vRefClip.w, 0.001)) * 0.5 + 0.5;
      float damp = clamp(1.0 - dist * 0.0035, 0.22, 1.0);
      vec3 refl = texture(uReflectTex, clamp(refUV + vec2(rx, ry * 1.3) * damp, vec2(0.004), vec2(0.996))).rgb;
      vec3 paperBase = mix(vec3(0.76, 0.82, 0.78), vec3(0.035, 0.068, 0.125), uNight);
      paperBase = mix(paperBase, vec3(0.88, 0.86, 0.80), uMono);
      float fres = 0.28 + 0.68 * pow(1.0 - max(dot(N, V), 0.0), 2.8);
      vec3 col = mix(paperBase, refl * mix(0.96, 1.06, uNight), fres);
      col = mix(col, mix(vec3(0.18, 0.28, 0.30), vec3(0.92, 0.80, 0.55), uNight), smoothstep(0.45, 0.92, ringWave) * 0.26);
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(N, H), 0.0), 120.0);
      vec3 glintC = mix(vec3(1.0, 0.80, 0.44), vec3(0.72, 0.84, 1.0), uNight);
      glintC = mix(glintC, vec3(0.98, 0.54, 0.34), uMono * 0.75);
      col += glintC * spec * 0.88;
      float horFade = 1.0 - exp(-pow(max(dist - 36.0, 0.0) * 0.0078, 1.38));
      col = mix(col, getPaperColor(uNight, uMono), clamp(horFade, 0.0, 0.98));
      float glow = clamp(spec * 0.45 + max(refl.r - 0.80, 0.0) * 1.2, 0.0, 0.55);
      vec3 fw = fwidth(vBary); vec3 a3 = smoothstep(vec3(0.0), fw * 1.35, vBary);
      oColor = vec4(col, 1.0);
      oData  = vec4(0.5, 0.5, clamp(dist / 280.0, 0.0, 1.0), 0.08);
      oWire  = vec4(0.26, (1.0 - min(min(a3.x, a3.y), a3.z)) * 0.75, glow, 0.0);
    }
  `;

  const VS_FOLIAGE = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aCenter; layout(location=1) in vec2 aOffset; layout(location=2) in vec3 aNorm;
    layout(location=3) in vec3 aCol; layout(location=4) in vec4 aSeed;
    uniform mat4 uView; uniform mat4 uProj; uniform float uTime;
    out vec2 vUV; out vec3 vWorldPos; out vec3 vNorm; out vec3 vCol; out vec4 vSeed;
    void main() {
      vec3 r = vec3(uView[0][0], uView[1][0], uView[2][0]);
      vec3 u = normalize(mix(vec3(uView[0][1], uView[1][1], uView[2][1]), vec3(0.0, 1.0, 0.0), 0.35));
      float sway = sin(uTime * 1.35 + aCenter.x * 0.35 + aSeed.x) * 0.14 * aSeed.z;
      vec3 wp = aCenter + r * (aOffset.x + sway) + u * (aOffset.y * 0.82);
      vWorldPos = wp; vUV = aOffset / max(aSeed.w, 0.01); vNorm = normalize(aNorm); vCol = aCol; vSeed = aSeed;
      gl_Position = uProj * uView * vec4(wp, 1.0);
    }
  `;
  const FS_FOLIAGE = `#version 300 es
    precision highp float;
    in vec2 vUV; in vec3 vWorldPos; in vec3 vNorm; in vec3 vCol; in vec4 vSeed;
    uniform vec3 uCamPos; uniform vec3 uSunDir; uniform float uNight; uniform float uMono; uniform float uClipY;
    ${GLSL_COMMON}
    layout(location=0) out vec4 oColor; layout(location=1) out vec4 oData; layout(location=2) out vec4 oWire;
    void main() {
      if (uClipY > 0.5 && vWorldPos.y < -0.15) discard;
      float bType = vSeed.y, seed = vSeed.x;
      float nTex = fbm2(vUV * 4.2 + vec2(seed, seed * 0.7));
      float ang = atan(vUV.y, vUV.x), rad = length(vUV * vec2(0.95, 1.25));
      float br = (bType > 1.5) ? sin(ang * 7.0 + seed) * 0.16 : sin(ang * 15.0 + seed) * 0.15 + sin(ang * 25.0 - seed) * 0.07;
      float alpha = 1.0 - smoothstep(0.36 + br, 0.92 + br, rad + (nTex - 0.5) * 0.42);
      if (alpha < 0.34) discard;
      vec3 N = normalize(vNorm), L = normalize(uSunDir);
      float wetEdge = smoothstep(0.68, 0.34, alpha), topLit = smoothstep(-0.75, 0.75, vUV.y);
      vec3 col = mix(vCol * (0.95 + 0.35 * topLit), vCol * 0.32 + vec3(0.02, 0.04, 0.06), wetEdge * 0.65) * (0.76 + 0.38 * nTex);
      col += mix(vec3(0.32, 0.26, 0.10), vec3(0.42, 0.14, 0.08), step(1.5, bType)) * topLit * max(dot(N, L), 0.0) * (1.0 - uNight);
      if (uNight > 0.01) col = mix(col, (bType > 1.5) ? vec3(0.55, 0.16, 0.18) : col * vec3(0.28, 0.42, 0.62), uNight);
      if (uMono > 0.01) col = mix(col, (bType > 1.5) ? mix(vec3(0.52, 0.10, 0.10), vec3(0.88, 0.20, 0.15), topLit * 0.6 + nTex * 0.4) : mix(vec3(0.06, 0.07, 0.09), vec3(0.26, 0.28, 0.30), topLit * 0.5 + nTex * 0.5), uMono);
      col = applyInkMist(col, vWorldPos, uCamPos, L, uNight, uMono, 0.0);
      oColor = vec4(col, 1.0);
      oData  = vec4(N.x * 0.5 + 0.5, N.z * 0.5 + 0.5, clamp(length(vWorldPos - uCamPos) / 280.0, 0.0, 1.0), 0.35);
      oWire  = vec4(0.32 + topLit * 0.25, smoothstep(0.58, 0.34, alpha) * 0.88, (bType > 1.5 ? 0.18 : 0.0), 0.0);
    }
  `;

  const VS_WATERFALL = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aPos; layout(location=4) in vec4 aExtra;
    uniform mat4 uView; uniform mat4 uProj;
    out vec3 vWorldPos; out vec2 vUV;
    void main() { vWorldPos = aPos; vUV = aExtra.yz; gl_Position = uProj * uView * vec4(aPos, 1.0); }
  `;
  const FS_WATERFALL = `#version 300 es
    precision highp float;
    in vec3 vWorldPos; in vec2 vUV;
    uniform vec3 uCamPos; uniform vec3 uSunDir; uniform float uTime; uniform float uNight; uniform float uMono; uniform float uClipY;
    ${GLSL_COMMON}
    layout(location=0) out vec4 oColor; layout(location=1) out vec4 oData; layout(location=2) out vec4 oWire;
    void main() {
      if (uClipY > 0.5 && vWorldPos.y < -0.1) discard;
      float ex = smoothstep(0.0, 0.25, vUV.x) * smoothstep(1.0, 0.75, vUV.x);
      float tf = smoothstep(0.0, 0.15, vUV.y) * smoothstep(1.0, 0.65, vUV.y);
      float alpha = ex * tf * (0.28 + 0.65 * smoothstep(0.26, 0.80, fbm2(vec2(vUV.x * 6.5, vUV.y * 4.0 - uTime * 1.4))));
      if (alpha < 0.04) discard;
      vec3 col = applyInkMist(mix(vec3(0.95, 0.93, 0.86), vec3(0.45, 0.64, 0.82), uNight), vWorldPos, uCamPos, normalize(uSunDir), uNight, uMono, 0.0);
      oColor = vec4(col, alpha * 0.72); oData = vec4(0.5, 0.5, clamp(length(vWorldPos - uCamPos) / 280.0, 0.0, 1.0), 0.0); oWire = vec4(0.0, 0.0, 0.15, 0.0);
    }
  `;

  const VS_CLOUD = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aCenter; layout(location=1) in vec2 aOff; layout(location=2) in vec2 aSize; layout(location=3) in vec3 aMeta;
    uniform mat4 uView; uniform mat4 uProj; uniform float uTime;
    out vec2 vUV; out vec3 vWorldPos; out vec3 vMeta;
    void main() {
      vec3 r = vec3(uView[0][0], uView[1][0], uView[2][0]), u = vec3(uView[0][1], uView[1][1], uView[2][1]);
      vec3 c = aCenter + vec3(sin(uTime * 0.048 + aMeta.y) * 6.0, sin(uTime * 0.10 + aMeta.y) * 0.45, 0.0);
      vec3 wp = c + r * (aOff.x * aSize.x) + u * (aOff.y * aSize.y);
      vWorldPos = wp; vUV = aOff; vMeta = aMeta; gl_Position = uProj * uView * vec4(wp, 1.0);
    }
  `;
  const FS_CLOUD = `#version 300 es
    precision highp float;
    in vec2 vUV; in vec3 vWorldPos; in vec3 vMeta;
    uniform vec3 uCamPos; uniform vec3 uSunDir; uniform float uTime; uniform float uNight; uniform float uMono; uniform float uClipY;
    ${GLSL_COMMON}
    layout(location=0) out vec4 oColor; layout(location=1) out vec4 oData; layout(location=2) out vec4 oWire;
    void main() {
      if (uClipY > 0.5 && vWorldPos.y < 0.2) discard;
      float dist = length(vWorldPos - uCamPos), r2 = dot(vUV, vUV);
      if (r2 > 1.0) discard;
      vec2 nuv = vUV * vec2(1.3, 2.2) + vec2(vMeta.y + uTime * 0.022, vMeta.y * 0.37);
      float n1 = fbm2(nuv);
      float alpha = smoothstep(0.28, 0.78, fbm2(nuv * 2.0 + vec2(n1 * 1.2, -n1 * 0.6))) * pow(1.0 - r2, 1.7) * vMeta.x * smoothstep(6.0, 20.0, dist);
      if (alpha < 0.015) discard;
      vec3 paper = getPaperColor(uNight, uMono);
      vec3 col = mix(paper * mix(0.95, 1.25, uNight), mix(vec3(0.99, 0.94, 0.84), vec3(0.24, 0.36, 0.52), uNight), smoothstep(-0.5, 0.7, vUV.y) * 0.65);
      oColor = vec4(col, alpha); oData = vec4(0.5, 0.5, clamp(dist / 280.0, 0.0, 1.0), 0.0); oWire = vec4(0.0);
    }
  `;

  const VS_PARTICLES = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aSeed; layout(location=1) in vec3 aMeta;
    uniform mat4 uView; uniform mat4 uProj;
    uniform vec3 uKunPos; uniform vec3 uKunFwd;
    uniform vec3 uDrgPos; uniform vec3 uDrgFwd;
    uniform vec3 uCamPos;
    uniform float uTime; uniform float uDPR;
    out float vKind; out float vGlow; out float vSpin;
    void main() {
      float kind = aMeta.z;
      vec3 wp;
      if (kind < 1.5) {
        float tr = fract(aSeed.x + uTime * (kind < 0.5 ? 0.10 : 0.075));
        float sp = tr * 10.5 + aMeta.x, rad = 1.6 + tr * (kind < 0.5 ? 7.0 : 10.0) * (0.4 + 0.6 * aSeed.y);
        vec3 side = normalize(cross(uKunFwd, vec3(0.0, 1.0, 0.0)) + vec3(0.001));
        wp = uKunPos - uKunFwd * (tr * 38.0 - 4.0) + side * (cos(sp) * rad) + vec3(0.0, sin(sp) * rad * 0.55 + (aSeed.z - 0.5) * 3.5, 0.0);
        vGlow = (1.0 - tr) * smoothstep(0.0, 0.12, tr);
      } else if (kind < 2.5) {
        // Wrap swirling 3D Cinnabar Maple Petals smoothly around the player's current 80m region so EVERY realm has drifting petals!
        float fall = fract(aSeed.y - uTime * 0.032);
        vec3 local = vec3(
          mod(aSeed.x * 84.0 + uTime * 0.85 - uCamPos.x + 42.0, 84.0) - 42.0,
          0.8 + fall * 24.0,
          mod(aSeed.z * 84.0 - uCamPos.z + 42.0, 84.0) - 42.0
        );
        wp = vec3(uCamPos.x + local.x + sin(uTime * 0.6 + aMeta.x) * 2.5, local.y, uCamPos.z + local.z + cos(uTime * 0.45 + aMeta.x) * 2.0);
        vGlow = smoothstep(0.0, 0.15, fall) * smoothstep(1.0, 0.85, fall);
      } else {
        // Golden celestial cloud sparks trailing the 70m Yinglong Sky-Dragon at Mount Buzhou!
        float tr = fract(aSeed.x + uTime * 0.11);
        float sp = tr * 14.0 + aMeta.x, rad = 2.2 + tr * 12.0 * (0.3 + 0.7 * aSeed.y);
        vec3 side = normalize(cross(uDrgFwd, vec3(0.0, 1.0, 0.0)) + vec3(0.001));
        wp = uDrgPos - uDrgFwd * (tr * 58.0 - 8.0) + side * (cos(sp) * rad) + vec3(0.0, sin(sp) * rad * 0.65, 0.0);
        vGlow = (1.0 - tr) * smoothstep(0.0, 0.12, tr);
      }
      vec4 vp = uView * vec4(wp, 1.0);
      gl_Position = uProj * vp;
      gl_PointSize = clamp((aMeta.y * 28.0 / max(-vp.z, 2.0)) * uDPR, 2.0, 22.0);
      vKind = kind; vSpin = uTime * 1.8 + aMeta.x * 3.0;
    }
  `;
  const FS_PARTICLES = `#version 300 es
    precision highp float;
    in float vKind; in float vGlow; in float vSpin;
    uniform float uNight; uniform float uMono;
    layout(location=0) out vec4 oColor; layout(location=1) out vec4 oData; layout(location=2) out vec4 oWire;
    void main() {
      vec2 c = gl_PointCoord - 0.5;
      vec3 col; float alpha; float em = 0.0;
      if (vKind < 0.5 || vKind > 2.5) {
        float r2 = dot(c, c) * 4.0; if (r2 > 1.0) discard;
        col = mix(vec3(0.98, 0.78, 0.36), vec3(0.90, 0.24, 0.18), uMono * 0.85);
        alpha = pow(1.0 - r2, 2.0) * vGlow * mix(0.70, 0.96, uNight);
        em = alpha * 0.92;
      } else if (vKind < 1.5) {
        float r2 = dot(c, c) * 4.0; if (r2 > 1.0) discard;
        col = mix(vec3(0.08, 0.16, 0.24), vec3(0.10, 0.11, 0.13), uMono);
        alpha = pow(1.0 - r2, 1.8) * vGlow * 0.30;
      } else {
        float cs = cos(vSpin), sn = sin(vSpin);
        vec2 rc = vec2(c.x * cs - c.y * sn, c.x * sn + c.y * cs);
        float d = length(vec2(rc.x * 2.2, rc.y * 4.2)); if (d > 1.0) discard;
        col = mix(vec3(0.86, 0.20, 0.15), vec3(1.0, 0.74, 0.32), uNight * 0.85);
        alpha = smoothstep(1.0, 0.35, d) * vGlow * mix(0.82, 0.92, uNight);
        em = alpha * mix(0.12, 0.95, uNight);
      }
      oColor = vec4(col, alpha); oData = vec4(0.5, 0.5, 0.5, 0.0); oWire = vec4(0.0, 0.0, em, alpha);
    }
  `;

  const VS_QUAD = `#version 300 es
    precision highp float; out vec2 vUV;
    void main() { vec2 p = vec2((gl_VertexID == 1) ? 3.0 : -1.0, (gl_VertexID == 2) ? 3.0 : -1.0); vUV = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }
  `;
  const FS_BLOOM_RAYS = `#version 300 es
    precision highp float; in vec2 vUV;
    uniform sampler2D uColorTex; uniform sampler2D uWireTex;
    uniform vec2 uSunUV; uniform float uSunVis; uniform float uNight; uniform float uMono;
    out vec4 oOut;
    void main() {
      vec3 c = texture(uColorTex, vUV).rgb;
      float em = texture(uWireTex, vUV).b;
      vec3 bloom = c * pow(em, 1.15) * mix(0.72, 1.45, uNight);
      vec3 rays = vec3(0.0);
      if (uSunVis > 0.01) {
        vec2 delta = (vUV - uSunUV) * (0.84 / 16.0), uv = vUV;
        float decay = 1.0, acc = 0.0;
        for (int i = 0; i < 16; i++) {
          uv -= delta; if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) break;
          acc += (1.0 - smoothstep(0.15, 0.75, texture(uColorTex, uv).a)) * exp(-length((uv - uSunUV) * vec2(1.6, 1.0)) * 5.0) * decay;
          decay *= 0.93;
        }
        vec3 rayC = mix(vec3(1.0, 0.78, 0.46), vec3(0.52, 0.74, 0.98), uNight);
        rayC = mix(rayC, vec3(0.96, 0.80, 0.62), uMono);
        rays = rayC * (acc / 16.0) * uSunVis * mix(0.68, 0.48, uNight) * (1.0 - uMono * 0.45);
      }
      oOut = vec4(bloom + rays, 1.0);
    }
  `;
  const FS_BLUR = `#version 300 es
    precision highp float; in vec2 vUV;
    uniform sampler2D uTex; uniform vec2 uStep; out vec4 oOut;
    void main() {
      vec3 acc = texture(uTex, vUV).rgb * 0.227027;
      acc += (texture(uTex, vUV + uStep * 1.3846).rgb + texture(uTex, vUV - uStep * 1.3846).rgb) * 0.316216;
      acc += (texture(uTex, vUV + uStep * 3.2307).rgb + texture(uTex, vUV - uStep * 3.2307).rgb) * 0.070270;
      oOut = vec4(acc, 1.0);
    }
  `;
  const FS_FINAL = `#version 300 es
    precision highp float; in vec2 vUV;
    uniform sampler2D uColorTex; uniform sampler2D uDataTex; uniform sampler2D uWireTex; uniform sampler2D uBloomTex;
    uniform vec2 uRes; uniform float uTime; uniform float uNight; uniform float uMono; uniform float uCurtain;
    ${GLSL_COMMON}
    out vec4 fragColor;

    vec3 kuwahara(vec2 uv, vec2 px) {
      vec3 m[4], s[4];
      for (int k = 0; k < 4; k++) { m[k] = vec3(0.0); s[k] = vec3(0.0); }
      for (int y = -2; y <= 0; y++) for (int x = -2; x <= 0; x++) { vec3 c = texture(uColorTex, uv + vec2(float(x), float(y)) * px).rgb; m[0] += c; s[0] += c * c; }
      for (int y = -2; y <= 0; y++) for (int x = 0; x <= 2; x++) { vec3 c = texture(uColorTex, uv + vec2(float(x), float(y)) * px).rgb; m[1] += c; s[1] += c * c; }
      for (int y = 0; y <= 2; y++) for (int x = -2; x <= 0; x++) { vec3 c = texture(uColorTex, uv + vec2(float(x), float(y)) * px).rgb; m[2] += c; s[2] += c * c; }
      for (int y = 0; y <= 2; y++) for (int x = 0; x <= 2; x++) { vec3 c = texture(uColorTex, uv + vec2(float(x), float(y)) * px).rgb; m[3] += c; s[3] += c * c; }
      float minV = 1e9; vec3 best = m[0] / 9.0;
      for (int k = 0; k < 4; k++) {
        vec3 mean = m[k] / 9.0; vec3 v3 = abs(s[k] / 9.0 - mean * mean); float v = v3.r + v3.g + v3.b;
        if (v < minV) { minV = v; best = mean; }
      }
      return best;
    }
    vec3 acesFilm(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

    void main() {
      vec2 px = 1.0 / uRes, pCoord = gl_FragCoord.xy;
      vec4 wireD = texture(uWireTex, vUV), rawData = texture(uDataTex, vUV);
      vec2 paperGrad = vec2(fbm2(pCoord * 0.042 + vec2(3.1, 1.7)) - 0.5, fbm2(pCoord * 0.042 + vec2(17.9, 8.4)) - 0.5);
      vec2 bleedUV = clamp(vUV + paperGrad * px * mix(2.2, 0.8, uNight), vec2(0.001), vec2(0.999));

      vec4 rawC = texture(uColorTex, bleedUV), data = texture(uDataTex, bleedUV);
      vec3 bloom = texture(uBloomTex, vUV).rgb;
      float linDepth = data.b, edgeCtrl = data.a;

      float paintW = (rawC.a > 0.5) ? mix(0.20, 0.64, smoothstep(0.90, 0.30, edgeCtrl)) * smoothstep(0.05, 0.25, edgeCtrl) : 0.0;
      paintW *= (1.0 - smoothstep(0.08, 0.36, wireD.b));
      vec3 paintCol = (paintW > 0.01) ? mix(rawC.rgb, kuwahara(bleedUV, px * 1.20), paintW) : rawC.rgb;

      if (rawC.a > 0.5 && edgeCtrl > 0.25 && linDepth < 0.62) {
        vec4 dL = texture(uDataTex, bleedUV - vec2(px.x * 1.4, 0.0)), dR = texture(uDataTex, bleedUV + vec2(px.x * 1.4, 0.0));
        vec4 dD = texture(uDataTex, bleedUV - vec2(0.0, px.y * 1.4)), dU = texture(uDataTex, bleedUV + vec2(0.0, px.y * 1.4));
        float wetEdge = smoothstep(0.32, 0.92, (abs(dR.b - dL.b) + abs(dU.b - dD.b)) * 18.0 + (length(dR.rg - dL.rg) + length(dU.rg - dD.rg)) * 0.65) * smoothstep(0.62, 0.14, linDepth);
        paintCol *= mix(vec3(1.0), vec3(0.58, 0.62, 0.66), wetEdge * (0.50 + 0.50 * vnoise(pCoord * 0.22)) * 0.58);
      }

      paintCol += bloom * mix(0.72, 1.12, uNight);

      float pulp = fbm2(pCoord * 0.022), fiber = fbm2(vec2(pCoord.x * 0.18 + pulp * 2.0, pCoord.y * 0.045));
      paintCol *= (1.0 + ((pulp - 0.5) * 0.048 + (fiber - 0.5) * 0.032) * mix(1.0, 0.35, uNight));

      vec2 goldCell = floor(pCoord * 0.085);
      if (hash12(goldCell) > 0.992) {
        float gDot = smoothstep(0.32, 0.05, length((fract(pCoord * 0.085) - 0.5) * vec2(1.0, 1.6)));
        paintCol = mix(paintCol, vec3(0.86, 0.68, 0.34), gDot * smoothstep(0.42, 0.85, dot(paintCol, vec3(0.33))) * mix(0.45, 0.25, uNight));
      }

      vec2 vc = vUV * 2.0 - 1.0;
      paintCol *= (0.36 + 0.64 * clamp(1.0 - dot(vc * vec2(0.70, 0.84), vc * vec2(0.70, 0.84)) * 0.24, 0.0, 1.0));
      paintCol = acesFilm(paintCol * mix(1.10, 1.18, uNight));
      float luma = dot(paintCol, vec3(0.299, 0.587, 0.114));
      paintCol = clamp(mix(vec3(luma), paintCol, mix(1.16, 1.08, uNight) * (1.0 - uMono * 0.05)), 0.0, 1.0);

      vec3 clayBg = (texture(uColorTex, vUV).a > 0.5)
        ? mix(vec3(0.05, 0.09, 0.13), vec3(0.20, 0.30, 0.36), wireD.r) * (1.0 - rawData.b * 0.55)
        : mix(vec3(0.03, 0.06, 0.10), vec3(0.07, 0.12, 0.18), vUV.y);
      vec3 techView = clayBg + mix(vec3(0.22, 0.88, 0.82), vec3(1.0, 0.72, 0.32), wireD.b) * wireD.g * 0.88 + vec3(1.0, 0.62, 0.26) * wireD.b * 0.55;

      vec3 outCol = mix(paintCol, techView, smoothstep(uCurtain - 0.0025, uCurtain + 0.0025, vUV.x));
      if (uCurtain > 0.005 && uCurtain < 0.995) outCol += vec3(0.92, 0.28, 0.18) * exp(-abs(vUV.x - uCurtain) * uRes.x * 0.45) * 1.15;
      fragColor = vec4(outCol, 1.0);
    }
  `;

  /* ==========================================================================
     4. WebGL2 Helpers & Engine Setup
     ========================================================================== */
  function compileShader(gl, type, src) {
    const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  }
  function createProgram(gl, vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  function createTex2D(gl, w, h, iFmt, fmt, type, filter) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, iFmt, w, h, 0, fmt, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function buildVAO(gl, floatData, layout) {
    const vao = gl.createVertexArray(), vbo = gl.createBuffer();
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, floatData, gl.STATIC_DRAW);
    const stride = layout.reduce((a, b) => a + b.size, 0) * 4;
    let off = 0;
    layout.forEach((a) => { gl.enableVertexAttribArray(a.loc); gl.vertexAttribPointer(a.loc, a.size, gl.FLOAT, false, stride, off); off += a.size * 4; });
    gl.bindVertexArray(null);
    return vao;
  }

  function create(canvas, callbacks = {}) {
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL2 required.");

    const world = ShanHaiGeometry.buildWorld();

    const progShadow    = createProgram(gl, VS_SHADOW, FS_SHADOW);
    const progSky       = createProgram(gl, VS_SKY, FS_SKY);
    const progSolid     = createProgram(gl, VS_SOLID, FS_SOLID);
    const progWater     = createProgram(gl, VS_WATER, FS_WATER);
    const progFoliage   = createProgram(gl, VS_FOLIAGE, FS_FOLIAGE);
    const progSpirit    = createProgram(gl, VS_SPIRIT, FS_SPIRIT);
    const progWaterfall = createProgram(gl, VS_WATERFALL, FS_WATERFALL);
    const progCloud     = createProgram(gl, VS_CLOUD, FS_CLOUD);
    const progParticles = createProgram(gl, VS_PARTICLES, FS_PARTICLES);
    const progBloomRays = createProgram(gl, VS_QUAD, FS_BLOOM_RAYS);
    const progBlur      = createProgram(gl, VS_QUAD, FS_BLUR);
    const progFinal     = createProgram(gl, VS_QUAD, FS_FINAL);

    const getU = (p, ns) => { const o = {}; ns.forEach((n) => { o[n] = gl.getUniformLocation(p, n); }); return o; };
    const uSh  = getU(progShadow, ["uLightVP", "uModel", "uTime"]);
    const uSky = getU(progSky, ["uInvVP", "uCamPos", "uSunDir", "uTime", "uNight", "uMono"]);
    const uSol = getU(progSolid, ["uModel", "uView", "uProj", "uLightVP", "uShadowMap", "uCamPos", "uSunDir", "uTime", "uNight", "uMono", "uClipY"]);
    const uWat = getU(progWater, ["uView", "uProj", "uRefVP", "uReflectTex", "uCamPos", "uSunDir", "uBoatPos", "uTime", "uNight", "uMono"]);
    const uFol = getU(progFoliage, ["uView", "uProj", "uCamPos", "uSunDir", "uTime", "uNight", "uMono", "uClipY"]);
    const uSpr = getU(progSpirit, ["uModel", "uView", "uProj", "uCamPos", "uSunDir", "uTime", "uNight", "uMono", "uClipY"]);
    const uWf  = getU(progWaterfall, ["uView", "uProj", "uCamPos", "uSunDir", "uTime", "uNight", "uMono", "uClipY"]);
    const uCld = getU(progCloud, ["uView", "uProj", "uCamPos", "uSunDir", "uTime", "uNight", "uMono", "uClipY"]);
    const uPrt = getU(progParticles, ["uView", "uProj", "uKunPos", "uKunFwd", "uDrgPos", "uDrgFwd", "uCamPos", "uTime", "uDPR", "uNight", "uMono"]);
    const uRay = getU(progBloomRays, ["uColorTex", "uWireTex", "uSunUV", "uSunVis", "uNight", "uMono"]);
    const uBlr = getU(progBlur, ["uTex", "uStep"]);
    const uFin = getU(progFinal, ["uColorTex", "uDataTex", "uWireTex", "uBloomTex", "uRes", "uTime", "uNight", "uMono", "uCurtain"]);

    const solidLayout = [{ loc: 0, size: 3 }, { loc: 1, size: 3 }, { loc: 2, size: 3 }, { loc: 3, size: 3 }, { loc: 4, size: 4 }];
    const vaoSolid     = buildVAO(gl, world.solid.data, solidLayout);
    const vaoKun       = buildVAO(gl, world.kun.data, solidLayout);
    const vaoDragon    = buildVAO(gl, world.dragon.data, solidLayout);
    const vaoPhoenix   = buildVAO(gl, world.phoenix.data, solidLayout);
    const vaoFox       = buildVAO(gl, world.fox.data, solidLayout);
    const vaoStag      = buildVAO(gl, world.stag.data, solidLayout);
    const vaoKoi       = buildVAO(gl, world.koi.data, solidLayout);
    const vaoBoatman   = buildVAO(gl, world.boatman.data, solidLayout);
    const vaoCrane     = buildVAO(gl, world.crane.data, solidLayout);
    const vaoWaterfall = buildVAO(gl, world.waterfall.data, solidLayout);
    const vaoWater     = buildVAO(gl, world.water.data, [{ loc: 0, size: 3 }, { loc: 1, size: 3 }]);
    const vaoFoliage   = buildVAO(gl, world.foliage.data, [{ loc: 0, size: 3 }, { loc: 1, size: 2 }, { loc: 2, size: 3 }, { loc: 3, size: 3 }, { loc: 4, size: 4 }]);
    const vaoClouds    = buildVAO(gl, world.clouds.data, [{ loc: 0, size: 3 }, { loc: 1, size: 2 }, { loc: 2, size: 2 }, { loc: 3, size: 3 }]);
    const vaoParticles = buildVAO(gl, world.particles.data, [{ loc: 0, size: 3 }, { loc: 1, size: 3 }]);
    const vaoEmpty     = gl.createVertexArray();

    const SHADOW_RES = 1024;
    const fboShadow = gl.createFramebuffer();
    const texShadow = createTex2D(gl, SHADOW_RES, SHADOW_RES, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboShadow);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, texShadow, 0);
    gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);

    let curW = 0, curH = 0, refW = 0, refH = 0, blmW = 0, blmH = 0;
    let fboRef, texRef, rbRefDepth, fboMain, texColor, texData, texWire, rbMainDepth, fboBloomA, texBloomA, fboBloomB, texBloomB;

    function allocFBOs(w, h) {
      [fboRef, fboMain, fboBloomA, fboBloomB].forEach((f) => f && gl.deleteFramebuffer(f));
      [texRef, texColor, texData, texWire, texBloomA, texBloomB].forEach((t) => t && gl.deleteTexture(t));
      [rbRefDepth, rbMainDepth].forEach((r) => r && gl.deleteRenderbuffer(r));

      refW = Math.max(256, w >> 1); refH = Math.max(144, h >> 1);
      fboRef = gl.createFramebuffer(); texRef = createTex2D(gl, refW, refH, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
      rbRefDepth = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rbRefDepth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, refW, refH);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboRef); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texRef, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rbRefDepth); gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

      fboMain = gl.createFramebuffer();
      texColor = createTex2D(gl, w, h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
      texData  = createTex2D(gl, w, h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.NEAREST);
      texWire  = createTex2D(gl, w, h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
      rbMainDepth = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rbMainDepth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboMain);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texColor, 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, texData, 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, texWire, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rbMainDepth);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);

      blmW = Math.max(160, w >> 2); blmH = Math.max(90, h >> 2);
      fboBloomA = gl.createFramebuffer(); texBloomA = createTex2D(gl, blmW, blmH, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboBloomA); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texBloomA, 0);
      fboBloomB = gl.createFramebuffer(); texBloomB = createTex2D(gl, blmW, blmH, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboBloomB); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texBloomB, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(320, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(200, Math.round(canvas.clientHeight * dpr));
      if (w !== curW || h !== curH) { curW = w; curH = h; canvas.width = w; canvas.height = h; allocFBOs(w, h); }
    }

    /* ========================================================================
       5. Open-World Camera, Realm Discovery & All 7 Creature Choreography
       ======================================================================== */
    const SPAWN_POS = [0.0, 4.6, 22.0];
    const SPAWN_YAW = 0.0, SPAWN_PITCH = 0.095;

    const state = {
      entered: false,
      mode: "free", // "free" | "cruise" | "soar" | "dragon" | "qingqiu" | "phoenix"
      style: "bluegreen",
      nightVal: 0.0, monoVal: 0.0, curtain: 1.0, targetCurtain: 1.0,
      pos: SPAWN_POS.slice(), vel: [0, 0, 0],
      yaw: SPAWN_YAW, pitch: SPAWN_PITCH, targetYaw: SPAWN_YAW, targetPitch: SPAWN_PITCH,
      lookOffsetYaw: 0.0, lookOffsetPitch: 0.0,
      cruiseT: 0.0, lastRegion: "", keys: {}
    };

    const qp = new URLSearchParams(location.search);
    if (qp.get("enter") === "1") state.entered = true;
    if (qp.get("mode")) { state.mode = qp.get("mode"); state.entered = true; }
    if (qp.get("style")) {
      state.style = qp.get("style");
      state.nightVal = state.style === "night" ? 1 : 0;
      state.monoVal = state.style === "mono" ? 1 : 0;
    }
    if (qp.get("curtain") !== null) state.curtain = state.targetCurtain = Math.max(0, Math.min(1, Number(qp.get("curtain"))));
    if (qp.get("yaw") !== null) state.yaw = state.targetYaw = SPAWN_YAW + (Number(qp.get("yaw")) * Math.PI) / 180;
    if (qp.get("pitch") !== null) state.pitch = state.targetPitch = (Number(qp.get("pitch")) * Math.PI) / 180;
    if (qp.get("pos")) {
      const p = qp.get("pos").split(",").map(Number);
      if (p.length === 3 && p.every(Number.isFinite)) state.pos = p;
    }

    function notifyEnter() { if (!state.entered) { state.entered = true; if (callbacks.onEnter) callbacks.onEnter(); } }

    function detectRegion(p) {
      if (p[2] < -128) return { id: "buzhou", zh: "不周天門・應龍盤雲", en: "MOUNT BUZHOU · YINGLONG DRAGON" };
      if (p[0] < -58)  return { id: "qingqiu", zh: "青丘丹楓・九尾靈狐", en: "QINGQIU ISLES · NINE-TAILED FOXES" };
      if (p[0] >  58)  return { id: "danshan", zh: "丹山朝陽・朱鳳鳴天", en: "DANSHAN PEAKS · VERMILION PHOENIX" };
      if (p[2] < -42)  return { id: "penglai", zh: "蓬萊雲海・北冥雙鯤", en: "PENGLAI GORGE · TWIN SPIRIT KUNS" };
      if (p[2] >  36)  return { id: "nanming", zh: "南冥歸舟・月下孤亭", en: "SOUTHERN MIST · MOON PAVILION" };
      return { id: "bianhe", zh: "汴水虹橋・孤舟簑笠", en: "BIANHE ARCH · LONE BOATMAN" };
    }

    const activePointers = new Map();
    let prevPinchDist = null;
    function getPinchDist() {
      const pts = Array.from(activePointers.values());
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
    canvas.addEventListener("pointerdown", (e) => {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      prevPinchDist = activePointers.size === 2 ? getPinchDist() : null;
    });
    canvas.addEventListener("pointermove", (e) => {
      const prev = activePointers.get(e.pointerId);
      if (!prev) return;
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      prev.x = e.clientX; prev.y = e.clientY;
      if (activePointers.size === 1) {
        if (Math.hypot(dx, dy) > 1.5) notifyEnter();
        const s = prev.type === "touch" ? 0.0052 : 0.0042;
        if (state.mode === "free") {
          state.targetYaw -= dx * s;
          state.targetPitch = Math.max(-0.72, Math.min(1.05, state.targetPitch + dy * s));
        } else {
          state.lookOffsetYaw -= dx * s;
          state.lookOffsetPitch = Math.max(-0.62, Math.min(0.85, state.lookOffsetPitch + dy * s));
        }
      } else if (activePointers.size === 2) {
        const dist = getPinchDist();
        if (prevPinchDist !== null) {
          const delta = dist - prevPinchDist;
          if (Math.abs(delta) > 0.5) {
            notifyEnter();
            if (state.mode !== "free") {
              state.mode = "free"; state.targetYaw = state.yaw; state.targetPitch = state.pitch;
              state.lookOffsetYaw = 0; state.lookOffsetPitch = 0;
              if (callbacks.onModeChange) callbacks.onModeChange("free");
            }
            const step = Math.max(-6.0, Math.min(6.0, delta * 0.11));
            const fwd = [-Math.sin(state.yaw) * Math.cos(state.pitch), Math.sin(state.pitch), -Math.cos(state.yaw) * Math.cos(state.pitch)];
            state.vel[0] += fwd[0] * step * 2.8; state.vel[1] += fwd[1] * step * 2.0; state.vel[2] += fwd[2] * step * 2.8;
          }
        }
        prevPinchDist = dist;
      }
    });
    function releasePointer(e) {
      activePointers.delete(e.pointerId);
      prevPinchDist = activePointers.size === 2 ? getPinchDist() : null;
    }
    canvas.addEventListener("pointerup", releasePointer);
    canvas.addEventListener("pointercancel", releasePointer);

    canvas.addEventListener("wheel", (e) => {
      e.preventDefault(); notifyEnter();
      if (state.mode !== "free") {
        state.mode = "free"; state.targetYaw = state.yaw; state.targetPitch = state.pitch;
        state.lookOffsetYaw = 0; state.lookOffsetPitch = 0;
        if (callbacks.onModeChange) callbacks.onModeChange("free");
      }
      const step = -Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY) * 0.055, 6.5);
      const fwd = [-Math.sin(state.yaw) * Math.cos(state.pitch), Math.sin(state.pitch), -Math.cos(state.yaw) * Math.cos(state.pitch)];
      state.vel[0] += fwd[0] * step * 3.2; state.vel[1] += fwd[1] * step * 2.4; state.vel[2] += fwd[2] * step * 3.2;
    }, { passive: false });

    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      state.keys[k] = true;
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "q", "e", " "].includes(k)) {
        notifyEnter();
        if (state.mode !== "free") {
          state.mode = "free"; state.targetYaw = state.yaw; state.targetPitch = state.pitch;
          state.lookOffsetYaw = 0; state.lookOffsetPitch = 0;
          if (callbacks.onModeChange) callbacks.onModeChange("free");
        }
      }
    });
    window.addEventListener("keyup", (e) => { state.keys[e.key.toLowerCase()] = false; });

    function clampSafeFPSPos(p) {
      // Vast 380m x 400m explorable scroll bounds!
      p[0] = Math.max(-185, Math.min(185, p[0]));
      p[2] = Math.max(-265, Math.min(115, p[2]));
      const terr = ShanHaiGeometry.terrainHeight(p[0], p[2]);
      let minY = Math.max(1.75, terr + 2.4);
      if (Math.abs(p[2] - ShanHaiGeometry.BRIDGE_Z) < 3.4) {
        const deckY = ShanHaiGeometry.bridgeArchY(p[0]);
        if (deckY > 0.0 && p[1] > deckY - 1.5 && p[1] < deckY + 2.0) {
          p[1] = (p[1] < deckY - 0.1 && deckY > 4.5) ? deckY - 1.5 : deckY + 2.0;
        }
      }
      p[1] = Math.max(minY, Math.min(82.0, p[1]));
    }

    let elapsed = qp.get("t") !== null ? Number(qp.get("t")) : 3.2;
    let prevTs = performance.now(), frameCount = 0, fpsTs = prevTs;
    const identity = mat4Identity();

    const SUN_DIR = (() => {
      const v = [0.065, 0.305, -0.950], l = Math.hypot(v[0], v[1], v[2]);
      return [v[0] / l, v[1] / l, v[2] / l];
    })();

    const lightView = mat4LookAt([SUN_DIR[0] * 110, SUN_DIR[1] * 110, -45 + SUN_DIR[2] * 110], [0, 6, -45], [0, 1, 0]);
    const lightProj = mat4Ortho(-95, 95, -75, 85, 10, 260);
    const lightVP = mat4Mul(lightProj, lightView);

    // ---- Static Poised Creatures (2 Nine-Tailed Spirit Foxes + 2 Golden-Antlered Spirit Stags) ----
    const foxInstances = [
      { x: -94.2, z: -76.2, rotY: 0.44, sc: 1.12 }, // Poised 3/4 facing the Qingqiu viewer with 9 peacock-fan silk tails blooming behind!
      { x: -112.0, z: -55.0, rotY: 1.18, sc: 1.04 } // Companion Nine-Tailed Fox on Southern Maple Crag facing courtyard!
    ].map((f) => ({
      mat: mat4ModelTRS(f.x, ShanHaiGeometry.terrainHeight(f.x, f.z) - 0.36, f.z, 0, f.rotY, 0, f.sc, f.sc, f.sc)
    }));

    const stagInstances = [
      { x: -102.5, z: -76.5, rotY:  0.55, sc: 1.12 }, // White Spirit Stag among Qingqiu Maples!
      { x:  113.5, z: -48.5, rotY: -0.95, sc: 1.18 }  // Eastern Sun-Spire Spirit Stag!
    ].map((s) => ({
      mat: mat4ModelTRS(s.x, ShanHaiGeometry.terrainHeight(s.x, s.z) - 0.1, s.z, 0, s.rotY, 0, s.sc, s.sc, s.sc)
    }));

    // ---- 18 Ink Cranes in Two Thermal Flocks across the 400m World ----
    const cranes = Array.from({ length: 18 }, (_, i) => ({
      cx: (i < 8 ? 0 : (i < 13 ? -92 : 98)),
      cz: (i < 8 ? -24 - (i % 3) * 20 : (i < 13 ? -82 : -105)),
      r: 16 + (i % 4) * 9.0,
      h: 15.0 + (i % 5) * 4.2,
      sp: 0.19 + (i % 3) * 0.04,
      ph: i * 0.68
    }));

    // ---- 28 Leaping Vermilion-Gold Spirit Koi / Wenyao Schools! ----
    const koiList = Array.from({ length: 28 }, (_, i) => {
      // 14 swimming & leaping near Bianhe Bridge & Boatman; 7 near Qingqiu Paifang; 7 near Buzhou Arch!
      const grp = i < 14 ? 0 : (i < 21 ? 1 : 2);
      const bx = grp === 0 ? (i % 2 === 0 ? -4.5 : 4.5) : (grp === 1 ? -82.0 : 0.0);
      const bz = grp === 0 ? -8.0 - (i % 7) * 5.2 : (grp === 1 ? -76.0 : -168.0);
      return { cx: bx, cz: bz, r: 5.5 + (i % 5) * 2.4, sp: 0.42 + (i % 4) * 0.12, ph: i * 0.85, sc: 0.55 + (i % 3) * 0.18 };
    });

    // ---- 3 Vermilion Phoenixes (丹山朱鳳) ----
    const phoenixSpecs = [
      { cx: 108.0, cz: -102.0, rx: 32.0, rz: 24.0, baseY: 32.0, sp: 0.16, ph: 0.4, sc: 1.05 }, // Eastern Sun Spire Lead Phoenix
      { cx: 108.0, cz: -102.0, rx: 25.0, rz: 19.0, baseY: 26.0, sp: 0.18, ph: 2.6, sc: 0.85 }, // Eastern Companion Phoenix
      { cx: -28.0, cz:  -96.0, rx: 46.0, rz: 28.0, baseY: 34.0, sp: 0.14, ph: 1.1, sc: 0.92 }  // Central Gorge Soaring Phoenix!
    ];

    function computeKunState(t, phaseOff = 0, scale = 0.78, yOff = 0, rScale = 1.0) {
      const ang = t * 0.085 + 0.48 + phaseOff;
      const x = Math.sin(ang) * 35.0 * rScale, z = -54.0 + Math.cos(ang) * 18.0 * rScale, y = 25.0 + yOff + Math.sin(ang * 2.0) * 3.2;
      const na = ang + 0.03;
      const nx = Math.sin(na) * 35.0 * rScale, nz = -54.0 + Math.cos(na) * 18.0 * rScale, ny = 25.0 + yOff + Math.sin(na * 2.0) * 3.2;
      const dx = nx - x, dy = ny - y, dz = nz - z, dl = Math.hypot(dx, dy, dz) || 1;
      return {
        pos: [x, y, z], fwd: [dx / dl, dy / dl, dz / dl],
        mat: mat4ModelTRS(x, y, z, -Math.atan2(dy, Math.hypot(dx, dz)), Math.atan2(dx, dz), -Math.cos(ang) * 0.22, scale, scale, scale)
      };
    }

    // Grand Figure-8 / Helical Flight Path Weaving RIGHT THROUGH the 75m Mount Buzhou Celestial Gate (z = -179)!
    function computeDragonState(t) {
      const a = t * 0.13 - 0.35;
      const x = Math.sin(a) * 32.0;
      const z = -182.0 + Math.sin(a * 2.0) * 24.0;
      const y = 36.0 + Math.cos(a) * 9.5;
      const na = a + 0.025;
      const nx = Math.sin(na) * 32.0, nz = -182.0 + Math.sin(na * 2.0) * 24.0, ny = 36.0 + Math.cos(na) * 9.5;
      const dx = nx - x, dy = ny - y, dz = nz - z, dl = Math.hypot(dx, dy, dz) || 1;
      return {
        pos: [x, y, z], fwd: [dx / dl, dy / dl, dz / dl],
        mat: mat4ModelTRS(x, y, z, -Math.atan2(dy, Math.hypot(dx, dz)), Math.atan2(dx, dz), Math.cos(a) * 0.25, 0.90, 0.90, 0.90)
      };
    }

    function computePhoenixState(sp, t) {
      const a = t * sp.sp + sp.ph;
      const x = sp.cx + Math.sin(a) * sp.rx, z = sp.cz + Math.cos(a) * sp.rz, y = sp.baseY + Math.sin(a * 2.0) * 4.2;
      const na = a + 0.03;
      const nx = sp.cx + Math.sin(na) * sp.rx, nz = sp.cz + Math.cos(na) * sp.rz, ny = sp.baseY + Math.sin(na * 2.0) * 4.2;
      const dx = nx - x, dy = ny - y, dz = nz - z;
      return { pos: [x, y, z], mat: mat4ModelTRS(x, y, z, -Math.atan2(dy, Math.hypot(dx, dz)), Math.atan2(dx, dz), -Math.cos(a) * 0.25, sp.sc, sp.sc, sp.sc) };
    }

    function computeBoatStates(t) {
      // Boat 0 = Iconic Opening Lone Boatman; Boats 1..3 = Farther Lantern Sampans across the vast mirror sea!
      const specs = [
        { z0: -3.0,   off: -1.6, sp: 0.65, loop: 42.0, cxFn: (z) => ShanHaiGeometry.riverCenterX(z) },
        { z0: -88.0,  off:  4.5, sp: 0.85, loop: 55.0, cxFn: (z) => ShanHaiGeometry.riverCenterX(z) },
        { z0: -76.0,  off:  0.0, sp: 0.55, loop: 28.0, cxFn: () => -74.0 }, // Qingqiu Lantern Skiff!
        { z0: -162.0, off:  5.0, sp: 0.72, loop: 50.0, cxFn: () =>  0.0  }  // Mount Buzhou Pilgrim Boat!
      ];
      return specs.map((b, i) => {
        const bz = b.z0 - ((t * b.sp) % b.loop);
        const bx = b.cxFn(bz) + b.off;
        const nz = bz - 2.0, nx = b.cxFn(nz) + b.off;
        const yaw = Math.atan2(nx - bx, nz - bz);
        const bob = Math.sin(t * 1.8 + i) * 0.028;
        return { pos: [bx, 0.02 + bob, bz], mat: mat4ModelTRS(bx, 0.02 + bob, bz, bob, yaw, bob * 0.6, 1, 1, 1) };
      });
    }

    let refVPGlobal = identity, shadowBaked = false;

    function drawSceneContent(view, proj, camPos, kun1, kun2, dragon, phoenixes, boats, clipY, isRefPass) {
      const invVP = invertMat4(mat4Mul(proj, view));

      // 1. Sky
      gl.depthMask(false); gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
      gl.useProgram(progSky);
      gl.uniformMatrix4fv(uSky.uInvVP, false, invVP);
      gl.uniform3fv(uSky.uCamPos, camPos); gl.uniform3fv(uSky.uSunDir, SUN_DIR);
      gl.uniform1f(uSky.uTime, elapsed); gl.uniform1f(uSky.uNight, state.nightVal); gl.uniform1f(uSky.uMono, state.monoVal);
      gl.bindVertexArray(vaoEmpty); gl.drawArrays(gl.TRIANGLES, 0, 3);

      // 2. Opaque World + Boats + Spirit Stags + 28 Leaping Koi + 18 Ink Cranes
      gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
      gl.useProgram(progSolid);
      gl.uniformMatrix4fv(uSol.uView, false, view); gl.uniformMatrix4fv(uSol.uProj, false, proj);
      gl.uniformMatrix4fv(uSol.uLightVP, false, lightVP);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texShadow); gl.uniform1i(uSol.uShadowMap, 0);
      gl.uniform3fv(uSol.uCamPos, camPos); gl.uniform3fv(uSol.uSunDir, SUN_DIR);
      gl.uniform1f(uSol.uTime, elapsed); gl.uniform1f(uSol.uNight, state.nightVal); gl.uniform1f(uSol.uMono, state.monoVal);
      gl.uniform1f(uSol.uClipY, clipY);

      gl.uniformMatrix4fv(uSol.uModel, false, identity);
      gl.bindVertexArray(vaoSolid); gl.drawArrays(gl.TRIANGLES, 0, world.solid.count);

      // 4 Lantern Boats
      gl.bindVertexArray(vaoBoatman);
      boats.forEach((b) => { gl.uniformMatrix4fv(uSol.uModel, false, b.mat); gl.drawArrays(gl.TRIANGLES, 0, world.boatman.count); });

      // 2 Golden-Antlered White Spirit Stags
      gl.bindVertexArray(vaoStag);
      stagInstances.forEach((s) => { gl.uniformMatrix4fv(uSol.uModel, false, s.mat); gl.drawArrays(gl.TRIANGLES, 0, world.stag.count); });

      // 28 Leaping Vermilion-Gold Spirit Koi / Wenyao Fish!
      gl.bindVertexArray(vaoKoi);
      koiList.forEach((k) => {
        const a = elapsed * k.sp + k.ph;
        const kx = k.cx + Math.sin(a) * k.r, kz = k.cz + Math.cos(a) * k.r * 0.78;
        const arc = Math.sin(elapsed * 2.2 + k.ph * 2.0);
        // Periodic graceful leaps right out of the mirror water!
        const ky = arc > 0.35 ? (arc - 0.35) * 2.6 : -0.18 + arc * 0.12;
        const pitch = arc > 0.35 ? -Math.cos(elapsed * 2.2 + k.ph * 2.0) * 0.65 : 0.0;
        const yaw = Math.atan2(Math.cos(a) * k.r, -Math.sin(a) * k.r * 0.78);
        gl.uniformMatrix4fv(uSol.uModel, false, mat4ModelTRS(kx, ky, kz, pitch, yaw, 0, k.sc, k.sc, k.sc));
        gl.drawArrays(gl.TRIANGLES, 0, world.koi.count);
      });

      // 18 Soaring Ink Cranes
      gl.bindVertexArray(vaoCrane);
      cranes.forEach((cr) => {
        const a = elapsed * cr.sp + cr.ph;
        const cx = cr.cx + Math.sin(a) * cr.r, cz = cr.cz + Math.cos(a) * cr.r * 0.72, cy = cr.h + Math.sin(a * 2.0) * 1.4;
        const cyaw = Math.atan2(Math.cos(a) * cr.r, -Math.sin(a) * cr.r * 0.72);
        gl.uniformMatrix4fv(uSol.uModel, false, mat4ModelTRS(cx, cy, cz, 0, cyaw, -0.15, 0.78, 0.78, 0.78));
        gl.drawArrays(gl.TRIANGLES, 0, world.crane.count);
      });

      // 3. Calligraphic Pines & Cinnabar Maples
      gl.useProgram(progFoliage);
      gl.uniformMatrix4fv(uFol.uView, false, view); gl.uniformMatrix4fv(uFol.uProj, false, proj);
      gl.uniform3fv(uFol.uCamPos, camPos); gl.uniform3fv(uFol.uSunDir, SUN_DIR);
      gl.uniform1f(uFol.uTime, elapsed); gl.uniform1f(uFol.uNight, state.nightVal); gl.uniform1f(uFol.uMono, state.monoVal);
      gl.uniform1f(uFol.uClipY, clipY);
      gl.bindVertexArray(vaoFoliage); gl.drawArrays(gl.TRIANGLES, 0, world.foliage.count);

      // 4. Infinite Mirror Xuan-Paper Water
      if (!isRefPass) {
        gl.useProgram(progWater);
        gl.uniformMatrix4fv(uWat.uView, false, view); gl.uniformMatrix4fv(uWat.uProj, false, proj);
        gl.uniformMatrix4fv(uWat.uRefVP, false, refVPGlobal);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texRef); gl.uniform1i(uWat.uReflectTex, 0);
        gl.uniform3fv(uWat.uCamPos, camPos); gl.uniform3fv(uWat.uSunDir, SUN_DIR);
        gl.uniform3fv(uWat.uBoatPos, boats[0].pos);
        gl.uniform1f(uWat.uTime, elapsed); gl.uniform1f(uWat.uNight, state.nightVal); gl.uniform1f(uWat.uMono, state.monoVal);
        gl.bindVertexArray(vaoWater); gl.drawArrays(gl.TRIANGLES, 0, world.water.count);
      }

      // 5. Translucent Ethereal Layer: 6 Waterfalls + Mist Sea + ALL Mythic Spirit Creatures + 1,650 Particles!
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);

      gl.useProgram(progWaterfall);
      gl.uniformMatrix4fv(uWf.uView, false, view); gl.uniformMatrix4fv(uWf.uProj, false, proj);
      gl.uniform3fv(uWf.uCamPos, camPos); gl.uniform3fv(uWf.uSunDir, SUN_DIR);
      gl.uniform1f(uWf.uTime, elapsed); gl.uniform1f(uWf.uNight, state.nightVal); gl.uniform1f(uWf.uMono, state.monoVal);
      gl.uniform1f(uWf.uClipY, clipY);
      gl.bindVertexArray(vaoWaterfall); gl.drawArrays(gl.TRIANGLES, 0, world.waterfall.count);

      gl.useProgram(progCloud);
      gl.uniformMatrix4fv(uCld.uView, false, view); gl.uniformMatrix4fv(uCld.uProj, false, proj);
      gl.uniform3fv(uCld.uCamPos, camPos); gl.uniform3fv(uCld.uSunDir, SUN_DIR);
      gl.uniform1f(uCld.uTime, elapsed); gl.uniform1f(uCld.uNight, state.nightVal); gl.uniform1f(uCld.uMono, state.monoVal);
      gl.uniform1f(uCld.uClipY, clipY);
      gl.bindVertexArray(vaoClouds); gl.drawArrays(gl.TRIANGLES, 0, world.clouds.count);

      // All Ethereal Mythic Creatures (Twin Kuns + 70m Winged Dragon + 3 Vermilion Phoenixes + 2 Nine-Tailed Foxes!)
      gl.useProgram(progSpirit);
      gl.uniformMatrix4fv(uSpr.uView, false, view); gl.uniformMatrix4fv(uSpr.uProj, false, proj);
      gl.uniform3fv(uSpr.uCamPos, camPos); gl.uniform3fv(uSpr.uSunDir, SUN_DIR);
      gl.uniform1f(uSpr.uTime, elapsed); gl.uniform1f(uSpr.uNight, state.nightVal); gl.uniform1f(uSpr.uMono, state.monoVal);
      gl.uniform1f(uSpr.uClipY, clipY);

      gl.bindVertexArray(vaoKun);
      gl.uniformMatrix4fv(uSpr.uModel, false, kun1.mat); gl.drawArrays(gl.TRIANGLES, 0, world.kun.count);
      gl.uniformMatrix4fv(uSpr.uModel, false, kun2.mat); gl.drawArrays(gl.TRIANGLES, 0, world.kun.count);

      gl.bindVertexArray(vaoDragon);
      gl.uniformMatrix4fv(uSpr.uModel, false, dragon.mat); gl.drawArrays(gl.TRIANGLES, 0, world.dragon.count);

      gl.bindVertexArray(vaoPhoenix);
      phoenixes.forEach((ph) => { gl.uniformMatrix4fv(uSpr.uModel, false, ph.mat); gl.drawArrays(gl.TRIANGLES, 0, world.phoenix.count); });

      // Render Nine-Tailed Spirit Foxes with full hardware depth-write so head/face/ears ALWAYS occlude the 9 tails cleanly from 360°!
      gl.disable(gl.BLEND); gl.depthMask(true);
      gl.bindVertexArray(vaoFox);
      foxInstances.forEach((fx) => { gl.uniformMatrix4fv(uSpr.uModel, false, fx.mat); gl.drawArrays(gl.TRIANGLES, 0, world.fox.count); });
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);

      if (!isRefPass) {
        gl.useProgram(progParticles);
        gl.uniformMatrix4fv(uPrt.uView, false, view); gl.uniformMatrix4fv(uPrt.uProj, false, proj);
        gl.uniform3fv(uPrt.uKunPos, kun1.pos); gl.uniform3fv(uPrt.uKunFwd, kun1.fwd);
        gl.uniform3fv(uPrt.uDrgPos, dragon.pos); gl.uniform3fv(uPrt.uDrgFwd, dragon.fwd);
        gl.uniform3fv(uPrt.uCamPos, camPos);
        gl.uniform1f(uPrt.uTime, elapsed); gl.uniform1f(uPrt.uDPR, Math.min(window.devicePixelRatio || 1, 1.5));
        gl.uniform1f(uPrt.uNight, state.nightVal); gl.uniform1f(uPrt.uMono, state.monoVal);
        gl.bindVertexArray(vaoParticles); gl.drawArrays(gl.POINTS, 0, world.particles.count);
      }

      gl.depthMask(true); gl.disable(gl.BLEND);
    }

    function frame(now) {
      requestAnimationFrame(frame);
      if (document.hidden) { prevTs = now; return; }
      const dt = Math.min(0.05, (now - prevTs) / 1000);
      prevTs = now; elapsed += dt;

      frameCount++;
      if (now - fpsTs >= 500) {
        const fps = Math.round((frameCount * 1000) / (now - fpsTs));
        frameCount = 0; fpsTs = now;
        if (callbacks.onStats) callbacks.onStats({ fps, tris: world.stats.totalTris, mode: state.mode });
      }
      resize();

      state.nightVal += ((state.style === "night" ? 1 : 0) - state.nightVal) * Math.min(1, dt * 3.5);
      state.monoVal  += ((state.style === "mono"  ? 1 : 0) - state.monoVal)  * Math.min(1, dt * 3.5);
      state.curtain  += (state.targetCurtain - state.curtain) * Math.min(1, dt * 7.5);

      const kun1 = computeKunState(elapsed, 0.0, 0.78, 0.0, 1.0);
      const kun2 = computeKunState(elapsed, -0.58, 0.44, -5.5, 0.82); // Graceful Companion Calf Kun!
      const dragon = computeDragonState(elapsed);
      const phoenixes = phoenixSpecs.map((sp) => computePhoenixState(sp, elapsed));
      const boats = computeBoatStates(elapsed);

      // Update Camera across Free Fly + 4 Guided Mythic Realm Tours!
      let camPos, camYaw, camPitch, fovy = 48 * Math.PI / 180;

      if (state.mode === "cruise") {
        state.cruiseT += dt;
        const loopZ = 18.0 - ((state.cruiseT * 3.5 + (qp.get("t") ? Number(qp.get("t")) * 2.5 : 8.5)) % 95.0);
        const cx = ShanHaiGeometry.riverCenterX(loopZ) + 0.5;
        const aheadX = ShanHaiGeometry.riverCenterX(loopZ - 14.0);
        camPos = [cx, 2.55 + Math.sin(elapsed * 1.8) * 0.08, loopZ];
        camYaw = Math.atan2(-(aheadX - cx), 14.0) + state.lookOffsetYaw;
        camPitch = Math.max(-0.55, Math.min(0.95, 0.09 + Math.sin(elapsed * 0.4) * 0.03 + state.lookOffsetPitch));
        state.pos = camPos.slice(); state.yaw = camYaw; state.pitch = camPitch; fovy = 52 * Math.PI / 180;
      } else if (state.mode === "soar") {
        const backX = -kun1.fwd[0] * 30.0 - kun1.fwd[2] * 14.0, backZ = -kun1.fwd[2] * 30.0 + kun1.fwd[0] * 14.0;
        camPos = [kun1.pos[0] + backX, Math.max(13.5, kun1.pos[1] + 2.8), kun1.pos[2] + backZ];
        const dx = kun1.pos[0] - camPos[0], dy = kun1.pos[1] - 1.5 - camPos[1], dz = kun1.pos[2] - camPos[2];
        camYaw = Math.atan2(-dx, -dz) + state.lookOffsetYaw;
        camPitch = Math.max(-0.62, Math.min(0.92, Math.atan2(dy, Math.hypot(dx, dz)) + state.lookOffsetPitch));
        state.pos = camPos.slice(); state.yaw = camYaw; state.pitch = camPitch; fovy = 50 * Math.PI / 180;
      } else if (state.mode === "dragon") {
        // Unobstructed panoramic viewpoint PAST the Sky-Bridge framing the full 75m Celestial Gate, 7-Tier Pagoda & 70m Dragon!
        const orb = elapsed * 0.10;
        camPos = [Math.sin(orb) * 16.0, 26.0 + Math.sin(orb * 1.4) * 3.0, -133.0 + Math.cos(orb) * 5.0];
        const aimX = dragon.pos[0] * 0.35, aimY = 33.0 + (dragon.pos[1] - 36.0) * 0.35, aimZ = -182.0;
        const dx = aimX - camPos[0], dy = aimY - camPos[1], dz = aimZ - camPos[2];
        camYaw = Math.atan2(-dx, -dz) + state.lookOffsetYaw;
        camPitch = Math.max(-0.62, Math.min(0.92, Math.atan2(dy, Math.hypot(dx, dz)) + state.lookOffsetPitch));
        state.pos = camPos.slice(); state.yaw = camYaw; state.pitch = camPitch; fovy = 58 * Math.PI / 180;
      } else if (state.mode === "qingqiu") {
        // Serene 3/4 portrait angle showing Nine-Tailed Spirit Fox face, glowing amber eyes, 9-tail halo, Spirit Stag & Paifang!
        const orb = elapsed * 0.11 + 0.12;
        camPos = [-85.5 + Math.sin(orb) * 6.5, 13.0 + Math.sin(orb * 1.4) * 1.2, -61.5 + Math.cos(orb) * 4.5];
        const dx = -94.2 - camPos[0], dy = 11.4 - camPos[1], dz = -76.2 - camPos[2];
        camYaw = Math.atan2(-dx, -dz) + state.lookOffsetYaw;
        camPitch = Math.max(-0.62, Math.min(0.92, Math.atan2(dy, Math.hypot(dx, dz)) + state.lookOffsetPitch));
        state.pos = camPos.slice(); state.yaw = camYaw; state.pitch = camPitch; fovy = 48 * Math.PI / 180;
      } else if (state.mode === "phoenix") {
        // Eastern Danshan Sun Spire & Soaring Crimson-Gold Vermilion Phoenixes!
        const ph = phoenixes[0];
        const orb = elapsed * 0.11 + 0.2;
        camPos = [78.0 + Math.sin(orb) * 12.0, 23.0 + Math.sin(orb * 1.4) * 3.0, -70.0 + Math.cos(orb) * 10.0];
        const dx = (104.0 + ph.pos[0]) * 0.5 - camPos[0], dy = (25.0 + ph.pos[1]) * 0.5 - camPos[1], dz = (-96.0 + ph.pos[2]) * 0.5 - camPos[2];
        camYaw = Math.atan2(-dx, -dz) + state.lookOffsetYaw;
        camPitch = Math.max(-0.62, Math.min(0.92, Math.atan2(dy, Math.hypot(dx, dz)) + state.lookOffsetPitch));
        state.pos = camPos.slice(); state.yaw = camYaw; state.pitch = camPitch; fovy = 52 * Math.PI / 180;
      } else {
        const sm = Math.min(1, dt * 10.0);
        state.yaw += (state.targetYaw - state.yaw) * sm;
        state.pitch += (state.targetPitch - state.pitch) * sm;
        const fwd = [-Math.sin(state.yaw) * Math.cos(state.pitch), Math.sin(state.pitch), -Math.cos(state.yaw) * Math.cos(state.pitch)];
        const right = [Math.cos(state.yaw), 0, -Math.sin(state.yaw)];
        const boost = state.keys["shift"] ? 2.4 : 1.0; // Shift = Swift Wind-Glide (御風加速)!
        const acc = 64.0 * boost * dt;
        if (state.keys["w"] || state.keys["arrowup"])    { state.vel[0] += fwd[0]*acc; state.vel[1] += fwd[1]*acc; state.vel[2] += fwd[2]*acc; }
        if (state.keys["s"] || state.keys["arrowdown"])  { state.vel[0] -= fwd[0]*acc; state.vel[1] -= fwd[1]*acc; state.vel[2] -= fwd[2]*acc; }
        if (state.keys["d"] || state.keys["arrowright"]) { state.vel[0] += right[0]*acc; state.vel[2] += right[2]*acc; }
        if (state.keys["a"] || state.keys["arrowleft"])  { state.vel[0] -= right[0]*acc; state.vel[2] -= right[2]*acc; }
        if (state.keys[" "] || state.keys["e"])          { state.vel[1] += acc * 0.72; }
        if (state.keys["q"] || state.keys["c"])          { state.vel[1] -= acc * 0.72; }
        const damp = Math.exp(-4.2 * dt);
        for (let i = 0; i < 3; i++) { state.pos[i] += state.vel[i] * dt; state.vel[i] *= damp; }
        clampSafeFPSPos(state.pos);
        const brY = state.entered ? 0 : Math.sin(elapsed * 0.42) * 0.14;
        const brW = state.entered ? 0 : Math.sin(elapsed * 0.20) * 0.022;
        camPos = [state.pos[0], state.pos[1] + brY, state.pos[2]];
        camYaw = state.yaw + brW; camPitch = state.pitch;
        fovy = (state.entered ? 50 : 45) * Math.PI / 180;
      }

      // Live Realm Discovery Whisper!
      if (state.entered && callbacks.onRegion) {
        const reg = detectRegion(camPos);
        if (reg.id !== state.lastRegion) {
          state.lastRegion = reg.id;
          callbacks.onRegion(reg);
        }
      }

      const lookDir = [-Math.sin(camYaw) * Math.cos(camPitch), Math.sin(camPitch), -Math.cos(camYaw) * Math.cos(camPitch)];
      const target = [camPos[0] + lookDir[0] * 18, camPos[1] + lookDir[1] * 18, camPos[2] + lookDir[2] * 18];
      const aspect = curW / curH;
      let effFovy = fovy;
      if (aspect < 1.25) {
        const aspectScale = Math.pow(1.25 / Math.max(aspect, 0.44), 0.56);
        effFovy = Math.min(78 * Math.PI / 180, 2.0 * Math.atan(Math.tan(fovy * 0.5) * aspectScale));
      }
      const proj = mat4Perspective(effFovy, aspect, 0.5, 460.0);
      const view = mat4LookAt(camPos, target, [0, 1, 0]);

      if (!shadowBaked) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fboShadow); gl.viewport(0, 0, SHADOW_RES, SHADOW_RES);
        gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND); gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.useProgram(progShadow); gl.uniformMatrix4fv(uSh.uLightVP, false, lightVP); gl.uniformMatrix4fv(uSh.uModel, false, identity); gl.uniform1f(uSh.uTime, elapsed);
        gl.bindVertexArray(vaoSolid); gl.drawArrays(gl.TRIANGLES, 0, world.solid.count);
        shadowBaked = true;
      }

      const refEye = [camPos[0], -camPos[1], camPos[2]], refTgt = [target[0], -target[1], target[2]];
      const refView = mat4LookAt(refEye, refTgt, [0, 1, 0]);
      refVPGlobal = mat4Mul(proj, refView);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboRef); gl.viewport(0, 0, refW, refH); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      drawSceneContent(refView, proj, refEye, kun1, kun2, dragon, phoenixes, boats, 1.0, true);

      gl.bindFramebuffer(gl.FRAMEBUFFER, fboMain); gl.viewport(0, 0, curW, curH);
      gl.clearBufferfv(gl.COLOR, 0, new Float32Array([0, 0, 0, 0]));
      gl.clearBufferfv(gl.COLOR, 1, new Float32Array([0.5, 0.5, 1.0, 0.0]));
      gl.clearBufferfv(gl.COLOR, 2, new Float32Array([0, 0, 0, 0]));
      gl.clearBufferfi(gl.DEPTH_STENCIL, 0, 1.0, 0);
      drawSceneContent(view, proj, camPos, kun1, kun2, dragon, phoenixes, boats, 0.0, false);

      const mainVP = mat4Mul(proj, view);
      const sunProj = projectPoint(mainVP, camPos[0] + SUN_DIR[0] * 260, camPos[1] + SUN_DIR[1] * 260, camPos[2] + SUN_DIR[2] * 260);
      const sunVis = sunProj.inFront ? Math.pow(Math.max(0, lookDir[0] * SUN_DIR[0] + lookDir[1] * SUN_DIR[1] + lookDir[2] * SUN_DIR[2]), 2.2) : 0.0;

      gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.bindVertexArray(vaoEmpty);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboBloomA); gl.viewport(0, 0, blmW, blmH);
      gl.useProgram(progBloomRays);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texColor); gl.uniform1i(uRay.uColorTex, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texWire);  gl.uniform1i(uRay.uWireTex, 1);
      gl.uniform2f(uRay.uSunUV, sunProj.u, sunProj.v); gl.uniform1f(uRay.uSunVis, sunVis);
      gl.uniform1f(uRay.uNight, state.nightVal); gl.uniform1f(uRay.uMono, state.monoVal);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindFramebuffer(gl.FRAMEBUFFER, fboBloomB); gl.useProgram(progBlur);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texBloomA); gl.uniform1i(uBlr.uTex, 0);
      gl.uniform2f(uBlr.uStep, 0.85 / blmW, 0.0); gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindFramebuffer(gl.FRAMEBUFFER, fboBloomA);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texBloomB); gl.uniform1i(uBlr.uTex, 0);
      gl.uniform2f(uBlr.uStep, 0.0, 0.85 / blmH); gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, curW, curH);
      gl.useProgram(progFinal);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texColor);  gl.uniform1i(uFin.uColorTex, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texData);   gl.uniform1i(uFin.uDataTex, 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, texWire);   gl.uniform1i(uFin.uWireTex, 2);
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, texBloomA); gl.uniform1i(uFin.uBloomTex, 3);
      gl.uniform2f(uFin.uRes, curW, curH); gl.uniform1f(uFin.uTime, elapsed);
      gl.uniform1f(uFin.uNight, state.nightVal); gl.uniform1f(uFin.uMono, state.monoVal);
      gl.uniform1f(uFin.uCurtain, state.curtain);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    resize();
    requestAnimationFrame(frame);

    return {
      state,
      enterScroll() { notifyEnter(); state.vel[2] -= 13.5; },
      resetView() {
        state.mode = "free"; state.pos = SPAWN_POS.slice(); state.vel = [0, 0, 0];
        state.yaw = state.targetYaw = SPAWN_YAW; state.pitch = state.targetPitch = SPAWN_PITCH;
        state.lookOffsetYaw = 0; state.lookOffsetPitch = 0;
      },
      setMode(m) {
        notifyEnter(); state.mode = m; state.lookOffsetYaw = 0; state.lookOffsetPitch = 0;
        if (m === "free") { state.targetYaw = state.yaw; state.targetPitch = state.pitch; }
      },
      setStyle(s) { state.style = s; },
      setCurtain(v) { state.targetCurtain = Math.max(0, Math.min(1, v)); },
      getStats() { return { tris: world.stats.totalTris }; }
    };
  }

  return { create };
})();
