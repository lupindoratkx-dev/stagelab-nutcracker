/* StageLab · figures.js
 * 极简、无脸的小人：头、躯干、双臂、双腿（或长裙、芭蕾短裙），用几样服装特征区分角色。
 * 会走、会转身看人、会坐、会鞠躬抬手、会倒下；工作人员可以拿扫帚、戴耳机。
 * 局部坐标：+Z 是面朝的方向，Y 向上，尺寸按身高 h 给出。
 */
(function () {
  'use strict';
  const SL = window.SL, W = SL.world, C = W.C, hex = SL.hex;
  const SKIN = hex('#E9DDCC'), HAIR = hex('#3B2F28'), WHITE = hex('#F4F2EC'), BLACK = hex('#1E1C22');
  const CREW = C.crew;

  /* ---------- 角色与服装（颜色为示意，参考该版公开照片的大致色调） ---------- */
  const PINK_SHOE = hex('#E9C3BE'), TIGHTS = hex('#F1E4DE');
  const SPEC = (W.SPEC = {
    clara: { name: ['Clara', 'Clara', '故事的主人公', 'the heroine'], h: 1.2, top: hex('#C8323C'), robe: hex('#C8323C'), robeW: 0.54, hem: 0.3, stripes: WHITE, legs: TIGHTS, shoes: hex('#7E1A24'), hair: hex('#6A4A2C'), longhair: true },
    fritz: { name: ['弗里茨', 'Fritz', 'Clara 的弟弟', 'Clara’s brother'], h: 1.1, top: hex('#3F5FA8'), legs: hex('#2A2F45'), belt: WHITE, hair: hex('#7A5232') },
    mother: { name: ['母亲', 'Mother', '', ''], top: hex('#6B3F73'), robe: hex('#6B3F73'), robeW: 0.6, hem: 0, hair: hex('#4A3226'), bun: true, belt: hex('#E2BE62') },
    father: { name: ['父亲', 'Father', '', ''], top: hex('#2F4A3A'), coat: hex('#2F4A3A'), legs: hex('#2B2B30'), belt: hex('#E8DCC2'), hair: hex('#3A2A22') },
    guest1: { name: ['客人', 'A guest', '', ''], top: hex('#3E7C82'), robe: hex('#3E7C82'), robeW: 0.6, hem: 0, hair: hex('#B9763A'), bun: true },
    guest2: { name: ['客人', 'A guest', '', ''], top: hex('#6E4B33'), coat: hex('#6E4B33'), legs: hex('#2B2B30'), hair: hex('#2A2A2A') },
    kid1: { name: ['孩子', 'A child', '', ''], h: 1.06, top: hex('#E59BB0'), robe: hex('#E59BB0'), robeW: 0.6, hem: 0.3, legs: TIGHTS, hair: hex('#B9763A'), longhair: true },
    kid2: { name: ['孩子', 'A child', '', ''], h: 1.04, top: hex('#D9823B'), legs: hex('#3A3A44'), hair: hex('#3B2F28') },
    drossel: { name: ['德罗塞尔迈尔', 'Drosselmeier', 'Clara 的教父', 'Clara’s godfather'], h: 1.62, top: hex('#2B2733'), coat: hex('#2B2733'), legs: hex('#2B2733'), cape: hex('#C8323C'), tophat: BLACK, hair: hex('#CFCFC9') },
    nutcracker: { name: ['胡桃夹子', 'The Nutcracker', '', ''], h: 1.42, top: hex('#B8232F'), legs: WHITE, shoes: BLACK, shako: BLACK, beard: WHITE, belt: hex('#E2BE62'), hair: WHITE },
    prince: { name: ['王子', 'The Prince', '胡桃夹子变成的王子', 'the Nutcracker transformed'], h: 1.5, top: WHITE, legs: WHITE, shoes: hex('#E8DCC2'), cape: hex('#B8232F'), belt: hex('#E2BE62'), hair: hex('#6A4A2C') },
    mouseKing: { name: ['鼠王', 'The Mouse King', '', ''], h: 1.62, top: hex('#77777E'), legs: hex('#66666C'), ears: hex('#B9A2A6'), tail: true, crown: true, cape: hex('#4B2B63'), shoes: hex('#55555B') },
    snow1: { name: ['雪花', 'A snowflake', '', ''], top: hex('#F4F6FA'), legs: TIGHTS, shoes: PINK_SHOE, tutu: hex('#FFFFFF'), tutu2: hex('#EAF1FA'), bun: true },
    sugar: { name: ['糖果仙子', 'The Sugar Plum Fairy', '', ''], h: 1.52, top: hex('#B9A0E0'), legs: TIGHTS, shoes: PINK_SHOE, tutu: hex('#CDB8F0'), tutu2: hex('#E2D5F7'), bun: true, tiara: true },
    marz1: { name: ['杏仁糖之舞', 'Marzipan', '', ''], h: 1.45, top: hex('#F08FB2'), legs: TIGHTS, shoes: PINK_SHOE, tutu: hex('#F6B4CB'), tutu2: hex('#FBD3E0'), bun: true },
    ginger: { name: ['姜饼妈妈', 'Mother Ginger', '穿着巨大裙子出场', 'enters in a giant skirt'], top: hex('#C8323C'), legs: hex('#C8323C'), bonnet: hex('#F1E6CF'), bigskirt: [hex('#E8C35A'), hex('#C8323C')], hair: hex('#8A5A3A') },
    poli1: { name: ['小丑娃娃', 'A Polichinelle', '藏在裙下出场的孩子', 'a child hidden under the skirt'], h: 0.98, top: hex('#E8C35A'), legs: hex('#E8C35A'), pompoms: BLACK, hood: hex('#E8C35A'), ruff: WHITE, shoes: BLACK },
    sh1: { name: ['吊杆组', 'Fly-rail stagehand', '', ''], top: CREW, legs: CREW, hair: hex('#2A2A2A') },
    pr1: { name: ['道具组', 'Props crew', '', ''], top: CREW, legs: CREW, hair: hex('#3B2F28') },
    dr1: { name: ['服装组', 'Wardrobe crew', '', ''], top: hex('#34405A'), legs: hex('#2B2F3A'), hair: hex('#6A4A2C'), bun: true },
    sm: { name: ['舞台监督', 'Stage manager', '', ''], top: hex('#3A3A44'), legs: hex('#2B2B30'), headset: true, hair: hex('#7A5232'), bun: true },
    conductor: { name: ['指挥', 'Conductor', '', ''], top: BLACK, coat: BLACK, legs: BLACK, hair: hex('#BDBDB7') },
  });
  // 成组的角色共用一套服装
  const clone = (src, over) => Object.assign({}, SPEC[src], over || {});
  ['mouse1', 'mouse2', 'mouse3', 'mouse4'].forEach((id, i) => (SPEC[id] = { name: ['老鼠', 'A mouse', '', ''], h: 1.25, top: hex(['#8B8B90', '#7F7F85', '#909096', '#85858B'][i]), legs: hex('#6E6E74'), shoes: hex('#5E5E64'), ears: hex('#C2ABAF'), tail: true }));
  ['soldier1', 'soldier2', 'soldier3', 'soldier4'].forEach((id) => (SPEC[id] = { name: ['玩具兵', 'A toy soldier', '', ''], h: 1.15, top: hex('#B8232F'), legs: hex('#2B3F7A'), shoes: BLACK, shako: BLACK, belt: WHITE, hair: hex('#3B2F28') }));
  ['snow2', 'snow3', 'snow4', 'snow5', 'snow6'].forEach((id) => (SPEC[id] = clone('snow1')));
  ['marz2', 'marz3'].forEach((id) => (SPEC[id] = clone('marz1')));
  const POLI = ['#E8C35A', '#6A8FD8', '#E59BB0', '#7CC6A4'];
  for (let i = 2; i <= 8; i++) { const c = hex(POLI[(i - 1) % 4]); SPEC['poli' + i] = clone('poli1', { top: c, legs: c, hood: c }); }
  ['sh2', 'sh3'].forEach((id) => (SPEC[id] = clone('sh1')));
  ['pr2', 'pr3'].forEach((id) => (SPEC[id] = clone('pr1')));
  SPEC.dr2 = clone('dr1', { bun: false, hair: hex('#2A2A2A') });

  W.resetPerson = function (q) {
    q.op = 0; q.h = q.spec.h || 1.5; q.emis = 0; q.grey = 0;
    q.armL = 0; q.armR = 0; q.bow = 0; q.sit = 0; q.fall = 0; q.fallDir = 1;
    q.look = null; q.lockFace = false; q.spin = 0; q.spinV = 0; q.lift = 0; q.elbow = null;
    q.broom = false; q.sweep = 0; q._broomHead = null;
    q.skirtOp = 0; q.skirtY = 0; q.skirtOpen = 0;
    q._lx = null; q._lz = null; q.spd = 0;
  };
  Object.keys(SPEC).forEach((id, i) => {
    const q = (W.people[id] = { id, spec: SPEC[id], p: [0, 0, 0], yaw: 0, ph: i * 1.7, seed: i * 2.1 });
    W.resetPerson(q);
  });

  /* ---------- 3×3 矩阵（行主序） ---------- */
  const rX = (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
  const rY = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
  const rZ = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
  function mm(a, b) {
    const o = new Array(9);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    return o;
  }
  const mv = (m, x, y, z) => [m[0] * x + m[1] * y + m[2] * z, m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  function setRot(it, m) {
    const r = it._r || (it._r = new Float32Array(9));
    r[0] = m[0]; r[1] = m[3]; r[2] = m[6]; r[3] = m[1]; r[4] = m[4]; r[5] = m[7]; r[6] = m[2]; r[7] = m[5]; r[8] = m[8];
    it.rot = r;
  }

  /* ---------- 身体比例（占身高 h 的比例）：成人约七个半头身，孩子头大一些 ---------- */
  function body(h) {
    const kid = h < 1.26;
    return kid
      ? { foot: 0.035, shin: 0.215, thigh: 0.215, waist: 0.565, shoulder: 0.78, neck: 0.815, headC: 0.9, headH: 0.165, headW: 0.135, sw: 0.105, upper: 0.165, fore: 0.15, hand: 0.036, hip: 0.052, chest: 0.21, limb: 0.032 }
      : { foot: 0.03, shin: 0.235, thigh: 0.235, waist: 0.6, shoulder: 0.815, neck: 0.845, headC: 0.925, headH: 0.13, headW: 0.104, sw: 0.118, upper: 0.18, fore: 0.16, hand: 0.031, hip: 0.056, chest: 0.235, limb: 0.03 };
  }

  /* ---------- 骨架：步态、坐姿、鞠躬、倒下 ---------- */
  function rig(q, T) {
    const h = q.h, P = body(h), amp = Math.min(1, q.spd / 1.1) * (1 - q.sit) * (1 - q.fall);
    const ph = q.ph;
    const B = mm(rY(q.yaw), rX(-q.fallDir * q.fall * Math.PI / 2));
    const legLen = P.foot + P.shin + P.thigh;
    const hipY = (legLen - q.sit * (P.thigh - 0.005)) * h;
    const bob = (Math.abs(Math.cos(ph)) - 0.6) * 0.022 * h * amp;
    const breathe = Math.sin(T * 1.6 + q.seed) * 0.004 * h * (1 - amp);
    const sway = Math.sin(ph) * 0.05 * amp;
    const U = mm(B, mm(rZ(sway * 0.5), mm(rX(q.bow), rY(-sway))));
    const base = [q.p[0], q.p[1] + q.lift + q.fall * 0.12 * h + bob + breathe, q.p[2]];
    const hip = mv(B, 0, hipY, 0);
    const g = {
      h, P, B, U, hipY, amp, base, ph,
      low(x, y, z) { const v = mv(B, x, y, z); return [base[0] + v[0], base[1] + v[1], base[2] + v[2]]; },
      up(x, y, z) { const v = mv(U, x, y - hipY, z); return [base[0] + hip[0] + v[0], base[1] + hip[1] + v[1], base[2] + hip[2] + v[2]]; },
    };
    // 腿：大腿前后摆，摆动期屈膝；坐下时大腿水平、小腿垂直
    g.leg = (side) => {
      const s = side < 0 ? Math.sin(ph) : -Math.sin(ph), c = side < 0 ? Math.cos(ph) : -Math.cos(ph);
      const thigh = -s * 0.48 * amp - q.sit * Math.PI / 2;
      const knee = amp * (0.1 + 0.75 * Math.pow(Math.max(0, c), 1.4)) + q.sit * Math.PI / 2;
      return { thigh, knee };
    };
    g.swing = Math.sin(ph) * 0.42 * amp;
    return g;
  }
  W.headTop = function (q) { const g = rig(q, 0); return g.up(0, (g.P.headC + g.P.headH * 0.55) * q.h, 0); };
  W.headMid = function (q) { const g = rig(q, 0); return g.up(0, g.P.headC * q.h, 0); };

  function drawCrown(push, centre, R, radius, op, color) {
    if (op < 0.01) return;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, x = Math.sin(a) * radius, z = Math.cos(a) * radius;
      const d = mv(R, x, 0, z), at = [centre[0] + d[0], centre[1] + d[1], centre[2] + d[2]];
      const band = push('box', at[0], at[1], at[2], radius * 0.74, 0.05, 0.035, 0, color, op, 0.25);
      setRot(band, mm(R, rY(a))); band.noShadow = true;
      const tip = mv(R, x, 0.06 + (i % 2 ? 0 : 0.035), z);
      const tooth = push('cone', centre[0] + tip[0], centre[1] + tip[1], centre[2] + tip[2], 0.04, 0.11 + (i % 2 ? 0 : 0.07), 0.04, 0, color, op, 0.25);
      setRot(tooth, R); tooth.noShadow = true;
    }
  }

  /* ---------- 画一个人 ---------- */
  const SHOE = hex('#2A2426'), EYE = hex('#2A2224'), LIP = hex('#B8706A'), BROW = hex('#5A4636');
  function drawFigure(q, push, T) {
    const s = q.spec, g = rig(q, T), h = g.h, P = g.P, op = q.op, em = q.emis, k = q.grey, dead = C.shellDark;
    const col = (c) => (k > 0.001 ? [c[0] + (dead[0] - c[0]) * k, c[1] + (dead[1] - c[1]) * k, c[2] + (dead[2] - c[2]) * k] : c);
    const part = (geo, pos, sx, sy, sz, R, c, shadow) => {
      const it = push(geo, pos[0], pos[1], pos[2], sx * h, sy * h, sz * h, 0, col(c), op, em);
      setRot(it, R); it.noShadow = !shadow || em > 0.3;
      return it;
    };
    const legsCol = s.legs || s.top, skin = s.skin || SKIN, hem = s.robe ? (s.hem == null ? 0 : s.hem) : 1;

    // 巨大的裙子：不随骨架转动，直接立在地上（或挂在支撑架下）
    if (s.bigskirt && q.skirtOp > 0.01) {
      const so = q.skirtOp * op * (1 - 0.25 * q.skirtOpen), bx = q.p[0], by = q.p[1] + q.skirtY, bz = q.p[2];
      const R0 = 1.45 * (1 + 0.3 * q.skirtOpen), H0 = 2.3;
      push('cone', bx, by, bz, R0 * 2, H0, R0 * 2, 0, s.bigskirt[1], so);
      [0.06, 0.2, 0.34, 0.48].forEach((t, i) => {
        const r = R0 * (1 - t - 0.035) + 0.03;
        push('cyl', bx, by + H0 * t, bz, r * 2, 0.2, r * 2, 0, s.bigskirt[i % 2 ? 1 : 0], so).noShadow = true;
      });
      push('cyl', bx, by, bz, R0 * 2.05, 0.12, R0 * 2.05, 0, s.bigskirt[0], so).noShadow = true;
    }

    // —— 腿 ——
    if (!s.bigskirt && hem > 0.0) {
      for (const side of [-1, 1]) {
        const L = g.leg(side), hp = g.low(side * P.hip * h, g.hipY / h * h, 0);
        const Rt = mm(g.B, rX(L.thigh)), Rs = mm(Rt, rX(L.knee));
        const kn = add(hp, mv(Rt, 0, -P.thigh * h, 0)), an = add(kn, mv(Rs, 0, -P.shin * h, 0));
        part('cyl', hp, P.limb * 2.6, -P.thigh, P.limb * 2.6, Rt, legsCol, true);
        part('sphere', kn, P.limb * 2.25, P.limb * 2.25, P.limb * 2.25, Rt, legsCol, false);
        part('cyl', kn, P.limb * 2.1, -P.shin, P.limb * 2.1, Rs, legsCol, true);
        const foot = add(an, mv(g.B, 0, -P.foot * 0.5 * h, P.foot * 1.1 * h));
        const Rf = mm(g.B, rX(Math.min(0, L.thigh + L.knee) * 0.5));
        part('box', foot, P.limb * 2.4, P.foot, P.foot * 3.4, Rf, s.shoes || SHOE, true);
      }
    }
    // —— 下身服装 ——
    const waistY = g.hipY + (P.waist - (P.foot + P.shin + P.thigh)) * h;
    if (s.robe && !s.bigskirt) {
      const hemY = hem * h * (1 - q.sit * 0.6), len = waistY - hemY;
      const R0 = s.robeW * (q.sit ? 1 + 0.2 * q.sit : 1);
      part('taper', g.low(0, hemY, q.sit * 0.12 * h), R0, len / h, R0 * 0.88, g.B, s.robe, true);
      if (s.stripes) [0.06, 0.2].forEach((t) => {
        const r = R0 * (1 - 0.66 * t) + 0.008;
        part('cyl', g.low(0, hemY + len * t, q.sit * 0.12 * h * (1 - t)), r, 0.022, r * 0.88, g.B, s.stripes, false);
      });
    }
    if (s.coat) part('frust', g.up(0, g.hipY - 0.2 * h, -0.005 * h), 0.25, (waistY - g.hipY) / h + 0.2, 0.19, g.U, s.coat, true);
    if (s.tutu) {
      part('tutu', g.up(0, g.hipY + 0.035 * h, 0), 0.62, 0.05, 0.62, g.U, s.tutu, true);
      part('tutu', g.up(0, g.hipY + 0.065 * h, 0), 0.5, 0.045, 0.5, g.U, s.tutu2 || s.tutu, false);
    }
    // —— 躯干：腹部 + 上宽下窄的胸 ——
    part('cyl', g.up(0, g.hipY - 0.03 * h, 0), 0.15, (waistY - g.hipY) / h + 0.05, 0.11, g.U, s.pants || s.top, true);
    part('frust', g.up(0, P.shoulder * h + (g.hipY - (P.foot + P.shin + P.thigh) * h), 0), P.chest, -(P.shoulder - P.waist) - 0.01, P.chest * 0.62, g.U, s.top, true);
    const yShift = g.hipY - (P.foot + P.shin + P.thigh) * h;      // 坐下时整段上身下移
    const Y = (f) => f * h + yShift;
    if (s.belt) part('cyl', g.up(0, Y(P.waist) - 0.012 * h, 0), 0.165, 0.03, 0.12, g.U, s.belt, false);
    if (s.stripes && s.robe) part('cyl', g.up(0, Y(P.waist + 0.08), 0), 0.19, 0.035, 0.13, g.U, s.stripes, false);
    if (s.pompoms) for (let i = 0; i < 3; i++) part('sphere', g.up(0, Y(P.shoulder - 0.06 - i * 0.07), 0.075 * h), 0.05, 0.05, 0.05, g.U, s.pompoms, false);
    if (s.ruff) part('cyl', g.up(0, Y(P.shoulder) - 0.01 * h, 0), 0.24, 0.03, 0.2, g.U, s.ruff, false);
    if (s.cape) part('box', g.up(0, Y(P.shoulder - 0.2), -0.085 * h), 0.25, 0.4, 0.02, g.U, s.cape, false);

    // —— 手臂：肩、肘、手；芭蕾手位时肘部自然弯曲 ——
    const arms = [[-1, q.armL - g.swing], [1, q.armR + g.swing]];
    for (const [side, a] of arms) {
      const raise = a, hi = Math.max(0, Math.min(1, (a - 1.4) / 1.2));
      const abd = side * (0.1 + 0.18 * hi);
      const elbow = (q.elbow == null ? 0.22 : q.elbow) + 0.35 * hi + Math.abs(g.swing) * 0.3;
      const Ra = mm(g.U, mm(rZ(abd), rX(-raise)));
      const Rf = mm(Ra, mm(rX(-elbow), rZ(-side * 0.25 * hi)));
      const sh = g.up(side * P.sw * h, Y(P.shoulder) - 0.025 * h, 0);
      const el = add(sh, mv(Ra, 0, -P.upper * h, 0)), hd = add(el, mv(Rf, 0, -P.fore * h, 0));
      part('sphere', sh, P.limb * 2.7, P.limb * 2.7, P.limb * 2.7, Ra, s.top, false);
      part('cyl', sh, P.limb * 2.3, -P.upper, P.limb * 2.3, Ra, s.sleeve || s.top, true);
      part('sphere', el, P.limb * 2.05, P.limb * 2.05, P.limb * 2.05, Ra, s.sleeve || s.top, false);
      part('cyl', el, P.limb * 1.9, -P.fore, P.limb * 1.9, Rf, s.sleeve || s.top, false);
      part('sphere', hd, P.hand * 2, P.hand * 2.3, P.hand * 1.6, Rf, s.gloves || skin, false);
      if (side === 1) q._hand = hd;
    }
    // 扫帚：柄从右手伸到地面，扫帚头左右摆
    if (q.broom) {
      const sw = Math.sin(T * 4.2 + q.seed) * 0.32 * q.sweep;
      const head = g.low((0.12 + sw) * h, 0.03, 0.55 * h); head[1] = q.p[1] + 0.06;
      W.seg(q._hand, head, 0.045, hex('#B98B53'), op);
      const hb = push('box', head[0], head[1], head[2], 0.62, 0.12, 0.2, q.yaw + Math.PI / 2 + sw, hex('#D9C08A'), op); hb.noShadow = true;
      q._broomHead = head;
    } else q._broomHead = null;
    if (s.tail) W.seg(g.up(0, g.hipY - 0.02 * h, -0.09 * h), g.low(0.16 * h, 0.03, -0.62 * h), 0.04, s.legs || s.top, op);

    // —— 颈与头 ——
    part('cyl', g.up(0, Y(P.shoulder) - 0.01 * h, 0), 0.055, P.neck - P.shoulder + 0.03, 0.055, g.U, s.ears ? s.top : skin, false);
    const hc = g.up(0, Y(P.headC), 0), HW = P.headW, HH = P.headH;
    const Hd = g.U;
    part('head', hc, HW, HH, HW * 1.08, Hd, s.ears ? s.top : skin, true);
    const F = (x, y, z) => g.up(x * h, Y(P.headC) + y * h, z * h);
    if (!s.ears) {
      // 脸：眼睛、眉、鼻子、嘴，小而克制
      for (const sx of [-1, 1]) {
        part('sphere', F(sx * HW * 0.21, HH * 0.04, HW * 0.47), HW * 0.13, HW * 0.16, HW * 0.08, Hd, EYE, false);
        if (h > 1.0) part('box', F(sx * HW * 0.22, HH * 0.17, HW * 0.47), HW * 0.2, HW * 0.035, HW * 0.04, Hd, s.brow || BROW, false);
      }
      part('sphere', F(0, -HH * 0.06, HW * 0.53), HW * 0.12, HW * 0.16, HW * 0.12, Hd, skin, false);
      part('sphere', F(0, -HH * 0.24, HW * 0.45), HW * 0.24, HW * 0.06, HW * 0.08, Hd, LIP, false);
    } else {
      // 老鼠：尖鼻、圆耳、黑眼
      part('cone', F(0, -HH * 0.08, HW * 0.38), HW * 0.42, HW * 0.55, HW * 0.42, mm(Hd, rX(Math.PI / 2)), s.top, false);
      part('sphere', F(0, -HH * 0.08, HW * 0.96), HW * 0.16, HW * 0.16, HW * 0.16, Hd, BLACK, false);
      for (const sx of [-1, 1]) {
        part('sphere', F(sx * HW * 0.26, HH * 0.1, HW * 0.38), HW * 0.12, HW * 0.12, HW * 0.08, Hd, BLACK, false);
        part('sphere', F(sx * HW * 0.45, HH * 0.5, -HW * 0.05), HW * 0.5, HW * 0.5, HW * 0.14, Hd, s.ears, false);
      }
    }
    // 头发与帽子
    const hairC = s.hair || HAIR;
    if (s.hood) part('cone', F(0, HH * 0.18, -HW * 0.05), HW * 1.2, HH * 1.9, HW * 1.2, Hd, s.hood, false);
    else if (!s.ears && !s.bald) {
      part('sphere', F(0, HH * 0.1, -HW * 0.1), HW * 1.08, HH * 0.92, HW * 1.1, Hd, hairC, false);
      if (s.longhair) part('box', F(0, -HH * 0.45, -HW * 0.42), HW * 0.95, HH * 1.25, HW * 0.32, Hd, hairC, false);
      if (s.bun) part('sphere', F(0, HH * 0.42, -HW * 0.5), HW * 0.5, HW * 0.5, HW * 0.5, Hd, hairC, false);
    }
    if (s.beard) part('cone', F(0, -HH * 0.3, HW * 0.35), HW * 0.8, -HH * 0.9, HW * 0.5, Hd, s.beard, false);
    if (s.shako) { part('cyl', F(0, HH * 0.32, 0), HW * 1.05, HH * 1.45, HW * 1.05, Hd, s.shako, false); part('box', F(0, HH * 1.3, HW * 0.52), HW * 0.32, HW * 0.32, HW * 0.06, Hd, C.gold, false); part('cyl', F(0, HH * 0.3, HW * 0.2), HW * 1.2, HH * 0.08, HW * 1.1, Hd, BLACK, false); }
    if (s.tophat) { part('cyl', F(0, HH * 0.42, 0), HW * 1.7, HH * 0.08, HW * 1.7, Hd, s.tophat, false); part('cyl', F(0, HH * 0.45, 0), HW * 1.08, HH * 1.25, HW * 1.08, Hd, s.tophat, false); part('cyl', F(0, HH * 0.6, 0), HW * 1.1, HH * 0.18, HW * 1.1, Hd, C.scarlet, false); }
    if (s.bonnet) part('sphere', F(0, HH * 0.2, -HW * 0.12), HW * 1.5, HH * 0.85, HW * 1.45, Hd, s.bonnet, false);
    if (s.headset) { part('box', F(0, HH * 0.56, 0), HW * 1.15, 0.012, HW * 0.18, Hd, BLACK, false); part('sphere', F(HW * 0.55, 0, 0), HW * 0.32, HW * 0.38, HW * 0.32, Hd, BLACK, false); part('box', F(HW * 0.4, -HH * 0.32, HW * 0.32), 0.012, 0.012, HW * 0.55, Hd, BLACK, false); }
    if (s.crown) drawCrown(push, F(0, HH * 0.55, 0), Hd, HW * 0.55 * h, op, C.gold);
    if (s.tiara) drawCrown(push, F(0, HH * 0.5, 0.01), Hd, HW * 0.42 * h, op, hex('#F2E2A8'));
    return g;
  }

  // 玩偶：一个小小的胡桃夹子
  function drawDoll(push, p, op, yaw) {
    const it = (geo, dx, dy, dz, sx, sy, sz, c, e) => { const o = push(geo, p[0] + dx, p[1] + dy, p[2] + dz, sx, sy, sz, yaw, c, op, e || 0); o.noShadow = true; };
    it('cyl', -0.035, 0, 0, 0.055, 0.12, 0.055, WHITE); it('cyl', 0.035, 0, 0, 0.055, 0.12, 0.055, WHITE);
    it('cyl', 0, 0.12, 0, 0.15, 0.16, 0.12, hex('#B8232F'));
    it('sphere', 0, 0.33, 0, 0.11, 0.12, 0.11, SKIN); it('cyl', 0, 0.37, 0, 0.11, 0.13, 0.11, BLACK);
    it('cone', 0, 0.25, 0.04, 0.07, 0.07, 0.05, WHITE);
  }

  /* ---------- 每帧：朝向、步态，然后画 ---------- */
  let T = 0;
  const angDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

  W.drawPeople = function (push, dt) {
    T += dt;
    for (const L of W.env.pl) if (L.follow) { const q = W.people[L.follow]; L.p[0] = q.p[0]; L.p[1] = q.p[1] + q.lift + 2.4; L.p[2] = q.p[2] + 0.3; }

    for (const id in W.people) {
      const q = W.people[id];
      if (q.op < 0.01) { q._lx = null; continue; }
      let tyaw = null;
      if (q._lx !== null && dt > 0) {
        const dx = q.p[0] - q._lx, dz = q.p[2] - q._lz, dist = Math.hypot(dx, dz), v = Math.min(dist / dt, 6);
        q.spd += (v - q.spd) * Math.min(1, dt * 6);
        // 步长与身高相关：一个完整步态周期约走 1.1 个身高
        if (v > 0.08) { q.ph += Math.min(dist, 0.5) * (Math.PI * 2) / (1.1 * q.h); if (!q.lockFace) tyaw = Math.atan2(dx, dz); }
        else q.ph += angDiff(Math.round(q.ph / Math.PI) * Math.PI, q.ph) * Math.min(1, dt * 5);
      }
      q._lx = q.p[0]; q._lz = q.p[2];
      q.spinV += ((q.spin || 0) - q.spinV) * Math.min(1, dt * 2.5);      // 旋转平滑起停
      if (Math.abs(q.spinV) > 0.05) q.yaw += q.spinV * dt;
      else {
        if (tyaw === null && q.look && q.fall < 0.2) {
          const t = typeof q.look === 'string' ? W.people[q.look].p : [q.look[0], 0, q.look[1]];
          if (Math.hypot(t[0] - q.p[0], t[2] - q.p[2]) > 0.05) tyaw = Math.atan2(t[0] - q.p[0], t[2] - q.p[2]);
        }
        if (tyaw !== null) q.yaw += angDiff(tyaw, q.yaw) * Math.min(1, dt * 5);
      }
      drawFigure(q, push, T);
    }

    const d = W.doll;
    if (d.on) { const q = W.people[d.on]; if (q.op > 0.01 && q._hand) drawDoll(push, [q._hand[0], q._hand[1] - 0.08, q._hand[2]], q.op * d.op, q.yaw); }
    else if (d.op > 0.01) drawDoll(push, d.p, d.op, 0);
    const sp = W.slipper;
    if (sp.op > 0.01) { const it = push('box', sp.p[0], sp.p[1], sp.p[2], 0.28, 0.1, 0.12, T * 9, hex('#F2B8C6'), sp.op, 0.2); it.noShadow = true; }
  };
})();
