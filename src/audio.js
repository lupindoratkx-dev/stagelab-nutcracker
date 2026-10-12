/* StageLab · audio.js
 * 每一段剧情都有配乐，全部用 WebAudio 现场合成：弦乐、拨弦、钢片琴、长笛、铜管、竖琴、定音鼓，加一点音乐厅混响。
 * 曲目依据柴可夫斯基《胡桃夹子》（1892，公有领域）改编：
 *   · 告别、回看：大双人舞的主题——一条从 G 往下走的 G 大调音阶（原曲旋律本身就是音阶）
 *   · 糖果国：糖果仙子之舞的开头动机与同音反复的半音下行，钢片琴音色
 *   · 其余段落（序曲、家宴进行曲、长大的房间、战斗、雪之圆舞曲、幕间、姜饼妈妈）按原作的体裁与配器写成的短小改编段落
 * 想换成真实录音：把 mp3 放进 assets/music/，并在 productions/music.js 里登记，网页会优先播放录音。
 * 浏览器规定：声音必须在用户第一次点击 / 按键之后才能开始。
 */
(function () {
  'use strict';
  const SL = window.SL;
  const A = (SL.audio = { muted: false, wind: 0, drone: 0, cueName: null });
  let ctx, master, music, windGain, windFilter, droneGain, reverb, wet, noiseBuf, started = false;

  /* ---------- 记谱：音名 → MIDI；"G5/.5" 一个音，"G3+B3+D4/2" 一个和弦，"r/1" 休止 ---------- */
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const midi = (n) => { const m = /^([A-G])([#b]?)(-?\d)$/.exec(n); return 12 * (+m[3] + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function parse(src) {
    const out = []; let beat = 0;
    src.replace(/\|/g, ' ').split(/\s+/).filter(Boolean).forEach((tok) => {
      const [notes, d] = tok.split('/'), dur = parseFloat(d);
      if (notes !== 'r') out.push([beat, dur, notes.split('+').map(midi)]);
      beat += dur;
    });
    out.total = beat;
    return out;
  }
  // 分解和弦：每个和弦占 len 拍，按 pattern 的音序用八分音符铺开
  function arp(chords, len, pattern, step) {
    step = step || 0.5;
    return chords.map((c) => { const n = c.split('+'); let s = '', b = 0, i = 0; while (b < len - 1e-6) { s += `${n[pattern[i % pattern.length] % n.length]}/${step} `; b += step; i++; } return s; }).join(' ');
  }
  const ticks = (n, d) => Array(n).fill(`C4/${d}`).join(' ');

  /* ---------- 曲目 ---------- */
  const CUES = {
    overture: { bpm: 132, parts: [
      { inst: 'spicc', vol: 0.9, s: 'F5/.5 D5/.5 F5/.5 Bb5/.5 A5/.5 G5/.5 F5/1 | Eb5/.5 C5/.5 Eb5/.5 A5/.5 G5/.5 F5/.5 Eb5/1 | D5/.5 F5/.5 Bb5/.5 D6/.5 C6/.5 Bb5/.5 A5/.5 G5/.5 | F5/.5 A5/.5 C6/.5 Eb6/.5 D6/1 r/1' },
      { inst: 'flute', vol: 0.55, from: 1, s: 'r/2 D6/2 | r/2 C6/2 | r/2 F6/2 | r/2 Bb5/2' },
      { inst: 'pizz', vol: 1, s: 'Bb2/1 F3/1 Bb2/1 F3/1 | F2/1 C3/1 F2/1 C3/1 | Bb2/1 D3/1 G2/1 Eb3/1 | F2/1 C3/1 Bb2/2' },
      { inst: 'strings', vol: 0.45, s: 'Bb3+D4+F4/4 A3+C4+Eb4+F4/4 Bb3+D4+F4/2 G3+Bb3+Eb4/2 F3+A3+C4+Eb4/2 Bb3+D4+F4/2' },
    ] },
    march: { bpm: 116, parts: [
      { inst: 'brass', vol: 0.9, s: 'D4/.5 D4/.25 D4/.25 G4/1 r/.5 B4/.5 A4/.5 G4/.5 | D4/.5 D4/.25 D4/.25 A4/1 r/.5 C5/.5 B4/.5 A4/.5 | r/8' },
      { inst: 'spicc', vol: 0.95, s: 'r/8 | G5/.75 F#5/.25 G5/.75 A5/.25 B5/1 G5/1 | A5/.75 G5/.25 F#5/.75 E5/.25 D5/1 r/1' },
      { inst: 'pizz', vol: 1, s: 'G2/1 D3/1 G2/1 D3/1 | D2/1 A2/1 D2/1 A2/1 | G2/1 B2/1 C3/1 E3/1 | D3/1 F#2/1 G2/2' },
      { inst: 'strings', vol: 0.35, s: 'G3+B3+D4/4 D3+F#3+A3+C4/4 G3+B3+D4/2 C3+E3+G3/2 D3+F#3+A3/2 G3+B3+D4/2' },
      { inst: 'tick', vol: 0.5, s: ticks(16, 1) },
    ] },
    night: { bpm: 66, parts: [
      { inst: 'celesta', vol: 0.8, s: 'E5/1 G5/1 B5/1 G5/1 | D5/1 F#5/1 A5/1 F#5/1 | C5/1 E5/1 G5/1 E5/1 | B4/1 D#5/1 F#5/1 B5/1' },
      { inst: 'strings', vol: 0.4, s: 'E3+G3+B3/4 D3+F#3+A3/4 C3+E3+G3/4 B2+D#3+F#3/4' },
      { inst: 'pizz', vol: 0.7, s: 'E2/4 D2/4 C2/4 B1/4' },
    ] },
    grow: { bpm: 60, parts: [
      // 把双人舞那条下行音阶倒过来：树长高时，音阶一级级往上走
      { inst: 'strings', vol: 0.85, s: 'G4/2 A4/2 B4/2 C5/2 D5/2 E5/2 F#5/2 G5/2' },
      { inst: 'celesta', vol: 0.6, s: 'G5/2 A5/2 B5/2 C6/2 D6/2 E6/2 F#6/2 G6/2' },
      { inst: 'strings', vol: 0.5, s: 'G3+B3+D4/4 E3+G3+B3/4 C3+E3+G3+C4/4 D3+F#3+A3+C4/4' },
      { inst: 'bass', vol: 0.8, s: 'G2/4 E2/4 C2/4 D2/4' },
      { inst: 'timp', vol: 0.8, s: 'r/12 D2/.25 D2/.25 D2/.25 D2/.25 D2/.25 D2/.25 D2/.25 D2/.25 D2/2' },
    ] },
    battle: { bpm: 152, parts: [
      { inst: 'spicc', vol: 0.8, s: 'D3/.5 D3/.5 F3/.5 D3/.5 A3/.5 D3/.5 F3/.5 D3/.5 | C#3/.5 E3/.5 G3/.5 E3/.5 A3/.5 G3/.5 E3/.5 C#3/.5' },
      { inst: 'brass', vol: 0.7, s: 'D4+F4+A4/.5 r/1.5 D4+F4+A4/.5 r/1.5 | C#4+E4+A4/.5 r/1.5 C#4+E4+G4+A4/.5 r/1.5' },
      { inst: 'brass', vol: 0.85, from: 1, s: 'A4/1 F4/.5 A4/.5 D5/1.5 C#5/.5 | Bb4/1 G4/.5 Bb4/.5 A4/2' },
      { inst: 'timp', vol: 1, s: 'D2/1 r/1 A1/1 r/1 | D2/1 r/1 A1/.5 A1/.5 A1/1' },
    ] },
    snow: { bpm: 156, parts: [
      { inst: 'flute', vol: 0.9, s: 'B5/3 | A5/1.5 G5/1.5 | F#5/3 | E5/3 | G5/1 F#5/1 E5/1 | D#5/1.5 E5/1.5 | F#5/3 | B4/3' },
      { inst: 'harp', vol: 0.7, s: arp(['E3+B3+E4+G4', 'A2+E3+A3+C4', 'B2+F#3+A3+D#4', 'E3+B3+E4+G4', 'C3+G3+C4+E4', 'A2+E3+A3+C4', 'B2+F#3+A3+D#4', 'E3+B3+E4+G4'], 3, [0, 1, 2, 3, 2, 1]) },
      { inst: 'pizz', vol: 0.8, s: 'E2/3 A2/3 B2/3 E2/3 C3/3 A2/3 B2/3 E2/3' },
      { inst: 'choir', vol: 0.5, s: 'E4+G4+B4/6 D#4+F#4+A4/6 C4+E4+G4/6 D#4+F#4+B4/6' },
    ] },
    still: { bpm: 54, parts: [
      { inst: 'celesta', vol: 0.55, s: 'B5/2 G5/2 | A5/2 F#5/2 | G5/2 E5/2 | F#5/4' },
      { inst: 'strings', vol: 0.35, s: 'E3+G3+B3/4 D3+F#3+A3/4 C3+E3+G3/4 B2+D#3+F#3/4' },
    ] },
    sugar: { bpm: 72, parts: [
      // 钢片琴：糖果仙子之舞的开头动机（E 小调）与同音反复的半音下行
      { inst: 'celesta', vol: 1, s: 'G5/.5 E5/.5 G5/.5 F#5/.5 | D#5/.5 E5/.5 r/1 | G5/.5 E5/.5 G5/.5 F#5/.5 | D#5/.5 E5/.5 r/1 | E6/.25 E6/.25 E6/.25 r/.25 D#6/.25 D#6/.25 D#6/.25 r/.25 | D6/.25 D6/.25 D6/.25 r/.25 C#6/.25 C#6/.25 C#6/.25 r/.25 | B5/.5 G5/.5 A#5/.5 F#5/.5 | B5/1 r/1' },
      { inst: 'pizz', vol: 0.9, s: 'E3/.5 B2/.5 E3/.5 B2/.5 | E3/.5 B2/.5 E3/.5 B2/.5 | E3/.5 B2/.5 E3/.5 B2/.5 | E3/.5 B2/.5 E3/.5 B2/.5 | A2/.5 E3/.5 A2/.5 E3/.5 | B2/.5 F#3/.5 B2/.5 F#3/.5 | E3/.5 B2/.5 E3/.5 B2/.5 | B2/.5 F#3/.5 B2/1' },
      // 低音单簧管式的快速下行
      { inst: 'reed', vol: 0.8, every: 2, s: 'r/12 B3/.25 A3/.25 G3/.25 F#3/.25 E3/.25 D#3/.25 C#3/.25 B2/.25 B2/2' },
      { inst: 'strings', vol: 0.25, s: 'E3+G3+B3/8 A2+C3+E3/2 B2+D#3+F#3/2 E3+G3+B3/2 B2+D#3+F#3/2' },
    ] },
    ginger: { bpm: 138, parts: [
      { inst: 'flute', vol: 0.8, s: 'C6/.5 E6/.5 G6/.5 E6/.5 C6/1 G5/1 | F5/.5 A5/.5 C6/.5 A5/.5 F5/1 r/1 | G5/.5 F5/.5 E5/.5 D5/.5 C5/.5 D5/.5 E5/.5 F5/.5 | G5/1 B4/1 C5/2' },
      { inst: 'spicc', vol: 0.6, s: 'C5/.5 E5/.5 G5/.5 E5/.5 C5/1 G4/1 | F4/.5 A4/.5 C5/.5 A4/.5 F4/1 r/1 | G4/.5 F4/.5 E4/.5 D4/.5 C4/.5 D4/.5 E4/.5 F4/.5 | G4/1 B3/1 C4/2' },
      { inst: 'pizz', vol: 0.9, s: 'C3/1 G3+C4+E4/1 C3/1 G3+C4+E4/1 | F2/1 A3+C4+F4/1 F2/1 A3+C4+F4/1 | G2/1 B3+D4+F4/1 G2/1 B3+D4+F4/1 | C3/1 G3+C4+E4/1 C3/2' },
      { inst: 'tick', vol: 0.45, s: 'r/1 C4/1 r/1 C4/1 r/1 C4/1 r/1 C4/1 r/1 C4/1 r/1 C4/1 r/1 C4/1 r/2' },
    ] },
    finale: { bpm: 56, parts: [
      // 大双人舞：从 G 往下走的 G 大调音阶
      { inst: 'strings', vol: 1, s: 'G5/3 F#5/1 | E5/2 D5/2 | C5/3 B4/1 | A4/2 G4/2' },
      { inst: 'strings', vol: 0.7, s: 'G4/3 F#4/1 | E4/2 D4/2 | C4/3 B3/1 | A3/2 G3/2' },
      { inst: 'harp', vol: 0.65, s: arp(['G2+D3+G3+B3', 'F#2+D3+A3+D4', 'E2+B2+E3+G3', 'D2+B2+F#3+B3', 'C2+G2+C3+E3', 'B1+G2+D3+G3', 'A1+E2+C3+G3', 'D2+A2+C3+F#3'], 2, [0, 1, 2, 3], 0.5) },
      { inst: 'bass', vol: 0.8, s: 'G2/2 F#2/2 E2/2 D2/2 C2/2 B1/2 A1/2 D2/2' },
      { inst: 'brass', vol: 0.45, s: 'r/12 D4+F#4+A4+C5/4' },
      { inst: 'timp', vol: 0.7, s: 'r/14 D2/.25 D2/.25 D2/.25 D2/.25 D2/.25 D2/.25 D2/.25 D2/.25' },
    ] },
    review: { bpm: 58, parts: [
      { inst: 'celesta', vol: 0.75, s: 'G5/2 F#5/2 E5/2 D5/2 C5/2 B4/2 A4/2 G4/2' },
      { inst: 'harp', vol: 0.5, s: arp(['G2+D3+G3+B3', 'F#2+D3+A3+D4', 'E2+B2+E3+G3', 'D2+B2+F#3+B3', 'C2+G2+C3+E3', 'B1+G2+D3+G3', 'A1+E2+C3+G3', 'D2+A2+C3+F#3'], 2, [0, 1, 2, 3], 0.5) },
      { inst: 'strings', vol: 0.3, s: 'G3+B3+D4/4 E3+G3+B3/4 C3+E3+G3/4 D3+F#3+A3+C4/4' },
    ] },
  };
  for (const k in CUES) {
    const c = CUES[k];
    c.parts.forEach((p) => (p.notes = parse(p.s)));
    c.beats = Math.max(...c.parts.map((p) => p.notes.total));
  }
  A.CUES = CUES;

  /* ---------- 乐器 ---------- */
  function env(g, t, a, peak, hold, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    if (hold > a) g.gain.setValueAtTime(peak, t + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(hold, a) + rel);
    return t + Math.max(hold, a) + rel + 0.05;
  }
  function osc(type, f, t, end, dest, detune) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; if (detune) o.detune.value = detune;
    o.connect(dest); o.start(t); o.stop(end); return o;
  }
  function lp(f, q, dest) { const b = ctx.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = f; b.Q.value = q || 0.7; b.connect(dest); return b; }
  function voice(inst, t, dur, m, vel, bus) {
    const f = hz(m), g = ctx.createGain(); g.connect(bus);
    let end;
    switch (inst) {
      case 'strings': { const fl = lp(1700, 0.6, g); end = env(g, t, 0.22, 0.05 * vel, dur, 0.45); [-7, 0, 7].forEach((d) => osc('sawtooth', f, t, end, fl, d)); break; }
      case 'spicc': { const fl = lp(2600, 0.8, g); end = env(g, t, 0.01, 0.075 * vel, 0.02, Math.min(0.24, dur * 0.8)); osc('sawtooth', f, t, end, fl); osc('sawtooth', f, t, end, fl, 5); break; }
      case 'pizz': { const fl = lp(1900, 1, g); end = env(g, t, 0.004, 0.22 * vel, 0.01, 0.42); osc('triangle', f, t, end, fl); osc('sine', f * 2, t, end, fl); break; }
      case 'celesta': {
        end = env(g, t, 0.003, 0.16 * vel, 0.01, 1.5);
        osc('sine', f, t, end, g);
        const g2 = ctx.createGain(); g2.gain.value = 0.22; g2.connect(g); osc('sine', f * 4.02, t, t + 0.5, g2);
        const g3 = ctx.createGain(); g3.gain.value = 0.12; g3.connect(g); osc('sine', f * 2, t, end, g3);
        break;
      }
      case 'flute': {
        end = env(g, t, 0.07, 0.11 * vel, dur, 0.16);
        const o = osc('sine', f, t, end, g), o2 = osc('triangle', f, t, end, lp(1800, 0.7, g));
        const v = ctx.createOscillator(), vg = ctx.createGain(); v.frequency.value = 5.2; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.005, t + 0.25);
        v.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency); v.start(t); v.stop(end);
        break;
      }
      case 'brass': {
        const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 1.2; fl.connect(g);
        fl.frequency.setValueAtTime(500, t); fl.frequency.linearRampToValueAtTime(2600, t + 0.06); fl.frequency.linearRampToValueAtTime(1500, t + 0.25);
        end = env(g, t, 0.025, 0.06 * vel, dur * 0.9, 0.16); osc('sawtooth', f, t, end, fl); osc('sawtooth', f, t, end, fl, 6);
        break;
      }
      case 'harp': { end = env(g, t, 0.002, 0.13 * vel, 0.01, 1.3); osc('triangle', f, t, end, lp(2400, 0.6, g)); osc('sine', f, t, end, g); break; }
      case 'bass': { const fl = lp(520, 0.7, g); end = env(g, t, 0.05, 0.11 * vel, dur, 0.3); osc('sawtooth', f, t, end, fl); osc('sine', f / 2, t, end, g); break; }
      case 'reed': { const fl = lp(1100, 0.9, g); end = env(g, t, 0.015, 0.07 * vel, Math.max(0.05, dur * 0.8), 0.08); osc('square', f, t, end, fl); break; }
      case 'choir': {
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 850; bp.Q.value = 0.8; bp.connect(g);
        end = env(g, t, 0.7, 0.07 * vel, dur, 0.9); [-6, 5].forEach((d) => osc('sawtooth', f, t, end, bp, d)); osc('sine', f, t, end, g);
        break;
      }
      case 'timp': {
        end = env(g, t, 0.004, 0.32 * vel, 0.01, 0.9);
        const o = osc('sine', f, t, end, g); o.frequency.setValueAtTime(f * 1.06, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
        const n = ctx.createBufferSource(); n.buffer = noiseBuf; const ng = ctx.createGain(); ng.gain.setValueAtTime(0.12 * vel, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        n.connect(lp(380, 0.7, ng)); ng.connect(g); n.start(t); n.stop(t + 0.15);
        break;
      }
      case 'tick': {
        const n = ctx.createBufferSource(); n.buffer = noiseBuf; const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4200;
        end = env(g, t, 0.002, 0.08 * vel, 0.005, 0.07); n.connect(hp); hp.connect(g); n.start(t); n.stop(end);
        break;
      }
    }
    setTimeout(() => g.disconnect(), Math.max(0, (end - ctx.currentTime + 0.2) * 1000));
  }

  /* ---------- 播放：整段循环提前排好，换曲时交叉淡入淡出 ---------- */
  let play = null, timer = 0;
  function schedule() {
    if (!play || !ctx) return;
    const c = CUES[play.name], spb = 60 / c.bpm, loopDur = c.beats * spb;
    while (play.next < ctx.currentTime + 1.2) {
      const t0 = play.next, k = play.loop;
      for (const p of c.parts) {
        if (p.from && k < p.from) continue;
        if (p.every && k % p.every !== p.every - 1) continue;
        for (const [b, d, ms] of p.notes) for (const m of ms) voice(p.inst, t0 + b * spb, d * spb, m, p.vol, play.bus);
      }
      play.next += loopDur; play.loop++;
    }
  }
  A.cue = function (name, fade) {
    if (A.cueName === name) return;
    A.cueName = name;
    if (!ctx) return;
    fade = fade == null ? 1.6 : fade;
    const t = ctx.currentTime;
    if (play) { const old = play.bus; old.gain.cancelScheduledValues(t); old.gain.setTargetAtTime(0, t, fade / 3); setTimeout(() => old.disconnect(), (fade + 1.5) * 1000); play = null; }
    fileFade(name, fade);
    if (!name || files[name]) return;
    const bus = ctx.createGain(); bus.gain.setValueAtTime(0, t); bus.gain.linearRampToValueAtTime(1, t + Math.max(0.3, fade * 0.6)); bus.connect(music);
    play = { name, bus, next: t + 0.12, loop: 0 };
    schedule();
  };

  /* ---------- 可选：用真实录音替换（assets/music/<名字>.mp3） ---------- */
  const files = {}, fileEls = {};
  function probeFiles() {
    const list = SL.MUSIC_FILES || {};
    Object.keys(list).forEach((name) => {
      if (!CUES[name]) return;
      const el = new Audio(); el.preload = 'auto'; el.loop = true; el.volume = 0;
      el.addEventListener('canplaythrough', () => { files[name] = true; if (A.cueName === name) { const n = A.cueName; A.cueName = null; A.cue(n, 1); } }, { once: true });
      el.addEventListener('error', () => { delete fileEls[name]; }, { once: true });
      el.src = list[name]; fileEls[name] = el;
    });
  }
  let fadeTimer = 0;
  function fileFade(name, fade) {
    clearInterval(fadeTimer);
    const steps = 20, dt = (fade * 1000) / steps; let i = 0;
    Object.keys(files).forEach((n) => { if (n === name && fileEls[n].paused) { fileEls[n].currentTime = 0; fileEls[n].play().catch(() => {}); } });
    fadeTimer = setInterval(() => {
      i++;
      Object.keys(files).forEach((n) => {
        const el = fileEls[n], target = n === name && !A.muted ? (A.ducked ? 0.25 : 0.85) : 0;
        el.volume = Math.max(0, Math.min(1, el.volume + (target - el.volume) * 0.25));
        if (target === 0 && el.volume < 0.01 && !el.paused) el.pause();
      });
      if (i >= steps * 3) clearInterval(fadeTimer);
    }, dt);
  }

  /* ---------- 启动、环境声、提示音 ---------- */
  A.start = function () {
    if (started) { if (ctx && ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC(); started = true;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.01; comp.release.value = 0.25; comp.connect(ctx.destination);
      master = ctx.createGain(); master.gain.value = A.muted ? 0 : 0.9; master.connect(comp);
      // 混响：用衰减噪声生成一段“音乐厅”冲激响应
      const rl = Math.floor(ctx.sampleRate * 2.4), ir = ctx.createBuffer(2, rl, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < rl; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rl, 2.6); }
      reverb = ctx.createConvolver(); reverb.buffer = ir; wet = ctx.createGain(); wet.gain.value = 0.3; reverb.connect(wet); wet.connect(master);
      music = ctx.createGain(); music.gain.value = 0.62; music.connect(master); music.connect(reverb);

      const len = ctx.sampleRate * 3; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const nd = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;
      const wb = ctx.createBuffer(1, len, ctx.sampleRate), d = wb.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }   // 褐噪声：风
      const src = ctx.createBufferSource(); src.buffer = wb; src.loop = true;
      windFilter = ctx.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 420; windFilter.Q.value = 0.5;
      windGain = ctx.createGain(); windGain.gain.value = 0;
      src.connect(windFilter); windFilter.connect(windGain); windGain.connect(master); src.start();
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
      const lfoG = ctx.createGain(); lfoG.gain.value = 190; lfo.connect(lfoG); lfoG.connect(windFilter.frequency); lfo.start();
      droneGain = ctx.createGain(); droneGain.gain.value = 0; droneGain.connect(master);
      [55, 82.6, 110.4].forEach((f, i) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = [0.5, 0.28, 0.14][i]; o.connect(g); g.connect(droneGain); o.start(); });
      apply(1.5);
      timer = setInterval(() => { schedule(); duck(); }, 90);
      probeFiles();
      if (A.cueName) { const n = A.cueName; A.cueName = null; A.cue(n, 1); }
    } catch (e) { /* 没有声音也不影响演出 */ }
  };
  // 打开知识卡（剧情暂停）时，音乐压低
  function duck() {
    const want = !!(SL.clock && SL.clock.paused);
    if (want === A.ducked) return;
    A.ducked = want;
    music.gain.setTargetAtTime(want ? 0.16 : 0.62, ctx.currentTime, 0.4);
    if (Object.keys(files).length) fileFade(A.cueName, 1);
  }
  function apply(sec) {
    if (!ctx) return;
    const t = ctx.currentTime;
    windGain.gain.cancelScheduledValues(t); windGain.gain.setTargetAtTime(A.wind * 0.5, t, sec / 3);
    droneGain.gain.cancelScheduledValues(t); droneGain.gain.setTargetAtTime(A.drone * 0.22, t, sec / 3);
  }
  A.set = function (wind, drone, sec) { A.wind = wind; A.drone = drone; apply(sec || 3); };
  A.chime = function () {
    if (!ctx || A.muted) return;
    const t = ctx.currentTime;
    [660, 990].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * 0.09); g.gain.linearRampToValueAtTime(0.05, t + i * 0.09 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 1.1);
      o.connect(g); g.connect(master); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 1.2);
    });
  };
  // 钟声：午夜
  A.bell = function () {
    if (!ctx || A.muted) return;
    const t = ctx.currentTime;
    [220, 440, 553].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime([0.09, 0.05, 0.03][i], t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      o.connect(g); g.connect(master); g.connect(reverb); o.start(t); o.stop(t + 2.7);
    });
  };
  A.musicBox = function () {};    // 旧接口，保留为空
  A.toggle = function () {
    A.muted = !A.muted;
    if (master) master.gain.setTargetAtTime(A.muted ? 0 : 0.9, ctx.currentTime, 0.08);
    if (Object.keys(files).length) fileFade(A.cueName, 0.3);
    return A.muted;
  };
})();
