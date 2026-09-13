const UI = (() => {
  let canvas = null;
  let ctx = null;
  let W = 0;
  let H = 0;
  let frame = 0;

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

  function init() {
    canvas = $('#game');
    ctx = canvas.getContext('2d');
    W = CONFIG.canvas.w;
    H = CONFIG.canvas.h;
    if (!ctx.roundRect) {
      ctx.roundRect = function(x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      };
    }
  }

  function drawSky(dayIdx) {
    const g = ctx.createLinearGradient(0, 0, 0, 220);
    if (dayIdx === 2) {
      g.addColorStop(0, '#ffcf8a');
      g.addColorStop(0.45, '#ffd9a8');
      g.addColorStop(1, '#ffecc8');
    } else if (dayIdx === 1) {
      g.addColorStop(0, '#b8e1ff');
      g.addColorStop(0.5, '#d6ecff');
      g.addColorStop(1, '#fff4e0');
    } else {
      g.addColorStop(0, '#a8d8f0');
      g.addColorStop(0.5, '#c9e8ff');
      g.addColorStop(1, '#fff6e0');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 220);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 0; i < 3; i++) {
      const cx = 80 + i * 110 + Math.sin(frame * 0.008 + i) * 6;
      const cy = 56 + (i % 2) * 18;
      ctx.beginPath(); ctx.ellipse(cx, cy, 28, 14, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 18, cy - 4, 20, 12, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx - 14, cy + 2, 16, 10, 0, 0, 7); ctx.fill();
    }
    if (dayIdx === 2) {
      ctx.fillStyle = '#ff9a3a';
      ctx.beginPath(); ctx.arc(W - 64, 62, 22, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      ctx.beginPath(); ctx.arc(W - 58, 56, 7, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = '#ffe08a';
      ctx.beginPath(); ctx.arc(W - 70, 62, 18, 0, 7); ctx.fill();
    }
  }

  function drawHouses(y) {
    const cols = ['#f0d8b8', '#e8c9a6', '#d9b8c4', '#c9ddd0', '#d6c8e8'];
    for (let i = 0; i < 5; i++) {
      const x = 24 + i * 84;
      const col = cols[i % cols.length];
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.roundRect(x, y - 52, 58, 42, 6);
      ctx.fill();
      ctx.fillStyle = '#8a6a4a';
      ctx.beginPath(); ctx.moveTo(x - 4, y - 52); ctx.lineTo(x + 29, y - 72); ctx.lineTo(x + 62, y - 52); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.fillRect(x + 10, y - 38, 12, 12);
      ctx.fillRect(x + 32, y - 38, 12, 12);
      ctx.fillStyle = '#6a4a33';
      ctx.fillRect(x + 22, y - 18, 14, 18);
    }
  }

  function drawGround() {
    ctx.fillStyle = '#9ec48a';
    ctx.fillRect(0, 218, W, 86);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    for (let i = 0; i < 40; i++) {
      const x = (i * 37 + frame * 0.3) % W;
      ctx.fillRect(x, 226 + (i % 3) * 12, 10, 2);
    }
    ctx.fillStyle = '#d9c8b6';
    ctx.fillRect(0, 304, W, 56);
    ctx.fillStyle = '#c9b8a6';
    for (let x = 0; x < W; x += 28) ctx.fillRect(x, 314, 14, 3);
    ctx.fillStyle = 'rgba(42,36,31,.06)';
    ctx.fillRect(0, 304, W, 6);
  }

  function drawNina(x, y, s, mood) {
    const wag = Math.sin(frame * 0.28) * (mood === 'bark' ? 0.9 : mood === 'tense' ? 0.5 : 0.35);
    const bob = Math.sin(frame * 0.18) * 1.2;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(s, s);
    ctx.shadowColor = 'rgba(42,36,31,.18)';
    ctx.shadowBlur = 10; ctx.shadowOffsetY = 6;
    ctx.fillStyle = 'rgba(42,36,31,.12)';
    ctx.beginPath(); ctx.ellipse(0, 18, 28, 7, 0, 0, 7); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    const base = '#f0c98a';
    const dark = '#d9a85a';
    const light = '#fff4d6';
    ctx.fillStyle = base;
    ctx.beginPath(); ctx.ellipse(0, -2, 22, 14, 0, 0, 7); ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.ellipse(0, 4, 14, 7, 0, 0, 7); ctx.fill();
    ctx.fillStyle = base;
    ctx.beginPath(); ctx.ellipse(-10, -10, 10, 14, -0.3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10, -10, 10, 14, 0.3, 0, 7); ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.ellipse(-10, -10, 6, 9, -0.3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10, -10, 6, 9, 0.3, 0, 7); ctx.fill();
    ctx.fillStyle = base;
    ctx.beginPath(); ctx.ellipse(0, -14, 16, 15, 0, 0, 7); ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.ellipse(0, -8, 9, 7, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a241f';
    ctx.beginPath(); ctx.ellipse(-6, -16, 3.2, 4, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6, -16, 3.2, 4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-5, -18, 1.4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -18, 1.4, 0, 7); ctx.fill();
    if (mood === 'bark') {
      ctx.fillStyle = '#2a241f';
      ctx.beginPath(); ctx.ellipse(-6, -16, 4, 4.5, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(6, -16, 4, 4.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#e5484d';
      ctx.beginPath(); ctx.ellipse(0, -7, 5, 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-1, -6, 1.2, 0, 7); ctx.fill();
    } else if (mood === 'sniff') {
      ctx.fillStyle = '#2a241f';
      ctx.beginPath(); ctx.arc(-6, -15, 2.2, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(6, -15, 2.2, 0, 7); ctx.fill();
      ctx.fillStyle = '#e8a0a0';
      ctx.beginPath(); ctx.ellipse(0, -5, 3, 2, 0, 0, 7); ctx.fill();
    } else if (mood === 'tense') {
      ctx.strokeStyle = '#2a241f'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(-4, -13); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, -13); ctx.lineTo(8, -12); ctx.stroke();
    }
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath(); ctx.ellipse(0, -11, 2.6, 1.8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.arc(0.6, -11.6, 0.7, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, -7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.quadraticCurveTo(-2, -6, -3, -5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.quadraticCurveTo(2, -6, 3, -5); ctx.stroke();
    ctx.fillStyle = '#ff8a8a';
    if (mood === 'bark' || mood === 'happy') {
      ctx.beginPath(); ctx.ellipse(0, -2, 3.2, 4, 0, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = base; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath();
    if (mood === 'sulk') {
      ctx.moveTo(-14, 6); ctx.quadraticCurveTo(-22, 10, -20, 18);
    } else {
      ctx.moveTo(-16, 4); ctx.quadraticCurveTo(-26, 2 + wag * 6, -24, -6 + wag * 4);
    }
    ctx.stroke();
    ctx.fillStyle = base;
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(-8, 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(8, 18); ctx.stroke();
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath(); ctx.ellipse(-8, 18, 4, 2, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8, 18, 4, 2, 0, 0, 7); ctx.fill();
    if (mood === 'sulk') {
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.font = '700 7px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NO.', 0, -28);
    }
    ctx.restore();
  }

  function drawOtherDog(x, y, s, coat, mood) {
    const wag = Math.sin(frame * 0.2 + x * 0.01) * 0.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(42,36,31,.12)';
    ctx.beginPath(); ctx.ellipse(0, 16, 22, 6, 0, 0, 7); ctx.fill();
    const isDark = coat === '#4a3a2e' || coat === '#5b6b82';
    ctx.fillStyle = coat;
    ctx.beginPath(); ctx.ellipse(0, 0, 18, 11, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -12, 13, 12, 0, 0, 7); ctx.fill();
    ctx.fillStyle = isDark ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.ellipse(-3, -4, 8, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = coat;
    ctx.beginPath(); ctx.ellipse(-9, -10, 7, 11, -0.35, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(9, -10, 7, 11, 0.35, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a241f';
    ctx.beginPath(); ctx.arc(-5, -13, 2.4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(5, -13, 2.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-4.2, -14.5, 1, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(5.8, -14.5, 1, 0, 7); ctx.fill();
    if (mood === 'aggressive') {
      ctx.strokeStyle = '#e5484d'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-8, -9); ctx.lineTo(-4, -10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, -10); ctx.lineTo(8, -9); ctx.stroke();
      ctx.strokeStyle = '#e5484d'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(10 + i * 4, -6); ctx.lineTo(12 + i * 4, -2); ctx.stroke(); }
    } else if (mood === 'soft') {
      ctx.fillStyle = '#2a241f';
      ctx.beginPath(); ctx.arc(-5, -13, 1.8, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(5, -13, 1.8, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath(); ctx.ellipse(0, -8, 2, 1.4, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = coat; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-14, 6); ctx.quadraticCurveTo(-22, 4 + wag * 4, -20, -2); ctx.stroke();
    ctx.restore();
  }

  function drawScene(state) {
    const dayIdx = state.dayIdx;
    drawSky(dayIdx);
    drawHouses(218);
    drawGround();
    const r = state.run;
    if (r && r.sulk) {
      ctx.fillStyle = 'rgba(120,90,255,.08)';
      ctx.fillRect(0, 0, W, H);
    }
    if (r && r.poison) {
      ctx.fillStyle = 'rgba(233,138,46,.07)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(233,138,46,.85)';
      ctx.font = '700 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('treat buzz — next is harder', W / 2, 18);
    }
    const enc = state.run ? Game.curEnc(state) : null;
    const phase = state.phase;
    let ninaMood = 'calm';
    if (r && r.sulk) ninaMood = 'sulk';
    else if (r && r.stress > 70) ninaMood = 'tense';
    else if (phase === 'park' && r && r.park && r.park.meet) ninaMood = 'tense';
    else if (phase === 'encounter' && enc && enc.kind === 'smell') ninaMood = 'sniff';

    drawNina(118, 318, 1.15, ninaMood);

    if (phase === 'encounter' && enc && !enc.gate) {
      if (enc.kind === 'dog') {
        const a = Game.archById(enc.archId);
        const mood = a.vibe >= 2 ? 'aggressive' : a.vibe === 1 ? 'tense' : 'soft';
        drawOtherDog(312, 318, 1.05, a.coat, mood);
        ctx.strokeStyle = 'rgba(42,36,31,.25)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(150, 314); ctx.quadraticCurveTo(215, 304, 280, 314); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(42,36,31,.18)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(215, 302, 10, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e5484d'; ctx.font = '700 12px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('—', 215, 306);
      } else if (enc.kind === 'fence') {
        ctx.fillStyle = '#8a6a4a';
        for (let x = 250; x < 390; x += 16) ctx.fillRect(x, 250, 7, 72);
        ctx.fillStyle = '#6a4a33';
        ctx.fillRect(250, 262, 140, 7); ctx.fillRect(250, 298, 140, 7);
        drawOtherDog(320, 314, 1.0, '#4a3a2e', 'aggressive');
        ctx.fillStyle = '#fff'; ctx.font = '700 9px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('WOOF', 320, 246);
      } else if (enc.kind === 'smell') {
        ctx.strokeStyle = 'rgba(26,157,92,.7)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const bx = 300 + i * 14;
          ctx.beginPath();
          ctx.moveTo(bx, 322);
          ctx.quadraticCurveTo(bx - 6, 310, bx, 298 - Math.sin(frame * 0.15 + i) * 2);
          ctx.stroke();
        }
        ctx.fillStyle = '#6a4a33';
        ctx.beginPath(); ctx.ellipse(314, 324, 12, 5, 0.2, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(26,157,92,.18)';
        ctx.beginPath(); ctx.ellipse(314, 324, 18, 8, 0.2, 0, 7); ctx.fill();
      } else if (enc.kind === 'distraction') {
        if (enc.sub === 'bike') {
          ctx.strokeStyle = '#2a241f'; ctx.lineWidth = 2.6;
          ctx.beginPath(); ctx.arc(300, 322, 10, 0, 7); ctx.stroke();
          ctx.beginPath(); ctx.arc(328, 322, 10, 0, 7); ctx.stroke();
          ctx.strokeStyle = '#e05c5c'; ctx.lineWidth = 2.6;
          ctx.beginPath(); ctx.moveTo(300, 322); ctx.lineTo(314, 302); ctx.lineTo(328, 322); ctx.stroke();
          ctx.fillStyle = '#f0d8b8';
          ctx.beginPath(); ctx.arc(314, 294, 6, 0, 7); ctx.fill();
        } else {
          const hop = Math.abs(Math.sin(frame * 0.25)) * -8;
          ctx.fillStyle = '#c98f4a';
          ctx.beginPath(); ctx.ellipse(314, 318 + hop, 11, 8, 0, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.arc(322, 312 + hop, 5.5, 0, 7); ctx.fill();
          ctx.strokeStyle = '#c98f4a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(304, 318 + hop); ctx.quadraticCurveTo(292, 302 + hop, 300, 296 + hop); ctx.stroke();
        }
      }
    } else if (phase === 'gate') {
      ctx.fillStyle = '#7a5c3e';
      for (let x = 220; x < 400; x += 14) ctx.fillRect(x, 248, 7, 72);
      ctx.fillStyle = '#5a422c';
      ctx.fillRect(220, 260, 180, 7); ctx.fillRect(220, 296, 180, 7);
      ctx.fillStyle = '#2a241f';
      ctx.beginPath(); ctx.roundRect(252, 212, 116, 28, 8); ctx.fill();
      ctx.fillStyle = '#4fbf8f';
      ctx.font = '800 13px Baloo 2, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('KOIRAPUISTO', 310, 224);
      ctx.fillStyle = '#fff';
      ctx.font = '700 9px Inter, sans-serif';
      ctx.fillText('dog park', 310, 234);
      drawOtherDog(332, 314, 0.9, '#a5713f', 'soft');
      drawOtherDog(360, 318, 0.85, '#e07a2a', 'tense');
    } else if (phase === 'park') {
      ctx.fillStyle = '#7a5c3e';
      for (let x = 20; x < W - 20; x += 18) ctx.fillRect(x, 244, 7, 68);
      ctx.fillStyle = '#5a422c';
      ctx.fillRect(14, 256, W - 28, 7); ctx.fillRect(14, 292, W - 28, 7);
      const p = state.run && state.run.park;
      if (p) {
        const spots = [[98, 314], [322, 312], [172, 318], [252, 318]];
        p.occupants.forEach((id, i) => {
          const a = Game.archById(id);
          const sp = spots[i % spots.length];
          const isCur = p.meet && p.occupants[p.idx] === id && i === p.idx;
          if (i < p.idx) {
            ctx.globalAlpha = 0.35;
            drawOtherDog(sp[0], sp[1], 0.85, a.coat, 'soft');
            ctx.globalAlpha = 1;
          } else {
            drawOtherDog(sp[0], sp[1], isCur ? 1.0 : 0.85, a.coat, isCur ? 'aggressive' : 'soft');
            if (isCur) {
              ctx.strokeStyle = '#e98a2e'; ctx.lineWidth = 2.4; ctx.setLineDash([]);
              ctx.beginPath(); ctx.arc(sp[0], sp[1] - 2, 26, 0, 7); ctx.stroke();
              ctx.fillStyle = '#fff'; ctx.font = '800 10px Inter, sans-serif'; ctx.textAlign = 'center';
              ctx.fillText(a.icon + ' ' + a.name, sp[0], sp[1] - 34);
            }
          }
        });
        if (p.meet) drawNina(118, 318, 1.0, 'tense');
      }
    } else if (!state.run) {
      drawNina(118, 318, 1.15, 'happy');
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath(); ctx.roundRect(W / 2 - 74, 18, 148, 28, 14); ctx.fill();
      ctx.fillStyle = '#2a241f'; ctx.font = '700 11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Nina is waiting', W / 2, 36);
    }

    if (state.run && state.run.stress > 65) {
      ctx.fillStyle = `rgba(229,72,77,${0.06 + 0.04 * Math.sin(frame * 0.18)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function render(state) {
    frame += 1;
    drawScene(state);
  }

  function riskClass(enc) {
    if (!enc || enc.gate) return 'risk-0';
    if (enc.kind === 'smell' || enc.kind === 'distraction') return 'risk-0';
    const a = enc.archId ? Game.archById(enc.archId) : null;
    if (!a) return 'risk-0';
    if (a.vibe >= 2) return 'risk-2';
    if (a.vibe === 1) return 'risk-1';
    return 'risk-0';
  }

  function riskLabel(enc) {
    if (!enc || enc.gate) return '—';
    if (enc.kind === 'smell') return 'Sniff trap';
    if (enc.kind === 'fence') return 'Fence rally';
    if (enc.kind === 'distraction') return enc.sub === 'bike' ? 'Bike zoom' : 'Squirrel!';
    const a = Game.archById(enc.archId);
    if (a.vibe >= 2) return 'High';
    if (a.vibe === 1) return 'Medium';
    return 'Low';
  }

  function updateHud(state) {
    const r = state.run;
    const day = DAYS[state.dayIdx];
    $('.day-chip b').textContent = (state.dayIdx + 1) + '/' + DAYS.length;
    $('.trust-chip b').textContent = Math.round(state.trust);
    $('.heart-chip b').textContent = r ? r.hearts : CONFIG.heartsPerDay;
    $('.calm-chip b').textContent = r ? r.calm : CONFIG.calmPerDay;
    $('.treat-chip b').textContent = r ? r.treats : CONFIG.treatsPerDay;
    const m = document.querySelector('[data-action="mute"]');
    if (m) { m.textContent = state.muted ? '🔇' : '🔊'; m.title = state.muted ? 'Unmute (M)' : 'Mute (M)'; }
  }

  function renderEncounter(state) {
    const host = $('#encounterCard');
    const upHost = $('#upcomingRow');
    const chHost = $('#choiceRow');
    host.innerHTML = '';
    upHost.innerHTML = '';
    chHost.innerHTML = '';

    const r = state.run;
    if (!r) {
      host.appendChild(el('div', 'enc-card', `<div class="enc-head"><div class="enc-icon">🐾</div><div><div class="enc-title">Ready to walk?</div><div class="enc-sub">Start the day — Nina is already at the door.</div></div></div>`));
      return;
    }

    if (state.phase === 'gate') {
      const planned = r.parkPlanned.length;
      host.appendChild(el('div', 'enc-card gate',
        `<div class="enc-head"><div class="enc-icon">🌳</div><div><div class="enc-title">KOIRAPUISTO ahead</div><div class="enc-sub">The gate. ${planned} dogs inside. Nina pulls hard.</div></div></div>` +
        `<div class="enc-read">She <em>will</em> sit down if you walk on. Scout is free. Enter is a gamble.</div>` +
        `<div class="enc-meta"><span class="meta-pill">Gate</span><span class="meta-pill">${planned} dogs</span>${r.sulk ? '<span class="meta-pill sulk">Sulking</span>' : ''}</div>`
      ));
      const sBtn = el('button', 'choice-btn', `<span class="cicon">👀</span><span class="clabel">SCOUT</span><span class="ccost">free · peek</span>`);
      const eBtn = el('button', 'choice-btn', `<span class="cicon">🌳</span><span class="clabel">ENTER</span><span class="ccost">go in</span>`);
      const wBtn = el('button', 'choice-btn', `<span class="cicon">➡️</span><span class="clabel">WALK ON</span><span class="ccost">she will sulk</span>`);
      sBtn.addEventListener('click', () => App.doGate('scout'));
      eBtn.addEventListener('click', () => App.doGate('enter'));
      wBtn.addEventListener('click', () => App.doGate('skip'));
      const gateRow = el('div', 'gate-row', '');
      gateRow.appendChild(sBtn); gateRow.appendChild(eBtn); gateRow.appendChild(wBtn);
      chHost.appendChild(gateRow);
      if (r.scouted) {
        const reads = r._lastScout || [];
        if (reads.length) {
          upHost.appendChild(el('div', 'upcoming-label', 'Scouted'));
          reads.forEach((d) => {
            const t = el('div', 'upcoming-tile', `<span class="uicon">${esc(d.icon)}</span><span class="uname">${esc(d.name)}</span>`);
            upHost.appendChild(t);
          });
        }
      }
      if (r.sulk) {
        const b = el('button', 'btn primary', 'BRIBE — 1 calm + 1 treat');
        b.style.marginTop = '8px';
        b.addEventListener('click', () => App.doBribe());
        chHost.appendChild(b);
        host.appendChild(el('div', 'sulk-banner', 'Nina sits. She is not moving. Bribe or drag the walk.'));
      }
      return;
    }

    if (state.phase === 'park') {
      const p = r.park;
      const meet = p && p.meet ? Game.archById(p.meet.archId) : null;
      if (!meet) {
        host.appendChild(el('div', 'enc-card', `<div class="enc-sub">Park quiet...</div>`));
        return;
      }
      const vibeLabel = meet.vibe >= 2 ? 'Spicy' : meet.vibe === 1 ? 'Wary' : 'Easy';
      host.appendChild(el('div', 'enc-card',
        `<div class="enc-head"><div class="enc-icon">${esc(meet.icon)}</div><div><div class="enc-title">${esc(meet.name)}</div><div class="enc-sub">${esc(meet.read)}</div></div></div>` +
        `<div class="enc-meta"><span class="meta-pill ${riskClass({ archId: meet.id })}">${esc(vibeLabel)}</span><span class="meta-pill">Meet ${p.idx + 1}/${p.occupants.length}</span><span class="meta-pill">Wins ${p.wins}</span></div>`
      ));
      const gBtn = el('button', 'choice-btn leave', `<span class="cicon">🤝</span><span class="clabel">GREET</span><span class="ccost">free</span>`);
      const tBtn = el('button', 'choice-btn treat', `<span class="cicon">🦴</span><span class="clabel">TREAT</span><span class="ccost">1 calm + 1 treat</span>`);
      const xBtn = el('button', 'choice-btn cross', `<span class="cicon">🚪</span><span class="clabel">EXIT PARK</span><span class="ccost">leave</span>`);
      if (r.calm <= 0 || r.treats <= 0) tBtn.classList.add('blocked');
      gBtn.addEventListener('click', () => App.doPark(false));
      tBtn.addEventListener('click', () => App.doPark(true));
      xBtn.addEventListener('click', () => App.doParkExit());
      const prow = el('div', 'park-row', '');
      prow.appendChild(gBtn); prow.appendChild(tBtn);
      chHost.appendChild(prow);
      const xrow = el('div', 'park-row', '');
      xrow.style.marginTop = '8px';
      xrow.appendChild(xBtn);
      chHost.appendChild(xrow);
      return;
    }

    if (state.phase === 'encounter') {
      const enc = Game.curEnc(state);
      if (!enc) {
        host.appendChild(el('div', 'enc-card', `<div class="enc-sub">Walk done.</div>`));
        return;
      }
      if (enc.gate) {
        host.appendChild(el('div', 'enc-card gate', `<div class="enc-head"><div class="enc-icon">🌳</div><div><div class="enc-title">KOIRAPUISTO ahead</div><div class="enc-sub">Gate coming up next.</div></div></div>`));
        return;
      }
      let title = '';
      let sub = '';
      let read = '';
      if (enc.kind === 'dog') {
        const a = Game.archById(enc.archId);
        title = a.name;
        sub = a.read;
        read = enc.kind === 'dog' ? `Nina locks on. <em>${esc(a.read)}</em>` : '';
      } else if (enc.kind === 'fence') {
        title = 'Fence Dog';
        sub = 'Behind the fence, losing its mind.';
        read = 'Ignore the fence. <em>Not our fight, Nina.</em>';
      } else if (enc.kind === 'smell') {
        title = 'Smell Spot';
        sub = 'Irresistible. She wants to stop and sniff.';
        read = 'Keep walking. <em>Eyes up, nose off.</em>';
      } else if (enc.kind === 'distraction') {
        title = enc.sub === 'bike' ? 'Bike Zoom' : 'Squirrel!';
        sub = enc.sub === 'bike' ? 'Wheels flash past.' : 'Tail flick. Gone.';
        read = 'Stay with me. <em>Leave it.</em>';
      }
      const rc = riskClass(enc);
      const rl = riskLabel(enc);
      host.appendChild(el('div', 'enc-card',
        `<div class="enc-head"><div class="enc-icon">${enc.kind === 'dog' ? esc(Game.archById(enc.archId).icon) : enc.kind === 'fence' ? '🐕' : enc.kind === 'smell' ? '👃' : enc.sub === 'bike' ? '🚲' : '🐿️'}</div><div><div class="enc-title">${esc(title)}</div><div class="enc-sub">${esc(sub)}</div></div></div>` +
        (read ? `<div class="enc-read">${read}</div>` : '') +
        `<div class="enc-meta"><span class="meta-pill ${rc}">${esc(rl)}</span><span class="meta-pill">${r.idx + 1}/${r.queue.length}</span>${r.sulk ? '<span class="meta-pill sulk">Sulking</span>' : ''}${r.poison ? '<span class="meta-pill" style="background:#fff0dc;border-color:#f0d48a;color:#8a6a1a;">Treat buzz</span>' : ''}</div>`
      ));

      const upcoming = Game.upcoming(state, 2);
      if (upcoming.length) {
        upHost.appendChild(el('div', 'upcoming-label', 'Next'));
        upcoming.forEach((u) => {
          let icon = '🐾';
          let name = u.kind;
          if (u.kind === 'dog') { const a = Game.archById(u.archId); icon = a.icon; name = a.name; }
          else if (u.kind === 'fence') { icon = '🐕'; name = 'Fence'; }
          else if (u.kind === 'smell') { icon = '👃'; name = 'Smell'; }
          else if (u.kind === 'distraction') { icon = u.sub === 'bike' ? '🚲' : '🐿️'; name = u.sub; }
          else if (u.gate) { icon = '🌳'; name = 'Park gate'; }
          const t = el('div', 'upcoming-tile', `<span class="uicon">${esc(icon)}</span><span class="uname">${esc(name)}</span>`);
          upHost.appendChild(t);
        });
      }

      const leaveBtn = el('button', 'choice-btn leave', `<span class="cicon">✋</span><span class="clabel">LEAVE IT</span><span class="ccost">free</span>`);
      const crossBtn = el('button', 'choice-btn cross', `<span class="cicon">↔️</span><span class="clabel">CROSS</span><span class="ccost">1 calm</span>`);
      const treatBtn = el('button', 'choice-btn treat', `<span class="cicon">🦴</span><span class="clabel">TREAT</span><span class="ccost">1 calm + 1 treat</span>`);
      if (r.calm <= 0) crossBtn.classList.add('blocked');
      if (r.calm <= 0 || r.treats <= 0) treatBtn.classList.add('blocked');
      if (enc.kind === 'fence') crossBtn.classList.add('blocked');
      leaveBtn.addEventListener('click', () => App.choose('leave'));
      crossBtn.addEventListener('click', () => App.choose('cross'));
      treatBtn.addEventListener('click', () => App.choose('treat'));
      chHost.appendChild(leaveBtn);
      chHost.appendChild(crossBtn);
      chHost.appendChild(treatBtn);

      if (r.sulk) {
        const b = el('button', 'btn primary', 'BRIBE — 1 calm + 1 treat to un-sulk');
        b.style.marginTop = '8px';
        b.addEventListener('click', () => App.doBribe());
        chHost.appendChild(b);
      }
      return;
    }

    if (state.phase === 'evening' || state.phase === 'upgrade' || state.phase === 'over') {
      host.appendChild(el('div', 'enc-card', `<div class="enc-sub">Day over — see summary.</div>`));
    }
  }

  let bubbleTimer = 0;
  function say(html, dur) {
    const b = $('#bubble');
    b.innerHTML = html;
    b.classList.remove('hidden');
    clearTimeout(bubbleTimer);
    if (dur) {
      bubbleTimer = setTimeout(() => { b.classList.add('hidden'); }, dur);
    }
  }
  function holdBubble(html) {
    const b = $('#bubble');
    b.innerHTML = html;
    b.classList.remove('hidden');
    clearTimeout(bubbleTimer);
  }
  function clearBubble() {
    const b = $('#bubble');
    b.classList.add('hidden');
    clearTimeout(bubbleTimer);
  }

  function showOverlay(html) {
    const o = $('#overlay');
    o.innerHTML = html;
    o.classList.remove('hidden');
  }
  function hideOverlay() {
    $('#overlay').classList.add('hidden');
  }

  function showModal({ title, fi, body, takeaway, win, verdict, actions, extra }) {
    let m = $('#modal');
    if (!m) { m = el('div', 'modal-backdrop', ''); m.id = 'modal'; document.body.appendChild(m); }
    const verdictHtml = verdict ? `<div class="verdict ${win ? 'win' : 'fail'}">${esc(verdict)}</div>` : '';
    const extraHtml = extra && extra.length
      ? `<div class="modal-extra">${extra.map((e) => `<div class="stat-lift"><b>${esc(e.v)}</b><span>${esc(e.l)}</span></div>`).join('')}</div>` : '';
    m.innerHTML = `<div class="modal ${win ? 'win' : 'fail'}">
        ${verdictHtml}
        ${fi ? `<div class="modal-fi">${esc(fi)}</div>` : ''}
        <div class="modal-title">${esc(title)}</div>
        <div class="modal-body">${esc(body)}</div>
        ${extraHtml}
        <div class="modal-takeaway">${esc(takeaway || '')}</div>
        <div class="modal-actions">
          ${(actions || []).map((a) => `<button class="btn ${a.kind || 'primary'}" data-modal="${a.id}">${esc(a.label)}</button>`).join('')}
        </div>
      </div>`;
    m.style.display = 'flex';
    for (const a of (actions || [])) {
      m.querySelector(`[data-modal="${a.id}"]`).addEventListener('click', () => { m.style.display = 'none'; a.onClick && a.onClick(); });
    }
  }

  function hideModal() {
    const m = $('#modal');
    if (m) m.style.display = 'none';
  }

  function toast(msg, kind) {
    const host = $('#toasts');
    const t = el('div', 'toast ' + (kind || 'info'), msg);
    host.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3400);
  }

  return { init, render, renderEncounter, updateHud, say, holdBubble, clearBubble, showOverlay, hideOverlay, showModal, hideModal, toast, el };
})();
