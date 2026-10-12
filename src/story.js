/* StageLab · story.js  —  胡桃夹子：九个段落，一座剧场
 * 每段两部分：
 *   start()  这一段开始时世界应有的样子（跳段 / 重看时用）
 *   run()    这一段的演出时间线（顺着往下演时接着上一段的状态）
 * 学生始终跟随 Clara。后台揭示只回答她旅途中刚刚发生的变化：
 * 世界为什么变大？雪从哪里来？雪林怎样让出下一个世界？巨大的角色怎样及时出现？
 * 时间全部是课堂建议时长，不是原演出时码。
 */
(function () {
  'use strict';
  const SL = window.SL, W = SL.world, tw = SL.tw, TX = SL.text, UI = SL.ui, A = SL.audio, D = Math.PI / 180;
  const P = W.people, K = W.K, YS = K.YS;
  const S = (SL.story = { index: 0, gen: 0, auto: false, started: false, scenes: [] });

  /* ---------- 小工具 ---------- */
  const wait = (s) => tw.wait(s);
  const all = (...a) => Promise.all(a);
  const cam = (o, dur, opt) => tw.to(W.cam, o, dur, opt);
  const go = (id, p, dur, opt) => tw.to(P[id], { p }, dur, Object.assign({ ease: 'sine' }, opt));
  const fade = (id, op, dur, opt) => tw.to(P[id], { op }, dur, opt);
  const userBack = (dur) => tw.to(W.cam, { uyaw: 0, upitch: 0, uzoom: 1 }, dur || 2.5);
  function put(id, p, o) {
    const q = P[id];
    W.resetPerson(q); q.p = p.slice(); q.op = 1;
    Object.assign(q, o || {});
    if (q.look) { const t = typeof q.look === 'string' ? P[q.look].p : [q.look[0], 0, q.look[1]]; q.yaw = Math.atan2(t[0] - p[0], t[2] - p[2]); }
  }
  const look = (id, t) => { P[id].look = t; };
  const arm = (id, L, R, dur, opt) => tw.to(P[id], { armL: L, armR: R }, dur || 0.7, opt);
  const bow = (id, a, dur, opt) => tw.to(P[id], { bow: a }, dur || 0.9, opt);
  const sit = (id, v, dur, opt) => tw.to(P[id], { sit: v }, dur || 0.9, opt);
  function fall(id, dir) { const q = P[id]; q.fallDir = dir || 1; tw.to(q, { armL: 0.5, armR: 0.5, bow: 0 }, 0.8); return tw.to(q, { fall: 1 }, 0.9, { ease: 'in' }); }
  const at = (x, z, y) => [x, y == null ? YS : y, z];
  const part = (id) => W.byId[id].cur;

  /* ---------- 文字 ---------- */
  const say = (zh, en) => TX.show({ id: 'cap', kind: 'cap', zh, en });
  const sayOff = () => TX.hide('cap');
  const label = (id, o) => TX.show(Object.assign({ id, spatial: true, size: 0.5, tone: 'light' }, o));
  function tag(id, secs, alt) {
    const q = P[id], n = alt || q.spec.name;
    TX.show({ id: 'tag-' + id, mode: 'float', kind: 'tag', below: true, at: () => q.p, zh: n[0], en: n[1], size: 0.15 });
    tw.wait(secs || 5).then(() => TX.hide('tag-' + id));
  }
  const cue = (id, at3, zh, en, size) => TX.show({ id, mode: 'float', at: at3, zh, en, size: size || 0.3, cue: true, tone: 'light' });

  /* ---------- 剧场动作 ---------- */
  const curtainTo = (open, dur) => tw.to(part('main'), { y: open ? W.LINE.mainOpen : W.LINE.mainClosed }, dur || 5, { ease: 'io' });
  const upper = (open, dur) => tw.to(part('prUpper'), { grow: open ? 0.03 : 1 }, dur || 4);
  // 剖开：台口墙、防火幕、主幕变成半透明，只留下金色的台框——像剖面模型一样看进镜框背后
  const SECTION = { prL: 0.1, prR: 0.1, prHead: 0.1, fireCurtain: 0.08, main: 0.2 };
  const section = (on, dur) => all(upper(on, dur), ...Object.keys(SECTION).map((id) => tw.to(part(id), { op: on ? SECTION[id] : 1 }, dur || 4)));
  const frameGlow = (op, dur) => all(...['glL', 'glR', 'glT', 'glB'].map((id) => tw.to(part(id), { op }, dur || 1.2)));

  /* ---------- 灯光 ---------- */
  const LIGHT = {
    house: [{ p: [0, 9, 4], r: 13, c: [1.5, 1.25, 1.05] }, null, { p: [0, 3.6, 3.6], r: 6.5, c: [1.15, 0.85, 0.55] }, { p: [0, 7, -6], r: 1, c: [0, 0, 0] }],
    parlor: [{ p: [0, 10, -2], r: 16, c: [1.7, 1.45, 1.15] }, { r: 3.6, c: [0.6, 0.55, 0.45] }, { p: [0, 3.6, 3.6], r: 6.5, c: [1.15, 0.85, 0.55] }, { p: [0, 6.5, -7.5], r: 10, c: [0.9, 0.65, 0.4] }],
    night: [{ p: [0, 10, -2], r: 16, c: [0.55, 0.68, 1.15] }, { r: 3.6, c: [0.75, 0.75, 0.8] }, { p: [0, 3.6, 3.6], r: 6.5, c: [0.9, 0.7, 0.45] }, { p: [0, 8, -10], r: 10, c: [0.45, 0.55, 1.0] }],
    snow: [{ p: [0, 10, -3], r: 17, c: [0.95, 1.08, 1.5] }, { r: 3.6, c: [0.7, 0.75, 0.85] }, { p: [0, 3.6, 3.6], r: 6.5, c: [0.9, 0.7, 0.45] }, { p: [0, 7, -9], r: 11, c: [0.5, 0.62, 1.05] }],
    sweets: [{ p: [0, 10, -3], r: 17, c: [1.65, 1.2, 1.3] }, { r: 3.6, c: [0.75, 0.6, 0.6] }, { p: [0, 3.6, 3.6], r: 6.5, c: [1.15, 0.85, 0.55] }, { p: [0, 7, -9], r: 11, c: [1.1, 0.55, 0.85] }],
    snowFly: [{ p: [0, 10, -3], r: 17, c: [0.95, 1.08, 1.5] }, { r: 3.6, c: [0.7, 0.75, 0.85] }, { p: [0, 3.6, 3.6], r: 6.5, c: [0.9, 0.7, 0.45] }, { p: [-11, 9, -6.4], r: 10, c: [1.0, 0.9, 0.7] }],
    work: [{ p: [0, 12, -5], r: 20, c: [0.5, 0.5, 0.48] }, { r: 1, c: [0, 0, 0] }, { p: [0, 3.6, 3.6], r: 6.5, c: [0.6, 0.48, 0.32] }, { p: [-11, 8, -6], r: 9, c: [0.9, 0.82, 0.62] }],
  };
  function lightsSet(name) {
    W.lightsOff();
    LIGHT[name].forEach((L, i) => {
      if (!L) return; const T = W.env.pl[i];
      if (L.p) T.p = L.p.slice(); T.r = L.r; T.c = L.c.slice();
      if (i === 1) T.follow = 'clara';
    });
  }
  function lightsTo(name, dur) {
    return all(...LIGHT[name].map((L, i) => {
      const T = W.env.pl[i];
      if (!L) return tw.to(T, { c: [0, 0, 0] }, dur);
      if (i === 1) T.follow = 'clara';
      const o = { c: L.c.slice() }; if (L.p) o.p = L.p.slice(); o.r = L.r;
      return tw.to(T, o, dur, { ease: 'sine' });
    }));
  }

  /* ---------- 相机 ---------- */
  const CAM = {
    aud: { yaw: 0, pitch: 8 * D, zoom: 7.1, t: [0, 7.4, 0] },
    audHigh: { yaw: 0, pitch: 20 * D, zoom: 7.8, t: [0, 6.6, 1.5] },
    stage: { yaw: 14 * D, pitch: 18 * D, zoom: 6.8, t: [0.6, 7.2, -5] },
    house: { yaw: 36 * D, pitch: 26 * D, zoom: 17, t: [1, 8, 4] },
    fly: { yaw: 18 * D, pitch: 12 * D, zoom: 11, t: [-3.6, 9.8, -5] },
    back: { yaw: 26 * D, pitch: 46 * D, zoom: 10.6, t: [-1.6, 5.4, -6.6] },
    wing: { yaw: 58 * D, pitch: 24 * D, zoom: 7.2, t: [10.4, 4.0, -6.8] },
    review: { yaw: 40 * D, pitch: 29 * D, zoom: 24, t: [3, 10, -1] },
    rFly: { yaw: 30 * D, pitch: 16 * D, zoom: 13, t: [-7.4, 11.8, -6.5] },
    rSide: { yaw: 52 * D, pitch: 30 * D, zoom: 10.5, t: [14, 2.2, -7.5] },
    rBelow: { yaw: 80 * D, pitch: 7 * D, zoom: 6.4, t: [2.8, 2.2, -6.6] },
    rPit: { yaw: 24 * D, pitch: 50 * D, zoom: 6.6, t: [0, 2.4, 3.6] },
  };
  const camTo = (c, dur, opt) => all(userBack(dur), cam({ yaw: c.yaw, pitch: c.pitch, zoom: c.zoom, t: c.t.slice() }, dur, opt));

  /* ---------- 重置：跳段 / 重看 ---------- */
  function reset(cfg, env, c, o) {
    o = o || {};
    W.setConfig(cfg); W.setEnv(env); W.lightsOff();
    for (const id in P) W.resetPerson(P[id]);
    W.snowReset(); W.extra.length = 0;
    W.flags = { musicians: 1, ropeGlow: 0, demoGlow: 0, gHold: 0 };
    W.treeGhost.op = 0; W.doll.on = null; W.doll.op = 0; W.slipper.op = 0; W.sleigh.op = 0; W.sleigh.riders = false;
    part('main').y = o.open ? W.LINE.mainOpen : W.LINE.mainClosed;
    part('prUpper').grow = o.upper ? 0.03 : 1;
    Object.keys(SECTION).forEach((id) => (part(id).op = o.upper ? SECTION[id] : 1));
    const k = W.cam; k.yaw = c.yaw; k.pitch = c.pitch; k.zoom = c.zoom; k.t = c.t.slice(); k.uyaw = 0; k.upitch = 0; k.uzoom = 1; k.follow = null;
    W.snapCut();
    UI.toolHide(); UI.hideCard(); UI.final(false);
    UI.credit(o.credit === undefined ? '胡桃夹子 · 镜框式剧场' : o.credit);
    A.set(o.wind || 0, 0, 1.5);
    A.cue(o.music === undefined ? null : o.music, 1.2);
    if (o.lights) lightsSet(o.lights);
    if (o.conductor !== false) put('conductor', [0, 2.3, 4.55], { look: [0, -10] });
  }
  // 指挥打拍子：只在 W.flags.beat 为真时继续
  async function beat() {
    W.flags.beat = true;
    while (W.flags.beat) { await arm('conductor', 1.5, 2.3, 0.45); await arm('conductor', 2.1, 1.6, 0.45); }
    arm('conductor', 0, 0, 0.8);
  }
  // 一组人沿圆周走
  async function circle(ids, c, r, turns, dur, dir) {
    const steps = Math.max(1, Math.round(12 * turns)), dt = dur / steps;
    const base = ids.map((id) => Math.atan2(P[id].p[0] - c[0], P[id].p[2] - c[1]));
    for (let k = 1; k <= steps; k++) {
      await all(...ids.map((id, i) => { const a = base[i] + (dir || 1) * (k / 12) * Math.PI * 2; return go(id, [c[0] + Math.sin(a) * r, P[id].p[1], c[1] + Math.cos(a) * r], dt, { ease: 'lin' }); }));
    }
  }
  // 沿路线行走：绕开家具，从门和侧幕之间的空隙进出
  async function route(id, pts, speed) {
    speed = speed || 1.6;
    for (const p of pts) { const q = P[id], d = Math.hypot(p[0] - q.p[0], p[2] - q.p[2], p[1] - q.p[1]); if (d > 0.01) await go(id, p, Math.max(0.25, d / speed), { ease: 'lin' }); }
  }
  const STEPS = [['撤下', 'Strike'], ['清理', 'Clear'], ['准备', 'Prepare'], ['再呈现', 'Reveal']];
  const SNOW_IDS = ['snow1', 'snow2', 'snow3', 'snow4', 'snow5', 'snow6'];
  const POLI = ['poli1', 'poli2', 'poli3', 'poli4', 'poli5', 'poli6', 'poli7', 'poli8'];
  const BAGZ = [-3.55, -6.45, -9.35];
  const SEAT = { clara: at(-0.62, -9.55, YS + 0.94), prince: at(0.62, -9.55, YS + 0.86) };
  const DAIS = (x) => [at(x, -6.9), at(x, -7.55, YS + 0.35), at(x, -8.3, YS + 0.7)];     // 台阶、平台、座位
  const DOOR_L = at(-7.58, -4.88), DOOR_R = at(7.58, -4.88);                          // 家宅两侧景片上的门
  const SOFA = at(-3.7, -4.25, YS + 0.38);

  function crewAtRail() {
    ['sh1', 'sh2', 'sh3'].forEach((id, i) => put(id, at(-11.9, BAGZ[i] + 0.45), { look: [-14, BAGZ[i] + 0.45] }));
    W.flags.crewPull = true;
  }
  const G0 = () => W.GINGER;

  /* ================================================================== */
  S.scenes = [
    /* 0 ─────────────────────────────── 开演 */
    {
      id: 'overture', zh: '开演', en: 'Curtain up',
      start() { reset('pre', 'void', CAM.audHigh, { credit: '', conductor: false }); S.started = false; },
      async run() {
        const L = TX.show({ id: 'go', mode: 'void', zh: '序曲响起。', en: 'The overture begins.', size: 0.55, cue: true });
        await L.clicked;
        TX.hide('go'); S.started = true; UI.setScene(0);
        UI.credit('胡桃夹子 · 镜框式剧场');
        A.cue('overture', 2);
        put('conductor', [0, 2.3, 4.55], { look: [0, -10] });
        W.envTo('house', 5); lightsTo('house', 4);
        beat();
        await wait(1.5);
        say(['西雅图，McCaw Hall。', '太平洋西北芭蕾舞团的《胡桃夹子》就要开演。'], ['Seattle, McCaw Hall.', 'Pacific Northwest Ballet’s Nutcracker is about to begin.']);
        await wait(5);
        say(['台口前方的低处是乐池，乐队在这里现场伴奏。'], ['Below the front of the stage is the orchestra pit, where the orchestra plays live.']);
        await wait(5);
        camTo(CAM.aud, 5);
        say(['主幕升起。序曲中，画面走向一座家宅。'], ['The main curtain rises. During the overture, the picture travels toward a family house.']);
        await wait(1.5);
        await curtainTo(true, 6);
        say(['开场的走廊纱幕上，画着《胡桃夹子》历史上的人物。'], ['The corridor scrim at the top of the show shows figures from the ballet’s history.']);
        await wait(3);
        lightsTo('parlor', 4); W.envTo('show', 4);
        await tw.to(part('scrim'), { op: 0 }, 4, { ease: 'sine' });
        // 一家人从左侧景片的门走进来
        const fam = [['clara', [at(-6.4, -3.0), at(-1.6, -3.4)]], ['fritz', [at(-6.4, -3.0), at(-2.0, -3.0), at(-0.2, -4.6)]], ['mother', [at(-5.2, -5.45), at(-3.4, -5.6)]], ['father', [at(-4.6, -6.4), at(-2.0, -6.6)]]];
        fam.forEach(([id, pts], i) => { put(id, at(-9.3, -4.45), { op: 0 }); tw.wait(i * 0.9).then(() => { fade(id, 1, 0.5); route(id, [DOOR_L].concat(pts), 1.5); }); });
        say(['平安夜，Clara 和家人在家里。'], ['Christmas Eve: Clara and her family at home.']);
        await wait(7);
        tag('clara', 5); look('clara', [0, 6]); look('mother', 'clara'); look('father', 'clara');
        await wait(2);
        // 标出画面边界
        sayOff();
        frameGlow(1, 1.4);
        label('frameLabel', { mode: 'wall', at: [0, K.YT + 1.75, 0.6], dir: [1, 0, 0], size: 0.62, zh: '台口', en: 'Proscenium opening' });
        say(['这道边界叫台口：观众看见的画面，都在它里面。'], ['This edge is the proscenium opening: everything the audience sees happens inside it.']);
        await wait(6);
        TX.hide('frameLabel');
        camTo(CAM.house, 6); W.envTo('dim', 5);
        say(['家宅是这一次演出的布景；台口和观众席，属于剧场建筑。'], ['The house is this production’s scenery; the opening and the seats belong to the building.']);
        await wait(3.5);
        UI.unlock('prosc');
        await wait(6.5);
        frameGlow(0, 1.6); sayOff();
        W.flags.beat = false;
        camTo(CAM.stage, 5); W.envTo('show', 4);
        await wait(5);
      },
    },

    /* 1 ─────────────────────────────── 获得礼物 */
    {
      id: 'gift', zh: '获得礼物', en: 'The gift',
      start() {
        reset('parlor', 'show', CAM.stage, { open: true, lights: 'parlor', music: 'overture' });
        put('clara', at(-1.6, -3.4), { look: [0, 6] }); put('fritz', at(-0.2, -4.6)); put('mother', at(-3.4, -5.6), { look: 'clara' }); put('father', at(-2.0, -6.6), { look: 'clara' });
      },
      async run() {
        A.cue('march', 2);
        // 客人从右侧景片的门进来
        const guests = [['guest1', [at(3.2, -6.2)]], ['guest2', [at(4.4, -5.4)]], ['kid1', [at(5.6, -2.6), at(1.4, -2.2)]], ['kid2', [at(5.6, -2.6), at(2.4, -2.6)]]];
        guests.forEach(([id, pts], i) => { put(id, at(9.3, -4.45), { op: 0 }); tw.wait(i * 0.8).then(() => { fade(id, 1, 0.5); route(id, [DOOR_R].concat(pts), 1.5); }); });
        look('mother', 'guest1'); look('father', 'guest2');
        say(['平安夜的家宴，客人们陆续到来。'], ['A Christmas Eve party. The guests arrive.']);
        await wait(8.5);
        // 孩子们围着地毯转圈
        const kids = ['clara', 'fritz', 'kid1', 'kid2'];
        kids.forEach((id, i) => { const a = i * Math.PI / 2 - 0.6; look(id, null); go(id, at(Math.sin(a) * 1.7, -3.4 + Math.cos(a) * 1.7), 1.8); arm(id, 1.1, 1.1, 0.8); });
        await wait(2);
        await circle(kids, [0, -3.4], 1.7, 1, 7);
        kids.forEach((id) => arm(id, 0, 0, 0.8));
        // 德罗塞尔迈尔从左门进来
        put('drossel', at(-9.3, -4.45), { op: 0 }); fade('drossel', 1, 0.6);
        W.doll.on = 'drossel'; W.doll.op = 1;
        say(['教父德罗塞尔迈尔来了。他送给 Clara 一个胡桃夹子玩偶。'], ['Her godfather Drosselmeier arrives. He gives Clara a nutcracker doll.']);
        route('fritz', [at(1.0, -5.0)], 1.4); route('kid1', [at(2.3, -4.4)], 1.4); route('kid2', [at(2.6, -2.2)], 1.4);
        await route('drossel', [DOOR_L, at(-6.4, -3.0), at(-1.0, -3.2)], 1.5);
        tag('drossel', 5);
        look('drossel', 'clara'); look('clara', 'drossel');
        await route('clara', [at(0.2, -2.9)], 1.3);
        await arm('drossel', 0, 1.3, 0.7);
        W.doll.on = 'clara'; arm('drossel', 0, 0, 0.8);
        await arm('clara', 0.3, 1.5, 0.8);
        TX.show({ id: 'dollTag', mode: 'float', kind: 'tag', below: false, at: () => { const h = P.clara._hand || P.clara.p; return [h[0], h[1] + 0.35, h[2]]; }, zh: '胡桃夹子玩偶', en: 'The nutcracker doll', size: 0.15 });
        await wait(4.2);
        TX.hide('dollTag'); arm('clara', 0.2, 0.6, 1);
        // 夜深：客人从右门离开，家人从左门离开
        A.cue('night', 3);
        say(['夜深，客人散去。Clara 抱着玩偶，在沙发上睡着了。'], ['Late at night the guests leave. Clara falls asleep on the sofa, holding the doll.']);
        const leave = (id, pts, door, out, delay) => tw.wait(delay).then(async () => { look(id, null); await route(id, pts.concat([door, out]), 1.6); fade(id, 0, 0.4); });
        leave('guest1', [], DOOR_R, at(9.3, -4.45), 0.2); leave('guest2', [], DOOR_R, at(9.3, -4.45), 0.7);
        leave('kid1', [at(5.6, -2.8)], DOOR_R, at(9.3, -4.45), 1.2); leave('kid2', [at(5.6, -2.8)], DOOR_R, at(9.3, -4.45), 1.7);
        leave('drossel', [at(-6.4, -3.0)], DOOR_L, at(-9.3, -4.45), 0.5); leave('fritz', [at(-2.0, -2.9), at(-6.4, -3.0)], DOOR_L, at(-9.3, -4.45), 1.4);
        leave('mother', [at(-5.2, -5.45)], DOOR_L, at(-9.3, -4.45), 2.2); leave('father', [at(-4.6, -6.4)], DOOR_L, at(-9.3, -4.45), 2.8);
        W.envTo('night', 7); lightsTo('night', 7);
        look('clara', null);
        await route('clara', [at(-1.6, -2.9), at(-3.35, -3.25)], 1.2);
        // 先转身背对沙发，再坐下去
        P.clara.lockFace = true;
        P.clara.yaw = ((P.clara.yaw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        await tw.to(P.clara, { yaw: 20 * D + (P.clara.yaw > 200 * D ? 2 * Math.PI : 0) }, 0.9);
        await all(go('clara', SOFA, 1.1), sit('clara', 1, 1.1));
        await bow('clara', 0.4, 1.4);
        await wait(3.6);
        sayOff();
      },
    },

    /* 2 ─────────────────────────────── 房间变大 */
    {
      id: 'grow', zh: '房间变大', en: 'The room grows', unlocks: ['scenery'],
      start() {
        reset('parlor', 'night', CAM.stage, { open: true, lights: 'night', music: 'night' });
        put('clara', SOFA, { yaw: 20 * D, lockFace: true, sit: 1, bow: 0.4 }); W.doll.on = 'clara'; W.doll.op = 1; P.clara.armR = 0.6; P.clara.armL = 0.2;
      },
      async run() {
        camTo(CAM.aud, 4);
        A.bell(); tw.wait(1.4).then(() => A.bell()); tw.wait(2.8).then(() => A.bell());
        say(['午夜，钟声响起。Clara 醒来。'], ['Midnight. The clock strikes, and Clara wakes.']);
        await bow('clara', 0, 1.2);
        await all(sit('clara', 0, 1), go('clara', at(-3.35, -3.25), 1));
        P.clara.lockFace = false;
        await route('clara', [at(-1.4, -2.6), at(0.6, -2.3)], 1.2);
        look('clara', [0, -10]);
        // 两只老鼠从左门探头
        ['mouse1', 'mouse2'].forEach((id, i) => {
          put(id, at(-9.2, -4.45), { op: 0 });
          tw.wait(i * 0.7).then(async () => { fade(id, 1, 0.4); await route(id, [DOOR_L, at(-5.9, -3.3 - i * 0.4)], 3.2); await route(id, [DOOR_L, at(-9.2, -4.45)], 3.2); fade(id, 0, 0.3); });
        });
        await wait(4);
        A.cue('grow', 2);
        say(['房间里的一切开始变大。'], ['Everything in the room begins to grow.']);
        W.morph('parlor', 'night', 9, { ease: 'sine' }); W.morph(['dropParlor'], 'night', 9, { ease: 'sine' });
        tw.to(P.clara, { bow: -0.18 }, 4);
        await wait(9.6);
        tw.to(P.clara, { bow: 0 }, 1.5);
        say(['树和家具都变大了，Clara 还是原来的大小。树顶已经越过了台口的上沿。'], ['The tree and furniture have grown; Clara has not. The treetop now rises past the top of the frame.']);
        await wait(3);
        await UI.compare({
          title: ['变化前／变化后', 'Before / after'], a: ['变化前', 'Before'], b: ['变化后', 'After'], start: 'b', end: 'b',
          onA: () => { W.morph('parlor', 'parlor', 1.8); W.morph(['dropParlor'], 'parlor', 1.8); },
          onB: () => { W.morph('parlor', 'night', 1.8); W.morph(['dropParlor'], 'night', 1.8); },
        });
        A.cue('night', 3);
        say(['布景改变了尺度，人物所处的世界也就变了。'], ['When scenery changes scale, the world around the character changes too.']);
        await wait(2.5);
        UI.unlock('scenery');
        await wait(4.5);
        say(['PNB 的这棵圣诞树，制作用了约 400 小时。'], ['PNB’s Christmas tree took about 400 hours to build.']);
        await wait(5);
        sayOff();
      },
    },

    /* 3 ─────────────────────────────── 帮助取胜 */
    {
      id: 'battle', zh: '帮助取胜', en: 'The battle',
      start() {
        reset('night', 'night', CAM.aud, { open: true, lights: 'night', music: 'night' });
        put('clara', at(0.6, -2.3), { look: [0, -10] }); W.doll.on = 'clara'; W.doll.op = 1;
      },
      async run() {
        camTo(CAM.stage, 4);
        A.cue('battle', 1.2);
        const mice = ['mouse1', 'mouse2', 'mouse3', 'mouse4'], sold = ['soldier1', 'soldier2', 'soldier3', 'soldier4'];
        const mp = [at(-5.2, -1.4), at(-4.0, -2.3), at(-2.8, -1.2), at(-3.1, -2.9)], sp = [at(5.2, -1.4), at(4.0, -2.3), at(2.8, -1.2), at(3.1, -2.9)];
        // 从台口两侧、景片前面上场
        go('clara', at(1.4, -0.5), 1.8);
        mice.forEach((id, i) => { put(id, at(-9.6, -1.0), { op: 0 }); tw.wait(i * 0.35).then(() => { fade(id, 1, 0.4); route(id, [at(-6.4, -1.0), mp[i]], 3.4); }); });
        put('mouseKing', at(-9.6, -1.0), { op: 0 }); tw.wait(1.5).then(() => { fade('mouseKing', 1, 0.5); route('mouseKing', [at(-6.4, -1.0), at(-1.7, -2.6)], 2.6); });
        sold.forEach((id, i) => { put(id, at(9.6, -1.0), { op: 0 }); tw.wait(0.5 + i * 0.35).then(() => { fade(id, 1, 0.4); route(id, [at(6.4, -1.0), sp[i]], 3.2); }); });
        // 玩偶变成真人大小的胡桃夹子
        W.doll.on = null; W.doll.op = 0;
        put('nutcracker', at(0.9, -2.6), { op: 0, emis: 0.8, look: 'mouseKing' }); fade('nutcracker', 1, 1.2); tw.to(P.nutcracker, { emis: 0 }, 2.4);
        say(['老鼠从四处钻出来；胡桃夹子活了过来，带着玩具兵迎战鼠王。'], ['Mice pour in. The Nutcracker comes to life and leads the toy soldiers against the Mouse King.']);
        await wait(4.4);
        tag('mouseKing', 4); tag('nutcracker', 4);
        mice.forEach((id, i) => look(id, sold[i])); sold.forEach((id, i) => look(id, mice[i])); look('clara', 'mouseKing');
        const toward = (a, b, k) => [a[0] + (b[0] - a[0]) * k, YS, a[2] + (b[2] - a[2]) * k];
        const bout = async () => {
          sold.forEach((id, i) => { arm(id, 0, 1.6, 0.3); go(id, toward(sp[i], mp[i], 0.32), 0.5, { ease: 'out' }); });
          mice.forEach((id, i) => { arm(id, 1.4, 0, 0.3); go(id, toward(mp[i], sp[i], 0.32), 0.5, { ease: 'out' }); });
          await wait(0.7);
          sold.forEach((id, i) => { arm(id, 0, 0.4, 0.6); go(id, sp[i], 0.8); }); mice.forEach((id, i) => { arm(id, 0.3, 0, 0.6); go(id, mp[i], 0.8); });
          await wait(1.0);
        };
        await bout(); await bout();
        // 胡桃夹子与鼠王
        look('nutcracker', 'mouseKing'); look('mouseKing', 'nutcracker');
        go('nutcracker', at(0.2, -2.5), 1.0); await go('mouseKing', at(-0.8, -2.6), 1.0);
        arm('nutcracker', 0, 1.7, 0.3); arm('mouseKing', 1.6, 0, 0.3);
        await wait(0.8);
        say(['危急时，Clara 脱下鞋子，掷向鼠王。'], ['At the critical moment, Clara takes off her slipper and throws it at the Mouse King.']);
        look('clara', 'mouseKing');
        await arm('clara', 0, 2.6, 0.6);
        const h = P.clara._hand.slice(), kp = W.headTop(P.mouseKing);
        W.slipper.p = h; W.slipper.op = 1;
        await tw.to(W.slipper, { p: [(h[0] + kp[0]) / 2, Math.max(h[1], kp[1]) + 1.4, (h[2] + kp[2]) / 2] }, 0.45, { ease: 'out' });
        await tw.to(W.slipper, { p: kp }, 0.45, { ease: 'in' });
        arm('clara', 0, 0, 0.8);
        tw.to(W.slipper, { p: [kp[0] - 0.5, YS + 0.05, kp[2] + 0.5] }, 0.6, { ease: 'in' });
        await fall('mouseKing', -1);
        say(['鼠王倒下了。老鼠们拖着他逃走。'], ['The Mouse King falls. The mice drag him away.']);
        mice.forEach((id, i) => { look(id, null); go(id, at(-1.6 - (i % 2) * 0.7, -2.0 - (i >> 1) * 0.8), 1.2); });
        await wait(1.6);
        P.mouseKing.lockFace = true;
        await all(route('mouseKing', [at(-6.4, -1.0), at(-9.6, -1.0)], 2.4), ...mice.map((id, i) => route(id, [at(-6.4 + (i % 2) * 0.5, -1.0 - (i >> 1) * 0.5), at(-9.6, -1.0 - (i >> 1) * 0.5)], 2.4)));
        fade('mouseKing', 0, 0.4); mice.forEach((id) => fade(id, 0, 0.4)); tw.to(W.slipper, { op: 0 }, 0.6);
        sold.forEach((id, i) => { look(id, null); tw.wait(i * 0.2).then(async () => { await route(id, [at(6.4, -1.0), at(9.6, -1.0)], 2.2); fade(id, 0, 0.4); }); });
        // 胡桃夹子变成王子
        A.cue('still', 2.5);
        say(['胡桃夹子变成了王子。'], ['The Nutcracker becomes a prince.']);
        A.chime();
        tw.to(P.nutcracker, { emis: 1 }, 1.0);
        await wait(1.1);
        const np = P.nutcracker.p.slice();
        fade('nutcracker', 0, 0.8);
        put('prince', np, { op: 0, emis: 1, look: 'clara' }); fade('prince', 1, 0.8); tw.to(P.prince, { emis: 0 }, 2.2);
        await wait(1.6);
        tag('prince', 4.5);
        look('clara', 'prince');
        await go('prince', at(0.7, -1.4), 1.6);
        await bow('prince', 0.55, 0.8); bow('prince', 0, 0.8);
        arm('clara', 0, 0.9, 0.8); arm('prince', 0.9, 0, 0.8);
        await wait(3.2);
        sayOff();
      },
    },

    /* 4 ─────────────────────────────── 穿过雪林：雪从哪里来 */
    {
      id: 'snow', zh: '穿过雪林', en: 'Through the snow', unlocks: ['fly'],
      start() {
        reset('night', 'night', CAM.stage, { open: true, lights: 'night', music: 'still' });
        put('clara', at(1.4, -0.5), { look: 'prince', armR: 0.9 }); put('prince', at(0.7, -1.4), { look: 'clara', armL: 0.9 });
      },
      async run() {
        // 前台：走进雪林
        camTo(CAM.aud, 4.5);
        A.cue('snow', 2.5); A.set(0.22, 0, 4);
        W.dissolve('snow', 4.5); W.envTo('snow', 4.5); lightsTo('snow', 4.5);
        crewAtRail();
        say(['王子带 Clara 走进一片雪林。'], ['The Prince leads Clara into a snowy forest.']);
        look('clara', null); look('prince', null);
        tw.wait(3).then(() => { route('prince', [at(-0.4, -4.1)], 1.2); route('clara', [at(0.4, -3.6)], 1.1); });
        // 雪花从侧幕之间的空隙上场，再站上圆圈
        const entry = [[-1, -3.2, 270], [1, -3.2, 90], [-1, -6.0, 210], [1, -6.0, 150], [-1, -8.6, 330], [1, -8.6, 30]];
        SNOW_IDS.forEach((id, i) => {
          const [sd, z, deg] = entry[i], a = deg * D;
          put(id, at(sd * 9.6, z), { op: 0 });
          tw.wait(1.4 + i * 0.3).then(async () => { fade(id, 1, 0.5); arm(id, 2.5, 2.5, 1.2); await route(id, [at(sd * 5.6, z), at(Math.sin(a) * 3.2, -3.8 + Math.cos(a) * 3.2)], 2.2); });
        });
        tw.wait(2.2).then(() => { W.snow.mode = 'auto'; W.snow.amp = 0.8; });
        await wait(6.5);
        say(['雪花在林间起舞。'], ['Snowflakes dance among the trees.']);
        SNOW_IDS.forEach((id) => (P[id].spin = 2.4));
        circle(SNOW_IDS, [0, -3.8], 3.2, 1.5, 22, -1);
        await wait(5.5);
        // 视线向上：舞台上方的雪袋
        SNOW_IDS.forEach((id) => (P[id].spin = 0));
        say(['舞台上方，挂着三条装满白色碎纸的帆布雪袋。'], ['Above the stage hang three canvas snow bags filled with tiny white paper.']);
        section(true, 4.5);
        camTo(CAM.fly, 6.5);
        W.envTo('snowWork', 6); lightsTo('snowFly', 6);
        await wait(6.6);
        label('bagLabel', { mode: 'float', at: [3.5, 15.6, -6.45], zh: '雪袋', en: 'Snow bags', size: 0.26 });
        say(['吊杆组的三名工作人员摇动雪袋，碎纸从一侧的孔里落下。'], ['Three fly-rail stagehands rock the bags, and the paper falls through holes along one side.']);
        tag('sh1', 4.5);
        await UI.rocker(4);
        UI.toolHide();
        W.snow.mode = 'auto';
        tw.to(W.flags, { ropeGlow: 1 }, 1.8);
        say(['你看见雪，他们在控制雪。'], ['You see snow; they are controlling it.']);
        await wait(7);
        TX.hide('bagLabel');
        label('flySpace', { mode: 'wall', at: [1.5, 18.2, -14.55], dir: [1, 0, 0], size: 0.8, zh: '吊挂空间', en: 'Fly space' });
        label('flyRail', { mode: 'float', at: [-11.6, 7.4, -4.6], zh: '控制工作区', en: 'Fly rail · lock rail', size: 0.24 });
        say(['舞台上方是吊挂空间，舞台一侧是控制工作区。'], ['Above the stage is the fly space; at one side is the fly rail.']);
        await wait(2.6);
        UI.unlock('fly');
        await wait(4.4);
        // 回到观众位置
        TX.hide('flySpace'); TX.hide('flyRail');
        tw.to(W.flags, { ropeGlow: 0 }, 2);
        camTo(CAM.aud, 5.5); section(false, 4.5); W.envTo('snow', 5); lightsTo('snow', 5);
        route('prince', [at(-0.4, -3.0)], 1); route('clara', [at(0.4, -2.6)], 1);
        say(['旅程继续。'], ['The journey continues.']);
        SNOW_IDS.forEach((id) => (P[id].spin = 2.4));
        circle(SNOW_IDS, [0, -3.8], 3.2, 0.7, 9, -1);
        await wait(7);
        sayOff();
      },
    },

    /* 5 ─────────────────────────────── 幕间：雪林让出新世界 */
    {
      id: 'interval', zh: '幕间换景', en: 'The interval', unlocks: ['drapes', 'change'],
      start() {
        reset('snow', 'snow', CAM.aud, { open: true, lights: 'snow', wind: 0.22, music: 'snow' });
        put('clara', at(0.4, -2.6)); put('prince', at(-0.4, -3.0));
        SNOW_IDS.forEach((id, i) => { const a = i * Math.PI / 3; put(id, at(Math.sin(a) * 3.2, -3.8 + Math.cos(a) * 3.2), { armL: 2.5, armR: 2.5, spin: 2.4 }); });
        crewAtRail(); W.snow.mode = 'auto'; W.snowFloor(170);
      },
      async run() {
        say(['第一幕结束，主幕落下。'], ['Act I ends. The main curtain comes down.']);
        tw.wait(2.5).then(() => { W.snow.mode = 'off'; });
        A.set(0.08, 0, 4);
        await curtainTo(false, 5.5);
        A.cue('still', 3);
        UI.unlock('drapes');
        SNOW_IDS.forEach((id) => { P[id].spin = 0; fade(id, 0, 1); });
        fade('clara', 0, 1); fade('prince', 0, 1); W.flags.crewPull = false;
        say(['雪林已经走过，新的世界还没有准备好。'], ['The forest is behind them; the next world is not ready yet.']);
        await wait(5);
        say(['第一幕和第二幕之间，是幕间休息。'], ['Between Act I and Act II comes the interval.']);
        W.envTo('work', 5); lightsTo('work', 5);
        section(true, 4.5); tw.to(part('main'), { op: 0.07 }, 4.5);
        camTo(CAM.back, 6);
        await wait(6.4);
        UI.steps(STEPS, 0);
        say(['纸雪还留在舞台地面上。'], ['The paper snow is still on the stage floor.']);
        await wait(4.6);
        UI.steps(STEPS, 1);
        say(['幕间，道具组三个人把纸雪全部扫干净。'], ['During the interval, three props crew sweep up every scrap of paper snow.']);
        // 从侧幕之间的空隙上场，只在白桦之间的地面上来回扫
        const crew = { pr1: [-3.2, [-1.0, -2.4, -3.8]], pr2: [-6.0, [-5.2, -6.6]], pr3: [-8.6, [-7.8, -8.6]] };
        await all(...Object.keys(crew).map(async (id, i) => {
          const [gap, lanes] = crew[id];
          put(id, at(10.4, gap), { op: 0, broom: true, sweep: 1 });
          await wait(i * 0.4); fade(id, 1, 0.5);
          await route(id, [at(5.8, gap), at(5.8, lanes[0])], 2.2);
          let side = -1;
          for (let k = 0; k < lanes.length; k++) {
            await go(id, at(5.8 * side, lanes[k]), 3.6, { ease: 'lin' });
            if (k < lanes.length - 1) await go(id, at(5.8 * side, lanes[k + 1]), 0.5, { ease: 'lin' });
            side = -side;
          }
          await route(id, [at(5.8 * side * -1, gap), at(5.8, gap), at(10.4, gap)], 2.4);
          fade(id, 0, 0.4);
        }));
        W.snowClear(1.2);
        // 准备：对照转换前后
        UI.toolHide();
        label('upLabel', { mode: 'float', at: [-2, 17.2, -9], size: 0.22, zh: '上部吊景空间', en: 'Fly space above', note: '可把幕布、景片升起收存' });
        label('sideLabel', { mode: 'floor', at: [11.0, YS + 0.03, -12.9], dir: [1, 0, 0], size: 0.42, zh: '侧面搬运空间', en: 'Scenery handling area', tone: 'dark', note: '可推出、暂存、换入景物' });
        say(['上方可以吊起、收存景物；侧面可以暂存、推入景物。'], ['Above, scenery can be flown and stored; at the side, it can be parked and rolled in.']);
        await wait(3);
        await UI.compare({
          title: ['转换前／转换后', 'Before / after the change'], a: ['雪林', 'Before'], b: ['糖果国', 'After'], start: 'a', end: 'b',
          onA: () => W.dissolve('snow', 1.8), onB: () => W.dissolve('sweets', 1.8),
        });
        TX.hide('upLabel'); TX.hide('sideLabel');
        UI.steps(STEPS, 3);
        say(['主幕再次成为观看的边界。它升起时，糖果国出现。'], ['The curtain is the boundary again. When it rises, the Land of Sweets appears.']);
        camTo(CAM.aud, 5); section(false, 4.5); W.envTo('sweets', 5); lightsTo('sweets', 5);
        await wait(5.2);
        A.cue('sugar', 2);
        await curtainTo(true, 5);
        UI.toolHide();
        UI.unlock('change');
        await wait(5);
        sayOff();
      },
    },

    /* 6 ─────────────────────────────── 糖果国：巨大的角色怎样及时出现 */
    {
      id: 'sweets', zh: '糖果国', en: 'Land of Sweets', unlocks: ['wings'],
      start() { reset('sweets', 'sweets', CAM.aud, { open: true, lights: 'sweets', music: 'sugar' }); },
      async run() {
        // 欢迎
        put('sugar', at(0, -6.6), { op: 0, look: [0, 8] }); fade('sugar', 1, 1);
        put('clara', at(-9.4, -3.2), { op: 0 }); put('prince', at(-9.6, -3.5), { op: 0 });
        fade('clara', 1, 0.6); fade('prince', 1, 0.6);
        route('clara', [at(-1.2, -3.2)], 1.8); route('prince', [at(-2.2, -3.6)], 1.8);
        await go('sugar', at(0.4, -5.4), 3.4);
        arm('sugar', 1.5, 1.5, 1); tag('sugar', 4.5);
        say(['糖果仙子迎接 Clara 和王子，为她的勇敢举行庆祝。'], ['The Sugar Plum Fairy welcomes Clara and the Prince and celebrates her courage.']);
        await wait(3);
        look('clara', 'sugar'); look('prince', 'sugar');
        await wait(1.4);
        // 两人走上台阶，在宝座上坐下
        arm('sugar', 0, 0, 1); route('sugar', [at(2.8, -4.4), at(4.4, -3.2)], 1.4); look('sugar', [0, -3]);
        look('clara', null); look('prince', null);
        await all(route('clara', [at(-0.62, -5.0)].concat(DAIS(-0.62)), 1.3), route('prince', [at(0.62, -5.4)].concat(DAIS(0.62)), 1.3));
        // 先转身面向观众，再向后坐上宝座
        P.clara.lockFace = true; P.prince.lockFace = true;
        P.clara.yaw = Math.PI; P.prince.yaw = Math.PI;
        await all(tw.to(P.clara, { yaw: 2 * Math.PI }, 0.9), tw.to(P.prince, { yaw: 0 }, 0.9));
        P.clara.yaw = 0;
        await all(go('clara', SEAT.clara, 1.0), go('prince', SEAT.prince, 1.0), sit('clara', 1, 1.0), sit('prince', 1, 1.0));
        // 杏仁糖之舞
        const marz = ['marz1', 'marz2', 'marz3'];
        marz.forEach((id, i) => { put(id, at(9.4, -3.3), { op: 0 }); tw.wait(i * 0.6).then(() => { fade(id, 1, 0.5); arm(id, 2.4, 1.2, 1); route(id, [at(6.0, -3.3), at(-1.6 + i * 1.6, -3.6 - (i % 2) * 0.8)], 1.8); }); });
        await wait(5);
        marz.forEach((id) => (P[id].spin = 3));
        circle(marz, [0, -3.9], 1.6, 3, 34);
        say(['台上的庆祝还在继续，下一位已经开始准备。'], ['The celebration goes on stage; the next performer is already getting ready.']);
        await wait(3.4);
        const C1 = cue('prep', [10.3, YS + 3.0, 0.5], '侧台 · 候场', 'In the wings', 0.3);
        await C1.clicked;
        TX.hide('prep');
        // 侧台里的准备区
        const [gx, gz] = G0();
        put('ginger', at(gx, gz), { lift: 1.45, skirtOp: 1, skirtY: 0.15, skirtOpen: 1, look: [gx - 5, gz] });
        const crew = [['pr1', 9.6, -5.5], ['pr2', 9.6, -7.6], ['pr3', 9.3, -6.56], ['dr1', 11.8, -4.4], ['dr2', 11.8, -8.75]];
        crew.forEach(([id, x, z]) => put(id, at(x, z), { look: 'ginger' }));
        W.flags.gHold = 1;
        W.extra.push((push, seg) => {
          const hh = W.flags.gHold; if (!hh || hh < 0.01) return;
          const g = P.ginger, top = [gx, YS + 4.3, gz], y = g.p[1] + g.skirtY + 0.9;
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => seg(top, [g.p[0] + a * 0.9, y, g.p[2] + b * 0.9], 0.04, W.C.rope, hh));
        });
        camTo(CAM.wing, 4.5);
        const L3 = W.env.pl[3]; tw.to(L3, { p: [gx - 0.6, 9, gz - 1], r: 10, c: [1.1, 1.0, 0.85] }, 3);
        label('prepNote', { mode: 'float', at: [gx + 0.6, YS + 5.6, gz - 1.2], size: 0.2, zh: '候场准备区', en: 'Preparation area' });
        await wait(4.6);
        tag('ginger', 4);
        say(['五个人（道具组和服装组）帮她穿上巨大的裙子；一个架子先替她承担裙子的重量。'], ['Five people from props and wardrobe help her into the giant skirt; a frame holds the skirt’s weight while it is closed.']);
        crew.forEach(([id]) => arm(id, 1.3, 1.3, 0.8));
        await tw.to(P.ginger, { skirtOpen: 0 }, 4.5);
        crew.forEach(([id]) => arm(id, 0, 0, 0.8));
        await wait(2);
        say(['杏仁糖之舞一开始，裙子的重量就被放到她背带的卡扣上。'], ['When the Marzipan dance begins, the skirt’s weight is lowered onto clips on her harness.']);
        await all(tw.to(W.flags, { gHold: 0 }, 2.6), tw.to(P.ginger, { skirtY: 0 }, 2.6));
        crew.forEach(([id], i) => fade(id, 0, 0.8, { delay: 0.3 + i * 0.15 }));
        await wait(2.2);
        put('sm', at(9.6, -8.0), { op: 0, look: 'ginger' }); fade('sm', 1, 0.6);
        tag('sm', 4);
        say(['舞台监督引导她走进侧幕。'], ['The stage manager guides her into the wing.']);
        route('sm', [at(9.0, -5.3)], 1.2);
        await route('ginger', [at(10.0, gz)], 0.8);
        look('ginger', [0, gz]); look('sm', 'ginger');
        say(['出场前大约 45 秒，八个小丑娃娃钻到裙子底下。'], ['About 45 seconds before her entrance, eight Polichinelles slip under the skirt.']);
        label('t45', { mode: 'float', at: [10.0, YS + 4.0, gz], zh: '约 45 秒', en: '≈ 45 s', size: 0.24 });
        await all(...POLI.map(async (id, i) => {
          put(id, at(12.7, -10.2 - (i % 4) * 0.45), { op: 0 });
          await wait(i * 0.35); fade(id, 1, 0.4);
          await route(id, [at(11.1, -8.9), at(10.0 + (i % 3 - 1) * 0.35, gz - 0.5 + (i % 2) * 0.5)], 2.4);
          fade(id, 0, 0.3);
        }));
        TX.hide('t45'); TX.hide('prepNote');
        await wait(1);
        const C2 = cue('enter', [10.0, YS + 4.4, gz], '出场', 'Entrance', 0.28);
        await C2.clicked;
        TX.hide('enter');
        marz.forEach((id, i) => { P[id].spin = 0; look(id, null); tw.wait(i * 0.3).then(async () => { await route(id, [at(1.5 - i, -3.3), at(6.0, -3.3), at(9.4, -3.3)], 2.4); fade(id, 0, 0.4); }); });
        camTo(CAM.aud, 4); lightsTo('sweets', 3);
        await wait(2.6);
        A.cue('ginger', 1.5);
        say(['姜饼妈妈出场，孩子们从她的裙子底下跑出来。'], ['Mother Ginger enters, and the children run out from under her skirt.']);
        await route('ginger', [at(6.0, gz), at(0.5, -5.4)], 1.4);
        POLI.forEach((id, i) => {
          const a = (-100 + i * (200 / 7)) * D;
          put(id, at(0.5 + Math.sin(a) * 1.0, -5.4 + Math.cos(a) * 1.0), { op: 1, armL: 2.2, armR: 2.2 });
          go(id, at(0.5 + Math.sin(a) * 2.4, -5.4 + Math.cos(a) * 2.4), 1.8, { ease: 'out' });
        });
        await wait(2.2);
        POLI.forEach((id) => (P[id].spin = 3.4));
        say(['台上正在发生的表演，为台侧的准备争取了时间。'], ['What is happening on stage buys time for the preparation in the wings.']);
        await wait(2.2);
        UI.unlock('wings');
        await wait(6);
        sayOff();
      },
    },

    /* 7 ─────────────────────────────── 告别 */
    {
      id: 'farewell', zh: '告别', en: 'Farewell',
      start() {
        reset('sweets', 'sweets', CAM.aud, { open: true, lights: 'sweets', music: 'ginger' });
        put('clara', SEAT.clara, { sit: 1, lockFace: true, yaw: 0 }); put('prince', SEAT.prince, { sit: 1, lockFace: true, yaw: 0 });
        put('sugar', at(4.4, -3.2), { look: [0, -3] }); put('ginger', at(0.5, -5.4), { lift: 1.45, skirtOp: 1, look: [0, 8] });
        POLI.forEach((id, i) => { const a = (-100 + i * (200 / 7)) * D; put(id, at(0.5 + Math.sin(a) * 2.4, -5.4 + Math.cos(a) * 2.4), { armL: 2.2, armR: 2.2, spin: 3.4 }); });
      },
      async run() {
        A.cue('finale', 3);
        say(['庆祝结束了。'], ['The celebration is over.']);
        POLI.forEach((id, i) => { P[id].spin = 0; look(id, null); tw.wait(i * 0.15).then(async () => { await route(id, [at(6.0, -3.3), at(9.4, -3.3)], 2.4); fade(id, 0, 0.4); }); });
        route('ginger', [at(6.0, G0()[1]), at(10.4, G0()[1])], 1.4).then(() => fade('ginger', 0, 0.5));
        await wait(2.6);
        // 两人从宝座走下来
        await all(sit('clara', 0, 0.8), sit('prince', 0, 0.8), go('clara', DAIS(-0.62)[2], 0.8), go('prince', DAIS(0.62)[2], 0.8));
        P.clara.lockFace = false; P.prince.lockFace = false;
        await all(route('clara', [DAIS(-0.62)[1], DAIS(-0.62)[0]], 1.2), route('prince', [DAIS(0.62)[1], DAIS(0.62)[0]], 1.2));
        // 雪橇出现
        W.sleigh.p = at(-2.2, -5.2); W.sleigh.yaw = 0;
        tw.to(W.sleigh, { op: 1 }, 1.4);
        route('sugar', [at(3.2, -3.0)], 1.2);
        await all(route('clara', [at(-1.6, -6.4), at(-2.55, -5.5)], 1.3), route('prince', [at(-0.6, -6.2), at(-2.0, -6.2), at(-2.55, -4.9)], 1.3));
        W.sleigh.riders = true; P.clara.sit = 1; P.prince.sit = 1; arm('clara', 0, 2.2, 0.8); arm('prince', 2.2, 0, 0.8);
        arm('sugar', 2.4, 0, 0.8); look('sugar', 'clara');
        say(['Clara 和王子乘着驯鹿雪橇，飞离糖果国。'], ['Clara and the Prince leave the Land of Sweets in a reindeer sleigh, flying away.']);
        await wait(1.6);
        await tw.to(W.sleigh, { p: at(3.6, -8.0, YS + 10.5) }, 8, { ease: 'in' });
        await wait(2);
        await curtainTo(false, 5);
        say(['幕落。'], ['Curtain.']);
        W.sleigh.riders = false; W.sleigh.op = 0; fade('clara', 0, 0.1); fade('prince', 0, 0.1); fade('sugar', 0, 0.4);
        await wait(3);
        sayOff();
      },
    },

    /* 8 ─────────────────────────────── 回看整座剧场 */
    {
      id: 'review', zh: '回看剧场', en: 'The whole theatre', unlocks: ['below'],
      start() { reset('sweets', 'show', CAM.aud, { lights: 'sweets', music: 'finale' }); },
      async run() {
        A.cue('review', 4);
        const bldTags = ['bld', 'deck', 'trap', 'upper', 'demo'];
        W.envTo('review', 5); lightsTo('work', 5);
        W.morph(W.parts.filter((p) => bldTags.indexOf(p.tag) >= 0), 'review', 4.5);
        camTo(CAM.review, 7);
        curtainTo(true, 5); section(true, 4.5);
        say(['故事结束了。同一座剧场，刚刚先后呈现了家宅、雪林和糖果国。'], ['The story is over. One theatre has just shown a home, a forest and a kingdom, one after another.']);
        await wait(8);
        // 1 上方
        let C = cue('h1', [-4, 21.5, -8], '上方 · 舞台塔', 'Above · fly tower', 0.24);
        await C.clicked; TX.hide('h1');
        camTo(CAM.rFly, 4.5);
        W.flags.demoLine = 'elec2'; tw.to(W.flags, { demoGlow: 1 }, 1.4);
        say(['平衡重：吊杆升起，配重就降下；吊杆降下，配重就升起。'], ['Counterweight: when the batten rises, the arbor sinks; when the batten comes in, the arbor rises.']);
        await wait(4.5);
        await tw.to(part('elec2'), { y: 21.8 }, 4.5);
        await wait(0.6);
        await tw.to(part('elec2'), { y: 6.4 }, 5.5);
        say(['McCaw Hall 有 112 道单式平衡重吊杆，栅顶高约 30 米。'], ['McCaw Hall has 112 single-purchase counterweight sets and a grid about 30 m up.']);
        await tw.to(part('elec2'), { y: 14.0 }, 4);
        tw.to(W.flags, { demoGlow: 0 }, 1.2);
        await wait(2.5);
        // 2 侧面
        camTo(CAM.review, 4);
        await wait(1.5);
        C = cue('h2', [18.4, 10.5, -8], '侧面 · 搬运区', 'Sides · scenery dock', 0.24);
        await C.clicked; TX.hide('h2');
        camTo(CAM.rSide, 4.5);
        say(['舞台左侧是布景搬运区；升降机在下层与舞台层之间运送景物。'], ['Stage left is the scenery handling area; a lift carries scenery between the lower level and the stage.']);
        await wait(4.5);
        const lift = part('sceneLift'), crate = part('crate');
        await all(tw.to(lift, { p: [17.9, 0.0, -7.8] }, 4.5), tw.to(crate, { p: [17.9, 0.4, -7.8] }, 4.5));
        await wait(0.8);
        await all(tw.to(lift, { p: [17.9, YS - 0.4, -7.8] }, 4.5), tw.to(crate, { p: [17.9, YS, -7.8] }, 4.5));
        say(['McCaw Hall 的布景升降机，台面约 4.5 × 11 米。'], ['McCaw Hall’s scenery lift has a platform about 4.5 × 11 m.']);
        await wait(4.5);
        // 3 台下
        camTo(CAM.review, 4);
        await wait(1.5);
        C = cue('h3', [0, 7.2, -6], '台下 · 台仓', 'Below · trap room', 0.24);
        await C.clicked; TX.hide('h3');
        const DOCK = ['ddA', 'ddB', 'ddC', 'ddD', 'sceneLift', 'crate', 'dkWBack', 'dkWSide', 'dkWFront', 'fDockA', 'fDockB', 'fDockC', 'fDockD', 'dkSL', 'twSLa', 'twSLb', 'gFrame'];
        const ghostDock = (on) => all(...DOCK.map((id) => tw.to(part(id), { op: on ? 0 : 1 }, 1.6)));
        ghostDock(true);
        camTo(CAM.rBelow, 4.5);
        say(['舞台面下是两层台仓；中部的台板可以打开，台面可以下沉。'], ['Below the stage are two levels of trap room; panels in the centre can open and the floor can drop.']);
        await wait(3.5);
        const tp = part(W.trapDemo);
        label('trapNote', { mode: 'float', at: [3.6, K.YPIT + 0.6, -8.35], size: 0.2, zh: '台板下沉到乐池层', en: 'A panel drops to pit level' });
        await tw.to(tp, { p: [tp.p[0], K.YPIT, tp.p[2]], op: 1, c: W.C.liftTop.slice() }, 4.5);
        await wait(1.2);
        TX.hide('trapNote');
        await tw.to(tp, { p: [tp.p[0], YS - 0.4, tp.p[2]], op: 0.42, c: W.C.trap.slice() }, 4.5);
        say(['McCaw Hall 的活动台板，大多是 6 × 8 英尺（约 1.8 × 2.4 米）。'], ['Most of McCaw Hall’s trap panels are 6 × 8 ft (about 1.8 × 2.4 m).']);
        await wait(4);
        ghostDock(false);
        // 4 乐池
        camTo(CAM.review, 4);
        await wait(1.5);
        C = cue('h4', [0, 6.0, 3.4], '乐池 · 升降台', 'Pit · lifts', 0.24);
        await C.clicked; TX.hide('h4');
        camTo(CAM.rPit, 4.5);
        say(['两块乐池升降台：可以降到乐池层，可以与观众席齐平，也可以升到舞台面，扩大台唇。'], ['Two pit lifts can sit at pit level, at audience level, or at stage level to extend the apron.']);
        tw.to(W.flags, { musicians: 0 }, 1.2); fade('conductor', 0, 1.2);
        label('pitNote', { mode: 'float', at: [7.5, YS + 1.2, 3.4], size: 0.2, zh: '乐池升降台', en: 'Pit lifts' });
        await wait(2);
        const us = part('liftUS'), ds = part('liftDS');
        await all(tw.to(us, { s: [20.6, K.YH, 1.55] }, 3.5), tw.to(ds, { s: [20.6, K.YH, 1.5] }, 3.5));
        await wait(1);
        await all(tw.to(us, { s: [20.6, YS, 1.55] }, 3), tw.to(ds, { s: [20.6, YS, 1.5] }, 3));
        say(['McCaw Hall 的乐池，最多容纳 90 名乐手。'], ['McCaw Hall’s pit holds up to 90 musicians.']);
        await wait(2.5);
        await all(tw.to(us, { s: [20.6, K.YPIT, 1.55] }, 4), tw.to(ds, { s: [20.6, K.YPIT + 0.5, 1.5] }, 4));
        tw.to(W.flags, { musicians: 1 }, 1.2); fade('conductor', 1, 1.2); TX.hide('pitNote');
        UI.unlock('below');
        await wait(4);
        // 总结
        camTo(CAM.review, 5);
        say(['剧场提供条件，景物与工作人员把条件组织成演出。'], ['The theatre provides the conditions; scenery and crew turn them into a performance.']);
        await wait(6);
        sayOff();
        UI.final(true);
      },
    },
  ];

  /* ---------- 运行、跳段、暂停 ---------- */
  S.pause = function (p) { SL.clock.paused = p; UI.setPaused(p); };

  S.go = function (i, jump) {
    const g = ++S.gen;
    tw.killAll(); TX.clear(); UI.clearCue();
    S.index = i; UI.setScene(i);
    if (SL.clock.paused && !UI.panelOpen) S.pause(false);
    const begin = () => {
      if (g !== S.gen) return;
      UI.lockAll();
      S.scenes.forEach((s, j) => { if (j < i && s.unlocks) s.unlocks.forEach((id) => UI.unlock(id, true)); });
      if (i > 0) { S.started = true; UI.unlock('prosc', true); }
      S.scenes[i].start();
      run(i, g);
    };
    if (jump) { UI.curtain(true); setTimeout(() => { begin(); UI.curtain(false); }, 380); } else begin();
  };
  async function run(i, g) {
    await S.scenes[i].run();
    if (g !== S.gen) return;
    if (i + 1 < S.scenes.length) { S.index = i + 1; UI.setScene(i + 1); run(i + 1, g); }
  }
})();
