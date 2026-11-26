/**
 * 《山海汴京圖》v2 — 5-Pass Next-Gen WebGL2 Song-Dynasty Ink-Wash 3D Engine
 * Zero External Dependencies · Native WebGL2 + GLSL ES 3.00 · Built by Gemini 4 Neon
 *
 * Render Pipeline:
 *   Pass 1: 1024x1024 Sun Directional PCF Shadow Map (DEPTH_COMPONENT24)
 *   Pass 2: Half-Res True Planar Mirror Water Reflection FBO (mirrored camera across y = 0)
 *   Pass 3: Full-Res MRT Scene (Sky, Karst Mountains + Fu-Pi Cun, Sweeping Song Architecture,
 *           Planar-Reflected Ink River, GPU Calligraphic Foliage Brushes, Translucent Spirit Kun,
 *           Silk Waterfalls, Volumetric Valley Clouds, 1,050 Spirit & Firefly Particles)
 *   Pass 4: Quarter-Res Volumetric Sun God-Rays + Separable Gaussian Lantern/Kun Bloom
 *   Pass 5: Adaptive 4-Sector Painterly Kuwahara Brush Filter + Delicate Dry-Brush Ink Accents
 *           + Song Silk/Xuan Paper Grain + ACES Filmic Grading + Live 3D Wireframe Split Curtain
 *
 * Camera:
 *   - 100% Unobstructed First-Person Free-Look & Flight (Zero orbit clipping!)
 *   - Guided First-Person River Cruise (glides right under Rainbow Bridge) & Cloud/Kun Soar
 *     with full 360-degree mouse free-look active at all times!
 */
const ShanHaiEngine = (() => {
  "use strict";

  /* ==========================================================================
     1. Compact Column-Major Mat4 Math Utilities
     ========================================================================== */
  function mat4Identity() {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
  }

  function mat4Mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        o[c * 4 + r] =
          a[r] * b[c * 4] +
          a[4 + r] * b[c * 4 + 1] +
          a[8 + r] * b[c * 4 + 2] +
          a[12 + r] * b[c * 4 + 3];
      }
    }
    return o;
  }

  function mat4Perspective(fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy * 0.5);
    const nf = 1.0 / (near - far);
    const m = new Float32Array(16);
    m[0] = f / aspect;
    m[5] = f;
    m[10] = (far + near) * nf;
    m[11] = -1;
    m[14] = 2 * far * near * nf;
    return m;
  }

  function mat4Ortho(l, r, b, t, n, f) {
    const m = new Float32Array(16);
    m[0] = 2 / (r - l);
    m[5] = 2 / (t - b);
    m[10] = -2 / (f - n);
    m[12] = -(r + l) / (r - l);
    m[13] = -(t + b) / (t - b);
    m[14] = -(f + n) / (f - n);
    m[15] = 1;
    return m;
  }

  function mat4LookAt(eye, target, up) {
    let zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
    let len = Math.hypot(zx, zy, zz) || 1;
    zx /= len; zy /= len; zz /= len;
    let xx = up[1] * zz - up[2] * zy;
    let xy = up[2] * zx - up[0] * zz;
    let xz = up[0] * zy - up[1] * zx;
    len = Math.hypot(xx, xy, xz) || 1;
    xx /= len; xy /= len; xz /= len;
    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;
    const m = new Float32Array(16);
    m[0] = xx; m[1] = yx; m[2] = zx; m[3] = 0;
    m[4] = xy; m[5] = yy; m[6] = zy; m[7] = 0;
    m[8] = xz; m[9] = yz; m[10] = zz; m[11] = 0;
    m[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
    m[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
    m[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
    m[15] = 1;
    return m;
  }

  function mat4ModelTRS(tx, ty, tz, rx, ry, rz, sx, sy, sz) {
    const cx = Math.cos(rx), sxr = Math.sin(rx);
    const cy = Math.cos(ry), syr = Math.sin(ry);
    const cz = Math.cos(rz), szr = Math.sin(rz);
    const m = new Float32Array(16);
    m[0] = (cy * cz + syr * sxr * szr) * sx;
    m[1] = (cx * szr) * sx;
    m[2] = (-syr * cz + cy * sxr * szr) * sx;
    m[4] = (-cy * szr + syr * sxr * cz) * sy;
    m[5] = (cx * cz) * sy;
    m[6] = (syr * szr + cy * sxr * cz) * sy;
    m[8] = (syr * cx) * sz;
    m[9] = (-sxr) * sz;
    m[10] = (cy * cx) * sz;
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

  /* ==========================================================================
     2. Shared GLSL ES 3.00 Noise & Atmospheric Ink-Mist Helpers
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
        p = rot * p * 2.04 + vec2(7.3, 4.1);
        a *= 0.5;
      }
      return v;
    }

    // Shared Sky + Valley Mist Palette (consistent across Sky, Terrain, Water & Clouds!)
    vec3 getSkyColor(vec3 dir, vec3 sunDir, float nightV, float monoV) {
      float h = clamp(dir.y, -0.15, 1.0);
      // Day: Luminous Imperial Gold-Silk horizon -> Fresh Song Mineral Celadon-Azure Zenith!
      vec3 dayHor = vec3(0.98, 0.90, 0.72);
      vec3 dayMid = vec3(0.68, 0.84, 0.83);
      vec3 dayTop = vec3(0.28, 0.54, 0.66);
      vec3 dayCol = mix(dayHor, dayMid, smoothstep(0.0, 0.25, h));
      dayCol = mix(dayCol, dayTop, smoothstep(0.20, 0.78, h));

      // Night: Deep Lapis-Indigo Moonlit Silk
      vec3 ngtHor = vec3(0.11, 0.17, 0.26);
      vec3 ngtMid = vec3(0.06, 0.10, 0.19);
      vec3 ngtTop = vec3(0.02, 0.04, 0.09);
      vec3 ngtCol = mix(ngtHor, ngtMid, smoothstep(0.0, 0.30, h));
      ngtCol = mix(ngtCol, ngtTop, smoothstep(0.26, 0.85, h));

      vec3 col = mix(dayCol, ngtCol, nightV);

      // Solar / Lunar Mie Atmospheric Glow
      float sunCos = max(dot(normalize(dir), normalize(sunDir)), 0.0);
      vec3 sunHaloCol = mix(vec3(1.0, 0.78, 0.44), vec3(0.58, 0.76, 0.96), nightV);
      col += sunHaloCol * (pow(sunCos, 6.0) * 0.36 + pow(sunCos, 42.0) * 0.48);

      // Sumi-e Monochrome Ink-Scroll Sky
      vec3 monoHor = vec3(0.93, 0.90, 0.83);
      vec3 monoTop = vec3(0.76, 0.74, 0.68);
      vec3 monoCol = mix(monoHor, monoTop, smoothstep(0.0, 0.75, h)) + vec3(0.08, 0.06, 0.03) * pow(sunCos, 8.0);
      col = mix(col, monoCol, monoV);
      return col;
    }

    // Height-Stratified Song Valley Mist (keeps foreground/midground crisp jewel pigments while layering far peaks!)
    vec3 applySongMist(vec3 col, vec3 worldPos, vec3 camPos, vec3 sunDir, float nightV, float monoV) {
      vec3 v = worldPos - camPos;
      float dist = length(v);
      vec3 dir = v / max(dist, 0.001);

      // Exponential valley mist starts gently past midground (24m), preserving rich near/mid architecture & bridge!
      float valleyDensity = exp(-max(worldPos.y - 1.2, 0.0) * 0.095);
      float distFog = 1.0 - exp(-pow(max(dist - 24.0, 0.0) * 0.0086, 1.35));
      float valleyFog = (1.0 - exp(-max(dist - 22.0, 0.0) * 0.0155 * valleyDensity)) * 0.64;
      float fogAmt = clamp(max(distFog, valleyFog), 0.0, 0.92);

      float sunAmt = pow(max(dot(dir, normalize(sunDir)), 0.0), 3.5);
      vec3 mistDay = mix(vec3(0.74, 0.86, 0.83), vec3(1.0, 0.88, 0.64), sunAmt * 0.76);
      vec3 mistNgt = mix(vec3(0.08, 0.13, 0.21), vec3(0.24, 0.34, 0.46), sunAmt * 0.65);
      vec3 mistCol = mix(mistDay, mistNgt, nightV);
      vec3 mistMono = mix(vec3(0.90, 0.88, 0.82), vec3(0.96, 0.93, 0.86), sunAmt * 0.5);
      mistCol = mix(mistCol, mistMono, monoV);

      return mix(col, mistCol, fogAmt);
    }
  `;

  /* ==========================================================================
     3. Shaders for All 5 Passes
     ========================================================================== */

  // --- PASS 1: Shadow Depth Shader ---
  const VS_SHADOW = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aPos;
    layout(location=4) in vec4 aExtra;
    uniform mat4 uLightVP;
    uniform mat4 uModel;
    uniform float uTime;
    void main() {
      vec3 pos = aPos;
      // Subtle crane wing flap ONLY on crane wing vertices (matId == 9.0)
      if (aExtra.x > 8.5 && aExtra.z > 0.05) {
        pos.y += sin(uTime * 5.2 + aExtra.z * 2.0) * aExtra.z * 0.55;
      }
      gl_Position = uLightVP * uModel * vec4(pos, 1.0);
    }
  `;
  const FS_SHADOW = `#version 300 es
    precision highp float;
    void main() {}
  `;

  // --- PASS 3a: Song Silk Sky Dome (Fullscreen Triangle at far depth) ---
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

      // Subtle wispy high-altitude silk brush clouds painted softly in sky
      if (dir.y > 0.01) {
        vec2 cuv = dir.xz / (dir.y + 0.24) * 0.65 + vec2(uTime * 0.004, -uTime * 0.002);
        float c1 = fbm2(cuv * 1.4);
        float c2 = fbm2(cuv * 2.8 + vec2(c1 * 1.1, -c1 * 0.7));
        float wisp = smoothstep(0.50, 0.80, c2) * smoothstep(0.01, 0.20, dir.y) * smoothstep(0.85, 0.25, dir.y);
        vec3 wispCol = mix(vec3(0.99, 0.94, 0.84), vec3(0.24, 0.34, 0.46), uNight);
        wispCol = mix(wispCol, vec3(0.96, 0.94, 0.89), uMono);
        col = mix(col, wispCol, wisp * 0.36);
      }

      // Luminous Sun Disc (Day: warm Imperial Cinnabar-Gold Sun; Night: Pale Silver Full Moon!)
      float cosA = dot(dir, sunD);
      float disc = smoothstep(0.9986, 0.99935, cosA);
      float halo = pow(max(cosA, 0.0), 180.0);
      vec3 discCol = mix(vec3(1.0, 0.86, 0.56), vec3(0.92, 0.96, 1.0), uNight);
      discCol = mix(discCol, vec3(0.86, 0.26, 0.18), uMono * 0.78); // Classic red-seal sun in Sumi-e!
      col = mix(col, discCol, disc * 0.92);
      col += mix(vec3(1.0, 0.76, 0.42), vec3(0.60, 0.78, 1.0), uNight) * halo * (1.0 - uMono * 0.55) * 0.65;

      // Subtle twinkling stars in Lantern Night mode
      if (uNight > 0.05 && dir.y > 0.08) {
        vec2 suv = floor(dir.xz / (dir.y + 0.18) * 140.0);
        float st = hash12(suv);
        float star = step(0.9965, st) * smoothstep(0.08, 0.32, dir.y) * (0.55 + 0.45 * sin(uTime * 2.4 + st * 90.0));
        col += vec3(0.82, 0.90, 1.0) * star * uNight * (1.0 - uMono) * 0.75;
      }

      // Wireframe sky backdrop (sleek twilight slate + subtle horizon compass line)
      float skyEmissive = disc * 0.95 + halo * 0.45;
      float godRaySrc = smoothstep(0.94, 0.998, cosA) * 0.9 + disc;

      oColor = vec4(col, 0.0); // alpha=0 marks Sky!
      oData  = vec4(0.5, 0.5, 1.0, 0.0);
      oWire  = vec4(0.05, 0.0, clamp(skyEmissive, 0.0, 1.0), clamp(godRaySrc, 0.0, 1.0));
    }
  `;

  // --- PASS 3b: Main Solid World + Song Architecture + Bridge + Sampans + Cranes ---
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
      // Crane wing flapping animation ONLY on crane wing vertices (matId == 9.0)
      if (aExtra.x > 8.5 && aExtra.z > 0.05) {
        pos.y += sin(uTime * 5.2 + aExtra.z * 2.0) * aExtra.z * 0.55;
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
      vec2 texel = vec2(1.0 / 1024.0);
      float sh = 0.0;
      sh += (sc.z - bias <= texture(uShadowMap, sc.xy).r) ? 1.0 : 0.0;
      sh += (sc.z - bias <= texture(uShadowMap, sc.xy + vec2( texel.x,  texel.y)).r) ? 1.0 : 0.0;
      sh += (sc.z - bias <= texture(uShadowMap, sc.xy + vec2(-texel.x,  texel.y)).r) ? 1.0 : 0.0;
      sh += (sc.z - bias <= texture(uShadowMap, sc.xy + vec2( texel.x, -texel.y)).r) ? 1.0 : 0.0;
      sh += (sc.z - bias <= texture(uShadowMap, sc.xy + vec2(-texel.x, -texel.y)).r) ? 1.0 : 0.0;
      return sh * 0.2;
    }

    void main() {
      if (uClipY > 0.5 && vWorldPos.y < -0.18) discard;

      vec3 N = normalize(vNorm);
      vec3 V = normalize(uCamPos - vWorldPos);
      vec3 L = normalize(uSunDir);
      float matId = vExtra.x;
      float ao = clamp(vExtra.w, 0.35, 1.0);

      vec3 albedo = vCol;
      float emissive = 0.0;
      float edgeCtrl = 0.50; // Controls painterly Kuwahara vs crisp edge

      // ---- Material 0: Song Karst Mountain & Riverbank (斧劈皴 + 千里江山青綠金碧!) ----
      if (matId < 0.5) {
        edgeCtrl = 0.38; // Stronger painterly ink wash on mountains!
        float slope = 1.0 - clamp(N.y, 0.0, 1.0);
        // Anisotropic rock strata brushwork (斧劈皴 / 披麻皴)
        vec2 rockUV = vec2(vWorldPos.x * 0.14 + vWorldPos.z * 0.14, vWorldPos.y * 0.52);
        float cun = fbm2(rockUV * 1.45);
        float strata = sin(vWorldPos.y * 1.6 + cun * 5.2) * 0.5 + 0.5;
        float dryBrush = smoothstep(0.28, 0.78, fbm2(vec2(vWorldPos.x * 0.32, vWorldPos.y * 0.95)));

        // Subtle wet-edge darkening along sheer rock crevices
        vec3 darkInk = vec3(0.08, 0.16, 0.22);
        albedo = mix(albedo, darkInk, slope * dryBrush * 0.44);
        albedo *= (0.84 + 0.30 * mix(cun, strata, 0.45));

        // Wet shoreline pebble & moss band near river y = 0..1.2
        float wetShore = 1.0 - smoothstep(-0.2, 1.35, vWorldPos.y);
        albedo = mix(albedo, vec3(0.26, 0.30, 0.25), wetShore * 0.52);

        // Richer mineral azurite crest depth so sunlit peaks keep iconic Song Blue-Green silhouette!
        float highAzurite = smoothstep(10.0, 28.0, vWorldPos.y);
        albedo = mix(albedo, vec3(0.08, 0.25, 0.42), highAzurite * 0.36);

        // Signature Song Gold-Leaf Sunlit Ridge Rim (金碧山水泥金勾勒!)
        float sunRidge = smoothstep(7.0, 26.0, vWorldPos.y) * pow(max(dot(N, L), 0.0), 1.6) * (0.45 + 0.55 * cun);
        albedo += vec3(0.36, 0.28, 0.11) * sunRidge * (1.0 - uNight) * (1.0 - uMono);
      }
      // ---- Material 1: Curved Song Glazed Tile Roof (筒瓦脊線 + 青瓷微光) ----
      else if (matId < 1.5) {
        edgeCtrl = 0.88;
        float rib = sin(vExtra.y * 6.28318 * 1.4) * 0.5 + 0.5;
        float row = fract(vExtra.z * 1.8);
        albedo *= (0.82 + 0.26 * rib) * (0.90 + 0.12 * smoothstep(0.0, 0.2, row));
        // Subtle ceramic specular highlight from sun/moon
        vec3 H = normalize(L + V);
        float spec = pow(max(dot(N, H), 0.0), 28.0) * 0.38;
        albedo += mix(vec3(0.95, 0.84, 0.62), vec3(0.55, 0.72, 0.95), uNight) * spec;
      }
      // ---- Material 2: Aged Bridge Timber & Cinnabar Lacquer ----
      else if (matId < 2.5) {
        edgeCtrl = 0.90;
        float grain = fbm2(vec2(vWorldPos.x * 2.4 + vWorldPos.z * 2.4, vWorldPos.y * 0.9));
        albedo *= (0.84 + 0.28 * grain);
      }
      // ---- Material 3: Antique Lime-Plaster Wall & Carved Stone ----
      else if (matId < 3.5) {
        edgeCtrl = 0.86;
        float plaster = fbm2(vWorldPos.xz * 0.9 + vWorldPos.yy * 1.1);
        albedo *= (0.88 + 0.20 * plaster);
      }
      // ---- Material 4: Warm Glowing Silk Lanterns & Candlelit Lattice Windows ----
      else if (matId < 4.5) {
        edgeCtrl = 0.95;
        float flicker = 0.92 + 0.08 * sin(uTime * 3.8 + vWorldPos.x * 1.9 + vWorldPos.z * 1.3);
        // Subtle Song wooden lattice mullion grid on pavilion windows (tall boxes)
        float gx = abs(fract(vWorldPos.x * 2.6 + vWorldPos.z * 2.6) - 0.5);
        float gy = abs(fract(vWorldPos.y * 2.8) - 0.5);
        float mullion = smoothstep(0.42, 0.48, max(gx, gy));
        vec3 glowCol = mix(vec3(1.0, 0.76, 0.38), vec3(1.0, 0.62, 0.22), uNight * 0.55) * flicker;
        // Keep lanterns radiant even in daytime, blazing brightly at night!
        float intensity = mix(1.05, 1.65, uNight);
        vec3 lit = mix(glowCol * intensity, vec3(0.24, 0.14, 0.10), mullion * 0.42 * step(0.85, vExtra.w));
        emissive = mix(0.68, 1.0, uNight) * (1.0 - mullion * 0.35);
        albedo = lit;
      }
      // ---- Material 5: Calligraphic Ink Pine/Willow Bark ----
      else if (matId < 5.5) {
        edgeCtrl = 0.65;
        float bark = fbm2(vec2(vWorldPos.x * 3.0, vWorldPos.y * 6.0));
        albedo *= (0.72 + 0.42 * bark);
      }

      // ---- Lighting (Sun Key + Soft PCF Shadow + Sky Hemisphere + Backlit Rim + Warm Bridge Bounce) ----
      float shadow = (matId > 3.5 && matId < 4.5) ? 1.0 : calcShadow(vLightPos, N, L);
      float ndl = max(dot(N, L), 0.0);
      // Soft half-Lambert wrap for painterly ink warmth without harsh black shadows!
      float wrapDiff = max(dot(N, L) * 0.65 + 0.35, 0.0);
      float sunFactor = mix(0.32, 1.0, ndl * shadow);

      vec3 sunCol = mix(vec3(1.08, 0.90, 0.66), vec3(0.36, 0.50, 0.78), uNight);
      vec3 skyAmb = mix(vec3(0.46, 0.58, 0.62), vec3(0.09, 0.14, 0.24), uNight);
      vec3 gndAmb = mix(vec3(0.34, 0.30, 0.24), vec3(0.06, 0.08, 0.12), uNight);
      vec3 hemi = mix(gndAmb, skyAmb, N.y * 0.5 + 0.5);

      // Golden rim backlighting (creates breathtaking layered Song peak separation!)
      float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
      float backRim = fres * pow(max(dot(-V, L), 0.0), 2.0) * smoothstep(0.0, 0.7, N.y + 0.3);
      vec3 rimCol = mix(vec3(1.0, 0.78, 0.44), vec3(0.45, 0.68, 0.98), uNight) * backRim * 0.48;

      // Subtle warm lantern bounce illumination near the Rainbow Bridge & Pavilions at night!
      float dBridge = length(vWorldPos - vec3(-0.8, 5.5, -18.0));
      float dLeftPav = length(vWorldPos - vec3(-17.0, 4.5, -13.0));
      float dRightPav = length(vWorldPos - vec3(15.0, 4.0, -25.5));
      float lanternGlow =
        exp(-dBridge * 0.095) * 0.85 +
        exp(-dLeftPav * 0.12) * 0.65 +
        exp(-dRightPav * 0.13) * 0.60;
      vec3 warmBounce = vec3(1.0, 0.56, 0.22) * lanternGlow * mix(0.14, 0.88, uNight);

      vec3 litCol = albedo * (hemi * 0.78 + sunCol * (ndl * shadow * 0.88 + wrapDiff * 0.18)) * ao + rimCol + warmBounce * albedo;
      if (matId > 3.5 && matId < 4.5) {
        litCol = albedo; // Self-illuminated lanterns/windows
      }

      // Sumi-e Monochrome Ink Wash Mode (retains subtle cinnabar lantern/vermilion warmth!)
      if (uMono > 0.01) {
        float lum = dot(litCol, vec3(0.299, 0.587, 0.114));
        float inkTone = smoothstep(0.04, 0.92, lum);
        vec3 inkCol = mix(vec3(0.12, 0.13, 0.14), vec3(0.91, 0.88, 0.80), inkTone);
        // Preserve iconic cinnabar red on lanterns & red lacquer!
        float redPop = smoothstep(0.18, 0.42, litCol.r - max(litCol.g, litCol.b)) * (matId > 1.5 ? 0.78 : 0.0);
        inkCol = mix(inkCol, vec3(0.78, 0.20, 0.15) * (0.65 + 0.55 * lum), redPop);
        litCol = mix(litCol, inkCol, uMono);
      }

      // Apply Song Height-Stratified Valley Mist
      vec3 finalCol = applySongMist(litCol, vWorldPos, uCamPos, L, uNight, uMono);

      // Screen-space AA barycentric 3D wireframe (for split-curtain X-ray!)
      vec3 fw = fwidth(vBary);
      vec3 a3 = smoothstep(vec3(0.0), fw * 1.35, vBary);
      float wire = 1.0 - min(min(a3.x, a3.y), a3.z);
      float clay = clamp((dot(N, normalize(vec3(0.4, 0.8, 0.4))) * 0.45 + 0.55) * ao, 0.15, 1.0);
      float linDepth = clamp(length(vWorldPos - uCamPos) / 160.0, 0.0, 1.0);

      oColor = vec4(finalCol, 1.0);
      oData  = vec4(N.x * 0.5 + 0.5, N.z * 0.5 + 0.5, linDepth, edgeCtrl);
      oWire  = vec4(clay, wire, emissive, 0.0);
    }
  `;

  // --- PASS 3c: True Planar Mirror Ink-Water Shader (Bianhe River & Shan-Hai Lake!) ---
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

      // Dual-layer flowing river ink ripples (horizontal calligraphic water strokes!)
      vec2 p = vWorldPos.xz;
      float w1 = fbm2(vec2(p.x * 0.42, p.y * 0.16 - uTime * 0.32));
      float w2 = fbm2(vec2(p.x * 0.85 + 5.2, p.y * 0.34 + uTime * 0.24));
      float rippleX = (w1 - 0.5) * 0.032 + (w2 - 0.5) * 0.018;
      float rippleY = (w2 - 0.5) * 0.022 + sin(p.y * 1.4 - uTime * 1.6 + w1 * 4.0) * 0.008;

      // Perturbed surface normal for Fresnel & Sun/Moon Specular Shimmer
      vec3 N = normalize(vec3(rippleX * 4.2, 1.0, rippleY * 6.5));

      // Sample TRUE Planar Reflection FBO!
      vec2 refUV = (vRefClip.xy / max(vRefClip.w, 0.001)) * 0.5 + 0.5;
      float distDamp = clamp(1.0 - dist * 0.005, 0.35, 1.0);
      vec2 warpedUV = clamp(refUV + vec2(rippleX, rippleY * 1.35) * distDamp, vec2(0.004), vec2(0.996));
      vec3 reflCol = texture(uReflectTex, warpedUV).rgb;

      // Deep tranquil Song Mineral Jade river base color
      vec3 deepDay = vec3(0.22, 0.39, 0.39);
      vec3 deepNgt = vec3(0.04, 0.09, 0.14);
      vec3 deepMono = vec3(0.76, 0.75, 0.70);
      vec3 waterBase = mix(deepDay, deepNgt, uNight);
      waterBase = mix(waterBase, deepMono, uMono);

      // Schlick Fresnel (mirror-like at classic Song viewing angles, translucent jade looking down!)
      float fres = 0.18 + 0.76 * pow(1.0 - max(dot(N, V), 0.0), 3.2);
      vec3 col = mix(waterBase, reflCol * mix(0.95, 1.06, uNight), fres);

      // Shimmering Golden Sun / Silver Moon Glint Path down the Bianhe River!
      vec3 H = normalize(L + V);
      float specCore = pow(max(dot(N, H), 0.0), 140.0);
      float specWide = pow(max(dot(N, H), 0.0), 22.0) * (0.5 + 0.5 * sin(p.y * 2.8 - uTime * 2.1 + w1 * 7.0));
      vec3 glintCol = mix(vec3(1.0, 0.85, 0.52), vec3(0.66, 0.82, 1.0), uNight);
      glintCol = mix(glintCol, vec3(0.98, 0.96, 0.90), uMono);
      col += glintCol * (specCore * 1.15 + specWide * 0.24);

      // Subtle calligraphic ink-wash horizontal wave lines (宋畫水紋留白!)
      float inkWave = smoothstep(0.72, 0.88, sin(p.y * 1.15 + w1 * 6.5 - uTime * 0.65) * 0.5 + 0.5);
      col = mix(col, mix(vec3(0.94, 0.91, 0.83), vec3(0.18, 0.28, 0.38), uNight), inkWave * 0.09 * distDamp);

      // Apply Song atmospheric mist seamlessly into horizon
      col = applySongMist(col, vWorldPos, uCamPos, L, uNight, uMono);

      // Emissive sparkle for subtle water bloom
      float waterGlow = clamp(specCore * 0.55 + max(reflCol.r - 0.82, 0.0) * 1.4, 0.0, 0.65);

      vec3 fw = fwidth(vBary);
      vec3 a3 = smoothstep(vec3(0.0), fw * 1.35, vBary);
      float wire = 1.0 - min(min(a3.x, a3.y), a3.z);
      float linDepth = clamp(dist / 160.0, 0.0, 1.0);

      oColor = vec4(col, 1.0);
      oData  = vec4(0.5, 0.5, linDepth, 0.12); // Low edgeCtrl so water stays liquid-smooth!
      oWire  = vec4(0.32, wire * 0.85, waterGlow, 0.0);
    }
  `;

  // --- PASS 3d: GPU Calligraphic Ink-Wash Foliage Shader (松針 / 垂柳 / 丹楓 / 蘆葦) ---
  const VS_FOLIAGE = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aCenter;
    layout(location=1) in vec2 aOffset;
    layout(location=2) in vec3 aNorm;
    layout(location=3) in vec3 aCol;
    layout(location=4) in vec4 aSeed; // seed, brushType, windFlex, size

    uniform mat4 uView;
    uniform mat4 uProj;
    uniform float uTime;

    out vec2 vUV;
    out vec3 vWorldPos;
    out vec3 vNorm;
    out vec3 vCol;
    out vec4 vSeed;

    void main() {
      // Camera right & up vectors directly from View matrix (cylindrical-soft billboard!)
      vec3 camRight = vec3(uView[0][0], uView[1][0], uView[2][0]);
      vec3 camUp    = normalize(mix(vec3(uView[0][1], uView[1][1], uView[2][1]), vec3(0.0, 1.0, 0.0), 0.35));

      float sway = sin(uTime * 1.45 + aCenter.x * 0.35 + aCenter.z * 0.25 + aSeed.x) * 0.18 * aSeed.z;
      vec2 off = aOffset;
      // Willow tendrils (type 1) & Reeds (type 3) are taller vertically
      if (aSeed.y > 0.5 && aSeed.y < 1.5) off.y *= 1.38;
      if (aSeed.y > 2.5) off.y *= 1.25;

      vec3 wp = aCenter + camRight * (off.x + sway * (off.y * 0.5 + 0.5)) + camUp * off.y;
      vWorldPos = wp;
      vUV = aOffset / max(aSeed.w, 0.01); // normalized [-1..1]
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

      float bType = vSeed.y;
      float seed = vSeed.x;
      float alpha = 0.0;
      float brushInk = 0.5;

      if (bType < 0.5) {
        // Type 0: Song Pine Needle Fan Clusters (馬遠/夏圭松針點葉!)
        vec2 q = vec2(vUV.x * 0.92, vUV.y * 1.32);
        float ang = atan(q.y, q.x);
        float rad = length(q);
        float needles = sin(ang * 13.0 + seed) * 0.14 + sin(ang * 23.0 - seed * 1.7) * 0.08;
        float nTex = fbm2(vUV * 3.8 + vec2(seed, seed * 0.7));
        float shape = 1.0 - smoothstep(0.42 + needles, 0.96 + needles, rad + (nTex - 0.5) * 0.34);
        // Subtle horizontal pine-pad layering
        float pad = smoothstep(-0.85, 0.35, vUV.y) * smoothstep(0.95, -0.1, vUV.y);
        alpha = shape * (0.65 + 0.35 * pad);
        brushInk = nTex;
      } else if (bType < 1.5) {
        // Type 1: Organic Fountain-Arched Song Weeping Willow (柔柳垂絲 — ZERO straight fence bars!)
        float yTop = clamp((vUV.y + 1.0) * 0.5, 0.0, 1.0); // 0=bottom tip, 1=crown top
        // Soft arched fountain spread outward as vines droop downward
        float archX = vUV.x / (0.68 + 0.48 * (1.0 - yTop));
        float dome = 1.0 - smoothstep(0.32, 0.92, length(vec2(vUV.x * 0.95, (vUV.y - 0.38) * 1.45)));
        float nFlow = fbm2(vec2(archX * 3.8 + seed, vUV.y * 1.4));
        float swayX = archX * 6.5 + sin(vUV.y * 2.6 + seed + nFlow * 3.2) * 0.85;
        float vineIdx = floor(swayX);
        float vineFrac = abs(fract(swayX) - 0.5) * 2.0;
        // Each vine has an organic variable droop length & feathery beaded tiny willow leaves!
        float vineDrop = -0.95 + hash12(vec2(vineIdx, seed)) * 0.85;
        float vineLenMask = smoothstep(vineDrop, vineDrop + 0.35, vUV.y) * smoothstep(0.96, 0.42, vUV.y);
        float beadLeaves = 0.55 + 0.45 * sin(vUV.y * 26.0 + vineIdx * 3.7 + nFlow * 4.0);
        float thinVine = (1.0 - smoothstep(0.18, 0.62 * beadLeaves, vineFrac)) * (1.0 - smoothstep(0.55, 0.98, abs(archX)));
        float fineDabs = smoothstep(0.36, 0.74, fbm2(vec2(vUV.x * 6.5 + seed, vUV.y * 4.2))) * dome;
        alpha = clamp(max(thinVine * vineLenMask * 0.92, fineDabs * 0.88), 0.0, 1.0);
        brushInk = mix(nFlow, beadLeaves, 0.45);
      } else if (bType < 2.5) {
        // Type 2: Autumn Cinnabar Maple Ink Dabs (點苔丹楓!)
        float rad = length(vUV * vec2(1.0, 1.12));
        float nTex = fbm2(vUV * 4.4 + vec2(seed * 1.3, seed));
        float lobes = sin(atan(vUV.y, vUV.x) * 7.0 + seed) * 0.16;
        alpha = 1.0 - smoothstep(0.40 + lobes, 0.92 + lobes, rad + (nTex - 0.5) * 0.42);
        brushInk = nTex;
      } else {
        // Type 3: Graceful Wind-Bent Crossing Waterside Reeds + Soft Golden Plumes (秋江蘆葦!)
        float y01 = clamp((vUV.y + 1.0) * 0.5, 0.0, 1.0);
        // Two crossing gently curved reed fan clusters (bending organically in river breeze!)
        float bend1 = vUV.x - y01 * y01 * 0.42 * (hash12(vec2(seed, 1.0)) > 0.5 ? 1.0 : -1.0);
        float bend2 = vUV.x + y01 * y01 * 0.36 * (hash12(vec2(seed, 2.0)) > 0.5 ? 1.0 : -1.0);
        float taper = mix(0.28, 0.06, y01);
        float b1 = 1.0 - smoothstep(taper * 0.4, taper, abs(fract(bend1 * 3.8 + seed) - 0.5));
        float b2 = 1.0 - smoothstep(taper * 0.4, taper, abs(fract(bend2 * 4.6 + seed * 1.7) - 0.5));
        float env1 = (1.0 - smoothstep(0.25, 0.88, abs(bend1))) * smoothstep(1.0, 0.65, y01) * smoothstep(0.0, 0.12, y01);
        float env2 = (1.0 - smoothstep(0.25, 0.86, abs(bend2))) * smoothstep(0.88, 0.48, y01) * smoothstep(0.0, 0.10, y01);
        // Soft feathery autumn reed plume tuft near upper tips!
        float plume = (1.0 - smoothstep(0.08, 0.34, length(vec2(bend1 * 1.4, (y01 - 0.78) * 3.2)))) * fbm2(vUV * 9.0 + seed);
        alpha = clamp(max(b1 * env1, b2 * env2 * 0.85) + plume * 0.7, 0.0, 1.0);
        brushInk = 0.35 + 0.65 * y01;
      }

      if (alpha < 0.32) discard;

      vec3 N = normalize(vNorm);
      vec3 L = normalize(uSunDir);
      vec3 V = normalize(uCamPos - vWorldPos);

      // Coherent crown shading + backlit golden leaf translucency!
      float crownLight = clamp(dot(N, L) * 0.55 + 0.55, 0.25, 1.0);
      float topGrad = smoothstep(-0.85, 0.85, vUV.y);
      float backLight = pow(max(dot(-V, L), 0.0), 3.0) * (0.4 + 0.6 * topGrad);

      // Wet-edge calligraphy pigment pooling (darker ink at brush rim, luminous jade inside!)
      float wetEdge = smoothstep(0.62, 0.30, alpha);
      vec3 darkPigment = vCol * 0.42 + vec3(0.02, 0.05, 0.07);
      vec3 brightPigment = vCol * 1.25 + vec3(0.10, 0.12, 0.05) * topGrad;
      vec3 col = mix(brightPigment, darkPigment, wetEdge * 0.55 + (1.0 - crownLight) * 0.48);
      col *= (0.78 + 0.35 * brushInk);

      // Sunlit golden foliage rim & moonlit indigo shift
      vec3 dayLit = col + mix(vec3(0.34, 0.32, 0.14), vec3(0.45, 0.22, 0.10), step(1.5, bType) * step(bType, 2.5)) * backLight;
      vec3 ngtLit = col * vec3(0.22, 0.32, 0.48) + vec3(0.10, 0.18, 0.28) * backLight;
      col = mix(dayLit, ngtLit, uNight);

      // Sumi-e Monochrome mode (keeps cinnabar maple accent!)
      if (uMono > 0.01) {
        float lum = dot(col, vec3(0.299, 0.587, 0.114));
        vec3 ink = mix(vec3(0.08, 0.10, 0.11), vec3(0.48, 0.48, 0.44), lum);
        if (bType > 1.5 && bType < 2.5) ink = mix(ink, vec3(0.76, 0.20, 0.14), 0.72);
        col = mix(col, ink, uMono);
      }

      col = applySongMist(col, vWorldPos, uCamPos, L, uNight, uMono);

      float linDepth = clamp(length(vWorldPos - uCamPos) / 160.0, 0.0, 1.0);
      // Botanical contour wireframe signal on 3D X-Ray side (sleek luminous emerald rings instead of dark blobs!)
      float contourWire = smoothstep(0.56, 0.32, alpha) * 0.85 + smoothstep(0.86, 0.98, max(abs(vUV.x), abs(vUV.y))) * 0.35;
      oColor = vec4(col, 1.0);
      oData  = vec4(N.x * 0.5 + 0.5, N.z * 0.5 + 0.5, linDepth, 0.22); // Soft painterly foliage (no black boxes!)
      oWire  = vec4(0.36 + topGrad * 0.28, clamp(contourWire, 0.0, 1.0), 0.0, 0.0);
    }
  `;

  // --- PASS 3e: 《山海經》Ethereal Translucent Spirit-Ink Kun Shader ---
  const VS_KUN = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aPos;
    layout(location=1) in vec3 aNorm;
    layout(location=2) in vec3 aCol;
    layout(location=3) in vec3 aBary;
    layout(location=4) in vec4 aExtra; // [7, spineS, wingSpan, chordV]

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
      float s = aExtra.y;
      float wingU = aExtra.z;

      // Graceful continuous whale-swim undulation along spine
      float swimPhase = uTime * 1.55 - s * 4.2;
      pos.y += sin(swimPhase) * (0.28 + s * 1.15);
      pos.x += cos(swimPhase * 0.72) * (0.14 + s * 0.65);

      // Silky sweeping celestial wing-fin wave!
      if (wingU > 0.04) {
        float w = max(0.0, wingU - 0.06);
        float flap = sin(uTime * 1.65 - w * 2.4 - aExtra.w * 1.2) * (w * w * 2.5);
        pos.y += flap;
      }

      vec4 wp = uModel * vec4(pos, 1.0);
      vWorldPos = wp.xyz;
      vNorm = normalize(mat3(uModel) * aNorm);
      vCol = aCol;
      vBary = aBary;
      vExtra = aExtra;
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

      float s = vExtra.y;
      float wingU = vExtra.z;
      float chordV = vExtra.w;

      // Ultra-fine luminous golden Shan Hai celestial filigree veins (細緻流金星脈 — ZERO cow-spot patches!)
      float flow = fbm2(vec2(s * 6.5 - uTime * 0.32, wingU * 4.5 + chordV * 3.5));
      float waveLine = abs(sin((s * 24.0 - uTime * 1.15) + flow * 5.2));
      float filigree = pow(1.0 - waveLine, 10.0) * smoothstep(0.28, 0.72, flow);
      float wingLines = pow(abs(sin(chordV * 28.0 + flow * 3.0)), 14.0) * smoothstep(0.08, 0.45, wingU);
      float veins = clamp(filigree * 1.15 + wingLines * 0.65, 0.0, 1.0);
      float fres = pow(1.0 - abs(dot(N, V)), 2.0);

      // Rich deep celestial lapis-indigo spirit core + iridescent turquoise-gold gossamer silk wings!
      vec3 coreCol = mix(vec3(0.07, 0.24, 0.42), vec3(0.26, 0.64, 0.68), smoothstep(0.15, 0.85, flow));
      vec3 goldRune = mix(vec3(1.0, 0.82, 0.44), vec3(1.0, 0.88, 0.52), uNight);
      vec3 jadeRim  = mix(vec3(0.48, 0.88, 0.86), vec3(0.44, 0.88, 1.0), uNight);

      vec3 col = coreCol * (0.64 + 0.46 * max(dot(N, L), 0.0));
      col += goldRune * veins * (0.62 + 0.55 * wingU + 0.55 * uNight);
      col += jadeRim * fres * (0.68 + 0.60 * uNight);

      // Smoothly feathered translucent alpha dissolution on ALL outer wing & tail boundaries (ZERO hard rect edges!)
      float alpha = 0.90;
      if (wingU > 0.04) {
        float rootSoft = smoothstep(0.04, 0.16, wingU);
        float tipFade = 1.0 - smoothstep(0.42, 0.98, wingU);
        float leadFade = smoothstep(0.0, 0.14, chordV);
        float trailFade = 1.0 - smoothstep(0.58, 0.98, chordV);
        float silkMist = 0.50 + 0.50 * smoothstep(0.18, 0.82, flow);
        alpha = clamp(rootSoft * tipFade * leadFade * trailFade * silkMist * 0.86, 0.0, 0.86);
        if (alpha < 0.025) discard;
        col = mix(col, mix(jadeRim, goldRune, 0.48), wingU * 0.56);
      }

      if (uMono > 0.01) {
        float lum = dot(col, vec3(0.299, 0.587, 0.114));
        vec3 inkKun = mix(vec3(0.10, 0.13, 0.16), vec3(0.92, 0.88, 0.78), lum);
        inkKun += vec3(0.78, 0.30, 0.18) * veins * 0.45;
        col = mix(col, inkKun, uMono);
      }

      col = applySongMist(col, vWorldPos, uCamPos, L, uNight, uMono);

      float emissive = clamp((veins * 0.65 + fres * 0.55) * mix(0.55, 1.0, uNight), 0.0, 1.0);
      vec3 fw = fwidth(vBary);
      vec3 a3 = smoothstep(vec3(0.0), fw * 1.4, vBary);
      float wire = 1.0 - min(min(a3.x, a3.y), a3.z);
      float linDepth = clamp(length(vWorldPos - uCamPos) / 160.0, 0.0, 1.0);

      oColor = vec4(col, alpha);
      oData  = vec4(N.x * 0.5 + 0.5, N.z * 0.5 + 0.5, linDepth, 0.08);
      oWire  = vec4(0.65, wire, emissive, alpha);
    }
  `;

  // --- PASS 3f: Silky Translucent Cliff Waterfall Shader ---
  const VS_WATERFALL = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aPos;
    layout(location=3) in vec3 aBary;
    layout(location=4) in vec4 aExtra;
    uniform mat4 uView;
    uniform mat4 uProj;
    out vec3 vWorldPos;
    out vec3 vBary;
    out vec2 vUV;
    void main() {
      vWorldPos = aPos;
      vBary = aBary;
      vUV = aExtra.yz;
      gl_Position = uProj * uView * vec4(aPos, 1.0);
    }
  `;

  const FS_WATERFALL = `#version 300 es
    precision highp float;
    in vec3 vWorldPos;
    in vec3 vBary;
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
      float edgeX = smoothstep(0.0, 0.25, vUV.x) * smoothstep(1.0, 0.75, vUV.x);
      float topFade = smoothstep(0.0, 0.14, vUV.y);
      float botFade = smoothstep(1.0, 0.68, vUV.y);

      float s1 = fbm2(vec2(vUV.x * 6.5, vUV.y * 3.8 - uTime * 1.45));
      float s2 = fbm2(vec2(vUV.x * 13.0 + 3.1, vUV.y * 7.2 - uTime * 2.25));
      float streaks = smoothstep(0.28, 0.82, s1 * 0.6 + s2 * 0.45);
      float alpha = edgeX * topFade * botFade * (0.28 + 0.62 * streaks);
      if (alpha < 0.04) discard;

      vec3 col = mix(vec3(0.94, 0.96, 0.92), vec3(0.42, 0.58, 0.74), uNight);
      col = mix(col, vec3(0.94, 0.92, 0.87), uMono);
      col = applySongMist(col, vWorldPos, uCamPos, normalize(uSunDir), uNight, uMono);

      oColor = vec4(col, alpha * 0.76);
      oData  = vec4(0.5, 0.5, clamp(length(vWorldPos - uCamPos) / 160.0, 0.0, 1.0), 0.0);
      oWire  = vec4(0.7, 0.0, 0.18, 0.0);
    }
  `;

  // --- PASS 3g: Volumetric Valley Sea-of-Clouds Shader (飄渺祥雲海!) ---
  const VS_CLOUD = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aCenter;
    layout(location=1) in vec2 aOff;
    layout(location=2) in vec2 aSize;
    layout(location=3) in vec3 aMeta; // opacity, seed, tier

    uniform mat4 uView;
    uniform mat4 uProj;
    uniform float uTime;

    out vec2 vUV;
    out vec3 vWorldPos;
    out vec3 vMeta;

    void main() {
      vec3 right = vec3(uView[0][0], uView[1][0], uView[2][0]);
      vec3 up    = vec3(uView[0][1], uView[1][1], uView[2][1]);
      float drift = sin(uTime * 0.055 + aMeta.y) * 5.5;
      vec3 c = aCenter + vec3(drift, sin(uTime * 0.12 + aMeta.y) * 0.5, 0.0);
      vec3 wp = c + right * (aOff.x * aSize.x) + up * (aOff.y * aSize.y);
      vWorldPos = wp;
      vUV = aOff;
      vMeta = aMeta;
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
      // Soft near-camera fade so flying RIGHT THROUGH clouds feels dreamy, never pops!
      float nearFade = smoothstep(5.5, 18.0, dist);

      float r2 = dot(vUV, vUV);
      if (r2 > 1.0) discard;
      float radial = pow(1.0 - r2, 1.65);

      vec2 nuv = vUV * vec2(1.4, 2.2) + vec2(vMeta.y + uTime * 0.025, vMeta.y * 0.37);
      float n1 = fbm2(nuv);
      float n2 = fbm2(nuv * 2.1 + vec2(n1 * 1.2, -n1 * 0.6));
      float wisp = smoothstep(0.28, 0.76, n2) * radial;
      float alpha = wisp * vMeta.x * nearFade;
      if (alpha < 0.015) discard;

      vec3 dir = normalize(vWorldPos - uCamPos);
      float sunWarm = pow(max(dot(dir, normalize(uSunDir)), 0.0), 3.0);
      float topLit = smoothstep(-0.6, 0.7, vUV.y);

      vec3 dayBase = mix(vec3(0.76, 0.83, 0.82), vec3(0.99, 0.94, 0.84), topLit * 0.72 + sunWarm * 0.45);
      vec3 ngtBase = mix(vec3(0.08, 0.13, 0.22), vec3(0.24, 0.34, 0.48), topLit * 0.65 + sunWarm * 0.55);
      vec3 col = mix(dayBase, ngtBase, uNight);
      col = mix(col, vec3(0.94, 0.92, 0.86), uMono);

      oColor = vec4(col, alpha);
      oData  = vec4(0.5, 0.5, clamp(dist / 160.0, 0.0, 1.0), 0.0);
      oWire  = vec4(0.0, 0.0, sunWarm * alpha * 0.3, 0.0);
    }
  `;

  // --- PASS 3h: Spirit Embers, Kun Ink Wisps & Valley Fireflies ---
  const VS_PARTICLES = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aSeed;
    layout(location=1) in vec3 aMeta; // phase, size, kind

    uniform mat4 uView;
    uniform mat4 uProj;
    uniform vec3 uKunPos;
    uniform vec3 uKunFwd;
    uniform float uTime;
    uniform float uDPR;

    out float vKind;
    out float vGlow;

    void main() {
      float kind = aMeta.z;
      vec3 wp;
      if (kind < 1.5) {
        // Streaming gracefully behind & swirling around the flying Spirit Kun!
        float trailT = fract(aSeed.x + uTime * (kind < 0.5 ? 0.11 : 0.08));
        float spiral = trailT * 11.0 + aMeta.x;
        float rad = 1.6 + trailT * (kind < 0.5 ? 6.8 : 9.5) * (0.4 + 0.6 * aSeed.y);
        vec3 side = normalize(cross(uKunFwd, vec3(0.0, 1.0, 0.0)) + vec3(0.001));
        vec3 up = vec3(0.0, 1.0, 0.0);
        wp = uKunPos - uKunFwd * (trailT * 36.0 - 4.0)
             + side * (cos(spiral) * rad)
             + up * (sin(spiral) * rad * 0.55 + (aSeed.z - 0.5) * 3.5);
        vGlow = (1.0 - trailT) * smoothstep(0.0, 0.12, trailT);
      } else {
        // Gentle golden fireflies & floating valley petals around Bianhe river & bridge!
        float x = (aSeed.x * 2.0 - 1.0) * 34.0 + sin(uTime * 0.35 + aMeta.x) * 2.8;
        float y = 1.2 + aSeed.y * 14.0 + sin(uTime * 0.7 + aMeta.x * 2.0) * 0.8;
        float z = -42.0 + aSeed.z * 70.0 + cos(uTime * 0.28 + aMeta.x) * 2.5;
        wp = vec3(x, y, z);
        vGlow = 0.45 + 0.55 * sin(uTime * 2.6 + aMeta.x * 4.0);
      }

      vec4 vp = uView * vec4(wp, 1.0);
      gl_Position = uProj * vp;
      float dist = max(-vp.z, 2.0);
      gl_PointSize = clamp((aMeta.y * 28.0 / dist) * uDPR, 1.5, 22.0);
      vKind = kind;
    }
  `;

  const FS_PARTICLES = `#version 300 es
    precision highp float;
    in float vKind;
    in float vGlow;
    uniform float uNight;
    uniform float uMono;
    layout(location=0) out vec4 oColor;
    layout(location=1) out vec4 oData;
    layout(location=2) out vec4 oWire;

    void main() {
      vec2 c = gl_PointCoord - 0.5;
      float r2 = dot(c, c) * 4.0;
      if (r2 > 1.0) discard;
      float soft = pow(1.0 - r2, 2.0);

      vec3 col;
      float alpha;
      float em = 0.0;

      if (vKind < 0.5) {
        // Golden-Jade Spirit Embers trailing the Kun
        col = mix(vec3(1.0, 0.84, 0.45), vec3(0.55, 0.94, 0.92), step(0.55, vGlow));
        col = mix(col, vec3(0.84, 0.28, 0.20), uMono * 0.75);
        alpha = soft * vGlow * mix(0.65, 0.95, uNight);
        em = alpha * 0.9;
      } else if (vKind < 1.5) {
        // Ink-Wash Smoke Wisps curling behind the Kun!
        col = mix(vec3(0.14, 0.26, 0.36), vec3(0.20, 0.34, 0.48), uNight);
        col = mix(col, vec3(0.16, 0.17, 0.18), uMono);
        alpha = soft * vGlow * 0.28;
      } else {
        // Warm Golden Valley Fireflies / Sunlit Dust Motes
        col = mix(vec3(1.0, 0.88, 0.58), vec3(1.0, 0.72, 0.30), uNight);
        col = mix(col, vec3(0.82, 0.26, 0.18), uMono * 0.8);
        alpha = soft * vGlow * mix(0.35, 0.88, uNight);
        em = alpha * mix(0.3, 0.95, uNight);
      }

      oColor = vec4(col, alpha);
      oData  = vec4(0.5, 0.5, 0.5, 0.0);
      oWire  = vec4(0.0, 0.0, em, alpha);
    }
  `;

  // --- PASS 4a: Quarter-Res Volumetric Sun God-Rays + Emissive Bloom Extract ---
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
      vec4 w = texture(uWireTex, vUV);

      // 1. Emissive Bloom (Lanterns, Lit Pavilion Windows, Spirit Kun Golden Veins, Sun Core)
      float em = w.b;
      vec3 bloom = c * pow(em, 1.15) * mix(0.88, 1.42, uNight);

      // 2. Screen-Space Volumetric Crepuscular God-Rays streaming between the Karst Peaks & Bridge!
      vec3 rays = vec3(0.0);
      if (uSunVis > 0.01) {
        vec2 delta = (vUV - uSunUV) * (0.86 / 18.0);
        vec2 uv = vUV;
        float decay = 1.0;
        float acc = 0.0;
        for (int i = 0; i < 18; i++) {
          uv -= delta;
          if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) break;
          float skyOpen = 1.0 - smoothstep(0.15, 0.75, texture(uColorTex, uv).a);
          float sunProx = exp(-length((uv - uSunUV) * vec2(1.6, 1.0)) * 5.2);
          acc += skyOpen * sunProx * decay;
          decay *= 0.93;
        }
        vec3 rayCol = mix(vec3(1.0, 0.80, 0.46), vec3(0.48, 0.68, 0.96), uNight);
        rayCol = mix(rayCol, vec3(0.95, 0.90, 0.80), uMono);
        rays = rayCol * (acc / 18.0) * uSunVis * mix(0.92, 0.45, uNight) * (1.0 - uMono * 0.45);
      }

      oOut = vec4(bloom + rays, 1.0);
    }
  `;

  // --- PASS 4b/4c: Separable 9-Tap Gaussian Blur ---
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

  // --- PASS 5: Master Song-Painting Painterly Kuwahara + Song Silk + ACES + 3D Split Curtain ---
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
    uniform float uCurtain; // 1.0 = 100% Song Painting, 0.5 = 50% Split, 0.0 = 100% 3D Wireframe

    ${GLSL_COMMON}
    out vec4 fragColor;

    // Compact 4-Sector Painterly Kuwahara Brushwork Filter (Radius = 2 -> lush oil/ink brushwork!)
    vec3 kuwaharaFilter(vec2 uv, vec2 px) {
      vec3 m[4];
      vec3 s[4];
      for (int k = 0; k < 4; k++) { m[k] = vec3(0.0); s[k] = vec3(0.0); }

      // 4 overlapping 3x3 quadrants around pixel
      for (int y = -2; y <= 0; y++) {
        for (int x = -2; x <= 0; x++) {
          vec3 c = texture(uColorTex, uv + vec2(float(x), float(y)) * px).rgb;
          m[0] += c; s[0] += c * c;
        }
      }
      for (int y = -2; y <= 0; y++) {
        for (int x = 0; x <= 2; x++) {
          vec3 c = texture(uColorTex, uv + vec2(float(x), float(y)) * px).rgb;
          m[1] += c; s[1] += c * c;
        }
      }
      for (int y = 0; y <= 2; y++) {
        for (int x = -2; x <= 0; x++) {
          vec3 c = texture(uColorTex, uv + vec2(float(x), float(y)) * px).rgb;
          m[2] += c; s[2] += c * c;
        }
      }
      for (int y = 0; y <= 2; y++) {
        for (int x = 0; x <= 2; x++) {
          vec3 c = texture(uColorTex, uv + vec2(float(x), float(y)) * px).rgb;
          m[3] += c; s[3] += c * c;
        }
      }

      float minVar = 1e9;
      vec3 best = m[0] / 9.0;
      for (int k = 0; k < 4; k++) {
        vec3 mean = m[k] / 9.0;
        vec3 varV = abs(s[k] / 9.0 - mean * mean);
        float v = varV.r + varV.g + varV.b;
        if (v < minVar) {
          minVar = v;
          best = mean;
        }
      }
      return best;
    }

    // ACES Filmic Tone Mapping (prevents washed-out highlights & gives museum color richness!)
    vec3 acesFilm(vec3 x) {
      return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
    }

    void main() {
      vec2 px = 1.0 / uRes;
      vec4 rawC = texture(uColorTex, vUV);
      vec4 data = texture(uDataTex, vUV);
      vec4 wireD = texture(uWireTex, vUV);
      vec3 bloom = texture(uBloomTex, vUV).rgb;

      float linDepth = data.b;
      float edgeCtrl = data.a;

      // 1. Adaptive Painterly Kuwahara Brushwork (strong on karst mountains & foliage, gentle on crisp architecture/water!)
      float paintWeight = (rawC.a > 0.5)
        ? mix(0.18, 0.62, smoothstep(0.92, 0.25, edgeCtrl)) * smoothstep(0.05, 0.22, edgeCtrl)
        : 0.0;
      vec3 paintCol = (paintWeight > 0.01) ? mix(rawC.rgb, kuwaharaFilter(vUV, px * 1.15), paintWeight) : rawC.rgb;

      // 2. Ultra-Refined Calligraphic Dry-Brush Edge Accent (NEVER harsh 2002 black comic borders!)
      float inkEdge = 0.0;
      if (rawC.a > 0.5 && edgeCtrl > 0.30 && linDepth < 0.44) {
        vec4 dL = texture(uDataTex, vUV - vec2(px.x, 0.0));
        vec4 dR = texture(uDataTex, vUV + vec2(px.x, 0.0));
        vec4 dD = texture(uDataTex, vUV - vec2(0.0, px.y));
        vec4 dU = texture(uDataTex, vUV + vec2(0.0, px.y));
        float nDiff = length(dR.rg - dL.rg) + length(dU.rg - dD.rg);
        float zDiff = (abs(dR.b - dL.b) + abs(dU.b - dD.b)) * 16.0;
        float rawEdge = smoothstep(0.28, 0.78, nDiff * 0.95 + zDiff);
        // Modulate by organic dry-brush fiber (飛白) & distance fade!
        float dryBrush = 0.55 + 0.45 * vnoise(gl_FragCoord.xy * 0.28);
        float distFade = smoothstep(0.44, 0.14, linDepth);
        inkEdge = rawEdge * dryBrush * distFade * mix(0.22, 0.36, smoothstep(0.4, 0.9, edgeCtrl));
      }
      vec3 inkTint = mix(vec3(0.12, 0.17, 0.21), vec3(0.05, 0.08, 0.14), uNight);
      paintCol = mix(paintCol, inkTint, inkEdge);

      // 3. Add Cinema-Grade Lantern Bloom & Volumetric Golden Sun God-Rays!
      paintCol += bloom * mix(0.78, 1.08, uNight);

      // 4. Organic Antique Xuan-Paper Fiber Warmth (ZERO periodic screen-door sine grid!)
      float fiberCoarse = (fbm2(gl_FragCoord.xy * 0.045) - 0.5) * 0.032;
      float fiberFine = (vnoise(gl_FragCoord.xy * 0.32) - 0.5) * 0.016;
      paintCol += (fiberCoarse + fiberFine) * mix(1.0, 0.32, uNight);

      // Subtle museum parchment glow & gentle scroll-mounting edge vignette
      vec2 vc = vUV * 2.0 - 1.0;
      float vig = 1.0 - dot(vc * vec2(0.70, 0.82), vc * vec2(0.70, 0.82)) * 0.24;
      paintCol *= mix(vec3(1.01, 0.98, 0.93), vec3(0.88, 0.92, 0.98), uNight) * (0.34 + 0.66 * clamp(vig, 0.0, 1.0));

      // ACES Filmic Grading + vibrant Song mineral pigment polish (preserves jewel azurite & malachite!)
      paintCol = acesFilm(paintCol * mix(1.12, 1.18, uNight));
      float luma = dot(paintCol, vec3(0.299, 0.587, 0.114));
      float satBoost = mix(1.18, 1.06, uNight) * (1.0 - uMono * 0.22);
      paintCol = clamp(mix(vec3(luma), paintCol, satBoost), 0.0, 1.0);

      // 5. Right-Side 3D Technical Inspector (Sleek Dark Architectural Clay + Luminous Jade Wireframe)
      vec3 clayBase = (rawC.a > 0.5)
        ? mix(vec3(0.06, 0.10, 0.14), vec3(0.22, 0.32, 0.38), wireD.r) * (1.0 - linDepth * 0.55)
        : mix(vec3(0.04, 0.07, 0.11), vec3(0.08, 0.14, 0.20), vUV.y);
      vec3 wireCol = mix(vec3(0.22, 0.88, 0.84), vec3(1.0, 0.76, 0.36), wireD.b);
      vec3 techView = clayBase + wireCol * wireD.g * 0.85 + vec3(1.0, 0.68, 0.28) * wireD.b * 0.55;

      // Live Split Curtain Blend + Glowing Cinnabar-Gold Brush Seam!
      float sideMask = smoothstep(uCurtain - 0.0025, uCurtain + 0.0025, vUV.x);
      vec3 outCol = mix(paintCol, techView, sideMask);
      if (uCurtain > 0.005 && uCurtain < 0.995) {
        float seam = exp(-abs(vUV.x - uCurtain) * uRes.x * 0.45);
        outCol += vec3(0.96, 0.36, 0.22) * seam * 1.1;
      }

      fragColor = vec4(outCol, 1.0);
    }
  `;

  /* ==========================================================================
     4. WebGL2 Compilation & FBO Helpers
     ========================================================================== */
  function compileShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const err = gl.getShaderInfoLog(sh);
      console.error("Shader compile error:\n" + err);
      throw new Error(err);
    }
    return sh;
  }

  function createProgram(gl, vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(p));
    }
    return p;
  }

  function createTex2D(gl, w, h, internalFmt, fmt, type, filter) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFmt, w, h, 0, fmt, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  function buildVAO(gl, floatData, layout) {
    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, floatData, gl.STATIC_DRAW);
    const stride = layout.reduce((a, b) => a + b.size, 0) * 4;
    let offset = 0;
    layout.forEach((attr) => {
      gl.enableVertexAttribArray(attr.loc);
      gl.vertexAttribPointer(attr.loc, attr.size, gl.FLOAT, false, stride, offset);
      offset += attr.size * 4;
    });
    gl.bindVertexArray(null);
    return vao;
  }

  /* ==========================================================================
     5. Engine Creation & Interactive First-Person Simulation Loop
     ========================================================================== */
  function create(canvas, callbacks = {}) {
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL2 is required for Shan Hai Bianjing 3D.");

    // Build Procedural World
    const world = ShanHaiGeometry.buildWorld();

    // Compile All Shader Programs
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

    const getU = (p, names) => {
      const o = {};
      names.forEach((n) => { o[n] = gl.getUniformLocation(p, n); });
      return o;
    };

    const uSh   = getU(progShadow, ["uLightVP", "uModel", "uTime"]);
    const uSky  = getU(progSky, ["uInvVP", "uCamPos", "uSunDir", "uTime", "uNight", "uMono"]);
    const uSol  = getU(progSolid, ["uModel", "uView", "uProj", "uLightVP", "uShadowMap", "uCamPos", "uSunDir", "uTime", "uNight", "uMono", "uClipY"]);
    const uWat  = getU(progWater, ["uView", "uProj", "uRefVP", "uReflectTex", "uCamPos", "uSunDir", "uTime", "uNight", "uMono"]);
    const uFol  = getU(progFoliage, ["uView", "uProj", "uCamPos", "uSunDir", "uTime", "uNight", "uMono", "uClipY"]);
    const uKun  = getU(progKun, ["uModel", "uView", "uProj", "uCamPos", "uSunDir", "uTime", "uNight", "uMono", "uClipY"]);
    const uWf   = getU(progWaterfall, ["uView", "uProj", "uCamPos", "uSunDir", "uTime", "uNight", "uMono", "uClipY"]);
    const uCld  = getU(progCloud, ["uView", "uProj", "uCamPos", "uSunDir", "uTime", "uNight", "uMono", "uClipY"]);
    const uPrt  = getU(progParticles, ["uView", "uProj", "uKunPos", "uKunFwd", "uTime", "uDPR", "uNight", "uMono"]);
    const uRay  = getU(progBloomRays, ["uColorTex", "uWireTex", "uSunUV", "uSunVis", "uNight", "uMono"]);
    const uBlr  = getU(progBlur, ["uTex", "uStep"]);
    const uFin  = getU(progFinal, ["uColorTex", "uDataTex", "uWireTex", "uBloomTex", "uRes", "uTime", "uNight", "uMono", "uCurtain"]);

    // Upload VAOs
    const solidLayout = [
      { loc: 0, size: 3 }, { loc: 1, size: 3 }, { loc: 2, size: 3 }, { loc: 3, size: 3 }, { loc: 4, size: 4 }
    ];
    const vaoSolid     = buildVAO(gl, world.solid.data, solidLayout);
    const vaoKun       = buildVAO(gl, world.kun.data, solidLayout);
    const vaoSampan    = buildVAO(gl, world.sampan.data, solidLayout);
    const vaoCrane     = buildVAO(gl, world.crane.data, solidLayout);
    const vaoWaterfall = buildVAO(gl, world.waterfall.data, solidLayout);
    const vaoWater     = buildVAO(gl, world.water.data, [{ loc: 0, size: 3 }, { loc: 1, size: 3 }]);
    const vaoFoliage   = buildVAO(gl, world.foliage.data, [
      { loc: 0, size: 3 }, { loc: 1, size: 2 }, { loc: 2, size: 3 }, { loc: 3, size: 3 }, { loc: 4, size: 4 }
    ]);
    const vaoClouds    = buildVAO(gl, world.clouds.data, [
      { loc: 0, size: 3 }, { loc: 1, size: 2 }, { loc: 2, size: 2 }, { loc: 3, size: 3 }
    ]);
    const vaoParticles = buildVAO(gl, world.particles.data, [{ loc: 0, size: 3 }, { loc: 1, size: 3 }]);
    const vaoEmpty     = gl.createVertexArray();

    // Pass 1: 1024x1024 Sun Shadow FBO (static size)
    const SHADOW_RES = 1024;
    const fboShadow = gl.createFramebuffer();
    const texShadow = createTex2D(gl, SHADOW_RES, SHADOW_RES, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboShadow);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, texShadow, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);

    // Dynamic-resolution FBOs (Reflection, Main MRT, Bloom A/B)
    let curW = 0, curH = 0;
    let fboRef = null, texRef = null, rbRefDepth = null, refW = 0, refH = 0;
    let fboMain = null, texColor = null, texData = null, texWire = null, rbMainDepth = null;
    let fboBloomA = null, texBloomA = null, fboBloomB = null, texBloomB = null, blmW = 0, blmH = 0;

    function allocFBOs(w, h) {
      [fboRef, fboMain, fboBloomA, fboBloomB].forEach((f) => f && gl.deleteFramebuffer(f));
      [texRef, texColor, texData, texWire, texBloomA, texBloomB].forEach((t) => t && gl.deleteTexture(t));
      [rbRefDepth, rbMainDepth].forEach((r) => r && gl.deleteRenderbuffer(r));

      // Reflection FBO (0.5x)
      refW = Math.max(256, w >> 1);
      refH = Math.max(144, h >> 1);
      fboRef = gl.createFramebuffer();
      texRef = createTex2D(gl, refW, refH, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
      rbRefDepth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, rbRefDepth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, refW, refH);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboRef);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texRef, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rbRefDepth);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

      // Main MRT FBO (Full Res)
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

      // Bloom & God-Rays Ping-Pong FBOs (0.25x)
      blmW = Math.max(160, w >> 2);
      blmH = Math.max(90, h >> 2);
      fboBloomA = gl.createFramebuffer();
      texBloomA = createTex2D(gl, blmW, blmH, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboBloomA);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texBloomA, 0);

      fboBloomB = gl.createFramebuffer();
      texBloomB = createTex2D(gl, blmW, blmH, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboBloomB);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texBloomB, 0);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(320, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(200, Math.round(canvas.clientHeight * dpr));
      if (w !== curW || h !== curH) {
        curW = w; curH = h;
        canvas.width = w; canvas.height = h;
        allocFBOs(w, h);
      }
    }

    /* ========================================================================
       6. 100% Unobstructed First-Person Camera & State
       ======================================================================== */
    const spawnZ = 24.0;
    const spawnX = ShanHaiGeometry.riverCenterX(spawnZ) - 0.6;
    const SPAWN_POS = [spawnX, 4.9, spawnZ];
    // Yaw = 0 looks straight down -Z; aim slightly left toward bridge center at (-0.8, -18)
    const SPAWN_YAW = Math.atan2(-(ShanHaiGeometry.riverCenterX(-18.0) - spawnX), 42.0);
    const SPAWN_PITCH = 0.085;

    const state = {
      entered: false,
      mode: "free",         // "free" (Default First-Person!) | "cruise" (River Boat FPS) | "soar" (Cloud & Kun FPS)
      style: "bluegreen",   // "bluegreen" | "mono" | "night"
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
      lookOffsetYaw: 0.0,   // Free-look offset even during Guided Cruise / Soar!
      lookOffsetPitch: 0.0,
      cruiseT: 0.0,
      keys: {}
    };

    // Parse URL deep-link parameters for direct scenes & automated 8-angle inspection!
    const qp = new URLSearchParams(location.search);
    if (qp.get("enter") === "1") state.entered = true;
    if (qp.get("mode")) { state.mode = qp.get("mode"); state.entered = true; }
    if (qp.get("style")) {
      state.style = qp.get("style");
      state.nightVal = state.style === "night" ? 1 : 0;
      state.monoVal = state.style === "mono" ? 1 : 0;
    }
    if (qp.get("curtain") !== null) {
      state.curtain = state.targetCurtain = Math.max(0, Math.min(1, Number(qp.get("curtain"))));
    }
    if (qp.get("yaw") !== null) {
      const yDeg = Number(qp.get("yaw"));
      state.yaw = state.targetYaw = SPAWN_YAW + (yDeg * Math.PI) / 180;
    }
    if (qp.get("pitch") !== null) {
      const pDeg = Number(qp.get("pitch"));
      state.pitch = state.targetPitch = (pDeg * Math.PI) / 180;
    }
    if (qp.get("pos")) {
      const parts = qp.get("pos").split(",").map(Number);
      if (parts.length === 3 && parts.every(Number.isFinite)) state.pos = parts;
    }

    function notifyEnter() {
      if (!state.entered) {
        state.entered = true;
        if (callbacks.onEnter) callbacks.onEnter();
      }
    }

    // Pure First-Person Look on Pointer Drag (NEVER clips behind foreground buildings!)
    let dragging = false, lastX = 0, lastY = 0;
    canvas.addEventListener("pointerdown", (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      if (Math.hypot(dx, dy) > 1.5) notifyEnter();

      const sens = 0.0042;
      if (state.mode === "free") {
        state.targetYaw -= dx * sens;
        state.targetPitch = Math.max(-0.72, Math.min(1.05, state.targetPitch + dy * sens));
      } else {
        // Free-look around 360 even while gliding in Cruise or Cloud Soar!
        state.lookOffsetYaw -= dx * sens;
        state.lookOffsetPitch = Math.max(-0.62, Math.min(0.85, state.lookOffsetPitch + dy * sens));
      }
    });
    canvas.addEventListener("pointerup", () => { dragging = false; });
    canvas.addEventListener("pointercancel", () => { dragging = false; });

    // Smooth First-Person Forward/Backward Glide on Mouse Wheel!
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      notifyEnter();
      if (state.mode !== "free") {
        state.mode = "free";
        state.targetYaw = state.yaw;
        state.targetPitch = state.pitch;
        state.lookOffsetYaw = 0; state.lookOffsetPitch = 0;
        if (callbacks.onModeChange) callbacks.onModeChange("free");
      }
      const step = -Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY) * 0.045, 4.5);
      const fwd = [
        -Math.sin(state.yaw) * Math.cos(state.pitch),
        Math.sin(state.pitch),
        -Math.cos(state.yaw) * Math.cos(state.pitch)
      ];
      state.vel[0] += fwd[0] * step * 2.6;
      state.vel[1] += fwd[1] * step * 2.2;
      state.vel[2] += fwd[2] * step * 2.6;
    }, { passive: false });

    // Keyboard First-Person Flight (WASD + Arrow Keys + Space/Shift/Q/E)
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      state.keys[k] = true;
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "q", "e", " "].includes(k)) {
        notifyEnter();
        if (state.mode !== "free") {
          state.mode = "free";
          state.targetYaw = state.yaw;
          state.targetPitch = state.pitch;
          state.lookOffsetYaw = 0; state.lookOffsetPitch = 0;
          if (callbacks.onModeChange) callbacks.onModeChange("free");
        }
      }
    });
    window.addEventListener("keyup", (e) => { state.keys[e.key.toLowerCase()] = false; });

    // Safe First-Person Terrain, Water & Rainbow Bridge Collision Clamping
    function clampSafeFPSPos(p) {
      p[0] = Math.max(-72, Math.min(72, p[0]));
      p[2] = Math.max(-96, Math.min(54, p[2]));
      const terr = ShanHaiGeometry.terrainHeight(p[0], p[2]);
      let minY = Math.max(1.75, terr + 2.35);

      // Smoothly avoid clipping into the wooden deck of the Rainbow Bridge while allowing flying UNDER or OVER it!
      if (Math.abs(p[2] - ShanHaiGeometry.BRIDGE_Z) < 3.4) {
        const deckY = ShanHaiGeometry.bridgeArchY(p[0]);
        if (deckY > 0.0) {
          // If inside the solid timber slab [deckY - 1.5 .. deckY + 1.9], nudge cleanly below (if under arch) or above!
          if (p[1] > deckY - 1.45 && p[1] < deckY + 1.95) {
            if (p[1] < deckY - 0.1 && deckY > 4.2) p[1] = deckY - 1.45;
            else p[1] = deckY + 1.95;
          }
        }
      }
      p[1] = Math.max(minY, Math.min(48.0, p[1]));
    }

    /* ========================================================================
       7. Dynamic Scene Entities (Kun, 3 Sampans, 7 Ink Cranes)
       ======================================================================== */
    let elapsed = qp.get("t") !== null ? Number(qp.get("t")) : 3.2;
    let prevTs = performance.now();
    let frameCount = 0, fpsTs = prevTs;
    const identity = mat4Identity();

    const SUN_DIR = (() => {
      const v = [0.16, 0.255, -0.953];
      const l = Math.hypot(v[0], v[1], v[2]);
      return [v[0] / l, v[1] / l, v[2] / l];
    })();

    // Static Sun Shadow View-Projection covering the central Song Gorge & Architecture
    const lightView = mat4LookAt([SUN_DIR[0] * 75, SUN_DIR[1] * 75, -24 + SUN_DIR[2] * 75], [0, 4, -24], [0, 1, 0]);
    const lightProj = mat4Ortho(-56, 56, -42, 46, 8, 165);
    const lightVP = mat4Mul(lightProj, lightView);

    const sampans = [
      { z: -5.5,  speed: -1.75, off: -2.0 },
      { z: -26.0, speed:  1.45, off:  2.8 },
      { z: -48.0, speed: -1.25, off: -1.5 }
    ];
    const cranes = Array.from({ length: 7 }, (_, i) => ({
      r: 15 + (i % 3) * 8.5,
      h: 13.5 + (i % 4) * 3.8,
      sp: 0.22 + (i % 3) * 0.04,
      ph: i * 0.92,
      cz: -22 - (i % 3) * 16
    }));

    function computeKunState(t) {
      // Majestic grand arc soaring between the twin karst peaks over the sea of clouds!
      const ang = t * 0.088 + 0.52;
      const x = Math.sin(ang) * 33.0;
      const z = -54.0 + Math.cos(ang) * 18.0;
      const y = 23.5 + Math.sin(ang * 2.0) * 3.0;
      const na = ang + 0.03;
      const nx = Math.sin(na) * 33.0, nz = -54.0 + Math.cos(na) * 18.0, ny = 23.5 + Math.sin(na * 2.0) * 3.0;
      const dx = nx - x, dy = ny - y, dz = nz - z;
      const dl = Math.hypot(dx, dy, dz) || 1;
      const yaw = Math.atan2(dx, dz);
      const pitch = -Math.atan2(dy, Math.hypot(dx, dz));
      const roll = -Math.cos(ang) * 0.22;
      return {
        pos: [x, y, z],
        fwd: [dx / dl, dy / dl, dz / dl],
        mat: mat4ModelTRS(x, y, z, pitch, yaw, roll, 0.72, 0.72, 0.72)
      };
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
      let det = m[0]*inv[0] + m[1]*inv[4] + m[2]*inv[8] + m[3]*inv[12];
      det = 1.0 / (det || 1.0);
      for (let i = 0; i < 16; i++) inv[i] *= det;
      return inv;
    }

    function drawSceneContent(view, proj, camPos, kun, clipY, isRefPass) {
      const vp = mat4Mul(proj, view);
      const invVP = invertMat4(vp);

      // 1. Song Silk Sky Dome
      gl.depthMask(false);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.useProgram(progSky);
      gl.uniformMatrix4fv(uSky.uInvVP, false, invVP);
      gl.uniform3fv(uSky.uCamPos, camPos);
      gl.uniform3fv(uSky.uSunDir, SUN_DIR);
      gl.uniform1f(uSky.uTime, elapsed);
      gl.uniform1f(uSky.uNight, state.nightVal);
      gl.uniform1f(uSky.uMono, state.monoVal);
      gl.bindVertexArray(vaoEmpty);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // 2. Opaque Terrain + Hero Song Architecture + Rainbow Bridge + Sampans + Cranes
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.useProgram(progSolid);
      gl.uniformMatrix4fv(uSol.uView, false, view);
      gl.uniformMatrix4fv(uSol.uProj, false, proj);
      gl.uniformMatrix4fv(uSol.uLightVP, false, lightVP);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texShadow);
      gl.uniform1i(uSol.uShadowMap, 0);
      gl.uniform3fv(uSol.uCamPos, camPos);
      gl.uniform3fv(uSol.uSunDir, SUN_DIR);
      gl.uniform1f(uSol.uTime, elapsed);
      gl.uniform1f(uSol.uNight, state.nightVal);
      gl.uniform1f(uSol.uMono, state.monoVal);
      gl.uniform1f(uSol.uClipY, clipY);

      gl.uniformMatrix4fv(uSol.uModel, false, identity);
      gl.bindVertexArray(vaoSolid);
      gl.drawArrays(gl.TRIANGLES, 0, world.solid.count);

      // Sampans gliding gently along river
      sampans.forEach((bt) => {
        const bx = ShanHaiGeometry.riverCenterX(bt.z) + bt.off;
        const nz = bt.z + Math.sign(bt.speed) * 2.0;
        const nx = ShanHaiGeometry.riverCenterX(nz) + bt.off;
        const byaw = Math.atan2(nx - bx, nz - bt.z);
        const bob = Math.sin(elapsed * 2.1 + bt.off) * 0.035;
        gl.uniformMatrix4fv(uSol.uModel, false, mat4ModelTRS(bx, 0.02 + bob, bt.z, bob, byaw, bob * 0.7, 0.96, 0.96, 0.96));
        gl.bindVertexArray(vaoSampan);
        gl.drawArrays(gl.TRIANGLES, 0, world.sampan.count);
      });

      // Soaring Ink Cranes
      cranes.forEach((cr) => {
        const a = elapsed * cr.sp + cr.ph;
        const cx = Math.sin(a) * cr.r;
        const cz = cr.cz + Math.cos(a) * cr.r * 0.72;
        const cy = cr.h + Math.sin(a * 2.0) * 1.4;
        const cyaw = Math.atan2(Math.cos(a) * cr.r, -Math.sin(a) * cr.r * 0.72);
        gl.uniformMatrix4fv(uSol.uModel, false, mat4ModelTRS(cx, cy, cz, 0, cyaw, -0.15, 0.76, 0.76, 0.76));
        gl.bindVertexArray(vaoCrane);
        gl.drawArrays(gl.TRIANGLES, 0, world.crane.count);
      });

      // 3. Calligraphic Ink-Wash Foliage (松針 / 柳絲 / 丹楓 / 蘆葦)
      gl.useProgram(progFoliage);
      gl.uniformMatrix4fv(uFol.uView, false, view);
      gl.uniformMatrix4fv(uFol.uProj, false, proj);
      gl.uniform3fv(uFol.uCamPos, camPos);
      gl.uniform3fv(uFol.uSunDir, SUN_DIR);
      gl.uniform1f(uFol.uTime, elapsed);
      gl.uniform1f(uFol.uNight, state.nightVal);
      gl.uniform1f(uFol.uMono, state.monoVal);
      gl.uniform1f(uFol.uClipY, clipY);
      gl.bindVertexArray(vaoFoliage);
      gl.drawArrays(gl.TRIANGLES, 0, world.foliage.count);

      // 4. Planar-Reflected Mirror Water (Main pass ONLY!)
      if (!isRefPass) {
        gl.useProgram(progWater);
        gl.uniformMatrix4fv(uWat.uView, false, view);
        gl.uniformMatrix4fv(uWat.uProj, false, proj);
        gl.uniformMatrix4fv(uWat.uRefVP, false, refVPGlobal);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texRef);
        gl.uniform1i(uWat.uReflectTex, 0);
        gl.uniform3fv(uWat.uCamPos, camPos);
        gl.uniform3fv(uWat.uSunDir, SUN_DIR);
        gl.uniform1f(uWat.uTime, elapsed);
        gl.uniform1f(uWat.uNight, state.nightVal);
        gl.uniform1f(uWat.uMono, state.monoVal);
        gl.bindVertexArray(vaoWater);
        gl.drawArrays(gl.TRIANGLES, 0, world.water.count);
      }

      // 5. Translucent Ethereal Layer: Silk Waterfalls + Spirit Kun + Sea of Clouds + Spirit Particles
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);

      // Silky Cliff Waterfalls
      gl.useProgram(progWaterfall);
      gl.uniformMatrix4fv(uWf.uView, false, view);
      gl.uniformMatrix4fv(uWf.uProj, false, proj);
      gl.uniform3fv(uWf.uCamPos, camPos);
      gl.uniform3fv(uWf.uSunDir, SUN_DIR);
      gl.uniform1f(uWf.uTime, elapsed);
      gl.uniform1f(uWf.uNight, state.nightVal);
      gl.uniform1f(uWf.uMono, state.monoVal);
      gl.uniform1f(uWf.uClipY, clipY);
      gl.bindVertexArray(vaoWaterfall);
      gl.drawArrays(gl.TRIANGLES, 0, world.waterfall.count);

      // Volumetric Drifting Cloud Sea
      gl.useProgram(progCloud);
      gl.uniformMatrix4fv(uCld.uView, false, view);
      gl.uniformMatrix4fv(uCld.uProj, false, proj);
      gl.uniform3fv(uCld.uCamPos, camPos);
      gl.uniform3fv(uCld.uSunDir, SUN_DIR);
      gl.uniform1f(uCld.uTime, elapsed);
      gl.uniform1f(uCld.uNight, state.nightVal);
      gl.uniform1f(uCld.uMono, state.monoVal);
      gl.uniform1f(uCld.uClipY, clipY);
      gl.bindVertexArray(vaoClouds);
      gl.drawArrays(gl.TRIANGLES, 0, world.clouds.count);

      // 《山海經》Ethereal Spirit Kun (translucent silk-ink blend so overlapping wings never self-cutout!)
      gl.depthMask(false);
      gl.useProgram(progKun);
      gl.uniformMatrix4fv(uKun.uModel, false, kun.mat);
      gl.uniformMatrix4fv(uKun.uView, false, view);
      gl.uniformMatrix4fv(uKun.uProj, false, proj);
      gl.uniform3fv(uKun.uCamPos, camPos);
      gl.uniform3fv(uKun.uSunDir, SUN_DIR);
      gl.uniform1f(uKun.uTime, elapsed);
      gl.uniform1f(uKun.uNight, state.nightVal);
      gl.uniform1f(uKun.uMono, state.monoVal);
      gl.uniform1f(uKun.uClipY, clipY);
      gl.bindVertexArray(vaoKun);
      gl.drawArrays(gl.TRIANGLES, 0, world.kun.count);
      gl.depthMask(false);

      // 1,050 Spirit Embers, Ink Wisps & Valley Fireflies (skip in half-res reflection for clarity/speed)
      if (!isRefPass) {
        gl.useProgram(progParticles);
        gl.uniformMatrix4fv(uPrt.uView, false, view);
        gl.uniformMatrix4fv(uPrt.uProj, false, proj);
        gl.uniform3fv(uPrt.uKunPos, kun.pos);
        gl.uniform3fv(uPrt.uKunFwd, kun.fwd);
        gl.uniform1f(uPrt.uTime, elapsed);
        gl.uniform1f(uPrt.uDPR, Math.min(window.devicePixelRatio || 1, 1.5));
        gl.uniform1f(uPrt.uNight, state.nightVal);
        gl.uniform1f(uPrt.uMono, state.monoVal);
        gl.bindVertexArray(vaoParticles);
        gl.drawArrays(gl.POINTS, 0, world.particles.count);
      }

      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }

    let refVPGlobal = identity;
    let shadowBaked = false;

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

      // Smooth Mood & Curtain Interpolation
      state.nightVal += ((state.style === "night" ? 1 : 0) - state.nightVal) * Math.min(1, dt * 3.5);
      state.monoVal  += ((state.style === "mono"  ? 1 : 0) - state.monoVal)  * Math.min(1, dt * 3.5);
      state.curtain  += (state.targetCurtain - state.curtain) * Math.min(1, dt * 7.5);

      // Advance river sampans
      sampans.forEach((bt) => {
        bt.z += bt.speed * dt;
        if (bt.z < -62) bt.z = 38;
        if (bt.z > 40) bt.z = -60;
      });

      const kun = computeKunState(elapsed);

      // ---- Update First-Person Camera ----
      let camPos, camYaw, camPitch;
      let fovy = 48 * Math.PI / 180;

      if (state.mode === "cruise") {
        // First-Person Riverboat Journey gliding smoothly right under the Rainbow Bridge into Shan-Hai Lake!
        state.cruiseT += dt;
        const loopZ = 20.0 - ((state.cruiseT * 3.2 + (qp.get("t") ? Number(qp.get("t")) * 2.5 : 8.5)) % 76.0);
        const cx = ShanHaiGeometry.riverCenterX(loopZ) - 0.5;
        const aheadZ = loopZ - 14.0;
        const aheadX = ShanHaiGeometry.riverCenterX(aheadZ);
        const baseYaw = Math.atan2(-(aheadX - cx), 14.0);
        const basePitch = 0.08 + Math.sin(elapsed * 0.45) * 0.03;
        camPos = [cx, 2.45 + Math.sin(elapsed * 1.9) * 0.08, loopZ];
        camYaw = baseYaw + state.lookOffsetYaw;
        camPitch = Math.max(-0.55, Math.min(0.95, basePitch + state.lookOffsetPitch));
        state.pos = camPos.slice();
        state.yaw = camYaw; state.pitch = camPitch;
        fovy = 52 * Math.PI / 180;
      } else if (state.mode === "soar") {
        // First-Person Cloud-Sea & Kun Aerial Wingman Flight (with 360 free-look!)
        const backX = -kun.fwd[0] * 26.0 - kun.fwd[2] * 12.0;
        const backZ = -kun.fwd[2] * 26.0 + kun.fwd[0] * 12.0;
        camPos = [kun.pos[0] + backX, Math.max(12.5, kun.pos[1] + 2.8), kun.pos[2] + backZ];
        const dx = kun.pos[0] - camPos[0], dy = kun.pos[1] - 1.2 - camPos[1], dz = kun.pos[2] - camPos[2];
        const baseYaw = Math.atan2(-dx, -dz);
        const basePitch = Math.atan2(dy, Math.hypot(dx, dz));
        camYaw = baseYaw + state.lookOffsetYaw;
        camPitch = Math.max(-0.62, Math.min(0.92, basePitch + state.lookOffsetPitch));
        state.pos = camPos.slice();
        state.yaw = camYaw; state.pitch = camPitch;
        fovy = 50 * Math.PI / 180;
      } else {
        // Default: Pure First-Person Free-Look & Smooth Inertia Flight!
        const smooth = Math.min(1, dt * 10.0);
        state.yaw += (state.targetYaw - state.yaw) * smooth;
        state.pitch += (state.targetPitch - state.pitch) * smooth;

        const fwd = [-Math.sin(state.yaw) * Math.cos(state.pitch), Math.sin(state.pitch), -Math.cos(state.yaw) * Math.cos(state.pitch)];
        const right = [Math.cos(state.yaw), 0, -Math.sin(state.yaw)];
        const accel = 42.0 * dt;

        if (state.keys["w"] || state.keys["arrowup"])    { state.vel[0] += fwd[0]*accel; state.vel[1] += fwd[1]*accel; state.vel[2] += fwd[2]*accel; }
        if (state.keys["s"] || state.keys["arrowdown"])  { state.vel[0] -= fwd[0]*accel; state.vel[1] -= fwd[1]*accel; state.vel[2] -= fwd[2]*accel; }
        if (state.keys["d"] || state.keys["arrowright"]) { state.vel[0] += right[0]*accel; state.vel[2] += right[2]*accel; }
        if (state.keys["a"] || state.keys["arrowleft"])  { state.vel[0] -= right[0]*accel; state.vel[2] -= right[2]*accel; }
        if (state.keys[" "] || state.keys["e"])          { state.vel[1] += accel * 0.75; }
        if (state.keys["shift"] || state.keys["q"])      { state.vel[1] -= accel * 0.75; }

        const damp = Math.exp(-4.6 * dt);
        for (let i = 0; i < 3; i++) {
          state.pos[i] += state.vel[i] * dt;
          state.vel[i] *= damp;
        }
        clampSafeFPSPos(state.pos);

        // Gentle poetic breathing sway ONLY before user enters the scroll
        const breatheYaw = state.entered ? 0 : Math.sin(elapsed * 0.22) * 0.025;
        const breatheY   = state.entered ? 0 : Math.sin(elapsed * 0.45) * 0.14;
        camPos = [state.pos[0], state.pos[1] + breatheY, state.pos[2]];
        camYaw = state.yaw + breatheYaw;
        camPitch = state.pitch;
        fovy = (state.entered ? 50 : 45) * Math.PI / 180;
      }

      const lookDir = [
        -Math.sin(camYaw) * Math.cos(camPitch),
        Math.sin(camPitch),
        -Math.cos(camYaw) * Math.cos(camPitch)
      ];
      const target = [camPos[0] + lookDir[0] * 18.0, camPos[1] + lookDir[1] * 18.0, camPos[2] + lookDir[2] * 18.0];

      const aspect = curW / curH;
      const proj = mat4Perspective(fovy, aspect, 0.45, 240.0);
      const view = mat4LookAt(camPos, target, [0, 1, 0]);

      /* ==================== PASS 1: 1024px Sun Directional Shadow Map ==================== */
      if (!shadowBaked) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fboShadow);
        gl.viewport(0, 0, SHADOW_RES, SHADOW_RES);
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.useProgram(progShadow);
        gl.uniformMatrix4fv(uSh.uLightVP, false, lightVP);
        gl.uniformMatrix4fv(uSh.uModel, false, identity);
        gl.uniform1f(uSh.uTime, elapsed);
        gl.bindVertexArray(vaoSolid);
        gl.drawArrays(gl.TRIANGLES, 0, world.solid.count);
        shadowBaked = true; // Static sun & architecture shadows baked cleanly on first frame!
      }

      /* ==================== PASS 2: True Planar Mirror Water Reflection ==================== */
      const refEye = [camPos[0], -camPos[1], camPos[2]];
      const refTarget = [target[0], -target[1], target[2]];
      const refView = mat4LookAt(refEye, refTarget, [0, 1, 0]);
      refVPGlobal = mat4Mul(proj, refView);

      gl.bindFramebuffer(gl.FRAMEBUFFER, fboRef);
      gl.viewport(0, 0, refW, refH);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      drawSceneContent(refView, proj, refEye, kun, 1.0, true);

      /* ==================== PASS 3: Full-Res MRT Main Scene ==================== */
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboMain);
      gl.viewport(0, 0, curW, curH);
      gl.clearBufferfv(gl.COLOR, 0, new Float32Array([0, 0, 0, 0]));
      gl.clearBufferfv(gl.COLOR, 1, new Float32Array([0.5, 0.5, 1.0, 0.0]));
      gl.clearBufferfv(gl.COLOR, 2, new Float32Array([0, 0, 0, 0]));
      gl.clearBufferfi(gl.DEPTH_STENCIL, 0, 1.0, 0);
      drawSceneContent(view, proj, camPos, kun, 0.0, false);

      /* ==================== PASS 4: Volumetric Sun God-Rays + Bloom Blur ==================== */
      const mainVP = mat4Mul(proj, view);
      const sunFar = [camPos[0] + SUN_DIR[0] * 180, camPos[1] + SUN_DIR[1] * 180, camPos[2] + SUN_DIR[2] * 180];
      const sunProj = projectPoint(mainVP, sunFar[0], sunFar[1], sunFar[2]);
      const sunDot = Math.max(0, lookDir[0] * SUN_DIR[0] + lookDir[1] * SUN_DIR[1] + lookDir[2] * SUN_DIR[2]);
      const sunVis = sunProj.inFront ? Math.pow(sunDot, 2.2) : 0.0;

      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.bindVertexArray(vaoEmpty);

      // 4a: Extract Bloom & March Sun God-Rays -> fboBloomA
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboBloomA);
      gl.viewport(0, 0, blmW, blmH);
      gl.useProgram(progBloomRays);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texColor); gl.uniform1i(uRay.uColorTex, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texWire);  gl.uniform1i(uRay.uWireTex, 1);
      gl.uniform2f(uRay.uSunUV, sunProj.u, sunProj.v);
      gl.uniform1f(uRay.uSunVis, sunVis);
      gl.uniform1f(uRay.uNight, state.nightVal);
      gl.uniform1f(uRay.uMono, state.monoVal);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // 4b: Horizontal Blur -> fboBloomB
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboBloomB);
      gl.useProgram(progBlur);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texBloomA); gl.uniform1i(uBlr.uTex, 0);
      gl.uniform2f(uBlr.uStep, 1.35 / blmW, 0.0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // 4c: Vertical Blur -> fboBloomA
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboBloomA);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texBloomB); gl.uniform1i(uBlr.uTex, 0);
      gl.uniform2f(uBlr.uStep, 0.0, 1.35 / blmH);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      /* ==================== PASS 5: Master Song-Painting Painterly Composite ==================== */
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, curW, curH);
      gl.useProgram(progFinal);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texColor);  gl.uniform1i(uFin.uColorTex, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texData);   gl.uniform1i(uFin.uDataTex, 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, texWire);   gl.uniform1i(uFin.uWireTex, 2);
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, texBloomA); gl.uniform1i(uFin.uBloomTex, 3);
      gl.uniform2f(uFin.uRes, curW, curH);
      gl.uniform1f(uFin.uTime, elapsed);
      gl.uniform1f(uFin.uNight, state.nightVal);
      gl.uniform1f(uFin.uMono, state.monoVal);
      gl.uniform1f(uFin.uCurtain, state.curtain);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    resize();
    requestAnimationFrame(frame);

    return {
      state,
      enterScroll() {
        notifyEnter();
        // Smooth gentle forward glide into the scroll!
        state.vel[2] -= 10.5;
      },
      resetView() {
        state.mode = "free";
        state.pos = SPAWN_POS.slice();
        state.vel = [0, 0, 0];
        state.yaw = state.targetYaw = SPAWN_YAW;
        state.pitch = state.targetPitch = SPAWN_PITCH;
        state.lookOffsetYaw = 0;
        state.lookOffsetPitch = 0;
      },
      setMode(m) {
        notifyEnter();
        state.mode = m;
        state.lookOffsetYaw = 0;
        state.lookOffsetPitch = 0;
        if (m === "free") {
          state.targetYaw = state.yaw;
          state.targetPitch = state.pitch;
        }
      },
      setStyle(s) { state.style = s; },
      setCurtain(v) { state.targetCurtain = Math.max(0, Math.min(1, v)); },
      getStats() { return { tris: world.stats.totalTris }; }
    };
  }

  return { create };
})();
