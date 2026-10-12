/* StageLab · tween.js
 * 所有动画和等待都跑在同一个“故事时钟”上，所以暂停 / 跳段 / 倍速都只需要动这一处。
 * 缓动只有平滑进出，没有回弹：建筑动画要像精密机械模型。
 */
(function () {
  'use strict';
  const SL = window.SL;
  const T = (SL.tw = { list: [], time: 0 });

  const EASE = {
    io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    sine: (t) => 0.5 - 0.5 * Math.cos(Math.PI * t),
    lin: (t) => t,
    in: (t) => t * t * t,
    out: (t) => 1 - Math.pow(1 - t, 3),
  };
  const clone = (v) => (Array.isArray(v) ? v.slice() : v);

  // T.to(obj, {key: number | number[]}, seconds, {ease, delay}) → Promise
  T.to = function (obj, props, dur, opt) {
    opt = opt || {};
    const keys = Object.keys(props);
    for (const o of T.list) if (o.obj === obj) o.ents = o.ents.filter((e) => keys.indexOf(e.k) < 0);
    return new Promise((res) => {
      T.list.push({
        obj, ents: keys.map((k) => ({ k, from: null, to: props[k] })), t: 0, dur: Math.max(dur, 1e-4),
        ease: EASE[opt.ease || 'io'], delay: opt.delay || 0, started: false, done: false, res,
      });
    });
  };
  T.wait = function (s) { return T.to({}, {}, s); };

  T.update = function (dt) {
    T.time += dt;
    let anyDone = false;
    for (let i = 0; i < T.list.length; i++) {
      const tw = T.list[i];
      if (tw.delay > 0) { tw.delay -= dt; if (tw.delay > 0) continue; }
      if (!tw.started) { tw.started = true; for (const e of tw.ents) e.from = clone(tw.obj[e.k]); }
      tw.t += dt;
      const u = Math.min(tw.t / tw.dur, 1), k = tw.ease(u);
      for (const e of tw.ents) {
        if (Array.isArray(e.to)) { const a = tw.obj[e.k]; for (let j = 0; j < e.to.length; j++) a[j] = e.from[j] + (e.to[j] - e.from[j]) * k; }
        else tw.obj[e.k] = e.from + (e.to - e.from) * k;
      }
      if (u >= 1) { tw.done = true; anyDone = true; }
    }
    if (anyDone) {
      const done = T.list.filter((t) => t.done);
      T.list = T.list.filter((t) => !t.done);
      done.forEach((t) => t.res());
    }
  };
  // 跳段时调用：未完成的 Promise 永不 resolve，旧场景脚本就此停住
  T.killAll = function () { T.list = []; };
})();
