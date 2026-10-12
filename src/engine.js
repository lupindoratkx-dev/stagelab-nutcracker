/* StageLab · engine.js
 * 极小的 WebGL2 渲染器：正交相机、几何体（方体/圆柱/球/小人/裙身/头部/短裙）、软阴影、点光源。
 * 所有物体用实例化绘制：每种几何体每一遍只发一次绘制命令，老电脑也能流畅播放。
 * 接口刻意做得很窄（init / render / project），以后要换成 Three.js 只需要重写这一个文件。
 */
(function () {
  'use strict';
  const SL = (window.SL = window.SL || {});

  SL.hex = function (h) {
    const n = parseInt(h.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };

  /* ---------- mat4 (column-major) ---------- */
  function mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
        o[c * 4 + r] = s;
      }
    return o;
  }
  function ortho(l, r, b, t, n, f) {
    const o = new Float32Array(16);
    o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n);
    o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1;
    return o;
  }
  function lookAt(e, c) {
    let fx = c[0] - e[0], fy = c[1] - e[1], fz = c[2] - e[2];
    let l = Math.hypot(fx, fy, fz); fx /= l; fy /= l; fz /= l;
    let sx = -fz, sz = fx; l = Math.hypot(sx, sz) || 1; sx /= l; sz /= l;
    const ux = -sz * fy, uy = sz * fx - sx * fz, uz = sx * fy;
    return new Float32Array([
      sx, ux, -fx, 0,
      0, uy, -fy, 0,
      sz, uz, -fz, 0,
      -(sx * e[0] + sz * e[2]), -(ux * e[0] + uy * e[1] + uz * e[2]), fx * e[0] + fy * e[1] + fz * e[2], 1,
    ]);
  }

  /* ---------- geometry ---------- */
  function boxGeo() {
    const P = [], N = [], I = [];
    [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].forEach((n) => {
      const u = n[0] ? [0, 1, 0] : [1, 0, 0];
      const v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
      const b = P.length / 3;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, c]) => {
        P.push(n[0] * 0.5 + u[0] * a * 0.5 + v[0] * c * 0.5, n[1] * 0.5 + u[1] * a * 0.5 + v[1] * c * 0.5, n[2] * 0.5 + u[2] * a * 0.5 + v[2] * c * 0.5);
        N.push(n[0], n[1], n[2]);
      });
      I.push(b, b + 1, b + 2, b, b + 2, b + 3);
    });
    return { P, N, I };
  }
  function lathe(profile, seg) {
    const P = [], N = [], I = [];
    profile.forEach(([r, y, nr, ny]) => {
      for (let j = 0; j <= seg; j++) {
        const a = (j / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        P.push(r * c, y, r * s); N.push(nr * c, ny, nr * s);
      }
    });
    for (let i = 0; i < profile.length - 1; i++)
      for (let j = 0; j < seg; j++) {
        const a = i * (seg + 1) + j, b = a + seg + 1;
        I.push(a, b, a + 1, a + 1, b, b + 1);
      }
    return { P, N, I };
  }
  function pawnGeo() {
    // 无脸小人：收分的身体 + 球形头部，原点在脚底，总高 ≈ 1
    // 观众用的“木偶人”：有肩、有颈、有头，但不分四肢
    const prof = [[0, 0, 0, -1], [0.17, 0, 0, -1], [0.17, 0, 1, -0.06], [0.2, 0.5, 1, -0.06], [0.2, 0.5, 0.8, 0.6], [0.15, 0.58, 0.5, 0.87], [0.07, 0.62, 0.3, 0.95], [0.06, 0.65, 1, 0]];
    for (let k = 1; k <= 9; k++) {
      const a = (k / 9) * Math.PI;
      prof.push([0.14 * Math.sin(a), 0.79 - 0.14 * Math.cos(a), Math.sin(a), -Math.cos(a)]);
    }
    return lathe(prof, 16);
  }
  function cylGeo() {
    return lathe([[0, 0, 0, -1], [0.5, 0, 0, -1], [0.5, 0, 1, 0], [0.5, 1, 1, 0], [0.5, 1, 0, 1], [0, 1, 0, 1]], 28);
  }
  // 收分的圆台：裙、袍、躯干；圆锥：兜帽、胡须
  function frustGeo() { return lathe([[0, 0, 0, -1], [0.5, 0, 0, -1], [0.5, 0, 0.981, 0.196], [0.3, 1, 0.981, 0.196], [0.3, 1, 0, 1], [0, 1, 0, 1]], 20); }
  function coneGeo() { return lathe([[0, 0, 0, -1], [0.5, 0, 0, -1], [0.5, 0, 0.894, 0.447], [0, 1, 0.894, 0.447]], 18); }
  function sphereGeo() {
    const prof = [];
    for (let k = 0; k <= 12; k++) {
      const a = (k / 12) * Math.PI;
      prof.push([0.5 * Math.sin(a), -0.5 * Math.cos(a), Math.sin(a), -Math.cos(a)]);
    }
    return lathe(prof, 18);
  }

  // 新增几何：上细下粗的裙身、蛋形头部、带厚度的芭蕾短裙
  function taperGeo() { return lathe([[0, 0, 0, -1], [0.5, 0, 0, -1], [0.5, 0, 0.95, 0.31], [0.17, 1, 0.95, 0.31], [0.17, 1, 0, 1], [0, 1, 0, 1]], 24); }
  function headGeo() {
    const prof = [];
    for (let k = 0; k <= 14; k++) {
      const a = (k / 14) * Math.PI, y = -0.5 * Math.cos(a), r = 0.5 * Math.sin(a) * (y < 0 ? 0.86 + 0.14 * (1 + y * 2) : 1);
      prof.push([r, y, Math.sin(a), -Math.cos(a)]);
    }
    return lathe(prof, 20);
  }
  function tutuGeo() { return lathe([[0, -0.5, 0, -1], [0.22, -0.5, 0.2, -1], [0.5, -0.12, 0.6, -0.8], [0.52, 0, 1, 0], [0.5, 0.12, 0.6, 0.8], [0.22, 0.5, 0.2, 1], [0, 0.5, 0, 1]], 28); }

  /* ---------- shaders：实例化绘制，每种几何体每一遍只画一次 ---------- */
  const VS = `#version 300 es
    layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor;
    layout(location=2) in vec3 iPos; layout(location=3) in vec3 iScale;
    layout(location=4) in vec3 iR0; layout(location=5) in vec3 iR1; layout(location=6) in vec3 iR2;
    layout(location=7) in vec3 iCol; layout(location=8) in vec3 iMat;
    uniform mat4 uVP, uLVP;
    out vec3 vN; out vec3 vW; out vec4 vL; flat out vec3 vCol; flat out vec3 vMat;
    void main(){
      mat3 R = mat3(iR0, iR1, iR2);
      vec3 w = R*(aPos*iScale) + iPos;
      vN = R*(aNor/iScale); vW = w; vL = uLVP*vec4(w,1.0); vCol = iCol; vMat = iMat;
      gl_Position = uVP*vec4(w,1.0);
    }`;
  const FS = (taps) => `#version 300 es
    #define TAPS ${taps}
    precision highp float; precision highp sampler2DShadow;
    in vec3 vN; in vec3 vW; in vec4 vL; flat in vec3 vCol; flat in vec3 vMat;
    uniform vec3 uSunDir, uSunCol, uSky, uGnd, uBg;
    uniform float uShK, uShR;
    uniform sampler2DShadow uSh;
    uniform vec4 uPL[4]; uniform vec3 uPLc[4];
    out vec4 o;
    const vec2 PD[8] = vec2[8](vec2(-0.613,0.354),vec2(0.170,-0.676),vec2(0.565,0.512),vec2(-0.295,-0.360),
                               vec2(0.932,-0.115),vec2(-0.880,-0.318),vec2(-0.096,0.930),vec2(0.343,0.062));
    void main(){
      vec3 n = normalize(vN);
      vec3 sc = vL.xyz*0.5+0.5;
      float sh = 1.0;
      if(sc.x>0.0&&sc.x<1.0&&sc.y>0.0&&sc.y<1.0&&sc.z<1.0){
        float bias = 0.0007 + 0.0022*(1.0-clamp(dot(n,uSunDir),0.0,1.0));
        #if TAPS > 1
        float s = 0.0;
        for(int i=0;i<TAPS;i++) s += texture(uSh, vec3(sc.xy + PD[i]*uShR, sc.z-bias));
        sh = s/float(TAPS);
        #else
        sh = texture(uSh, vec3(sc.xy, sc.z-bias));
        #endif
      }
      vec3 pl = vec3(0.0);
      for(int i=0;i<4;i++){
        vec3 d = uPL[i].xyz - vW; float dist = length(d);
        float a = clamp(1.0 - dist/max(uPL[i].w,0.001), 0.0, 1.0); a *= a;
        pl += uPLc[i]*a*(0.28 + 0.72*max(dot(n, d/max(dist,0.001)), 0.0));
      }
      vec3 c;
      if(vMat.z>0.5){
        // 地面：颜色与背景完全一致，只接收阴影和点光，保证“大面积留白”
        float sunI = clamp(max(uSunCol.r,max(uSunCol.g,uSunCol.b))*1.7, 0.0, 1.0);
        c = uBg*(1.0 - uShK*0.34*sunI*(1.0-sh)) + vCol*pl;
      } else {
        float ndl = max(dot(n,uSunDir),0.0);
        vec3 hemi = mix(uGnd,uSky,n.y*0.5+0.5);
        c = vCol*(hemi + uSunCol*ndl*mix(1.0-uShK,1.0,sh) + pl);
        c = mix(c, vCol, vMat.y);
      }
      o = vec4(c,vMat.x);
    }`;
  const DVS = `#version 300 es
    layout(location=0) in vec3 aPos;
    layout(location=2) in vec3 iPos; layout(location=3) in vec3 iScale;
    layout(location=4) in vec3 iR0; layout(location=5) in vec3 iR1; layout(location=6) in vec3 iR2;
    uniform mat4 uVP;
    void main(){ gl_Position = uVP*vec4(mat3(iR0,iR1,iR2)*(aPos*iScale) + iPos,1.0); }`;
  const DFS = `#version 300 es
    precision highp float; void main(){}`;

  const G = (SL.gfx = {});
  let gl, canvas, mp, dp, geos = {}, geoList = [], fbo, shTex, instBuf;
  let SH = 2048, maxDpr = 2;
  const MAIN_UNIFORMS = ['uVP', 'uLVP', 'uSunDir', 'uSunCol', 'uSky', 'uGnd', 'uBg', 'uShK', 'uShR', 'uSh', 'uPL', 'uPLc'];
  G.quality = 'high';
  G.stats = { items: 0, draws: 0 };
  let VP = new Float32Array(16), cssW = 1, cssH = 1;
  const STRIDE = 21;                          // pos3 scale3 rot9 color3 (op emis flat)3

  function compile(vs, fs, names) {
    const p = gl.createProgram();
    [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(([t, src]) => {
      const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    });
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = { p };
    names.forEach((n) => (u[n] = gl.getUniformLocation(p, n)));
    return u;
  }
  function upload(name, g) {
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const pb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.P), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    const nb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, nb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.N), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    for (let l = 2; l <= 8; l++) { gl.enableVertexAttribArray(l); gl.vertexAttribDivisor(l, 1); }
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(g.I), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    const o = { name, vao, n: g.I.length, id: geoList.length };
    geos[name] = o; geoList.push(o);
  }

  G.init = function (cv) {
    canvas = cv;
    gl = cv.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
    if (!gl) return false;
    instBuf = gl.createBuffer();
    dp = compile(DVS, DFS, ['uVP']);
    upload('box', boxGeo()); upload('pawn', pawnGeo()); upload('cyl', cylGeo()); upload('sphere', sphereGeo());
    upload('frust', frustGeo()); upload('cone', coneGeo()); upload('taper', taperGeo()); upload('head', headGeo()); upload('tutu', tutuGeo());
    fbo = gl.createFramebuffer();
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    G.setQuality('high');
    return true;
  };

  // high：2048 阴影图、8 次采样、高分屏；low：给集成显卡和老教室电脑用，画面略硬但流畅
  G.setQuality = function (q) {
    G.quality = q;
    const low = q === 'low';
    SH = low ? 1024 : 2048; maxDpr = low ? 1 : 2;
    if (mp) gl.deleteProgram(mp.p);
    mp = compile(VS, FS(low ? 1 : 8), MAIN_UNIFORMS);
    if (shTex) gl.deleteTexture(shTex);
    shTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, shTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SH, SH);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shTex, 0);
    gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  /* ---------- 实例数据 ---------- */
  let data = new Float32Array(STRIDE * 4096), fill = 0;
  function reserve(k) {
    if ((fill + k) * STRIDE <= data.length) return;
    let cap = data.length; while ((fill + k) * STRIDE > cap) cap *= 2;
    const d = new Float32Array(cap); d.set(data.subarray(0, fill * STRIDE)); data = d;
  }
  function write(it) {
    const o = fill * STRIDE; fill++;
    data[o] = it.x; data[o + 1] = it.y; data[o + 2] = it.z;
    data[o + 3] = it.sx; data[o + 4] = it.sy; data[o + 5] = it.sz;
    if (it.rot) { const r = it.rot; for (let k = 0; k < 9; k++) data[o + 6 + k] = r[k]; }
    else {
      const c = Math.cos(it.yaw), s = Math.sin(it.yaw), ct = Math.cos(it.tilt), st = Math.sin(it.tilt);
      data[o + 6] = c * ct; data[o + 7] = st; data[o + 8] = -s * ct; data[o + 9] = -c * st; data[o + 10] = ct; data[o + 11] = s * st; data[o + 12] = s; data[o + 13] = 0; data[o + 14] = c;
    }
    data[o + 15] = it.r; data[o + 16] = it.g; data[o + 17] = it.b;
    data[o + 18] = it.op; data[o + 19] = it.emis; data[o + 20] = it.flat ? 1 : 0;
  }
  function pointers(first) {
    const B = STRIDE * 4, base = first * B;
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, B, base);
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false, B, base + 12);
    gl.vertexAttribPointer(4, 3, gl.FLOAT, false, B, base + 24);
    gl.vertexAttribPointer(5, 3, gl.FLOAT, false, B, base + 36);
    gl.vertexAttribPointer(6, 3, gl.FLOAT, false, B, base + 48);
    gl.vertexAttribPointer(7, 3, gl.FLOAT, false, B, base + 60);
    gl.vertexAttribPointer(8, 3, gl.FLOAT, false, B, base + 72);
  }
  function drawRun(g, first, count) {
    if (!count) return;
    gl.bindVertexArray(g.vao); gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    pointers(first);
    gl.drawElementsInstanced(gl.TRIANGLES, g.n, gl.UNSIGNED_SHORT, 0, count);
    G.stats.draws++;
  }

  const plBuf = new Float32Array(16), plcBuf = new Float32Array(12), trans = [];
  const shadowRuns = [], mainRuns = [];

  G.render = function (items, n, env, cam) {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    cssW = canvas.clientWidth || 1; cssH = canvas.clientHeight || 1;
    const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }

    // camera
    const yaw = cam.yaw + cam.uyaw, pitch = Math.max(0.12, Math.min(1.35, cam.pitch + cam.upitch));
    const dx = Math.sin(yaw) * Math.cos(pitch), dy = Math.sin(pitch), dz = Math.cos(yaw) * Math.cos(pitch);
    const t = cam.t, eye = [t[0] + dx * 140, t[1] + dy * 140, t[2] + dz * 140];
    const aspect = cssW / cssH;
    const halfW = Math.max(cam.zoom * cam.uzoom * aspect, cam.zoom * cam.uzoom * 1.45), halfH = halfW / aspect;
    VP = mul(ortho(-halfW, halfW, -halfH, halfH, 1, 420), lookAt(eye, t));

    // sun
    const sy = env.sunYaw, sp = env.sunPitch;
    const lx = Math.sin(sy) * Math.cos(sp), ly = Math.sin(sp), lz = Math.cos(sy) * Math.cos(sp);
    const LVP = mul(ortho(-38, 38, -38, 38, 30, 150), lookAt([lx * 90, ly * 90, lz * 90 + 2], [0, 0, 2]));

    // 把这一帧的绘制项按几何体分组写进一块实例缓冲：阴影组、不透明组、按远近排序的透明组
    fill = 0; reserve(n * 2 + 8); G.stats.items = n; G.stats.draws = 0;
    shadowRuns.length = 0; mainRuns.length = 0; trans.length = 0;
    for (const g of geoList) {
      let first = fill;
      for (let i = 0; i < n; i++) { const it = items[i]; if (it.geo === g.name && it.op > 0.6 && !it.noShadow && !it.flat) write(it); }
      shadowRuns.push([g, first, fill - first]);
      first = fill;
      for (let i = 0; i < n; i++) { const it = items[i]; if (it.geo === g.name && it.op >= 0.995) write(it); }
      mainRuns.push([g, first, fill - first]);
    }
    for (let i = 0; i < n; i++) { const it = items[i]; if (it.op < 0.995 && it.op > 0.01) { it._d = it.x * dx + it.y * dy + it.z * dz; trans.push(it); } }
    trans.sort((a, b) => a._d - b._d);
    const transFirst = fill;
    for (const it of trans) write(it);
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, fill * STRIDE), gl.STREAM_DRAW);

    // shadow pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, SH, SH);
    gl.depthMask(true); gl.disable(gl.BLEND); gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(dp.p); gl.uniformMatrix4fv(dp.uVP, false, LVP);
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(2, 4);
    for (const r of shadowRuns) drawRun(r[0], r[1], r[2]);
    gl.disable(gl.POLYGON_OFFSET_FILL);

    // main pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, w, h);
    gl.clearColor(env.bg[0], env.bg[1], env.bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(mp.p);
    gl.uniformMatrix4fv(mp.uVP, false, VP); gl.uniformMatrix4fv(mp.uLVP, false, LVP);
    gl.uniform3f(mp.uSunDir, lx, ly, lz);
    gl.uniform3fv(mp.uSunCol, env.sun); gl.uniform3fv(mp.uSky, env.sky); gl.uniform3fv(mp.uGnd, env.gnd); gl.uniform3fv(mp.uBg, env.bg);
    gl.uniform1f(mp.uShK, env.shK); gl.uniform1f(mp.uShR, 2.4 / SH);
    for (let i = 0; i < 4; i++) {
      const L = env.pl[i];
      plBuf[i * 4] = L.p[0]; plBuf[i * 4 + 1] = L.p[1]; plBuf[i * 4 + 2] = L.p[2]; plBuf[i * 4 + 3] = L.r;
      plcBuf[i * 3] = L.c[0]; plcBuf[i * 3 + 1] = L.c[1]; plcBuf[i * 3 + 2] = L.c[2];
    }
    gl.uniform4fv(mp.uPL, plBuf); gl.uniform3fv(mp.uPLc, plcBuf);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, shTex); gl.uniform1i(mp.uSh, 0);
    for (const r of mainRuns) drawRun(r[0], r[1], r[2]);
    if (trans.length) {
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      // 透明物体必须按远近顺序画：相邻的同种几何体合并成一次
      let s = 0;
      for (let i = 1; i <= trans.length; i++) {
        if (i === trans.length || trans[i].geo !== trans[s].geo) { drawRun(geos[trans[s].geo], transFirst + s, i - s); s = i; }
      }
      gl.depthMask(true); gl.disable(gl.BLEND);
    }
    gl.bindVertexArray(null);
  };

  // world → CSS px
  G.project = function (x, y, z) {
    const cx = VP[0] * x + VP[4] * y + VP[8] * z + VP[12];
    const cy = VP[1] * x + VP[5] * y + VP[9] * z + VP[13];
    return { x: (cx * 0.5 + 0.5) * cssW, y: (1 - (cy * 0.5 + 0.5)) * cssH };
  };
  G.size = function () { return { w: cssW, h: cssH }; };
})();
