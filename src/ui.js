/* StageLab · 胡桃夹子 UI
 * 剧情走到哪里，就在左侧弹出那一处构造的小卡；详细阅读由用户主动打开，打开时暂停剧情。
 * 右下的小工具面板承载三次互动：摇雪袋、转换前后对照、换景四步。
 */
(function () {
  'use strict';
  const SL = window.SL, W = SL.world, G = SL.gfx, DATA = SL.DATA;
  const U = (SL.ui = { got: {}, cuePerson: null, panelOpen: false, current: null });
  const $ = (id) => document.getElementById(id);
  let squares, ring, panel, body, credit, card, tool, cardVersion = 0, wasPlaying = false, lastFocus = null;
  const ORDER = DATA.order, NOTES = DATA.notes;
  const KIND = { structure: ['剧场构造', 'STRUCTURE'], machinery: ['舞台机械', 'MACHINERY'], backstage: ['后台工作', 'BACKSTAGE'] };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- 关系示意图：不是场馆施工图 ---------- */
  function diagram(id, compact) {
    let d = '', label = '';
    const T = (x, y, s, cls) => `<text class="${cls || ''}" x="${x}" y="${y}">${s}</text>`;
    const dots = (x0, y0, n, dx, dy) => { let o = ''; for (let i = 0; i < n; i++) o += `<circle class="seat-dot" cx="${x0 + i * dx}" cy="${y0 + i * dy}" r="2.6"/>`; return o; };
    if (id === 'prosc' || id === 'map') {
      label = '剖面：舞台塔、台口、主舞台、乐池与观众席';
      d += '<path class="sec-line" d="M40 150V18h128v132"/><path class="sec-line" d="M168 18v74"/><path class="ground" d="M24 150h280"/>';
      d += '<rect class="acting-area" x="44" y="118" width="124" height="22" rx="2"/><path class="deck" d="M40 140h140"/>';
      d += '<path class="frame-line" d="M168 92v48M162 92h12"/><path class="pit" d="M180 140v12h24v-10"/>';
      for (let i = 0; i < 9; i++) d += `<circle class="seat-dot" cx="${214 + i * 10}" cy="${144 - i * 1.6}" r="2.6"/>`;
      if (id === 'map') {
        d += T(104, 34, '上方 · 舞台塔', 'zone') + T(104, 112, '主舞台', 'plan-label') + T(192, 166, '乐池', 'plan-label') + T(70, 166, '下方 · 台仓', 'zone') + T(258, 128, '观众', 'plan-label') + T(186, 86, '台口', 'zone');
        d += '<path class="trap" d="M72 140v14h48v-14"/>';
      } else d += T(104, 132, '主舞台') + T(186, 88, '台口', 'plan-label') + T(104, 36, '舞台塔', 'plan-label') + T(255, 166, '观众席', 'plan-label') + T(192, 166, '乐池', 'plan-label');
    } else if (id === 'scenery') {
      label = '同一个台口里的三种布景状态';
      [[18, '家宅'], [116, '雪林'], [214, '糖果国']].forEach(([x, name], i) => {
        d += `<rect class="frame-box" x="${x}" y="42" width="88" height="62" rx="3"/>`;
        if (i === 0) d += `<path class="ico" d="M${x + 22} 96V70l22-14 22 14v26z"/><rect class="ico-fill" x="${x + 38}" y="78" width="12" height="18"/>`;
        if (i === 1) for (let k = 0; k < 5; k++) d += `<path class="ico" d="M${x + 14 + k * 15} 98V${54 + (k % 2) * 8}"/>`;
        if (i === 2) d += `<path class="ico" d="M${x + 20} 98V60M${x + 68} 98V60M${x + 16} 58h56"/><circle class="ico-fill" cx="${x + 44}" cy="84" r="8"/>`;
        d += T(x + 44, 124, name);
      });
      d += '<path class="frame-line" d="M18 34h284"/>' + T(160, 24, '同一个台口 · 同一座剧场', 'plan-label') + T(160, 150, '布景随剧情进出、存放；建筑不变', 'plan-label');
    } else if (id === 'fly') {
      label = '平衡重吊杆：吊杆升起，配重下降';
      d += '<path class="sec-line" d="M54 168V14h228v154"/><path class="grid-line" d="M54 26h228"/><path class="deck" d="M54 160h228"/>';
      d += '<circle class="mech" cx="70" cy="26" r="5"/><path class="rope" d="M70 26V88M130 66V26M250 66V26M70 22h180"/>';
      d += '<path class="batten" d="M112 66h158"/><rect class="drop" x="116" y="67" width="150" height="46"/>';
      d += '<rect class="arbor" x="63" y="88" width="14" height="34" rx="1.5"/><path class="rope thin" d="M78 160V26"/>';
      d += '<path class="arrow" d="M290 96V62M285 68l5-7 5 7"/><path class="arrow" d="M94 96v30M89 120l5 7 5-7"/>';
      d += '<rect class="lock" x="74" y="148" width="18" height="8" rx="1"/>';
      d += T(168, 18, '栅顶', 'plan-label') + T(191, 94, '吊杆与景物') + T(110, 110, '配重', 'plan-label') + T(118, 154, '锁绳栏', 'plan-label');
    } else if (id === 'drapes') {
      label = '平面：主幕、侧幕、檐幕与边座视线';
      d += '<path class="sec-line" d="M24 118h62M234 118h62"/><path class="frame-line" d="M86 118h148"/><path class="curtain" d="M86 110h148"/>';
      [[92, 0], [66, 1], [40, 2]].forEach(([y, i]) => { d += `<path class="leg" d="M${74 - i * 2} ${y}h26M${220 + i * 2} ${y}h26"/><path class="border-line" d="M100 ${y - 4}h120"/>`; });
      d += '<path class="sight" d="M30 168L86 118 136 74"/><circle class="seat-dot hot" cx="30" cy="168" r="3.6"/>';
      d += dots(60, 160, 11, 20, 0);
      d += T(160, 106, '主幕', 'plan-label') + T(274, 70, '侧幕', 'plan-label') + T(160, 30, '檐幕（虚线）', 'plan-label') + T(150, 92, '边座视线', 'plan-label') + T(270, 132, '台口', 'plan-label');
    } else if (id === 'change') {
      label = '幕间换景的四步';
      d += '<path class="curtain" d="M20 32h280"/>' + T(160, 22, '主幕后面', 'plan-label');
      ['撤下', '清理', '准备', '再呈现'].forEach((s, i) => {
        const x = 18 + i * 74;
        d += `<rect class="step-box${i === 1 ? ' hot' : ''}" x="${x}" y="64" width="62" height="56" rx="8"/>` + T(x + 31, 88, String(i + 1), 'step-n') + T(x + 31, 108, s);
        if (i < 3) d += `<path class="arrow" d="M${x + 64} 92h8M${x + 68} 88l4 4-4 4"/>`;
      });
      d += T(160, 150, '幕间：观众看不见，后台在工作', 'plan-label');
    } else if (id === 'wings') {
      label = '平面：主舞台、两侧侧台与候场位置';
      d += '<rect class="plan-wing" x="40" y="26" width="58" height="96"/><rect class="plan-wing" x="222" y="26" width="58" height="96"/>';
      d += '<rect class="acting-area" x="98" y="26" width="124" height="96" rx="3"/><path class="frame-line" d="M80 128h160"/>';
      [44, 72, 100].forEach((y) => { d += `<path class="leg" d="M92 ${y}h14M214 ${y}h14"/>`; });
      d += '<circle class="hot-dot" cx="252" cy="58" r="9"/><path class="arrow" d="M240 64l-28 10M214 70l-4 5 6 1"/>';
      d += dots(70, 150, 10, 20, 0) + dots(80, 164, 9, 20, 0);
      d += T(160, 80, '主舞台') + T(251, 106, '侧台', 'plan-label') + T(69, 106, '侧台', 'plan-label') + T(252, 40, '候场', 'plan-label') + T(222, 92, '出场', 'plan-label');
    } else if (id === 'below') {
      label = '剖面：台仓与乐池升降台的三个停位';
      d += '<path class="deck" d="M24 70h96M150 70h68"/><rect class="trap-lift" x="121" y="88" width="28" height="6"/><path class="rope thin" d="M135 94v54"/>';
      d += '<path class="sec-line" d="M30 70v84h188V70"/><path class="deck thin" d="M30 110h70"/><path class="ground" d="M10 154h300"/>';
      d += '<path class="stop" d="M224 70h44M224 84h44M224 112h44"/><rect class="lift-box" x="226" y="112" width="40" height="40"/><path class="pit" d="M222 70v84h48V84"/>';
      d += '<path class="sec-line" d="M270 84h40"/>' + dots(280, 80, 3, 12, -1.5);
      d += T(80, 134, '台仓（两层）', 'plan-label') + T(135, 62, '活动台板', 'plan-label') + T(298, 66, '舞台面', 'plan-label') + T(298, 100, '观众席面', 'plan-label') + T(246, 170, '乐池升降台', 'plan-label');
    }
    return `<div class="stage-diagram${compact ? ' compact' : ''}"><svg viewBox="0 0 320 180" role="img" aria-label="${label}（关系示意）">${d}</svg>${compact ? '' : '<div class="plan-legend"><small>关系示意 · 非施工图</small></div>'}</div>`;
  }
  U.diagram = diagram;

  /* ---------- 右侧：剧场构造目录 ---------- */
  function buildSquares() {
    ORDER.forEach((id, i) => {
      const n = NOTES[id], b = document.createElement('button'); b.type = 'button'; b.dataset.id = id;
      b.innerHTML = `<i>${String(i + 1).padStart(2, '0')}</i><b>${n.short}<small>${KIND[n.kind][0]}</small></b><span class="archive-dot"></span>`;
      b.setAttribute('aria-label', `打开知识卡：${n.zh}`);
      b.addEventListener('click', () => U.openNote(id)); squares.appendChild(b);
    });
  }
  U.unlock = function (id, silent) {
    U.got[id] = true;
    const b = squares.querySelector(`[data-id="${id}"]`); if (b) b.classList.add('got');
    if (!silent) { U.showCard(id); SL.audio.chime(); }
  };
  U.lockAll = function () { U.got = {}; squares.querySelectorAll('button').forEach((b) => b.classList.remove('got', 'active')); U.hideCard(); };

  /* ---------- 左侧：知识小卡 ---------- */
  U.showCard = function (id) {
    const v = ++cardVersion; card.classList.remove('on');
    squares.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.id === id));
    U.current = id;
    SL.tw.wait(0.7).then(() => {
      if (v !== cardVersion) return;
      const n = NOTES[id], k = KIND[n.kind], num = String(ORDER.indexOf(id) + 1).padStart(2, '0');
      card.className = 'note-card kind-' + n.kind;
      card.innerHTML = `<p class="note-kicker"><i></i>${num} · ${k[0]} · ${k[1]}</p><h2>${n.zh}</h2><p class="note-en" lang="en">${n.en}</p>${diagram(n.diagram, true)}<ul class="note-features">${n.mini.map((x) => `<li>${x}</li>`).join('')}</ul><p class="case-label"><span class="pill">${n.status[0]}</span>${n.status[1]}</p><button class="expand-note" type="button"><span>展开舞台知识<small lang="en">Open the full note</small></span><i aria-hidden="true">↗</i></button>`;
      card.querySelector('button').addEventListener('click', () => U.openNote(id));
      card.classList.add('on');
    });
  };
  U.hideCard = function () { cardVersion++; card.classList.remove('on'); squares.querySelectorAll('button').forEach((b) => b.classList.remove('active')); };

  /* ---------- 右侧册页：详细知识 ---------- */
  function heading(title) { const a = title.split('／'); return `${esc(a[0])}${a[1] ? `<span lang="en">${esc(a.slice(1).join('／'))}</span>` : ''}`; }
  function sourceHTML(ids) {
    return `<p class="source-help">文字已随网页保存；原始网页与 PDF 需要联网打开。</p><ul class="source-list">${ids.map((id) => { const s = DATA.sources[id]; return `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${id} · ${esc(s.label)}<span aria-hidden="true">↗</span></a><p>${esc(s.note)}</p></li>`; }).join('')}</ul>`;
  }
  function noteHTML(id) {
    const n = NOTES[id], k = KIND[n.kind], num = String(ORDER.indexOf(id) + 1).padStart(2, '0');
    let h = `<div class="lesson-hero"><p class="kind">${num} · ${k[0]} · ${k[1]}</p><h2>${n.zh}</h2><p class="h2en" lang="en">${n.en}</p>${diagram(n.diagram, false)}<p class="takeaway">${n.takeaway}</p></div>`;
    h += `<nav class="page-tabs" aria-label="知识卡内容"><a href="#lesson-start">知识</a><a href="#lesson-model">沙盘说明</a><a href="#lesson-sources">来源</a></nav><div id="lesson-start"></div>`;
    n.sections.forEach((s) => { h += `<section class="lesson-section"><h3>${heading(s.title)}</h3>${s.html}</section>`; });
    h += `<section class="lesson-section" id="lesson-model"><h3>沙盘保留了什么<span>Model notes</span></h3><p>${esc(n.model)}</p></section>`;
    h += `<section class="lesson-section" id="lesson-sources"><h3>资料与来源<span>Sources</span></h3>${sourceHTML(n.sources)}</section>`;
    return h;
  }
  U.openNote = function (id) { if (!NOTES[id]) return; openPanel(noteHTML(id), `${NOTES[id].zh} · 知识卡`); };
  U.openInfo = function () {
    const P = DATA.production;
    const h = `<div class="lesson-hero"><p class="kind">舞台实验室 · STAGELAB LEARN</p><h2>一个故事，一座剧场</h2><p class="h2en">The Nutcracker · Inside the Proscenium</p><p class="takeaway">跟着 Clara 的旅途，打开镜框背后的空间：上方、侧面、台下和乐池。</p></div>
      <section class="lesson-section"><h3>剧场构造目录<span>Theatre anatomy</span></h3><ul class="info-links">${ORDER.map((id, i) => `<li><button class="archive-inline" data-note="${id}">${String(i + 1).padStart(2, '0')}　${NOTES[id].zh}<small>${NOTES[id].where} · ${KIND[NOTES[id].kind][0]}</small></button></li>`).join('')}</ul></section>
      <section class="lesson-section"><h3>研究底本<span>The production</span></h3><p><strong>${esc(P.title)}</strong><br>${esc(P.company)}<br>${esc(P.venue)}<br>首演：${esc(P.premiere)}</p><p>${P.credits.map((c) => `${c[0]}／${c[1]}：${esc(c[2])}`).join('<br>')}</p></section>
      <section class="lesson-section"><h3>这块沙盘怎样使用资料<span>Evidence</span></h3><p><span class="ev fact">制作事实</span>来源直接记录的效果、设备或人员工作，例如雪袋、幕间扫雪、大裙子的准备。</p><p><span class="ev venue">场所资料</span>McCaw Hall 的技术资料。它说明剧场“有什么”，不等于这一版用过。</p><p><span class="ev teach">教学编排</span>镜头、简化小人、互动控制、压缩的时长，以及景物状态之间的叠化。</p><p><span class="ev open">待核查</span>圣诞树的生长机构、结尾飞行的机构、每件景的进出路线与原版 cue。沙盘不为这些内容编造机械。</p><p>剧情字幕是教学概括，不是原版台词；剧情框架依 Balanchine 版本。</p></section>
      <section class="lesson-section"><h3>配乐<span>Music</span></h3><p>每一段都有配乐，依据柴可夫斯基《胡桃夹子》（1892，公有领域）改编，在网页里实时合成。告别与回看用的是大双人舞的主题：一条从 G 往下走的 G 大调音阶；糖果国用的是糖果仙子之舞开头的钢片琴动机。其余段落按原作的体裁写成短小的改编段落（序曲、进行曲、圆舞曲等）。</p><p>如果有可在课堂播放的录音，可以放进 assets/music/ 并在 productions/music.js 里登记，网页会优先播放录音。</p></section>
      <section class="lesson-section"><h3>操作<span>Controls</span></h3><ul class="feature-list"><li>拖动旋转，滚轮缩放。<small>Drag to rotate; scroll to zoom.</small></li><li><kbd>空格</kbd>暂停／继续 <small>Space · Pause / resume</small></li><li><kbd>←</kbd><kbd>→</kbd>上一段／下一段 <small>Previous / next scene</small></li><li><kbd>R</kbd>重看本段；<kbd>1</kbd>—<kbd>9</kbd>跳段 <small>Replay; jump to a scene</small></li><li><kbd>Enter</kbd>触发当前引导句或完成当前互动 <small>Activate the current cue</small></li><li><kbd>A</kbd>当前知识卡；<kbd>Esc</kbd>关闭 <small>Current note; close</small></li><li><kbd>M</kbd>声音；<kbd>I</kbd>本页 <small>Sound; this page</small></li></ul><p>展开知识卡时暂停剧情；关闭后恢复之前的播放状态。</p></section>`;
    openPanel(h, '资料与操作');
  };
  function openPanel(html, label) {
    $('panel-body').innerHTML = html;
    $('panel-body').querySelectorAll('[data-note]').forEach((b) => b.addEventListener('click', () => U.openNote(b.dataset.note)));
    $('panel-body').querySelectorAll('.page-tabs a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const t = panel.querySelector(a.getAttribute('href')); if (t) panel.scrollTo({ top: t.offsetTop - 75, behavior: 'smooth' }); }));
    panel.setAttribute('aria-label', label);
    if (!U.panelOpen) { wasPlaying = !SL.clock.paused; lastFocus = document.activeElement; }
    U.panelOpen = true; body.classList.add('reading'); panel.classList.add('open'); panel.inert = false; panel.setAttribute('aria-hidden', 'false'); panel.scrollTop = 0;
    SL.story.pause(true); $('panel-close').focus();
  }
  U.closePanel = function () {
    if (!U.panelOpen) return; U.panelOpen = false; panel.classList.remove('open'); body.classList.remove('reading'); panel.inert = true; panel.setAttribute('aria-hidden', 'true');
    if (wasPlaying) SL.story.pause(false);
    if (lastFocus && lastFocus.isConnected) lastFocus.focus();
  };

  U.credit = function (text) { credit.textContent = text || ''; credit.classList.toggle('on', !!text); };

  /* ---------- 结尾：一张剧场地图 ---------- */
  U.final = function (on) {
    const el = $('final-map'); body.classList.toggle('ending', on);
    if (!on) { el.classList.remove('on'); return; }
    const groups = [['前方', 'Front', ['prosc', 'drapes', 'scenery']], ['上方', 'Above', ['fly']], ['侧面', 'Sides', ['wings', 'change']], ['下方', 'Below', ['below']]];
    el.innerHTML = `<p class="note-kicker"><i></i>带走这张地图 · REMEMBER</p><h2>同一座剧场，四个方向的支持空间</h2>${diagram('map', true)}<div class="final-groups">${groups.map(([zh, en, ids]) => `<div><b>${zh}<small lang="en">${en}</small></b>${ids.map((id) => `<button type="button" data-note="${id}">${NOTES[id].short}</button>`).join('')}</div>`).join('')}</div><footer><p>台口属于剧场，家宅属于演出。<small>The frame belongs to the building; the scenery belongs to the production.</small></p><p>剧场提供条件，景物与工作人员把条件组织成演出。<small>The theatre provides the conditions; scenery and crew turn them into a performance.</small></p></footer>`;
    el.querySelectorAll('[data-note]').forEach((b) => b.addEventListener('click', () => U.openNote(b.dataset.note)));
    el.classList.add('on');
  };

  /* ---------- 小工具面板：三次互动 ---------- */
  function toolOpen(html, cls) { tool.className = 'on ' + (cls || ''); tool.innerHTML = html; tool.setAttribute('aria-hidden', 'false'); body.classList.add('tooling'); }
  U.toolHide = function () { tool.className = ''; tool.setAttribute('aria-hidden', 'true'); if (body) body.classList.remove('tooling'); if (SL.cueFire && SL.cueFire._tool) SL.cueFire = null; };

  // 摇雪袋：左右拖动，摇满 need 次
  U.rocker = function (need) {
    need = need || 4;
    return new Promise((res) => {
      toolOpen(`<div class="tool-head"><b>雪袋</b><small lang="en">Snow bags</small></div><div class="rocker" role="slider" tabindex="0" aria-label="左右拖动摇晃雪袋" aria-valuemin="-1" aria-valuemax="1" aria-valuenow="0"><span class="track"></span><span class="knob"></span><em>◀</em><em>▶</em></div><div class="tool-count">${'<i></i>'.repeat(need)}</div>`, 'is-rocker');
      const R = tool.querySelector('.rocker'), knob = tool.querySelector('.knob'), dots = tool.querySelectorAll('.tool-count i');
      let dragging = false, done = false;
      const set = (v) => { v = Math.max(-1, Math.min(1, v)); W.snow.manual = v; knob.style.transform = `translateX(${(v * 50).toFixed(1)}%)`; R.setAttribute('aria-valuenow', v.toFixed(2)); };
      const fromX = (x) => { const r = R.getBoundingClientRect(); return ((x - r.left) / r.width - 0.5) * 2.4; };
      R.addEventListener('pointerdown', (e) => { dragging = true; R.setPointerCapture(e.pointerId); knob.classList.add('held'); set(fromX(e.clientX)); SL.audio.start(); });
      R.addEventListener('pointermove', (e) => { if (dragging) set(fromX(e.clientX)); });
      const up = () => { dragging = false; knob.classList.remove('held'); };
      R.addEventListener('pointerup', up); R.addEventListener('pointercancel', up);
      R.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); set(e.key === 'ArrowLeft' ? -1 : 1); } });
      W.snow.swing = 0; W.snow.lastSide = 0; W.snow.mode = 'manual';
      W.snow.onSwing = (k) => { dots.forEach((d, i) => d.classList.toggle('on', i < k)); if (k >= need && !done) finish(); };
      const finish = () => {
        if (done) return; done = true; W.snow.onSwing = null; if (SL.cueFire === fire) SL.cueFire = null;
        tool.classList.add('complete');
        SL.tw.wait(1.2).then(() => res());
      };
      // Enter 或自动演示：由程序替你摇几下
      const fire = () => { if (done) return; let s = 1; const step = () => { if (done) return; set(s); s = -s; SL.tw.wait(0.75).then(step); }; step(); };
      fire._tool = true; SL.cueFire = fire;
      if (SL.story.auto) SL.tw.wait(1).then(fire);
    });
  };

  // 前后对照：两个按钮切换状态，继续按钮结束
  U.compare = function (o) {
    return new Promise((res) => {
      toolOpen(`<div class="tool-head"><b>${o.title[0]}</b><small lang="en">${o.title[1]}</small></div><div class="seg"><button type="button" data-v="a">${o.a[0]}<small>${o.a[1]}</small></button><button type="button" data-v="b">${o.b[0]}<small>${o.b[1]}</small></button></div>${o.hint ? `<p class="tool-hint">${o.hint[0]}<small lang="en">${o.hint[1]}</small></p>` : ''}<button type="button" class="tool-go">继续<small lang="en">Continue</small></button>`, 'is-compare');
      let state = o.start || 'a', done = false;
      tool.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('on', b.dataset.v === state));
      const pick = (v) => { if (v === state || done) return; state = v; tool.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); (v === 'a' ? o.onA : o.onB)(); };
      tool.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => pick(b.dataset.v)));
      const fire = () => { if (done) return; done = true; if (SL.cueFire === fire) SL.cueFire = null; if (state !== o.end) (o.end === 'a' ? o.onA : o.onB)(); U.toolHide(); res(); };
      fire._tool = true; SL.cueFire = fire;
      tool.querySelector('.tool-go').addEventListener('click', fire);
      if (SL.story.auto) { const other = state === 'a' ? 'b' : 'a', first = state; SL.tw.wait(1.6).then(() => pick(other)); SL.tw.wait(4).then(() => pick(first)); SL.tw.wait(6.4).then(() => pick(other)); SL.tw.wait(8.6).then(fire); }
    });
  };

  // 四步条：只显示，不交互
  U.steps = function (list, i) {
    if (!tool.classList.contains('is-steps')) toolOpen(`<div class="tool-head"><b>幕间换景</b><small lang="en">Changeover</small></div><ol class="steps">${list.map((s, k) => `<li data-k="${k}"><i>${k + 1}</i>${s[0]}<small lang="en">${s[1]}</small></li>`).join('')}</ol>`, 'is-steps');
    tool.querySelectorAll('.steps li').forEach((li, k) => { li.classList.toggle('now', k === i); li.classList.toggle('past', k < i); });
  };

  /* ---------- 段落导航 ---------- */
  function buildRail() {
    const rail = $('rail');
    SL.story.scenes.forEach((s, i) => {
      const li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.innerHTML = `<i></i><b>${i + 1}　${s.zh}<em>${s.en}</em></b>`;
      b.setAttribute('aria-label', `第 ${i + 1} 段 ${s.zh} ${s.en}`);
      b.addEventListener('click', () => SL.story.go(i, true));
      li.appendChild(b); rail.appendChild(li);
    });
  }
  U.setScene = function (i) {
    $('rail').querySelectorAll('li').forEach((li, j) => { li.className = j < i ? 'past' : j === i ? 'now' : ''; });
    body.classList.toggle('pre', i === 0 && !SL.story.started);
  };
  U.setPaused = function (p) { body.classList.toggle('paused', p); };
  U.curtain = function (on) { $('curtain').classList.toggle('on', on); };

  /* ---------- 点小人 ---------- */
  U.personCue = function (id) {
    return new Promise((res) => {
      const fire = () => { if (!U.cuePerson || U.cuePerson.id !== id) return; U.cuePerson = null; ring.classList.remove('on'); if (SL.cueFire === fire) SL.cueFire = null; res(); };
      U.cuePerson = { id, fire }; SL.cueFire = fire; ring.classList.add('on');
      if (SL.story.auto) SL.tw.wait(2).then(fire);
    });
  };
  U.clearCue = function () { U.cuePerson = null; ring.classList.remove('on'); };

  /* ---------- 每帧 ---------- */
  let inkKey = '';
  U.frame = function () {
    const bg = W.env.bg, lum = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2];
    const key = (lum > 0.42 ? 'd' : 'l') + ((bg[0] * 255) | 0) + ',' + ((bg[1] * 255) | 0) + ',' + ((bg[2] * 255) | 0);
    if (key !== inkKey) {
      inkKey = key;
      body.dataset.ink = lum > 0.42 ? 'dark' : 'light';
      body.style.setProperty('--bg', `rgb(${(bg[0] * 255) | 0},${(bg[1] * 255) | 0},${(bg[2] * 255) | 0})`);
    }
    if (U.cuePerson) {
      const q = W.people[U.cuePerson.id], s = G.project(q.p[0], q.p[1] + q.lift + q.h * 0.5, q.p[2]);
      ring.style.transform = `translate(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px)`;
    }
  };

  /* ---------- 鼠标停在人物上：显示他是谁 ---------- */
  let hoverId = null;
  function hoverTag(e) {
    let best = null, bd = 28;
    if (e.pointerType !== 'touch') for (const id in W.people) {
      const q = W.people[id];
      if (q.op < 0.5) continue;
      const s = G.project(q.p[0], q.p[1] + q.lift + q.h * 0.5, q.p[2]), d = Math.hypot(e.clientX - s.x, (e.clientY - s.y) * 0.6);
      if (d < bd) { bd = d; best = id; }
    }
    if (best === hoverId) return;
    hoverId = best;
    if (!best) { SL.text.hide('hover'); return; }
    const q = W.people[best], n = q.spec.name;
    SL.text.show({ id: 'hover', mode: 'float', kind: 'tag', below: true, at: () => q.p, zh: n[0], en: n[1], size: 0.11 });
  }

  /* ---------- 初始化与输入 ---------- */
  U.init = function () {
    body = document.body; squares = $('squares'); ring = $('ring'); panel = $('panel'); credit = $('credit'); card = $('case-card'); tool = $('tool');
    panel.hidden = false; panel.inert = true; panel.setAttribute('aria-hidden', 'true');
    buildSquares(); buildRail();

    const cv = $('gl');
    let down = null;
    cv.addEventListener('pointerdown', (e) => { SL.audio.start(); down = { x: e.clientX, y: e.clientY, moved: 0 }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => {
      if (!down) { hoverTag(e); return; }
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      down.x = e.clientX; down.y = e.clientY; down.moved += Math.abs(dx) + Math.abs(dy);
      if (SL.story.index === 0 && !SL.story.started) return;
      W.cam.uyaw -= dx * 0.006;
      W.cam.upitch = Math.max(-0.3, Math.min(0.5, W.cam.upitch + dy * 0.004));
    });
    cv.addEventListener('pointerup', (e) => {
      if (down && down.moved < 6 && U.cuePerson) {
        const q = W.people[U.cuePerson.id], s = G.project(q.p[0], q.p[1] + q.h * 0.5, q.p[2]);
        if (Math.hypot(e.clientX - s.x, e.clientY - s.y) < 46) U.cuePerson.fire();
      }
      down = null;
    });
    cv.addEventListener('pointercancel', () => (down = null));
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (SL.story.index === 0 && !SL.story.started) return;
      W.cam.uzoom = Math.max(0.45, Math.min(1.7, W.cam.uzoom * Math.exp(e.deltaY * 0.0012)));
    }, { passive: false });

    $('transport').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; SL.audio.start(); act(b.dataset.act); });
    $('panel-close').addEventListener('click', U.closePanel);
    document.addEventListener('pointerdown', () => SL.audio.start(), { once: true });

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      SL.audio.start();
      const k = e.key;
      if (k === 'Escape') { U.closePanel(); return; }
      if (U.panelOpen) {
        if (k === 'Tab') {
          const list = Array.from(panel.querySelectorAll('button, a[href], summary, [tabindex="0"]')).filter((x) => x.offsetParent !== null);
          const first = list[0], last = list[list.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
        return;
      }
      if (k === ' ') { e.preventDefault(); act('pause'); }
      else if (k === 'ArrowRight') act('next');
      else if (k === 'ArrowLeft') act('prev');
      else if (k === 'r' || k === 'R') act('replay');
      else if (k === 'm' || k === 'M') act('sound');
      else if (k === 'i' || k === 'I') act('info');
      else if (k === 'a' || k === 'A') U.openNote(U.current || ORDER.filter((id) => U.got[id]).pop() || ORDER[0]);
      else if (k === 'Enter' && document.activeElement.tagName !== 'BUTTON') { if (SL.cueFire) SL.cueFire(); }
      else if (k >= '1' && k <= '9') { const i = +k - 1; if (i < SL.story.scenes.length) SL.story.go(i, true); }
    });
  };
  function act(a) {
    const S = SL.story;
    if (a === 'pause') S.pause(!SL.clock.paused);
    else if (a === 'prev') S.go(Math.max(0, S.index - 1), true);
    else if (a === 'next') S.go(Math.min(S.scenes.length - 1, S.index + 1), true);
    else if (a === 'replay') S.go(S.index, true);
    else if (a === 'sound') document.body.classList.toggle('muted', SL.audio.toggle());
    else if (a === 'info') U.openInfo();
  }
})();
