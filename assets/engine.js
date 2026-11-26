/**
 * 《山海汴京圖》v3 — Fine-Art Splash-Ink & Xuan-Paper WebGL2 Engine
 * Built for pure painterly fine art — hiding every WebGL polygon limit through:
 *   - Domain-Warped Splash-Ink Mineral Mountain Shading (張大千潑彩 × 千里江山金碧)
 *   - Mountain Base Mist Dissolution into Luminous Xuan Paper (山腳留白・雲斷山腰)
 *   - True Planar Mirror Ink-Water + Concentric Ripples around the Lone Boatman (孤舟漣漪)
 *   - Capillary Xuan-Paper Ink-Bleed UV Displacement + Watercolor Wet-Edge Pooling (水痕邊)
 *   - Adaptive 4-Sector Painterly Kuwahara Brushwork + Gold-Flecked Xuan Paper (灑金宣紙)
 *   - Unobstructed 360° First-Person Exploration + Guided River Cruise & Cloud Kun Soar
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
     2. Shared Museum Palette & Paper-Mist GLSL Helpers
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

    // Strict Museum Fine-Art Paper & Negative-Space Sky Palette (60% luminous Xuan paper!)
    vec3 getPaperColor(float nightV, float monoV) {
      vec3 xuanJade = vec3(0.935, 0.892, 0.798); // Warm aged Imperial Xuan paper (灑金宣紙)
      vec3 xuanMono = vec3(0.945, 0.915, 0.848); // Crisp Song-Yuan gallery paper
      vec3 xuanNgt  = vec3(0.065, 0.115, 0.195); // Nocturnal Lapis-Obsidian Silk
      vec3 c = mix(xuanJade, xuanNgt, nightV);
      return mix(c, xuanMono, monoV);
    }

    vec3 getSkyColor(vec3 dir, vec3 sunDir, float nightV, float monoV) {
      float h = clamp(dir.y, -0.1, 1.0);
      // Style 1 (潑彩青綠): Luminous Warm Xuan Paper melting upward into soft antique pale celadon silk!
      vec3 dayHor = vec3(0.955, 0.905, 0.795);
      vec3 dayMid = vec3(0.875, 0.885, 0.822);
      vec3 dayTop = vec3(0.665, 0.768, 0.758);
      vec3 dayCol = mix(dayHor, dayMid, smoothstep(0.0, 0.30, h));
      dayCol = mix(dayCol, dayTop, smoothstep(0.26, 0.85, h));

      // Style 3 (幽冥青燈): Midnight Lapis-Indigo Silk with warm horizon breath
      vec3 ngtHor = vec3(0.085, 0.145, 0.235);
      vec3 ngtMid = vec3(0.045, 0.085, 0.165);
      vec3 ngtTop = vec3(0.015, 0.032, 0.075);
      vec3 ngtCol = mix(ngtHor, ngtMid, smoothstep(0.0, 0.32, h));
      ngtCol = mix(ngtCol, ngtTop, smoothstep(0.28, 0.85, h));

      vec3 col = mix(dayCol, ngtCol, nightV);

      // Style 2 (墨韻丹砂): Pure Gallery Xuan Paper Wash
      vec3 monoHor = vec3(0.955, 0.922, 0.852);
      vec3 monoTop = vec3(0.845, 0.822, 0.768);
      vec3 monoCol = mix(monoHor, monoTop, smoothstep(0.0, 0.82, h));
      col = mix(col, monoCol, monoV);

      // Subtle atmospheric solar/lunar glow
      float sunCos = max(dot(normalize(dir), normalize(sunDir)), 0.0);
      vec3 glowCol = mix(vec3(1.0, 0.74, 0.42), vec3(0.55, 0.76, 0.98), nightV);
      glowCol = mix(glowCol, vec3(0.98, 0.56, 0.36), monoV);
      col += glowCol * (pow(sunCos, 7.0) * 0.22 + pow(sunCos, 45.0) * 0.32);
      return col;
    }

    // Painterly Song Negative-Space Mist (雲斷山腰・山腳留白 — erases all 3D polygon horizons!)
    vec3 applyInkMist(vec3 col, vec3 worldPos, vec3 camPos, vec3 sunDir, float nightV, float monoV, float isTerrain) {
      vec3 v = worldPos - camPos;
      float dist = length(v);
      vec3 dir = v / max(dist, 0.001);

      // Crisp near-mid readability, then layered receding ink-wash veil!
      float distFog = 1.0 - exp(-pow(max(dist - 22.0, 0.0) * 0.0102, 1.32));

      // CRITICAL FINE-ART SECRET: Mountain waists & bases past 32m dissolve into pure Xuan-paper mist (山腳留白!)
      // So distant peak summits float poetically above misty white paper, creating infinite 2D-scroll depth!
      float farWeight = smoothstep(26.0, 56.0, dist);
      float baseDissolve = isTerrain * farWeight * (1.0 - smoothstep(0.8, 17.5 + dist * 0.08, worldPos.y)) * 0.92;
      float lowValleyMist = exp(-max(worldPos.y - 0.8, 0.0) * 0.115) * smoothstep(24.0, 68.0, dist) * 0.68;

      float fogAmt = clamp(max(distFog, max(baseDissolve, lowValleyMist)), 0.0, 0.95);

      float sunAmt = pow(max(dot(dir, normalize(sunDir)), 0.0), 4.0);
      vec3 paper = getPaperColor(nightV, monoV);
      vec3 warmSunMist = mix(vec3(0.99, 0.89, 0.72), vec3(0.22, 0.34, 0.48), nightV);
      warmSunMist = mix(warmSunMist, vec3(0.98, 0.92, 0.82), monoV);
      vec3 mistCol = mix(paper, warmSunMist, sunAmt * 0.45);

      return mix(col, mistCol, fogAmt);
    }
  `;

  /* ==========================================================================
     3. Shaders
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
      if (aExtra.x > 8.5 && aExtra.z > 0.05) pos.y += sin(uTime * 5.2 + aExtra.z * 2.0) * aExtra.z * 0.55;
      gl_Position = uLightVP * uModel * vec4(pos, 1.0);
    }
  `;
  const FS_SHADOW = `#version 300 es
    precision highp float;
    void main() {}
  `;

  // --- Sky Dome: Antique Gold-Flecked Silk Scroll Sky + Vermilion Imperial Sun / Pale Ivory Moon ---
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

      // Subtle dry-brush mineral ink wash bands drifting high across the Xuan paper sky
      if (dir.y > 0.01) {
        vec2 cuv = dir.xz / (dir.y + 0.28) * 0.55 + vec2(uTime * 0.003, -uTime * 0.0015);
        float c1 = fbm2(cuv * 1.3);
        float c2 = fbm2(cuv * 2.5 + vec2(c1 * 1.4, -c1 * 0.8));
        float wash = smoothstep(0.46, 0.80, c2) * smoothstep(0.02, 0.24, dir.y) * smoothstep(0.85, 0.25, dir.y);
        vec3 washTint = mix(vec3(0.72, 0.80, 0.77), vec3(0.14, 0.24, 0.36), uNight);
        washTint = mix(washTint, vec3(0.82, 0.80, 0.74), uMono);
        col = mix(col, washTint, wash * 0.26);
      }

      // Iconic Vermilion-Gold Sun Seal (Day / Sumi-e) OR Luminous Ivory Full Moon (Night!)
      float cosA = dot(dir, sunD);
      float disc = smoothstep(0.9980, 0.9989, cosA);
      float halo = pow(max(cosA, 0.0), 140.0);
      // Cinnabar-vermilion painted sun disc (instant Chinese scroll signature!)
      vec3 daySun = vec3(0.88, 0.28, 0.19);
      vec3 ngtMoon = vec3(0.96, 0.96, 0.92);
      vec3 discCol = mix(daySun, ngtMoon, uNight);
      discCol = mix(discCol, vec3(0.86, 0.20, 0.16), uMono);
      // Soft wet-ink bleed around sun disc edge
      float sunEdge = smoothstep(0.9968, 0.9984, cosA) * (1.0 - disc);
      col = mix(col, discCol, disc * 0.86 + sunEdge * 0.28);
      col += mix(vec3(1.0, 0.68, 0.38), vec3(0.55, 0.78, 1.0), uNight) * halo * 0.48;

      // Subtle constellations in Nocturnal Lapis mode
      if (uNight > 0.05 && dir.y > 0.08) {
        vec2 suv = floor(dir.xz / (dir.y + 0.18) * 145.0);
        float st = hash12(suv);
        float star = step(0.9968, st) * smoothstep(0.08, 0.34, dir.y) * (0.55 + 0.45 * sin(uTime * 2.2 + st * 90.0));
        col += vec3(0.92, 0.88, 0.74) * star * uNight * (1.0 - uMono) * 0.75;
      }

      float skyEm = disc * mix(0.45, 0.95, uNight) + halo * 0.35;
      oColor = vec4(col, 0.0); // alpha = 0 marks Sky!
      oData  = vec4(0.5, 0.5, 1.0, 0.0);
      oWire  = vec4(0.04, 0.0, clamp(skyEm, 0.0, 1.0), 1.0);
    }
  `;

  // --- Main Solid World: Splash-Ink Karst Mountains + Calligraphic Song Architecture ---
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
      // Crane wings flap (matId == 9.0)
      if (aExtra.x > 8.5 && aExtra.z > 0.05) {
        pos.y += sin(uTime * 5.2 + aExtra.z * 2.0) * aExtra.z * 0.55;
      }
      // Fluttering Cinnabar Silk Ribbons on Rainbow Bridge & Pavilion (matId == 8.0)
      if (aExtra.x > 7.5 && aExtra.x < 8.5) {
        float t = aExtra.y;
        pos.x += sin(uTime * 2.8 - t * 4.5 + pos.z) * t * 0.48;
        pos.z += cos(uTime * 2.1 - t * 3.8 + pos.x) * t * 0.25;
      }
      vec4 wp = uModel * vec4(pos, 1.0);
      vWorldPos = wp.xyz;
      vNorm = normalize(mat3(uModel) * aNorm);
      vCol = aCol;
      vBary = aBary;
      vExtra = aExtra;
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

      vec3 N = normalize(vNorm);
      vec3 V = normalize(uCamPos - vWorldPos);
      vec3 L = normalize(uSunDir);
      float matId = vExtra.x;
      float ao = clamp(vExtra.w, 0.35, 1.0);
      float emissive = 0.0;
      float edgeCtrl = 0.85;
      vec3 litCol;

      // =========================================================================
      // MATERIAL 0: TRUE FINE-ART SPLASH-INK KARST MOUNTAINS (張大千潑彩 × 千里江山!)
      // ZERO plastic 3D Lambert lighting — PURE ink-wash tonal gradation & gold-leaf rims!
      // =========================================================================
      if (matId < 0.5) {
        edgeCtrl = 0.48;
        float h = vWorldPos.y;
        float slope = 1.0 - clamp(N.y, 0.0, 1.0);

        // 2-Stage Domain-Warped Splash-Ink Watercolor Bloom (潑墨潑彩水暈!)
        vec2 mp = vec2(vWorldPos.x * 0.042 + vWorldPos.z * 0.032, h * 0.075);
        vec2 q = vec2(fbm2(mp), fbm2(mp + vec2(5.2, 1.3)));
        float splash = fbm2(mp + 2.9 * q);

        // Sweeping Vertical Calligraphic Fu-Pi Cun Rock Brushwork (斧劈皴飛白!)
        vec2 cunUV = vec2(vWorldPos.x * 0.16 + vWorldPos.z * 0.16, h * 0.44) + q * 0.85;
        float cun = fbm2(cunUV);
        float dryStroke = smoothstep(0.28, 0.78, cun);

        // Ink-Wash Tonal Separation: Top Crests = Concentrated Dark Ink & Jewel Mineral; Bases = Soft Paper Wash!
        float crestDark = smoothstep(2.0, 26.0, h);
        float sunFace = dot(N, L) * 0.5 + 0.5;
        // Soft ink-wash quantization (墨分五色: breaks up smooth plastic 3D polygon gradients!)
        float inkStep = mix(sunFace, floor(sunFace * 4.5 + cun * 0.9) / 4.5, 0.38);

        // --- Palette 1: Splash-Ink Mineral Jade, Lapis Azurite, Sumi Ink & Gold-Leaf (潑彩青綠) ---
        vec3 sumiInk   = vec3(0.06, 0.10, 0.14); // Velvety charred Sumi pine-soot ink (焦墨)
        vec3 malachite = vec3(0.08, 0.44, 0.40); // Zhang Daqian mineral turquoise-malachite (石綠)
        vec3 azurite   = vec3(0.07, 0.25, 0.46); // Wang Ximeng deep lapis azurite (石青)
        vec3 ochreWash = vec3(0.54, 0.43, 0.28); // Delicate warm ochre underpainting ONLY on sunlit shoulders!
        vec3 paperMist = vec3(0.92, 0.88, 0.78);

        // Pool mineral turquoise & azurite organically across the rock like wet-on-wet ink!
        float camDist = length(vWorldPos - uCamPos);
        float nearCrag = 1.0 - smoothstep(42.0, 64.0, camDist);

        vec3 mineral = mix(malachite, azurite, smoothstep(0.28, 0.70, splash + crestDark * 0.38));
        mineral = mix(mineral, ochreWash, smoothstep(0.62, 0.90, sunFace) * (1.0 - crestDark * 0.70) * 0.32);
        // Deep calligraphic Fu-Pi Cun dark ink on near crags & steep cliff shadows (NEVER pale white snow mounds!)
        vec3 jadeMount = mix(sumiInk, mineral, 0.28 + 0.72 * inkStep * dryStroke);
        // Near bridge crags stay rich sculpted charcoal-jade rock; ONLY mid/far mountains fade low waists into paper!
        float lowFade = smoothstep(0.0, 10.5, h);
        float baseWashAmt = (1.0 - lowFade) * (1.0 - nearCrag * 0.86);
        jadeMount = mix(jadeMount, mix(paperMist, vec3(0.24, 0.42, 0.44), 0.32 + 0.25 * dryStroke), baseWashAmt * 0.68);

        // Iconic Fine Gold-Leaf Ridge Highlight (金碧山水泥金勾勒!)
        float rimView = pow(1.0 - max(dot(N, V), 0.0), 2.4);
        float goldLine = smoothstep(0.42, 0.84, sunFace) * smoothstep(4.0, 20.0, h) * (rimView * 0.80 + smoothstep(0.64, 0.90, cun) * 0.45);
        jadeMount += vec3(0.82, 0.60, 0.24) * goldLine * 0.82;

        // --- Palette 3: Nocturnal Lapis-Obsidian with Molten Gold-Leaf Silhouettes (幽冥青燈) ---
        vec3 ngtDark = vec3(0.025, 0.055, 0.105);
        vec3 ngtMid  = vec3(0.075, 0.165, 0.265);
        vec3 ngtMount = mix(ngtDark, ngtMid, inkStep * dryStroke * (0.4 + 0.6 * crestDark));
        float moonGold = rimView * smoothstep(3.5, 19.0, h) * (0.45 + 0.55 * sunFace);
        ngtMount += mix(vec3(0.85, 0.68, 0.34), vec3(0.42, 0.72, 0.95), 0.42) * moonGold * 0.85;

        litCol = mix(jadeMount, ngtMount, uNight);

        // --- Palette 2: Black-Myth Pure Sumi-e Ink Wash (墨韻丹砂: 焦濃重淡清!) ---
        if (uMono > 0.01) {
          float nearInkBoost = mix(lowFade, 0.92, nearCrag);
          float inkDensity = clamp(0.20 + 0.80 * (1.0 - inkStep * 0.56) * (0.45 + 0.55 * dryStroke) * (0.42 + 0.58 * nearInkBoost), 0.0, 1.0);
          vec3 sumiWash = mix(vec3(0.88, 0.85, 0.78), vec3(0.06, 0.07, 0.09), smoothstep(0.10, 0.86, inkDensity));
          sumiWash = mix(sumiWash, vec3(0.93, 0.90, 0.83), smoothstep(0.72, 0.92, cun) * slope * 0.42);
          litCol = mix(litCol, sumiWash, uMono);
        }

        // Delicate waterline mist feather right where rock meets calm mirror water (y = 0..0.75)
        float waterEdge = 1.0 - smoothstep(-0.2, 0.78, h);
        litCol = mix(litCol, getPaperColor(uNight, uMono) * mix(0.86, 1.08, uNight), waterEdge * 0.46);

        litCol = applyInkMist(litCol, vWorldPos, uCamPos, L, uNight, uMono, 1.0 - nearCrag * 0.72);
      }
      // =========================================================================
      // ARCHITECTURAL SILHOUETTES, LANTERNS, RIBBONS, LONE BOATMAN & CRANES
      // =========================================================================
      else {
        vec3 albedo = vCol;
        if (matId < 1.5) {
          // Glazed dark-ink ceramic Song roof tiles
          float rib = sin(vExtra.y * 6.28318 * 1.4) * 0.5 + 0.5;
          albedo *= (0.78 + 0.32 * rib);
          vec3 H = normalize(L + V);
          albedo += mix(vec3(0.95, 0.78, 0.44), vec3(0.55, 0.74, 0.96), uNight) * pow(max(dot(N, H), 0.0), 26.0) * 0.45;
        } else if (matId > 3.5 && matId < 4.5) {
          // Radiant Warm Cinnabar Lanterns & Candlelit Pavilion Screens
          float flick = 0.93 + 0.07 * sin(uTime * 3.6 + vWorldPos.x * 1.8 + vWorldPos.z * 1.3);
          float gx = abs(fract(vWorldPos.x * 2.5 + vWorldPos.z * 2.5) - 0.5);
          float gy = abs(fract(vWorldPos.y * 2.7) - 0.5);
          float mull = smoothstep(0.41, 0.48, max(gx, gy));
          vec3 glow = mix(vec3(1.0, 0.66, 0.28), vec3(1.0, 0.52, 0.18), uNight * 0.45) * flick * mix(1.08, 1.58, uNight);
          albedo = mix(glow, vec3(0.12, 0.09, 0.08), mull * 0.48 * step(0.85, vExtra.w));
          emissive = mix(0.75, 1.0, uNight) * (1.0 - mull * 0.32);
        } else if (matId > 7.5 && matId < 8.5) {
          // Fluttering Cinnabar Silk Ribbon — blazing fine-art focal red!
          albedo = vec3(0.86, 0.17, 0.14) * (0.85 + 0.25 * sin(vExtra.y * 6.0 - uTime * 3.0));
          emissive = mix(0.18, 0.45, uNight);
        } else {
          float grain = fbm2(vec2(vWorldPos.x * 2.2 + vWorldPos.z * 2.2, vWorldPos.y * 1.2));
          albedo *= (0.84 + 0.28 * grain);
        }

        float shadow = (matId > 3.5 && matId < 4.5) ? 1.0 : calcShadow(vLightPos, N, L);
        float ndl = max(dot(N, L), 0.0);
        vec3 sunC = mix(vec3(1.08, 0.90, 0.66), vec3(0.38, 0.52, 0.80), uNight);
        vec3 ambC = mix(vec3(0.56, 0.62, 0.62), vec3(0.12, 0.18, 0.28), uNight);

        // Warm lantern bounce on bridge & pavilion timbers!
        float dBridge = length(vWorldPos - vec3(0.0, 6.0, -19.0));
        float dPav = length(vWorldPos - vec3(-16.8, 7.5, -18.5));
        vec3 warmB = vec3(1.0, 0.48, 0.18) * (exp(-dBridge * 0.09) * 0.8 + exp(-dPav * 0.12) * 0.7) * mix(0.16, 0.92, uNight);

        litCol = (matId > 3.5 && matId < 4.5)
          ? albedo
          : albedo * (ambC * 0.75 + sunC * (ndl * shadow * 0.82 + 0.16)) * ao + warmB * albedo;

        // Black-Myth Sumi-e Mode: Crisp Jet Ink Silhouettes + BLAZING Cinnabar Vermilion Accents!
        if (uMono > 0.01) {
          float lum = dot(litCol, vec3(0.299, 0.587, 0.114));
          vec3 inkA = mix(vec3(0.07, 0.08, 0.10), vec3(0.88, 0.85, 0.78), smoothstep(0.04, 0.88, lum));
          float isRed = smoothstep(0.16, 0.36, litCol.r - max(litCol.g, litCol.b));
          if (matId > 3.5 && matId < 4.5) inkA = mix(vec3(0.95, 0.32, 0.18), vec3(1.0, 0.66, 0.32), 0.35);
          else inkA = mix(inkA, vec3(0.86, 0.16, 0.13), isRed * 0.95);
          litCol = mix(litCol, inkA, uMono);
        }

        litCol = applyInkMist(litCol, vWorldPos, uCamPos, L, uNight, uMono, 0.0);
      }

      vec3 fw = fwidth(vBary);
      vec3 a3 = smoothstep(vec3(0.0), fw * 1.35, vBary);
      float wire = 1.0 - min(min(a3.x, a3.y), a3.z);
      float clay = clamp((dot(N, normalize(vec3(0.4, 0.8, 0.4))) * 0.45 + 0.55) * ao, 0.15, 1.0);
      float linDepth = clamp(length(vWorldPos - uCamPos) / 165.0, 0.0, 1.0);

      oColor = vec4(litCol, 1.0);
      oData  = vec4(N.x * 0.5 + 0.5, N.z * 0.5 + 0.5, linDepth, edgeCtrl);
      oWire  = vec4(clay, wire, emissive, 0.0);
    }
  `;

  // --- Infinite Mirror Xuan-Paper Ink Water + Lone Boatman Concentric Ink Ripples! ---
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
    void main() {
      vWorldPos = aPos;
      vBary = aBary;
      vRefClip = uRefVP * vec4(aPos, 1.0);
      gl_Position = uProj * uView * vec4(aPos, 1.0);
    }
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
      vec3 V = normalize(uCamPos - vWorldPos);
      vec3 L = normalize(uSunDir);
      float dist = length(vWorldPos - uCamPos);
      vec2 p = vWorldPos.xz;

      // Delicate silky horizontal ink-brush ripples
      float w1 = fbm2(vec2(p.x * 0.34, p.y * 0.14 - uTime * 0.24));
      float w2 = fbm2(vec2(p.x * 0.72 + 4.1, p.y * 0.28 + uTime * 0.18));
      float rx = (w1 - 0.5) * 0.022 + (w2 - 0.5) * 0.012;
      float ry = (w2 - 0.5) * 0.014 + sin(p.y * 1.15 - uTime * 1.3 + w1 * 3.5) * 0.006;

      // Concentric calligraphic ink ripple rings expanding around the Lone Boatman (孤舟漣漪!)
      float dBoat = length(p - uBoatPos.xz);
      float ringWave = sin(dBoat * 3.2 - uTime * 2.6) * exp(-dBoat * 0.14) * smoothstep(1.2, 2.8, dBoat);
      rx += ringWave * 0.014;
      ry += ringWave * 0.010;

      vec3 N = normalize(vec3(rx * 4.0, 1.0, ry * 6.0));

      // True Planar Mirror Reflection FBO
      vec2 refUV = (vRefClip.xy / max(vRefClip.w, 0.001)) * 0.5 + 0.5;
      float damp = clamp(1.0 - dist * 0.0045, 0.25, 1.0);
      vec2 wUV = clamp(refUV + vec2(rx, ry * 1.3) * damp, vec2(0.004), vec2(0.996));
      vec3 refl = texture(uReflectTex, wUV).rgb;

      // Serene Song Xuan-paper & pale celadon mirror water base (水天一色!)
      vec3 paperBase = mix(vec3(0.76, 0.82, 0.78), vec3(0.035, 0.068, 0.125), uNight);
      paperBase = mix(paperBase, vec3(0.88, 0.86, 0.80), uMono);

      float fres = 0.28 + 0.68 * pow(1.0 - max(dot(N, V), 0.0), 2.8);
      vec3 col = mix(paperBase, refl * mix(0.96, 1.06, uNight), fres);

      // Subtle painted ink ring highlight around the lone boatman!
      float ringLine = smoothstep(0.45, 0.92, ringWave);
      col = mix(col, mix(vec3(0.18, 0.28, 0.30), vec3(0.92, 0.80, 0.55), uNight), ringLine * 0.26);

      // Shimmering sun/moon liquid gold brush glint!
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(N, H), 0.0), 120.0);
      vec3 glintC = mix(vec3(1.0, 0.80, 0.44), vec3(0.72, 0.84, 1.0), uNight);
      glintC = mix(glintC, vec3(0.98, 0.54, 0.34), uMono * 0.75);
      col += glintC * spec * 0.88;

      // Seamless merge into infinite Xuan-paper mist horizon!
      float horFade = 1.0 - exp(-pow(max(dist - 28.0, 0.0) * 0.0115, 1.42));
      col = mix(col, getPaperColor(uNight, uMono), clamp(horFade, 0.0, 0.98));

      float glow = clamp(spec * 0.45 + max(refl.r - 0.80, 0.0) * 1.2, 0.0, 0.55);
      vec3 fw = fwidth(vBary);
      vec3 a3 = smoothstep(vec3(0.0), fw * 1.35, vBary);
      float wire = 1.0 - min(min(a3.x, a3.y), a3.z);

      oColor = vec4(col, 1.0);
      oData  = vec4(0.5, 0.5, clamp(dist / 165.0, 0.0, 1.0), 0.08);
      oWire  = vec4(0.26, wire * 0.75, glow, 0.0);
    }
  `;

  // --- Calligraphic Silhouette Foliage (焦墨松針 / 朱砂丹楓) ---
  const VS_FOLIAGE = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aCenter;
    layout(location=1) in vec2 aOffset;
    layout(location=2) in vec3 aNorm;
    layout(location=3) in vec3 aCol;
    layout(location=4) in vec4 aSeed;
    uniform mat4 uView;
    uniform mat4 uProj;
    uniform float uTime;
    out vec2 vUV;
    out vec3 vWorldPos;
    out vec3 vNorm;
    out vec3 vCol;
    out vec4 vSeed;
    void main() {
      vec3 r = vec3(uView[0][0], uView[1][0], uView[2][0]);
      vec3 u = normalize(mix(vec3(uView[0][1], uView[1][1], uView[2][1]), vec3(0.0, 1.0, 0.0), 0.35));
      float sway = sin(uTime * 1.35 + aCenter.x * 0.35 + aSeed.x) * 0.14 * aSeed.z;
      vec3 wp = aCenter + r * (aOffset.x + sway) + u * (aOffset.y * 0.82); // Horizontal Song pine pad ratio!
      vWorldPos = wp;
      vUV = aOffset / max(aSeed.w, 0.01);
      vNorm = normalize(aNorm);
      vCol = aCol;
      vSeed = aSeed;
      gl_Position = uProj * uView * vec4(wp, 1.0);
    }
  `;

  const FS_FOLIAGE = `#version 300 es
    precision highp float;
    in vec2 vUV;
    in vec3 vWorldPos;
    in vec3 vNorm;
    in vec3 vCol;
    in vec4 vSeed;
    uniform vec3 uCamPos;
    uniform vec3 uSunDir;
    uniform float uNight;
    uniform float uMono;
    uniform float uClipY;
    ${GLSL_COMMON}
    layout(location=0) out vec4 oColor;
    layout(location=1) out vec4 oData;
    layout(location=2) out vec4 oWire;

    void main() {
      if (uClipY > 0.5 && vWorldPos.y < -0.15) discard;
      float bType = vSeed.y, seed = vSeed.x;
      float nTex = fbm2(vUV * 4.2 + vec2(seed, seed * 0.7));
      float ang = atan(vUV.y, vUV.x), rad = length(vUV * vec2(0.95, 1.25));
      float br = (bType > 1.5)
        ? sin(ang * 7.0 + seed) * 0.16
        : sin(ang * 15.0 + seed) * 0.15 + sin(ang * 25.0 - seed) * 0.07;
      float alpha = 1.0 - smoothstep(0.36 + br, 0.92 + br, rad + (nTex - 0.5) * 0.42);
      if (alpha < 0.34) discard;

      vec3 N = normalize(vNorm), L = normalize(uSunDir);
      // High-contrast wet-edge Chinese ink calligraphy pooling (dark ink rim, luminous mineral core!)
      float wetEdge = smoothstep(0.68, 0.34, alpha);
      float topLit = smoothstep(-0.75, 0.75, vUV.y);
      vec3 col = mix(vCol * (0.95 + 0.35 * topLit), vCol * 0.32 + vec3(0.02, 0.04, 0.06), wetEdge * 0.65);
      col *= (0.76 + 0.38 * nTex);
      // Subtle sunlit gold rim on pine/maple tips
      col += mix(vec3(0.32, 0.26, 0.10), vec3(0.42, 0.14, 0.08), step(1.5, bType)) * topLit * max(dot(N, L), 0.0) * (1.0 - uNight);

      if (uNight > 0.01) {
        vec3 ngtC = (bType > 1.5) ? vec3(0.55, 0.16, 0.18) : col * vec3(0.28, 0.42, 0.62);
        col = mix(col, ngtC, uNight);
      }
      if (uMono > 0.01) {
        vec3 inkF = (bType > 1.5)
          ? mix(vec3(0.52, 0.10, 0.10), vec3(0.88, 0.20, 0.15), topLit * 0.6 + nTex * 0.4) // Blazing Cinnabar Maple!
          : mix(vec3(0.06, 0.07, 0.09), vec3(0.26, 0.28, 0.30), topLit * 0.5 + nTex * 0.5); // Crisp Sumi Pine!
        col = mix(col, inkF, uMono);
      }
      col = applyInkMist(col, vWorldPos, uCamPos, L, uNight, uMono, 0.0);

      float contour = smoothstep(0.58, 0.34, alpha) * 0.88;
      oColor = vec4(col, 1.0);
      oData  = vec4(N.x * 0.5 + 0.5, N.z * 0.5 + 0.5, clamp(length(vWorldPos - uCamPos) / 165.0, 0.0, 1.0), 0.35);
      oWire  = vec4(0.32 + topLit * 0.25, contour, (bType > 1.5 ? 0.18 : 0.0), 0.0);
    }
  `;

  // --- Colossal Splash-Ink Celestial Kun (潑墨流金北冥巨鯤!) ---
  const VS_KUN = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aPos;
    layout(location=1) in vec3 aNorm;
    layout(location=2) in vec3 aCol;
    layout(location=3) in vec3 aBary;
    layout(location=4) in vec4 aExtra;
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
      float s = aExtra.y, wU = aExtra.z;
      float ph = uTime * 1.45 - s * 4.2;
      pos.y += sin(ph) * (0.30 + s * 1.25);
      pos.x += cos(ph * 0.72) * (0.14 + s * 0.70);
      if (wU > 0.04) {
        float w = max(0.0, wU - 0.06);
        pos.y += sin(uTime * 1.55 - w * 2.4 - aExtra.w * 1.2) * (w * w * 2.6);
      }
      vec4 wp = uModel * vec4(pos, 1.0);
      vWorldPos = wp.xyz;
      vNorm = normalize(mat3(uModel) * aNorm);
      vCol = aCol; vBary = aBary; vExtra = aExtra;
      gl_Position = uProj * uView * wp;
    }
  `;

  const FS_KUN = `#version 300 es
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
      vec3 N = normalize(vNorm);
      if (!gl_FrontFacing) N = -N;
      vec3 V = normalize(uCamPos - vWorldPos);
      vec3 L = normalize(uSunDir);
      float s = vExtra.y, wU = vExtra.z, cV = vExtra.w;

      // Calligraphic Sumi Splash-Ink + Flowing Liquid Gold-Leaf Filigree!
      float flow = fbm2(vec2(s * 6.5 - uTime * 0.28, wU * 4.2 + cV * 3.2));
      float filigree = pow(1.0 - abs(sin((s * 22.0 - uTime * 1.0) + flow * 5.0)), 11.0);
      float silkLines = pow(abs(sin(cV * 24.0 + flow * 3.0)), 12.0) * smoothstep(0.08, 0.45, wU);
      float veins = clamp(filigree * 1.1 + silkLines * 0.65, 0.0, 1.0);
      float fres = pow(1.0 - abs(dot(N, V)), 2.2);

      // Deep velvety ink-azurite body so it reads clearly against luminous Xuan paper sky!
      vec3 inkCore = mix(vec3(0.05, 0.13, 0.24), vec3(0.11, 0.46, 0.48), smoothstep(0.22, 0.82, flow));
      vec3 goldLeaf = vec3(0.96, 0.76, 0.36);
      vec3 col = inkCore * (0.72 + 0.42 * max(dot(N, L), 0.0));
      col += goldLeaf * veins * mix(0.75, 1.25, uNight);
      col += mix(vec3(0.24, 0.68, 0.72), vec3(0.48, 0.88, 1.0), uNight) * fres * mix(0.45, 0.95, uNight);

      float alpha = 0.92;
      if (wU > 0.04) {
        float rootF = smoothstep(0.04, 0.15, wU);
        float tipF = 1.0 - smoothstep(0.38, 0.96, wU);
        float leadF = smoothstep(0.0, 0.16, cV);
        float trailF = 1.0 - smoothstep(0.55, 0.96, cV);
        float tailEndFade = 1.0 - smoothstep(1.02, 1.56, s); // Smoothly dissolves phoenix silk tail tips into mist!
        alpha = clamp(rootF * tipF * leadF * trailF * tailEndFade * (0.48 + 0.52 * flow) * 0.88, 0.0, 0.88);
        if (alpha < 0.025) discard;
        col = mix(col, mix(vec3(0.12, 0.44, 0.48), goldLeaf, 0.38), wU * 0.55);
      }

      if (uMono > 0.01) {
        vec3 inkKun = mix(vec3(0.07, 0.08, 0.10), vec3(0.32, 0.34, 0.36), flow);
        // Cinnabar red spirit meridians in Black-Myth Sumi-e mode!
        inkKun += vec3(0.92, 0.20, 0.15) * veins * 0.95;
        col = mix(col, inkKun, uMono);
      }

      col = applyInkMist(col, vWorldPos, uCamPos, L, uNight, uMono, 0.0);
      float em = clamp((veins * 0.7 + fres * 0.4) * mix(0.45, 1.0, uNight), 0.0, 1.0);
      vec3 fw = fwidth(vBary);
      vec3 a3 = smoothstep(vec3(0.0), fw * 1.4, vBary);
      float wire = 1.0 - min(min(a3.x, a3.y), a3.z);

      oColor = vec4(col, alpha);
      oData  = vec4(N.x * 0.5 + 0.5, N.z * 0.5 + 0.5, clamp(length(vWorldPos - uCamPos) / 165.0, 0.0, 1.0), 0.12);
      oWire  = vec4(0.62, wire, em, alpha);
    }
  `;

  // --- Silky Cliff Waterfall & Luminous Valley Mist Clouds ---
  const VS_WATERFALL = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aPos;
    layout(location=4) in vec4 aExtra;
    uniform mat4 uView;
    uniform mat4 uProj;
    out vec3 vWorldPos;
    out vec2 vUV;
    void main() { vWorldPos = aPos; vUV = aExtra.yz; gl_Position = uProj * uView * vec4(aPos, 1.0); }
  `;
  const FS_WATERFALL = `#version 300 es
    precision highp float;
    in vec3 vWorldPos;
    in vec2 vUV;
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
      if (uClipY > 0.5 && vWorldPos.y < -0.1) discard;
      float ex = smoothstep(0.0, 0.25, vUV.x) * smoothstep(1.0, 0.75, vUV.x);
      float tf = smoothstep(0.0, 0.15, vUV.y) * smoothstep(1.0, 0.65, vUV.y);
      float st = smoothstep(0.26, 0.80, fbm2(vec2(vUV.x * 6.5, vUV.y * 4.0 - uTime * 1.4)));
      float alpha = ex * tf * (0.28 + 0.65 * st);
      if (alpha < 0.04) discard;
      vec3 col = mix(vec3(0.95, 0.93, 0.86), vec3(0.45, 0.64, 0.82), uNight);
      col = applyInkMist(col, vWorldPos, uCamPos, normalize(uSunDir), uNight, uMono, 0.0);
      oColor = vec4(col, alpha * 0.72);
      oData  = vec4(0.5, 0.5, clamp(length(vWorldPos - uCamPos) / 165.0, 0.0, 1.0), 0.0);
      oWire  = vec4(0.0, 0.0, 0.15, 0.0);
    }
  `;

  const VS_CLOUD = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aCenter;
    layout(location=1) in vec2 aOff;
    layout(location=2) in vec2 aSize;
    layout(location=3) in vec3 aMeta;
    uniform mat4 uView;
    uniform mat4 uProj;
    uniform float uTime;
    out vec2 vUV;
    out vec3 vWorldPos;
    out vec3 vMeta;
    void main() {
      vec3 r = vec3(uView[0][0], uView[1][0], uView[2][0]);
      vec3 u = vec3(uView[0][1], uView[1][1], uView[2][1]);
      vec3 c = aCenter + vec3(sin(uTime * 0.048 + aMeta.y) * 6.0, sin(uTime * 0.10 + aMeta.y) * 0.45, 0.0);
      vec3 wp = c + r * (aOff.x * aSize.x) + u * (aOff.y * aSize.y);
      vWorldPos = wp; vUV = aOff; vMeta = aMeta;
      gl_Position = uProj * uView * vec4(wp, 1.0);
    }
  `;
  const FS_CLOUD = `#version 300 es
    precision highp float;
    in vec2 vUV;
    in vec3 vWorldPos;
    in vec3 vMeta;
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
      if (uClipY > 0.5 && vWorldPos.y < 0.2) discard;
      float dist = length(vWorldPos - uCamPos);
      float nearF = smoothstep(6.0, 18.0, dist);
      float r2 = dot(vUV, vUV);
      if (r2 > 1.0) discard;
      float rad = pow(1.0 - r2, 1.7);
      vec2 nuv = vUV * vec2(1.3, 2.2) + vec2(vMeta.y + uTime * 0.022, vMeta.y * 0.37);
      float n1 = fbm2(nuv);
      float wisp = smoothstep(0.28, 0.78, fbm2(nuv * 2.0 + vec2(n1 * 1.2, -n1 * 0.6))) * rad;
      float alpha = wisp * vMeta.x * nearF;
      if (alpha < 0.015) discard;
      vec3 paper = getPaperColor(uNight, uMono);
      vec3 col = mix(paper * mix(0.95, 1.25, uNight), mix(vec3(0.99, 0.94, 0.84), vec3(0.24, 0.36, 0.52), uNight), smoothstep(-0.5, 0.7, vUV.y) * 0.65);
      oColor = vec4(col, alpha);
      oData  = vec4(0.5, 0.5, clamp(dist / 165.0, 0.0, 1.0), 0.0);
      oWire  = vec4(0.0, 0.0, 0.0, 0.0);
    }
  `;

  // --- Swirling 3D Cinnabar Maple Petals (落紅如雨), Gold-Leaf Dust & Sumi Ink Smoke! ---
  const VS_PARTICLES = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aSeed;
    layout(location=1) in vec3 aMeta;
    uniform mat4 uView;
    uniform mat4 uProj;
    uniform vec3 uKunPos;
    uniform vec3 uKunFwd;
    uniform float uTime;
    uniform float uDPR;
    out float vKind;
    out float vGlow;
    out float vSpin;
    void main() {
      float kind = aMeta.z;
      vec3 wp;
      if (kind < 1.5) {
        float tr = fract(aSeed.x + uTime * (kind < 0.5 ? 0.10 : 0.075));
        float sp = tr * 10.5 + aMeta.x;
        float rad = 1.6 + tr * (kind < 0.5 ? 7.0 : 10.0) * (0.4 + 0.6 * aSeed.y);
        vec3 side = normalize(cross(uKunFwd, vec3(0.0, 1.0, 0.0)) + vec3(0.001));
        wp = uKunPos - uKunFwd * (tr * 38.0 - 4.0) + side * (cos(sp) * rad) + vec3(0.0, sin(sp) * rad * 0.55 + (aSeed.z - 0.5) * 3.5, 0.0);
        vGlow = (1.0 - tr) * smoothstep(0.0, 0.12, tr);
      } else {
        // Swirling 3D Cinnabar Maple Petals drifting gracefully across the bridge & past the viewer!
        float fall = fract(aSeed.y - uTime * 0.035);
        float x = (aSeed.x * 2.0 - 1.0) * 36.0 + sin(uTime * 0.55 + aMeta.x) * 3.8 + uTime * 0.65;
        x = mod(x + 36.0, 72.0) - 36.0;
        float y = 0.8 + fall * 16.5 + sin(uTime * 1.1 + aMeta.x * 2.0) * 0.6;
        float z = -34.0 + aSeed.z * 66.0 + cos(uTime * 0.42 + aMeta.x) * 2.6;
        wp = vec3(x, y, z);
        vGlow = smoothstep(0.0, 0.15, fall) * smoothstep(1.0, 0.85, fall);
      }
      vec4 vp = uView * vec4(wp, 1.0);
      gl_Position = uProj * vp;
      float dist = max(-vp.z, 2.0);
      gl_PointSize = clamp((aMeta.y * 28.0 / dist) * uDPR, 2.0, 22.0);
      vKind = kind;
      vSpin = uTime * 1.8 + aMeta.x * 3.0;
    }
  `;

  const FS_PARTICLES = `#version 300 es
    precision highp float;
    in float vKind;
    in float vGlow;
    in float vSpin;
    uniform float uNight;
    uniform float uMono;
    layout(location=0) out vec4 oColor;
    layout(location=1) out vec4 oData;
    layout(location=2) out vec4 oWire;
    void main() {
      vec2 c = gl_PointCoord - 0.5;
      vec3 col; float alpha; float em = 0.0;
      if (vKind < 0.5) {
        float r2 = dot(c, c) * 4.0; if (r2 > 1.0) discard;
        float soft = pow(1.0 - r2, 2.0);
        col = mix(vec3(0.98, 0.78, 0.36), vec3(0.90, 0.24, 0.18), uMono * 0.85);
        alpha = soft * vGlow * mix(0.70, 0.96, uNight);
        em = alpha * 0.92;
      } else if (vKind < 1.5) {
        float r2 = dot(c, c) * 4.0; if (r2 > 1.0) discard;
        col = mix(vec3(0.08, 0.16, 0.24), vec3(0.10, 0.11, 0.13), uMono);
        alpha = pow(1.0 - r2, 1.8) * vGlow * 0.30;
      } else {
        // Rotating organic tapered Cinnabar Maple Petal (落紅花瓣!) / Golden Fireflies at Night!
        float cs = cos(vSpin), sn = sin(vSpin);
        vec2 rc = vec2(c.x * cs - c.y * sn, c.x * sn + c.y * cs);
        float d = length(vec2(rc.x * 2.2, rc.y * 4.2));
        if (d > 1.0) discard;
        float petal = smoothstep(1.0, 0.35, d);
        col = mix(vec3(0.86, 0.20, 0.15), vec3(1.0, 0.74, 0.32), uNight * 0.85);
        alpha = petal * vGlow * mix(0.82, 0.92, uNight);
        em = alpha * mix(0.12, 0.95, uNight);
      }
      oColor = vec4(col, alpha);
      oData  = vec4(0.5, 0.5, 0.5, 0.0);
      oWire  = vec4(0.0, 0.0, em, alpha);
    }
  `;

  // --- Pass 4: Volumetric Sun God-Rays + Separable Bloom ---
  const VS_QUAD = `#version 300 es
    precision highp float;
    out vec2 vUV;
    void main() {
      vec2 p = vec2((gl_VertexID == 1) ? 3.0 : -1.0, (gl_VertexID == 2) ? 3.0 : -1.0);
      vUV = p * 0.5 + 0.5;
      gl_Position = vec4(p, 0.0, 1.0);
    }
  `;

  const FS_BLOOM_RAYS = `#version 300 es
    precision highp float;
    in vec2 vUV;
    uniform sampler2D uColorTex;
    uniform sampler2D uWireTex;
    uniform vec2 uSunUV;
    uniform float uSunVis;
    uniform float uNight;
    uniform float uMono;
    out vec4 oOut;
    void main() {
      vec3 c = texture(uColorTex, vUV).rgb;
      float em = texture(uWireTex, vUV).b;
      vec3 bloom = c * pow(em, 1.15) * mix(0.72, 1.45, uNight);

      vec3 rays = vec3(0.0);
      if (uSunVis > 0.01) {
        vec2 delta = (vUV - uSunUV) * (0.84 / 16.0);
        vec2 uv = vUV;
        float decay = 1.0, acc = 0.0;
        for (int i = 0; i < 16; i++) {
          uv -= delta;
          if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) break;
          float skyOpen = 1.0 - smoothstep(0.15, 0.75, texture(uColorTex, uv).a);
          float sunProx = exp(-length((uv - uSunUV) * vec2(1.6, 1.0)) * 5.0);
          acc += skyOpen * sunProx * decay;
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
    precision highp float;
    in vec2 vUV;
    uniform sampler2D uTex;
    uniform vec2 uStep;
    out vec4 oOut;
    void main() {
      vec3 acc = texture(uTex, vUV).rgb * 0.227027;
      acc += (texture(uTex, vUV + uStep * 1.3846).rgb + texture(uTex, vUV - uStep * 1.3846).rgb) * 0.316216;
      acc += (texture(uTex, vUV + uStep * 3.2307).rgb + texture(uTex, vUV - uStep * 3.2307).rgb) * 0.070270;
      oOut = vec4(acc, 1.0);
    }
  `;

  // ==========================================================================
  // PASS 5: FINE-ART XUAN-PAPER CAPILLARY INK-BLEED + WATERCOLOR WET-EDGE +
  //         ADAPTIVE KUWAHARA BRUSHWORK + GOLD-FLECKED PAPER (灑金宣紙)
  // ==========================================================================
  const FS_FINAL = `#version 300 es
    precision highp float;
    in vec2 vUV;
    uniform sampler2D uColorTex;
    uniform sampler2D uDataTex;
    uniform sampler2D uWireTex;
    uniform sampler2D uBloomTex;
    uniform vec2 uRes;
    uniform float uTime;
    uniform float uNight;
    uniform float uMono;
    uniform float uCurtain;
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
        vec3 mean = m[k] / 9.0;
        vec3 v3 = abs(s[k] / 9.0 - mean * mean);
        float v = v3.r + v3.g + v3.b;
        if (v < minV) { minV = v; best = mean; }
      }
      return best;
    }

    vec3 acesFilm(vec3 x) {
      return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
    }

    void main() {
      vec2 px = 1.0 / uRes;
      vec4 wireD = texture(uWireTex, vUV);
      vec4 rawData = texture(uDataTex, vUV);

      // 1. SECRET WEAPON #1: Capillary Xuan-Paper Ink-Bleed UV Displacement!
      //    Softly trembles razor-straight CG edges along organic handmade paper fibers!
      vec2 pCoord = gl_FragCoord.xy;
      vec2 paperGrad = vec2(
        fbm2(pCoord * 0.042 + vec2(3.1, 1.7)) - 0.5,
        fbm2(pCoord * 0.042 + vec2(17.9, 8.4)) - 0.5
      );
      vec2 bleedUV = clamp(vUV + paperGrad * px * mix(2.2, 0.8, uNight), vec2(0.001), vec2(0.999));

      vec4 rawC = texture(uColorTex, bleedUV);
      vec4 data = texture(uDataTex, bleedUV);
      vec3 bloom = texture(uBloomTex, vUV).rgb;
      float linDepth = data.b;
      float edgeCtrl = data.a;

      // 2. Adaptive Painterly Kuwahara Brushwork (NEVER smears glowing fireflies/lanterns into squares!)
      float paintW = (rawC.a > 0.5)
        ? mix(0.20, 0.64, smoothstep(0.90, 0.30, edgeCtrl)) * smoothstep(0.05, 0.25, edgeCtrl)
        : 0.0;
      paintW *= (1.0 - smoothstep(0.08, 0.36, wireD.b)); // Protects glowing fireflies, lanterns & Kun runes!
      vec3 paintCol = (paintW > 0.01) ? mix(rawC.rgb, kuwahara(bleedUV, px * 1.20), paintW) : rawC.rgb;

      // 3. SECRET WEAPON #2: True Watercolor Wet-Edge Pigment Pooling (水痕邊 — NEVER cheap black cartoon outlines!)
      if (rawC.a > 0.5 && edgeCtrl > 0.25 && linDepth < 0.62) {
        vec4 dL = texture(uDataTex, bleedUV - vec2(px.x * 1.4, 0.0));
        vec4 dR = texture(uDataTex, bleedUV + vec2(px.x * 1.4, 0.0));
        vec4 dD = texture(uDataTex, bleedUV - vec2(0.0, px.y * 1.4));
        vec4 dU = texture(uDataTex, bleedUV + vec2(0.0, px.y * 1.4));
        float zJump = (abs(dR.b - dL.b) + abs(dU.b - dD.b)) * 18.0;
        float nJump = length(dR.rg - dL.rg) + length(dU.rg - dD.rg);
        float wetEdge = smoothstep(0.32, 0.92, zJump + nJump * 0.65) * smoothstep(0.62, 0.14, linDepth);
        float fiberBreak = 0.50 + 0.50 * vnoise(pCoord * 0.22);
        // Darken & deepen the EXISTING pigment organically like wet ink pooling at stroke boundary!
        paintCol *= mix(vec3(1.0), vec3(0.58, 0.62, 0.66), wetEdge * fiberBreak * 0.58);
      }

      // 4. Add Volumetric Sun/Moon Rays & Warm Lantern Bloom
      paintCol += bloom * mix(0.72, 1.12, uNight);

      // 5. SECRET WEAPON #3: Organic Gold-Flecked Antique Xuan Paper (灑金宣紙 — turns negative space into fine art!)
      float pulp = fbm2(pCoord * 0.022);
      float fiber = fbm2(vec2(pCoord.x * 0.18 + pulp * 2.0, pCoord.y * 0.045));
      float paperTex = (pulp - 0.5) * 0.048 + (fiber - 0.5) * 0.032;
      paintCol *= (1.0 + paperTex * mix(1.0, 0.35, uNight));

      // Delicate Museum Gold-Leaf Flecks (灑金點點) glinting gently in the paper sky & mist!
      vec2 goldCell = floor(pCoord * 0.085);
      float gRnd = hash12(goldCell);
      if (gRnd > 0.992) {
        vec2 gFrac = fract(pCoord * 0.085) - 0.5;
        float gDot = smoothstep(0.32, 0.05, length(gFrac * vec2(1.0, 1.6)));
        float paperArea = smoothstep(0.42, 0.85, dot(paintCol, vec3(0.33)));
        paintCol = mix(paintCol, vec3(0.86, 0.68, 0.34), gDot * paperArea * mix(0.45, 0.25, uNight));
      }

      // Gentle museum scroll-edge warm burnish vignette
      vec2 vc = vUV * 2.0 - 1.0;
      float vig = 1.0 - dot(vc * vec2(0.70, 0.84), vc * vec2(0.70, 0.84)) * 0.24;
      paintCol *= (0.36 + 0.64 * clamp(vig, 0.0, 1.0));

      // ACES Filmic Polish with crisp fine-art tonal range
      paintCol = acesFilm(paintCol * mix(1.10, 1.18, uNight));
      float luma = dot(paintCol, vec3(0.299, 0.587, 0.114));
      float sat = mix(1.16, 1.08, uNight) * (1.0 - uMono * 0.05);
      paintCol = clamp(mix(vec3(luma), paintCol, sat), 0.0, 1.0);

      // 6. Right-Side 3D Technical X-Ray Inspector (Clay + Luminous Jade-Gold Wireframe)
      vec3 clayBg = (texture(uColorTex, vUV).a > 0.5)
        ? mix(vec3(0.05, 0.09, 0.13), vec3(0.20, 0.30, 0.36), wireD.r) * (1.0 - rawData.b * 0.55)
        : mix(vec3(0.03, 0.06, 0.10), vec3(0.07, 0.12, 0.18), vUV.y);
      vec3 wireCol = mix(vec3(0.22, 0.88, 0.82), vec3(1.0, 0.72, 0.32), wireD.b);
      vec3 techView = clayBg + wireCol * wireD.g * 0.88 + vec3(1.0, 0.62, 0.26) * wireD.b * 0.55;

      float side = smoothstep(uCurtain - 0.0025, uCurtain + 0.0025, vUV.x);
      vec3 outCol = mix(paintCol, techView, side);
      if (uCurtain > 0.005 && uCurtain < 0.995) {
        float seam = exp(-abs(vUV.x - uCurtain) * uRes.x * 0.45);
        outCol += vec3(0.92, 0.28, 0.18) * seam * 1.15;
      }

      fragColor = vec4(outCol, 1.0);
    }
  `;

  /* ==========================================================================
     4. WebGL2 Helpers
     ========================================================================== */
  function compileShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
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
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, iFmt, w, h, 0, fmt, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function buildVAO(gl, floatData, layout) {
    const vao = gl.createVertexArray(), vbo = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, floatData, gl.STATIC_DRAW);
    const stride = layout.reduce((a, b) => a + b.size, 0) * 4;
    let off = 0;
    layout.forEach((a) => {
      gl.enableVertexAttribArray(a.loc);
      gl.vertexAttribPointer(a.loc, a.size, gl.FLOAT, false, stride, off);
      off += a.size * 4;
    });
    gl.bindVertexArray(null);
    return vao;
  }

  /* ==========================================================================
     5. Engine Initialization & First-Person 360° Render Loop
     ========================================================================== */
  function create(canvas, callbacks = {}) {
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL2 required.");

    const world = ShanHaiGeometry.buildWorld();

    const progShadow    = createProgram(gl, VS_SHADOW, FS_SHADOW);
    const progSky       = createProgram(gl, VS_SKY, FS_SKY);
    const progSolid     = createProgram(gl, VS_SOLID, FS_SOLID);
    const progWater     = createProgram(gl, VS_WATER, FS_WATER);
    const progFoliage   = createProgram(gl, VS_FOLIAGE, FS_FOLIAGE);
    const progKun       = createProgram(gl, VS_KUN, FS_KUN);
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
    const uKun = getU(progKun, ["uModel", "uView", "uProj", "uCamPos", "uSunDir", "uTime", "uNight", "uMono", "uClipY"]);
    const uWf  = getU(progWaterfall, ["uView", "uProj", "uCamPos", "uSunDir", "uTime", "uNight", "uMono", "uClipY"]);
    const uCld = getU(progCloud, ["uView", "uProj", "uCamPos", "uSunDir", "uTime", "uNight", "uMono", "uClipY"]);
    const uPrt = getU(progParticles, ["uView", "uProj", "uKunPos", "uKunFwd", "uTime", "uDPR", "uNight", "uMono"]);
    const uRay = getU(progBloomRays, ["uColorTex", "uWireTex", "uSunUV", "uSunVis", "uNight", "uMono"]);
    const uBlr = getU(progBlur, ["uTex", "uStep"]);
    const uFin = getU(progFinal, ["uColorTex", "uDataTex", "uWireTex", "uBloomTex", "uRes", "uTime", "uNight", "uMono", "uCurtain"]);

    const solidLayout = [{ loc: 0, size: 3 }, { loc: 1, size: 3 }, { loc: 2, size: 3 }, { loc: 3, size: 3 }, { loc: 4, size: 4 }];
    const vaoSolid     = buildVAO(gl, world.solid.data, solidLayout);
    const vaoKun       = buildVAO(gl, world.kun.data, solidLayout);
    const vaoBoatman   = buildVAO(gl, world.boatman.data, solidLayout);
    const vaoCrane     = buildVAO(gl, world.crane.data, solidLayout);
    const vaoWaterfall = buildVAO(gl, world.waterfall.data, solidLayout);
    const vaoWater     = buildVAO(gl, world.water.data, [{ loc: 0, size: 3 }, { loc: 1, size: 3 }]);
    const vaoFoliage   = buildVAO(gl, world.foliage.data, [{ loc: 0, size: 3 }, { loc: 1, size: 2 }, { loc: 2, size: 3 }, { loc: 3, size: 3 }, { loc: 4, size: 4 }]);
    const vaoClouds    = buildVAO(gl, world.clouds.data, [{ loc: 0, size: 3 }, { loc: 1, size: 2 }, { loc: 2, size: 2 }, { loc: 3, size: 3 }]);
    const vaoParticles = buildVAO(gl, world.particles.data, [{ loc: 0, size: 3 }, { loc: 1, size: 3 }]);
    const vaoEmpty     = gl.createVertexArray();

    // Shadow FBO
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
      fboRef = gl.createFramebuffer();
      texRef = createTex2D(gl, refW, refH, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
      rbRefDepth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, rbRefDepth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, refW, refH);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboRef);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texRef, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rbRefDepth);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

      fboMain = gl.createFramebuffer();
      texColor = createTex2D(gl, w, h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
      texData  = createTex2D(gl, w, h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.NEAREST);
      texWire  = createTex2D(gl, w, h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
      rbMainDepth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, rbMainDepth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
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

    // ---- Unobstructed First-Person Camera (Wide Open Infinite Mirror Sea!) ----
    const SPAWN_POS = [0.0, 4.6, 22.0];
    const SPAWN_YAW = 0.0;
    const SPAWN_PITCH = 0.095;

    const state = {
      entered: false,
      mode: "free",
      style: "bluegreen", // "bluegreen" (潑彩青綠) | "mono" (墨韻丹砂) | "night" (幽冥青燈)
      nightVal: 0.0,
      monoVal: 0.0,
      curtain: 1.0,
      targetCurtain: 1.0,
      pos: SPAWN_POS.slice(),
      vel: [0, 0, 0],
      yaw: SPAWN_YAW,
      pitch: SPAWN_PITCH,
      targetYaw: SPAWN_YAW,
      targetPitch: SPAWN_PITCH,
      lookOffsetYaw: 0.0,
      lookOffsetPitch: 0.0,
      cruiseT: 0.0,
      keys: {}
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

    function notifyEnter() {
      if (!state.entered) { state.entered = true; if (callbacks.onEnter) callbacks.onEnter(); }
    }

    let dragging = false, lastX = 0, lastY = 0;
    canvas.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      if (Math.hypot(dx, dy) > 1.5) notifyEnter();
      const s = 0.0042;
      if (state.mode === "free") {
        state.targetYaw -= dx * s;
        state.targetPitch = Math.max(-0.72, Math.min(1.05, state.targetPitch + dy * s));
      } else {
        state.lookOffsetYaw -= dx * s;
        state.lookOffsetPitch = Math.max(-0.62, Math.min(0.85, state.lookOffsetPitch + dy * s));
      }
    });
    canvas.addEventListener("pointerup", () => { dragging = false; });
    canvas.addEventListener("pointercancel", () => { dragging = false; });

    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      notifyEnter();
      if (state.mode !== "free") {
        state.mode = "free"; state.targetYaw = state.yaw; state.targetPitch = state.pitch;
        state.lookOffsetYaw = 0; state.lookOffsetPitch = 0;
        if (callbacks.onModeChange) callbacks.onModeChange("free");
      }
      const step = -Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY) * 0.045, 4.5);
      const fwd = [-Math.sin(state.yaw) * Math.cos(state.pitch), Math.sin(state.pitch), -Math.cos(state.yaw) * Math.cos(state.pitch)];
      state.vel[0] += fwd[0] * step * 2.6; state.vel[1] += fwd[1] * step * 2.2; state.vel[2] += fwd[2] * step * 2.6;
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
      p[0] = Math.max(-72, Math.min(72, p[0]));
      p[2] = Math.max(-96, Math.min(58, p[2]));
      const terr = ShanHaiGeometry.terrainHeight(p[0], p[2]);
      let minY = Math.max(1.75, terr + 2.4);
      if (Math.abs(p[2] - ShanHaiGeometry.BRIDGE_Z) < 3.4) {
        const deckY = ShanHaiGeometry.bridgeArchY(p[0]);
        if (deckY > 0.0 && p[1] > deckY - 1.5 && p[1] < deckY + 2.0) {
          p[1] = (p[1] < deckY - 0.1 && deckY > 4.5) ? deckY - 1.5 : deckY + 2.0;
        }
      }
      p[1] = Math.max(minY, Math.min(48.0, p[1]));
    }

    let elapsed = qp.get("t") !== null ? Number(qp.get("t")) : 3.2;
    let prevTs = performance.now(), frameCount = 0, fpsTs = prevTs;
    const identity = mat4Identity();

    const SUN_DIR = (() => {
      // Positioned cleanly in the luminous valley gap right above the Rainbow Bridge & between the twin spires!
      const v = [0.065, 0.305, -0.950], l = Math.hypot(v[0], v[1], v[2]);
      return [v[0] / l, v[1] / l, v[2] / l];
    })();

    const lightView = mat4LookAt([SUN_DIR[0] * 75, SUN_DIR[1] * 75, -24 + SUN_DIR[2] * 75], [0, 4, -24], [0, 1, 0]);
    const lightProj = mat4Ortho(-56, 56, -42, 46, 8, 165);
    const lightVP = mat4Mul(lightProj, lightView);

    const cranes = Array.from({ length: 7 }, (_, i) => ({
      r: 16 + (i % 3) * 8.5, h: 15.0 + (i % 4) * 3.8, sp: 0.20 + (i % 3) * 0.04, ph: i * 0.92, cz: -24 - (i % 3) * 16
    }));

    function computeKunState(t) {
      const ang = t * 0.085 + 0.48;
      const x = Math.sin(ang) * 35.0, z = -54.0 + Math.cos(ang) * 18.0, y = 25.0 + Math.sin(ang * 2.0) * 3.2;
      const na = ang + 0.03;
      const nx = Math.sin(na) * 35.0, nz = -54.0 + Math.cos(na) * 18.0, ny = 25.0 + Math.sin(na * 2.0) * 3.2;
      const dx = nx - x, dy = ny - y, dz = nz - z, dl = Math.hypot(dx, dy, dz) || 1;
      return {
        pos: [x, y, z],
        fwd: [dx / dl, dy / dl, dz / dl],
        mat: mat4ModelTRS(x, y, z, -Math.atan2(dy, Math.hypot(dx, dz)), Math.atan2(dx, dz), -Math.cos(ang) * 0.22, 0.78, 0.78, 0.78)
      };
    }

    function computeBoatmanState(t) {
      // Glides peacefully in poetic slow motion toward the Rainbow Bridge arch!
      const bz = -3.0 - ((t * 0.65) % 42.0);
      const bx = ShanHaiGeometry.riverCenterX(bz) - 1.6;
      const nz = bz - 2.0, nx = ShanHaiGeometry.riverCenterX(nz) - 1.6;
      const yaw = Math.atan2(nx - bx, nz - bz);
      const bob = Math.sin(t * 1.8) * 0.028;
      return {
        pos: [bx, 0.02 + bob, bz],
        mat: mat4ModelTRS(bx, 0.02 + bob, bz, bob, yaw, bob * 0.6, 1.0, 1.0, 1.0)
      };
    }

    let refVPGlobal = identity, shadowBaked = false;

    function drawSceneContent(view, proj, camPos, kun, boatman, clipY, isRefPass) {
      const invVP = invertMat4(mat4Mul(proj, view));

      // 1. Sky
      gl.depthMask(false); gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
      gl.useProgram(progSky);
      gl.uniformMatrix4fv(uSky.uInvVP, false, invVP);
      gl.uniform3fv(uSky.uCamPos, camPos); gl.uniform3fv(uSky.uSunDir, SUN_DIR);
      gl.uniform1f(uSky.uTime, elapsed); gl.uniform1f(uSky.uNight, state.nightVal); gl.uniform1f(uSky.uMono, state.monoVal);
      gl.bindVertexArray(vaoEmpty); gl.drawArrays(gl.TRIANGLES, 0, 3);

      // 2. Karst Peaks + Moon Bridge + Cliff Pavilion + Pagoda + Lone Boatman + Cranes
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

      gl.uniformMatrix4fv(uSol.uModel, false, boatman.mat);
      gl.bindVertexArray(vaoBoatman); gl.drawArrays(gl.TRIANGLES, 0, world.boatman.count);

      cranes.forEach((cr) => {
        const a = elapsed * cr.sp + cr.ph;
        const cx = Math.sin(a) * cr.r, cz = cr.cz + Math.cos(a) * cr.r * 0.72, cy = cr.h + Math.sin(a * 2.0) * 1.4;
        const cyaw = Math.atan2(Math.cos(a) * cr.r, -Math.sin(a) * cr.r * 0.72);
        gl.uniformMatrix4fv(uSol.uModel, false, mat4ModelTRS(cx, cy, cz, 0, cyaw, -0.15, 0.78, 0.78, 0.78));
        gl.bindVertexArray(vaoCrane); gl.drawArrays(gl.TRIANGLES, 0, world.crane.count);
      });

      // 3. Calligraphic Silhouette Pines & Cinnabar Maples
      gl.useProgram(progFoliage);
      gl.uniformMatrix4fv(uFol.uView, false, view); gl.uniformMatrix4fv(uFol.uProj, false, proj);
      gl.uniform3fv(uFol.uCamPos, camPos); gl.uniform3fv(uFol.uSunDir, SUN_DIR);
      gl.uniform1f(uFol.uTime, elapsed); gl.uniform1f(uFol.uNight, state.nightVal); gl.uniform1f(uFol.uMono, state.monoVal);
      gl.uniform1f(uFol.uClipY, clipY);
      gl.bindVertexArray(vaoFoliage); gl.drawArrays(gl.TRIANGLES, 0, world.foliage.count);

      // 4. Infinite Mirror Xuan-Paper Ink Sea
      if (!isRefPass) {
        gl.useProgram(progWater);
        gl.uniformMatrix4fv(uWat.uView, false, view); gl.uniformMatrix4fv(uWat.uProj, false, proj);
        gl.uniformMatrix4fv(uWat.uRefVP, false, refVPGlobal);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texRef); gl.uniform1i(uWat.uReflectTex, 0);
        gl.uniform3fv(uWat.uCamPos, camPos); gl.uniform3fv(uWat.uSunDir, SUN_DIR);
        gl.uniform3fv(uWat.uBoatPos, boatman.pos);
        gl.uniform1f(uWat.uTime, elapsed); gl.uniform1f(uWat.uNight, state.nightVal); gl.uniform1f(uWat.uMono, state.monoVal);
        gl.bindVertexArray(vaoWater); gl.drawArrays(gl.TRIANGLES, 0, world.water.count);
      }

      // 5. Translucent Ethereal Layer: Waterfalls + Mist Sea + Splash-Ink Kun + 3D Crimson Petals
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

      gl.useProgram(progKun);
      gl.uniformMatrix4fv(uKun.uModel, false, kun.mat);
      gl.uniformMatrix4fv(uKun.uView, false, view); gl.uniformMatrix4fv(uKun.uProj, false, proj);
      gl.uniform3fv(uKun.uCamPos, camPos); gl.uniform3fv(uKun.uSunDir, SUN_DIR);
      gl.uniform1f(uKun.uTime, elapsed); gl.uniform1f(uKun.uNight, state.nightVal); gl.uniform1f(uKun.uMono, state.monoVal);
      gl.uniform1f(uKun.uClipY, clipY);
      gl.bindVertexArray(vaoKun); gl.drawArrays(gl.TRIANGLES, 0, world.kun.count);

      if (!isRefPass) {
        gl.useProgram(progParticles);
        gl.uniformMatrix4fv(uPrt.uView, false, view); gl.uniformMatrix4fv(uPrt.uProj, false, proj);
        gl.uniform3fv(uPrt.uKunPos, kun.pos); gl.uniform3fv(uPrt.uKunFwd, kun.fwd);
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
      prevTs = now;
      elapsed += dt;

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

      const kun = computeKunState(elapsed);
      const boatman = computeBoatmanState(elapsed);

      // Update First-Person Camera
      let camPos, camYaw, camPitch, fovy = 48 * Math.PI / 180;
      if (state.mode === "cruise") {
        state.cruiseT += dt;
        const loopZ = 18.0 - ((state.cruiseT * 3.2 + (qp.get("t") ? Number(qp.get("t")) * 2.5 : 8.5)) % 78.0);
        const cx = ShanHaiGeometry.riverCenterX(loopZ) + 0.4;
        const aheadX = ShanHaiGeometry.riverCenterX(loopZ - 14.0);
        camPos = [cx, 2.55 + Math.sin(elapsed * 1.8) * 0.08, loopZ];
        camYaw = Math.atan2(-(aheadX - cx), 14.0) + state.lookOffsetYaw;
        camPitch = Math.max(-0.55, Math.min(0.95, 0.09 + Math.sin(elapsed * 0.4) * 0.03 + state.lookOffsetPitch));
        state.pos = camPos.slice(); state.yaw = camYaw; state.pitch = camPitch;
        fovy = 52 * Math.PI / 180;
      } else if (state.mode === "soar") {
        const backX = -kun.fwd[0] * 28.0 - kun.fwd[2] * 13.0;
        const backZ = -kun.fwd[2] * 28.0 + kun.fwd[0] * 13.0;
        camPos = [kun.pos[0] + backX, Math.max(13.5, kun.pos[1] + 2.8), kun.pos[2] + backZ];
        const dx = kun.pos[0] - camPos[0], dy = kun.pos[1] - 1.2 - camPos[1], dz = kun.pos[2] - camPos[2];
        camYaw = Math.atan2(-dx, -dz) + state.lookOffsetYaw;
        camPitch = Math.max(-0.62, Math.min(0.92, Math.atan2(dy, Math.hypot(dx, dz)) + state.lookOffsetPitch));
        state.pos = camPos.slice(); state.yaw = camYaw; state.pitch = camPitch;
        fovy = 50 * Math.PI / 180;
      } else {
        const sm = Math.min(1, dt * 10.0);
        state.yaw += (state.targetYaw - state.yaw) * sm;
        state.pitch += (state.targetPitch - state.pitch) * sm;
        const fwd = [-Math.sin(state.yaw) * Math.cos(state.pitch), Math.sin(state.pitch), -Math.cos(state.yaw) * Math.cos(state.pitch)];
        const right = [Math.cos(state.yaw), 0, -Math.sin(state.yaw)];
        const acc = 42.0 * dt;
        if (state.keys["w"] || state.keys["arrowup"])    { state.vel[0] += fwd[0]*acc; state.vel[1] += fwd[1]*acc; state.vel[2] += fwd[2]*acc; }
        if (state.keys["s"] || state.keys["arrowdown"])  { state.vel[0] -= fwd[0]*acc; state.vel[1] -= fwd[1]*acc; state.vel[2] -= fwd[2]*acc; }
        if (state.keys["d"] || state.keys["arrowright"]) { state.vel[0] += right[0]*acc; state.vel[2] += right[2]*acc; }
        if (state.keys["a"] || state.keys["arrowleft"])  { state.vel[0] -= right[0]*acc; state.vel[2] -= right[2]*acc; }
        if (state.keys[" "] || state.keys["e"])          { state.vel[1] += acc * 0.75; }
        if (state.keys["shift"] || state.keys["q"])      { state.vel[1] -= acc * 0.75; }
        const damp = Math.exp(-4.6 * dt);
        for (let i = 0; i < 3; i++) { state.pos[i] += state.vel[i] * dt; state.vel[i] *= damp; }
        clampSafeFPSPos(state.pos);
        const brY = state.entered ? 0 : Math.sin(elapsed * 0.42) * 0.14;
        const brW = state.entered ? 0 : Math.sin(elapsed * 0.20) * 0.022;
        camPos = [state.pos[0], state.pos[1] + brY, state.pos[2]];
        camYaw = state.yaw + brW; camPitch = state.pitch;
        fovy = (state.entered ? 50 : 45) * Math.PI / 180;
      }

      const lookDir = [-Math.sin(camYaw) * Math.cos(camPitch), Math.sin(camPitch), -Math.cos(camYaw) * Math.cos(camPitch)];
      const target = [camPos[0] + lookDir[0] * 18, camPos[1] + lookDir[1] * 18, camPos[2] + lookDir[2] * 18];
      const proj = mat4Perspective(fovy, curW / curH, 0.45, 250.0);
      const view = mat4LookAt(camPos, target, [0, 1, 0]);

      // Pass 1: Bake Static Shadow Map
      if (!shadowBaked) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fboShadow);
        gl.viewport(0, 0, SHADOW_RES, SHADOW_RES);
        gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.useProgram(progShadow);
        gl.uniformMatrix4fv(uSh.uLightVP, false, lightVP);
        gl.uniformMatrix4fv(uSh.uModel, false, identity);
        gl.uniform1f(uSh.uTime, elapsed);
        gl.bindVertexArray(vaoSolid); gl.drawArrays(gl.TRIANGLES, 0, world.solid.count);
        shadowBaked = true;
      }

      // Pass 2: True Planar Mirror Reflection
      const refEye = [camPos[0], -camPos[1], camPos[2]], refTgt = [target[0], -target[1], target[2]];
      const refView = mat4LookAt(refEye, refTgt, [0, 1, 0]);
      refVPGlobal = mat4Mul(proj, refView);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboRef);
      gl.viewport(0, 0, refW, refH);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      drawSceneContent(refView, proj, refEye, kun, boatman, 1.0, true);

      // Pass 3: Full-Res MRT Scene
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboMain);
      gl.viewport(0, 0, curW, curH);
      gl.clearBufferfv(gl.COLOR, 0, new Float32Array([0, 0, 0, 0]));
      gl.clearBufferfv(gl.COLOR, 1, new Float32Array([0.5, 0.5, 1.0, 0.0]));
      gl.clearBufferfv(gl.COLOR, 2, new Float32Array([0, 0, 0, 0]));
      gl.clearBufferfi(gl.DEPTH_STENCIL, 0, 1.0, 0);
      drawSceneContent(view, proj, camPos, kun, boatman, 0.0, false);

      // Pass 4: Volumetric God-Rays & Bloom Blur
      const mainVP = mat4Mul(proj, view);
      const sunProj = projectPoint(mainVP, camPos[0] + SUN_DIR[0] * 180, camPos[1] + SUN_DIR[1] * 180, camPos[2] + SUN_DIR[2] * 180);
      const sunDot = Math.max(0, lookDir[0] * SUN_DIR[0] + lookDir[1] * SUN_DIR[1] + lookDir[2] * SUN_DIR[2]);
      const sunVis = sunProj.inFront ? Math.pow(sunDot, 2.2) : 0.0;

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

      // Pass 5: Fine-Art Xuan-Paper Composite & 3D Split Curtain
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
      enterScroll() { notifyEnter(); state.vel[2] -= 10.5; },
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
