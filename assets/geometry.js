/**
 * 《山海汴京圖》v4 — Vast 4-Realm Open Song-Scroll World & 7 Living Shan Hai Jing Creatures
 * 380m x 400m Explorable Fine-Art Splash-Ink World (ZERO muddy dirt terrain!):
 *   Realm 1 (Center):  汴水虹橋 — Arched Moon-Bridge, Cliff Pavilion, Lone Boatman & 28 Leaping Koi/Wenyao
 *   Realm 2 (Mid-N):   蓬萊雲海 — Twin Karst Spires, 5 Waterfalls, Sky-Bridge, Cloud Pagoda & Twin Spirit Kuns
 *   Realm 3 (Deep-N):  不周天門 — 75m Monumental Stone Arch Gate, 7-Tier Imperial Pagoda & 80m Winged Yinglong Dragon
 *   Realm 4 (West/E):  青丘丹楓嶼 (Nine-Tailed Spirit Foxes, Crimson Paifang, White Spirit Stags)
 *                      & 丹山朝陽峰 (3 Vermilion Phoenixes & Sun Pavilion)
 *
 * 100% Zero-Dependency Procedural WebGL2 — Autonomously built by Gemini 4 Neon
 */
const ShanHaiGeometry = (() => {
  "use strict";

  /* ==========================================================================
     1. Deterministic Noise, Ridged Karst Math & Grand 4-Realm World Layout
     ========================================================================== */
  function hash2(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return s - Math.floor(s);
  }
  function smoothstep(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }
  function mix(a, b, t) { return a + (b - a) * t; }

  function noise2(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return mix(
      mix(hash2(ix, iy), hash2(ix + 1, iy), ux),
      mix(hash2(ix, iy + 1), hash2(ix + 1, iy + 1), ux),
      uy
    );
  }

  function fbm(x, y, oct = 4) {
    let v = 0, a = 0.5, f = 1.0;
    for (let i = 0; i < oct; i++) {
      v += a * noise2(x * f, y * f);
      f *= 2.05; a *= 0.5;
    }
    return v;
  }

  function ridged(x, y, oct = 4) {
    let v = 0, a = 0.55, f = 1.0, w = 1.0;
    for (let i = 0; i < oct; i++) {
      let n = 1.0 - Math.abs(noise2(x * f, y * f) * 2.0 - 1.0);
      n = n * n * w;
      w = Math.max(0.18, Math.min(1.0, n * 1.65));
      v += n * a;
      f *= 2.15; a *= 0.48;
    }
    return v;
  }

  const BRIDGE_Z = -19.0;

  function riverCenterX(z) {
    return Math.sin((z + 19.0) * 0.020) * 4.2;
  }

  /**
   * Grand 4-Realm Karst Archipelago (46 Multi-Shouldered Song Peaks across 400m x 440m!)
   */
  const KARST_PEAKS = [
    // --- REALM 1: 汴水虹橋 (Preserves exact iconic opening Song scroll composition!) ---
    { x: -16.8, z: -18.5, h:  8.6, rx:  7.8, rz:  7.4, rot:  0.35, sharp: 1.42, flatTop: 4.9 }, // Left bridge crag + pavilion
    { x:  16.8, z: -19.2, h:  7.2, rx:  7.6, rz:  6.8, rot: -0.28, sharp: 1.48, flatTop: 0.0 }, // Right bridge crag
    { x:  22.5, z: -22.0, h: 10.5, rx:  6.2, rz:  7.5, rot:  0.42, sharp: 1.55, flatTop: 0.0 },

    // --- REALM 2: 蓬萊雲海 (Midground Flanking Spires & Twin Celestial Gorge!) ---
    { x: -38.0, z: -34.0, h: 35.0, rx: 18.0, rz: 12.0, rot:  0.52, sharp: 1.58, flatTop: 0.0 },
    { x: -50.0, z: -26.0, h: 24.5, rx: 13.5, rz: 11.5, rot: -0.35, sharp: 1.50, flatTop: 0.0 },
    { x: -62.0, z: -14.0, h: 27.0, rx: 17.5, rz: 12.5, rot:  0.25, sharp: 1.48, flatTop: 0.0 },
    { x:  40.0, z: -38.0, h: 38.5, rx: 17.5, rz: 12.5, rot: -0.48, sharp: 1.62, flatTop: 0.0 }, // Right Waterfall Peak
    { x:  54.0, z: -30.0, h: 28.0, rx: 14.5, rz: 12.0, rot:  0.32, sharp: 1.52, flatTop: 0.0 },
    { x:  62.0, z: -15.0, h: 26.5, rx: 17.0, rz: 13.0, rot: -0.22, sharp: 1.48, flatTop: 0.0 },
    // Twin Axial Gorge Spires
    { x: -32.0, z: -74.0, h: 58.0, rx: 24.0, rz: 15.0, rot:  0.42, sharp: 1.62, flatTop: 0.0 },
    { x: -20.0, z: -78.0, h: 35.0, rx: 13.5, rz: 12.0, rot: -0.30, sharp: 1.55, flatTop: 0.0 },
    { x:  35.0, z: -80.0, h: 64.0, rx: 25.0, rz: 16.0, rot: -0.38, sharp: 1.65, flatTop: 0.0 },
    { x:  22.0, z: -84.0, h: 36.0, rx: 14.5, rz: 12.0, rot:  0.35, sharp: 1.58, flatTop: 0.0 },
    // Mid-North Sky-Bridge Twin Pillars (z = -118)
    { x: -24.0, z: -118.0, h: 42.0, rx: 15.0, rz: 13.0, rot:  0.25, sharp: 1.62, flatTop: 0.0 },
    { x:  24.0, z: -120.0, h: 45.0, rx: 15.5, rz: 13.0, rot: -0.28, sharp: 1.64, flatTop: 0.0 },

    // --- REALM 3: 不周天門 & 應龍聖境 (Deep North z = -165..-275!) ---
    { x: -56.0, z: -178.0, h: 74.0, rx: 28.0, rz: 20.0, rot:  0.30, sharp: 1.52, flatTop: 0.0 }, // Left Gate Bastion Peak
    { x:  56.0, z: -180.0, h: 78.0, rx: 29.0, rz: 20.0, rot: -0.32, sharp: 1.52, flatTop: 0.0 }, // Right Gate Bastion Peak
    { x: -96.0, z: -205.0, h: 66.0, rx: 32.0, rz: 22.0, rot:  0.42, sharp: 1.45, flatTop: 0.0 },
    { x:  98.0, z: -208.0, h: 68.0, rx: 32.0, rz: 22.0, rot: -0.40, sharp: 1.45, flatTop: 0.0 },
    { x:   0.0, z: -242.0, h: 38.0, rx: 22.0, rz: 18.0, rot:  0.10, sharp: 1.42, flatTop: 22.0 }, // Imperial 7-Tier Pagoda Island!
    { x: -54.0, z: -265.0, h: 82.0, rx: 36.0, rz: 24.0, rot:  0.22, sharp: 1.38, flatTop: 0.0 },
    { x:  58.0, z: -268.0, h: 85.0, rx: 36.0, rz: 24.0, rot: -0.24, sharp: 1.38, flatTop: 0.0 },
    { x:   2.0, z: -292.0, h: 48.0, rx: 40.0, rz: 22.0, rot:  0.08, sharp: 1.25, flatTop: 0.0 }, // Far Northern Horizon Veil

    // --- REALM 4A: 西境・青丘丹楓嶼 (Nine-Tailed Fox & Spirit Stag Archipelago, x = -85..-175!) ---
    { x: -98.0,  z: -84.0, h: 14.5, rx: 14.0, rz: 13.0, rot:  0.28, sharp: 1.42, flatTop: 8.5 }, // Fox Sanctuary Main Crag!
    { x: -124.0, z: -108.0, h: 46.0, rx: 22.0, rz: 16.0, rot:  0.48, sharp: 1.56, flatTop: 0.0 },
    { x: -82.0,  z: -116.0, h: 38.0, rx: 18.0, rz: 15.0, rot: -0.35, sharp: 1.58, flatTop: 0.0 },
    { x: -146.0, z: -72.0, h: 42.0, rx: 21.0, rz: 17.0, rot:  0.25, sharp: 1.50, flatTop: 0.0 },
    { x: -116.0, z: -52.0, h: 11.0, rx: 11.5, rz: 10.5, rot: -0.22, sharp: 1.44, flatTop: 6.2 }, // Second Fox & Stag Crag!
    { x: -165.0, z: -145.0, h: 58.0, rx: 28.0, rz: 20.0, rot:  0.35, sharp: 1.44, flatTop: 0.0 },
    { x: -135.0, z: -160.0, h: 52.0, rx: 24.0, rz: 18.0, rot: -0.28, sharp: 1.48, flatTop: 0.0 },
    { x: -120.0, z:  -6.0, h: 34.0, rx: 20.0, rz: 16.0, rot:  0.40, sharp: 1.48, flatTop: 0.0 },

    // --- REALM 4B: 東境・丹山朝陽峰 (Vermilion Phoenixes & Eastern Sun Pavilion, x = +85..+175!) ---
    { x:  102.0, z: -92.0, h: 28.0, rx: 16.0, rz: 14.0, rot: -0.32, sharp: 1.46, flatTop: 16.0 }, // Eastern Sun Pavilion Peak!
    { x:  132.0, z: -116.0, h: 56.0, rx: 24.0, rz: 18.0, rot: -0.45, sharp: 1.58, flatTop: 0.0 }, // Phoenix Roost Spire!
    { x:   86.0, z: -124.0, h: 44.0, rx: 19.0, rz: 15.0, rot:  0.32, sharp: 1.56, flatTop: 0.0 },
    { x:  148.0, z: -76.0, h: 48.0, rx: 22.0, rz: 17.0, rot: -0.24, sharp: 1.50, flatTop: 0.0 },
    { x:  116.0, z: -48.0, h: 12.5, rx: 12.0, rz: 11.0, rot:  0.22, sharp: 1.45, flatTop: 6.5 }, // Eastern Stag Rock!
    { x:  168.0, z: -152.0, h: 62.0, rx: 28.0, rz: 20.0, rot: -0.36, sharp: 1.44, flatTop: 0.0 },
    { x:  136.0, z: -168.0, h: 54.0, rx: 25.0, rz: 19.0, rot:  0.30, sharp: 1.48, flatTop: 0.0 },
    { x:  124.0, z:  -4.0, h: 36.0, rx: 21.0, rz: 16.0, rot: -0.38, sharp: 1.48, flatTop: 0.0 },

    // --- SOUTHERN MISTY ARCHIPELAGO (Behind Spawn for 360° & 180° exploration!) ---
    { x: -42.0, z:  24.0, h: 24.5, rx: 18.0, rz: 13.0, rot: -0.45, sharp: 1.52, flatTop: 0.0 },
    { x:  44.0, z:  22.0, h: 26.5, rx: 18.5, rz: 13.5, rot:  0.42, sharp: 1.55, flatTop: 0.0 },
    { x: -16.0, z:  46.0, h:  5.8, rx:  8.8, rz:  8.4, rot:  0.25, sharp: 1.40, flatTop: 2.9 }, // Southern Moonlight Pavilion
    { x: -26.0, z:  72.0, h: 40.0, rx: 22.0, rz: 15.0, rot: -0.36, sharp: 1.56, flatTop: 0.0 },
    { x:  30.0, z:  74.0, h: 44.0, rx: 23.0, rz: 15.5, rot:  0.38, sharp: 1.58, flatTop: 0.0 },
    { x: -78.0, z:  64.0, h: 38.0, rx: 24.0, rz: 17.0, rot:  0.25, sharp: 1.45, flatTop: 0.0 },
    { x:  82.0, z:  66.0, h: 42.0, rx: 25.0, rz: 18.0, rot: -0.28, sharp: 1.45, flatTop: 0.0 },
    { x:   2.0, z: 106.0, h: 32.0, rx: 28.0, rz: 16.0, rot: -0.18, sharp: 1.38, flatTop: 0.0 }
  ];

  function terrainHeight(x, z) {
    let h = -2.4;
    const rLow  = ridged(x * 0.048 + 3.1, z * 0.048 - 4.7, 4);
    const rHigh = ridged(x * 0.115 - 2.3, z * 0.115 + 6.1, 3);
    const cragTex = 0.58 + 0.56 * rLow + 0.24 * rHigh;

    for (let i = 0; i < KARST_PEAKS.length; i++) {
      const p = KARST_PEAKS[i];
      const co = Math.cos(p.rot || 0), si = Math.sin(p.rot || 0);
      const ux = x - p.x, uz = z - p.z;
      const rx = (ux * co + uz * si) / p.rx;
      const rz = (-ux * si + uz * co) / p.rz;
      if (rx * rx + rz * rz > 4.6) continue;
      const warp = (fbm(x * 0.042 + i * 1.9, z * 0.042 - i * 1.4, 2) - 0.5) * 0.38;
      const d2 = (rx + warp) * (rx + warp) + (rz - warp * 0.7) * (rz - warp * 0.7);
      if (d2 < 3.8) {
        const raw = Math.exp(-Math.pow(d2, 0.90) * p.sharp);
        const isFlatCrag = p.flatTop > 0.1;
        let elev = -2.4 + (p.h + 2.4) * raw * (isFlatCrag ? (0.78 + 0.34 * rLow + 0.14 * rHigh) : cragTex);
        if (!isFlatCrag && elev > 7.0) {
          elev += Math.sin(elev * 0.52 + rLow * 3.0) * 0.78;
        }
        if (isFlatCrag) {
          const plateauT = smoothstep(0.45, 0.14, d2);
          elev = mix(elev, p.flatTop, plateauT * 0.88);
        }
        h = Math.max(h, elev);
      }
    }

    // Cloud Pagoda rocky shoulder (32.5, -52.5)
    const dPag = Math.hypot(x - 32.5, z - (-52.5));
    if (dPag < 12.5) {
      const pagM = -2.4 + 24.5 * Math.exp(-Math.pow(dPag / 7.5, 1.9)) * (0.82 + 0.30 * rLow);
      h = Math.max(h, mix(pagM, 20.8, smoothstep(5.5, 2.5, dPag) * 0.85));
    }

    // Keep immediate Rainbow Bridge channel & opening mirror sea 100% open!
    const distRiver = Math.abs(x - riverCenterX(z));
    if (Math.abs(z - BRIDGE_Z) < 12.0 && distRiver < 10.5) {
      h = mix(h, -2.4, smoothstep(10.5, 7.6, distRiver));
    }
    if (z > 4.0 && z < 38.0 && distRiver < 18.0) {
      const open = smoothstep(18.0, 12.0, distRiver) * smoothstep(4.0, 9.0, z) * smoothstep(38.0, 32.0, z);
      h = mix(h, -2.4, open);
    }
    // Keep wide navigable water avenue straight through Mount Buzhou Gate (z = -155..-205, |x| < 26)!
    if (z < -150.0 && z > -210.0 && Math.abs(x) < 28.0) {
      h = mix(h, -2.4, smoothstep(28.0, 18.0, Math.abs(x)));
    }
    return h;
  }

  function terrainNormal(x, z) {
    const e = 0.85;
    const hL = terrainHeight(x - e, z), hR = terrainHeight(x + e, z);
    const hD = terrainHeight(x, z - e), hU = terrainHeight(x, z + e);
    const nx = hL - hR, ny = 2.0 * e, nz = hD - hU;
    const inv = 1.0 / (Math.hypot(nx, ny, nz) || 1.0);
    return [nx * inv, ny * inv, nz * inv];
  }

  function bridgeArchY(x) {
    const cx = riverCenterX(BRIDGE_Z);
    const u = (x - cx) / 13.6;
    if (Math.abs(u) > 1.05) return -99.0;
    const cl = Math.max(-1, Math.min(1, u));
    return 2.25 + 6.45 * Math.pow(1.0 - cl * cl, 0.90);
  }

  /* ==========================================================================
     2. Solid Mesh Builder (16 floats/vert: pos3, norm3, col3, bary3, extra4)
     ========================================================================== */
  function createSolidBuilder(initialCap = 98304) {
    let data = new Float32Array(initialCap * 16);
    let verts = 0;

    function ensure(addVerts) {
      if ((verts + addVerts) * 16 > data.length) {
        const next = new Float32Array(Math.max(data.length * 2, (verts + addVerts) * 16));
        next.set(data);
        data = next;
      }
    }
    function pushVert(p, n, c, b, ex) {
      const o = verts * 16;
      data[o] = p[0]; data[o + 1] = p[1]; data[o + 2] = p[2];
      data[o + 3] = n[0]; data[o + 4] = n[1]; data[o + 5] = n[2];
      data[o + 6] = c[0]; data[o + 7] = c[1]; data[o + 8] = c[2];
      data[o + 9] = b[0]; data[o + 10] = b[1]; data[o + 11] = b[2];
      data[o + 12] = ex[0]; data[o + 13] = ex[1]; data[o + 14] = ex[2]; data[o + 15] = ex[3];
      verts++;
    }
    function addTriSmooth(p0, p1, p2, n0, n1, n2, c0, c1, c2, ex0, ex1, ex2) {
      ensure(3);
      pushVert(p0, n0, c0, [1, 0, 0], ex0);
      pushVert(p1, n1, c1, [0, 1, 0], ex1);
      pushVert(p2, n2, c2, [0, 0, 1], ex2);
    }
    function addTri(p0, p1, p2, c, matId, u0 = 0, v0 = 0, u1 = 1, v1 = 0, u2 = 1, v2 = 1, ao = 1.0) {
      const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
      const bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      const l = Math.hypot(nx, ny, nz) || 1.0;
      const n = [nx / l, ny / l, nz / l];
      addTriSmooth(p0, p1, p2, n, n, n, c, c, c,
        [matId, u0, v0, ao], [matId, u1, v1, ao], [matId, u2, v2, ao]);
    }
    function addQuad(p0, p1, p2, p3, c, matId, uS = 1, vS = 1, ao0 = 1.0, ao1 = 1.0) {
      addTri(p0, p1, p2, c, matId, 0, 0, uS, 0, uS, vS, ao0);
      addTri(p0, p2, p3, c, matId, 0, 0, uS, vS, 0, vS, ao1);
    }
    function addBox(cx, cy, cz, sx, sy, sz, rotY, c, matId, aoBot = 0.72, aoTop = 1.0) {
      const co = Math.cos(rotY), si = Math.sin(rotY);
      const hx = sx * 0.5, hy = sy * 0.5, hz = sz * 0.5;
      const pt = (lx, ly, lz) => [cx + lx * co + lz * si, cy + ly, cz - lx * si + lz * co];
      const v000 = pt(-hx, -hy, -hz), v100 = pt(hx, -hy, -hz), v110 = pt(hx, hy, -hz), v010 = pt(-hx, hy, -hz);
      const v001 = pt(-hx, -hy,  hz), v101 = pt(hx, -hy,  hz), v111 = pt(hx, hy,  hz), v011 = pt(-hx, hy,  hz);
      const m = (aoBot + aoTop) * 0.5;
      addQuad(v001, v101, v111, v011, c, matId, sx, sy, m, m);
      addQuad(v100, v000, v010, v110, c, matId, sx, sy, m, m);
      addQuad(v101, v100, v110, v111, c, matId, sz, sy, m, m);
      addQuad(v000, v001, v011, v010, c, matId, sz, sy, m, m);
      addQuad(v011, v111, v110, v010, c, matId, sx, sz, aoTop, aoTop);
      addQuad(v000, v100, v101, v001, c, matId, sx, sz, aoBot, aoBot);
    }
    function addCylinder(cx, y0, cz, r0, r1, h, segs, c, matId, ao0 = 0.78, ao1 = 1.0) {
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
        const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
        const p00 = [cx + c0 * r0, y0, cz + s0 * r0], p10 = [cx + c1 * r0, y0, cz + s1 * r0];
        const p11 = [cx + c1 * r1, y0 + h, cz + s1 * r1], p01 = [cx + c0 * r1, y0 + h, cz + s0 * r1];
        const n0 = [c0, 0.08, s0], n1 = [c1, 0.08, s1];
        addTriSmooth(p00, p10, p11, n0, n1, n1, c, c, c, [matId, i / segs, 0, ao0], [matId, (i + 1) / segs, 0, ao0], [matId, (i + 1) / segs, 1, ao1]);
        addTriSmooth(p00, p11, p01, n0, n1, n0, c, c, c, [matId, i / segs, 0, ao0], [matId, (i + 1) / segs, 1, ao1], [matId, i / segs, 1, ao1]);
      }
    }
    function addTaperedTube(pts, radii, segs, c, matId, phaseArr = null) {
      for (let k = 0; k < pts.length - 1; k++) {
        const a = pts[k], b = pts[k + 1];
        const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
        const len = Math.hypot(dx, dy, dz) || 1;
        const tx = dx / len, ty = dy / len, tz = dz / len;
        let ux = Math.abs(ty) < 0.9 ? 0 : 1, uy = Math.abs(ty) < 0.9 ? 1 : 0, uz = 0;
        let rx = ty * uz - tz * uy, ry = tz * ux - tx * uz, rz = tx * uy - ty * ux;
        const rl = Math.hypot(rx, ry, rz) || 1;
        rx /= rl; ry /= rl; rz /= rl;
        ux = ry * tz - rz * ty; uy = rz * tx - rx * tz; uz = rx * ty - ry * tx;
        const rA = radii[k], rB = radii[k + 1];
        const phA = phaseArr ? phaseArr[k] : 0;
        const phB = phaseArr ? phaseArr[k + 1] : 0;
        for (let i = 0; i < segs; i++) {
          const t0 = (i / segs) * Math.PI * 2, t1 = ((i + 1) / segs) * Math.PI * 2;
          const ca = Math.cos(t0), sa = Math.sin(t0), cb = Math.cos(t1), sb = Math.sin(t1);
          const n0 = [rx * ca + ux * sa, ry * ca + uy * sa, rz * ca + uz * sa];
          const n1 = [rx * cb + ux * sb, ry * cb + uy * sb, rz * cb + uz * sb];
          const p00 = [a[0] + n0[0] * rA, a[1] + n0[1] * rA, a[2] + n0[2] * rA];
          const p10 = [a[0] + n1[0] * rA, a[1] + n1[1] * rA, a[2] + n1[2] * rA];
          const p11 = [b[0] + n1[0] * rB, b[1] + n1[1] * rB, b[2] + n1[2] * rB];
          const p01 = [b[0] + n0[0] * rB, b[1] + n0[1] * rB, b[2] + n0[2] * rB];
          addTriSmooth(p00, p10, p11, n0, n1, n1, c, c, c, [matId, phA, 0, 0.88], [matId, phA, 0, 0.88], [matId, phB, 0, 0.96]);
          addTriSmooth(p00, p11, p01, n0, n1, n0, c, c, c, [matId, phA, 0, 0.88], [matId, phB, 0, 0.96], [matId, phB, 0, 0.96]);
        }
      }
    }
    function addLantern(x, y, z, scale = 1.0) {
      const r = 0.25 * scale, h = 0.44 * scale;
      addCylinder(x, y + h * 0.48, z, r * 0.45, r * 0.16, 0.15 * scale, 6, [0.10, 0.11, 0.13], 2.0, 0.7, 0.9);
      addCylinder(x, y - h * 0.62, z, r * 0.16, r * 0.45, 0.12 * scale, 6, [0.10, 0.11, 0.13], 2.0, 0.7, 0.9);
      const segs = 8;
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
        const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
        const mR = r * 1.18, tR = r * 0.60;
        const pB0 = [x + c0 * tR, y - h * 0.5, z + s0 * tR], pB1 = [x + c1 * tR, y - h * 0.5, z + s1 * tR];
        const pM0 = [x + c0 * mR, y, z + s0 * mR], pM1 = [x + c1 * mR, y, z + s1 * mR];
        const pT0 = [x + c0 * tR, y + h * 0.5, z + s0 * tR], pT1 = [x + c1 * tR, y + h * 0.5, z + s1 * tR];
        const lc = [1.0, 0.44, 0.18], n0 = [c0, 0, s0], n1 = [c1, 0, s1];
        addTriSmooth(pB0, pB1, pM1, n0, n1, n1, lc, lc, lc, [4.0, 0.5, 0.2, 1.0], [4.0, 0.5, 0.2, 1.0], [4.0, 0.5, 0.5, 1.0]);
        addTriSmooth(pB0, pM1, pM0, n0, n1, n0, lc, lc, lc, [4.0, 0.5, 0.2, 1.0], [4.0, 0.5, 0.5, 1.0], [4.0, 0.5, 0.5, 1.0]);
        addTriSmooth(pM0, pM1, pT1, n0, n1, n1, lc, lc, lc, [4.0, 0.5, 0.5, 1.0], [4.0, 0.5, 0.5, 1.0], [4.0, 0.5, 0.8, 1.0]);
        addTriSmooth(pM0, pT1, pT0, n0, n1, n0, lc, lc, lc, [4.0, 0.5, 0.5, 1.0], [4.0, 0.5, 0.8, 1.0], [4.0, 0.5, 0.8, 1.0]);
      }
    }
    function addSilkRibbon(x, y, z, len = 1.1, w = 0.06, dirX = 0.35) {
      const segs = 6, col = [0.84, 0.18, 0.14];
      for (let i = 0; i < segs; i++) {
        const t0 = i / segs, t1 = (i + 1) / segs;
        const x0 = x + dirX * t0 * len * 0.3, x1 = x + dirX * t1 * len * 0.3;
        const y0 = y - t0 * len, y1 = y - t1 * len;
        const hw0 = w * (1.0 - t0 * 0.4), hw1 = w * (1.0 - t1 * 0.4);
        addTriSmooth([x0 - hw0, y0, z], [x0 + hw0, y0, z], [x1 + hw1, y1, z], [0, 0, 1], [0, 0, 1], [0, 0, 1], col, col, col,
          [8.0, t0, 0, 1], [8.0, t0, 1, 1], [8.0, t1, 1, 1]);
        addTriSmooth([x0 - hw0, y0, z], [x1 + hw1, y1, z], [x1 - hw1, y1, z], [0, 0, 1], [0, 0, 1], [0, 0, 1], col, col, col,
          [8.0, t0, 0, 1], [8.0, t1, 1, 1], [8.0, t1, 0, 1]);
      }
    }
    function addSweepingRoof(cx, baseY, cz, halfW, halfD, roofH, rotY, eaveLift = 0.95, topFlat = 0.22) {
      const co = Math.cos(rotY), si = Math.sin(rotY);
      const tf = (lx, ly, lz) => [cx + lx * co + lz * si, baseY + ly, cz - lx * si + lz * co];
      const roofCol = [0.09, 0.14, 0.19], goldCol = [0.84, 0.66, 0.32];
      const N = 8;
      const evalRoof = (nx, nz) => {
        const ax = Math.abs(nx), az = Math.abs(nz), r = Math.max(ax, az);
        const u = Math.max(0, (r - topFlat) / (1.0 - topFlat));
        let y = roofH * Math.pow(Math.max(0, 1.0 - u), 1.72);
        const cm = Math.pow(Math.min(ax, az), 2.2) * Math.pow(r, 2.0);
        const fl = 1.0 + 0.17 * cm;
        y += cm * eaveLift;
        if (r < topFlat) y = roofH + (topFlat - r) * 0.22;
        return tf(nx * halfW * fl, y, nz * halfD * fl);
      };
      const grid = [], norms = [];
      for (let iz = 0; iz <= N; iz++) { const r = []; for (let ix = 0; ix <= N; ix++) r.push(evalRoof((ix / N) * 2 - 1, (iz / N) * 2 - 1)); grid.push(r); }
      for (let iz = 0; iz <= N; iz++) {
        const nr = [];
        for (let ix = 0; ix <= N; ix++) {
          const pL = grid[iz][Math.max(0, ix - 1)], pR = grid[iz][Math.min(N, ix + 1)];
          const pD = grid[Math.max(0, iz - 1)][ix], pU = grid[Math.min(N, iz + 1)][ix];
          const dx = [pR[0] - pL[0], pR[1] - pL[1], pR[2] - pL[2]], dz = [pU[0] - pD[0], pU[1] - pD[1], pU[2] - pD[2]];
          let nx = dz[1] * dx[2] - dz[2] * dx[1], ny = dz[2] * dx[0] - dz[0] * dx[2], nz = dz[0] * dx[1] - dz[1] * dx[0];
          if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
          const l = Math.hypot(nx, ny, nz) || 1;
          nr.push([nx / l, ny / l, nz / l]);
        }
        norms.push(nr);
      }
      for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) {
        const p00 = grid[iz][ix], p10 = grid[iz][ix + 1], p11 = grid[iz + 1][ix + 1], p01 = grid[iz + 1][ix];
        const n00 = norms[iz][ix], n10 = norms[iz][ix + 1], n11 = norms[iz + 1][ix + 1], n01 = norms[iz + 1][ix];
        addTriSmooth(p00, p01, p11, n00, n01, n11, roofCol, roofCol, roofCol, [1.0, (ix / N) * 14, (iz / N) * 14, 0.92], [1.0, (ix / N) * 14, ((iz + 1) / N) * 14, 0.92], [1.0, ((ix + 1) / N) * 14, ((iz + 1) / N) * 14, 0.92]);
        addTriSmooth(p00, p11, p10, n00, n11, n10, roofCol, roofCol, roofCol, [1.0, (ix / N) * 14, (iz / N) * 14, 0.92], [1.0, ((ix + 1) / N) * 14, ((iz + 1) / N) * 14, 0.92], [1.0, ((ix + 1) / N) * 14, (iz / N) * 14, 0.92]);
      }
      const rLen = halfW * topFlat * 2.15;
      addBox(cx, baseY + roofH + 0.16, cz, rLen, 0.24, 0.24, rotY, goldCol, 2.0, 0.9, 1.0);
      const cL = tf(-rLen * 0.52, roofH + 0.42, 0), cR = tf(rLen * 0.52, roofH + 0.42, 0);
      addBox(cL[0], cL[1], cL[2], 0.24, 0.52, 0.22, rotY, goldCol, 2.0, 0.9, 1.0);
      addBox(cR[0], cR[1], cR[2], 0.24, 0.52, 0.22, rotY, goldCol, 2.0, 0.9, 1.0);
      addBox(cx, baseY - 0.08, cz, halfW * 1.72, 0.16, halfD * 1.72, rotY, [0.10, 0.12, 0.15], 2.0, 0.6, 0.7);
      return [tf(-halfW * 1.12, eaveLift * 0.78, -halfD * 1.12), tf(halfW * 1.12, eaveLift * 0.78, -halfD * 1.12), tf(halfW * 1.12, eaveLift * 0.78, halfD * 1.12), tf(-halfW * 1.12, eaveLift * 0.78, halfD * 1.12)];
    }
    function addOctagonalRoof(cx, baseY, cz, radius, roofH, eaveLift = 0.68, addFinial = true, customCol = null) {
      const roofCol = customCol || [0.09, 0.14, 0.19], goldCol = [0.86, 0.68, 0.34];
      const rings = 6, segs = 8, ringPts = [];
      for (let r = 0; r <= rings; r++) {
        const u = r / rings, row = [];
        for (let s = 0; s < segs; s++) {
          const a = (s / segs) * Math.PI * 2 + Math.PI / 8;
          const rad = radius * (u * (1.0 + 0.14 * u * u));
          const y = baseY + roofH * Math.pow(1.0 - u, 1.70) + Math.pow(u, 3.0) * eaveLift;
          row.push([cx + Math.cos(a) * rad, y, cz + Math.sin(a) * rad]);
        }
        ringPts.push(row);
      }
      for (let r = 0; r < rings; r++) for (let s = 0; s < segs; s++) {
        const s1 = (s + 1) % segs;
        addQuad(ringPts[r][s], ringPts[r + 1][s], ringPts[r + 1][s1], ringPts[r][s1], roofCol, customCol ? 2.0 : 1.0, 2.5, 2.5, 0.85, 0.96);
      }
      if (addFinial) {
        addCylinder(cx, baseY + roofH - 0.05, cz, 0.26, 0.04, 0.92, 8, goldCol, 2.0, 0.92, 1.0);
        addCylinder(cx, baseY - 0.10, cz, radius * 0.84, radius * 0.84, 0.16, 8, [0.10, 0.12, 0.15], 2.0, 0.6, 0.7);
      }
      return ringPts[rings];
    }
    function finish() { return { data: data.subarray(0, verts * 16), count: verts }; }
    return { addTriSmooth, addTri, addQuad, addBox, addCylinder, addTaperedTube, addLantern, addSilkRibbon, addSweepingRoof, addOctagonalRoof, finish };
  }

  /* ==========================================================================
     3. Calligraphic Foliage Builder (焦墨松針 / 丹楓如火)
     ========================================================================== */
  function createFoliageBuilder() {
    const arr = []; let quads = 0;
    function addDab(cx, cy, cz, size, nx, ny, nz, col, brushType, windFlex, seed) {
      const c = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
      for (let i = 0; i < 6; i++) arr.push(cx, cy, cz, c[i][0] * size, c[i][1] * size, nx, ny, nz, col[0], col[1], col[2], seed, brushType, windFlex, size);
      quads++;
    }
    return { addDab, finish: () => ({ data: new Float32Array(arr), count: quads * 6 }) };
  }

  function addCalligraphicPine(solid, foliage, x, z, scale = 1.0, leanX = 0.8, leanZ = 0.0, seed = 1.0, isCinnabar = false) {
    const gy = terrainHeight(x, z);
    if (gy < 0.8) return;
    const inkBark = [0.08, 0.11, 0.14], h = 4.8 * scale, sgn = leanX >= 0 ? 1 : -1;
    const sw = (0.75 + hash2(seed, 0.7) * 0.65) * sgn;
    const pts = [
      [x, gy - 2.2, z],
      [x + sw * 0.55 * scale, gy + h * 0.30, z + leanZ * 0.3 * scale],
      [x + sw * 1.45 * scale, gy + h * 0.62, z - leanZ * 0.3 * scale],
      [x + sw * 1.05 * scale, gy + h * 0.86, z + leanZ * 0.4 * scale],
      [x + sw * 1.75 * scale, gy + h * 1.04, z + leanZ * 0.6 * scale]
    ];
    solid.addTaperedTube(pts, [0.30 * scale, 0.22 * scale, 0.16 * scale, 0.10 * scale, 0.05 * scale], 6, inkBark, 5.0);
    const branches = [
      { base: pts[1], tip: [pts[1][0] + sgn * 2.6 * scale, pts[1][1] + 0.35 * scale, pts[1][2] + 0.6 * scale] },
      { base: pts[2], tip: [pts[2][0] - sgn * 2.2 * scale, pts[2][1] + 0.28 * scale, pts[2][2] - 0.8 * scale] },
      { base: pts[2], tip: [pts[2][0] + sgn * 3.1 * scale, pts[2][1] + 0.42 * scale, pts[2][2] - 0.3 * scale] },
      { base: pts[3], tip: [pts[3][0] - sgn * 1.7 * scale, pts[3][1] + 0.50 * scale, pts[3][2] + 0.9 * scale] },
      { base: pts[4], tip: [pts[4][0] + sgn * 1.6 * scale, pts[4][1] + 0.30 * scale, pts[4][2] + 0.3 * scale] }
    ];
    const pal = isCinnabar
      ? [[0.78, 0.18, 0.13], [0.88, 0.26, 0.15], [0.58, 0.12, 0.11]]
      : [[0.08, 0.24, 0.25], [0.11, 0.34, 0.31], [0.06, 0.17, 0.22]];
    branches.forEach((br, bi) => {
      const mid = [(br.base[0] + br.tip[0]) * 0.5, (br.base[1] + br.tip[1]) * 0.5 - 0.22 * scale, (br.base[2] + br.tip[2]) * 0.5];
      solid.addTaperedTube([br.base, mid, br.tip], [0.10 * scale, 0.06 * scale, 0.025 * scale], 5, inkBark, 5.0);
      for (let d = 0; d < 7; d++) {
        const s = seed * 31.7 + bi * 13.3 + d * 7.9;
        const ang = (d / 7) * Math.PI * 2 + hash2(s, 1.1) * 0.9, rad = (0.28 + hash2(s, 2.3) * 1.25) * scale;
        foliage.addDab(
          br.tip[0] + Math.cos(ang) * rad, br.tip[1] + (hash2(s, 3.7) - 0.4) * 0.32 * scale + 0.16 * scale, br.tip[2] + Math.sin(ang) * rad,
          (0.92 + hash2(s, 4.9) * 0.54) * scale, Math.cos(ang) * 0.5, 0.85, Math.sin(ang) * 0.5,
          pal[d % pal.length], isCinnabar ? 2.0 : 0.0, 0.35 + hash2(s, 5.1) * 0.3, hash2(s, 6.3) * 100.0
        );
      }
    });
  }

  /* ==========================================================================
     4. Grand Architectural Landmarks Across All 4 Realms
     ========================================================================== */
  function buildMoonRainbowBridge(solid) {
    const cx = riverCenterX(BRIDGE_Z), span = 27.6, width = 4.1, segs = 28;
    const inkTimber = [0.12, 0.14, 0.17], bridgeDeck = [0.22, 0.20, 0.19], cinnabar = [0.74, 0.17, 0.14], stone = [0.16, 0.20, 0.24];
    for (const side of [-1, 1]) solid.addBox(cx + side * (span * 0.5 + 0.2), 0.2, BRIDGE_Z, 2.8, 5.2, width + 0.6, 0, stone, 3.0, 0.55, 0.90);
    for (let i = 0; i < segs; i++) {
      const u0 = -1 + (i / segs) * 2, u1 = -1 + ((i + 1) / segs) * 2;
      const x0 = cx + u0 * (span * 0.5), x1 = cx + u1 * (span * 0.5);
      const y0 = 2.25 + 6.45 * Math.pow(1.0 - u0 * u0, 0.90), y1 = 2.25 + 6.45 * Math.pow(1.0 - u1 * u1, 0.90);
      const hw = width * 0.5, thick = 0.50;
      solid.addQuad([x0, y0, BRIDGE_Z - hw], [x1, y1, BRIDGE_Z - hw], [x1, y1, BRIDGE_Z + hw], [x0, y0, BRIDGE_Z + hw], bridgeDeck, 2.0, 1, 2, 0.92, 0.92);
      solid.addQuad([x0, y0 - thick, BRIDGE_Z + hw], [x1, y1 - thick, BRIDGE_Z + hw], [x1, y1 - thick, BRIDGE_Z - hw], [x0, y0 - thick, BRIDGE_Z - hw], inkTimber, 2.0, 1, 2, 0.58, 0.58);
      for (const sgn of [-1, 1]) {
        const zf = BRIDGE_Z + sgn * hw;
        const pA = [x0, y0 - thick - 0.16, zf], pB = [x1, y1 - thick - 0.16, zf], pC = [x1, y1 + 0.08, zf], pD = [x0, y0 + 0.08, zf];
        if (sgn > 0) solid.addQuad(pA, pB, pC, pD, inkTimber, 2.0, 1, 0.5, 0.72, 0.85);
        else solid.addQuad(pB, pA, pD, pC, inkTimber, 2.0, 1, 0.5, 0.72, 0.85);
        const addRail = (hOff, rH, hT, col) => {
          const a0 = y0 + hOff, a1 = y1 + hOff, b0 = a0 + rH, b1 = a1 + rH;
          solid.addQuad([x0, a0, zf + hT], [x1, a1, zf + hT], [x1, b1, zf + hT], [x0, b0, zf + hT], col, 2.0, 1, 0.2, 0.88, 1.0);
          solid.addQuad([x1, a1, zf - hT], [x0, a0, zf - hT], [x0, b0, zf - hT], [x1, b1, zf - hT], col, 2.0, 1, 0.2, 0.85, 0.95);
          solid.addQuad([x0, b0, zf + hT], [x1, b1, zf + hT], [x1, b1, zf - hT], [x0, b0, zf - hT], col, 2.0, 1, 0.2, 0.95, 1.0);
        };
        addRail(0.95, 0.11, 0.065, cinnabar); addRail(0.48, 0.07, 0.048, cinnabar); addRail(0.08, 0.10, 0.070, inkTimber);
      }
      if (i % 2 === 0 || i === segs - 1) {
        const xm = (x0 + x1) * 0.5, ym = (y0 + y1) * 0.5;
        for (const sgn of [-1, 1]) {
          const zf = BRIDGE_Z + sgn * hw;
          solid.addBox(xm, ym + 0.56, zf, 0.13, 1.14, 0.13, 0, cinnabar, 2.0, 0.85, 1.0);
          solid.addBox(xm, ym + 1.18, zf, 0.18, 0.12, 0.18, 0, [0.86, 0.68, 0.34], 2.0, 0.92, 1.0);
          if (i % 4 === 0) solid.addBox(xm, ym - thick - 0.08, BRIDGE_Z, 0.20, 0.20, width + 0.8, 0, inkTimber, 2.0, 0.58, 0.72);
          if (i === 6 || i === 12 || i === 16 || i === 22) {
            solid.addBox(xm, ym + 1.65, zf + sgn * 0.12, 0.06, 1.45, 0.06, 0, inkTimber, 2.0, 0.8, 0.95);
            solid.addBox(xm, ym + 2.30, zf + sgn * 0.36, 0.06, 0.06, 0.52, 0, inkTimber, 2.0, 0.85, 0.95);
            solid.addLantern(xm, ym + 1.84, zf + sgn * 0.56, 1.14);
            solid.addSilkRibbon(xm, ym + 1.48, zf + sgn * 0.56, 0.92, 0.055, 0.35);
          }
        }
      }
    }
    const sy = 2.25 + 6.45;
    solid.addCylinder(cx - 0.8, sy, BRIDGE_Z + 1.25, 0.22, 0.12, 1.28, 6, [0.10, 0.14, 0.18], 2.0, 0.8, 0.95);
    solid.addCylinder(cx - 0.8, sy + 1.28, BRIDGE_Z + 1.25, 0.11, 0.10, 0.22, 6, [0.86, 0.78, 0.66], 2.0, 0.9, 1.0);
  }

  // NEW REALM 2 LANDMARK: High Cloud Stone Sky-Bridge spanning between twin peaks at z = -119, y = 20!
  function buildCloudSkyBridge(solid) {
    const zc = -119.0, span = 46.0, segs = 22, hw = 1.65;
    const stoneCol = [0.14, 0.22, 0.28], cinnabar = [0.76, 0.18, 0.14];
    for (let i = 0; i < segs; i++) {
      const u0 = -1 + (i / segs) * 2, u1 = -1 + ((i + 1) / segs) * 2;
      const x0 = u0 * (span * 0.5), x1 = u1 * (span * 0.5);
      const y0 = 18.0 + 7.2 * (1.0 - u0 * u0), y1 = 18.0 + 7.2 * (1.0 - u1 * u1);
      solid.addQuad([x0, y0, zc - hw], [x1, y1, zc - hw], [x1, y1, zc + hw], [x0, y0, zc + hw], stoneCol, 3.0, 1, 1, 0.9, 0.9);
      solid.addQuad([x0, y0 - 1.1, zc + hw], [x1, y1 - 1.1, zc + hw], [x1, y1 - 1.1, zc - hw], [x0, y0 - 1.1, zc - hw], stoneCol, 3.0, 1, 1, 0.55, 0.55);
      solid.addQuad([x0, y0 - 1.1, zc + hw], [x1, y1 - 1.1, zc + hw], [x1, y1 + 0.15, zc + hw], [x0, y0 + 0.15, zc + hw], stoneCol, 3.0, 1, 0.5, 0.72, 0.88);
      solid.addQuad([x1, y1 - 1.1, zc - hw], [x0, y0 - 1.1, zc - hw], [x0, y0 + 0.15, zc - hw], [x1, y1 + 0.15, zc - hw], stoneCol, 3.0, 1, 0.5, 0.72, 0.88);
      if (i % 4 === 2) {
        const xm = (x0 + x1) * 0.5, ym = (y0 + y1) * 0.5;
        solid.addCylinder(xm, ym, zc + hw, 0.08, 0.07, 1.8, 5, cinnabar, 2.0, 0.8, 0.95);
        solid.addLantern(xm, ym + 1.65, zc + hw + 0.25, 1.35);
      }
    }
  }

  // NEW REALM 3 MONUMENT: 75m Seamless Natural Karst Celestial Arch Gate (Continuous shared rings -> ZERO cracks!)
  function buildCelestialStoneGate(solid) {
    const zc = -179.0, archSpan = 45.0, archTop = 62.0, segs = 32, radSegs = 12;
    const rockCol = [0.10, 0.20, 0.30];
    const rings = [], rNorms = [];
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI;
      const cx = Math.cos(a) * archSpan;
      const cy = -5.0 + Math.sin(a) * archTop;
      const cz = zc + Math.sin(a * 2.0) * 2.4;
      // Tangent vector along the arch curve in XY plane: (-sin a * span, cos a * top, 0)
      let tx = -Math.sin(a) * archSpan, ty = Math.cos(a) * archTop, tz = 0;
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      // Radial outward in-plane normal: (ty, -tx, 0) and depth binormal: (0, 0, 1)
      const rx = ty, ry = -tx;
      const baseR = 11.2 - Math.sin(a) * 4.4;
      const pts = [], nms = [];
      for (let j = 0; j < radSegs; j++) {
        const th = (j / radSegs) * Math.PI * 2;
        const cs = Math.cos(th), sn = Math.sin(th);
        // Sculpted natural karst rock cragginess around circumference
        const crag = 0.86 + 0.26 * ridged(Math.cos(th) * 1.4 + i * 0.22, Math.sin(th) * 1.4 - i * 0.17, 3);
        const rad = baseR * crag;
        const nx = rx * cs, ny = ry * cs, nz = sn;
        pts.push([cx + nx * rad, cy + ny * rad, cz + nz * rad * 0.92]);
        nms.push([nx, ny, nz]);
      }
      rings.push(pts); rNorms.push(nms);
    }
    for (let i = 0; i < segs; i++) {
      for (let j = 0; j < radSegs; j++) {
        const j1 = (j + 1) % radSegs;
        const p00 = rings[i][j], p10 = rings[i][j1], p11 = rings[i + 1][j1], p01 = rings[i + 1][j];
        const n00 = rNorms[i][j], n10 = rNorms[i][j1], n11 = rNorms[i + 1][j1], n01 = rNorms[i + 1][j];
        solid.addTriSmooth(p00, p01, p11, n00, n01, n11, rockCol, rockCol, rockCol, [0, 0, 0, 0.88], [0, 0, 0, 0.88], [0, 0, 0, 0.88]);
        solid.addTriSmooth(p00, p11, p10, n00, n11, n10, rockCol, rockCol, rockCol, [0, 0, 0, 0.88], [0, 0, 0, 0.88], [0, 0, 0, 0.88]);
      }
    }
    // Two ceremonial lanterns suspended cleanly beneath the giant arch keystone!
    solid.addLantern(-10.5, 49.5, zc + 4.5, 3.0);
    solid.addLantern( 10.5, 49.5, zc + 4.5, 3.0);
  }

  // NEW REALM 4A LANDMARK: Qingqiu Vermilion Water Paifang Archway (青丘臨水朱紅古牌坊!)
  function buildWaterPaifang(solid, x, z, rotY) {
    const co = Math.cos(rotY), si = Math.sin(rotY);
    const tf = (lx, ly, lz) => [x + lx * co + lz * si, ly, z - lx * si + lz * co];
    const cinnabar = [0.78, 0.18, 0.14], gold = [0.88, 0.68, 0.34];
    const xs = [-5.8, -2.5, 2.5, 5.8];
    xs.forEach((lx, i) => {
      const h = (i === 1 || i === 2) ? 9.5 : 7.4;
      const p = tf(lx, -2.0, 0);
      solid.addCylinder(p[0], -2.0, p[2], 0.34, 0.28, h + 2.0, 8, cinnabar, 2.0, 0.78, 0.98);
      solid.addCylinder(p[0], -2.0, p[2], 0.62, 0.48, 2.8, 8, [0.16, 0.22, 0.26], 3.0, 0.6, 0.9);
    });
    // Cross lintels & gold-inscribed plaque
    const mid = tf(0, 7.6, 0);
    solid.addBox(mid[0], 7.6, mid[2], 12.2, 0.55, 0.45, rotY, cinnabar, 2.0, 0.85, 1.0);
    solid.addBox(mid[0], 9.0, mid[2], 5.6, 0.55, 0.45, rotY, cinnabar, 2.0, 0.85, 1.0);
    solid.addBox(mid[0], 8.3, mid[2], 2.8, 1.05, 0.28, rotY, gold, 2.0, 0.92, 1.0);
    // Triple sweeping upturned Song paifang roofs + hanging warm lanterns!
    solid.addSweepingRoof(mid[0], 9.45, mid[2], 3.6, 1.35, 1.65, rotY, 0.75, 0.30);
    const pL = tf(-4.15, 7.85, 0), pR = tf(4.15, 7.85, 0);
    solid.addSweepingRoof(pL[0], 7.85, pL[2], 2.2, 1.15, 1.25, rotY, 0.55, 0.28);
    solid.addSweepingRoof(pR[0], 7.85, pR[2], 2.2, 1.15, 1.25, rotY, 0.55, 0.28);
    const lL = tf(-2.5, 6.4, 0.65), lR = tf(2.5, 6.4, 0.65);
    solid.addLantern(lL[0], lL[1], lL[2], 1.25);
    solid.addLantern(lR[0], lR[1], lR[2], 1.25);
  }

  function addCliffPavilion(solid, x, z, rotY, stories = 2, scale = 1.0) {
    const gy = terrainHeight(x, z);
    const inkWood = [0.11, 0.14, 0.18], cinnabar = [0.72, 0.17, 0.14], stoneCol = [0.15, 0.21, 0.26], winGlow = [1.0, 0.68, 0.30];
    const w = 4.6 * scale, d = 3.8 * scale, baseTop = Math.max(gy + 0.5, 4.6), foundH = baseTop - (gy - 4.8);
    solid.addBox(x, baseTop - foundH * 0.5, z, w + 1.5 * scale, foundH, d + 1.5 * scale, rotY, stoneCol, 3.0, 0.55, 0.90);
    solid.addBox(x, baseTop + 0.10 * scale, z, w + 1.8 * scale, 0.22 * scale, d + 1.8 * scale, rotY, [0.22, 0.28, 0.32], 3.0, 0.82, 1.0);
    const co = Math.cos(rotY), si = Math.sin(rotY);
    const tf = (lx, ly, lz) => [x + lx * co + lz * si, ly, z - lx * si + lz * co];
    let curY = baseTop + 0.22 * scale;
    for (let s = 0; s < stories; s++) {
      const sh = Math.pow(0.80, s), sw = w * sh, sd = d * sh, fh = (s === 0 ? 3.1 : 2.55) * scale;
      solid.addBox(x, curY + fh * 0.5, z, sw * 0.76, fh, sd * 0.76, rotY, inkWood, 2.0, 0.70, 0.92);
      const fN = tf(0, curY + fh * 0.50, sd * 0.39), fS = tf(0, curY + fh * 0.50, -sd * 0.39);
      const fE = tf(sw * 0.39, curY + fh * 0.50, 0), fW = tf(-sw * 0.39, curY + fh * 0.50, 0);
      solid.addBox(fN[0], fN[1], fN[2], sw * 0.54, fh * 0.56, 0.08, rotY, winGlow, 4.0, 0.9, 1.0);
      solid.addBox(fS[0], fS[1], fS[2], sw * 0.54, fh * 0.56, 0.08, rotY, winGlow, 4.0, 0.9, 1.0);
      solid.addBox(fE[0], fE[1], fE[2], 0.08, fh * 0.56, sd * 0.52, rotY, winGlow, 4.0, 0.9, 1.0);
      solid.addBox(fW[0], fW[1], fW[2], 0.08, fh * 0.56, sd * 0.52, rotY, winGlow, 4.0, 0.9, 1.0);
      [[-sw * 0.5, -sd * 0.5], [0, -sd * 0.5], [sw * 0.5, -sd * 0.5], [-sw * 0.5, sd * 0.5], [0, sd * 0.5], [sw * 0.5, sd * 0.5]].forEach(([lx, lz]) => {
        const p = tf(lx, curY, lz);
        solid.addCylinder(p[0], p[1], p[2], 0.12 * scale, 0.10 * scale, fh, 6, cinnabar, 2.0, 0.78, 0.96);
      });
      solid.addBox(x, curY + fh - 0.12 * scale, z, sw + 0.3 * scale, 0.24 * scale, sd + 0.3 * scale, rotY, inkWood, 2.0, 0.65, 0.85);
      solid.addBox(x, curY + 0.48 * scale, z, sw + 0.15 * scale, 0.10 * scale, sd + 0.15 * scale, rotY, cinnabar, 2.0, 0.82, 0.96);
      const corners = solid.addSweepingRoof(x, curY + fh, z, sw * 0.82, sd * 0.84, (s === stories - 1 ? 2.4 : 1.35) * scale, rotY, (s === stories - 1 ? 1.05 : 0.68) * scale, s === stories - 1 ? 0.20 : 0.44);
      if (s === 0) corners.forEach((rc) => solid.addLantern(rc[0], rc[1] - 0.55 * scale, rc[2], 0.88 * scale));
      curY += fh + (s === stories - 1 ? 0 : 0.72 * scale);
    }
  }

  function addPagoda(solid, x, z, tiers = 5, scale = 1.0) {
    const gy = terrainHeight(x, z), inkBody = [0.11, 0.15, 0.21];
    let curY = gy - 1.0;
    solid.addCylinder(x, gy - 5.0, z, 2.8 * scale, 2.2 * scale, 5.2 * scale, 8, [0.12, 0.20, 0.26], 3.0, 0.58, 0.90);
    curY += 1.2 * scale;
    for (let t = 0; t < tiers; t++) {
      const s = Math.pow(0.85, t), r = 2.0 * s * scale, h = 1.9 * s * scale;
      solid.addCylinder(x, curY, z, r, r * 0.94, h, 8, inkBody, 3.0, 0.78, 0.96);
      if (t % 2 === 0 || t === tiers - 1) solid.addLantern(x, curY + h * 0.5, z + r * 0.96, 1.05 * scale);
      solid.addOctagonalRoof(x, curY + h, z, r * 1.65, 1.18 * s * scale, 0.48 * s * scale, t === tiers - 1);
      curY += h + 0.52 * s * scale;
    }
  }

  function addOctagonalPavilion(solid, x, z, scale = 1.0) {
    const gy = terrainHeight(x, z), baseTop = Math.max(gy + 0.4, 2.4), r = 2.6 * scale, h = 2.9 * scale;
    solid.addCylinder(x, gy - 3.5, z, r * 1.15, r * 1.08, baseTop - (gy - 3.5), 8, [0.15, 0.20, 0.25], 3.0, 0.6, 0.92);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      solid.addCylinder(x + Math.cos(a) * r * 0.88, baseTop, z + Math.sin(a) * r * 0.88, 0.10 * scale, 0.09 * scale, h, 6, [0.72, 0.17, 0.14], 2.0, 0.8, 0.96);
    }
    solid.addLantern(x, baseTop + h * 0.62, z, 1.35 * scale);
    solid.addOctagonalRoof(x, baseTop + h, z, r * 1.45, 1.95 * scale, 0.72 * scale, true);
  }

  /* ==========================================================================
     5. THE 7 LIVING SHAN HAI JING & SONG-SCROLL CREATURES!
     ========================================================================== */

  // CREATURE 1: 《山海經・北冥巨鯤》Celestial Splash-Ink Kun (uses progSpirit shader!)
  function buildKun() {
    const kb = createSolidBuilder(16384);
    const rings = 42, radSegs = 18, bodyLen = 30.0;
    function profile(s) {
      const nose = Math.pow(Math.sin(Math.min(1, s * 2.2) * Math.PI * 0.5), 0.72);
      const taper = Math.pow(Math.max(0.025, 1.0 - Math.pow(s, 1.38)), 1.08);
      return { rx: 2.55 * nose * taper + 0.07, ry: 2.0 * nose * taper + 0.05, cy: Math.sin(s * Math.PI * 1.15) * 0.75 - s * 0.35 };
    }
    const colTop = [0.06, 0.14, 0.24], colBel = [0.22, 0.58, 0.62];
    for (let i = 0; i < rings; i++) {
      const s0 = i / rings, s1 = (i + 1) / rings, z0 = (0.36 - s0) * bodyLen, z1 = (0.36 - s1) * bodyLen;
      const p0 = profile(s0), p1 = profile(s1);
      for (let j = 0; j < radSegs; j++) {
        const a0 = (j / radSegs) * Math.PI * 2, a1 = ((j + 1) / radSegs) * Math.PI * 2;
        const c0 = Math.cos(a0), sn0 = Math.sin(a0), c1 = Math.cos(a1), sn1 = Math.sin(a1);
        const v00 = [c0 * p0.rx, p0.cy + sn0 * p0.ry, z0], v10 = [c1 * p0.rx, p0.cy + sn1 * p0.ry, z0];
        const v11 = [c1 * p1.rx, p1.cy + sn1 * p1.ry, z1], v01 = [c0 * p1.rx, p1.cy + sn0 * p1.ry, z1];
        const mkN = (c, sn, pr) => { const l = Math.hypot(c / pr.rx, sn / pr.ry, 0.12) || 1; return [c / pr.rx / l, sn / pr.ry / l, 0.12 / l]; };
        const n00 = mkN(c0, sn0, p0), n10 = mkN(c1, sn1, p0), n11 = mkN(c1, sn1, p1), n01 = mkN(c0, sn0, p1);
        const mkC = (sn) => { const t = smoothstep(-0.65, 0.55, sn); return [mix(colBel[0], colTop[0], t), mix(colBel[1], colTop[1], t), mix(colBel[2], colTop[2], t)]; };
        const co0 = mkC(sn0), co1 = mkC(sn1);
        kb.addTriSmooth(v00, v01, v11, n00, n01, n11, co0, co0, co1, [7.0, s0, 0, j / radSegs], [7.0, s1, 0, j / radSegs], [7.0, s1, 0, (j + 1) / radSegs]);
        kb.addTriSmooth(v00, v11, v10, n00, n11, n10, co0, co1, co1, [7.0, s0, 0, j / radSegs], [7.0, s1, 0, (j + 1) / radSegs], [7.0, s0, 0, (j + 1) / radSegs]);
      }
    }
    const wingU = 14, wingV = 8, wingCol = [0.16, 0.54, 0.58];
    for (const side of [-1, 1]) for (let iu = 0; iu < wingU; iu++) {
      const u0 = iu / wingU, u1 = (iu + 1) / wingU;
      for (let iv = 0; iv < wingV; iv++) {
        const v0 = iv / wingV, v1 = (iv + 1) / wingV;
        const ptW = (u, v) => {
          const span = 1.45 + u * 16.0, chord = 7.8 * Math.pow(Math.sin(Math.min(1, u * 0.92 + 0.08) * Math.PI), 0.65) + 0.6;
          const z = 5.6 - Math.pow(u, 1.35) * 12.2 - v * chord;
          const archY = 0.25 + Math.sin(u * Math.PI * 0.85) * 1.65 - Math.pow(u, 1.8) * 1.8 - v * 0.45;
          return { p: [side * span, archY, z], s: Math.max(0.08, Math.min(0.95, 0.36 - z / bodyLen)) };
        };
        const w00 = ptW(u0, v0), w10 = ptW(u1, v0), w11 = ptW(u1, v1), w01 = ptW(u0, v1), n = [side * 0.14, 0.96, 0.12];
        const ex = (w, u, v) => [7.0, w.s, 0.08 + u * 0.92, v];
        kb.addTriSmooth(w00.p, w10.p, w11.p, n, n, n, wingCol, wingCol, wingCol, ex(w00, u0, v0), ex(w10, u1, v0), ex(w11, u1, v1));
        kb.addTriSmooth(w00.p, w11.p, w01.p, n, n, n, wingCol, wingCol, wingCol, ex(w00, u0, v0), ex(w11, u1, v1), ex(w01, u0, v1));
      }
    }
    const tailSegs = 20, tailCol = [0.88, 0.66, 0.34];
    for (const side of [-1, 1]) for (let i = 0; i < tailSegs; i++) {
      const t0 = i / tailSegs, t1 = (i + 1) / tailSegs;
      const ptT = (t, e) => [side * (0.25 + Math.pow(t, 0.88) * 5.2), Math.sin(t * 3.8 + side * 0.8) * 1.25 - t * 0.6 + e * 1.25 * (1.0 - t * 0.72) * (0.35 + Math.sin(t * Math.PI) * 0.85), -18.8 - t * 20.5];
      const p00 = ptT(t0, -1), p01 = ptT(t0, 1), p11 = ptT(t1, 1), p10 = ptT(t1, -1), n = [side * 0.85, 0.4, 0.2];
      const s0 = 0.95 + t0 * 0.65, s1 = 0.95 + t1 * 0.65;
      kb.addTriSmooth(p00, p10, p11, n, n, n, tailCol, tailCol, tailCol, [7.0, s0, 0.35 + t0 * 0.65, 0.08], [7.0, s1, 0.35 + t1 * 0.65, 0.08], [7.0, s1, 0.35 + t1 * 0.65, 0.92]);
      kb.addTriSmooth(p00, p11, p01, n, n, n, tailCol, tailCol, tailCol, [7.0, s0, 0.35 + t0 * 0.65, 0.08], [7.0, s1, 0.35 + t1 * 0.65, 0.92], [7.0, s0, 0.35 + t0 * 0.65, 0.92]);
    }
    return kb.finish();
  }

  // CREATURE 2: 《山海經・應龍》Colossal 70m Winged Ink-Gold Celestial Sky-Dragon!
  function buildYinglongDragon() {
    const db = createSolidBuilder(20480);
    const rings = 56, radSegs = 14, totalLen = 68.0;
    const colInk = [0.05, 0.14, 0.26], colGold = [0.96, 0.76, 0.34];

    function dragonR(s) {
      if (s < 0.08) return 1.15 + Math.sin((s / 0.08) * Math.PI) * 0.65; // Sculpted regal dragon head!
      return Math.max(0.14, 1.52 * Math.pow(1.0 - s * 0.92, 0.72));
    }

    // Sinuous 56-ring serpentine dragon torso (local +Z = head, -Z = tail; undulating in vertex shader!)
    for (let i = 0; i < rings; i++) {
      const s0 = i / rings, s1 = (i + 1) / rings;
      const z0 = (0.28 - s0) * totalLen, z1 = (0.28 - s1) * totalLen;
      const r0 = dragonR(s0), r1 = dragonR(s1);
      for (let j = 0; j < radSegs; j++) {
        const a0 = (j / radSegs) * Math.PI * 2, a1 = ((j + 1) / radSegs) * Math.PI * 2;
        const c0 = Math.cos(a0), sn0 = Math.sin(a0), c1 = Math.cos(a1), sn1 = Math.sin(a1);
        const v00 = [c0 * r0, sn0 * r0 * 0.92, z0], v10 = [c1 * r0, sn1 * r0 * 0.92, z0];
        const v11 = [c1 * r1, sn1 * r1 * 0.92, z1], v01 = [c0 * r1, sn0 * r1 * 0.92, z1];
        const n0 = [c0, sn0, 0.08], n1 = [c1, sn1, 0.08];
        const col0 = sn0 < -0.58 ? colGold : colInk;
        const col1 = sn1 < -0.58 ? colGold : colInk;
        // extra4: [10.0 (Dragon spirit), s (spine phase), 0.0 (solid body), radAngle01]
        db.addTriSmooth(v00, v01, v11, n0, n0, n1, col0, col0, col1, [10.0, s0, 0, j / radSegs], [10.0, s1, 0, j / radSegs], [10.0, s1, 0, (j + 1) / radSegs]);
        db.addTriSmooth(v00, v11, v10, n0, n1, n1, col0, col1, col1, [10.0, s0, 0, j / radSegs], [10.0, s1, 0, (j + 1) / radSegs], [10.0, s0, 0, (j + 1) / radSegs]);
      }
      // Flowing Golden Dorsal Spine Mane along the back!
      if (i > 1 && i < rings - 3) {
        const h0 = (0.9 + Math.sin(s0 * Math.PI) * 1.45) * (1.0 - s0 * 0.5);
        const h1 = (0.9 + Math.sin(s1 * Math.PI) * 1.45) * (1.0 - s1 * 0.5);
        const b0 = [0, r0 * 0.85, z0], t0 = [0, r0 * 0.85 + h0, z0 - 0.8];
        const b1 = [0, r1 * 0.85, z1], t1 = [0, r1 * 0.85 + h1, z1 - 0.8];
        db.addTriSmooth(b0, b1, t1, [1, 0, 0], [1, 0, 0], [1, 0, 0], colGold, colGold, colGold, [10.0, s0, 0.25, 0.1], [10.0, s1, 0.25, 0.1], [10.0, s1, 0.90, 0.9]);
        db.addTriSmooth(b0, t1, t0, [1, 0, 0], [1, 0, 0], [1, 0, 0], colGold, colGold, colGold, [10.0, s0, 0.25, 0.1], [10.0, s1, 0.90, 0.9], [10.0, s0, 0.90, 0.9]);
      }
    }

    // Regal Branching Golden Antlers & Flowing Whiskers at Dragon Head (s ≈ 0.04)
    const headZ = 0.24 * totalLen;
    for (const side of [-1, 1]) {
      db.addTaperedTube([[side * 0.65, 1.15, headZ - 1.2], [side * 2.1, 3.2, headZ - 3.6], [side * 3.4, 5.2, headZ - 6.8]], [0.22, 0.14, 0.05], 5, colGold, 10.0, [0.03, 0.05, 0.08]);
      db.addTaperedTube([[side * 1.5, 2.5, headZ - 2.8], [side * 2.9, 4.4, headZ - 2.4]], [0.12, 0.04], 4, colGold, 10.0, [0.04, 0.06]);
      // Long undulating golden whiskers!
      db.addTaperedTube([[side * 0.9, 0.0, headZ + 1.4], [side * 4.2, -0.8, headZ - 1.5], [side * 7.5, -1.6, headZ - 6.5]], [0.11, 0.07, 0.02], 4, colGold, 10.0, [0.02, 0.06, 0.12]);
    }

    // Sweeping Celestial Yinglong Wings (應龍雙翼 — Gossamer Azure & Liquid Gold!)
    const wU = 14, wV = 8, wingC = [0.14, 0.56, 0.62];
    for (const side of [-1, 1]) for (let iu = 0; iu < wU; iu++) {
      const u0 = iu / wU, u1 = (iu + 1) / wU;
      for (let iv = 0; iv < wV; iv++) {
        const v0 = iv / wV, v1 = (iv + 1) / wV;
        const ptW = (u, v) => {
          const span = 1.2 + u * 21.0;
          const chord = 9.5 * Math.pow(Math.sin(Math.min(1, u * 0.90 + 0.10) * Math.PI), 0.62) + 0.8;
          const z = (0.28 - 0.22) * totalLen - Math.pow(u, 1.28) * 14.0 - v * chord;
          const y = 0.8 + Math.sin(u * Math.PI * 0.88) * 3.6 - Math.pow(u, 1.7) * 2.2 - v * 0.6;
          return { p: [side * span, y, z], s: Math.max(0.15, Math.min(0.65, 0.28 - z / totalLen)) };
        };
        const a = ptW(u0, v0), b = ptW(u1, v0), c = ptW(u1, v1), d = ptW(u0, v1), n = [side * 0.15, 0.96, 0.12];
        db.addTriSmooth(a.p, b.p, c.p, n, n, n, wingC, wingC, wingC, [10.0, a.s, 0.08 + u0 * 0.92, v0], [10.0, b.s, 0.08 + u1 * 0.92, v0], [10.0, c.s, 0.08 + u1 * 0.92, v1]);
        db.addTriSmooth(a.p, c.p, d.p, n, n, n, wingC, wingC, wingC, [10.0, a.s, 0.08 + u0 * 0.92, v0], [10.0, c.s, 0.08 + u1 * 0.92, v1], [10.0, d.s, 0.08 + u0 * 0.92, v1]);
      }
    }
    return db.finish();
  }

  // CREATURE 3: 《山海經・丹山朱鳳》Soaring Vermilion Phoenix with 5 Flowing Silk Tail Plumes!
  function buildPhoenix() {
    const pb = createSolidBuilder(6144);
    const verm = [0.88, 0.22, 0.14], gold = [0.98, 0.78, 0.36];
    // Graceful arched phoenix body, slender neck & glowing crown crest
    pb.addTaperedTube([[0, 0.0, -2.4], [0, 0.25, -0.2], [0, 0.55, 2.0], [0, 1.05, 3.8], [0, 0.92, 4.6]], [0.16, 0.72, 0.42, 0.22, 0.05], 7, verm, 11.0, [0.22, 0.14, 0.08, 0.03, 0.0]);
    pb.addTaperedTube([[0, 1.15, 3.6], [0, 1.85, 2.4], [0, 2.1, 1.1]], [0.12, 0.08, 0.02], 4, gold, 11.0, [0.03, 0.06, 0.10]);
    // Sweeping wide crimson-and-gold gossamer phoenix wings!
    const wU = 10, wV = 6;
    for (const side of [-1, 1]) for (let iu = 0; iu < wU; iu++) {
      const u0 = iu / wU, u1 = (iu + 1) / wU;
      for (let iv = 0; iv < wV; iv++) {
        const v0 = iv / wV, v1 = (iv + 1) / wV;
        const pt = (u, v) => {
          const sp = 0.45 + u * 7.6;
          const ch = 3.6 * Math.pow(Math.sin(Math.min(1, u * 0.88 + 0.12) * Math.PI), 0.6) + 0.3;
          const z = 1.6 - Math.pow(u, 1.3) * 4.4 - v * ch;
          const y = 0.4 + Math.sin(u * Math.PI * 0.85) * 1.4 - v * 0.2;
          return [side * sp, y, z];
        };
        const a = pt(u0, v0), b = pt(u1, v0), c = pt(u1, v1), d = pt(u0, v1), n = [0, 1, 0];
        const col = u0 > 0.45 ? gold : verm;
        pb.addTriSmooth(a, b, c, n, n, n, col, col, col, [11.0, 0.15, 0.08 + u0 * 0.92, v0], [11.0, 0.15, 0.08 + u1 * 0.92, v0], [11.0, 0.15, 0.08 + u1 * 0.92, v1]);
        pb.addTriSmooth(a, c, d, n, n, n, col, col, col, [11.0, 0.15, 0.08 + u0 * 0.92, v0], [11.0, 0.15, 0.08 + u1 * 0.92, v1], [11.0, 0.15, 0.08 + u0 * 0.92, v1]);
      }
    }
    // 5 Long Undulating Vermilion-Gold Silk Tail Ribbons (15m graceful ribbons!)
    const offsets = [-1.0, -0.5, 0.0, 0.5, 1.0];
    offsets.forEach((off, oi) => {
      const segs = 16, col = oi % 2 === 0 ? verm : gold;
      for (let i = 0; i < segs; i++) {
        const t0 = i / segs, t1 = (i + 1) / segs;
        const pt = (t, e) => {
          const z = -2.2 - t * 14.5;
          const x = off * (0.25 + t * 2.4) + Math.sin(t * 4.5 + oi) * 0.35;
          const y = Math.sin(t * 3.6 + oi * 0.7) * 0.65 - t * 0.5;
          const hw = 0.42 * (1.0 - t * 0.65) * (0.4 + Math.sin(t * Math.PI) * 0.75);
          return [x + e * hw, y, z];
        };
        const p00 = pt(t0, -1), p01 = pt(t0, 1), p11 = pt(t1, 1), p10 = pt(t1, -1), n = [0, 1, 0];
        const s0 = 0.40 + t0 * 1.15, s1 = 0.40 + t1 * 1.15;
        pb.addTriSmooth(p00, p10, p11, n, n, n, col, col, col, [11.0, s0, 0.45 + t0 * 0.5, 0.15], [11.0, s1, 0.45 + t1 * 0.5, 0.15], [11.0, s1, 0.45 + t1 * 0.5, 0.85]);
        pb.addTriSmooth(p00, p11, p01, n, n, n, col, col, col, [11.0, s0, 0.45 + t0 * 0.5, 0.15], [11.0, s1, 0.45 + t1 * 0.5, 0.85], [11.0, s0, 0.45 + t0 * 0.5, 0.85]);
      }
    });
    return pb.finish();
  }

  // CREATURE 4: 《山海經・青丘九尾狐》Regal Sculpted White-Silk Nine-Tailed Spirit Fox (Z-buffered 360° sculpture!)
  function buildNineTailFox() {
    const fb = createSolidBuilder(14336);
    const white   = [0.97, 0.94, 0.88];
    const chestIv = [1.00, 0.98, 0.94];
    const tipRed  = [0.88, 0.14, 0.11];
    const inkDark = [0.08, 0.10, 0.13];
    const eyeGold = [1.00, 0.78, 0.18];

    // 1. Regal seated haunches, arched spine & slender neck (facing +Z!)
    fb.addTaperedTube(
      [[0, 0.25, -0.95], [0, 0.92, -0.50], [0, 1.88, 0.08], [0, 2.78, 0.48], [0, 3.38, 0.74]],
      [0.72, 0.86, 0.66, 0.42, 0.34], 10, white, 12.0, [0, 0, 0, 0, 0]
    );
    // Fluffy sculpted chest ruff (白狐胸領蓬毛) + crimson-gold spirit collar & bell (朱砂絲帶金鈴)
    fb.addTaperedTube(
      [[0, 1.32, 0.56], [0, 2.02, 0.80], [0, 2.68, 0.82], [0, 3.06, 0.78]],
      [0.34, 0.62, 0.52, 0.26], 9, chestIv, 12.0, [0, 0, 0, 0]
    );
    // Vermilion silk spirit collar wrapping neck + glowing golden jade bell on chest
    const collarPts = [];
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      collarPts.push([Math.sin(a) * 0.44, 2.84 - Math.cos(a) * 0.08, 0.54 + Math.cos(a) * 0.42]);
    }
    fb.addTaperedTube(collarPts, collarPts.map(() => 0.075), 6, tipRed, 12.0, collarPts.map(() => 0));
    fb.addTaperedTube([[0, 2.68, 0.98], [0, 2.52, 1.04]], [0.14, 0.11], 7, eyeGold, 12.0, [0, 0]);

    // Sculpted fox cranium, cheeks & slender pointed muzzle (+Z forward!)
    fb.addTaperedTube(
      [[0, 3.44, 0.52], [0, 3.48, 0.96], [0, 3.34, 1.44], [0, 3.16, 1.98], [0, 3.10, 2.28]],
      [0.36, 0.48, 0.32, 0.14, 0.055], 10, white, 12.0, [0, 0, 0, 0, 0]
    );
    // Cheek ruffs (elegant triangular fox face silhouette)
    for (const s of [-1, 1]) {
      fb.addTaperedTube([[s * 0.24, 3.34, 0.88], [s * 0.58, 3.24, 0.72]], [0.22, 0.04], 6, chestIv, 12.0, [0, 0]);
    }
    // Sumi-ink nose tip (黑墨鼻尖)
    fb.addTaperedTube([[0, 3.12, 2.24], [0, 3.09, 2.40]], [0.078, 0.032], 6, inkDark, 12.0, [0, 0]);
    // Cinnabar forehead flame mark (眉間朱砂花鈿 — proud of forehead surface so clearly visible!)
    fb.addTaperedTube([[0, 3.64, 1.56], [0, 3.84, 1.38], [0, 3.98, 1.24]], [0.045, 0.065, 0.015], 6, tipRed, 12.0, [0, 0, 0]);

    // Tall expressive fox ears + proud slanted phoenix-fox eyes (丹鳳金眸 + 朱砂眼角 + 墨色眼線) + slender legs & sumi-ink paws!
    for (const s of [-1, 1]) {
      // Outer white ear, vivid cinnabar inner ear & dark ink ear-tips
      fb.addTaperedTube([[s * 0.26, 3.74, 0.82], [s * 0.46, 4.48, 0.74], [s * 0.56, 4.96, 0.66]], [0.21, 0.11, 0.02], 6, white, 12.0, [0, 0, 0]);
      fb.addTaperedTube([[s * 0.27, 3.78, 0.94], [s * 0.45, 4.44, 0.84], [s * 0.52, 4.78, 0.74]], [0.13, 0.068, 0.016], 5, tipRed, 12.0, [0, 0, 0]);
      fb.addTaperedTube([[s * 0.50, 4.70, 0.70], [s * 0.58, 5.02, 0.64]], [0.068, 0.014], 5, inkDark, 12.0, [0, 0]);
      // Proud slanted golden phoenix-fox eyes + winged sumi-ink upper eyeliner + cinnabar outer eye flick (朱砂眼尾)!
      fb.addTaperedTube([[s * 0.16, 3.45, 1.66], [s * 0.34, 3.54, 1.46]], [0.068, 0.056], 6, eyeGold, 12.0, [0, 0]);
      fb.addTaperedTube([[s * 0.13, 3.51, 1.68], [s * 0.36, 3.61, 1.46], [s * 0.48, 3.68, 1.28]], [0.032, 0.036, 0.016], 5, inkDark, 12.0, [0, 0, 0]);
      fb.addTaperedTube([[s * 0.35, 3.54, 1.44], [s * 0.50, 3.62, 1.22]], [0.034, 0.014], 5, tipRed, 12.0, [0, 0]);
      // Slender front legs + seated hind haunch + sumi-ink paws planted solidly on hill
      fb.addTaperedTube([[s * 0.34, 1.92, 0.52], [s * 0.30, 0.92, 0.72], [s * 0.28, 0.22, 0.82]], [0.20, 0.13, 0.10], 6, white, 12.0, [0, 0, 0]);
      fb.addTaperedTube([[s * 0.28, 0.24, 0.82], [s * 0.28, -0.04, 1.06]], [0.11, 0.09], 6, inkDark, 12.0, [0, 0]);
      fb.addTaperedTube([[s * 0.58, 1.02, -0.35], [s * 0.66, 0.26, -0.05], [s * 0.62, -0.02, 0.32]], [0.34, 0.22, 0.12], 6, white, 12.0, [0, 0, 0]);
    }

    // 2. 9 Lush S-Curved Brush-Stroke Silk Tails (wide peacock halo with curling cinnabar flame-tips visible from front!)
    for (let t = 0; t < 9; t++) {
      const fan = (t / 8) * 2.0 - 1.0; // [-1..1]
      const angX = fan * 1.46;
      const archH = 2.8 + (1.0 - Math.abs(fan) * 0.78) * 3.0;
      const segs = 14, rSegs = 6;
      const tRings = [], tNorms = [], tU = [];
      for (let i = 0; i <= segs; i++) {
        const u = i / segs;
        // Wide graceful fan behind shoulders with lush brush S-curve & upturned flame-tip!
        const spread = Math.sin(angX) * (0.45 + Math.pow(u, 0.82) * 6.8);
        const sCurve = Math.sin(u * Math.PI * 1.65 + (t % 2 === 0 ? 0.4 : -0.4)) * 0.48 * u;
        const cx = spread + sCurve;
        // Tips lift gently upward like calligraphic ink flames so ALL 9 cinnabar tips shine from the front!
        const cy = 0.65 + Math.sin(u * Math.PI * 0.74) * archH + Math.pow(u, 1.5) * 1.85;
        const cz = -1.05 - Math.sin(u * Math.PI * 0.72) * 2.4 - u * 0.65 + Math.pow(u, 2.4) * 1.15;
        // Plump fluffy fox-tail silhouette tapering sharply to an ink-brush point
        const rad = (Math.sin(Math.min(1, u * 0.94 + 0.06) * Math.PI) * 0.48 + 0.035) * (1.0 - u * 0.25) * (1.0 - Math.abs(fan) * 0.10);
        const pts = [], nms = [];
        for (let j = 0; j < rSegs; j++) {
          const a = (j / rSegs) * Math.PI * 2;
          const nx = Math.cos(a), ny = Math.sin(a) * 0.82, nz = Math.sin(a) * 0.58;
          pts.push([cx + nx * rad, cy + ny * rad, cz + nz * rad]);
          nms.push([nx, ny, nz]);
        }
        tRings.push(pts); tNorms.push(nms); tU.push(u);
      }
      for (let i = 0; i < segs; i++) {
        const u0 = tU[i], u1 = tU[i + 1];
        const col0 = u0 > 0.56 ? tipRed : white, col1 = u1 > 0.56 ? tipRed : white;
        for (let j = 0; j < rSegs; j++) {
          const j1 = (j + 1) % rSegs;
          const p00 = tRings[i][j], p10 = tRings[i][j1], p11 = tRings[i + 1][j1], p01 = tRings[i + 1][j];
          const n00 = tNorms[i][j], n10 = tNorms[i][j1], n11 = tNorms[i + 1][j1], n01 = tNorms[i + 1][j];
          fb.addTriSmooth(p00, p01, p11, n00, n01, n11, col0, col1, col1, [12.0, u0, 0.14 + u0 * 0.84, t / 9], [12.0, u1, 0.14 + u1 * 0.84, t / 9], [12.0, u1, 0.14 + u1 * 0.84, t / 9]);
          fb.addTriSmooth(p00, p11, p10, n00, n11, n10, col0, col1, col0, [12.0, u0, 0.14 + u0 * 0.84, t / 9], [12.0, u1, 0.14 + u1 * 0.84, t / 9], [12.0, u0, 0.14 + u0 * 0.84, t / 9]);
        }
      }
    }
    return fb.finish();
  }

  // CREATURE 5: 《山海經・九色靈鹿》Serene White-Gold Antlered Cliff Spirit Stag!
  function buildSpiritStag() {
    const sb = createSolidBuilder(2048);
    const white = [0.95, 0.92, 0.84], gold = [0.96, 0.78, 0.34];
    // Graceful slender stag body, neck & head
    sb.addTaperedTube([[0, 2.0, -1.25], [0, 2.1, 0.0], [0, 2.25, 1.15]], [0.42, 0.56, 0.48], 7, white, 2.0);
    sb.addTaperedTube([[0, 2.25, 1.05], [0, 3.45, 1.55], [0, 3.65, 2.15]], [0.34, 0.22, 0.11], 6, white, 2.0);
    // 4 slender legs
    for (const sx of [-0.32, 0.32]) for (const sz of [-0.95, 0.95]) {
      sb.addTaperedTube([[sx, 1.95, sz], [sx * 0.95, 0.95, sz * 1.02], [sx * 0.9, -0.1, sz]], [0.14, 0.09, 0.07], 5, white, 2.0);
    }
    // Glowing Liquid-Gold Branching Antler Crown (matId 4.0 -> subtle golden bloom!)
    for (const s of [-1, 1]) {
      sb.addTaperedTube([[s * 0.16, 3.65, 1.65], [s * 0.72, 4.75, 1.45], [s * 1.25, 5.75, 1.15]], [0.07, 0.05, 0.02], 5, gold, 4.0);
      sb.addTaperedTube([[s * 0.65, 4.6, 1.48], [s * 1.12, 5.25, 1.92]], [0.045, 0.018], 4, gold, 4.0);
      sb.addTaperedTube([[s * 0.42, 4.2, 1.55], [s * 0.32, 5.25, 1.28]], [0.045, 0.018], 4, gold, 4.0);
    }
    return sb.finish();
  }

  // CREATURE 6: 《山海經・文鰩錦鯉》Sleek Leaping Vermilion-Gold Spirit Koi / Flying Fish!
  function buildKoi() {
    const kb = createSolidBuilder(1024);
    const verm = [0.92, 0.24, 0.15], gold = [0.98, 0.80, 0.38], white = [0.96, 0.93, 0.86];
    kb.addTaperedTube([[0, 0, 1.3], [0, 0.06, 0.45], [0, 0.02, -0.55], [0, 0, -1.55]], [0.05, 0.32, 0.22, 0.04], 6, verm, 2.0);
    // Flowing golden pectoral fins & bifurcated tail
    for (const s of [-1, 1]) {
      kb.addTri([0, 0.02, 0.5], [s * 1.05, 0.08, -0.15], [0, 0.0, -0.25], gold, 4.0);
      kb.addTri([0, 0.0, -1.45], [s * 0.55, 0.18, -2.35], [0, 0.0, -1.85], white, 2.0);
    }
    return kb.finish();
  }

  // CREATURE 7 & BOATS: Lone Ink Boatman (孤舟簑笠翁) & Ink Crane (丹頂墨鶴)
  function buildLoneBoatman() {
    const sb = createSolidBuilder(2048);
    const hullInk = [0.09, 0.11, 0.14], deckInk = [0.16, 0.16, 0.17], segs = 12, len = 6.2;
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs, t1 = (i + 1) / segs, z0 = (t0 - 0.5) * len, z1 = (t1 - 0.5) * len;
      const w0 = Math.sin(t0 * Math.PI) * 0.78 + 0.05, w1 = Math.sin(t1 * Math.PI) * 0.78 + 0.05;
      const yUp0 = 0.28 + Math.pow(Math.abs(t0 - 0.5) * 2, 2.3) * 0.68, yUp1 = 0.28 + Math.pow(Math.abs(t1 - 0.5) * 2, 2.3) * 0.68;
      const yBot0 = -0.14 + Math.pow(Math.abs(t0 - 0.5) * 2, 2.6) * 0.42, yBot1 = -0.14 + Math.pow(Math.abs(t1 - 0.5) * 2, 2.6) * 0.42;
      sb.addQuad([-w0 * 0.84, yUp0 - 0.10, z0], [w0 * 0.84, yUp0 - 0.10, z0], [w1 * 0.84, yUp1 - 0.10, z1], [-w1 * 0.84, yUp1 - 0.10, z1], deckInk, 2.0, 1, 1, 0.8, 0.8);
      sb.addQuad([-w0 * 0.60, yBot0, z0], [-w0, yUp0, z0], [-w1, yUp1, z1], [-w1 * 0.60, yBot1, z1], hullInk, 2.0, 1, 1, 0.65, 0.85);
      sb.addQuad([w0, yUp0, z0], [w0 * 0.60, yBot0, z0], [w1 * 0.60, yBot1, z1], [w1, yUp1, z1], hullInk, 2.0, 1, 1, 0.85, 0.65);
    }
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * Math.PI, a1 = ((i + 1) / 8) * Math.PI;
      sb.addQuad([Math.cos(a0) * 0.68, 0.28 + Math.sin(a0) * 0.72, -1.25], [Math.cos(a0) * 0.68, 0.28 + Math.sin(a0) * 0.72, 0.45],
                 [Math.cos(a1) * 0.68, 0.28 + Math.sin(a1) * 0.72, 0.45],  [Math.cos(a1) * 0.68, 0.28 + Math.sin(a1) * 0.72, -1.25], hullInk, 2.0, 1, 1, 0.7, 0.9);
    }
    sb.addCylinder(0.05, 0.32, -1.75, 0.26, 0.13, 1.15, 7, [0.11, 0.13, 0.16], 2.0, 0.8, 0.95);
    sb.addOctagonalRoof(0.05, 1.44, -1.75, 0.46, 0.22, 0.0, false, [0.42, 0.34, 0.22]);
    sb.addTaperedTube([[0.22, 1.05, -1.55], [0.68, 0.42, -2.15], [0.92, -0.05, -2.55]], [0.03, 0.025, 0.045], 5, hullInk, 2.0);
    sb.addTaperedTube([[0, 0.62, 2.25], [0, 1.42, 2.68], [0, 1.62, 3.02]], [0.035, 0.025, 0.02], 5, hullInk, 2.0);
    sb.addLantern(0, 1.24, 3.02, 0.96);
    return sb.finish();
  }

  function buildCrane() {
    const cb = createSolidBuilder(512);
    const white = [0.96, 0.93, 0.86], ink = [0.08, 0.10, 0.13], red = [0.84, 0.18, 0.14];
    cb.addTaperedTube([[0, 0, -0.85], [0, 0.05, 0], [0, 0.09, 1.1], [0, 0.05, 1.48]], [0.05, 0.19, 0.06, 0.025], 5, white, 2.0);
    cb.addBox(0, 0.14, 1.08, 0.08, 0.06, 0.13, 0, red, 2.0, 0.9, 1.0);
    for (const side of [-1, 1]) {
      const p0 = [0, 0.05, 0.32], p1 = [0, 0.05, -0.32], p2 = [side * 1.15, 0.22, -0.14], p3 = [side * 1.15, 0.22, 0.30];
      const p4 = [side * 2.15, 0.08, -0.40], p5 = [side * 2.15, 0.08, 0.04], n = [0, 1, 0];
      cb.addTriSmooth(p0, p1, p2, n, n, n, white, white, white, [9.0, 0, 0.0, 1], [9.0, 0, 0.0, 1], [9.0, 0, 0.55, 1]);
      cb.addTriSmooth(p0, p2, p3, n, n, n, white, white, white, [9.0, 0, 0.0, 1], [9.0, 0, 0.55, 1], [9.0, 0, 0.55, 1]);
      cb.addTriSmooth(p3, p2, p4, n, n, n, ink, ink, ink, [9.0, 0, 0.55, 1], [9.0, 0, 0.55, 1], [9.0, 0, 1.0, 1]);
      cb.addTriSmooth(p3, p4, p5, n, n, n, ink, ink, ink, [9.0, 0, 0.55, 1], [9.0, 0, 1.0, 1], [9.0, 0, 1.0, 1]);
    }
    return cb.finish();
  }

  /* ==========================================================================
     6. Vast Terrain (210x210), Infinite Mirror Water, 6 Waterfalls, Mist Clouds & Particles
     ========================================================================== */
  function buildTerrain(solid) {
    const N = 204;
    const minX = -215, maxX = 215, minZ = -305, maxZ = 135;
    const dx = (maxX - minX) / N, dz = (maxZ - minZ) / N;
    const pts = [], nrm = [];
    for (let iz = 0; iz <= N; iz++) {
      const z = minZ + iz * dz, pr = [], nr = [];
      for (let ix = 0; ix <= N; ix++) {
        const x = minX + ix * dx;
        pr.push([x, terrainHeight(x, z), z]);
        nr.push(terrainNormal(x, z));
      }
      pts.push(pr); nrm.push(nr);
    }
    const baseCol = [0.12, 0.26, 0.34];
    for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) {
      const p00 = pts[iz][ix], p10 = pts[iz][ix + 1], p11 = pts[iz + 1][ix + 1], p01 = pts[iz + 1][ix];
      if (p00[1] < -1.8 && p10[1] < -1.8 && p11[1] < -1.8 && p01[1] < -1.8) continue;
      const n00 = nrm[iz][ix], n10 = nrm[iz][ix + 1], n11 = nrm[iz + 1][ix + 1], n01 = nrm[iz + 1][ix];
      const a00 = 0.65 + 0.35 * smoothstep(-1, 20, p00[1]), a10 = 0.65 + 0.35 * smoothstep(-1, 20, p10[1]);
      const a11 = 0.65 + 0.35 * smoothstep(-1, 20, p11[1]), a01 = 0.65 + 0.35 * smoothstep(-1, 20, p01[1]);
      solid.addTriSmooth(p00, p01, p11, n00, n01, n11, baseCol, baseCol, baseCol, [0, p00[0] * 0.04, p00[2] * 0.04, a00], [0, p01[0] * 0.04, p01[2] * 0.04, a01], [0, p11[0] * 0.04, p11[2] * 0.04, a11]);
      solid.addTriSmooth(p00, p11, p10, n00, n11, n10, baseCol, baseCol, baseCol, [0, p00[0] * 0.04, p00[2] * 0.04, a00], [0, p11[0] * 0.04, p11[2] * 0.04, a11], [0, p10[0] * 0.04, p10[2] * 0.04, a10]);
    }
  }

  function buildWater() {
    const N = 104, minX = -320, maxX = 320, minZ = -360, maxZ = 220;
    const dx = (maxX - minX) / N, dz = (maxZ - minZ) / N, verts = [];
    for (let iz = 0; iz < N; iz++) {
      const z0 = minZ + iz * dz, z1 = z0 + dz;
      for (let ix = 0; ix < N; ix++) {
        const x0 = minX + ix * dx, x1 = x0 + dx;
        verts.push(x0, 0, z0, 1, 0, 0, x0, 0, z1, 0, 1, 0, x1, 0, z1, 0, 0, 1, x0, 0, z0, 1, 0, 0, x1, 0, z1, 0, 1, 0, x1, 0, z0, 0, 0, 1);
      }
    }
    return { data: new Float32Array(verts), count: verts.length / 6 };
  }

  function buildWaterfall() {
    const wb = createSolidBuilder(3072);
    const streams = [
      { x:  31.0, z:  -37.0, w: 3.6, topY: 27.0, botY: 0.2, curve:  4.5 },
      { x:  34.0, z:  -39.5, w: 2.0, topY: 24.0, botY: 0.2, curve:  3.4 },
      { x: -30.5, z:  -34.0, w: 2.2, topY: 22.0, botY: 0.2, curve: -3.2 },
      { x: -46.0, z: -176.0, w: 4.4, topY: 46.0, botY: 0.2, curve: -6.2 }, // Mount Buzhou Left Cascade
      { x:  47.0, z: -178.0, w: 4.4, topY: 48.0, botY: 0.2, curve:  6.2 }, // Mount Buzhou Right Cascade
      { x: 118.0, z: -112.0, w: 3.8, topY: 36.0, botY: 0.2, curve:  5.0 }  // Eastern Phoenix Spire Cascade
    ];
    const col = [0.95, 0.94, 0.89];
    streams.forEach((st, idx) => {
      const segs = 20, dir = st.curve >= 0 ? -1 : 1;
      for (let i = 0; i < segs; i++) {
        const v0 = i / segs, v1 = (i + 1) / segs, y0 = mix(st.topY, st.botY, v0), y1 = mix(st.topY, st.botY, v1);
        const o0 = Math.pow(v0, 0.72) * Math.abs(st.curve) * dir, o1 = Math.pow(v1, 0.72) * Math.abs(st.curve) * dir;
        const w0 = st.w * (0.62 + 0.60 * v0), w1 = st.w * (0.62 + 0.60 * v1);
        const p00 = [st.x + o0, y0, st.z - w0 * 0.5], p10 = [st.x + o0, y0, st.z + w0 * 0.5];
        const p11 = [st.x + o1, y1, st.z + w1 * 0.5], p01 = [st.x + o1, y1, st.z - w1 * 0.5];
        const n = [dir * 0.85, 0.25, 0.45];
        wb.addTriSmooth(p00, p01, p11, n, n, n, col, col, col, [6, 0, v0, idx], [6, 0, v1, idx], [6, 1, v1, idx]);
        wb.addTriSmooth(p00, p11, p10, n, n, n, col, col, col, [6, 0, v0, idx], [6, 1, v1, idx], [6, 1, v0, idx]);
      }
    });
    return wb.finish();
  }

  function buildClouds() {
    const arr = []; let count = 0;
    function addR(cx, cy, cz, rx, ry, op, seed, tier) {
      const c = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
      for (let i = 0; i < 6; i++) arr.push(cx, cy, cz, c[i][0], c[i][1], rx, ry, op, seed, tier);
      count++;
    }
    // 145 layered mist cloud ribbons blanketing ALL 4 realms (from South +90 to Deep North -280 and West -170 to East +170!)
    for (let i = 0; i < 135; i++) {
      const s = i * 17.31 + 3.7;
      const x = (hash2(s, 1.3) * 2 - 1) * 185.0;
      const z = mix(-275, 92, hash2(s, 2.7));
      // Keep immediate opening bridge foreground crystal clear!
      if (z > -32 && z < 35 && Math.abs(x) < 22) continue;
      const y = mix(3.5, 34.0, hash2(s, 3.9));
      const rx = mix(18.0, 42.0, hash2(s, 4.9));
      const ry = rx * mix(0.24, 0.38, hash2(s, 5.1));
      addR(x, y, z, rx, ry, mix(0.32, 0.56, hash2(s, 6.2)), hash2(s, 7.4) * 100.0, i % 3);
    }
    return { data: new Float32Array(arr), count: count * 6 };
  }

  function buildParticles() {
    // 1,650 Particles: 0=Kun gold, 1=Kun smoke, 2=3D Crimson Petals across all realms, 3=Dragon gold-jade cloud sparks!
    const total = 1650, arr = new Float32Array(total * 6);
    for (let i = 0; i < total; i++) {
      const s = i * 11.17 + 0.5;
      const kind = i < 380 ? 0.0 : (i < 620 ? 1.0 : (i < 1220 ? 2.0 : 3.0));
      arr[i * 6 + 0] = hash2(s, 1.3);
      arr[i * 6 + 1] = hash2(s, 2.7);
      arr[i * 6 + 2] = hash2(s, 3.9);
      arr[i * 6 + 3] = hash2(s, 4.1) * Math.PI * 2;
      arr[i * 6 + 4] = kind === 1.0 ? mix(10, 24, hash2(s, 5.3)) : (kind === 2.0 ? mix(5, 11, hash2(s, 5.3)) : mix(4.5, 11.5, hash2(s, 5.3)));
      arr[i * 6 + 5] = kind;
    }
    return { data: arr, count: total };
  }

  /* ==========================================================================
     7. Master 4-Realm World Assembly
     ========================================================================== */
  function buildWorld() {
    const solid = createSolidBuilder(196608);
    const foliage = createFoliageBuilder();

    // 1. Vast 4-Realm Karst Archipelago
    buildTerrain(solid);

    // 2. Architectural Landmarks Across All 4 Realms
    buildMoonRainbowBridge(solid);                           // Realm 1: 汴水虹橋
    addCliffPavilion(solid, -16.8, -18.5, 0.42, 2, 1.04);    // Realm 1: 臨江飛閣
    addPagoda(solid, 32.5, -52.5, 5, 1.15);                  // Realm 2: 雲頂孤塔
    buildCloudSkyBridge(solid);                              // Realm 2: 蓬萊仙橋
    buildCelestialStoneGate(solid);                          // Realm 3: 75m 不周天門巨拱!
    addPagoda(solid, 0.0, -242.0, 7, 1.65);                  // Realm 3: 天壇七重墨塔!
    buildWaterPaifang(solid, -84.0, -78.0, 0.55);            // Realm 4A: 青丘臨水古牌坊!
    addCliffPavilion(solid, -98.0, -84.0, 0.72, 2, 1.08);    // Realm 4A: 青丘丹楓閣!
    addCliffPavilion(solid, 102.0, -92.0, -0.58, 2, 1.12);   // Realm 4B: 丹山朝陽閣!
    addOctagonalPavilion(solid, -16.0, 46.0, 1.05);          // South: 南岸望月亭!

    // Floating Water-Lotus River Lanterns (河燈 — casts warm crimson reflections across the grand sea!)
    const riverLanterns = [
      [-6.5, -6.0], [5.8, -11.5], [-4.2, -32.0], [7.2, -42.0],
      [-76.0, -70.0], [-88.0, -92.0], [82.0, -82.0], [92.0, -104.0],
      [-14.0, -162.0], [14.0, -166.0], [-8.0, -208.0], [10.0, -212.0]
    ];
    riverLanterns.forEach(([lx, lz]) => {
      solid.addCylinder(lx, 0.02, lz, 0.42, 0.34, 0.08, 7, [0.78, 0.22, 0.16], 2.0, 0.8, 1.0);
      solid.addLantern(lx, 0.36, lz, 0.78);
    });

    // 3. Curated Calligraphic Pines & Cinnabar Maples Across All 4 Realms
    const trees = [
      // Realm 1 & 2 (Central Bridge & Penglai Gorge)
      { x: -20.2, z: -21.5, s: 1.08, lean:  0.9, c: true  },
      { x:  17.2, z: -21.0, s: 1.15, lean: -0.9, c: true  },
      { x:  15.6, z: -17.5, s: 0.92, lean: -0.8, c: false },
      { x: -13.8, z: -21.8, s: 0.96, lean:  0.8, c: false },
      { x: -33.5, z: -31.5, s: 1.38, lean:  1.0, c: false },
      { x: -41.0, z: -26.5, s: 1.32, lean:  0.8, c: false },
      { x:  34.5, z: -34.0, s: 1.42, lean: -1.0, c: false },
      { x:  29.5, z: -50.5, s: 1.30, lean: -0.8, c: false },
      { x:  35.8, z: -50.8, s: 1.15, lean:  0.8, c: true  },
      { x: -23.0, z: -115.0, s: 1.45, lean:  0.9, c: false },
      { x:  23.5, z: -117.0, s: 1.45, lean: -0.9, c: true  },
      // Realm 3 (Mount Buzhou Dragon Gate & Imperial Pagoda Island)
      { x: -48.0, z: -174.0, s: 1.75, lean:  1.0, c: false },
      { x:  49.0, z: -176.0, s: 1.75, lean: -1.0, c: false },
      { x:  -9.0, z: -236.0, s: 1.48, lean:  0.8, c: true  },
      { x:   9.5, z: -237.0, s: 1.48, lean: -0.8, c: false },
      // Realm 4A (Qingqiu Cinnabar Maple Isles — blazing autumn sanctuary for the Nine-Tailed Foxes!)
      { x: -104.0, z: -88.0, s: 1.38, lean:  0.9, c: true  },
      { x:  -93.0, z: -88.5, s: 1.25, lean: -0.8, c: true  },
      { x: -102.0, z: -78.0, s: 1.22, lean:  0.8, c: true  },
      { x: -118.0, z: -56.0, s: 1.28, lean:  0.9, c: true  },
      { x: -112.0, z: -48.0, s: 1.20, lean: -0.8, c: false },
      { x:  -84.0, z: -110.0, s: 1.45, lean: 0.9, c: true  },
      // Realm 4B (Eastern Phoenix Sun Spires)
      { x:   97.0, z: -96.0, s: 1.35, lean: -0.9, c: true  },
      { x:  108.0, z: -89.0, s: 1.32, lean:  0.8, c: false },
      { x:  114.0, z: -50.0, s: 1.28, lean: -0.8, c: true  },
      { x:  124.0, z: -112.0, s: 1.55, lean: -0.9, c: false },
      // South
      { x: -18.5, z:  47.5, s: 1.18, lean:  0.8, c: true  },
      { x: -36.5, z:  24.5, s: 1.35, lean:  0.9, c: false },
      { x:  38.5, z:  23.0, s: 1.35, lean: -0.9, c: false }
    ];
    trees.forEach((t, idx) => addCalligraphicPine(solid, foliage, t.x, t.z, t.s, t.lean, (idx % 3 - 1) * 0.2, idx + 3, t.c));

    // 4. Build All 7 Living Creature Archetype Meshes!
    const solidMesh     = solid.finish();
    const waterMesh     = buildWater();
    const foliageMesh   = foliage.finish();
    const waterfallMesh = buildWaterfall();
    const kunMesh       = buildKun();
    const dragonMesh    = buildYinglongDragon();
    const phoenixMesh   = buildPhoenix();
    const foxMesh       = buildNineTailFox();
    const stagMesh      = buildSpiritStag();
    const koiMesh       = buildKoi();
    const boatmanMesh   = buildLoneBoatman();
    const craneMesh     = buildCrane();
    const cloudsMesh    = buildClouds();
    const particlesMesh = buildParticles();

    const totalTris = Math.round(
      (solidMesh.count + waterMesh.count + foliageMesh.count + waterfallMesh.count +
       kunMesh.count * 2 + dragonMesh.count + phoenixMesh.count * 3 + foxMesh.count * 2 +
       stagMesh.count * 2 + koiMesh.count * 28 + boatmanMesh.count * 4 + craneMesh.count * 18 + cloudsMesh.count) / 3
    );

    return {
      solid: solidMesh, water: waterMesh, foliage: foliageMesh, waterfall: waterfallMesh,
      kun: kunMesh, dragon: dragonMesh, phoenix: phoenixMesh, fox: foxMesh,
      stag: stagMesh, koi: koiMesh, boatman: boatmanMesh, crane: craneMesh,
      clouds: cloudsMesh, particles: particlesMesh,
      stats: { totalTris }
    };
  }

  return { BRIDGE_Z, riverCenterX, terrainHeight, bridgeArchY, buildWorld };
})();
