/* StageLab · world.js  —  一座镜框式剧场 + 一套随剧情变化的舞美
 * 建筑从头到尾不变；舞美在几个“状态”之间切换：
 *   pre     开演前：主幕落下，纱幕与家宅已在幕后
 *   parlor  家宴
 *   night   夜里，树与家具变大
 *   snow    雪林
 *   sweets  糖果国
 *   review  结尾回看：剖开舞台塔、台下与乐池
 * 单位约 0.9 米，比例为教学示意。Y 向上，观众在 +Z 一侧，台口线 z≈0.3。
 * 舞台右（演员面向观众时的右手）= -X，吊杆操作区在这一侧；舞台左 = +X，布景搬运区在这一侧。
 */
(function () {
  'use strict';
  const SL = window.SL, hex = SL.hex, D = Math.PI / 180;
  const W = (SL.world = { parts: [], byId: {}, people: {}, flags: {}, dt: 0 });
  const K = (W.K = { YPIT: 1.5, YH: 3.0, YS: 4.0, PW: 8, YT: 12.5, YG: 24, YTOP: 25.4, ZPL: 0.3 });
  const { YPIT, YH, YS, YT, YG, YTOP } = K;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- 颜色：建筑用安静的灰与酒红，舞美用饱和色 ---------- */
  const C = (W.C = {
    shell: hex('#B9B2A6'), shellDark: hex('#958D82'), found: hex('#8E877D'), foundDark: hex('#6F6962'),
    house: hex('#6B4A55'), proscFace: hex('#5A3944'), trim: hex('#D2B06A'), glow: hex('#FFD98A'),
    tier: hex('#7F4751'), aud: [hex('#EFEAE0'), hex('#DFD8CD'), hex('#D0CAC3')],
    deck: hex('#2F2D33'), trap: hex('#38353C'), apron: hex('#3A363D'), lift: hex('#433A40'), liftTop: hex('#8A7766'), pitWall: hex('#5E4650'),
    velour: hex('#1D1C22'), main: hex('#A2232F'), mainDark: hex('#7E1A24'), gold: hex('#E2BE62'),
    pipe: hex('#3B3E46'), rope: hex('#D8D2C2'), rope2: hex('#BDB6A6'), arbor: hex('#565B64'), brick: hex('#7A7F88'),
    lock: hex('#8A6744'), grid: hex('#4D515A'), steel: hex('#8D949B'), fixture: hex('#2A2C31'), lamp: hex('#FFE6AE'),
    canvas: hex('#E3D9C2'), paper: hex('#F8F7F1'), crew: hex('#474C59'),
    // 家宅
    wall: hex('#A43C3E'), wallStripe: hex('#F1E2C8'), wainscot: hex('#6E2430'), dropGreen: hex('#2E5A52'), window: hex('#F4D58C'),
    windowNight: hex('#9FB6E8'), cream: hex('#F1E6CF'), door: hex('#3B2A2A'), sofa: hex('#5D3A6E'), wood: hex('#7A4E2D'),
    stone: hex('#CDBFA9'), fire: hex('#FF9A4A'), rug: hex('#8F2C3A'), rug2: hex('#D9A846'),
    tree: hex('#2C6A47'), treeDark: hex('#225638'), trunk: hex('#5A3B24'), orn: [hex('#D2443C'), hex('#E8C35A'), hex('#F4F0E6'), hex('#5D7FD6')],
    gift: [hex('#E59BB0'), hex('#6A8FD8'), hex('#E8C35A'), hex('#F2EEE6')],
    // 雪林
    skyNight: hex('#1F3352'), birch: hex('#EEECE4'), bark: hex('#2A2A2E'), farBirch: hex('#7F98BA'), moon: hex('#F3EBD3'), bank: hex('#E6ECF0'),
    // 糖果国
    plum: hex('#4B2B63'), scarlet: hex('#B8323F'), candyR: hex('#C8323C'), candyW: hex('#F6EFE6'), pink: hex('#F08FB2'),
    lilac: hex('#B9A0E0'), dais: hex('#A2283A'), sweetGold: hex('#D9A846'),
    // 雪橇
    sleigh: hex('#B4232E'), deer: hex('#8B5A3C'), antler: hex('#E8DCC2'),
    // 演奏员
    musician: hex('#2C2C34'), stand: hex('#C9B37A'),
  });

  /* ---------- 构件与姿态 ---------- */
  const HIDE = 'HIDE';
  const clonePose = (p) => { const o = {}; for (const k in p) o[k] = Array.isArray(p[k]) ? p[k].slice() : p[k]; return o; };
  function poseOf(pt, cfg) {
    const p = pt.poses[cfg];
    if (p === HIDE) return Object.assign({}, pt.home, pt.hide);
    if (p) return Object.assign({}, pt.home, p);
    if (pt.poses.all) return Object.assign({}, pt.home, pt.poses.all);
    return Object.assign({}, pt.home, pt.hide);
  }
  W.poseOf = poseOf;
  function part(id, geo, tag, color, poses, opt) {
    opt = opt || {};
    const first = Object.values(poses).find((p) => p !== HIDE) || {};
    const base = geo === 'line' ? { y: YS + 9, rock: 0, k: 1 } : { k: 1, yaw: 0 };
    const pt = {
      id, geo, tag, poses, color, cut: opt.cut || null, cutHide: !!opt.cutHide, cutF: 1, emis: opt.emis || 0, noShadow: !!opt.noShadow,
      home: Object.assign({ grow: 1, op: opt.op == null ? 1 : opt.op, c: color.slice() }, base, first),
      hide: opt.hide || { op: 0 }, data: opt.data || null, draw: opt.draw || null,
    };
    pt.cur = clonePose(poseOf(pt, 'pre'));
    W.parts.push(pt); W.byId[id] = pt;
    return pt;
  }
  function select(sel) {
    if (typeof sel === 'string') return W.parts.filter((p) => p.tag === sel || p.id === sel);
    return sel.map((s) => (typeof s === 'string' ? W.byId[s] : s)).filter(Boolean);
  }
  W.select = select;
  W.setConfig = function (cfg) { W.cfg = cfg; W.parts.forEach((pt) => { pt.cur = clonePose(poseOf(pt, cfg)); pt.cutF = 1; }); };
  W.morph = function (sel, cfg, dur, opt) {
    opt = opt || {};
    return Promise.all(select(sel).map((pt, i) =>
      SL.tw.to(pt.cur, clonePose(poseOf(pt, cfg)), dur, { ease: opt.ease, delay: (opt.delay || 0) + i * (opt.stagger || 0) })));
  };
  // 把所有舞美构件从当前状态叠化到另一个状态（不表示真实的换景路线）
  W.dissolve = function (cfg, dur) {
    W.cfg = cfg;
    return W.morph(W.parts.filter((p) => p.tag === 'parlor' || p.tag === 'forest' || p.tag === 'sweets' || p.tag === 'drop'), cfg, dur || 3, { ease: 'sine' });
  };
  const box = (x0, x1, y0, y1, z0, z1) => ({ p: [(x0 + x1) / 2, y0, (z0 + z1) / 2], s: [x1 - x0, y1 - y0, z1 - z0] });

  /* ================= 建筑：始终存在 ================= */
  const bld = (id, color, b, opt, review) => part(id, 'box', opt && opt.tag || 'bld', color, review ? { all: b, review } : { all: b }, opt);

  // 下部结构（地基）：观众席之下、乐池两侧、舞台之下（围出台仓）、搬运区之下（围出升降井）
  bld('fHouse', C.found, box(-14.1, 14.1, 0, YH, 5.4, 21.6));
  bld('fPitL', C.found, box(-14.1, -10.5, 0, YH, 1.5, 5.4));
  bld('fPitR', C.found, box(10.5, 14.1, 0, YH, 1.5, 5.4));
  bld('pitRail', C.pitWall, box(-10.5, 10.5, 0, YH + 1.0, 5.0, 5.4));
  bld('pitBack', C.found, box(-10.5, 10.5, 0, YS - 0.4, 1.4, 1.8));
  bld('fSR', C.found, box(-14.1, -4.5, 0, YS - 0.4, -15.2, 1.4));
  bld('fBack', C.found, box(-4.5, 4.5, 0, YS - 0.4, -15.2, -11.5));
  bld('fFront', C.found, box(-4.5, 4.5, 0, YS - 0.4, -1.0, 1.4), null, { grow: 0.04 });
  bld('fSL', C.found, box(4.5, 14.1, 0, YS - 0.4, -15.2, 1.4), null, { grow: 0.04 });
  bld('fDockA', C.found, box(14.1, 22.6, 0, YS - 0.4, -14.2, -11.2), null, { grow: 0.04 });
  bld('fDockB', C.found, box(14.1, 22.6, 0, YS - 0.4, -4.4, -1.4), null, { grow: 0.04 });
  bld('fDockC', C.found, box(20.6, 22.6, 0, YS - 0.4, -11.2, -4.4), null, { grow: 0.04 });
  bld('fDockD', C.found, box(14.1, 15.2, 0, YS - 0.4, -11.2, -4.4), null, { grow: 0.04 });
  // 台仓：两层（乐池层、下层），中间楼板只铺一半，好看清两层关系
  bld('trapFloor', C.foundDark, box(-4.5, 4.5, 0, 0.12, -11.5, -1.0));
  bld('trapMid', C.foundDark, box(-4.5, 4.5, YPIT - 0.22, YPIT, -11.5, -7.45));
  [-3.6, 0, 3.6].forEach((x, i) => [-3.2, -8.8].forEach((z, j) => bld('post' + i + j, C.shellDark, { p: [x, 0, z], s: [0.22, YS - 0.4, 0.22] }, { noShadow: true })));

  // 舞台面（黑色枫木地板）。中部为活动台板区域，由一块块台板拼成
  const deck = (id, b, opt, review, color) => bld(id, color || C.deck, b, Object.assign({ tag: 'deck' }, opt || {}), review);
  deck('dkSR', box(-13.5, -4.5, YS - 0.4, YS, -14.6, 0.3));
  deck('dkSL', box(4.5, 13.5, YS - 0.4, YS, -14.6, 0.3));
  deck('dkBack', box(-4.5, 4.5, YS - 0.4, YS, -14.6, -11.5));
  deck('dkFront', box(-4.5, 4.5, YS - 0.4, YS, -1.0, 0.3));
  deck('apron', box(-10.5, 10.5, YS - 0.4, YS, 0.3, 1.8));
  W.traps = [];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
    const x0 = -4.5 + i * 1.8, z0 = -11.5 + j * 2.1, id = 'trap' + i + j;
    deck(id, box(x0 + 0.03, x0 + 1.77, YS - 0.4, YS, z0 + 0.03, z0 + 2.07), { tag: 'trap' }, { op: 0.42 }, C.trap);
    W.traps.push(id);
  }
  W.trapDemo = 'trap41';         // 避开地毯与宝座的一块台板
  // 布景搬运区（舞台左外侧）与布景升降台
  deck('ddA', box(14.1, 22.6, YS - 0.4, YS, -14.2, -11.2));
  deck('ddB', box(14.1, 22.6, YS - 0.4, YS, -4.4, -1.4));
  deck('ddC', box(20.6, 22.6, YS - 0.4, YS, -11.2, -4.4));
  deck('ddD', box(14.1, 15.2, YS - 0.4, YS, -11.2, -4.4));
  bld('sceneLift', C.liftTop, box(15.25, 20.55, YS - 0.4, YS, -11.15, -4.45), { tag: 'deck' });
  part('crate', 'box', 'demo', C.wood, { review: box(16.6, 19.2, YS, YS + 1.6, -9.6, -6.0) });

  // 乐池：两块弧形升降台（模型做成直的），各自可停在乐池层、观众席面、舞台面
  bld('liftUS', C.liftTop, box(-10.3, 10.3, 0, YPIT, 1.85, 3.4), { tag: 'pit' });
  bld('liftDS', C.liftTop, box(-10.3, 10.3, 0, YPIT + 0.5, 3.45, 4.95), { tag: 'pit' });

  // 墙体：朝向相机的墙会自动降低，像剖开的建筑模型
  bld('twSR', C.shell, box(-14.1, -13.5, YS - 0.4, YTOP, -15.2, -0.5), { cut: [-1, 0] });
  bld('twBack', C.shell, box(-14.1, 14.1, YS - 0.4, YTOP, -15.2, -14.6), { cut: [0, -1] });
  bld('twSLa', C.shell, box(13.5, 14.1, YS - 0.4, 13.6, -14.6, -12.4), { cut: [1, 0] });
  bld('twSLb', C.shell, box(13.5, 14.1, YS - 0.4, 13.6, -2.6, -0.5), { cut: [1, 0] });
  bld('twSLu', C.shell, box(13.5, 14.1, 13.6, YTOP, -14.6, -0.5), { cut: [1, 0], cutHide: true });
  bld('wingCurtain', C.velour, box(13.65, 13.95, YS, 13.4, -12.4, -2.6), { cut: [1, 0], cutHide: true });
  bld('dkWBack', C.shell, box(14.1, 23.2, YS - 0.4, 13.6, -14.8, -14.2), { cut: [0, -1] });
  bld('dkWSide', C.shell, box(22.6, 23.2, YS - 0.4, 13.6, -14.8, -1.4), { cut: [1, 0] });
  bld('dkWFront', C.shell, box(14.1, 23.2, YS - 0.4, 13.6, -1.4, -0.8), { cut: [0, 1] });
  bld('hwL', C.house, box(-14.1, -13.5, YH, 15, 0.3, 21.6), { cut: [-1, 0] });
  bld('hwR', C.house, box(13.5, 14.1, YH, 15, 0.3, 21.6), { cut: [1, 0] });
  bld('hwBack', C.house, box(-14.1, 14.1, YH, 15, 21.6, 22.2), { cut: [0, 1] });

  // 台口墙：分隔观众厅与舞台的墙，开口就是台口。上部可以“剖开”，看见舞台塔内部
  const pr = (id, color, b, opt) => part(id, 'box', 'prosc', color, { all: b, review: Object.assign({}, b) }, opt);
  pr('prL', C.proscFace, box(-14.1, -8, YS - 0.4, 16, -0.5, 0.3));
  pr('prR', C.proscFace, box(8, 14.1, YS - 0.4, 16, -0.5, 0.3));
  pr('prHead', C.proscFace, box(-8, 8, YT, 16, -0.5, 0.3));
  part('prUpper', 'box', 'upper', C.proscFace, { all: box(-14.1, 14.1, 16, YTOP, -0.5, 0.3), review: Object.assign(box(-14.1, 14.1, 16, YTOP, -0.5, 0.3), { grow: 0.03 }) });
  pr('frL', C.trim, box(-8.5, -8.0, YS, YT + 0.5, 0.3, 0.55));
  pr('frR', C.trim, box(8.0, 8.5, YS, YT + 0.5, 0.3, 0.55));
  pr('frT', C.trim, box(-8.5, 8.5, YT, YT + 0.5, 0.3, 0.55));
  // 台口高亮：开场时短暂标出画面边界
  const glw = (id, b) => part(id, 'box', 'glow', C.glow, { all: Object.assign(b, { op: 0 }) }, { emis: 1, noShadow: true, op: 0 });
  glw('glL', box(-8.06, -7.94, YS, YT, 0.6, 0.72));
  glw('glR', box(7.94, 8.06, YS, YT, 0.6, 0.72));
  glw('glT', box(-8.06, 8.06, YT - 0.12, YT, 0.6, 0.72));
  glw('glB', box(-8.06, 8.06, YS, YS + 0.12, 0.6, 0.72));
  // 防火幕：平时收在台口上方
  bld('fireCurtain', C.steel, box(-8.6, 8.6, YT + 0.3, YT + 9.0, -0.78, -0.56), { tag: 'prosc' });

  // 吊杆操作区（舞台右）：锁绳栏、配重轨道、天桥、装载廊、栅顶
  const fly = (id, color, b, opt) => part(id, 'box', 'fly', color, { all: b }, Object.assign({ noShadow: true }, opt || {}));
  fly('lockRail', C.lock, box(-12.75, -12.35, YS, YS + 1.0, -14.2, -0.9));
  fly('tTrack', C.grid, box(-13.5, -13.38, YS, YG, -14.2, -0.9));
  fly('flyGal', C.grid, box(-13.5, -11.4, YS + 8.8, YS + 9.05, -14.4, -0.8));
  fly('flyGalRail', C.grid, box(-11.45, -11.35, YS + 9.05, YS + 9.95, -14.4, -0.8));
  fly('loadGal1', C.grid, box(-13.5, -11.9, 20.4, 20.6, -14.4, -0.8));
  fly('loadGal2', C.grid, box(-13.5, -11.9, 22.2, 22.4, -14.4, -0.8));
  for (let i = 0; i < 9; i++) { const x = -12.6 + i * 3.1; fly('gridB' + i, C.grid, box(x - 0.12, x + 0.12, YG, YG + 0.24, -14.4, -0.8)); }
  [-1.0, -7.6, -14.2].forEach((z, i) => fly('gridX' + i, C.grid, box(-13.5, 13.5, YG + 0.24, YG + 0.42, z - 0.12, z + 0.12)));
  fly('headBlock', C.steel, box(-13.4, -12.8, YG + 0.1, YG + 0.6, -14.2, -0.9));

  // 观众席：两块缓坡座席（坡度刻意做得缓，观众视角的画面不被后排遮挡）
  part('seatsL', 'seats', 'house', C.tier, { all: {} }, { data: { x0: -12.7, x1: -1.1 } });
  part('seatsR', 'seats', 'house', C.tier, { all: {} }, { data: { x0: 1.1, x1: 12.7 } });

  /* ================= 吊杆：每一道都挂在栅顶下，配重在舞台右侧墙上反向运动 ================= */
  // line(id, kind, z, poses, goods)；pose 字段 y = 吊杆高度，op = 是否存在
  const lines = [];
  function line(id, tag, kind, z, poses, extra) {
    const pt = part(id, 'line', tag, C.pipe, poses, { data: Object.assign({ kind, z }, extra || {}), hide: { op: 0 } });
    lines.push(pt); return pt;
  }
  W.LINE = { mainClosed: YS + 9.3, mainOpen: YT + 9.3 + 0.5 };
  line('main', 'rig', 'main', -0.98, { all: { y: W.LINE.mainClosed } }, { motor: true });
  [[-1.55, 1], [-4.6, 2], [-8.0, 3], [-10.4, 4]].forEach(([z, i]) => {      // 第 2、3 对侧幕之间留出较宽的上下场口
    line('border' + i, 'rig', 'border', z, { all: { y: 14.3 } });
    line('legs' + i, 'rig', 'legs', z - 0.26, { all: { y: YS + 9.0 } });
  });
  [-2.95, -5.85, -8.75].forEach((z, i) => line('elec' + (i + 1), 'rig', 'elec', z, { all: { y: 14.0 } }));
  [-3.55, -6.45, -9.35].forEach((z, i) => line('snowbag' + (i + 1), 'rig', 'snow', z, { all: { y: 15.0 } }, { phase: i * 1.3, hole: 1 }));
  line('scrim', 'drop', 'scrim', -2.3, { pre: { y: YS + 9.7 } });
  line('dropParlor', 'drop', 'parlor', -11.05, { pre: { y: YS + 9.9, k: 1 }, parlor: { y: YS + 9.9, k: 1 }, night: { y: YS + 9.9, k: 1.55 } });
  line('dropForest', 'drop', 'forest', -11.65, { snow: { y: YS + 9.9 } });
  line('dropSweets', 'drop', 'sweets', -12.25, { sweets: { y: YS + 9.9 }, review: { y: YS + 9.9 } });

  /* ================= 舞美构件（组合件） ================= */
  const comp = (id, tag, poses, draw, opt) => part(id, 'comp', tag, C.wall, poses, Object.assign({ draw }, opt || {}));
  const P = (x, z, k, yaw, y) => ({ p: [x, y == null ? YS : y, z], k: k == null ? 1 : k, yaw: (yaw || 0) * D });

  /* —— 家宅 —— */
  // 侧墙景片：带一扇门，人物从门里进出，不穿墙
  function flat(B, door) {
    B.box(0, 0, 0, 7.6, 8.2, 0.22, C.wall);
    B.box(0, 0, 0.12, 7.6, 1.5, 0.06, C.wainscot);
    for (let i = 0; i < 7; i++) B.box(-3.3 + i * 1.1, 1.5, 0.13, 0.12, 6.7, 0.04, C.wallStripe);
    B.box(0, 7.7, 0.15, 7.8, 0.5, 0.2, C.cream);
    if (door != null) { B.box(door, 0, 0.14, 2.0, 4.3, 0.06, C.door); B.box(door, 4.3, 0.16, 2.3, 0.25, 0.08, C.cream); }
  }
  comp('flatL', 'parlor', { pre: P(-7.1, -6.2, 1, 70), parlor: P(-7.1, -6.2, 1, 70), night: P(-8.0, -6.9, 1.42, 70) }, (B) => flat(B, -1.4));
  comp('flatR', 'parlor', { pre: P(7.1, -6.2, 1, -70), parlor: P(7.1, -6.2, 1, -70), night: P(8.0, -6.9, 1.42, -70) }, (B) => flat(B, 1.4));
  comp('sofa', 'parlor', { pre: P(-3.7, -4.3, 1, 20), parlor: P(-3.7, -4.3, 1, 20), night: P(-5.0, -4.9, 1.85, 22) }, (B) => {
    B.box(0, 0, 0, 2.7, 0.55, 1.05, C.sofa); B.box(0, 0.55, -0.42, 2.7, 0.95, 0.22, C.sofa);
    B.box(-1.3, 0.55, 0, 0.22, 0.45, 1.05, C.sofa); B.box(1.3, 0.55, 0, 0.22, 0.45, 1.05, C.sofa);
    B.box(0, 0.55, 0.05, 2.3, 0.14, 0.8, hex('#7A5390'));
  });
  comp('chair', 'parlor', { pre: P(3.5, -3.5, 1, -25), parlor: P(3.5, -3.5, 1, -25), night: P(4.9, -4.1, 1.85, -25) }, (B) => {
    B.box(0, 0.45, 0, 0.95, 0.12, 0.95, C.sofa); B.box(0, 0.57, -0.42, 0.95, 1.05, 0.12, C.sofa);
    [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]].forEach(([x, z]) => B.box(x, 0, z, 0.08, 0.45, 0.08, C.wood));
  });
  comp('fireplace', 'parlor', { pre: P(-5.9, -8.5, 1, 32), parlor: P(-5.9, -8.5, 1, 32), night: P(-7.1, -9.2, 1.55, 32) }, (B) => {
    B.box(0, 0, 0, 2.5, 2.3, 0.6, C.stone); B.box(0, 0, 0.26, 1.25, 1.15, 0.1, C.door);
    B.box(0, 0.05, 0.22, 0.8, 0.35, 0.12, C.fire, 0.9); B.box(0, 2.3, 0.05, 2.9, 0.18, 0.8, C.cream);
  });
  comp('clock', 'parlor', { pre: P(5.7, -8.6, 1, -32), parlor: P(5.7, -8.6, 1, -32), night: P(6.9, -9.3, 1.55, -32) }, (B) => {
    B.box(0, 0, 0, 0.95, 3.1, 0.6, C.wood); B.box(0, 3.1, 0, 1.15, 0.5, 0.7, C.wood);
    B.box(0, 2.25, 0.31, 0.62, 0.62, 0.04, C.cream, 0.3); B.box(0, 0.6, 0.31, 0.12, 1.1, 0.04, C.gold, 0.2);
  });
  comp('gifts', 'parlor', { pre: P(0.4, -6.0, 1), parlor: P(0.4, -6.0, 1), night: P(0.4, -4.4, 1.9) }, (B) => {
    [[-1.1, 0.1, 0.6, 0], [0.9, -0.1, 0.5, 1], [-0.2, 0.35, 0.42, 2], [1.6, 0.4, 0.38, 3]].forEach(([x, z, s, i]) => {
      B.box(x, 0, z, s, s, s, C.gift[i]); B.box(x, 0, z, s + 0.02, s + 0.02, 0.07, C.gift[(i + 2) % 4]);
    });
  });
  comp('rug', 'parlor', { pre: P(0, -3.4, 1), parlor: P(0, -3.4, 1), night: P(0, -3.6, 1.55) }, (B) => {
    B.cyl(0, 0, 0, 3.0, 0.04, C.rug); B.cyl(0, 0.01, 0, 2.2, 0.04, C.rug2); B.cyl(0, 0.02, 0, 1.6, 0.04, C.rug);
  }, { noShadow: true });
  part('tree', 'tree', 'parlor', C.tree, { pre: { p: [0.3, YS, -8.3], s: [3.0, 4.4, 3.0] }, parlor: { p: [0.3, YS, -8.3], s: [3.0, 4.4, 3.0] }, night: { p: [0.3, YS, -8.6], s: [6.6, 10.4, 6.6] } });
  W.treeGhost = { op: 0 };

  /* —— 雪林 —— */
  [[-1.9, 0], [-4.4, 1], [-7.3, 2], [-9.9, 3]].forEach(([z, i]) => [-1, 1].forEach((side) => {
    const xs = side * (7.35 + (i % 2) * 0.5);
    part('birch' + i + (side > 0 ? 'R' : 'L') + 'a', 'birch', 'forest', C.birch, { snow: { p: [xs, YS, z], s: [0.52, 11.5, 0.52] } });
    part('birch' + i + (side > 0 ? 'R' : 'L') + 'b', 'birch', 'forest', C.birch, { snow: { p: [xs + side * 1.25, YS, z - 0.55], s: [0.4, 11.5, 0.4] } });
  }));
  // 雪堆只放在上场深处和白桦脚下，不挡住舞者与扫雪的路线
  [[-4.6, -10.4, 1.0], [4.4, -10.6, 1.05]].forEach(([x, z, k], i) =>
    comp('bank' + i, 'forest', { snow: P(x, z, k) }, (B) => { B.sph(0, 0, 0, 1.6, C.bank, 0.1, 0.32); B.sph(1.3, 0, 0.3, 1.0, C.bank, 0.1, 0.36); }));
  [[-2.1], [-4.7], [-7.5], [-10.1]].forEach(([z], i) => [-1, 1].forEach((s) =>
    comp('mound' + i + (s > 0 ? 'R' : 'L'), 'forest', { snow: P(s * 8.3, z, 0.45) }, (B) => B.sph(0, 0, 0, 1.6, C.bank, 0.1, 0.32))));

  /* —— 糖果国 —— */
  [[-2.2, 0], [-4.4, 1], [-8.8, 2]].forEach(([z, i]) => [-1, 1].forEach((side) =>
    part('col' + i + (side > 0 ? 'R' : 'L'), 'column', 'sweets', C.candyR, { sweets: { p: [side * 7.55, YS, z], s: [0.9, 7.0, 0.9] }, review: { p: [side * 7.55, YS, z], s: [0.9, 7.0, 0.9] } })));
  const sweet = (id, pose, draw, opt) => comp(id, 'sweets', { sweets: pose, review: pose }, draw, opt);
  sweet('dais', P(0, -9.2), (B) => {
    B.box(0, 0, 0, 5.2, 0.7, 2.6, C.dais); B.box(0, 0, 1.6, 3.2, 0.35, 0.7, C.dais);
    B.box(0, 0.7, -0.3, 2.6, 0.55, 1.0, C.sweetGold); B.box(0, 0.7, -0.88, 2.6, 2.3, 0.3, C.lilac);
    B.sph(-1.25, 3.05, -0.88, 0.3, C.pink); B.sph(1.25, 3.05, -0.88, 0.3, C.pink);
  });
  sweet('archBack', P(0, -10.6), (B) => {
    B.box(-3.6, 0, 0, 0.8, 8.0, 0.8, C.pink); B.box(3.6, 0, 0, 0.8, 8.0, 0.8, C.pink);
    B.box(0, 8.0, 0, 8.8, 0.8, 0.9, C.scarlet);
    for (let i = 0; i < 9; i++) B.sph(-3.6 + i * 0.9, 7.8, 0.45, 0.28, i % 2 ? C.lilac : C.candyW);
  });
  sweet('sweetRug', P(0, -4.2), (B) => { B.cyl(0, 0, 0, 3.6, 0.04, C.sweetGold); B.cyl(0, 0.01, 0, 2.7, 0.04, C.scarlet); }, { noShadow: true });
  [[-5.5, -1.3], [5.5, -1.3]].forEach(([x, z], i) => sweet('lolly' + i, P(x, z), (B) => {
    B.cyl(0, 0, 0, 0.07, 3.0, C.candyW); B.sph(0, 3.4, 0, 0.75, i ? C.lilac : C.pink, 0.05, 1); B.sph(0, 3.4, 0.08, 0.45, C.candyW, 0.05, 1);
  }));
  // 大裙子的支撑架：位置示意（原侧台方向未核实）
  W.GINGER = [11.8, -6.56];      // 侧台里、两对侧幕之间
  comp('gFrame', 'sweets', { sweets: P(W.GINGER[0], W.GINGER[1], 1, 90) }, (B) => {
    B.box(-1.75, 0, 0, 0.16, 4.6, 0.16, C.steel); B.box(1.75, 0, 0, 0.16, 4.6, 0.16, C.steel);
    B.box(0, 4.6, 0, 3.7, 0.22, 0.22, C.steel); B.box(0, 4.3, 0, 0.3, 0.3, 0.3, C.grid);
  });

  /* ================= 每帧：把世界摊平成一串绘制项 ================= */
  const items = [];
  let n = 0;
  function push(geo, x, y, z, sx, sy, sz, yaw, col, op, emis) {
    let it = items[n];
    if (!it) it = items[n] = {};
    n++;
    it.geo = geo; it.x = x; it.y = y; it.z = z; it.sx = sx; it.sy = sy; it.sz = sz; it.yaw = yaw || 0; it.tilt = 0;
    it.r = col[0]; it.g = col[1]; it.b = col[2]; it.op = op == null ? 1 : op; it.emis = emis || 0; it.flat = false; it.noShadow = false; it.rot = null;
    return it;
  }
  W.push = push;
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  W.mix = mix;

  // 从 a 到 b 的细杆：绳索、扫帚柄、视线
  function seg(a, b, w, col, op, emis) {
    let dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2]; const L = Math.hypot(dx, dy, dz);
    if (L < 1e-4 || op < 0.01) return null;
    dx /= L; dy /= L; dz /= L;
    const rx = Math.abs(dy) < 0.9 ? 0 : 1, ry = Math.abs(dy) < 0.9 ? 1 : 0;
    let xx = -dz * ry, xy = dz * rx, xz = dx * ry - dy * rx;
    const xl = Math.hypot(xx, xy, xz) || 1; xx /= xl; xy /= xl; xz /= xl;
    const zx = xy * dz - xz * dy, zy = xz * dx - xx * dz, zz = xx * dy - xy * dx;
    const it = push('box', (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, w, L, w, 0, col, op, emis);
    const r = it._r || (it._r = new Float32Array(9));
    r[0] = xx; r[1] = xy; r[2] = xz; r[3] = dx; r[4] = dy; r[5] = dz; r[6] = zx; r[7] = zy; r[8] = zz;
    it.rot = r; it.noShadow = true;
    return it;
  }
  W.seg = seg;
  function rotX(it, a) {
    const r = it._r || (it._r = new Float32Array(9)), c = Math.cos(a), s = Math.sin(a);
    r[0] = 1; r[1] = 0; r[2] = 0; r[3] = 0; r[4] = c; r[5] = s; r[6] = 0; r[7] = -s; r[8] = c; it.rot = r;
  }

  // 组合件的局部绘制：位置、整体缩放 k、朝向 yaw
  function makeB(p, k, yaw, op) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const at = (lx, ly, lz) => [p[0] + (lx * cy + lz * sy) * k, p[1] + ly * k, p[2] + (-lx * sy + lz * cy) * k];
    return {
      at,
      box(lx, ly, lz, w, h, d, col, em) { const q = at(lx, ly + h / 2, lz); return push('box', q[0], q[1], q[2], w * k, h * k, d * k, yaw, col, op, em || 0); },
      cyl(lx, ly, lz, r, h, col, em) { const q = at(lx, ly, lz); return push('cyl', q[0], q[1], q[2], 2 * r * k, h * k, 2 * r * k, yaw, col, op, em || 0); },
      cone(lx, ly, lz, r, h, col, em) { const q = at(lx, ly, lz); return push('cone', q[0], q[1], q[2], 2 * r * k, h * k, 2 * r * k, yaw, col, op, em || 0); },
      sph(lx, ly, lz, r, col, em, flatY) { const q = at(lx, ly, lz); return push('sphere', q[0], q[1], q[2], 2 * r * k, 2 * r * k * (flatY || 1), 2 * r * k, yaw, col, op, em || 0); },
    };
  }
  W.makeB = makeB;

  /* —— 吊杆：管、提升绳、配重 —— */
  const RIG_X = [-7, 0, 7];
  function arbor(z, by, op, col, glow) {
    const ab = clamp(YS + 0.4 + (YG - 1.2 - by), YS + 0.25, YG - 2.1);   // 单式平衡重：吊杆升多少，配重就降多少
    push('box', -13.12, ab + 0.8, z, 0.3 + (glow || 0) * 0.15, 1.6, 0.22 + (glow || 0) * 0.15, 0, glow ? mix(C.arbor, C.glow, glow) : C.arbor, op, (glow || 0) * 0.7).noShadow = true;
    for (let i = 0; i < 4; i++) push('box', -13.12, ab + 0.3 + i * 0.32, z, 0.36, 0.2, 0.26, 0, C.brick, op).noShadow = true;
    const gw = (glow || 0) * 0.06;
    seg([-13.1, YG + 0.35, z], [-13.1, ab + 1.6, z], 0.04 + gw, col, op, glow);
    seg([-12.95, YS + 0.25, z], [-12.95, YG + 0.1, z], 0.03 + gw, glow ? col : C.rope2, op * 0.9, glow);   // 操作绳（手拉绳），穿过锁绳栏
    push('box', -12.55, YS + 1.06, z, 0.34, 0.14, 0.16, 0, C.lock, op).noShadow = true;
  }
  W.arborY = (by) => clamp(YS + 0.4 + (YG - 1.2 - by), YS + 0.25, YG - 2.1);

  function collectLine(pt) {
    const c = pt.cur, d = pt.data, op = c.op;
    if (op < 0.01) return;
    const z = d.z, y = c.y;
    if (d.kind === 'snow') { collectSnowBag(pt, op); return; }
    const pipe = push('box', 0, y, z, 22.2, 0.1, 0.1, 0, C.pipe, op); pipe.noShadow = true;
    const glow = d.glow ? W.flags[d.glow] || 0 : (W.flags.demoLine === pt.id ? W.flags.demoGlow || 0 : 0);
    const lc = glow > 0.01 ? mix(C.rope, C.gold, glow) : C.rope;
    for (const x of RIG_X) seg([x, y, z], [x, YG + 0.2, z], 0.035, lc, op, glow * 0.8);
    seg([7, YG + 0.22, z], [-13.1, YG + 0.22, z], 0.035, lc, op, glow * 0.8);
    if (d.motor) {
      push('box', -12.6, YG + 0.75, z, 0.9, 0.6, 0.55, 0, C.grid, op);       // 主幕：电动，不用配重
      seg([-13.1, YG + 0.22, z], [-12.6, YG + 0.5, z], 0.04, lc, op);
    } else arbor(z, y, op, lc, glow * 0.8);
    goods(pt, c, y, z, op);
  }

  // 吊杆上挂的东西
  function goods(pt, c, y, z, op) {
    const k = pt.data.kind;
    const hang = (x, h, w, d, col, o, em) => push('box', x, y - h / 2, z, w, h, d, 0, col, o == null ? op : o, em);
    if (k === 'main') {
      hang(0, 9.3, 17.4, 0.3, C.main);
      for (let i = 0; i < 9; i++) push('box', -7.6 + i * 1.9, y - 4.6, z + 0.17, 0.32, 9.1, 0.06, 0, C.mainDark, op);
      push('box', 0, y - 9.1, z + 0.18, 17.4, 0.32, 0.06, 0, C.gold, op, 0.15);
      for (let i = 0; i < 17; i++) push('sphere', -8 + i, y - 8.75, z + 0.2, 0.16, 0.16, 0.1, 0, C.gold, op, 0.4);
    } else if (k === 'border') hang(0, 2.2, 18.8, 0.08, C.velour);
    else if (k === 'legs') { [-1, 1].forEach((s) => push('box', s * 9.5, y - 4.5, z, 2.2, 9.0, 0.08, 0, C.velour, op)); }
    else if (k === 'elec') {
      for (let i = 0; i < 7; i++) {
        const x = -7.5 + i * 2.5;
        push('box', x, y - 0.18, z, 0.06, 0.36, 0.06, 0, C.fixture, op).noShadow = true;
        push('cyl', x, y - 0.75, z, 0.32, 0.5, 0.32, 0, C.fixture, op).noShadow = true;
        push('sphere', x, y - 0.78, z, 0.24, 0.08, 0.24, 0, C.lamp, op, W.flags.lampsOn == null ? 0.6 : W.flags.lampsOn).noShadow = true;
      }
    } else if (k === 'scrim') {
      const it = push('box', 0, y - 4.8, z, 18.2, 9.6, 0.04, 0, hex('#DADBD6'), op * 0.5); it.noShadow = true;
      for (let i = 0; i < 7; i++) {
        const x = -6.6 + i * 2.2;
        push('box', x, y - 3.9, z + 0.05, 1.5, 2.0, 0.04, 0, C.gold, op * 0.8, 0.2).noShadow = true;
        push('box', x, y - 3.9, z + 0.08, 1.15, 1.6, 0.03, 0, hex('#3F3A3D'), op * 0.85).noShadow = true;
        push('sphere', x, y - 3.75, z + 0.12, 0.5, 0.62, 0.04, 0, hex('#C9B9A2'), op * 0.85).noShadow = true;
      }
      push('box', 0, y - 7.6, z + 0.06, 18.2, 0.3, 0.04, 0, hex('#8F8678'), op * 0.6).noShadow = true;
    } else if (k === 'parlor') {
      hang(0, 9.9, 18.6, 0.1, C.dropGreen);
      const kk = c.k, f = z + 0.08, wb = YS + 1.6;
      const nightT = clamp((kk - 1) / 0.55, 0, 1);
      push('box', 0, wb + 2.6 * kk, f, 4.4 * kk, 5.4 * kk, 0.06, 0, C.cream, op);
      push('box', 0, wb + 2.6 * kk, f + 0.04, 3.7 * kk, 4.7 * kk, 0.05, 0, mix(C.window, C.windowNight, nightT), op, 0.75);
      push('box', 0, wb + 2.6 * kk, f + 0.08, 0.14 * kk, 4.7 * kk, 0.04, 0, C.cream, op);
      push('box', 0, wb + 3.2 * kk, f + 0.08, 3.7 * kk, 0.14 * kk, 0.04, 0, C.cream, op);
      [-1, 1].forEach((s) => { push('box', s * 6.2, YS + 2.2, f, 2.0, 4.4, 0.05, 0, C.door, op); push('box', s * 6.2, YS + 4.5, f, 2.4, 0.3, 0.06, 0, C.cream, op); });
      push('box', 0, y - 0.5, f, 18.6, 0.6, 0.06, 0, C.cream, op);
    } else if (k === 'forest') {
      hang(0, 9.9, 18.6, 0.1, C.skyNight);
      const f = z + 0.08;
      [[-7.6, 6.5], [-6.1, 8.2], [-4.4, 5.6], [-2.2, 7.4], [2.8, 6.8], [4.6, 8.4], [6.4, 5.9], [7.9, 7.6]].forEach(([x, h]) =>
        push('box', x, YS + h / 2, f, 0.28, h, 0.04, 0, C.farBirch, op).noShadow = true);
      push('box', 3.9, YS + 7.9, f + 0.02, 1.3, 1.3, 0.04, 0, C.moon, op, 0.7).noShadow = true;
      push('box', 0, YS + 0.6, f + 0.02, 18.6, 1.2, 0.05, 0, C.bank, op, 0.1).noShadow = true;
    } else if (k === 'sweets') {
      hang(0, 9.9, 18.6, 0.1, C.plum);
      const f = z + 0.08;
      [-1, 1].forEach((s) => push('box', s * 5.4, YS + 3.6, f, 1.0, 7.2, 0.05, 0, C.scarlet, op).noShadow = true);
      push('box', 0, YS + 7.4, f, 11.8, 1.0, 0.05, 0, C.scarlet, op).noShadow = true;
      for (let i = 0; i < 12; i++) push('sphere', -5.5 + i * 1.0, YS + 6.7, f + 0.05, 0.6, 0.6, 0.06, 0, i % 2 ? C.pink : C.candyW, op).noShadow = true;
      for (let i = 0; i < 6; i++) push('box', -7.8 + i * 3.1, YS + 8.9, f + 0.03, 0.3, 0.3, 0.04, 0, C.gold, op, 0.6).noShadow = true;
    }
  }

  /* —— 雪袋：两道吊杆挂起一条帆布长槽，交替升降就会来回摇；一侧开孔，碎纸从孔里落下 —— */
  const BAG_W = 13.8, BAG_D = 0.9;
  function collectSnowBag(pt, op) {
    const c = pt.cur, z = pt.data.z, r = c.rock, a = r * 0.46;
    const yf = c.y - r * 0.34, yb = c.y + r * 0.34, zf = z + BAG_D / 2, zb = z - BAG_D / 2;
    const glow = W.flags.ropeGlow || 0, lc = glow > 0.01 ? mix(C.rope, C.glow, glow) : C.rope, em = glow, lw = 0.035 + glow * 0.06;
    [[zf, yf], [zb, yb]].forEach(([zz, yy]) => {
      push('box', 0, yy, zz, 16, 0.08, 0.08, 0, C.pipe, op).noShadow = true;
      for (const x of [-6, 6]) seg([x, yy, zz], [x, YG + 0.2, zz], lw, lc, op, em);
      seg([6, YG + 0.22, zz], [-13.1, YG + 0.22, zz], lw, lc, op, em);
      arbor(zz, yy + 0.6, op, lc, em);
    });
    const cy = c.y - 0.75;
    const bag = push('box', 0, cy, z, BAG_W, 0.5, BAG_D, 0, C.canvas, op); rotX(bag, a); bag.noShadow = true;
    const ca = Math.cos(a), sa = Math.sin(a);
    const L = (lx, ly, lz) => [lx, cy + ly * ca - lz * sa, z + ly * sa + lz * ca];
    for (const x of [-6, 6]) { seg(L(x, 0.25, BAG_D / 2), [x, yf, zf], lw, lc, op, em); seg(L(x, 0.25, -BAG_D / 2), [x, yb, zb], lw, lc, op, em); }
    for (let i = 0; i < 14; i++) { const q = L(-6.3 + i * 0.97, -0.1, BAG_D / 2 + 0.01); const h = push('box', q[0], q[1], q[2], 0.12, 0.12, 0.03, 0, C.crew, op); rotX(h, a); h.noShadow = true; }
    pt._lip = L(0, -0.05, BAG_D / 2 + 0.02);
  }

  /* —— 纸雪：从雪袋开孔处落下，落在黑色台面上，直到幕间被扫掉 —— */
  const SNOW = (W.snow = { mode: 'off', manual: 0, amp: 0.85, falling: [], landed: [], lastT: 0, t: 0, emitK: 1, onSwing: null, swing: 0, lastSide: 0 });
  const MAXF = 230, MAXL = 320;
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  W.snowReset = function () { SNOW.falling.length = 0; SNOW.landed.length = 0; SNOW.mode = 'off'; SNOW.manual = 0; lines.forEach((pt) => { if (pt.data.kind === 'snow') pt.cur.rock = 0; }); };
  W.snowFloor = function (count) {      // 跳段时直接铺一层落下的纸雪
    SNOW.landed.length = 0;
    for (let i = 0; i < count; i++) SNOW.landed.push({ x: (rnd() - 0.5) * 14.6, z: -10.2 + rnd() * 10.2, yaw: rnd() * 6.28, a: 1 });
  };
  W.snowClear = function (dur) { SNOW.landed.forEach((f) => { f.fade = dur || 1; }); };
  function stepSnow(dt) {
    SNOW.t += dt;
    const bags = lines.filter((pt) => pt.data.kind === 'snow');
    bags.forEach((pt, i) => {
      const c = pt.cur;
      let r;
      if (SNOW.mode === 'auto') r = SNOW.amp * Math.sin(SNOW.t * 2.4 + pt.data.phase);
      else if (SNOW.mode === 'manual') r = SNOW.manual * (1 - i * 0.05);
      else r = c.rock * Math.max(0, 1 - dt * 3);
      c.rock += (r - c.rock) * Math.min(1, dt * 9);
      const tilt = c.rock;
      if (c.op > 0.5 && tilt > 0.24 && SNOW.mode !== 'off') {
        const rate = 13 * SNOW.emitK * (tilt - 0.24) / 0.76;
        let want = rate * dt + (pt._acc || 0);
        while (want >= 1 && SNOW.falling.length < MAXF) {
          want -= 1;
          SNOW.falling.push({ x: (rnd() - 0.5) * 12.8, y: c.y - 0.95, z: pt.data.z + BAG_D / 2 + 0.05, vy: -(0.95 + rnd() * 0.55), ph: rnd() * 6.28, f: 1.2 + rnd() * 1.6, yaw: rnd() * 6.28, sp: (rnd() - 0.5) * 6, tl: rnd() * 3 });
        }
        pt._acc = want;
      }
    });
    // 场上的操作员跟着摇
    ['sh1', 'sh2', 'sh3'].forEach((id, i) => {
      const q = W.people[id], b = bags[i];
      if (!q || q.op < 0.1 || !b || !W.flags.crewPull) return;
      q.armL = 2.0 + b.cur.rock * 0.5; q.armR = 2.0 - b.cur.rock * 0.5; q.bow = 0.08 + Math.abs(b.cur.rock) * 0.12;
    });
    const sw = SNOW.mode === 'manual' ? Math.sign(Math.round(SNOW.manual * 1.6)) : 0;
    if (sw !== 0 && sw !== SNOW.lastSide) { if (SNOW.lastSide !== 0) { SNOW.swing++; if (SNOW.onSwing) SNOW.onSwing(SNOW.swing); } SNOW.lastSide = sw; }
    for (let i = SNOW.falling.length - 1; i >= 0; i--) {
      const f = SNOW.falling[i];
      f.y += f.vy * dt; f.x += Math.sin(SNOW.t * f.f + f.ph) * 0.35 * dt; f.z += Math.cos(SNOW.t * f.f * 0.7 + f.ph) * 0.25 * dt;
      f.yaw += f.sp * dt; f.tl += dt * 3;
      if (f.y <= YS + 0.02) {
        SNOW.falling.splice(i, 1);
        if (Math.abs(f.x) < 13 && f.z < 0.2 && f.z > -14) {
          if (SNOW.landed.length >= MAXL) SNOW.landed.shift();
          SNOW.landed.push({ x: f.x, z: f.z, yaw: f.yaw, a: 1 });
        }
      }
    }
    // 扫帚：扫过的地方纸雪消失
    const brooms = [];
    for (const id of ['pr1', 'pr2', 'pr3']) { const q = W.people[id]; if (q && q.op > 0.5 && q._broomHead) brooms.push(q._broomHead); }
    for (let i = SNOW.landed.length - 1; i >= 0; i--) {
      const f = SNOW.landed[i];
      for (const b of brooms) if (!f.fade && Math.hypot(f.x - b[0], f.z - b[2]) < 0.85) f.fade = 0.35;
      if (f.fade) { f.a -= dt / f.fade; if (f.a <= 0) SNOW.landed.splice(i, 1); }
    }
  }
  function drawSnow() {
    for (const f of SNOW.falling) {
      const it = push('box', f.x, f.y, f.z, 0.13, 0.014, 0.09, f.yaw, C.paper, 1, 0.45); it.tilt = Math.sin(f.tl) * 0.9; it.noShadow = true;
    }
    for (const f of SNOW.landed) {
      const it = push('box', f.x, YS + 0.008, f.z, 0.13 * Math.max(0.2, f.a), 0.012, 0.09, f.yaw, C.paper, Math.min(1, f.a + 0.2), 0.3); it.noShadow = true;
    }
  }

  /* —— 其它绘制 —— */
  // 观众：缓坡座席上的无脸小人
  function collectSeats(pt) {
    const c = pt.cur, d = pt.data;
    if (c.op < 0.01) return;
    const cols = 10, rows = 9, w = d.x1 - d.x0, sp = w / cols;
    for (let r = 0; r < rows; r++) {
      const z = 6.4 + r * 1.2, top = YH + 0.12 * (r + 1);
      push('box', (d.x0 + d.x1) / 2, (YH + top) / 2, z, w, top - YH, 1.2, 0, C.tier, c.op);
      for (let j = 0; j < cols; j++) {
        const k = r * cols + j + (d.x0 > 0 ? 7 : 0);
        const it = push('pawn', d.x0 + sp * (j + 0.5), top, z + 0.1, 1.02, 1.02, 1.02, 0, C.aud[k % 3], c.op);
        it.noShadow = true;
      }
    }
  }
  // 圣诞树：几层圆锥、挂饰与顶上的星
  const ORN = []; for (let i = 0; i < 16; i++) ORN.push([((i * 137.5) % 360) * D, 0.12 + (i % 8) * 0.095, i % 4]);
  function collectTree(pt) {
    const c = pt.cur, op = c.op; if (op < 0.01) return;
    const [x, y, z] = c.p, w = c.s[0], h = c.s[1];
    push('cyl', x, y, z, w * 0.13, h * 0.16, w * 0.13, 0, C.trunk, op);
    [[0.1, 1.0, 0.42], [0.33, 0.82, 0.36], [0.54, 0.62, 0.3], [0.72, 0.42, 0.26]].forEach(([y0, r, hh], i) =>
      push('cone', x, y + h * y0, z, w * r, h * hh, w * r, 0, i % 2 ? C.treeDark : C.tree, op));
    for (const [a, t, ci] of ORN) {
      const yy = h * (0.14 + t * 0.85), rr = w * 0.5 * (1.0 - (yy / h - 0.1) * 0.95) * 0.82;
      if (rr <= 0.05) continue;
      push('sphere', x + Math.sin(a) * rr, y + yy, z + Math.cos(a) * rr, w * 0.07, w * 0.07, w * 0.07, 0, C.orn[ci], op, 0.35).noShadow = true;
    }
    push('sphere', x, y + h * 0.99, z, w * 0.13, w * 0.13, w * 0.13, 0, C.gold, op, 0.8).noShadow = true;
    // 变化前的大小：半透明的轮廓，供前后对比
    if (W.treeGhost.op > 0.01) {
      const g = W.treeGhost, gw = 3.0, gh = 4.4, go = g.op * op;
      [[0.1, 1.0, 0.42], [0.33, 0.82, 0.36], [0.54, 0.62, 0.3], [0.72, 0.42, 0.26]].forEach(([y0, r, hh]) => {
        const it = push('cone', x + 4.2, y + gh * y0, z + 3.6, gw * r, gh * hh, gw * r, 0, C.glow, go * 0.55, 0.6); it.noShadow = true;
      });
    }
  }
  function collectBirch(pt) {
    const c = pt.cur, op = c.op; if (op < 0.01) return;
    const [x, y, z] = c.p, w = c.s[0], h = c.s[1];
    push('cyl', x, y, z, w, h, w, 0, C.birch, op);
    [0.08, 0.17, 0.29, 0.38, 0.52, 0.61, 0.74].forEach((t, i) => push('cyl', x, y + h * t, z, w * 1.04, 0.12 + (i % 3) * 0.05, w * 1.04, 0, C.bark, op));
  }
  function collectColumn(pt) {
    const c = pt.cur, op = c.op; if (op < 0.01) return;
    const [x, y, z] = c.p, w = c.s[0], h = c.s[1], nb = 9;
    for (let i = 0; i < nb; i++) push('cyl', x, y + (h / nb) * i, z, w, h / nb + 0.005, w, 0, i % 2 ? C.candyW : C.candyR, op);
    push('sphere', x, y + h + 0.35, z, w * 1.5, w * 1.1, w * 1.5, 0, C.pink, op, 0.08);
  }
  // 乐池里的演奏员：跟着升降台走
  function collectPit() {
    const o = W.flags.musicians == null ? 1 : W.flags.musicians; if (o < 0.01) return;
    const us = W.byId.liftUS.cur, ds = W.byId.liftDS.cur;
    [[us, 2.6, 15], [ds, 4.15, 13]].forEach(([L, z, nn], row) => {
      const top = L.p[1] + L.s[1];
      for (let j = 0; j < nn; j++) {
        const x = -8.6 + (17.2 / (nn - 1)) * j;
        if (row === 1 && Math.abs(x) < 1.2) continue;           // 给指挥留位置
        push('pawn', x, top, z, 0.92, 0.92, 0.92, 0, C.musician, o).noShadow = true;
        push('box', x, top + 0.75, z - 0.45, 0.42, 0.04, 0.3, 0, C.stand, o, 0.55).noShadow = true;
      }
    });
    push('box', 0, ds.p[1] + ds.s[1] + 0.15, 4.5, 0.8, 0.3, 0.7, 0, C.lift, o);
  }
  // 雪橇与驯鹿（只表现观众看见的结果）
  W.sleigh = { p: [0, YS, -5.5], yaw: 0, op: 0, riders: false };
  function collectSleigh() {
    const s = W.sleigh; if (s.op < 0.01) return;
    const B = makeB(s.p, 1, s.yaw, s.op);
    B.box(0, 0.25, 0, 2.2, 0.55, 1.2, C.sleigh); B.box(-0.85, 0.8, 0, 0.5, 0.75, 1.2, C.sleigh); B.box(0.95, 0.8, 0, 0.3, 0.35, 1.2, C.sleigh);
    [-0.5, 0.5].forEach((zz) => { B.box(0, 0, zz, 2.4, 0.08, 0.08, C.gold, 0.3); B.box(1.25, 0.05, zz, 0.08, 0.5, 0.08, C.gold, 0.3); });
    [[2.7, -0.35], [3.9, 0.35]].forEach(([dx, dz], i) => {
      const leg = Math.sin(SNOW.t * 5 + i) * 0.12;
      B.box(dx, 0.75, dz, 1.0, 0.45, 0.38, C.deer);
      [[-0.35, -0.12], [0.35, -0.12], [-0.35, 0.12], [0.35, 0.12]].forEach(([lx, lz], j) => B.box(dx + lx + (j % 2 ? leg : -leg), 0, dz + lz, 0.08, 0.78, 0.08, C.deer));
      B.box(dx + 0.55, 1.05, dz, 0.18, 0.5, 0.18, C.deer); B.sph(dx + 0.7, 1.55, dz, 0.18, C.deer);
      B.cone(dx + 0.66, 1.65, dz - 0.1, 0.06, 0.38, C.antler); B.cone(dx + 0.66, 1.65, dz + 0.1, 0.06, 0.38, C.antler);
      B.sph(dx + 0.87, 1.52, dz, 0.06, C.scarlet, 0.6);
      const a = B.at(1.1, 0.7, 0), b = B.at(dx - 0.5, 0.95, dz); seg(a, b, 0.03, C.gold, s.op, 0.4);
    });
    s._seat = [B.at(-0.35, 0.55, -0.3), B.at(-0.35, 0.55, 0.3)];
  }

  /* ---------- 人物：见 figures.js ---------- */
  W.doll = { on: null, p: [0, YS, 0], op: 0 };
  W.extra = [];            // 剧情临时加入的绘制（例如裙子的吊绳）
  W.slipper = { p: [0, YS, 0], op: 0 };

  /* ---------- 环境 ---------- */
  const ENV = (W.ENV = {
    void: { bg: hex('#000000'), sky: [0, 0, 0], gnd: [0, 0, 0], sun: [0, 0, 0], shK: 0.5, sunYaw: 62 * D, sunPitch: 50 * D },
    house: { bg: hex('#2A2630'), sky: [0.30, 0.27, 0.31], gnd: [0.13, 0.11, 0.13], sun: [0.18, 0.16, 0.16], shK: 0.5, sunYaw: 62 * D, sunPitch: 50 * D },
    show: { bg: hex('#1C1922'), sky: [0.15, 0.13, 0.16], gnd: [0.06, 0.05, 0.07], sun: [0.10, 0.09, 0.10], shK: 0.5, sunYaw: 62 * D, sunPitch: 50 * D },
    night: { bg: hex('#111523'), sky: [0.11, 0.14, 0.23], gnd: [0.05, 0.06, 0.10], sun: [0.10, 0.12, 0.21], shK: 0.55, sunYaw: 62 * D, sunPitch: 50 * D },
    dim: { bg: hex('#3B3741'), sky: [0.44, 0.40, 0.44], gnd: [0.20, 0.18, 0.20], sun: [0.30, 0.27, 0.26], shK: 0.55, sunYaw: 62 * D, sunPitch: 50 * D },
    snowWork: { bg: hex('#47526C'), sky: [0.42, 0.47, 0.58], gnd: [0.19, 0.21, 0.27], sun: [0.32, 0.35, 0.44], shK: 0.55, sunYaw: 62 * D, sunPitch: 50 * D },
    snow: { bg: hex('#16203A'), sky: [0.22, 0.27, 0.38], gnd: [0.08, 0.10, 0.16], sun: [0.20, 0.24, 0.36], shK: 0.55, sunYaw: 62 * D, sunPitch: 50 * D },
    work: { bg: hex('#D2D8DC'), sky: [0.63, 0.66, 0.69], gnd: [0.40, 0.41, 0.43], sun: [0.46, 0.45, 0.42], shK: 0.55, sunYaw: 62 * D, sunPitch: 52 * D },
    sweets: { bg: hex('#2A1A2E'), sky: [0.28, 0.20, 0.29], gnd: [0.12, 0.08, 0.12], sun: [0.22, 0.15, 0.20], shK: 0.5, sunYaw: 62 * D, sunPitch: 50 * D },
    review: { bg: hex('#DDE2E2'), sky: [0.64, 0.67, 0.69], gnd: [0.42, 0.43, 0.44], sun: [0.50, 0.48, 0.44], shK: 0.6, sunYaw: 62 * D, sunPitch: 50 * D },
  });
  W.env = { bg: [0, 0, 0], sky: [0, 0, 0], gnd: [0, 0, 0], sun: [0, 0, 0], shK: 0.5, sunYaw: 62 * D, sunPitch: 50 * D, pl: [] };
  for (let i = 0; i < 4; i++) W.env.pl.push({ p: [0, 0, 0], r: 1, c: [0, 0, 0], follow: null });
  const envCopy = (e) => ({ bg: e.bg.slice(), sky: e.sky.slice(), gnd: e.gnd.slice(), sun: e.sun.slice(), shK: e.shK, sunYaw: e.sunYaw, sunPitch: e.sunPitch });
  W.setEnv = function (name) { const e = envCopy(ENV[name]); for (const k in e) W.env[k] = e[k]; };
  W.envTo = function (name, dur, opt) { return SL.tw.to(W.env, envCopy(ENV[name]), dur, opt || { ease: 'sine' }); };
  W.lightsOff = function () { W.env.pl.forEach((L) => { L.c = [0, 0, 0]; L.r = 1; L.follow = null; }); };

  /* ---------- 相机 ---------- */
  W.cam = { yaw: 0, pitch: 8 * D, zoom: 7, t: [0, 8.2, 0], uyaw: 0, upitch: 0, uzoom: 1, follow: null };
  W.snapCut = function () {
    const yaw = W.cam.yaw + W.cam.uyaw, cdx = Math.sin(yaw), cdz = Math.cos(yaw);
    W.parts.forEach((pt) => { if (pt.cut) pt.cutF = pt.cut[0] * cdx + pt.cut[1] * cdz > 0.22 ? 0 : 1; });
  };

  W.collect = function (dt) {
    W.dt = dt; n = 0;
    let sdt = SL.tw.time - SNOW.lastT; SNOW.lastT = SL.tw.time;
    if (sdt < 0 || sdt > 0.6) sdt = 0;
    while (sdt > 1e-5) { const s = Math.min(sdt, 0.05); stepSnow(s); sdt -= s; }

    const cam = W.cam, yaw = cam.yaw + cam.uyaw, cdx = Math.sin(yaw), cdz = Math.cos(yaw);
    const g = push('box', 0, -0.5, 0, 900, 1, 900, 0, [0.55, 0.55, 0.55], 1); g.flat = true;

    for (const pt of W.parts) {
      const c = pt.cur;
      if (pt.cut) {
        const target = pt.cut[0] * cdx + pt.cut[1] * cdz > 0.22 ? 0 : 1;
        pt.cutF += (target - pt.cutF) * Math.min(1, dt * 3.2);
      }
      if (pt.geo === 'line') { collectLine(pt); continue; }
      if (pt.geo === 'seats') { collectSeats(pt); continue; }
      if (pt.geo === 'tree') { collectTree(pt); continue; }
      if (pt.geo === 'birch') { collectBirch(pt); continue; }
      if (pt.geo === 'column') { collectColumn(pt); continue; }
      if (pt.geo === 'comp') { if (c.op > 0.01) pt.draw(makeB(c.p, c.k, c.yaw, c.op), c); continue; }
      let op = c.op;
      if (pt.cutHide) op *= pt.cutF;
      if (op < 0.01 || c.grow < 0.004) continue;
      let h = c.s[1] * c.grow;
      if (pt.cut && !pt.cutHide) { const low = Math.min(h, 0.35); h = low + (h - low) * pt.cutF; }
      const y = pt.geo === 'box' ? c.p[1] + h / 2 : c.p[1];
      const it = push(pt.geo, c.p[0], y, c.p[2], c.s[0], h, c.s[2], c.yaw || 0, c.c, op, pt.emis);
      it.noShadow = pt.noShadow;
    }
    collectPit();
    collectSleigh();
    if (W.sleigh.riders && W.sleigh._seat) {
      const s = W.sleigh._seat, a = W.people.clara, b = W.people.prince;
      a.p = [s[0][0], s[0][1] - 0.26 * a.h, s[0][2]]; b.p = [s[1][0], s[1][1] - 0.26 * b.h, s[1][2]];
      a.yaw = b.yaw = W.sleigh.yaw + Math.PI / 2; a._lx = null; b._lx = null;
    }
    W.drawPeople(push, dt);
    for (const f of W.extra) f(push, seg);
    drawSnow();

    if (cam.follow) { const q = W.people[cam.follow], k = Math.min(1, dt * 3); for (let i = 0; i < 3; i++) cam.t[i] += (q.p[i] + (i === 1 ? 1 : 0) - cam.t[i]) * k; }
    return n;
  };
  W.items = items;
})();
