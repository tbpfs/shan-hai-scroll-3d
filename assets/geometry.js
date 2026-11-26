/**
 * 《山海汴京圖》v2 — Pure Procedural Song-Dynasty World & Calligraphic Foliage Builder
 * 100% Zero-Dependency Native WebGL2 Geometry Generator — Autonomously built by Gemini 4 Neon
 *
 * Exports:
 *   - riverCenterX(z), riverHalfWidth(z), terrainHeight(x, z), bridgeDeckY(x, z)
 *   - buildWorld() -> { solid, water, foliage, clouds, waterfall, kun, sampan, crane, particles, stats }
 */
const ShanHaiGeometry = (() => {
  "use strict";

  /* ==========================================================================
     1. Deterministic Hash, Value Noise, FBM & Ridged Multifractal (Karst Peaks)
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
    const a = hash2(ix, iy);
    const b = hash2(ix + 1, iy);
    const c = hash2(ix, iy + 1);
    const d = hash2(ix + 1, iy + 1);
    return mix(mix(a, b, ux), mix(c, d, ux), uy);
  }

  function fbm(x, y, oct = 4) {
    let v = 0, amp = 0.5, freq = 1.0;
    for (let i = 0; i < oct; i++) {
      v += amp * noise2(x * freq, y * freq);
      freq *= 2.04;
      amp *= 0.5;
    }
    return v;
  }

  function ridged(x, y, oct = 4) {
    let v = 0, amp = 0.54, freq = 1.0, weight = 1.0;
    for (let i = 0; i < oct; i++) {
      let n = 1.0 - Math.abs(noise2(x * freq, y * freq) * 2.0 - 1.0);
      n = n * n * weight;
      weight = Math.max(0.15, Math.min(1.0, n * 1.6));
      v += n * amp;
      freq *= 2.12;
      amp *= 0.48;
    }
    return v;
  }

  /* ==========================================================================
     2. Composed Song-Dynasty River Gorge & Karst Peak Heightfield (SSOT)
     ========================================================================== */
  const BRIDGE_Z = -18.0;

  function riverCenterX(z) {
    // Graceful classic S-curve passing near x = 0 at spawn (z=24) and bridge (z=-18)
    return Math.sin((z + 18.0) * 0.025) * 4.8 + Math.sin((z - 12.0) * 0.011) * 1.8;
  }

  function riverHalfWidth(z) {
    // Wide unobstructed mirror river at foreground spawn; graceful narrowing at bridge; opens into misty Shan-Hai lake!
    const bridgePinch = Math.exp(-Math.pow((z - BRIDGE_Z) / 15.0, 2.0));
    const farLake = smoothstep(-28.0, -64.0, z) * 14.5;
    const southOpen = smoothstep(4.0, 34.0, z) * 3.5;
    return 11.2 - bridgePinch * 2.2 + farLake + southOpen;
  }

  // Composed monumental Chinese karst peaks (千里江山圖 silhouettes!)
  const PEAKS = [
    // Midground flanking dramatic peaks (create valley gate without blocking spawn!)
    { x: -37.0, z: -33.0, h: 27.5, rx: 14.5, rz: 13.5, sharp: 1.38 }, // Left cliff peak (cliff pavilion)
    { x: -56.0, z: -22.0, h: 23.0, rx: 16.0, rz: 15.0, sharp: 1.25 },
    { x:  40.0, z: -38.0, h: 32.0, rx: 14.0, rz: 14.5, sharp: 1.48 }, // Right waterfall spire
    { x:  60.0, z: -26.0, h: 25.0, rx: 17.0, rz: 16.0, sharp: 1.28 },
    // Grand axial twin celestial karst spires framing the golden sun pass!
    { x: -27.0, z: -74.0, h: 49.0, rx: 18.0, rz: 16.0, sharp: 1.62 },
    { x: -58.0, z: -64.0, h: 43.0, rx: 22.0, rz: 18.0, sharp: 1.45 },
    { x:  31.0, z: -80.0, h: 55.0, rx: 19.0, rz: 17.0, sharp: 1.68 },
    { x:  62.0, z: -68.0, h: 45.0, rx: 21.0, rz: 19.0, sharp: 1.42 },
    // Secondary shoulder peaks for layered overlapping silhouettes
    { x: -12.0, z: -96.0, h: 31.0, rx: 15.0, rz: 13.0, sharp: 1.55 },
    { x:  16.0, z: -102.0, h: 34.0, rx: 16.0, rz: 13.0, sharp: 1.55 },
    // Far misty horizon veil
    { x: -46.0, z: -118.0, h: 46.0, rx: 28.0, rz: 18.0, sharp: 1.32 },
    { x:   2.0, z: -126.0, h: 24.0, rx: 26.0, rz: 16.0, sharp: 1.20 },
    { x:  52.0, z: -120.0, h: 50.0, rx: 30.0, rz: 18.0, sharp: 1.35 },
    // Gentle distant southern hills & misty far ridge far behind spawn (so turning 180° is a complete Song vista!)
    { x: -42.0, z:  46.0, h: 19.5, rx: 22.0, rz: 19.0, sharp: 1.25 },
    { x:  44.0, z:  44.0, h: 21.5, rx: 22.0, rz: 19.0, sharp: 1.28 },
    { x: -24.0, z:  70.0, h: 26.0, rx: 22.0, rz: 18.0, sharp: 1.38 },
    { x:  26.0, z:  72.0, h: 28.0, rx: 22.0, rz: 18.0, sharp: 1.40 },
    { x:   2.0, z:  82.0, h: 20.0, rx: 24.0, rz: 16.0, sharp: 1.25 }
  ];

  function terrainHeight(x, z) {
    const rcx = riverCenterX(z);
    const hw = riverHalfWidth(z);
    const dist = Math.abs(x - rcx);

    // River channel carving (smooth underwater bed)
    const bankT = smoothstep(hw - 1.2, hw + 5.2, dist);
    if (bankT <= 0.0001) {
      const bed = -2.6 * smoothstep(hw, hw * 0.25, dist);
      return bed;
    }

    // Gentle navigable riverside meadow/stone terrace
    let h = 0.55 + 1.85 * smoothstep(hw + 1.0, hw + 13.0, dist);
    h += (fbm(x * 0.045 + 11.3, z * 0.045 - 7.1, 3) - 0.5) * 1.4;

    // Keep foreground riverside banks (z > 2) tranquil & open so rotating 360° NEVER blocks view
    const fgCalm = smoothstep(2.0, 28.0, z);
    const sideGain = smoothstep(hw + 6.0, hw + 30.0, dist);
    h += sideGain * (1.0 - fgCalm * 0.65) * 4.5 * ridged(x * 0.032 + 4.1, z * 0.032 + 9.2, 3);

    // Sculpted Chinese Karst peaks with ridged multifractal strata!
    let peakSum = 0.0;
    const ridgeTex = 0.74 + 0.44 * ridged(x * 0.055 + 2.7, z * 0.055 - 5.3, 4);
    for (let i = 0; i < PEAKS.length; i++) {
      const p = PEAKS[i];
      const dx = (x - p.x) / p.rx;
      const dz = (z - p.z) / p.rz;
      const d2 = dx * dx + dz * dz;
      if (d2 < 4.5) {
        // Steep concave karst spire profile (narrow summit, graceful flared skirt)
        const base = Math.exp(-d2 * p.sharp);
        const crag = base * (0.78 + 0.36 * ridged(x * 0.085 + i * 3.1, z * 0.085 - i * 1.7, 3));
        peakSum = Math.max(peakSum, p.h * crag);
      }
    }
    h += peakSum * ridgeTex * smoothstep(hw + 0.6, hw + 7.5, dist);

    // Subtle cliffside terrace flattening for the Left Cliff Pavilion (-26.5, -31.5)
    const dCliff = Math.hypot(x - (-26.5), z - (-31.5));
    if (dCliff < 5.5) {
      const t = smoothstep(5.5, 2.2, dCliff);
      h = mix(h, 13.2, t);
    }

    // Subtle ridge terrace flattening for Distant Cloud Pagoda (36.0, -56.0) so it seats proudly on rock!
    const dPag = Math.hypot(x - 36.0, z - (-56.0));
    if (dPag < 6.5) {
      const t = smoothstep(6.5, 2.6, dPag);
      h = mix(h, 15.6, t);
    }

    // Subtle bridgehead embankment shaping right at BRIDGE_Z (-18)
    const dBridgeZ = Math.abs(z - BRIDGE_Z);
    if (dBridgeZ < 7.0 && dist > hw - 0.5 && dist < hw + 10.0) {
      const t = smoothstep(7.0, 2.5, dBridgeZ) * smoothstep(hw + 10.0, hw + 3.5, dist);
      h = mix(h, 2.15, t * 0.8);
    }

    // Subtle flat terrace for Left Riverside Pavilion (-17.5, -13.0)
    const leftPavX = riverCenterX(-13.0) - 16.5;
    const dLeftPav = Math.hypot(x - leftPavX, z - (-13.0));
    if (dLeftPav < 7.5) {
      h = mix(h, 2.1, smoothstep(7.5, 3.8, dLeftPav));
    }

    // Blend cleanly into riverbed
    const bed = -2.4 * smoothstep(hw + 1.2, hw * 0.2, dist);
    return mix(bed, h, bankT);
  }

  function terrainNormal(x, z) {
    const e = 0.7;
    const hL = terrainHeight(x - e, z);
    const hR = terrainHeight(x + e, z);
    const hD = terrainHeight(x, z - e);
    const hU = terrainHeight(x, z + e);
    const nx = hL - hR, ny = 2.0 * e, nz = hD - hU;
    const inv = 1.0 / Math.hypot(nx, ny, nz);
    return [nx * inv, ny * inv, nz * inv];
  }

  // Exact Rainbow Bridge arch surface height for FPS camera collision safety
  function bridgeArchY(x) {
    const cx = riverCenterX(BRIDGE_Z);
    const u = (x - cx) / 12.6;
    if (Math.abs(u) > 1.05) return -99.0;
    const cl = Math.max(-1, Math.min(1, u));
    return 2.15 + 5.65 * Math.pow(1.0 - cl * cl, 0.92);
  }

  /* ==========================================================================
     3. Mesh Builder Utilities (16-float solid vertex: pos3, norm3, col3, bary3, extra4)
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
      const len = Math.hypot(nx, ny, nz) || 1.0;
      nx /= len; ny /= len; nz /= len;
      const n = [nx, ny, nz];
      addTriSmooth(p0, p1, p2, n, n, n, c, c, c,
        [matId, u0, v0, ao], [matId, u1, v1, ao], [matId, u2, v2, ao]);
    }

    function addQuad(p0, p1, p2, p3, c, matId, uScale = 1, vScale = 1, ao0 = 1.0, ao1 = 1.0) {
      addTri(p0, p1, p2, c, matId, 0, 0, uScale, 0, uScale, vScale, ao0);
      addTri(p0, p2, p3, c, matId, 0, 0, uScale, vScale, 0, vScale, ao1);
    }

    function addBox(cx, cy, cz, sx, sy, sz, rotY, c, matId, aoBot = 0.72, aoTop = 1.0) {
      const co = Math.cos(rotY), si = Math.sin(rotY);
      const hx = sx * 0.5, hy = sy * 0.5, hz = sz * 0.5;
      const pt = (lx, ly, lz) => [
        cx + lx * co + lz * si,
        cy + ly,
        cz - lx * si + lz * co
      ];
      const v000 = pt(-hx, -hy, -hz), v100 = pt(hx, -hy, -hz), v110 = pt(hx, hy, -hz), v010 = pt(-hx, hy, -hz);
      const v001 = pt(-hx, -hy,  hz), v101 = pt(hx, -hy,  hz), v111 = pt(hx, hy,  hz), v011 = pt(-hx, hy,  hz);
      const aoM = (aoBot + aoTop) * 0.5;
      addQuad(v001, v101, v111, v011, c, matId, sx, sy, aoM, aoM); // +Z
      addQuad(v100, v000, v010, v110, c, matId, sx, sy, aoM, aoM); // -Z
      addQuad(v101, v100, v110, v111, c, matId, sz, sy, aoM, aoM); // +X
      addQuad(v000, v001, v011, v010, c, matId, sz, sy, aoM, aoM); // -X
      addQuad(v011, v111, v110, v010, c, matId, sx, sz, aoTop, aoTop); // +Y
      addQuad(v000, v100, v101, v001, c, matId, sx, sz, aoBot, aoBot); // -Y
    }

    function addCylinder(cx, y0, cz, r0, r1, h, segs, c, matId, ao0 = 0.78, ao1 = 1.0) {
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2;
        const a1 = ((i + 1) / segs) * Math.PI * 2;
        const c0 = Math.cos(a0), s0 = Math.sin(a0);
        const c1 = Math.cos(a1), s1 = Math.sin(a1);
        const p00 = [cx + c0 * r0, y0, cz + s0 * r0];
        const p10 = [cx + c1 * r0, y0, cz + s1 * r0];
        const p11 = [cx + c1 * r1, y0 + h, cz + s1 * r1];
        const p01 = [cx + c0 * r1, y0 + h, cz + s0 * r1];
        const n0 = [c0, 0.08, s0], n1 = [c1, 0.08, s1];
        addTriSmooth(p00, p10, p11, n0, n1, n1, c, c, c,
          [matId, i / segs, 0, ao0], [matId, (i + 1) / segs, 0, ao0], [matId, (i + 1) / segs, 1, ao1]);
        addTriSmooth(p00, p11, p01, n0, n1, n0, c, c, c,
          [matId, i / segs, 0, ao0], [matId, (i + 1) / segs, 1, ao1], [matId, i / segs, 1, ao1]);
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
        const aoA = 0.72 + 0.28 * (k / (pts.length - 1));
        const aoB = 0.72 + 0.28 * ((k + 1) / (pts.length - 1));
        for (let i = 0; i < segs; i++) {
          const t0 = (i / segs) * Math.PI * 2;
          const t1 = ((i + 1) / segs) * Math.PI * 2;
          const ca = Math.cos(t0), sa = Math.sin(t0);
          const cb = Math.cos(t1), sb = Math.sin(t1);
          const n0 = [rx * ca + ux * sa, ry * ca + uy * sa, rz * ca + uz * sa];
          const n1 = [rx * cb + ux * sb, ry * cb + uy * sb, rz * cb + uz * sb];
          const p00 = [a[0] + n0[0] * rA, a[1] + n0[1] * rA, a[2] + n0[2] * rA];
          const p10 = [a[0] + n1[0] * rA, a[1] + n1[1] * rA, a[2] + n1[2] * rA];
          const p11 = [b[0] + n1[0] * rB, b[1] + n1[1] * rB, b[2] + n1[2] * rB];
          const p01 = [b[0] + n0[0] * rB, b[1] + n0[1] * rB, b[2] + n0[2] * rB];
          addTriSmooth(p00, p10, p11, n0, n1, n1, c, c, c,
            [matId, i / segs, k, aoA], [matId, (i + 1) / segs, k, aoA], [matId, (i + 1) / segs, k + 1, aoB]);
          addTriSmooth(p00, p11, p01, n0, n1, n0, c, c, c,
            [matId, i / segs, k, aoA], [matId, (i + 1) / segs, k + 1, aoB], [matId, i / segs, k + 1, aoB]);
        }
      }
    }

    function addLantern(x, y, z, scale = 1.0) {
      // Subtle iron hook + warm glowing Song silk lantern core (MatID = 4) + dark ink top/bottom caps
      const r = 0.24 * scale, h = 0.42 * scale;
      addCylinder(x, y + h * 0.5, z, r * 0.45, r * 0.18, 0.16 * scale, 6, [0.16, 0.14, 0.13], 2.0, 0.7, 0.9);
      addCylinder(x, y - h * 0.62, z, r * 0.18, r * 0.45, 0.12 * scale, 6, [0.16, 0.14, 0.13], 2.0, 0.7, 0.9);
      // Ribbed rounded glowing lantern body
      const segs = 8;
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2;
        const a1 = ((i + 1) / segs) * Math.PI * 2;
        const c0 = Math.cos(a0), s0 = Math.sin(a0);
        const c1 = Math.cos(a1), s1 = Math.sin(a1);
        const midR = r * 1.16;
        const topR = r * 0.62;
        const pB0 = [x + c0 * topR, y - h * 0.5, z + s0 * topR];
        const pB1 = [x + c1 * topR, y - h * 0.5, z + s1 * topR];
        const pM0 = [x + c0 * midR, y, z + s0 * midR];
        const pM1 = [x + c1 * midR, y, z + s1 * midR];
        const pT0 = [x + c0 * topR, y + h * 0.5, z + s0 * topR];
        const pT1 = [x + c1 * topR, y + h * 0.5, z + s1 * topR];
        const lc = [1.0, 0.56, 0.22];
        const n0 = [c0, 0, s0], n1 = [c1, 0, s1];
        addTriSmooth(pB0, pB1, pM1, n0, n1, n1, lc, lc, lc, [4.0, 0.5, 0.2, 1.0], [4.0, 0.5, 0.2, 1.0], [4.0, 0.5, 0.5, 1.0]);
        addTriSmooth(pB0, pM1, pM0, n0, n1, n0, lc, lc, lc, [4.0, 0.5, 0.2, 1.0], [4.0, 0.5, 0.5, 1.0], [4.0, 0.5, 0.5, 1.0]);
        addTriSmooth(pM0, pM1, pT1, n0, n1, n1, lc, lc, lc, [4.0, 0.5, 0.5, 1.0], [4.0, 0.5, 0.5, 1.0], [4.0, 0.5, 0.8, 1.0]);
        addTriSmooth(pM0, pT1, pT0, n0, n1, n0, lc, lc, lc, [4.0, 0.5, 0.5, 1.0], [4.0, 0.5, 0.8, 1.0], [4.0, 0.5, 0.8, 1.0]);
      }
    }

    /**
     * Sweeping Concave Song-Dynasty Curved Roof with Dramatic Upturned Corner Eaves (飛檐翹角!)
     */
    function addSweepingRoof(cx, baseY, cz, halfW, halfD, roofH, rotY, eaveLift = 0.72, topFlat = 0.24) {
      const co = Math.cos(rotY), si = Math.sin(rotY);
      const tf = (lx, ly, lz) => [cx + lx * co + lz * si, baseY + ly, cz - lx * si + lz * co];
      const roofCol = [0.16, 0.26, 0.32]; // Deep Song glazed celadon-slate ceramic tile
      const ridgeCol = [0.76, 0.62, 0.34]; // Subtle aged gold/bronze ridge trim

      const N = 8, M = 6;
      const evalRoof = (nx, nz) => {
        // nx, nz in [-1, 1]
        const ax = Math.abs(nx), az = Math.abs(nz);
        const r = Math.max(ax, az); // square concentric rings
        // Concave catenary profile: steep near top ridge, sweeping gently at eaves
        const u = Math.max(0, (r - topFlat) / (1.0 - topFlat));
        let y = roofH * Math.pow(Math.max(0, 1.0 - u), 1.58);
        // Dramatic upturned corner eaves (飛檐翹角) near corners (ax & az both near 1)!
        const cornerMask = Math.pow(Math.min(ax, az), 2.4) * Math.pow(r, 2.2);
        const flare = 1.0 + 0.13 * cornerMask;
        y += cornerMask * eaveLift;
        // Subtle gable hip ridge accent along X
        if (r < topFlat) y = roofH + (topFlat - r) * 0.25;
        return tf(nx * halfW * flare, y, nz * halfD * flare);
      };

      // Build smooth curved grid over [-1, 1] x [-1, 1]
      const grid = [];
      for (let iz = 0; iz <= N; iz++) {
        const row = [];
        const nz = (iz / N) * 2 - 1;
        for (let ix = 0; ix <= N; ix++) {
          const nx = (ix / N) * 2 - 1;
          row.push(evalRoof(nx, nz));
        }
        grid.push(row);
      }

      // Compute smooth analytic normals for curved roof
      const norms = [];
      for (let iz = 0; iz <= N; iz++) {
        const nrow = [];
        for (let ix = 0; ix <= N; ix++) {
          const pL = grid[iz][Math.max(0, ix - 1)];
          const pR = grid[iz][Math.min(N, ix + 1)];
          const pD = grid[Math.max(0, iz - 1)][ix];
          const pU = grid[Math.min(N, iz + 1)][ix];
          const dx = [pR[0] - pL[0], pR[1] - pL[1], pR[2] - pL[2]];
          const dz = [pU[0] - pD[0], pU[1] - pD[1], pU[2] - pD[2]];
          // Upward normal: dz x dx
          let nx = dz[1] * dx[2] - dz[2] * dx[1];
          let ny = dz[2] * dx[0] - dz[0] * dx[2];
          let nz = dz[0] * dx[1] - dz[1] * dx[0];
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
          const ao00 = 0.78 + 0.22 * (1.0 - Math.max(Math.abs(u0 * 2 - 1), Math.abs(v0 * 2 - 1)));
          const ao11 = 0.78 + 0.22 * (1.0 - Math.max(Math.abs(u1 * 2 - 1), Math.abs(v1 * 2 - 1)));
          addTriSmooth(p00, p01, p11, n00, n01, n11, roofCol, roofCol, roofCol,
            [1.0, u0 * 14, v0 * 14, ao00], [1.0, u0 * 14, v1 * 14, ao00], [1.0, u1 * 14, v1 * 14, ao11]);
          addTriSmooth(p00, p11, p10, n00, n11, n10, roofCol, roofCol, roofCol,
            [1.0, u0 * 14, v0 * 14, ao00], [1.0, u1 * 14, v1 * 14, ao11], [1.0, u1 * 14, v0 * 14, ao11]);
        }
      }

      // Main roof ridge beam & twin upturned golden Chiwen (鴟吻) finials
      const ridgeLen = halfW * topFlat * 2.1;
      addBox(cx, baseY + roofH + 0.18, cz, ridgeLen, 0.28, 0.28, rotY, ridgeCol, 2.0, 0.85, 1.0);
      const chiL = tf(-ridgeLen * 0.52, roofH + 0.42, 0);
      const chiR = tf( ridgeLen * 0.52, roofH + 0.42, 0);
      addBox(chiL[0], chiL[1], chiL[2], 0.28, 0.55, 0.24, rotY, ridgeCol, 2.0, 0.85, 1.0);
      addBox(chiR[0], chiR[1], chiR[2], 0.28, 0.55, 0.24, rotY, ridgeCol, 2.0, 0.85, 1.0);

      // Dark wooden soffit trim underside so looking UP under eaves looks crafted
      addBox(cx, baseY - 0.08, cz, halfW * 1.72, 0.16, halfD * 1.72, rotY, [0.22, 0.14, 0.11], 2.0, 0.5, 0.65);

      return [
        tf(-halfW * 1.06, eaveLift * 0.72, -halfD * 1.06),
        tf( halfW * 1.06, eaveLift * 0.72, -halfD * 1.06),
        tf( halfW * 1.06, eaveLift * 0.72,  halfD * 1.06),
        tf(-halfW * 1.06, eaveLift * 0.72,  halfD * 1.06)
      ];
    }

    /**
     * Sweeping Octagonal Zanjian (攢尖頂) Pavilion Roof (or sleek oiled-paper parasol when addFinial=false)
     */
    function addOctagonalRoof(cx, baseY, cz, radius, roofH, eaveLift = 0.62, addFinial = true, customCol = null) {
      const roofCol = customCol || [0.16, 0.26, 0.32];
      const goldCol = [0.84, 0.68, 0.34];
      const rings = 6, segs = 8;
      const ringPts = [];
      for (let r = 0; r <= rings; r++) {
        const u = r / rings; // 0 = apex, 1 = eave
        const row = [];
        for (let s = 0; s < segs; s++) {
          const a = (s / segs) * Math.PI * 2 + Math.PI / 8;
          const rad = radius * (u * (1.0 + 0.12 * u * u));
          const y = baseY + roofH * Math.pow(1.0 - u, 1.65) + Math.pow(u, 3.2) * eaveLift;
          row.push([cx + Math.cos(a) * rad, y, cz + Math.sin(a) * rad]);
        }
        ringPts.push(row);
      }
      for (let r = 0; r < rings; r++) {
        for (let s = 0; s < segs; s++) {
          const s1 = (s + 1) % segs;
          const p00 = ringPts[r][s], p10 = ringPts[r][s1];
          const p01 = ringPts[r + 1][s], p11 = ringPts[r + 1][s1];
          addQuad(p00, p01, p11, p10, roofCol, customCol ? 2.0 : 1.0, 2.5, 2.5, 0.82, 0.95);
        }
      }
      if (addFinial) {
        // Golden lotus spire finial (寶頂)
        addCylinder(cx, baseY + roofH - 0.05, cz, 0.28, 0.05, 0.88, 8, goldCol, 2.0, 0.9, 1.0);
        addCylinder(cx, baseY - 0.12, cz, radius * 0.85, radius * 0.85, 0.18, 8, [0.22, 0.14, 0.10], 2.0, 0.55, 0.65);
      } else {
        // Tiny bamboo umbrella top bead
        addCylinder(cx, baseY + roofH - 0.02, cz, 0.09, 0.04, 0.14, 6, [0.32, 0.20, 0.14], 2.0, 0.85, 1.0);
      }
      return ringPts[rings];
    }

    function finish() {
      return { data: data.subarray(0, verts * 16), count: verts };
    }

    return { addTriSmooth, addTri, addQuad, addBox, addCylinder, addTaperedTube, addLantern, addSweepingRoof, addOctagonalRoof, finish };
  }

  /* ==========================================================================
     4. Calligraphic Foliage Brushstroke Builder (15 floats/vert)
     ========================================================================== */
  function createFoliageBuilder() {
    const arr = [];
    let quads = 0;

    function addDab(cx, cy, cz, size, nx, ny, nz, col, brushType, windFlex, seed) {
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
      for (let i = 0; i < 6; i++) {
        arr.push(
          cx, cy, cz,
          corners[i][0] * size, corners[i][1] * size,
          nx, ny, nz,
          col[0], col[1], col[2],
          seed, brushType, windFlex, size
        );
      }
      quads++;
    }

    function finish() {
      return { data: new Float32Array(arr), count: quads * 6 };
    }
    return { addDab, finish };
  }

  /* ==========================================================================
     5. Sculpted Song Trees (Gnarled Pines, Weeping Willows, Autumn Cinnabar Maples)
     ========================================================================== */
  function addInkPine(solid, foliage, x, z, scale = 1.0, leanX = 0.35, leanZ = 0.0, seed = 1.0, isMaple = false) {
    const gy = terrainHeight(x, z);
    if (gy < 0.25) return; // Never plant underwater
    const barkCol = [0.15, 0.12, 0.11];

    // Deeply grounded expressive S-curved Song pine trunk (迎客松蒼勁虯枝 — never a straight stick!)
    const h = 4.9 * scale;
    const sgn = leanX >= 0 ? 1 : -1;
    const sw = (0.65 + hash2(seed, 0.7) * 0.65) * sgn;
    const pts = [
      [x, gy - 1.8, z],
      [x + sw * 0.45 * scale, gy + h * 0.28, z + leanZ * 0.3 * scale],
      [x + sw * 1.25 * scale, gy + h * 0.58, z - leanZ * 0.35 * scale],
      [x + sw * 0.92 * scale, gy + h * 0.84, z + leanZ * 0.5 * scale],
      [x + sw * 1.48 * scale, gy + h * 1.02, z + leanZ * 0.7 * scale]
    ];
    solid.addTaperedTube(pts, [0.36 * scale, 0.27 * scale, 0.20 * scale, 0.13 * scale, 0.07 * scale], 6, barkCol, 5.0);

    // 5 dramatic asymmetrical horizontal sweeping Song boughs (橫斜疏影!)
    const branches = [
      { base: pts[1], tip: [pts[1][0] + sgn * 2.4 * scale, pts[1][1] + 0.55 * scale, pts[1][2] + 0.85 * scale] },
      { base: pts[2], tip: [pts[2][0] - sgn * 2.1 * scale, pts[2][1] + 0.35 * scale, pts[2][2] - 0.95 * scale] },
      { base: pts[2], tip: [pts[2][0] + sgn * 2.8 * scale, pts[2][1] + 0.48 * scale, pts[2][2] - 0.45 * scale] },
      { base: pts[3], tip: [pts[3][0] - sgn * 1.6 * scale, pts[3][1] + 0.62 * scale, pts[3][2] + 1.15 * scale] },
      { base: pts[4], tip: [pts[4][0] + sgn * 1.5 * scale, pts[4][1] + 0.38 * scale, pts[4][2] + 0.35 * scale] }
    ];

    const pinePalette = isMaple
      ? [[0.78, 0.22, 0.14], [0.88, 0.34, 0.16], [0.62, 0.14, 0.12]] // Radiant Song cinnabar maple!
      : [[0.10, 0.30, 0.26], [0.14, 0.38, 0.30], [0.08, 0.22, 0.24]]; // Rich deep Song azurite-pine ink!

    branches.forEach((br, bi) => {
      const mid = [
        (br.base[0] + br.tip[0]) * 0.5,
        (br.base[1] + br.tip[1]) * 0.5 - 0.18 * scale,
        (br.base[2] + br.tip[2]) * 0.5
      ];
      solid.addTaperedTube([br.base, mid, br.tip], [0.12 * scale, 0.075 * scale, 0.03 * scale], 5, barkCol, 5.0);

      // Flat layered horizontal Song ink-pine pads around each outstretched bough!
      const dabs = 9;
      for (let d = 0; d < dabs; d++) {
        const s = seed * 31.7 + bi * 13.3 + d * 7.9;
        const ang = (d / dabs) * Math.PI * 2 + hash2(s, 1.1) * 0.9;
        const rad = (0.35 + hash2(s, 2.3) * 1.35) * scale;
        const dy = (hash2(s, 3.7) - 0.35) * 0.42 * scale;
        const cx = br.tip[0] + Math.cos(ang) * rad;
        const cy = br.tip[1] + dy + 0.18 * scale;
        const cz = br.tip[2] + Math.sin(ang) * rad;
        const nl = Math.hypot(Math.cos(ang) * 0.55, 0.80, Math.sin(ang) * 0.55);
        const col = pinePalette[d % pinePalette.length];
        foliage.addDab(
          cx, cy, cz,
          (0.92 + hash2(s, 4.9) * 0.58) * scale,
          (Math.cos(ang) * 0.55) / nl, 0.80 / nl, (Math.sin(ang) * 0.55) / nl,
          col, isMaple ? 2.0 : 0.0, 0.42 + hash2(s, 5.1) * 0.35, hash2(s, 6.3) * 100.0
        );
      }
    });
  }

  function addInkWillow(solid, foliage, x, z, scale = 1.0, leanDir = 1.0, seed = 1.0) {
    const gy = terrainHeight(x, z);
    if (gy < 0.05) return;
    const barkCol = [0.20, 0.16, 0.13];
    const h = 4.2 * scale;
    const pts = [
      [x, gy - 1.6, z],
      [x + leanDir * 0.55 * scale, gy + h * 0.42, z + 0.18 * scale],
      [x + leanDir * 1.35 * scale, gy + h * 0.86, z - 0.12 * scale],
      [x + leanDir * 1.95 * scale, gy + h * 1.05, z + 0.10 * scale]
    ];
    solid.addTaperedTube(pts, [0.32 * scale, 0.22 * scale, 0.14 * scale, 0.07 * scale], 6, barkCol, 5.0);

    // Sweeping outer willow boughs draping toward the river
    const willowCols = [
      [0.20, 0.45, 0.32],
      [0.29, 0.54, 0.34],
      [0.14, 0.36, 0.27]
    ];
    const anchors = [
      pts[2],
      pts[3],
      [pts[2][0] - leanDir * 0.9 * scale, pts[2][1] + 0.35 * scale, pts[2][2] + 0.9 * scale],
      [pts[3][0] + leanDir * 0.65 * scale, pts[3][1] - 0.15 * scale, pts[3][2] - 0.8 * scale]
    ];
    anchors.forEach((anc, ai) => {
      for (let i = 0; i < 6; i++) {
        const s = seed * 23.1 + ai * 11.7 + i * 5.3;
        const ang = (i / 6) * Math.PI * 2 + hash2(s, 1.3) * 0.6;
        const rad = (0.35 + hash2(s, 2.7) * 1.15) * scale;
        const cx = anc[0] + Math.cos(ang) * rad;
        const cz = anc[2] + Math.sin(ang) * rad;
        const cy = anc[1] - (0.55 + hash2(s, 3.1) * 0.95) * scale;
        const col = willowCols[(i + ai) % willowCols.length];
        foliage.addDab(
          cx, cy, cz,
          (1.15 + hash2(s, 4.1) * 0.52) * scale,
          Math.cos(ang) * 0.45, 0.78, Math.sin(ang) * 0.45,
          col, 1.0, 0.95 + hash2(s, 5.3) * 0.45, hash2(s, 6.7) * 100.0
        );
      }
    });
  }

  /* ==========================================================================
     6. Hero Song Architecture: Rainbow Bridge, Lakeside Pavilions, Cliff Tower & Pagoda
     ========================================================================== */
  function buildRainbowBridge(solid) {
    const cx = riverCenterX(BRIDGE_Z);
    const span = 24.4;
    const width = 4.5;
    const segs = 24;
    const woodDark = [0.34, 0.22, 0.15];
    const woodDeck = [0.46, 0.33, 0.22];
    const vermilion = [0.58, 0.18, 0.14];
    const stone = [0.46, 0.44, 0.40];

    // Carved Song stone bridgehead piers anchored deep below riverbed
    for (const side of [-1, 1]) {
      const bx = cx + side * (span * 0.5 + 1.2);
      solid.addBox(bx, 0.2, BRIDGE_Z, 3.6, 5.2, width + 1.4, 0, stone, 3.0, 0.58, 0.92);
      solid.addBox(bx, 2.9, BRIDGE_Z, 4.0, 0.35, width + 1.8, 0, [0.55, 0.52, 0.46], 3.0, 0.82, 1.0);
    }

    // Interlocking timber arch deck & structural beams (貫木虹橋結構!)
    for (let i = 0; i < segs; i++) {
      const u0 = -1 + (i / segs) * 2;
      const u1 = -1 + ((i + 1) / segs) * 2;
      const x0 = cx + u0 * (span * 0.5);
      const x1 = cx + u1 * (span * 0.5);
      const y0 = 2.15 + 5.65 * Math.pow(1.0 - u0 * u0, 0.92);
      const y1 = 2.15 + 5.65 * Math.pow(1.0 - u1 * u1, 0.92);
      const hw = width * 0.5;
      const thick = 0.55;

      // Top timber plank surface
      solid.addQuad(
        [x0, y0, BRIDGE_Z - hw], [x1, y1, BRIDGE_Z - hw],
        [x1, y1, BRIDGE_Z + hw], [x0, y0, BRIDGE_Z + hw],
        woodDeck, 2.0, 1.5, 2.5, 0.92, 0.92
      );
      // Underside arch soffit (richly visible when sailing/flying underneath!)
      solid.addQuad(
        [x0, y0 - thick, BRIDGE_Z + hw], [x1, y1 - thick, BRIDGE_Z + hw],
        [x1, y1 - thick, BRIDGE_Z - hw], [x0, y0 - thick, BRIDGE_Z - hw],
        woodDark, 2.0, 1.5, 2.5, 0.52, 0.52
      );
      // Side structural wooden arch ribs (both N and S faces)
      for (const sgn of [-1, 1]) {
        const zf = BRIDGE_Z + sgn * hw;
        const pA = [x0, y0 - thick - 0.18, zf], pB = [x1, y1 - thick - 0.18, zf];
        const pC = [x1, y1 + 0.08, zf], pD = [x0, y0 + 0.08, zf];
        if (sgn > 0) solid.addQuad(pA, pB, pC, pD, woodDark, 2.0, 1.0, 0.5, 0.72, 0.85);
        else solid.addQuad(pB, pA, pD, pC, woodDark, 2.0, 1.0, 0.5, 0.72, 0.85);

        // True continuous curved vermilion lacquer railings following exact arch slope (ZERO stair-stepping!)
        const addSlopedRail = (hOff, railH, halfT) => {
          const a0 = y0 + hOff, a1 = y1 + hOff;
          const b0 = a0 + railH, b1 = a1 + railH;
          const zOut = zf + halfT, zIn = zf - halfT;
          // Outer & inner vertical faces
          solid.addQuad([x0, a0, zOut], [x1, a1, zOut], [x1, b1, zOut], [x0, b0, zOut], vermilion, 2.0, 1.0, 0.2, 0.85, 0.98);
          solid.addQuad([x1, a1, zIn],  [x0, a0, zIn],  [x0, b0, zIn],  [x1, b1, zIn],  vermilion, 2.0, 1.0, 0.2, 0.82, 0.95);
          // Top cap along arch slope
          solid.addQuad([x0, b0, zOut], [x1, b1, zOut], [x1, b1, zIn],  [x0, b0, zIn],  vermilion, 2.0, 1.0, 0.2, 0.95, 1.0);
        };
        addSlopedRail(0.92, 0.13, 0.075); // Top handrail
        addSlopedRail(0.48, 0.08, 0.055); // Mid rail
        addSlopedRail(0.08, 0.11, 0.075); // Base curb beam
      }

      // Vertical carved lotus posts (望柱) & glowing Song hanging silk lanterns!
      if (i % 2 === 0 || i === segs - 1) {
        const xm = (x0 + x1) * 0.5, ym = (y0 + y1) * 0.5;
        for (const sgn of [-1, 1]) {
          const zf = BRIDGE_Z + sgn * hw;
          solid.addBox(xm, ym + 0.58, zf, 0.15, 1.16, 0.15, 0, vermilion, 2.0, 0.82, 1.0);
          // Carved lotus finial bead on each bridge post
          solid.addBox(xm, ym + 1.22, zf, 0.20, 0.14, 0.20, 0, [0.80, 0.68, 0.44], 2.0, 0.9, 1.0);
          // Cross tie beam peeking out underneath the arch (signature Song Rainbow Bridge detail!)
          if (i % 4 === 0) {
            solid.addBox(xm, ym - thick - 0.1, BRIDGE_Z, 0.24, 0.22, width + 0.85, 0, woodDark, 2.0, 0.55, 0.72);
          }
          // Warm glowing silk lanterns hung on curved poles along the arch!
          if (i % 4 === 2) {
            solid.addBox(xm, ym + 1.55, zf + sgn * 0.14, 0.07, 1.35, 0.07, 0, woodDark, 2.0, 0.8, 0.95);
            solid.addBox(xm, ym + 2.15, zf + sgn * 0.36, 0.07, 0.07, 0.52, 0, woodDark, 2.0, 0.85, 0.95);
            solid.addLantern(xm, ym + 1.72, zf + sgn * 0.55, 1.08);
          }
        }
      }
    }

    // 2 delicate Qingming-style oiled-paper umbrellas (ZERO pagoda spires on top!) & Song travellers
    const stallX = [cx - 5.2, cx + 5.2];
    const canopyCols = [[0.68, 0.20, 0.16], [0.84, 0.74, 0.54]];
    stallX.forEach((sx, idx) => {
      const u = (sx - cx) / (span * 0.5);
      const sy = 2.15 + 5.65 * Math.pow(1.0 - u * u, 0.92);
      const sz = BRIDGE_Z - 1.25;
      solid.addCylinder(sx, sy, sz, 0.045, 0.035, 2.15, 5, woodDark, 2.0, 0.8, 0.95);
      solid.addOctagonalRoof(sx, sy + 1.98, sz, 1.32, 0.36, 0.02, false, canopyCols[idx]);
      // Small wooden tea table
      solid.addBox(sx, sy + 0.42, sz + 0.15, 1.05, 0.84, 0.55, 0, woodDark, 2.0, 0.72, 0.9);
      // Poetic cloaked Song scholar silhouette
      const fx = sx + (idx === 0 ? 2.8 : -2.6);
      const fu = (fx - cx) / (span * 0.5);
      const fy = 2.15 + 5.65 * Math.pow(1.0 - fu * fu, 0.92);
      solid.addCylinder(fx, fy, BRIDGE_Z + 1.3, 0.24, 0.15, 1.25, 6, canopyCols[1 - idx], 8.0, 0.75, 0.95);
      solid.addCylinder(fx, fy + 1.25, BRIDGE_Z + 1.3, 0.13, 0.12, 0.26, 6, [0.85, 0.76, 0.65], 8.0, 0.9, 1.0);
    });
  }

  function addGrandPavilion(solid, x, z, rotY, stories = 2, scale = 1.0) {
    const gy = terrainHeight(x, z);
    const wallCol = [0.88, 0.83, 0.74]; // Warm antique Song lime plaster
    const woodCol = [0.48, 0.18, 0.14]; // Aged cinnabar-lacquer timber
    const darkWood = [0.24, 0.16, 0.13];
    const stoneCol = [0.49, 0.47, 0.43];
    const winCol = [1.0, 0.68, 0.30];   // Warm glowing interior candlelit lattice windows!

    const w = 5.4 * scale, d = 4.2 * scale;
    const baseTop = Math.max(gy + 0.85 * scale, 1.85);
    const foundH = baseTop - (gy - 3.2);
    // Solid stone foundation terrace plunged deeply into earth/water
    solid.addBox(x, baseTop - foundH * 0.5, z, w + 1.6 * scale, foundH, d + 1.6 * scale, rotY, stoneCol, 3.0, 0.58, 0.92);
    solid.addBox(x, baseTop + 0.12 * scale, z, w + 1.9 * scale, 0.24 * scale, d + 1.9 * scale, rotY, [0.58, 0.55, 0.49], 3.0, 0.84, 1.0);

    const co = Math.cos(rotY), si = Math.sin(rotY);
    const tf = (lx, ly, lz) => [x + lx * co + lz * si, ly, z - lx * si + lz * co];

    let curY = baseTop + 0.24 * scale;
    for (let s = 0; s < stories; s++) {
      const shrink = Math.pow(0.82, s);
      const sw = w * shrink, sd = d * shrink;
      const fh = (s === 0 ? 3.25 : 2.75) * scale;

      // Recessed Song lime-plaster core wall
      solid.addBox(x, curY + fh * 0.5, z, sw * 0.84, fh, sd * 0.84, rotY, wallCol, 3.0, 0.72, 0.96);

      // Warm candlelit wooden lattice windows on all 4 facades (MatID 4 -> subtle warm glow!)
      const winH = fh * 0.52;
      const winW = sw * 0.56;
      const winD = sd * 0.52;
      const fN = tf(0, curY + fh * 0.52,  sd * 0.43);
      const fS = tf(0, curY + fh * 0.52, -sd * 0.43);
      const fE = tf( sw * 0.43, curY + fh * 0.52, 0);
      const fW = tf(-sw * 0.43, curY + fh * 0.52, 0);
      solid.addBox(fN[0], fN[1], fN[2], winW, winH, 0.08, rotY, winCol, 4.0, 0.9, 1.0);
      solid.addBox(fS[0], fS[1], fS[2], winW, winH, 0.08, rotY, winCol, 4.0, 0.9, 1.0);
      solid.addBox(fE[0], fE[1], fE[2], 0.08, winH, winD, rotY, winCol, 4.0, 0.9, 1.0);
      solid.addBox(fW[0], fW[1], fW[2], 0.08, winH, winD, rotY, winCol, 4.0, 0.9, 1.0);

      // Outer perimeter lacquered Song columns & veranda railings (美人靠)
      const colPts = [
        [-sw * 0.5, -sd * 0.5], [0, -sd * 0.5], [sw * 0.5, -sd * 0.5],
        [-sw * 0.5,  sd * 0.5], [0,  sd * 0.5], [sw * 0.5,  sd * 0.5]
      ];
      colPts.forEach(([lx, lz]) => {
        const p = tf(lx, curY, lz);
        solid.addCylinder(p[0], p[1], p[2], 0.14 * scale, 0.12 * scale, fh, 6, woodCol, 2.0, 0.72, 0.95);
      });
      // Perimeter beam & veranda railing
      solid.addBox(x, curY + fh - 0.14 * scale, z, sw + 0.35 * scale, 0.28 * scale, sd + 0.35 * scale, rotY, darkWood, 2.0, 0.65, 0.85);
      solid.addBox(x, curY + 0.52 * scale, z, sw + 0.18 * scale, 0.12 * scale, sd + 0.18 * scale, rotY, woodCol, 2.0, 0.8, 0.95);

      // Dramatic sweeping concave Song upturned roof!
      const roofCorners = solid.addSweepingRoof(
        x, curY + fh, z,
        sw * 0.76, sd * 0.78,
        (s === stories - 1 ? 2.45 : 1.38) * scale,
        rotY,
        (s === stories - 1 ? 0.88 : 0.55) * scale,
        s === stories - 1 ? 0.22 : 0.45
      );

      // Hang glowing silk lanterns beneath front corners of eaves!
      if (s === 0) {
        roofCorners.forEach((rc) => solid.addLantern(rc[0], rc[1] - 0.55 * scale, rc[2], 0.92 * scale));
      }

      curY += fh + (s === stories - 1 ? 0 : 0.72 * scale);
    }
  }

  function addOctagonalWaterPavilion(solid, x, z, scale = 1.0) {
    const gy = terrainHeight(x, z);
    const stoneCol = [0.47, 0.45, 0.41];
    const woodCol = [0.52, 0.18, 0.14];
    const baseTop = Math.max(gy + 0.65, 1.45);
    const r = 2.85 * scale;

    // Octagonal stone pier rooted below riverbed
    solid.addCylinder(x, gy - 3.0, z, r * 1.18, r * 1.12, baseTop - (gy - 3.0), 8, stoneCol, 3.0, 0.58, 0.94);

    // 8 slender vermilion lacquer columns
    const h = 3.1 * scale;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const px = x + Math.cos(a) * (r * 0.88);
      const pz = z + Math.sin(a) * (r * 0.88);
      solid.addCylinder(px, baseTop, pz, 0.12 * scale, 0.10 * scale, h, 6, woodCol, 2.0, 0.75, 0.96);
    }
    // Central glowing warm tea-table lantern inside pavilion!
    solid.addLantern(x, baseTop + h * 0.62, z, 1.35 * scale);
    // Double sweeping octagonal upturned roof (重檐八角攢尖頂!)
    const eaveTips = solid.addOctagonalRoof(x, baseTop + h, z, r * 1.38, 1.95 * scale, 0.68 * scale);
    solid.addOctagonalRoof(x, baseTop + h + 1.15 * scale, z, r * 0.92, 1.85 * scale, 0.55 * scale);
    // Hang delicate corner lanterns on alternating eaves
    for (let i = 0; i < 8; i += 2) {
      const et = eaveTips[i];
      solid.addLantern(et[0], et[1] - 0.55 * scale, et[2], 0.82 * scale);
    }
  }

  function addDistantCloudPagoda(solid, x, z, scale = 1.0) {
    const gy = terrainHeight(x, z);
    const wallCol = [0.85, 0.79, 0.70];
    let curY = gy - 1.5;
    solid.addCylinder(x, curY, z, 2.8 * scale, 2.5 * scale, 2.6 * scale, 8, [0.46, 0.44, 0.40], 3.0, 0.6, 0.9);
    curY += 2.6 * scale;
    const tiers = 5;
    for (let t = 0; t < tiers; t++) {
      const s = Math.pow(0.84, t);
      const r = 2.0 * s * scale;
      const h = 1.95 * s * scale;
      solid.addCylinder(x, curY, z, r, r * 0.94, h, 8, wallCol, 3.0, 0.75, 0.96);
      // Warm lit window ring at top tier
      if (t >= 2) solid.addLantern(x, curY + h * 0.5, z + r * 0.92, 0.75 * scale);
      solid.addOctagonalRoof(x, curY + h, z, r * 1.55, 1.15 * s * scale, 0.36 * s * scale);
      curY += h + 0.55 * s * scale;
    }
  }

  /* ==========================================================================
     7. Terrain Mesh (160x160 High-Resolution Song Karst Valley)
     ========================================================================== */
  function buildTerrain(solid) {
    const N = 152;
    const minX = -105, maxX = 105;
    const minZ = -132, maxZ = 78;
    const dx = (maxX - minX) / N;
    const dz = (maxZ - minZ) / N;

    const pts = [];
    const nrm = [];
    const col = [];
    const aoArr = [];

    for (let iz = 0; iz <= N; iz++) {
      const z = minZ + iz * dz;
      const pr = [], nr = [], cr = [], ar = [];
      for (let ix = 0; ix <= N; ix++) {
        const x = minX + ix * dx;
        const h = terrainHeight(x, z);
        const n = terrainNormal(x, z);
        pr.push([x, h, z]);
        nr.push(n);

        // True Museum 《千里江山圖》 Song Mineral Pigment Palette (赭石 -> 石綠 -> 石青花青!)
        const slope = 1.0 - n[1];
        const ochre = [0.68, 0.54, 0.34];     // Warm burnt ochre earth (赭石)
        const malachite = [0.14, 0.46, 0.38]; // Jewel mineral malachite green (石綠)
        const azurite = [0.09, 0.26, 0.44];   // Deep Wang Ximeng azurite blue (石青)
        const tGreen = smoothstep(0.9, 8.5, h);
        const tBlue = smoothstep(9.0, 26.0, h) * 0.92 + smoothstep(0.28, 0.68, slope) * 0.48;
        let r = mix(ochre[0], malachite[0], tGreen);
        let g = mix(ochre[1], malachite[1], tGreen);
        let b = mix(ochre[2], malachite[2], tGreen);
        const tb = Math.min(1.0, tBlue);
        r = mix(r, azurite[0], tb);
        g = mix(g, azurite[1], tb);
        b = mix(b, azurite[2], tb);
        cr.push([r, g, b]);

        // Valley & crevice ambient occlusion
        const ao = 0.68 + 0.32 * smoothstep(-1.0, 14.0, h);
        ar.push(ao);
      }
      pts.push(pr); nrm.push(nr); col.push(cr); aoArr.push(ar);
    }

    for (let iz = 0; iz < N; iz++) {
      for (let ix = 0; ix < N; ix++) {
        const p00 = pts[iz][ix], p10 = pts[iz][ix + 1], p11 = pts[iz + 1][ix + 1], p01 = pts[iz + 1][ix];
        // Skip purely deep underwater quads to save fillrate (water plane covers them)
        if (p00[1] < -2.3 && p10[1] < -2.3 && p11[1] < -2.3 && p01[1] < -2.3) continue;
        const n00 = nrm[iz][ix], n10 = nrm[iz][ix + 1], n11 = nrm[iz + 1][ix + 1], n01 = nrm[iz + 1][ix];
        const c00 = col[iz][ix], c10 = col[iz][ix + 1], c11 = col[iz + 1][ix + 1], c01 = col[iz + 1][ix];
        const a00 = aoArr[iz][ix], a10 = aoArr[iz][ix + 1], a11 = aoArr[iz + 1][ix + 1], a01 = aoArr[iz + 1][ix];

        solid.addTriSmooth(p00, p01, p11, n00, n01, n11, c00, c01, c11,
          [0.0, p00[0] * 0.05, p00[2] * 0.05, a00],
          [0.0, p01[0] * 0.05, p01[2] * 0.05, a01],
          [0.0, p11[0] * 0.05, p11[2] * 0.05, a11]);
        solid.addTriSmooth(p00, p11, p10, n00, n11, n10, c00, c11, c10,
          [0.0, p00[0] * 0.05, p00[2] * 0.05, a00],
          [0.0, p11[0] * 0.05, p11[2] * 0.05, a11],
          [0.0, p10[0] * 0.05, p10[2] * 0.05, a10]);
      }
    }
  }

  /* ==========================================================================
     8. Mirror Bianhe River Water Mesh (separate pass with planar reflection!)
     ========================================================================== */
  function buildWater() {
    const N = 84;
    const minX = -82, maxX = 82;
    const minZ = -124, maxZ = 68;
    const dx = (maxX - minX) / N;
    const dz = (maxZ - minZ) / N;
    const verts = [];

    for (let iz = 0; iz < N; iz++) {
      const z0 = minZ + iz * dz, z1 = z0 + dz;
      for (let ix = 0; ix < N; ix++) {
        const x0 = minX + ix * dx, x1 = x0 + dx;
        // Keep water triangles only where terrain dips near/below water
        const xm = (x0 + x1) * 0.5, zm = (z0 + z1) * 0.5;
        if (Math.abs(xm - riverCenterX(zm)) > riverHalfWidth(zm) + 12.0) continue;
        // pos3 + bary3
        verts.push(
          x0, 0, z0, 1, 0, 0,
          x0, 0, z1, 0, 1, 0,
          x1, 0, z1, 0, 0, 1,
          x0, 0, z0, 1, 0, 0,
          x1, 0, z1, 0, 1, 0,
          x1, 0, z0, 0, 0, 1
        );
      }
    }
    return { data: new Float32Array(verts), count: verts.length / 6 };
  }

  /* ==========================================================================
     9. Ethereal Silk Waterfall Ribbon (Right Cliff Peak x=+31, z=-37)
     ========================================================================== */
  function buildWaterfall() {
    const wb = createSolidBuilder(2048);
    const streams = [
      { x: 30.8, z: -36.5, w: 2.8, topY: 22.8, botY: 0.2, curve: 3.4 },
      { x: 33.4, z: -38.8, w: 1.6, topY: 20.5, botY: 0.2, curve: 2.6 },
      { x: -24.5, z: -41.5, w: 1.5, topY: 16.5, botY: 0.2, curve: -2.4 } // Subtle distant left twin cascade!
    ];
    const col = [0.88, 0.94, 0.95];
    streams.forEach((st, idx) => {
      const segs = 22;
      const dir = st.curve >= 0 ? -1 : 1; // Flows inward toward the river valley
      for (let i = 0; i < segs; i++) {
        const v0 = i / segs, v1 = (i + 1) / segs;
        const y0 = mix(st.topY, st.botY, v0);
        const y1 = mix(st.topY, st.botY, v1);
        // Parabolic outward cascade curve toward river
        const out0 = Math.pow(v0, 0.72) * Math.abs(st.curve) * dir;
        const out1 = Math.pow(v1, 0.72) * Math.abs(st.curve) * dir;
        const w0 = st.w * (0.65 + 0.55 * v0);
        const w1 = st.w * (0.65 + 0.55 * v1);
        const p00 = [st.x + out0, y0, st.z - w0 * 0.5];
        const p10 = [st.x + out0, y0, st.z + w0 * 0.5];
        const p11 = [st.x + out1, y1, st.z + w1 * 0.5];
        const p01 = [st.x + out1, y1, st.z - w1 * 0.5];
        const n = [dir * 0.85, 0.25, 0.45];
        wb.addTriSmooth(p00, p01, p11, n, n, n, col, col, col,
          [6.0, 0.0, v0, idx], [6.0, 0.0, v1, idx], [6.0, 1.0, v1, idx]);
        wb.addTriSmooth(p00, p11, p10, n, n, n, col, col, col,
          [6.0, 0.0, v0, idx], [6.0, 1.0, v1, idx], [6.0, 1.0, v0, idx]);
      }
    });
    return wb.finish();
  }

  /* ==========================================================================
     10. 《山海經》Ethereal Spirit-Ink Giant Kun (48-ring Ultra-Smooth Leviathan!)
     ========================================================================== */
  function buildKun() {
    const kb = createSolidBuilder(16384);
    const rings = 44;
    const radSegs = 20;
    const bodyLen = 28.0;

    function profile(s) {
      // s in [0 (nose), 1 (tail base)] -> monumental sweeping celestial whale silhouette
      const nose = Math.pow(Math.sin(Math.min(1, s * 2.2) * Math.PI * 0.5), 0.72);
      const taper = Math.pow(Math.max(0.03, 1.0 - Math.pow(s, 1.38)), 1.08);
      const rx = 2.45 * nose * taper + 0.08;
      const ry = 1.95 * nose * taper + 0.06;
      const cy = Math.sin(s * Math.PI * 1.15) * 0.72 - s * 0.35;
      return { rx, ry, cy };
    }

    const bodyColTop = [0.09, 0.24, 0.38]; // Deep celestial indigo-jade
    const bodyColBel = [0.68, 0.84, 0.82]; // Soft luminous mist-jade belly

    for (let i = 0; i < rings; i++) {
      const s0 = i / rings, s1 = (i + 1) / rings;
      const z0 = (0.36 - s0) * bodyLen, z1 = (0.36 - s1) * bodyLen;
      const p0 = profile(s0), p1 = profile(s1);
      for (let j = 0; j < radSegs; j++) {
        const a0 = (j / radSegs) * Math.PI * 2;
        const a1 = ((j + 1) / radSegs) * Math.PI * 2;
        const c0 = Math.cos(a0), sn0 = Math.sin(a0);
        const c1 = Math.cos(a1), sn1 = Math.sin(a1);

        const v00 = [c0 * p0.rx, p0.cy + sn0 * p0.ry, z0];
        const v10 = [c1 * p0.rx, p0.cy + sn1 * p0.ry, z0];
        const v11 = [c1 * p1.rx, p1.cy + sn1 * p1.ry, z1];
        const v01 = [c0 * p1.rx, p1.cy + sn0 * p1.ry, z1];

        const mkN = (c, sn, pr) => {
          const nx = c / pr.rx, ny = sn / pr.ry, nz = 0.12;
          const l = Math.hypot(nx, ny, nz) || 1;
          return [nx / l, ny / l, nz / l];
        };
        const n00 = mkN(c0, sn0, p0), n10 = mkN(c1, sn1, p0);
        const n11 = mkN(c1, sn1, p1), n01 = mkN(c0, sn0, p1);

        const mkC = (sn) => {
          const t = smoothstep(-0.65, 0.55, sn);
          return [mix(bodyColBel[0], bodyColTop[0], t), mix(bodyColBel[1], bodyColTop[1], t), mix(bodyColBel[2], bodyColTop[2], t)];
        };
        const col0 = mkC(sn0), col1 = mkC(sn1);

        // extra4: [7.0 (Kun body), s (spine phase), 0.0 (body flag), angle01]
        kb.addTriSmooth(v00, v01, v11, n00, n01, n11, col0, col0, col1,
          [7.0, s0, 0.0, j / radSegs], [7.0, s1, 0.0, j / radSegs], [7.0, s1, 0.0, (j + 1) / radSegs]);
        kb.addTriSmooth(v00, v11, v10, n00, n11, n10, col0, col1, col1,
          [7.0, s0, 0.0, j / radSegs], [7.0, s1, 0.0, (j + 1) / radSegs], [7.0, s0, 0.0, (j + 1) / radSegs]);
      }
    }

    // Sweeping Gossamer Celestial Silk Wings (羽翼如垂天之雲: 16x10 smooth double-sided translucent fins!)
    const wingU = 16, wingV = 10;
    const wingCol = [0.34, 0.72, 0.76];
    for (const side of [-1, 1]) {
      for (let iu = 0; iu < wingU; iu++) {
        const u0 = iu / wingU, u1 = (iu + 1) / wingU;
        for (let iv = 0; iv < wingV; iv++) {
          const v0 = iv / wingV, v1 = (iv + 1) / wingV;
          const ptWing = (u, v) => {
            // u = span [0..1], v = chord [0..1]
            const span = 1.45 + u * 14.5;
            const chordLen = 7.4 * Math.pow(Math.sin(Math.min(1, u * 0.92 + 0.08) * Math.PI), 0.65) + 0.6;
            const sweepBack = Math.pow(u, 1.35) * 11.2;
            const zLead = 5.4 - sweepBack;
            const z = zLead - v * chordLen;
            const archY = 0.25 + Math.sin(u * Math.PI * 0.85) * 1.45 - Math.pow(u, 1.8) * 1.65 - v * 0.45;
            const spineS = Math.max(0.08, Math.min(0.95, 0.36 - z / bodyLen));
            return { p: [side * span, archY, z], s: spineS };
          };
          const w00 = ptWing(u0, v0), w10 = ptWing(u1, v0), w11 = ptWing(u1, v1), w01 = ptWing(u0, v1);
          const nUp = [side * 0.14, 0.96, 0.12];
          // extra4: [7.0, spineS, wingSpan u (0.05..1.0 signals gossamer wing!), chord v]
          const ex = (w, u, v) => [7.0, w.s, 0.08 + u * 0.92, v];
          kb.addTriSmooth(w00.p, w10.p, w11.p, nUp, nUp, nUp, wingCol, wingCol, wingCol, ex(w00, u0, v0), ex(w10, u1, v0), ex(w11, u1, v1));
          kb.addTriSmooth(w00.p, w11.p, w01.p, nUp, nUp, nUp, wingCol, wingCol, wingCol, ex(w00, u0, v0), ex(w11, u1, v1), ex(w01, u0, v1));
        }
      }
    }

    // Flowing Twin Gossamer Ribbon Tails (如鳳尾雲帶 trailing gracefully 18m behind!)
    const tailSegs = 22;
    const tailCol = [0.85, 0.66, 0.42]; // Warm cinnabar-gold silk veil!
    for (const side of [-1, 1]) {
      for (let i = 0; i < tailSegs; i++) {
        const t0 = i / tailSegs, t1 = (i + 1) / tailSegs;
        const ptTail = (t, edge) => {
          const z = -17.4 - t * 18.5;
          const spread = side * (0.25 + Math.pow(t, 0.88) * 4.8);
          const waveY = Math.sin(t * 3.8 + side * 0.8) * 1.15 - t * 0.6;
          const halfW = (1.15 * (1.0 - t * 0.72)) * (0.35 + Math.sin(t * Math.PI) * 0.85);
          return [spread, waveY + edge * halfW, z];
        };
        const p00 = ptTail(t0, -1), p01 = ptTail(t0, 1), p11 = ptTail(t1, 1), p10 = ptTail(t1, -1);
        const n = [side * 0.85, 0.4, 0.2];
        const s0 = 0.95 + t0 * 0.65, s1 = 0.95 + t1 * 0.65;
        kb.addTriSmooth(p00, p10, p11, n, n, n, tailCol, tailCol, tailCol,
          [7.0, s0, 0.35 + t0 * 0.65, 0.0], [7.0, s1, 0.35 + t1 * 0.65, 0.0], [7.0, s1, 0.35 + t1 * 0.65, 1.0]);
        kb.addTriSmooth(p00, p11, p01, n, n, n, tailCol, tailCol, tailCol,
          [7.0, s0, 0.35 + t0 * 0.65, 0.0], [7.0, s1, 0.35 + t1 * 0.65, 1.0], [7.0, s0, 0.35 + t0 * 0.65, 1.0]);
      }
    }

    // Flowing Dorsal Silk Crest Ribbon along spine
    const crestSegs = 20;
    for (let i = 0; i < crestSegs; i++) {
      const t0 = i / crestSegs, t1 = (i + 1) / crestSegs;
      const s0 = 0.14 + t0 * 0.78, s1 = 0.14 + t1 * 0.78;
      const pr0 = profile(s0), pr1 = profile(s1);
      const z0 = (0.36 - s0) * bodyLen, z1 = (0.36 - s1) * bodyLen;
      const h0 = Math.sin(t0 * Math.PI) * 2.35, h1 = Math.sin(t1 * Math.PI) * 2.35;
      const b0 = [0, pr0.cy + pr0.ry * 0.85, z0], tP0 = [0, pr0.cy + pr0.ry * 0.85 + h0, z0 - 0.55];
      const b1 = [0, pr1.cy + pr1.ry * 0.85, z1], tP1 = [0, pr1.cy + pr1.ry * 0.85 + h1, z1 - 0.55];
      const n = [1, 0.2, 0];
      kb.addTriSmooth(b0, b1, tP1, n, n, n, tailCol, tailCol, tailCol,
        [7.0, s0, 0.25, 0.0], [7.0, s1, 0.25, 0.0], [7.0, s1, 0.92, 1.0]);
      kb.addTriSmooth(b0, tP1, tP0, n, n, n, tailCol, tailCol, tailCol,
        [7.0, s0, 0.25, 0.0], [7.0, s1, 0.92, 1.0], [7.0, s0, 0.92, 1.0]);
    }

    return kb.finish();
  }

  /* ==========================================================================
     11. Song Covered Wooden Sampan (烏篷船) & Soaring Ink Crane (丹頂墨鶴)
     ========================================================================== */
  function buildSampan() {
    const sb = createSolidBuilder(2048);
    const hullCol = [0.34, 0.22, 0.15];
    const deckCol = [0.54, 0.40, 0.26];
    const canopyCol = [0.20, 0.22, 0.24]; // Woven black-bamboo Song awning (烏篷)
    const segs = 10;
    const len = 5.4;
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs, t1 = (i + 1) / segs;
      const z0 = (t0 - 0.5) * len, z1 = (t1 - 0.5) * len;
      const w0 = Math.sin(t0 * Math.PI) * 0.92 + 0.08;
      const w1 = Math.sin(t1 * Math.PI) * 0.92 + 0.08;
      const yUp0 = 0.36 + Math.pow(Math.abs(t0 - 0.5) * 2, 2.2) * 0.52;
      const yUp1 = 0.36 + Math.pow(Math.abs(t1 - 0.5) * 2, 2.2) * 0.52;
      const yBot0 = -0.18 + Math.pow(Math.abs(t0 - 0.5) * 2, 2.5) * 0.35;
      const yBot1 = -0.18 + Math.pow(Math.abs(t1 - 0.5) * 2, 2.5) * 0.35;
      // Deck
      sb.addQuad([-w0 * 0.85, yUp0 - 0.12, z0], [w0 * 0.85, yUp0 - 0.12, z0], [w1 * 0.85, yUp1 - 0.12, z1], [-w1 * 0.85, yUp1 - 0.12, z1], deckCol, 2.0, 1, 1, 0.8, 0.8);
      // Left & right curved hull flanks
      sb.addQuad([-w0 * 0.65, yBot0, z0], [-w0, yUp0, z0], [-w1, yUp1, z1], [-w1 * 0.65, yBot1, z1], hullCol, 2.0, 1, 1, 0.65, 0.85);
      sb.addQuad([w0, yUp0, z0], [w0 * 0.65, yBot0, z0], [w1 * 0.65, yBot1, z1], [w1, yUp1, z1], hullCol, 2.0, 1, 1, 0.85, 0.65);
    }
    // Arched woven bamboo canopy over middle third
    const archSegs = 8;
    for (let i = 0; i < archSegs; i++) {
      const a0 = (i / archSegs) * Math.PI, a1 = ((i + 1) / archSegs) * Math.PI;
      const x0 = Math.cos(a0) * 0.82, y0 = 0.36 + Math.sin(a0) * 0.88;
      const x1 = Math.cos(a1) * 0.82, y1 = 0.36 + Math.sin(a1) * 0.88;
      sb.addQuad([x0, y0, -1.05], [x0, y0, 1.05], [x1, y1, 1.05], [x1, y1, -1.05], canopyCol, 2.0, 1, 1, 0.72, 0.92);
    }
    // Warm glowing bow lantern (casts pretty gold streak on the mirror river!)
    sb.addCylinder(0, 0.62, 2.15, 0.03, 0.025, 0.88, 5, hullCol, 2.0, 0.8, 0.95);
    sb.addLantern(0, 1.18, 2.38, 0.85);
    return sb.finish();
  }

  function buildCrane() {
    const cb = createSolidBuilder(512);
    const white = [0.95, 0.93, 0.88];
    const ink = [0.10, 0.12, 0.14];
    const crown = [0.80, 0.18, 0.15];
    // Slender body & outstretched neck
    cb.addTaperedTube([[0, 0, -0.9], [0, 0.05, 0], [0, 0.10, 1.15], [0, 0.06, 1.55]], [0.06, 0.22, 0.07, 0.03], 5, white, 8.0);
    cb.addBox(0, 0.15, 1.12, 0.09, 0.06, 0.14, 0, crown, 8.0, 0.9, 1.0);
    // Graceful sweeping wings with black primary ink tips (extra4.z = wing span for flap animation!)
    for (const side of [-1, 1]) {
      const p0 = [0, 0.06, 0.35], p1 = [0, 0.06, -0.35];
      const p2 = [side * 1.15, 0.22, -0.15], p3 = [side * 1.15, 0.22, 0.32];
      const p4 = [side * 2.15, 0.08, -0.42], p5 = [side * 2.15, 0.08, 0.05];
      const n = [0, 1, 0];
      cb.addTriSmooth(p0, p1, p2, n, n, n, white, white, white, [9.0, 0, 0.0, 1], [9.0, 0, 0.0, 1], [9.0, 0, 0.55, 1]);
      cb.addTriSmooth(p0, p2, p3, n, n, n, white, white, white, [9.0, 0, 0.0, 1], [9.0, 0, 0.55, 1], [9.0, 0, 0.55, 1]);
      cb.addTriSmooth(p3, p2, p4, n, n, n, ink, ink, ink, [9.0, 0, 0.55, 1], [9.0, 0, 0.55, 1], [9.0, 0, 1.0, 1]);
      cb.addTriSmooth(p3, p4, p5, n, n, n, ink, ink, ink, [9.0, 0, 0.55, 1], [9.0, 0, 1.0, 1], [9.0, 0, 1.0, 1]);
    }
    return cb.finish();
  }

  /* ==========================================================================
     12. Volumetric Sea-of-Clouds Ribbons (Depth-Feathered Valley Mist)
     ========================================================================== */
  function buildClouds() {
    // 10 floats per vertex: center3, offset2, size2, alphaSeed3
    const arr = [];
    let count = 0;

    function addRibbon(cx, cy, cz, rx, ry, opacity, seed, layer) {
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
      for (let i = 0; i < 6; i++) {
        arr.push(cx, cy, cz, corners[i][0], corners[i][1], rx, ry, opacity, seed, layer);
      }
      count++;
    }

    // Layered valley cloud sea curling between mid and far peaks!
    for (let i = 0; i < 82; i++) {
      const s = i * 17.31 + 3.7;
      const tier = i < 30 ? 0 : (i < 60 ? 1 : 2);
      const z = tier === 0
        ? mix(-28, -56, hash2(s, 1.1))
        : (tier === 1 ? mix(-54, -88, hash2(s, 1.1)) : mix(-84, -122, hash2(s, 1.1)));
      const spreadX = tier === 0 ? 58 : (tier === 1 ? 74 : 92);
      const x = (hash2(s, 2.3) * 2 - 1) * spreadX;
      // Keep center directly around bridge clear so bridge stays crisp!
      if (z > -38 && Math.abs(x) < 16) continue;
      const y = tier === 0
        ? mix(4.5, 13.5, hash2(s, 3.7))
        : (tier === 1 ? mix(7.5, 22.0, hash2(s, 3.7)) : mix(11.0, 29.0, hash2(s, 3.7)));
      const rx = mix(11.0, 25.0, hash2(s, 4.9)) * (1 + tier * 0.28);
      const ry = rx * mix(0.28, 0.44, hash2(s, 5.1));
      const op = mix(0.28, 0.52, hash2(s, 6.2));
      addRibbon(x, y, z, rx, ry, op, hash2(s, 7.4) * 100.0, tier);
    }

    // Soft rising mist clouds right at the base of the Right Waterfall plunge pool!
    for (let i = 0; i < 8; i++) {
      const s = i * 9.7 + 41.2;
      addRibbon(27.5 + (hash2(s, 1) - 0.5) * 6.0, 1.8 + hash2(s, 2) * 3.8, -36.5 + (hash2(s, 3) - 0.5) * 5.0,
        5.5 + hash2(s, 4) * 4.0, 3.2 + hash2(s, 5) * 2.2, 0.48, hash2(s, 6) * 50, 0);
    }

    return { data: new Float32Array(arr), count: count * 6 };
  }

  /* ==========================================================================
     13. Spirit Ink Embers, Firefly Dust & Waterfall Spray (1,100 Particles)
     ========================================================================== */
  function buildParticles() {
    // 6 floats per particle: seedX, seedY, seedZ, phase, size, kind (0=Kun gold spirit, 1=Kun ink smoke, 2=Valley firefly/petal)
    const total = 1050;
    const arr = new Float32Array(total * 6);
    for (let i = 0; i < total; i++) {
      const s = i * 11.17 + 0.5;
      const kind = i < 420 ? 0.0 : (i < 680 ? 1.0 : 2.0);
      arr[i * 6 + 0] = hash2(s, 1.3);
      arr[i * 6 + 1] = hash2(s, 2.7);
      arr[i * 6 + 2] = hash2(s, 3.9);
      arr[i * 6 + 3] = hash2(s, 4.1) * Math.PI * 2;
      arr[i * 6 + 4] = kind === 1.0 ? mix(9.0, 22.0, hash2(s, 5.3)) : mix(3.5, 9.5, hash2(s, 5.3));
      arr[i * 6 + 5] = kind;
    }
    return { data: arr, count: total };
  }

  /* ==========================================================================
     14. Master World Assembly
     ========================================================================== */
  function buildWorld() {
    const solid = createSolidBuilder(131072);
    const foliage = createFoliageBuilder();

    // 1. Monumental Song Karst Gorge Terrain
    buildTerrain(solid);

    // 2. Hero Song Rainbow Bridge (汴水虹橋)
    buildRainbowBridge(solid);

    // 3. Four Iconic Handcrafted Architectural Landmarks (ZERO clutter near foreground spawn!)
    const leftBankX = riverCenterX(-13.0) - 16.5;
    addGrandPavilion(solid, leftBankX, -13.0, 0.34, 2, 1.05);              // 臨水重檐酒樓
    const rightBankX = riverCenterX(-25.5) + 15.8;
    addOctagonalWaterPavilion(solid, rightBankX, -25.5, 1.08);             // 望江八角亭
    addGrandPavilion(solid, -26.5, -31.5, 0.58, 1, 0.88);                  // 崖上聽濤亭
    addDistantCloudPagoda(solid, 36.0, -56.0, 1.08);                       // 遠山雲頂寶塔

    // Small wooden boat dock right below the left lakeside pavilion
    solid.addBox(leftBankX + 6.4, 0.32, -9.2, 3.2, 0.25, 4.6, 0.25, [0.38, 0.26, 0.18], 2.0, 0.72, 0.92);
    for (const dx of [-1.2, 1.2]) {
      for (const dz of [-1.8, 1.8]) {
        solid.addCylinder(leftBankX + 6.4 + dx, -1.8, -9.2 + dz, 0.11, 0.11, 2.45, 5, [0.24, 0.16, 0.12], 2.0, 0.6, 0.85);
      }
    }

    // Southern Ferry Lantern Pier & Lakeside Pavilion far behind spawn (z=+48) so turning 180° is pure poetry!
    const southPierX = riverCenterX(46.0) - 16.5;
    addOctagonalWaterPavilion(solid, southPierX, 46.0, 0.92);
    solid.addBox(southPierX + 5.2, 0.32, 43.5, 3.0, 0.25, 4.4, -0.2, [0.38, 0.26, 0.18], 2.0, 0.72, 0.92);
    solid.addLantern(southPierX + 6.4, 2.35, 42.0, 0.95);
    solid.addCylinder(southPierX + 6.4, 0.3, 42.0, 0.06, 0.05, 2.35, 5, [0.24, 0.16, 0.12], 2.0, 0.7, 0.95);

    // 4. Calligraphic Ink Pines, Weeping Willows, Autumn Cinnabar Maples & Waterside Reeds
    //    (Strictly grounded via terrainHeight() and keeping spawn radius 100% open!)
    const treeSpecs = [
      // Graceful weeping willows hugging the embankments near bridge & pavilions
      { type: "willow", x: riverCenterX(-8.5) - 12.2, z: -8.5, s: 1.08, lean: 1.0 },
      { type: "willow", x: riverCenterX(-23.5) - 12.4, z: -23.5, s: 1.15, lean: 1.0 },
      { type: "willow", x: riverCenterX(-11.0) + 11.8, z: -11.0, s: 1.12, lean: -1.0 },
      { type: "willow", x: riverCenterX(-29.0) + 14.5, z: -29.0, s: 1.05, lean: -1.0 },
      // Distant scenic riverside willows framing left/right far edges (well outside spawn!)
      { type: "willow", x: riverCenterX(12.0) - 16.5, z: 12.0, s: 1.15, lean: 1.0 },
      { type: "willow", x: riverCenterX(10.0) + 16.8, z: 10.0, s: 1.10, lean: -1.0 },
      { type: "willow", x: riverCenterX(36.0) - 18.5, z: 36.0, s: 1.15, lean: 1.0 },
      { type: "willow", x: riverCenterX(38.0) + 19.0, z: 38.0, s: 1.15, lean: -1.0 },

      // Dramatic Song autumn cinnabar maples (丹楓點睛 — museum color accent!)
      { type: "maple", x: leftBankX - 5.2, z: -16.8, s: 1.05, lean: 0.45 },
      { type: "maple", x: rightBankX + 4.4, z: -21.5, s: 0.96, lean: -0.45 },
      { type: "maple", x: -22.2, z: -30.0, s: 0.92, lean: 0.55 },

      // Iconic gnarled Song cliff pines (黃山迎客松) clinging to rock ledges!
      { type: "pine", x: -30.5, z: -34.2, s: 1.25, lean: 0.72 },
      { type: "pine", x: -25.0, z: -26.5, s: 1.12, lean: 0.55 },
      { type: "pine", x: -34.0, z: -25.0, s: 1.18, lean: 0.60 },
      { type: "pine", x: -19.5, z: -6.0, s: 1.05, lean: 0.40 },
      { type: "pine", x: 22.8, z: -15.5, s: 1.18, lean: -0.60 },
      { type: "pine", x: 25.5, z: -32.0, s: 1.28, lean: -0.75 },
      { type: "pine", x: 35.0, z: -29.0, s: 1.22, lean: -0.65 },
      { type: "pine", x: 22.0, z: -3.5, s: 1.08, lean: -0.45 },
      { type: "pine", x: -28.0, z: 8.0, s: 1.22, lean: 0.45 },
      { type: "pine", x: 29.0, z: 6.5, s: 1.20, lean: -0.45 },
      { type: "pine", x: -32.0, z: 28.0, s: 1.30, lean: 0.35 },
      { type: "pine", x: 33.0, z: 30.0, s: 1.28, lean: -0.35 },
      { type: "pine", x: -42.0, z: -42.0, s: 1.45, lean: 0.55 },
      { type: "pine", x: 42.0, z: -46.0, s: 1.48, lean: -0.55 },
      // Framing cliff pines around the Distant Cloud Pagoda & Southern Ferry Vista
      { type: "pine", x: 32.0, z: -53.5, s: 1.25, lean: -0.55 },
      { type: "maple", x: 39.5, z: -53.0, s: 1.10, lean: 0.45 },
      { type: "pine", x: -24.0, z: 54.0, s: 1.35, lean: 0.55 },
      { type: "pine", x: 26.0, z: 52.0, s: 1.38, lean: -0.50 },
      { type: "maple", x: riverCenterX(46.0) + 17.5, z: 46.0, s: 1.15, lean: -0.45 }
    ];

    treeSpecs.forEach((t, idx) => {
      if (t.type === "willow") addInkWillow(solid, foliage, t.x, t.z, t.s, t.lean, idx + 1);
      else addInkPine(solid, foliage, t.x, t.z, t.s, t.lean, (idx % 3 - 1) * 0.18, idx + 11, t.type === "maple");
    });

    // Delicate waterside ink reeds (蘆葦叢) along the shallow shore edges (brushType = 3.0)
    for (let i = 0; i < 64; i++) {
      const s = i * 7.13 + 2.1;
      const z = mix(-42, 44, hash2(s, 1.7));
      const side = (i % 2 === 0) ? -1 : 1;
      const hw = riverHalfWidth(z);
      const x = riverCenterX(z) + side * (hw + mix(-0.4, 1.4, hash2(s, 2.9)));
      const gy = terrainHeight(x, z);
      if (gy < -0.35 || gy > 1.35) continue;
      // Don't place reeds right on top of the bridge abutments
      if (Math.abs(z - BRIDGE_Z) < 4.5) continue;
      foliage.addDab(
        x, Math.max(0.15, gy) + 0.65, z,
        mix(0.85, 1.35, hash2(s, 3.3)),
        -side * 0.35, 0.88, 0.15,
        [0.30, 0.44, 0.32], 3.0, 1.0, hash2(s, 4.7) * 100.0
      );
    }

    const solidMesh = solid.finish();
    const waterMesh = buildWater();
    const foliageMesh = foliage.finish();
    const waterfallMesh = buildWaterfall();
    const kunMesh = buildKun();
    const sampanMesh = buildSampan();
    const craneMesh = buildCrane();
    const cloudsMesh = buildClouds();
    const particlesMesh = buildParticles();

    const totalTris = Math.round(
      (solidMesh.count + waterMesh.count + foliageMesh.count + waterfallMesh.count +
       kunMesh.count + sampanMesh.count * 3 + craneMesh.count * 7 + cloudsMesh.count) / 3
    );

    return {
      solid: solidMesh,
      water: waterMesh,
      foliage: foliageMesh,
      waterfall: waterfallMesh,
      kun: kunMesh,
      sampan: sampanMesh,
      crane: craneMesh,
      clouds: cloudsMesh,
      particles: particlesMesh,
      stats: { totalTris }
    };
  }

  return {
    BRIDGE_Z,
    riverCenterX,
    riverHalfWidth,
    terrainHeight,
    bridgeArchY,
    buildWorld
  };
})();
