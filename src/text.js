/* StageLab · text.js
 * 引导句（可点击）与空间标注保留在空间内；旁白进入统一的底部阅读区域。
 * 空间文字保留四种放法：
 *   void   黑暗里独立出现
 *   float  悬在人物附近
 *   floor  躺在舞台地面上（跟着沙盘一起转）
 *   wall   投在墙面上
 * 正交投影是仿射变换，所以地面 / 墙面上的字可以用一条 CSS matrix() 精确贴合，文字保持清晰。
 * 所有双语文本统一中文在上、英文在下；只有构造名称（spatial）贴在建筑上，
 * 其余剧情字幕固定在画面下沿的同一个阅读位置。
 */
(function () {
  'use strict';
  const SL = window.SL, G = SL.gfx;
  const X = (SL.text = { lines: [] });
  let layer, narrEl, narrTimer = 0;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  X.init = function () { layer = document.getElementById('space'); narrEl = document.getElementById('narr'); };

  function rows(cls, v) {
    if (!v) return '';
    return (Array.isArray(v) ? v : [v]).map((t) => `<span class="${cls}">${t}</span>`).join('');
  }

  // o: { id, mode, at:[x,y,z] | ()=>[x,y,z], en, sub, zh, size, dir:[x,y,z], cue, tone, vy, kind, edge, below, spatial, note }
  //   kind 'cap'  剧情字幕：中文为主、英文在下，不用大写
  //   kind 'tag'  人物名牌：贴在人物脚下
  //   mode 'edge' 贴在画面的上 / 下 / 左 / 右边
  X.show = function (o) {
    const isSubtitle = !o.cue && o.kind !== 'tag' && !o.spatial;
    X.hide(o.id, isSubtitle || !o.kind);
    const role = o.cue ? 'cue' : o.kind === 'tag' ? 'name' : o.spatial ? 'label' : o.speaker ? 'dialogue' : 'narration';
    if (isSubtitle) {
      X.narr(null, null, true);
      X.lines.filter((L) => L.mode === 'subtitle').forEach((L) => X.hide(L.id, true));
      o = Object.assign({}, o, { mode: 'subtitle', en: Array.isArray(o.en) ? o.en.join(' ') : o.en, zh: Array.isArray(o.zh) ? o.zh.join('') : o.zh });
    }
    const el = document.createElement(o.cue ? 'button' : 'div');
    el.className = 'line ' + o.mode + ' text-' + role + (o.cue ? ' cue' : '') + (o.kind ? ' ' + o.kind : '') + (o.edge ? ' e-' + o.edge : '') + (o.align ? ' a-' + o.align : '');
    if (o.tone) el.dataset.tone = o.tone;
    if (o.cue) { el.type = 'button'; el.setAttribute('aria-label', [].concat(o.zh).join(' ') + ' / ' + [].concat(o.en).join('')); }
    if (o.kind === 'cap') el.innerHTML = rows('czh', o.zh) + rows('cen', o.en);
    else if (o.kind === 'tag') el.innerHTML = `<span class="tn">${o.zh}</span><span class="tr">${o.en}</span>`;
    else el.innerHTML = rows('zh', o.zh) + rows('en', o.en) + rows('en sub', o.sub);
    if (o.speaker) el.insertAdjacentHTML('afterbegin', `<span class="speaker">${o.speaker[0]}<small>${o.speaker[1]}</small></span>`);
    if (o.note) el.insertAdjacentHTML('beforeend', `<span class="label-note">${o.note}</span>`);
    layer.appendChild(el);
    const L = Object.assign({ size: 0.4 }, o, { el });
    if (L.mode === 'floor') { const b = L.dir || [1, 0, 0]; L.dir = b; L.down = [-b[2], 0, b[0]]; }
    if (L.mode === 'wall') { L.dir = L.dir || [1, 0, 0]; L.down = [0, -1, 0]; }
    L.w = el.offsetWidth; L.hgt = el.offsetHeight;         // 用来把悬浮文字留在画面之内
    X.lines.push(L);
    place(L);
    void el.offsetWidth; el.classList.add('on');   // 强制重排后再加 on，淡入不依赖帧率
    if (o.cue) {
      L.clicked = new Promise((res) => {
        const fire = () => { if (L.fired) return; L.fired = true; el.classList.add('fired'); if (SL.cueFire === fire) SL.cueFire = null; res(); };
        el.addEventListener('click', fire);
        SL.cueFire = fire;
        if (SL.story && SL.story.auto) SL.tw.wait(1.6).then(fire);
      });
    }
    return L;
  };
  X.hide = function (id, now) {
    X.lines = X.lines.filter((L) => {
      if (L.id !== id) return true;
      L.el.classList.remove('on');
      if (now) L.el.remove(); else { const el = L.el; setTimeout(() => el.remove(), 1400); }
      return false;
    });
  };
  X.clear = function () {
    X.lines.forEach((L) => L.el.remove()); X.lines = [];
    SL.cueFire = null; X.narr(null, null, true);
  };

  function place(L) {
    const sz = G.size(), at = typeof L.at === 'function' ? L.at() : L.at, k0 = clamp(sz.w / 1280, 0.5, 1.25);
    let tr;
    if (L.mode === 'void') {
      tr = `translate(${sz.w / 2}px,${sz.h * (L.vy || 0.5)}px) scale(${L.size * k0}) translate(-50%,-50%)`;
    } else if (L.mode === 'subtitle') {
      // 与 #narr 使用相同的 CSS 位置，避免每种文本有不同的底部锚点。
      tr = 'translateX(-50%)';
    } else if (L.mode === 'edge') {
      const e = L.edge, k = L.size * k0;
      if (e === 'top') tr = `translate(${sz.w / 2}px,${sz.h * 0.075}px) scale(${k}) translate(-50%,0)`;
      else if (e === 'bottom') tr = `translate(${sz.w / 2}px,${sz.h - 74}px) scale(${k}) translate(-50%,-100%)`;
      else if (e === 'left') tr = `translate(${sz.w * 0.045}px,${sz.h * (L.vy || 0.5)}px) scale(${k}) translate(0,-50%)`;
      else tr = `translate(${sz.w * 0.94}px,${sz.h * (L.vy || 0.5)}px) scale(${k}) translate(-100%,-50%)`;
    } else if (L.mode === 'float') {
      const s = G.project(at[0], at[1], at[2]), k = L.kind === 'tag' ? clamp(0.13 * k0, 0.115, 0.14) : L.size * k0, hw = L.w * k / 2 + 14, hh = L.hgt * k;
      const x = hw * 2 > sz.w ? sz.w / 2 : clamp(s.x, hw, sz.w - hw);
      const y = L.below ? Math.min(s.y, sz.h - hh - 8) : Math.max(s.y, hh + 8);
      tr = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${k}) translate(-50%,${L.below ? '0' : '-100%'})`;
    } else {
      const o = G.project(at[0], at[1], at[2]);
      const b = G.project(at[0] + L.dir[0], at[1] + L.dir[1], at[2] + L.dir[2]);
      const d = G.project(at[0] + L.down[0], at[1] + L.down[1], at[2] + L.down[2]);
      const k = L.size / 100;
      tr = `matrix(${((b.x - o.x) * k).toFixed(5)},${((b.y - o.y) * k).toFixed(5)},${((d.x - o.x) * k).toFixed(5)},${((d.y - o.y) * k).toFixed(5)},${o.x.toFixed(1)},${o.y.toFixed(1)}) translate(-50%,-50%)`;
    }
    L.el.style.transform = tr;
  }
  X.update = function () { for (const L of X.lines) place(L); };

  // 剧情连接语 / 变形步骤说明：中文为主，英文在下
  X.narr = function (zh, en, now) {
    clearTimeout(narrTimer);
    narrEl.classList.remove('on');
    if (!zh) { if (now) narrEl.innerHTML = ''; return; }
    X.lines.filter((L) => L.mode === 'subtitle').forEach((L) => X.hide(L.id, true));
    narrTimer = setTimeout(() => {
      narrEl.innerHTML = `<p class="zh">${zh}</p><p class="en">${en}</p>`;
      narrEl.classList.add('on');
    }, now ? 0 : 420);
  };
})();
