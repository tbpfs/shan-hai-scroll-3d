/**
 * 《山海汴京圖》v3 — Fine-Art Splash-Ink Song-Dynasty World Sculptor
 * Designed for pure painterly aesthetics: ZERO muddy dirt terrain, monumental layered karst peaks
 * rising directly out of infinite mirror ink-water & luminous Xuan-paper mist, poetic silhouettes
 * (arched moon-bridge, lone bamboo-hat boatman, cliffside pavilion, cloud pagoda, calligraphic pines,
 * drifting crimson petals, and the colossal splash-ink Spirit Kun).
 *
 * 100% Zero-Dependency Procedural WebGL2 — Autonomously built by Gemini 4 Neon
 */
const ShanHaiGeometry = (() => {
  "use strict";

  /* ==========================================================================
     1. Deterministic Noise, Ridged Karst Math & World Layout
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
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
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
      f *= 2.05;
      a *= 0.5;
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
      f *= 2.15;
      a *= 0.48;
    }
    return v;
  }

  const BRIDGE_Z = -19.0;

  function riverCenterX(z) {
    return Math.sin((z + 19.0) * 0.022) * 3.8;
  }

  function riverHalfWidth(z) {
    // Vast infinite mirror ink sea! Only narrows gracefully at the two rocky bridge abutments!
    const bridgePinch = Math.exp(-Math.pow((z - BRIDGE_Z) / 9.5, 2.0));
    return 24.0 - bridgePinch * 13.8;
  }

  /**
   * Composed 7-Layer Song-Dynasty Karst Ridges (千里江山圖 × 黃山奇峰)
   * Each peak uses rotated elongated ridge axes + stepped shoulder crags -> ZERO smooth cones!
   */
  const KARST_PEAKS = [
    // Layer 1: Sculptural Craggy Ink Rocks anchoring the Rainbow Bridge & Cliff Pavilion
    { x: -16.8, z: -18.5, h:  8.6, rx:  7.8, rz:  7.4, rot:  0.35, sharp: 1.42, flatTop: 4.9 }, // Left bridge crag
    { x:  16.8, z: -19.2, h:  7.2, rx:  7.6, rz:  6.8, rot: -0.28, sharp: 1.48, flatTop: 0.0 }, // Right bridge crag (encloses right abutment!)
    { x:  22.5, z: -22.0, h: 10.5, rx:  6.2, rz:  7.5, rot:  0.42, sharp: 1.55, flatTop: 0.0 }, // Right crag secondary shoulder

    // Layer 2: Dramatic Asymmetric Midground Karst Ranges (multi-shouldered Huangshan ridges!)
    { x: -38.0, z: -34.0, h: 35.0, rx: 18.0, rz: 12.0, rot:  0.52, sharp: 1.58, flatTop: 0.0 },
    { x: -49.0, z: -27.0, h: 24.0, rx: 13.0, rz: 11.0, rot: -0.35, sharp: 1.50, flatTop: 0.0 },
    { x: -60.0, z: -14.0, h: 27.0, rx: 17.5, rz: 12.5, rot:  0.25, sharp: 1.48, flatTop: 0.0 },
    { x:  40.0, z: -38.0, h: 38.5, rx: 17.5, rz: 12.5, rot: -0.48, sharp: 1.62, flatTop: 0.0 }, // Right Waterfall Monolith!
    { x:  53.0, z: -31.0, h: 28.0, rx: 14.5, rz: 12.0, rot:  0.32, sharp: 1.52, flatTop: 0.0 },
    { x:  60.0, z: -15.0, h: 26.5, rx: 17.0, rz: 13.0, rot: -0.22, sharp: 1.48, flatTop: 0.0 },

    // Layer 3: Monumental Twin Celestial Karst Spires with broad rocky shoulders framing the Vermilion Sun!
    { x: -31.0, z: -72.0, h: 58.0, rx: 24.0, rz: 15.0, rot:  0.42, sharp: 1.62, flatTop: 0.0 },
    { x: -19.0, z: -76.0, h: 36.0, rx: 14.0, rz: 12.0, rot: -0.30, sharp: 1.55, flatTop: 0.0 },
    { x: -64.0, z: -60.0, h: 49.0, rx: 25.0, rz: 17.0, rot:  0.28, sharp: 1.52, flatTop: 0.0 },
    { x:  34.0, z: -78.0, h: 64.0, rx: 25.0, rz: 16.0, rot: -0.38, sharp: 1.65, flatTop: 0.0 },
    { x:  21.0, z: -82.0, h: 38.0, rx: 15.0, rz: 12.5, rot:  0.35, sharp: 1.58, flatTop: 0.0 },
    { x:  66.0, z: -64.0, h: 51.0, rx: 26.0, rz: 18.0, rot: -0.24, sharp: 1.50, flatTop: 0.0 },

    // Layer 4: Receding Layered Horizon Veils (clear valley pass at x=+4..+14 for Imperial Vermilion Sun!)
    { x: -18.0, z: -102.0, h: 43.0, rx: 20.0, rz: 13.0, rot:  0.32, sharp: 1.52, flatTop: 0.0 },
    { x:  24.0, z: -106.0, h: 46.0, rx: 21.0, rz: 13.5, rot: -0.36, sharp: 1.54, flatTop: 0.0 },
    { x: -54.0, z: -116.0, h: 56.0, rx: 32.0, rz: 18.0, rot:  0.18, sharp: 1.40, flatTop: 0.0 },
    { x:  -2.0, z: -126.0, h: 25.0, rx: 26.0, rz: 15.0, rot:  0.15, sharp: 1.28, flatTop: 0.0 },
    { x:  56.0, z: -118.0, h: 58.0, rx: 32.0, rz: 18.0, rot: -0.20, sharp: 1.42, flatTop: 0.0 },

    // Layer 5: Multi-Shouldered Southern Karst Gorge behind Spawn (for rich 360° & 180° lookback!)
    { x: -42.0, z:  24.0, h: 24.5, rx: 18.0, rz: 13.0, rot: -0.45, sharp: 1.52, flatTop: 0.0 },
    { x: -50.0, z:  35.0, h: 19.0, rx: 14.0, rz: 12.0, rot:  0.30, sharp: 1.48, flatTop: 0.0 },
    { x:  44.0, z:  22.0, h: 26.5, rx: 18.5, rz: 13.5, rot:  0.42, sharp: 1.55, flatTop: 0.0 },
    { x: -25.0, z:  64.0, h: 38.0, rx: 22.0, rz: 14.5, rot: -0.36, sharp: 1.56, flatTop: 0.0 },
    { x:  28.0, z:  66.0, h: 41.0, rx: 23.0, rz: 15.0, rot:  0.38, sharp: 1.58, flatTop: 0.0 },
    { x:   2.0, z:  84.0, h: 28.0, rx: 24.0, rz: 14.0, rot: -0.25, sharp: 1.42, flatTop: 0.0 },
    { x: -16.0, z:  46.0, h:  5.8, rx:  8.8, rz:  8.4, rot:  0.25, sharp: 1.40, flatTop: 2.9 } // Southern Moonlight Ferry Crag
  ];

  function terrainHeight(x, z) {
    let h = -2.4;
    // Dramatic anisotropic Chinese karst crag relief + stepped cliff strata (kills smooth cone look!)
    const rLow  = ridged(x * 0.052 + 3.1, z * 0.052 - 4.7, 4);
    const rHigh = ridged(x * 0.125 - 2.3, z * 0.125 + 6.1, 3);
    const cragTex = 0.58 + 0.56 * rLow + 0.24 * rHigh;

    for (let i = 0; i < KARST_PEAKS.length; i++) {
      const p = KARST_PEAKS[i];
      const co = Math.cos(p.rot || 0), si = Math.sin(p.rot || 0);
      const ux = (x - p.x), uz = (z - p.z);
      const rx = (ux * co + uz * si) / p.rx;
      const rz = (-ux * si + uz * co) / p.rz;
      // Organic angular warping of the ridge spine so silhouettes are asymmetrical & jagged!
      const warp = (fbm(x * 0.045 + i * 2.1, z * 0.045 - i * 1.7, 2) - 0.5) * 0.42;
      const d2 = (rx + warp) * (rx + warp) + (rz - warp * 0.7) * (rz - warp * 0.7);
      if (d2 < 3.8) {
        const raw = Math.exp(-Math.pow(d2, 0.90) * p.sharp);
        const isHeroCrag = (i < 2 || i === KARST_PEAKS.length - 1);
        let elev = -2.4 + (p.h + 2.4) * raw * (isHeroCrag ? (0.76 + 0.36 * rLow + 0.16 * rHigh) : cragTex);
        // Subtle Song mountain horizontal rock-terrace stepping on steep slopes
        if (!isHeroCrag && elev > 6.0) {
          elev += Math.sin(elev * 0.55 + rLow * 3.0) * 0.75;
        }
        if (p.flatTop > 0.1) {
          const plateauT = smoothstep(0.42, 0.12, d2);
          elev = mix(elev, p.flatTop, plateauT * 0.85);
        }
        h = Math.max(h, elev);
      }
    }

    // Broad sculpted rocky mountain shoulder for the Distant Cloud Pagoda (32.5, -52.5) so it sits solidly!
    const dPag = Math.hypot(x - 32.5, z - (-52.5));
    if (dPag < 12.5) {
      const pagMountain = -2.4 + 24.5 * Math.exp(-Math.pow(dPag / 7.5, 1.9)) * (0.82 + 0.30 * rLow);
      const flat = smoothstep(5.5, 2.5, dPag);
      h = Math.max(h, mix(pagMountain, 20.8, flat * 0.85));
    }

    // Keep immediate water corridor right under the Rainbow Bridge deep & clean!
    const distRiver = Math.abs(x - riverCenterX(z));
    if (Math.abs(z - BRIDGE_Z) < 12.0 && distRiver < 10.5) {
      const clear = smoothstep(10.5, 7.6, distRiver);
      h = mix(h, -2.4, clear);
    }

    // Keep opening spawn waters (z in [6..36], |x| < 18) 100% open serene mirror lake!
    if (z > 4.0 && z < 38.0 && distRiver < 18.0) {
      const open = smoothstep(18.0, 12.0, distRiver) * smoothstep(4.0, 9.0, z) * smoothstep(38.0, 32.0, z);
      h = mix(h, -2.4, open);
    }

    return h;
  }

  function terrainNormal(x, z) {
    const e = 0.65;
    const hL = terrainHeight(x - e, z);
    const hR = terrainHeight(x + e, z);
    const hD = terrainHeight(x, z - e);
    const hU = terrainHeight(x, z + e);
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
  function createSolidBuilder(initialCap = 65536) {
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

    function addTaperedTube(pts, radii, segs, c, matId) {
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
        for (let i = 0; i < segs; i++) {
          const t0 = (i / segs) * Math.PI * 2, t1 = ((i + 1) / segs) * Math.PI * 2;
          const ca = Math.cos(t0), sa = Math.sin(t0), cb = Math.cos(t1), sb = Math.sin(t1);
          const n0 = [rx * ca + ux * sa, ry * ca + uy * sa, rz * ca + uz * sa];
          const n1 = [rx * cb + ux * sb, ry * cb + uy * sb, rz * cb + uz * sb];
          const p00 = [a[0] + n0[0] * rA, a[1] + n0[1] * rA, a[2] + n0[2] * rA];
          const p10 = [a[0] + n1[0] * rA, a[1] + n1[1] * rA, a[2] + n1[2] * rA];
          const p11 = [b[0] + n1[0] * rB, b[1] + n1[1] * rB, b[2] + n1[2] * rB];
          const p01 = [b[0] + n0[0] * rB, b[1] + n0[1] * rB, b[2] + n0[2] * rB];
          addTriSmooth(p00, p10, p11, n0, n1, n1, c, c, c, [matId, i / segs, 0, 0.85], [matId, (i + 1) / segs, 0, 0.85], [matId, (i + 1) / segs, 1, 0.95]);
          addTriSmooth(p00, p11, p01, n0, n1, n0, c, c, c, [matId, i / segs, 0, 0.85], [matId, (i + 1) / segs, 1, 0.95], [matId, i / segs, 1, 0.95]);
        }
      }
    }

    function addLantern(x, y, z, scale = 1.0) {
      const r = 0.25 * scale, h = 0.44 * scale;
      addCylinder(x, y + h * 0.48, z, r * 0.45, r * 0.16, 0.15 * scale, 6, [0.10, 0.11, 0.13], 2.0, 0.7, 0.9);
      addCylinder(x, y - h * 0.62, z, r * 0.16, r * 0.45, 0.12 * scale, 6, [0.10, 0.11, 0.13], 2.0, 0.7, 0.9);
      // Warm cinnabar-amber glowing silk lantern (focal accent!)
      const segs = 8;
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
        const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
        const mR = r * 1.18, tR = r * 0.60;
        const pB0 = [x + c0 * tR, y - h * 0.5, z + s0 * tR], pB1 = [x + c1 * tR, y - h * 0.5, z + s1 * tR];
        const pM0 = [x + c0 * mR, y, z + s0 * mR], pM1 = [x + c1 * mR, y, z + s1 * mR];
        const pT0 = [x + c0 * tR, y + h * 0.5, z + s0 * tR], pT1 = [x + c1 * tR, y + h * 0.5, z + s1 * tR];
        const lc = [1.0, 0.44, 0.18]; // Radiant warm cinnabar lantern glow!
        const n0 = [c0, 0, s0], n1 = [c1, 0, s1];
        addTriSmooth(pB0, pB1, pM1, n0, n1, n1, lc, lc, lc, [4.0, 0.5, 0.2, 1.0], [4.0, 0.5, 0.2, 1.0], [4.0, 0.5, 0.5, 1.0]);
        addTriSmooth(pB0, pM1, pM0, n0, n1, n0, lc, lc, lc, [4.0, 0.5, 0.2, 1.0], [4.0, 0.5, 0.5, 1.0], [4.0, 0.5, 0.5, 1.0]);
        addTriSmooth(pM0, pM1, pT1, n0, n1, n1, lc, lc, lc, [4.0, 0.5, 0.5, 1.0], [4.0, 0.5, 0.5, 1.0], [4.0, 0.5, 0.8, 1.0]);
        addTriSmooth(pM0, pT1, pT0, n0, n1, n0, lc, lc, lc, [4.0, 0.5, 0.5, 1.0], [4.0, 0.5, 0.8, 1.0], [4.0, 0.5, 0.8, 1.0]);
      }
    }

    // Ultra-graceful fluttering Cinnabar Silk Pennant Ribbon (朱砂飄帶 — iconic fine-art accent!)
    function addSilkRibbon(x, y, z, len = 2.6, w = 0.22, dirX = 1.0) {
      const segs = 7;
      const col = [0.84, 0.18, 0.14];
      for (let i = 0; i < segs; i++) {
        const t0 = i / segs, t1 = (i + 1) / segs;
        const x0 = x + dirX * t0 * len * 0.35, x1 = x + dirX * t1 * len * 0.35;
        const y0 = y - t0 * len, y1 = y - t1 * len;
        const z0 = z + Math.sin(t0 * 4.5) * 0.15, z1 = z + Math.sin(t1 * 4.5) * 0.15;
        const hw0 = w * (1.0 - t0 * 0.45), hw1 = w * (1.0 - t1 * 0.45);
        addTriSmooth([x0 - hw0, y0, z0], [x0 + hw0, y0, z0], [x1 + hw1, y1, z1], [0, 0, 1], [0, 0, 1], [0, 0, 1], col, col, col,
          [8.0, t0, 0, 1], [8.0, t0, 1, 1], [8.0, t1, 1, 1]);
        addTriSmooth([x0 - hw0, y0, z0], [x1 + hw1, y1, z1], [x1 - hw1, y1, z1], [0, 0, 1], [0, 0, 1], [0, 0, 1], col, col, col,
          [8.0, t0, 0, 1], [8.0, t1, 1, 1], [8.0, t1, 0, 1]);
      }
    }

    /**
     * Sweeping Concave Song Curved Roof with Dramatic Razor-Graceful Upturned Eaves (飛檐翹角!)
     */
    function addSweepingRoof(cx, baseY, cz, halfW, halfD, roofH, rotY, eaveLift = 0.95, topFlat = 0.22) {
      const co = Math.cos(rotY), si = Math.sin(rotY);
      const tf = (lx, ly, lz) => [cx + lx * co + lz * si, baseY + ly, cz - lx * si + lz * co];
      const roofCol = [0.09, 0.14, 0.19]; // Deep velvety Song Sumi-Indigo ceramic tile!
      const goldCol = [0.84, 0.66, 0.32]; // Fine gold-leaf ridge accent!

      const N = 8;
      const evalRoof = (nx, nz) => {
        const ax = Math.abs(nx), az = Math.abs(nz);
        const r = Math.max(ax, az);
        const u = Math.max(0, (r - topFlat) / (1.0 - topFlat));
        let y = roofH * Math.pow(Math.max(0, 1.0 - u), 1.72);
        const cornerMask = Math.pow(Math.min(ax, az), 2.2) * Math.pow(r, 2.0);
        const flare = 1.0 + 0.17 * cornerMask;
        y += cornerMask * eaveLift;
        if (r < topFlat) y = roofH + (topFlat - r) * 0.22;
        return tf(nx * halfW * flare, y, nz * halfD * flare);
      };

      const grid = [];
      for (let iz = 0; iz <= N; iz++) {
        const row = [];
        for (let ix = 0; ix <= N; ix++) row.push(evalRoof((ix / N) * 2 - 1, (iz / N) * 2 - 1));
        grid.push(row);
      }
      const norms = [];
      for (let iz = 0; iz <= N; iz++) {
        const nrow = [];
        for (let ix = 0; ix <= N; ix++) {
          const pL = grid[iz][Math.max(0, ix - 1)], pR = grid[iz][Math.min(N, ix + 1)];
          const pD = grid[Math.max(0, iz - 1)][ix], pU = grid[Math.min(N, iz + 1)][ix];
          const dx = [pR[0] - pL[0], pR[1] - pL[1], pR[2] - pL[2]];
          const dz = [pU[0] - pD[0], pU[1] - pD[1], pU[2] - pD[2]];
          let nx = dz[1] * dx[2] - dz[2] * dx[1], ny = dz[2] * dx[0] - dz[0] * dx[2], nz = dz[0] * dx[1] - dz[1] * dx[0];
          if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
          const l = Math.hypot(nx, ny, nz) || 1;
          nrow.push([nx / l, ny / l, nz / l]);
        }
        norms.push(nrow);
      }

      for (let iz = 0; iz < N; iz++) {
        for (let ix = 0; ix < N; ix++) {
          const p00 = grid[iz][ix], p10 = grid[iz][ix + 1], p11 = grid[iz + 1][ix + 1], p01 = grid[iz + 1][ix];
          const n00 = norms[iz][ix], n10 = norms[iz][ix + 1], n11 = norms[iz + 1][ix + 1], n01 = norms[iz + 1][ix];
          const u0 = ix / N, u1 = (ix + 1) / N, v0 = iz / N, v1 = (iz + 1) / N;
          addTriSmooth(p00, p01, p11, n00, n01, n11, roofCol, roofCol, roofCol,
            [1.0, u0 * 14, v0 * 14, 0.92], [1.0, u0 * 14, v1 * 14, 0.92], [1.0, u1 * 14, v1 * 14, 0.92]);
          addTriSmooth(p00, p11, p10, n00, n11, n10, roofCol, roofCol, roofCol,
            [1.0, u0 * 14, v0 * 14, 0.92], [1.0, u1 * 14, v1 * 14, 0.92], [1.0, u1 * 14, v0 * 14, 0.92]);
        }
      }
      const ridgeLen = halfW * topFlat * 2.15;
      addBox(cx, baseY + roofH + 0.16, cz, ridgeLen, 0.24, 0.24, rotY, goldCol, 2.0, 0.9, 1.0);
      const chiL = tf(-ridgeLen * 0.52, roofH + 0.42, 0), chiR = tf(ridgeLen * 0.52, roofH + 0.42, 0);
      addBox(chiL[0], chiL[1], chiL[2], 0.24, 0.52, 0.22, rotY, goldCol, 2.0, 0.9, 1.0);
      addBox(chiR[0], chiR[1], chiR[2], 0.24, 0.52, 0.22, rotY, goldCol, 2.0, 0.9, 1.0);
      addBox(cx, baseY - 0.08, cz, halfW * 1.72, 0.16, halfD * 1.72, rotY, [0.10, 0.12, 0.15], 2.0, 0.6, 0.7);

      return [
        tf(-halfW * 1.12, eaveLift * 0.78, -halfD * 1.12),
        tf( halfW * 1.12, eaveLift * 0.78, -halfD * 1.12),
        tf( halfW * 1.12, eaveLift * 0.78,  halfD * 1.12),
        tf(-halfW * 1.12, eaveLift * 0.78,  halfD * 1.12)
      ];
    }

    function addOctagonalRoof(cx, baseY, cz, radius, roofH, eaveLift = 0.68, addFinial = true, customCol = null) {
      const roofCol = customCol || [0.09, 0.14, 0.19];
      const goldCol = [0.86, 0.68, 0.34];
      const rings = 6, segs = 8;
      const ringPts = [];
      for (let r = 0; r <= rings; r++) {
        const u = r / rings;
        const row = [];
        for (let s = 0; s < segs; s++) {
          const a = (s / segs) * Math.PI * 2 + Math.PI / 8;
          const rad = radius * (u * (1.0 + 0.14 * u * u));
          const y = baseY + roofH * Math.pow(1.0 - u, 1.70) + Math.pow(u, 3.0) * eaveLift;
          row.push([cx + Math.cos(a) * rad, y, cz + Math.sin(a) * rad]);
        }
        ringPts.push(row);
      }
      for (let r = 0; r < rings; r++) {
        for (let s = 0; s < segs; s++) {
          const s1 = (s + 1) % segs;
          addQuad(ringPts[r][s], ringPts[r + 1][s], ringPts[r + 1][s1], ringPts[r][s1], roofCol, customCol ? 2.0 : 1.0, 2.5, 2.5, 0.85, 0.96);
        }
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
     3. Calligraphic Silhouette Ink Foliage (焦墨點葉・不搶戲不塑膠!)
     ========================================================================== */
  function createFoliageBuilder() {
    const arr = [];
    let quads = 0;
    function addDab(cx, cy, cz, size, nx, ny, nz, col, brushType, windFlex, seed) {
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
      for (let i = 0; i < 6; i++) {
        arr.push(cx, cy, cz, corners[i][0] * size, corners[i][1] * size, nx, ny, nz, col[0], col[1], col[2], seed, brushType, windFlex, size);
      }
      quads++;
    }
    return { addDab, finish: () => ({ data: new Float32Array(arr), count: quads * 6 }) };
  }

  function addCalligraphicPine(solid, foliage, x, z, scale = 1.0, leanX = 0.8, leanZ = 0.0, seed = 1.0, isCinnabar = false) {
    const gy = terrainHeight(x, z);
    if (gy < 0.8) return;
    const inkBark = [0.08, 0.11, 0.14]; // Deep velvety Sumi ink bark!
    const h = 4.8 * scale;
    const sgn = leanX >= 0 ? 1 : -1;
    const sw = (0.75 + hash2(seed, 0.7) * 0.65) * sgn;
    const pts = [
      [x, gy - 2.0, z],
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

    // Strict Museum Pigment Harmony: Deep Azurite-Ink Pines OR Pure Cinnabar Red Maple Accent!
    const pal = isCinnabar
      ? [[0.78, 0.18, 0.13], [0.88, 0.26, 0.15], [0.58, 0.12, 0.11]]
      : [[0.08, 0.24, 0.25], [0.11, 0.34, 0.31], [0.06, 0.17, 0.22]];

    branches.forEach((br, bi) => {
      const mid = [(br.base[0] + br.tip[0]) * 0.5, (br.base[1] + br.tip[1]) * 0.5 - 0.22 * scale, (br.base[2] + br.tip[2]) * 0.5];
      solid.addTaperedTube([br.base, mid, br.tip], [0.10 * scale, 0.06 * scale, 0.025 * scale], 5, inkBark, 5.0);
      const dabs = 8;
      for (let d = 0; d < dabs; d++) {
        const s = seed * 31.7 + bi * 13.3 + d * 7.9;
        const ang = (d / dabs) * Math.PI * 2 + hash2(s, 1.1) * 0.9;
        const rad = (0.28 + hash2(s, 2.3) * 1.25) * scale;
        const dy = (hash2(s, 3.7) - 0.4) * 0.32 * scale;
        foliage.addDab(
          br.tip[0] + Math.cos(ang) * rad, br.tip[1] + dy + 0.16 * scale, br.tip[2] + Math.sin(ang) * rad,
          (0.88 + hash2(s, 4.9) * 0.52) * scale,
          Math.cos(ang) * 0.5, 0.85, Math.sin(ang) * 0.5,
          pal[d % pal.length], isCinnabar ? 2.0 : 0.0, 0.35 + hash2(s, 5.1) * 0.3, hash2(s, 6.3) * 100.0
        );
      }
    });
  }

  /* ==========================================================================
     4. Poetic Architectural Silhouettes: Moon-Arch Rainbow Bridge, Cliff Pavilion & Cloud Pagoda
     ========================================================================== */
  function buildMoonRainbowBridge(solid) {
    const cx = riverCenterX(BRIDGE_Z);
    const span = 27.6;
    const width = 4.1;
    const segs = 28;
    const inkTimber = [0.12, 0.14, 0.17];  // Sleek dark Sumi-ink timber silhouette!
    const bridgeDeck = [0.22, 0.20, 0.19];
    const cinnabar = [0.74, 0.17, 0.14];   // Museum cinnabar vermilion accent!
    const stone = [0.16, 0.20, 0.24];

    // Carved dark-ink stone bridge piers recessed cleanly into both rocky crags
    for (const side of [-1, 1]) {
      const bx = cx + side * (span * 0.5 + 0.2);
      solid.addBox(bx, 0.2, BRIDGE_Z, 2.8, 5.2, width + 0.6, 0, stone, 3.0, 0.55, 0.90);
    }

    for (let i = 0; i < segs; i++) {
      const u0 = -1 + (i / segs) * 2, u1 = -1 + ((i + 1) / segs) * 2;
      const x0 = cx + u0 * (span * 0.5), x1 = cx + u1 * (span * 0.5);
      const y0 = 2.25 + 6.45 * Math.pow(1.0 - u0 * u0, 0.90);
      const y1 = 2.25 + 6.45 * Math.pow(1.0 - u1 * u1, 0.90);
      const hw = width * 0.5, thick = 0.50;

      // Deck & graceful underside soffit
      solid.addQuad([x0, y0, BRIDGE_Z - hw], [x1, y1, BRIDGE_Z - hw], [x1, y1, BRIDGE_Z + hw], [x0, y0, BRIDGE_Z + hw], bridgeDeck, 2.0, 1, 2, 0.92, 0.92);
      solid.addQuad([x0, y0 - thick, BRIDGE_Z + hw], [x1, y1 - thick, BRIDGE_Z + hw], [x1, y1 - thick, BRIDGE_Z - hw], [x0, y0 - thick, BRIDGE_Z - hw], inkTimber, 2.0, 1, 2, 0.58, 0.58);

      // Sleek curved arch ribs & continuous sloped vermilion lacquer handrails
      for (const sgn of [-1, 1]) {
        const zf = BRIDGE_Z + sgn * hw;
        const pA = [x0, y0 - thick - 0.16, zf], pB = [x1, y1 - thick - 0.16, zf];
        const pC = [x1, y1 + 0.08, zf], pD = [x0, y0 + 0.08, zf];
        if (sgn > 0) solid.addQuad(pA, pB, pC, pD, inkTimber, 2.0, 1, 0.5, 0.72, 0.85);
        else solid.addQuad(pB, pA, pD, pC, inkTimber, 2.0, 1, 0.5, 0.72, 0.85);

        const addSlopedRail = (hOff, rH, hT, col) => {
          const a0 = y0 + hOff, a1 = y1 + hOff, b0 = a0 + rH, b1 = a1 + rH;
          solid.addQuad([x0, a0, zf + hT], [x1, a1, zf + hT], [x1, b1, zf + hT], [x0, b0, zf + hT], col, 2.0, 1, 0.2, 0.88, 1.0);
          solid.addQuad([x1, a1, zf - hT], [x0, a0, zf - hT], [x0, b0, zf - hT], [x1, b1, zf - hT], col, 2.0, 1, 0.2, 0.85, 0.95);
          solid.addQuad([x0, b0, zf + hT], [x1, b1, zf + hT], [x1, b1, zf - hT], [x0, b0, zf - hT], col, 2.0, 1, 0.2, 0.95, 1.0);
        };
        addSlopedRail(0.95, 0.11, 0.065, cinnabar);
        addSlopedRail(0.48, 0.07, 0.048, cinnabar);
        addSlopedRail(0.08, 0.10, 0.070, inkTimber);
      }

      if (i % 2 === 0 || i === segs - 1) {
        const xm = (x0 + x1) * 0.5, ym = (y0 + y1) * 0.5;
        for (const sgn of [-1, 1]) {
          const zf = BRIDGE_Z + sgn * hw;
          solid.addBox(xm, ym + 0.56, zf, 0.13, 1.14, 0.13, 0, cinnabar, 2.0, 0.85, 1.0);
          solid.addBox(xm, ym + 1.18, zf, 0.18, 0.12, 0.18, 0, [0.86, 0.68, 0.34], 2.0, 0.92, 1.0);
          if (i % 4 === 0) solid.addBox(xm, ym - thick - 0.08, BRIDGE_Z, 0.20, 0.20, width + 0.8, 0, inkTimber, 2.0, 0.58, 0.72);
          // Graceful warm glowing cinnabar lanterns + delicate silk tassels hanging beneath each lantern!
          if (i === 6 || i === 12 || i === 16 || i === 22) {
            solid.addBox(xm, ym + 1.65, zf + sgn * 0.12, 0.06, 1.45, 0.06, 0, inkTimber, 2.0, 0.8, 0.95);
            solid.addBox(xm, ym + 2.30, zf + sgn * 0.36, 0.06, 0.06, 0.52, 0, inkTimber, 2.0, 0.85, 0.95);
            solid.addLantern(xm, ym + 1.84, zf + sgn * 0.56, 1.14);
            solid.addSilkRibbon(xm, ym + 1.48, zf + sgn * 0.56, 0.92, 0.055, 0.35);
          }
        }
      }
    }

    // One solitary silhouetted scholar gazing across the mist from the bridge crest
    const sy = 2.25 + 6.45;
    solid.addCylinder(cx - 0.8, sy, BRIDGE_Z + 1.25, 0.22, 0.12, 1.28, 6, [0.10, 0.14, 0.18], 2.0, 0.8, 0.95);
    solid.addCylinder(cx - 0.8, sy + 1.28, BRIDGE_Z + 1.25, 0.11, 0.10, 0.22, 6, [0.86, 0.78, 0.66], 2.0, 0.9, 1.0);
  }

  function addCliffPavilion(solid, x, z, rotY, stories = 2, scale = 1.0) {
    const gy = terrainHeight(x, z);
    const inkWood = [0.11, 0.14, 0.18];
    const cinnabar = [0.72, 0.17, 0.14];
    const stoneCol = [0.15, 0.21, 0.26];
    const winGlow = [1.0, 0.68, 0.30];

    const w = 4.6 * scale, d = 3.8 * scale;
    const baseTop = Math.max(gy + 0.5, 4.6);
    const foundH = baseTop - (gy - 4.5);
    // Dark ink rock-carved foundation plunged deep into the crag!
    solid.addBox(x, baseTop - foundH * 0.5, z, w + 1.5 * scale, foundH, d + 1.5 * scale, rotY, stoneCol, 3.0, 0.55, 0.90);
    solid.addBox(x, baseTop + 0.10 * scale, z, w + 1.8 * scale, 0.22 * scale, d + 1.8 * scale, rotY, [0.22, 0.28, 0.32], 3.0, 0.82, 1.0);

    const co = Math.cos(rotY), si = Math.sin(rotY);
    const tf = (lx, ly, lz) => [x + lx * co + lz * si, ly, z - lx * si + lz * co];

    let curY = baseTop + 0.22 * scale;
    for (let s = 0; s < stories; s++) {
      const sh = Math.pow(0.80, s);
      const sw = w * sh, sd = d * sh;
      const fh = (s === 0 ? 3.1 : 2.55) * scale;

      // Dark calligraphic wooden frame + warm glowing translucent paper screens (NO clunky beige boxes!)
      solid.addBox(x, curY + fh * 0.5, z, sw * 0.76, fh, sd * 0.76, rotY, inkWood, 2.0, 0.70, 0.92);
      const fN = tf(0, curY + fh * 0.50,  sd * 0.39);
      const fS = tf(0, curY + fh * 0.50, -sd * 0.39);
      const fE = tf( sw * 0.39, curY + fh * 0.50, 0);
      const fW = tf(-sw * 0.39, curY + fh * 0.50, 0);
      solid.addBox(fN[0], fN[1], fN[2], sw * 0.54, fh * 0.56, 0.08, rotY, winGlow, 4.0, 0.9, 1.0);
      solid.addBox(fS[0], fS[1], fS[2], sw * 0.54, fh * 0.56, 0.08, rotY, winGlow, 4.0, 0.9, 1.0);
      solid.addBox(fE[0], fE[1], fE[2], 0.08, fh * 0.56, sd * 0.52, rotY, winGlow, 4.0, 0.9, 1.0);
      solid.addBox(fW[0], fW[1], fW[2], 0.08, fh * 0.56, sd * 0.52, rotY, winGlow, 4.0, 0.9, 1.0);

      // Slender cinnabar pillars
      const cols = [[-sw * 0.5, -sd * 0.5], [0, -sd * 0.5], [sw * 0.5, -sd * 0.5], [-sw * 0.5, sd * 0.5], [0, sd * 0.5], [sw * 0.5, sd * 0.5]];
      cols.forEach(([lx, lz]) => {
        const p = tf(lx, curY, lz);
        solid.addCylinder(p[0], p[1], p[2], 0.12 * scale, 0.10 * scale, fh, 6, cinnabar, 2.0, 0.78, 0.96);
      });
      solid.addBox(x, curY + fh - 0.12 * scale, z, sw + 0.3 * scale, 0.24 * scale, sd + 0.3 * scale, rotY, inkWood, 2.0, 0.65, 0.85);
      solid.addBox(x, curY + 0.48 * scale, z, sw + 0.15 * scale, 0.10 * scale, sd + 0.15 * scale, rotY, cinnabar, 2.0, 0.82, 0.96);

      // Dramatic sweeping upturned dark-ink Song eaves!
      const corners = solid.addSweepingRoof(x, curY + fh, z, sw * 0.82, sd * 0.84, (s === stories - 1 ? 2.4 : 1.35) * scale, rotY, (s === stories - 1 ? 1.05 : 0.68) * scale, s === stories - 1 ? 0.20 : 0.44);
      if (s === 0) {
        corners.forEach((rc, ci) => {
          solid.addLantern(rc[0], rc[1] - 0.55 * scale, rc[2], 0.88 * scale);
          if (ci < 2) solid.addSilkRibbon(rc[0], rc[1] - 0.1, rc[2], 2.1 * scale, 0.13 * scale, 1.0);
        });
      }
      curY += fh + (s === stories - 1 ? 0 : 0.72 * scale);
    }
  }

  function addSolitaryPagoda(solid, x, z, scale = 1.0) {
    const gy = terrainHeight(x, z);
    const inkBody = [0.11, 0.15, 0.21];
    let curY = gy - 1.2;
    solid.addCylinder(x, gy - 4.5, z, 2.7 * scale, 2.1 * scale, 4.8 * scale, 8, [0.12, 0.20, 0.26], 3.0, 0.58, 0.90);
    curY += 1.5 * scale;
    for (let t = 0; t < 5; t++) {
      const s = Math.pow(0.83, t);
      const r = 1.9 * s * scale, h = 1.85 * s * scale;
      solid.addCylinder(x, curY, z, r, r * 0.94, h, 8, inkBody, 3.0, 0.78, 0.96);
      if (t === 2 || t === 4) solid.addLantern(x, curY + h * 0.5, z + r * 0.96, 0.95 * scale);
      solid.addOctagonalRoof(x, curY + h, z, r * 1.65, 1.15 * s * scale, 0.48 * s * scale, t === 4);
      curY += h + 0.52 * s * scale;
    }
  }

  function addSouthernMoonPavilion(solid, x, z, scale = 1.0) {
    const gy = terrainHeight(x, z);
    const baseTop = Math.max(gy + 0.4, 2.4);
    const r = 2.6 * scale, h = 2.9 * scale;
    solid.addCylinder(x, gy - 3.5, z, r * 1.15, r * 1.08, baseTop - (gy - 3.5), 8, [0.15, 0.20, 0.25], 3.0, 0.6, 0.92);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      solid.addCylinder(x + Math.cos(a) * r * 0.88, baseTop, z + Math.sin(a) * r * 0.88, 0.10 * scale, 0.09 * scale, h, 6, [0.72, 0.17, 0.14], 2.0, 0.8, 0.96);
    }
    solid.addLantern(x, baseTop + h * 0.62, z, 1.35 * scale);
    solid.addOctagonalRoof(x, baseTop + h, z, r * 1.45, 1.95 * scale, 0.72 * scale, true);
  }

  /* ==========================================================================
     5. Lone Ink Boatman Skiff (孤舟簑笠翁 — Classic Song Masterpiece Focal Point!)
     ========================================================================== */
  function buildLoneBoatman() {
    const sb = createSolidBuilder(2048);
    const hullInk = [0.09, 0.11, 0.14];   // Crisp dark calligraphic ink skiff!
    const deckInk = [0.16, 0.16, 0.17];
    const segs = 12, len = 6.2;
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs, t1 = (i + 1) / segs;
      const z0 = (t0 - 0.5) * len, z1 = (t1 - 0.5) * len;
      const w0 = Math.sin(t0 * Math.PI) * 0.78 + 0.05;
      const w1 = Math.sin(t1 * Math.PI) * 0.78 + 0.05;
      // Sleek upturned crescent-moon Song skiff silhouette!
      const yUp0 = 0.28 + Math.pow(Math.abs(t0 - 0.5) * 2, 2.3) * 0.68;
      const yUp1 = 0.28 + Math.pow(Math.abs(t1 - 0.5) * 2, 2.3) * 0.68;
      const yBot0 = -0.14 + Math.pow(Math.abs(t0 - 0.5) * 2, 2.6) * 0.42;
      const yBot1 = -0.14 + Math.pow(Math.abs(t1 - 0.5) * 2, 2.6) * 0.42;
      sb.addQuad([-w0 * 0.84, yUp0 - 0.10, z0], [w0 * 0.84, yUp0 - 0.10, z0], [w1 * 0.84, yUp1 - 0.10, z1], [-w1 * 0.84, yUp1 - 0.10, z1], deckInk, 2.0, 1, 1, 0.8, 0.8);
      sb.addQuad([-w0 * 0.60, yBot0, z0], [-w0, yUp0, z0], [-w1, yUp1, z1], [-w1 * 0.60, yBot1, z1], hullInk, 2.0, 1, 1, 0.65, 0.85);
      sb.addQuad([w0, yUp0, z0], [w0 * 0.60, yBot0, z0], [w1 * 0.60, yBot1, z1], [w1, yUp1, z1], hullInk, 2.0, 1, 1, 0.85, 0.65);
    }
    // Delicate arched woven canopy in mid-back
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * Math.PI, a1 = ((i + 1) / 8) * Math.PI;
      sb.addQuad([Math.cos(a0) * 0.68, 0.28 + Math.sin(a0) * 0.72, -1.25], [Math.cos(a0) * 0.68, 0.28 + Math.sin(a0) * 0.72, 0.45],
                 [Math.cos(a1) * 0.68, 0.28 + Math.sin(a1) * 0.72, 0.45],  [Math.cos(a1) * 0.68, 0.28 + Math.sin(a1) * 0.72, -1.25], hullInk, 2.0, 1, 1, 0.7, 0.9);
    }
    // Iconic silhouetted Lone Boatman in straw cloak & bamboo hat (簑笠翁!) standing at stern!
    sb.addCylinder(0.05, 0.32, -1.75, 0.26, 0.13, 1.15, 7, [0.11, 0.13, 0.16], 2.0, 0.8, 0.95);
    sb.addOctagonalRoof(0.05, 1.44, -1.75, 0.46, 0.22, 0.0, false, [0.42, 0.34, 0.22]); // Iconic conical bamboo hat (斗笠)!
    // Slender bamboo oar dipping gracefully into the water
    sb.addTaperedTube([[0.22, 1.05, -1.55], [0.68, 0.42, -2.15], [0.92, -0.05, -2.55]], [0.03, 0.025, 0.045], 5, hullInk, 2.0);
    // Glowing Cinnabar Bow Lantern hanging from curved bamboo pole (casts radiant red-gold streak!)
    sb.addTaperedTube([[0, 0.62, 2.25], [0, 1.42, 2.68], [0, 1.62, 3.02]], [0.035, 0.025, 0.02], 5, hullInk, 2.0);
    sb.addLantern(0, 1.24, 3.02, 0.96);
    return sb.finish();
  }

  /* ==========================================================================
     6. Terrain Mesh (164x164 Sculpted Karst Peaks Only — ZERO Flat Dirt!)
     ========================================================================== */
  function buildTerrain(solid) {
    const N = 160;
    const minX = -108, maxX = 108, minZ = -134, maxZ = 92;
    const dx = (maxX - minX) / N, dz = (maxZ - minZ) / N;
    const pts = [], nrm = [];

    for (let iz = 0; iz <= N; iz++) {
      const z = minZ + iz * dz;
      const pr = [], nr = [];
      for (let ix = 0; ix <= N; ix++) {
        const x = minX + ix * dx;
        pr.push([x, terrainHeight(x, z), z]);
        nr.push(terrainNormal(x, z));
      }
      pts.push(pr); nrm.push(nr);
    }

    const baseCol = [0.12, 0.26, 0.34]; // Base passed through; rich splash-ink coloring computed in shader!
    for (let iz = 0; iz < N; iz++) {
      for (let ix = 0; ix < N; ix++) {
        const p00 = pts[iz][ix], p10 = pts[iz][ix + 1], p11 = pts[iz + 1][ix + 1], p01 = pts[iz + 1][ix];
        // Skip fully submerged flat waterbed quads! Only emit emerging karst rocks & peaks!
        if (p00[1] < -1.8 && p10[1] < -1.8 && p11[1] < -1.8 && p01[1] < -1.8) continue;
        const n00 = nrm[iz][ix], n10 = nrm[iz][ix + 1], n11 = nrm[iz + 1][ix + 1], n01 = nrm[iz + 1][ix];
        const a00 = 0.65 + 0.35 * smoothstep(-1.0, 18.0, p00[1]);
        const a10 = 0.65 + 0.35 * smoothstep(-1.0, 18.0, p10[1]);
        const a11 = 0.65 + 0.35 * smoothstep(-1.0, 18.0, p11[1]);
        const a01 = 0.65 + 0.35 * smoothstep(-1.0, 18.0, p01[1]);

        solid.addTriSmooth(p00, p01, p11, n00, n01, n11, baseCol, baseCol, baseCol,
          [0.0, p00[0] * 0.05, p00[2] * 0.05, a00], [0.0, p01[0] * 0.05, p01[2] * 0.05, a01], [0.0, p11[0] * 0.05, p11[2] * 0.05, a11]);
        solid.addTriSmooth(p00, p11, p10, n00, n11, n10, baseCol, baseCol, baseCol,
          [0.0, p00[0] * 0.05, p00[2] * 0.05, a00], [0.0, p11[0] * 0.05, p11[2] * 0.05, a11], [0.0, p10[0] * 0.05, p10[2] * 0.05, a10]);
      }
    }
  }

  /* ==========================================================================
     7. Infinite Mirror Ink Sea Surface (Seamless to Horizon in all 360°!)
     ========================================================================== */
  function buildWater() {
    const N = 92;
    const minX = -155, maxX = 155, minZ = -165, maxZ = 125;
    const dx = (maxX - minX) / N, dz = (maxZ - minZ) / N;
    const verts = [];
    for (let iz = 0; iz < N; iz++) {
      const z0 = minZ + iz * dz, z1 = z0 + dz;
      for (let ix = 0; ix < N; ix++) {
        const x0 = minX + ix * dx, x1 = x0 + dx;
        verts.push(
          x0, 0, z0, 1, 0, 0,  x0, 0, z1, 0, 1, 0,  x1, 0, z1, 0, 0, 1,
          x0, 0, z0, 1, 0, 0,  x1, 0, z1, 0, 1, 0,  x1, 0, z0, 0, 0, 1
        );
      }
    }
    return { data: new Float32Array(verts), count: verts.length / 6 };
  }

  /* ==========================================================================
     8. Silky Silver-Mist Cliff Waterfall, Colossal Splash-Ink Kun & Ink Cranes
     ========================================================================== */
  function buildWaterfall() {
    const wb = createSolidBuilder(2048);
    const streams = [
      { x: 31.0, z: -37.0, w: 3.6, topY: 27.0, botY: 0.2, curve: 4.5 },
      { x: 34.0, z: -39.5, w: 2.0, topY: 24.0, botY: 0.2, curve: 3.4 },
      { x: -30.5, z: -34.0, w: 2.2, topY: 22.0, botY: 0.2, curve: -3.2 }
    ];
    const col = [0.95, 0.94, 0.89];
    streams.forEach((st, idx) => {
      const segs = 22, dir = st.curve >= 0 ? -1 : 1;
      for (let i = 0; i < segs; i++) {
        const v0 = i / segs, v1 = (i + 1) / segs;
        const y0 = mix(st.topY, st.botY, v0), y1 = mix(st.topY, st.botY, v1);
        const out0 = Math.pow(v0, 0.72) * Math.abs(st.curve) * dir;
        const out1 = Math.pow(v1, 0.72) * Math.abs(st.curve) * dir;
        const w0 = st.w * (0.62 + 0.60 * v0), w1 = st.w * (0.62 + 0.60 * v1);
        const p00 = [st.x + out0, y0, st.z - w0 * 0.5], p10 = [st.x + out0, y0, st.z + w0 * 0.5];
        const p11 = [st.x + out1, y1, st.z + w1 * 0.5], p01 = [st.x + out1, y1, st.z - w1 * 0.5];
        const n = [dir * 0.85, 0.25, 0.45];
        wb.addTriSmooth(p00, p01, p11, n, n, n, col, col, col, [6.0, 0, v0, idx], [6.0, 0, v1, idx], [6.0, 1, v1, idx]);
        wb.addTriSmooth(p00, p11, p10, n, n, n, col, col, col, [6.0, 0, v0, idx], [6.0, 1, v1, idx], [6.0, 1, v0, idx]);
      }
    });
    return wb.finish();
  }

  function buildKun() {
    const kb = createSolidBuilder(16384);
    const rings = 44, radSegs = 20, bodyLen = 30.0;
    function profile(s) {
      const nose = Math.pow(Math.sin(Math.min(1, s * 2.2) * Math.PI * 0.5), 0.72);
      const taper = Math.pow(Math.max(0.025, 1.0 - Math.pow(s, 1.38)), 1.08);
      return { rx: 2.55 * nose * taper + 0.07, ry: 2.0 * nose * taper + 0.05, cy: Math.sin(s * Math.PI * 1.15) * 0.75 - s * 0.35 };
    }
    const colTop = [0.06, 0.14, 0.24], colBel = [0.22, 0.58, 0.62];

    for (let i = 0; i < rings; i++) {
      const s0 = i / rings, s1 = (i + 1) / rings;
      const z0 = (0.36 - s0) * bodyLen, z1 = (0.36 - s1) * bodyLen;
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

    // Sweeping Calligraphic Gossamer Silk Wings (羽翼如垂天之雲)
    const wingU = 16, wingV = 10, wingCol = [0.16, 0.54, 0.58];
    for (const side of [-1, 1]) {
      for (let iu = 0; iu < wingU; iu++) {
        const u0 = iu / wingU, u1 = (iu + 1) / wingU;
        for (let iv = 0; iv < wingV; iv++) {
          const v0 = iv / wingV, v1 = (iv + 1) / wingV;
          const ptW = (u, v) => {
            const span = 1.45 + u * 16.0;
            const chord = 7.8 * Math.pow(Math.sin(Math.min(1, u * 0.92 + 0.08) * Math.PI), 0.65) + 0.6;
            const z = 5.6 - Math.pow(u, 1.35) * 12.2 - v * chord;
            const archY = 0.25 + Math.sin(u * Math.PI * 0.85) * 1.65 - Math.pow(u, 1.8) * 1.8 - v * 0.45;
            return { p: [side * span, archY, z], s: Math.max(0.08, Math.min(0.95, 0.36 - z / bodyLen)) };
          };
          const w00 = ptW(u0, v0), w10 = ptW(u1, v0), w11 = ptW(u1, v1), w01 = ptW(u0, v1);
          const n = [side * 0.14, 0.96, 0.12];
          const ex = (w, u, v) => [7.0, w.s, 0.08 + u * 0.92, v];
          kb.addTriSmooth(w00.p, w10.p, w11.p, n, n, n, wingCol, wingCol, wingCol, ex(w00, u0, v0), ex(w10, u1, v0), ex(w11, u1, v1));
          kb.addTriSmooth(w00.p, w11.p, w01.p, n, n, n, wingCol, wingCol, wingCol, ex(w00, u0, v0), ex(w11, u1, v1), ex(w01, u0, v1));
        }
      }
    }

    // Twin Flowing Ink-Gold Phoenix Silk Tails
    const tailSegs = 22, tailCol = [0.88, 0.66, 0.34];
    for (const side of [-1, 1]) {
      for (let i = 0; i < tailSegs; i++) {
        const t0 = i / tailSegs, t1 = (i + 1) / tailSegs;
        const ptT = (t, e) => {
          const z = -18.8 - t * 20.5;
          const sp = side * (0.25 + Math.pow(t, 0.88) * 5.2);
          const wy = Math.sin(t * 3.8 + side * 0.8) * 1.25 - t * 0.6;
          const hw = 1.25 * (1.0 - t * 0.72) * (0.35 + Math.sin(t * Math.PI) * 0.85);
          return [sp, wy + e * hw, z];
        };
        const p00 = ptT(t0, -1), p01 = ptT(t0, 1), p11 = ptT(t1, 1), p10 = ptT(t1, -1);
        const n = [side * 0.85, 0.4, 0.2], s0 = 0.95 + t0 * 0.65, s1 = 0.95 + t1 * 0.65;
        kb.addTriSmooth(p00, p10, p11, n, n, n, tailCol, tailCol, tailCol, [7.0, s0, 0.35 + t0 * 0.65, 0.08], [7.0, s1, 0.35 + t1 * 0.65, 0.08], [7.0, s1, 0.35 + t1 * 0.65, 0.92]);
        kb.addTriSmooth(p00, p11, p01, n, n, n, tailCol, tailCol, tailCol, [7.0, s0, 0.35 + t0 * 0.65, 0.08], [7.0, s1, 0.35 + t1 * 0.65, 0.92], [7.0, s0, 0.35 + t0 * 0.65, 0.92]);
      }
    }
    return kb.finish();
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
     9. Luminous Valley Paper-Mist Clouds & 3D Swirling Cinnabar Petals / Spirit Embers
     ========================================================================== */
  function buildClouds() {
    const arr = [];
    let count = 0;
    function addRibbon(cx, cy, cz, rx, ry, op, seed, tier) {
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
      for (let i = 0; i < 6; i++) arr.push(cx, cy, cz, corners[i][0], corners[i][1], rx, ry, op, seed, tier);
      count++;
    }
    // Thick silky luminous mist ribbons wrapping the waists of ALL 7 mountain layers (雲斷山腰!)
    for (let i = 0; i < 96; i++) {
      const s = i * 17.31 + 3.7;
      const tier = i < 32 ? 0 : (i < 68 ? 1 : 2);
      const z = tier === 0 ? mix(-24, -54, hash2(s, 1.1)) : (tier === 1 ? mix(-52, -92, hash2(s, 1.1)) : mix(-86, -128, hash2(s, 1.1)));
      const spX = tier === 0 ? 64 : (tier === 1 ? 82 : 102);
      const x = (hash2(s, 2.3) * 2 - 1) * spX;
      if (z > -34 && Math.abs(x) < 16) continue;
      const y = tier === 0 ? mix(2.2, 11.5, hash2(s, 3.7)) : (tier === 1 ? mix(5.5, 22.0, hash2(s, 3.7)) : mix(10.0, 32.0, hash2(s, 3.7)));
      const rx = mix(14.0, 30.0, hash2(s, 4.9)) * (1 + tier * 0.25);
      const ry = rx * mix(0.24, 0.38, hash2(s, 5.1));
      addRibbon(x, y, z, rx, ry, mix(0.36, 0.62, hash2(s, 6.2)), hash2(s, 7.4) * 100.0, tier);
    }
    // Misty plumes at waterfall bases
    for (let i = 0; i < 10; i++) {
      const s = i * 9.7 + 41.2;
      addRibbon(27.0 + (hash2(s, 1) - 0.5) * 7.0, 1.8 + hash2(s, 2) * 4.2, -37.0 + (hash2(s, 3) - 0.5) * 6.0,
        6.5 + hash2(s, 4) * 4.5, 3.5 + hash2(s, 5) * 2.5, 0.58, hash2(s, 6) * 50, 0);
    }
    // Southern horizon mist ribbons behind spawn (so turning 180° has identical poetic depth!)
    for (let i = 0; i < 20; i++) {
      const s = i * 13.7 + 88.1;
      addRibbon((hash2(s, 1) * 2 - 1) * 62, mix(2.5, 14.0, hash2(s, 2)), mix(42, 86, hash2(s, 3)),
        mix(14, 28, hash2(s, 4)), mix(4, 9, hash2(s, 5)), mix(0.36, 0.56, hash2(s, 6)), hash2(s, 7) * 80, 1);
    }
    return { data: new Float32Array(arr), count: count * 6 };
  }

  function buildParticles() {
    // 6 floats: seedX, seedY, seedZ, phase, size, kind (0=Kun gold-leaf, 1=Kun sumi ink smoke, 2=Drifting 3D Cinnabar Maple Petals!)
    const total = 1150;
    const arr = new Float32Array(total * 6);
    for (let i = 0; i < total; i++) {
      const s = i * 11.17 + 0.5;
      const kind = i < 420 ? 0.0 : (i < 700 ? 1.0 : 2.0);
      arr[i * 6 + 0] = hash2(s, 1.3);
      arr[i * 6 + 1] = hash2(s, 2.7);
      arr[i * 6 + 2] = hash2(s, 3.9);
      arr[i * 6 + 3] = hash2(s, 4.1) * Math.PI * 2;
      arr[i * 6 + 4] = kind === 1.0 ? mix(10.0, 24.0, hash2(s, 5.3)) : (kind === 2.0 ? mix(5.0, 11.0, hash2(s, 5.3)) : mix(3.8, 9.0, hash2(s, 5.3)));
      arr[i * 6 + 5] = kind;
    }
    return { data: arr, count: total };
  }

  /* ==========================================================================
     10. Master Fine-Art World Assembly
     ========================================================================== */
  function buildWorld() {
    const solid = createSolidBuilder(131072);
    const foliage = createFoliageBuilder();

    // 1. Monumental Karst Monoliths ONLY (zero muddy dirt slopes!)
    buildTerrain(solid);

    // 2. Poetic Arched Moon-Rainbow Bridge (長虹孤橋)
    buildMoonRainbowBridge(solid);

    // 3. Solitary Iconic Architectural Silhouettes
    addCliffPavilion(solid, -16.8, -18.5, 0.42, 2, 1.04);      // 臨江懸崖飛閣 (perched on left karst crag!)
    addSolitaryPagoda(solid, 32.5, -52.5, 1.15);               // 遠山雲頂孤塔 (epic scale!)
    addSouthernMoonPavilion(solid, -16.0, 46.0, 1.05);         // 南岸望月孤亭 (poetic 180° vista!)

    // 4. Curated Calligraphic Silhouette Pines & Cinnabar Maples (placed strictly on rocky crags!)
    const trees = [
      // Dramatic cliffside cinnabar maples (丹楓點睛 — shedding drifting red petals across the bridge!)
      { x: -20.2, z: -21.5, s: 1.08, lean: 0.9,  cinnabar: true },
      { x:  17.2, z: -21.0, s: 1.15, lean: -0.9, cinnabar: true },
      { x:  15.6, z: -17.5, s: 0.92, lean: -0.8, cinnabar: false },
      { x: -13.8, z: -21.8, s: 0.96, lean: 0.85, cinnabar: false },
      // Cliff-clinging Song welcome pines (迎客孤松) framing sheer karst spires!
      { x: -33.5, z: -31.5, s: 1.38, lean: 1.0,  cinnabar: false },
      { x: -41.0, z: -26.5, s: 1.32, lean: 0.8,  cinnabar: false },
      { x:  34.5, z: -34.0, s: 1.42, lean: -1.0, cinnabar: false },
      { x:  29.5, z: -50.5, s: 1.30, lean: -0.8, cinnabar: false },
      { x:  35.8, z: -50.8, s: 1.15, lean: 0.8,  cinnabar: true },
      // Southern crag pines & maple for serene 180° view!
      { x: -18.5, z:  47.5, s: 1.18, lean: 0.8,  cinnabar: true },
      { x: -36.5, z:  24.5, s: 1.35, lean: 0.9,  cinnabar: false },
      { x:  38.5, z:  23.0, s: 1.35, lean: -0.9, cinnabar: false }
    ];
    trees.forEach((t, idx) => addCalligraphicPine(solid, foliage, t.x, t.z, t.s, t.lean, (idx % 3 - 1) * 0.2, idx + 3, t.cinnabar));

    const solidMesh = solid.finish();
    const waterMesh = buildWater();
    const foliageMesh = foliage.finish();
    const waterfallMesh = buildWaterfall();
    const kunMesh = buildKun();
    const boatmanMesh = buildLoneBoatman();
    const craneMesh = buildCrane();
    const cloudsMesh = buildClouds();
    const particlesMesh = buildParticles();

    const totalTris = Math.round(
      (solidMesh.count + waterMesh.count + foliageMesh.count + waterfallMesh.count +
       kunMesh.count + boatmanMesh.count + craneMesh.count * 7 + cloudsMesh.count) / 3
    );

    return {
      solid: solidMesh,
      water: waterMesh,
      foliage: foliageMesh,
      waterfall: waterfallMesh,
      kun: kunMesh,
      boatman: boatmanMesh,
      crane: craneMesh,
      clouds: cloudsMesh,
      particles: particlesMesh,
      stats: { totalTris }
    };
  }

  return { BRIDGE_Z, riverCenterX, riverHalfWidth, terrainHeight, bridgeArchY, buildWorld };
})();
