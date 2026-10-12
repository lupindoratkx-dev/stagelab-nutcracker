/* StageLab · main.js
 * 单一 Scene、单一 Renderer、单一主循环。
 * 地址栏参数（课堂上可用）：
 *   ?scene=5     直接从第 5 段开始（1–9）
 *   ?speed=2     倍速
 *   ?auto=1      台词和小人自动触发，整场无人值守播放
 */
(function () {
  'use strict';
  const SL = window.SL, W = SL.world, G = SL.gfx;
  SL.clock = { paused: false, speed: 1 };

  const q = new URLSearchParams(location.search);
  SL.clock.speed = Math.max(0.25, Math.min(40, parseFloat(q.get('speed')) || 1));

  if (!G.init(document.getElementById('gl'))) { document.getElementById('fail').hidden = false; return; }
  SL.text.init();
  SL.ui.init();
  SL.story.auto = q.get('auto') === '1';

  // 画质：默认 high；前几十帧如果明显掉帧，自动降到 low。也可以用 ?q=low / ?q=high 指定
  const qForce = q.get('q');
  if (qForce === 'low') G.setQuality('low');
  let probe = qForce ? null : [];

  // 供测试脚本使用：不依赖帧率，直接把故事时钟推进若干秒
  SL.advance = async function (sec) {
    for (let t = 0; t < sec; t += 0.05) { SL.tw.update(0.05); W.collect(0.05); for (let k = 0; k < 8; k++) await null; }
    for (let i = 0; i < 6; i++) W.collect(0.5);
    SL.text.update(); SL.ui.frame();
  };

  let last = performance.now();
  function frame(now) {
    const raw = now - last;
    const real = Math.min(raw / 1000, 0.1); last = now;
    if (probe && !document.hidden) {
      probe.push(raw);
      if (probe.length === 50) {
        const mid = probe.slice(10).sort((a, b) => a - b)[20];
        if (mid > 42) G.setQuality('low');
        probe = null;
      }
    }
    if (!SL.clock.paused) {
      let dt = real * SL.clock.speed;
      while (dt > 1e-6) { const s = Math.min(dt, 0.05); SL.tw.update(s); dt -= s; }   // 倍速时细分步长，保证时间线顺序不乱
    }
    const n = W.collect(real);
    G.render(W.items, n, W.env, W.cam);
    SL.text.update();
    SL.ui.frame();
    requestAnimationFrame(frame);
  }

  const start = Math.max(1, Math.min(SL.story.scenes.length, parseInt(q.get('scene'), 10) || 1)) - 1;
  SL.story.go(start, false);
  requestAnimationFrame(frame);
})();
