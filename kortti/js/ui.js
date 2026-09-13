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

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

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

  const dayOf = () => (new Date()).getSeconds();

  function confFor(state) {
    return state.run ? ROUNDS.find((r) => r.id === state.run.conf) : (ROUNDS[state.roundIdx] || ROUNDS[0]);
  }

  function drawBackground(state, c) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, c.bgTop);
    g.addColorStop(1, c.bgBot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (c.winter) {
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath();
      ctx.arc(W - 66, 84, 30, 0, 7);
      ctx.fill();
      ctx.fillStyle = c.bgTop;
      ctx.beginPath();
      ctx.arc(W - 52, 78, 26, 0, 7);
      ctx.fill();
    } else if (c.mech === 'gusts') {
      ctx.fillStyle = 'rgba(180,90,20,.18)';
      ctx.fillRect(0, 0, W, 86);
      ctx.fillStyle = '#e67e22';
      ctx.beginPath();
      ctx.arc(64, 92, 22, 0, 7);
      ctx.fill();
      ctx.fillStyle = 'rgba(120,70,20,.35)';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(150 + i*80, 42 + (i%2)*12, 18, 0, 7);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#ffe08a';
      ctx.beginPath();
      ctx.arc(64, 92, 26, 0, 7);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(160 + i * 70, 40 + (i % 2) * 16, 16, 0, 7);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(160 + i * 70 + 26, 34 + (i % 2) * 16, 14, 0, 7);
        ctx.fill();
      }
    }
  }

  function drawScenery(state, c) {
    const r = state.run;
    if (!r) return;
    for (const s of r.scenery) {
      const sy = CONFIG.car.screenY - (s.dist - r.dist);
      if (sy < -120 || sy > H + 120) continue;
      const edge = s.side === 0 ? 30 : W - 30;
      const x = s.side === 0 ? 22 : W - 22;
      ctx.save();
      if (s.kind === 'tree') {
        ctx.fillStyle = '#3f8f4f';
        ctx.beginPath(); ctx.arc(x, sy, 13, 0, 7); ctx.fill();
        ctx.fillStyle = '#2f6f3c';
        ctx.fillRect(x - 2, sy + 8, 4, 10);
      } else if (s.kind === 'pine') {
        ctx.fillStyle = '#2c6e46';
        ctx.beginPath(); ctx.moveTo(x, sy - 14); ctx.lineTo(x + 11, sy + 8); ctx.lineTo(x - 11, sy + 8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#245c3a';
        ctx.beginPath(); ctx.moveTo(x, sy - 4); ctx.lineTo(x + 13, sy + 16); ctx.lineTo(x - 13, sy + 16); ctx.closePath(); ctx.fill();
        if (c.winter) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 4, sy - 8, 4, 0, 7); ctx.fill(); }
      } else if (s.kind === 'house') {
        ctx.fillStyle = '#e8b8c4';
        ctx.fillRect(x - 12, sy - 8, 24, 17);
        ctx.fillStyle = '#b34a5a';
        ctx.beginPath(); ctx.moveTo(x - 14, sy - 8); ctx.lineTo(x, sy - 20); ctx.lineTo(x + 14, sy - 8); ctx.closePath(); ctx.fill();
      } else if (s.kind === 'lamp') {
        ctx.fillStyle = '#5a6676';
        ctx.fillRect(x - 1, sy - 12, 2, 14);
        ctx.fillStyle = '#ffe08a';
        ctx.beginPath(); ctx.arc(x, sy - 14, 4, 0, 7); ctx.fill();
      } else if (s.kind === 'snowdrift') {
        ctx.fillStyle = '#f4f8fb';
        ctx.beginPath();
        ctx.moveTo(edge, sy);
        ctx.quadraticCurveTo(s.side === 0 ? edge + 4 : edge - 4, sy - 16, edge, sy - 26);
        ctx.quadraticCurveTo(s.side === 0 ? edge + 2 : edge - 2, sy - 18, edge, sy);
        ctx.fill();
      } else if (s.kind === 'sign') {
        ctx.fillStyle = '#7b8794';
        ctx.fillRect(x - 2, sy - 20, 3, 22);
        drawSign(x, sy - 22, s.sign, s.side);
      }
      ctx.restore();
    }
  }

  function drawSign(x, y, kind, side) {
    ctx.save();
    if (kind === 'speed50') {
      ctx.strokeStyle = '#d6383f'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 7.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#1c2434'; ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('50', x, y + 0.5);
    } else if (kind === 'hirvi') {
      ctx.strokeStyle = '#d6383f'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + 11, y + 8); ctx.lineTo(x - 11, y + 8); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 8, y + 5); ctx.lineTo(x - 8, y + 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1c2434'; ctx.font = 'bold 7px Inter, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('HIRVI', x, y + 0.5);
    } else if (kind === 'stop') {
      ctx.fillStyle = '#d6383f';
      ctx.fillRect(x - 9, y - 9, 18, 18);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8px Inter, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('STOP', x, y + 0.5);
    } else if (kind === 'roundabout') {
      ctx.fillStyle = '#2a6be0';
      ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 5, 0.6, 4.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x, y + 11); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(x - 2, y + 11); ctx.lineTo(x + 3, y + 11); ctx.lineTo(x, y + 15); ctx.closePath(); ctx.fill();
    } else if (kind === 'slippery') {
      ctx.strokeStyle = '#d6383f'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + 11, y + 8); ctx.lineTo(x - 11, y + 8); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 8, y + 5); ctx.lineTo(x - 8, y + 5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#1c2434'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x - 4, y + 1); ctx.lineTo(x - 1, y - 2); ctx.moveTo(x - 1, y + 2); ctx.lineTo(x + 2, y - 1); ctx.moveTo(x + 2, y + 3); ctx.lineTo(x + 4, y + 1); ctx.stroke();
    } else {
      ctx.fillStyle = '#f2c31c'; ctx.strokeStyle = '#d6383f'; ctx.lineWidth = 2;
      ctx.beginPath();
      const s = side === 0 ? 1 : -1;
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x + 4 * s, y + 6);
      ctx.lineTo(x, y + 10);
      ctx.lineTo(x - 4 * s, y + 6);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  function drawGround(c) {
    let sideColor, sideDark;
    if (c.winter) { sideColor = '#dfe8f2'; sideDark = '#d6e0ec'; }
    else if (c.mech === 'gusts') { sideColor = '#d9a35c'; sideDark = '#b07a2e'; }
    else { sideColor = '#4fae57'; sideDark = '#3f9947'; }
    ctx.fillStyle = sideColor;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = sideDark;
    ctx.fillRect(0, 0, CONFIG.road.left - 6, H);
    ctx.fillRect(CONFIG.road.left + CONFIG.road.width + 6, 0, W - CONFIG.road.left - CONFIG.road.width - 6, H);
    ctx.fillStyle = '#7d7d7d';
    ctx.fillRect(CONFIG.road.left - 6, 0, 6, H);
    ctx.fillRect(CONFIG.road.left + CONFIG.road.width, 0, 6, H);
  }

  function drawRoad(state, c) {
    const r = state.run;
    const L = CONFIG.road.left;
    const RW = CONFIG.road.width;
    ctx.fillStyle = c.road;
    ctx.fillRect(L, 0, RW, H);
    ctx.strokeStyle = '#f3f6f9';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(L, 0); ctx.lineTo(L, H);
    ctx.moveTo(L + RW, 0); ctx.lineTo(L + RW, H);
    ctx.stroke();

    const LW = RW / CONFIG.road.lanes;
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    const dashH = 26;
    for (let b = 1; b < CONFIG.road.lanes; b++) {
      const x = L + b * LW - 2;
      for (let i = -4; i < 14; i++) {
        const offset = 120 * i - (r.dist % 120);
        const sy = CONFIG.car.screenY - offset;
        if (sy > -dashH && sy < H + dashH) {
          ctx.fillRect(x, sy, 4, dashH);
        }
      }
    }
  }

  function drawZebra(o, sy) {
    const L = CONFIG.road.left;
    const RW = CONFIG.road.width;
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    const rows = 4;
    for (let i = 0; i < rows; i++) {
      const yy = sy - 14 + (i * 8);
      ctx.fillRect(L + (i % 2) * 0, yy, RW, 4);
      ctx.fillRect(L, yy, RW, 4);
    }
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    const bar = RW / 6;
    for (let j = 0; j < 6; j += 2) {
      ctx.fillRect(L + j * bar, sy - 14, bar, 4);
      ctx.fillRect(L + (j + 1) * bar, sy - 6, bar, 4);
      ctx.fillRect(L + j * bar, sy + 2, bar, 4);
      ctx.fillRect(L + (j + 1) * bar, sy + 10, bar, 4);
    }
  }

  function drawObstacle(o, sy, c) {
    if (sy < -160 || sy > H + 160) return;
    const x = o.x0;
    const w = o.w;
    const h = o.h;
    if (o.type === 'car') {
      ctx.fillStyle = o.color;
      rr(x - w / 2, sy - h / 2, w, h, 9);
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,26,40,.5)';
      ctx.lineWidth = 2;
      rr(x - w / 2, sy - h / 2, w, h, 9);
      ctx.stroke();
      ctx.fillStyle = 'rgba(20,26,40,.35)';
      ctx.fillRect(x - w / 2 + 4, sy - h / 2 + 6, w - 8, 8);
      ctx.fillRect(x - w / 2 + 4, sy + h / 2 - 12, w - 8, 8);
      ctx.fillStyle = 'rgba(150,215,240,.9)';
      rr(x - w / 2 + 6, sy - h / 2 + 16, w - 12, 16, 5);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath();
      ctx.arc(x - 10, sy - h / 2 + 12, 3, 0, 7);
      ctx.arc(x + 10, sy - h / 2 + 12, 3, 0, 7);
      ctx.fill();
    } else if (o.type === 'bus') {
      ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
      ctx.fillStyle = o.color;
      rr(x - w / 2, sy - h / 2, w, h, 12); ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(20,26,40,.45)'; ctx.lineWidth = 1.6;
      rr(x - w / 2, sy - h / 2, w, h, 12); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      for (let i = 0; i < 3; i++) {
        rr(x - w / 2 + 10 + i * 38, sy - h / 2 + 10, 30, 20, 5); ctx.fill();
        ctx.fillStyle = 'rgba(135,195,230,.9)'; rr(x - w/2 + 12 + i*38, sy - h/2 +12, 26, 7, 3); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.95)';
      }
      ctx.fillStyle = '#1c2434'; ctx.font = '800 10px Inter, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BUSSI', x, sy + 22);
    } else if (o.type === 'moose') {
      ctx.fillStyle = '#8a5a3b';
      rr(x - w / 2, sy - h / 2, w, h, 24);
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,26,40,.5)';
      ctx.lineWidth = 2;
      rr(x - w / 2, sy - h / 2, w, h, 24);
      ctx.stroke();
      ctx.fillStyle = '#6e4629';
      ctx.fillRect(x - w / 2 + 14, sy - h / 2 + 10, 10, 12);
      ctx.fillRect(x + w / 2 - 24, sy - h / 2 + 10, 10, 12);
      ctx.fillStyle = '#a97e5a';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('HIRVI', x, sy - 34 + h / 2);
      ctx.beginPath();
      ctx.arc(x - w / 2 + 22, sy + 16, 3, 0, 7);
      ctx.arc(x + w / 2 - 22, sy + 16, 3, 0, 7);
      ctx.fill();
    } else if (o.type === 'cone') {
      ctx.fillStyle = 'rgba(20,26,40,.10)';
      ctx.beginPath(); ctx.ellipse(x, sy+14, w/2-4, 5, 0, 0, 7); ctx.fill();
      const cones = 2;
      for (let i = 0; i < cones; i++) {
        const cx = x - 12 + i*24;
        ctx.fillStyle = '#ff7a2f';
        ctx.beginPath(); ctx.moveTo(cx, sy - 14); ctx.lineTo(cx+10, sy+12); ctx.lineTo(cx-10, sy+12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.moveTo(cx, sy-14); ctx.lineTo(cx+10, sy+12); ctx.lineTo(cx, sy+12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ff7a2f'; ctx.beginPath(); ctx.moveTo(cx, sy - 14); ctx.lineTo(cx+10, sy+12); ctx.lineTo(cx-10, sy+12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(cx-7, sy-1, 14, 4); ctx.fillRect(cx-5, sy+5, 10, 3);
        ctx.strokeStyle = 'rgba(20,26,40,.25)'; ctx.lineWidth = 1.2; ctx.stroke();
      }
    } else if (o.type === 'mopo') {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.15)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
      ctx.fillStyle = '#2c363f';
      ctx.beginPath(); ctx.ellipse(x, sy+26, 14, 6, 0, 0, 7); ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = o.color;
      rr(x - w/2, sy - h/2 + 4, w, h*0.58, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(20,26,40,.45)'; ctx.lineWidth = 1.6;
      rr(x - w/2, sy - h/2 + 4, w, h*0.58, 8); ctx.stroke();
      ctx.fillStyle = '#1c2434'; ctx.fillRect(x - w/2 + 6, sy+2, w-12, 5);
      ctx.fillStyle = '#9fd0e2'; rr(x - w/2 + 8, sy - h/2 + 10, w-16, 13, 4); ctx.fill();
      ctx.fillStyle = '#2c363f'; ctx.fillRect(x - 1.5, sy+8, 3, 16);
      ctx.fillStyle = '#1c2434'; ctx.beginPath(); ctx.arc(x-9, sy+24, 7, 0, 7); ctx.arc(x+9, sy+24, 7, 0, 7); ctx.fill();
      ctx.fillStyle = '#8a96a8'; ctx.beginPath(); ctx.arc(x-9, sy+24, 2.5, 0, 7); ctx.arc(x+9, sy+24, 2.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd23f'; ctx.font = '800 10px Inter, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('MOPO', x, sy - h/2 + 14);
      ctx.restore();
    } else if (o.type === 'ped') {
      drawZebra(o, sy);
      ctx.fillStyle = 'rgba(20,26,40,.12)'; ctx.beginPath(); ctx.ellipse(x, sy+14, 9, 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = o.color;
      rr(x - 7, sy - 10, 14, 20, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(20,26,40,.2)'; ctx.lineWidth = 1; rr(x - 7, sy - 10, 14, 20, 7); ctx.stroke();
      ctx.fillStyle = '#f3c89d';
      ctx.beginPath(); ctx.arc(x, sy - 15, 6, 0, 7); ctx.fill();
      ctx.fillStyle = '#2c363f';
      ctx.fillRect(x - 6, sy - 19, 12, 4); ctx.fillRect(x - 5, sy - 22, 10, 3);
      ctx.fillStyle = '#3b4a5a'; ctx.fillRect(x - 4, sy+6, 3, 7); ctx.fillRect(x+2, sy+6, 3, 7);
      ctx.fillStyle = '#1c2434'; ctx.fillRect(x - 5, sy+12, 4, 2); ctx.fillRect(x+1, sy+12, 4, 2);
    } else if (o.type === 'tourist') {
      const step = Math.sin(o.dist * 0.18) * 3;
      const shade = (o.x0 < x) ? -3 : 3;
      ctx.fillStyle = 'rgba(20,26,40,.12)';
      ctx.beginPath();
      ctx.ellipse(x - shade, sy + 16, 7, 3, 0, 0, 7);
      ctx.fill();
      ctx.fillStyle = o.color;
      ctx.fillRect(x - 6, sy - 4, 12, 18);
      ctx.fillStyle = '#f3c89d';
      ctx.beginPath();
      ctx.arc(x, sy - 12 + step * 0.4, 6, 0, 7);
      ctx.fill();
      ctx.fillStyle = o.color;
      ctx.beginPath();
      ctx.arc(x, sy - 14 + step * 0.4, 6, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#ffe08a';
      ctx.beginPath();
      ctx.moveTo(x - 5, sy - 12 + step * 0.4);
      ctx.lineTo(x + 5, sy - 12 + step * 0.4);
      ctx.lineTo(x, sy - 18 + step * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x - 2, sy - 12 + step * 0.4, 1.4, 0, 7);
      ctx.fill();
      ctx.strokeStyle = '#3b4a5a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 5, sy + 4);
      ctx.lineTo(x - 8, sy + 12);
      ctx.moveTo(x + 5, sy + 4);
      ctx.lineTo(x + 8, sy + 12);
      ctx.stroke();
    } else if (o.type === 'reindeer') {
      const herd = o.herd || 4;
      ctx.fillStyle = 'rgba(20,26,40,.18)';
      ctx.beginPath(); ctx.ellipse(x, sy+14, w/2, 6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(200,215,230,.55)'; ctx.fillRect(x - w/2, sy - h/2 -6, w, h+12);
      for (let i = 0; i < herd; i++) {
        const rx = x - w/2 + 30 + i * (w - 60) / Math.max(1, herd-1) + Math.sin(sy*0.03+i)*1.5;
        const ry = sy + (i%2?7:-5);
        ctx.shadowColor = 'rgba(0,0,0,.2)'; ctx.shadowBlur = 4;
        ctx.fillStyle = '#9b7a5a';
        ctx.beginPath(); ctx.ellipse(rx, ry, 15, 10, 0, 0, 7); ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#f0e6d6'; ctx.beginPath(); ctx.ellipse(rx-8, ry+3, 5, 4, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#6e4e2e';
        ctx.beginPath(); ctx.ellipse(rx+11, ry-5, 3.5, 7, 0.25, 0, 7); ctx.fill();
        ctx.strokeStyle = '#3b2212'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(rx+9, ry-11); ctx.lineTo(rx+13, ry-18); ctx.moveTo(rx+13, ry-11); ctx.lineTo(rx+18, ry-18); ctx.stroke();
        ctx.fillStyle = '#2b0707'; ctx.beginPath(); ctx.arc(rx-2, ry-1, 1.2, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '700 6px Inter, sans-serif';
        ctx.textAlign = 'center'; ctx.fillText('PORO', rx, ry+16);
      }
    } else if (o.type === 'construction') {
      ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 3;
      ctx.fillStyle = '#ff7a2f';
      rr(x - w/2, sy - h/2, w, h, 7); ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(20,26,40,.35)'; ctx.lineWidth = 1.4;
      rr(x - w/2, sy - h/2, w, h, 7); ctx.stroke();
      ctx.fillStyle = 'repeating-linear-gradient'; // fallback
      ctx.fillStyle = '#1c2434';
      for(let i=0;i<4;i++){ if(i%2===0){ ctx.fillRect(x - w/2 + i*(w/4), sy - h/2 + 5, w/4, 4); ctx.fillRect(x - w/2 + i*(w/4), sy + h/2 -9, w/4, 4); } }
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 18, sy - h/2 - 10, 36, 10);
      ctx.strokeStyle = '#d6383f'; ctx.lineWidth = 1.2; ctx.strokeRect(x - 18, sy - h/2 - 10, 36, 10);
      ctx.fillStyle = '#1c2434'; ctx.font = '800 8px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('TYÖMAA', x, sy - h/2 -5);
      ctx.fillStyle = '#1c2434'; ctx.font = '700 10px Inter, sans-serif'; ctx.fillText('TYÖMAA', x, sy-2);
      ctx.fillStyle = 'rgba(20,26,40,.7)'; ctx.font = '700 7px Inter, sans-serif'; ctx.fillText('ROAD WORK', x, sy+8);
      ctx.fillStyle = 'rgba(20,26,40,.14)'; ctx.beginPath(); ctx.ellipse(x, sy+16, w/2 -6, 3, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '8px Inter, sans-serif'; ctx.fillText('▲ ▲ ▲', x, sy+13);
      if (o.withDog) {
        const dx = x + 14, dy = sy + 2;
        ctx.fillStyle = '#f3c89d'; ctx.beginPath(); ctx.ellipse(dx, dy+6, 7, 8, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#8a5a3b'; ctx.beginPath(); ctx.arc(dx-1, dy-2, 6, 0, 7); ctx.fill();
        ctx.fillStyle = '#5a3a2a'; ctx.beginPath(); ctx.ellipse(dx-1, dy-4, 6, 3, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#1c2434'; ctx.beginPath(); ctx.arc(dx-3, dy-1, 1, 0, 7); ctx.arc(dx+2, dy-1, 1, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(dx-4, dy+3); ctx.lineTo(dx+2, dy+3); ctx.lineTo(dx-1, dy+6); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#ff7a2f'; ctx.lineWidth = 1; ctx.strokeRect(dx-7, dy+9, 14, 2);
      }
    }
  }

  function drawGate(state, gate, q) {
    const r = state.run;
    const bandBot = CONFIG.car.screenY - (gate.dist - r.dist);
    const bandTop = bandBot - CONFIG.gateLen;
    if (bandBot < -60 || bandTop > H + 60) return;
    const L = CONFIG.road.left;
    const RW = CONFIG.road.width;
    const midx = L + RW / 2;
    const resolved = gate.done;
    ctx.fillStyle = resolved ? 'rgba(255,255,255,.12)' : 'rgba(255,244,180,.34)';
    ctx.fillRect(L, bandTop, RW, CONFIG.gateLen + 2);
    if (!resolved) {
      ctx.strokeStyle = 'rgba(255,255,255,.95)';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(midx, bandTop);
      ctx.lineTo(midx, bandBot);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(205,60,60,.32)';
      ctx.fillRect(CONFIG.gateDeadLow, bandTop, CONFIG.gateDeadHigh - CONFIG.gateDeadLow, CONFIG.gateLen + 2);
    }
    ctx.strokeStyle = '#2c363f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(L, bandTop + 1.5);
    ctx.lineTo(L + RW, bandTop + 1.5);
    ctx.moveTo(L, bandBot - 1.5);
    ctx.lineTo(L + RW, bandBot - 1.5);
    ctx.stroke();
    if (r.answerFlash > 0 && r.lastHalf) {
      ctx.fillStyle = r.answerOk ? 'rgba(70,220,130,.5)' : 'rgba(240,80,90,.5)';
      if (r.lastHalf === 'a') ctx.fillRect(L, bandTop, RW / 2, CONFIG.gateLen + 2);
      else ctx.fillRect(midx, bandTop, L + RW - midx, CONFIG.gateLen + 2);
    }
    ctx.font = '800 46px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = resolved ? 'rgba(40,50,70,.5)' : '#2c363f';
    const letterY = bandTop + CONFIG.gateLen / 2;
    ctx.fillText('A', L + RW / 4, letterY - 8);
    ctx.fillText('B', midx + RW / 4, letterY - 8);
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillStyle = resolved ? 'rgba(40,50,70,.6)' : '#33415e';
    if (q) {
      const aLab = q.a.length > 10 ? q.a.slice(0, 10) + '…' : q.a;
      const bLab = q.b.length > 10 ? q.b.slice(0, 10) + '…' : q.b;
      ctx.fillText(aLab, L + RW / 4, letterY + 22);
      ctx.fillText(bLab, midx + RW / 4, letterY + 22);
    }
    if (q && q.icon) {
      ctx.font = '22px sans-serif';
      ctx.fillText(q.icon, L + RW / 4, letterY - 32);
      ctx.fillText(q.icon, midx + RW / 4, letterY - 32);
    }
    if (r.answerFlash > 0 && r.gateNote) {
      const col = r.gateNote === 'right' ? '#4fd17a' : r.gateNote === 'trick' ? '#ffb23f' : '#e5484d';
      const t1 = { right: 'OIKEIN', wrong: 'VÄÄRIN', trick: 'EI KUMPIKAAN', timeout: 'AIKA LOPPUI', middle: 'EI VALINTAA' }[r.gateNote] || 'VÄÄRIN';
      const t2 = { right: 'RIGHT', wrong: 'WRONG', trick: 'NEITHER WAS RIGHT', timeout: 'TOO SLOW', middle: 'THE MIDDLE = NO ANSWER' }[r.gateNote] || 'WRONG';
      ctx.font = '800 28px Inter, sans-serif';
      ctx.strokeStyle = 'rgba(15,20,35,.75)';
      ctx.lineWidth = 5;
      ctx.fillStyle = col;
      for (const [i, tx] of [t1, t2].entries()) {
        ctx.strokeText(tx, W / 2, letterY - 22 + i * 30);
        ctx.fillText(tx, W / 2, letterY - 22 + i * 30);
      }
    }
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(L, bandTop - 14); ctx.lineTo(L + 22, bandTop - 14); ctx.lineTo(L + 11, bandTop);
    ctx.closePath();
    ctx.fill();
  }

  function drawFinish(state, c) {
    const r = state.run;
    const conf = ROUNDS.find((x) => x.id === r.conf);
    const fy = CONFIG.car.screenY - (conf.length - r.dist);
    if (fy < -60 || fy > H + 60) return;
    const L = CONFIG.road.left;
    const RW = CONFIG.road.width;
    const sq = RW / 8;
    ctx.fillStyle = '#2c363f';
    ctx.fillRect(L - 4, fy, RW + 8, 22);
    ctx.fillStyle = '#fff';
    for (let rw = 0; rw < 2; rw++) {
      for (let i = 0; i < 8; i++) {
        if ((rw + i) % 2 === 0) ctx.fillRect(L + i * sq, fy + rw * 11, sq, 11);
      }
    }
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#2c363f';
    ctx.fillText(c.fi + (ROUNDS[ROUNDS.length - 1].id === r.conf ? ' · the final exam' : ' · finish'), W / 2, fy + 36);
  }

  function drawCar(state, c) {
    const r = state.run;
    if (!r) return;
    const x = r.x;
    const y = CONFIG.car.screenY;
    const tiltS = Math.max(-6, Math.min(6, r.tilt * 0.45));
    const bob = r.boost ? Math.sin(frame * 0.35) * 0.6 : 0;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(tiltS * 0.018);
    ctx.translate(-x, -y);

    ctx.fillStyle = 'rgba(20,26,40,.12)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 4, 30, 48, 0, 0, 7);
    ctx.fill();

    ctx.fillStyle = '#e5484d';
    rr(x - 8, y - 44, 5, 14, 2);
    ctx.fill();
    rr(x + 3, y - 44, 5, 14, 2);
    ctx.fill();

    ctx.fillStyle = '#ff8fb7';
    rr(x - 26, y - 44, 52, 88, 14);
    ctx.fill();
    ctx.strokeStyle = '#b03466';
    ctx.lineWidth = 2;
    rr(x - 26, y - 44, 52, 88, 14);
    ctx.stroke();

    ctx.fillStyle = '#9fd0e2';
    rr(x - 20, y - 38, 40, 22, 8);
    ctx.fill();
    ctx.fillStyle = '#e8b0c8';
    rr(x - 22, y - 4, 44, 18, 8);
    ctx.fill();

    ctx.fillStyle = '#f3c89d';
    ctx.beginPath();
    ctx.arc(x - 9, y + 4, 7, 0, 7);
    ctx.arc(x + 9, y + 4, 7, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#3a2c24';
    ctx.beginPath();
    ctx.arc(x - 9, y + 2, 6, 0, 7);
    ctx.arc(x + 9, y + 2, 6, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#e5484d';
    ctx.font = 'bold 9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', x + 9, y + 4);

    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillRect(x - 21, y + 30, 42, 8);

    if (c.winter) {
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      rr(x - 24, y - 46, 48, 6, 3);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFlakes(state, c) {
    if (c.winter) {
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (let i = 0; i < 60; i++) {
        const sp = 0.5 + (i % 5) * 0.12;
        const x = ((i * 137 + Math.floor(frame * sp) * 7) % (W + 16)) - 8;
        const y = ((i * 71 + Math.floor(frame * sp) * 13) % (H + 20)) - 10;
        ctx.beginPath();
        ctx.arc(x, y, 1.5 + (i % 3), 0, 7);
        ctx.fill();
      }
    } else if (c.mech === 'gusts') {
      ctx.strokeStyle = 'rgba(90,70,30,.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 40; i++) {
        const x = ((i * 47 + Math.floor(frame * 0.8) * 5) % (W + 20)) - 10;
        const y = ((i * 83 + Math.floor(frame * 0.8) * 11) % (H + 30)) - 15;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 6, y + 12);
      }
      ctx.stroke();
      const leafColors = ['#c0392b','#d35400','#e67e22','#f39c12'];
      for (let i = 0; i < 18; i++) {
        const sp = 0.6 + (i % 3) * 0.15;
        const x = ((i * 97 + Math.floor(frame * sp) * 6) % (W + 20)) - 10;
        const y = ((i * 53 + Math.floor(frame * sp) * 9) % (H + 30)) - 15;
        ctx.fillStyle = leafColors[i % leafColors.length];
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3, Math.sin(frame*0.05+i)*0.6, 0, 7);
        ctx.fill();
      }
    } else if (c.rain) {
      ctx.strokeStyle = 'rgba(120,150,190,.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 70; i++) {
        const x = ((i * 47 + Math.floor(frame * 0.8) * 5) % (W + 20)) - 10;
        const y = ((i * 83 + Math.floor(frame * 0.8) * 11) % (H + 30)) - 15;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 6, y + 12);
      }
      ctx.stroke();
    }
  }

  function drawFlash(state) {
    const r = state.run;
    if (!r) return;
    if (r.hitFlash > 0) {
      ctx.fillStyle = 'rgba(220,40,50,' + (0.3 * Math.min(1, r.hitFlash)) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  function wrapLines(text, maxW) {
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (cur && ctx.measureText(t).width > maxW) { lines.push(cur); cur = w; }
      else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function drawHeikki(x, y, r, mouth) {
    ctx.fillStyle = '#f3c89d';
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = '#c98f5f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
    ctx.fillStyle = '#9aa2b8';
    ctx.beginPath(); ctx.arc(x, y - r * 0.12, r * 0.82, Math.PI * 1.06, Math.PI * 1.94); ctx.fill();
    ctx.strokeStyle = '#3a2c24'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - r * 0.46, y - r * 0.3); ctx.lineTo(x - r * 0.04, y - r * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + r * 0.04, y - r * 0.2); ctx.lineTo(x + r * 0.46, y - r * 0.3); ctx.stroke();
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x - r * 0.24, y - r * 0.02, r * 0.2, 0.1, Math.PI - 0.1); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + r * 0.24, y - r * 0.02, r * 0.2, 0.1, Math.PI - 0.1); ctx.stroke();
    ctx.fillStyle = '#8f8f9e';
    ctx.beginPath(); ctx.ellipse(x - r * 0.14, y + r * 0.16, r * 0.22, r * 0.09, 0.1, 0, 7); ctx.fill();
    ctx.fillStyle = '#7a2f2f';
    ctx.strokeStyle = '#5a2020'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x + r * 0.26, y + r * 0.18, r * 0.14, (mouth ? 0.2 : 0.07) * r, 0, 0, 7); ctx.fill();
    ctx.stroke();
  }

  function drawOption(x, y, w, letter, label, color) {
    ctx.fillStyle = color;
    rr(x, y, w, 52, 14); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '800 36px Inter, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(letter, x + 18, y + 26.5);
    ctx.font = '800 18px Inter, sans-serif';
    ctx.fillText(String(label || '').slice(0, 10), x + 60, y + 27);
  }

  function drawQuestionPanel(state) {
    const r = state.run;
    const gate = r.activeGate;
    if (!gate || gate.done) return;
    const q = QUESTIONS[gate.qid];
    const Lp = 10, Tp = 8, Wp = W - 20, Hp = 198;
    ctx.fillStyle = 'rgba(14,22,42,.98)';
    rr(Lp, Tp, Wp, Hp, 18); ctx.fill();
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2.5;
    rr(Lp, Tp, Wp, Hp, 18); ctx.stroke();

    const hx = 48, hy = 48, hr = 22;
    drawHeikki(hx, hy, hr, true);
    ctx.fillStyle = '#ffd23f';
    ctx.font = '800 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HEIKKI', hx, hy + hr + 14);

    const tx = W - 46, ty = 40, tr = 24;
    ctx.fillStyle = r.gateT <= 3 ? '#e5484d' : '#ffd23f';
    ctx.beginPath(); ctx.arc(tx, ty, tr, 0, 7); ctx.fill();
    ctx.fillStyle = '#12203a'; ctx.font = '800 30px Inter, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Math.max(0, Math.ceil(r.gateT)), tx, ty + 1);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = 'bold 9px Inter, sans-serif';
    ctx.fillText('SEC', tx, ty + tr + 12);

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '800 20px Inter, sans-serif';
    const enX = 80, enMax = W - 80 - 36;
    const hasIcon = !!(q && q.icon);
    const titleOff = hasIcon ? 14 : 0;
    if (hasIcon) { ctx.font = '22px sans-serif'; ctx.fillText(q.icon, enX - 26, 40); ctx.font = '800 20px Inter, sans-serif'; }
    const enLines = wrapLines(q ? q.en : '', enMax).slice(0, 1);
    let ey = 40 + titleOff*0.2;
    for (const ln of enLines) { ctx.fillText(ln, enX, ey); ey += 24; }
    ctx.font = '700 13px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    const fiLines = wrapLines(q ? q.fi : '', enMax).slice(0, 1);
    if (fiLines[0]) { ctx.fillText(fiLines[0], enX, ey + 2); }
    if (q && q.tricky) {
      ctx.fillStyle = '#ffb23f';
      ctx.font = '700 11px Inter, sans-serif';
      ctx.fillText('TRICK · neither is right', enX, ey + 18);
    }

    const oy = Tp + Hp - 62;
    const pw = (Wp - 28) / 2;
    drawOption(Lp + 12, oy, pw, 'A', q ? q.a : '', '#e5484d');
    drawOption(Lp + 14 + pw, oy, pw, 'B', q ? q.b : '', '#2a6be0');

    ctx.fillStyle = 'rgba(255,210,63,.98)';
    ctx.font = '800 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STAY IN LANE — or TAP ↑ to LOCK IN instantly', W / 2, Tp + Hp - 10);
  }

  function drawHeikkiMood(state) {
    const r = state.run;
    if (!r || state.phase !== 'drive' || r.finished) return;
    if (r.activeGate && !r.activeGate.done) return;
    const furious = r.score < 40;
    const angry = r.hitFlash > 0;
    const x = W - 34, y = 34, rad = 17;
    ctx.save();
    if (angry) ctx.translate(0, Math.sin(frame * 0.5) * 1.5);
    ctx.fillStyle = furious ? '#ffc9c9' : '#f3c89d';
    ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill();
    ctx.strokeStyle = '#c98f5f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.stroke();
    ctx.fillStyle = '#9aa2b8';
    ctx.beginPath(); ctx.arc(x, y - rad * 0.12, rad * 0.82, Math.PI * 1.06, Math.PI * 1.94); ctx.fill();
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 2;
    if (angry || furious) {
      ctx.beginPath(); ctx.moveTo(x - rad * 0.4, y - rad * 0.3); ctx.lineTo(x, y - rad * 0.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + rad * 0.4, y - rad * 0.3); ctx.lineTo(x, y - rad * 0.1); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(x - rad * 0.24, y - rad * 0.02, rad * 0.16, 0.1, Math.PI - 0.1); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + rad * 0.24, y - rad * 0.02, rad * 0.16, 0.1, Math.PI - 0.1); ctx.stroke();
    }
    ctx.fillStyle = '#7a2f2f';
    ctx.strokeStyle = '#5a2020'; ctx.lineWidth = 1.5;
    const mw = furious ? 0.4 : angry ? 0.28 : 0.18;
    ctx.beginPath(); ctx.ellipse(x + rad * 0.12, y + rad * 0.34, rad * 0.2, mw * rad, 0, 0, 7); ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawWhiteout(state, c) {
    const conf = confFor(state);
    if (conf.mech !== 'whiteout' || !Game.isWhiteout(state)) return;
    const r = state.run;
    const a = 0.3 + 0.07 * Math.sin(frame * 0.14);
    const g = ctx.createLinearGradient(0, 0, 0, CONFIG.car.screenY);
    g.addColorStop(0, 'rgba(240,246,252,' + a + ')');
    g.addColorStop(1, 'rgba(240,246,252,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, CONFIG.car.screenY);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    for (let i = 0; i < 90; i++) {
      const sp = 1.4 + (i % 4) * 0.3;
      const x = ((i * 173 + Math.floor(frame * sp) * 9) % (W + 24)) - 12;
      const y = ((i * 61 + Math.floor(frame * sp) * 19) % (H + 30)) - 15;
      ctx.beginPath();
      ctx.arc(x, y, 1.8 + (i % 3) * 0.9, 0, 7);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(30,40,60,.82)';
    rr(W / 2 - 64, 4, 128, 24, 12); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '800 13px Inter, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('\u2744 SQUALL \u2744', W / 2, 16.5);
  }

  function drawGust(state, c) {
    const conf = confFor(state);
    if (conf.mech !== 'gusts') return;
    const r = state.run;
    const warn = r.gustWarn > 0;
    const gust = r.gust || 0;
    const k = gust ? 1 : (warn ? 0.7 : 0.22);
    ctx.strokeStyle = 'rgba(168,116,40,' + (0.55 * k) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 26; i++) {
      const dir = gust || (i % 2 === 0 ? 1 : -1);
      const x = ((i * 89 + Math.floor(r.dist * 0.4) * dir) % (W + 30)) - 15;
      const y = ((i * 137) % (H - 80)) + 40;
      ctx.moveTo(x, y);
      ctx.lineTo(x - dir * 24, y + 9);
    }
    ctx.stroke();
    if (warn || gust) {
      const txt = gust ? (gust > 0 ? 'TUULI \u2192' : '\u2190 TUULI') : 'TUULI \u00B7 WIND!';
      const a = gust ? 1 : 0.6 + 0.4 * Math.sin(frame * 0.35);
      ctx.fillStyle = 'rgba(180,40,40,' + (0.9 * a) + ')';
      rr(W / 2 - 58, 36, 116, 34, 10); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '800 16px Inter, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(txt, W / 2, 52.5);
    }
  }

  function drawPickups(state) {
    const r = state.run;
    if (!r) return;
    for (const p of r.pickups) {
      const sy = CONFIG.car.screenY - (p.dist - r.dist);
      if (sy < -40 || sy > H + 40) continue;
      const spin = Math.cos(p.dist * 0.004 + frame * 0.18);
      const rx = 5 + 7 * Math.abs(spin);
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.ellipse(p.x0, sy, rx, 10, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#c89b1c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(p.x0, sy, rx, 10, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = '#c89b1c';
      ctx.beginPath(); ctx.ellipse(p.x0, sy, rx * 0.5, 5, 0, 0, 7); ctx.fill();
    }
    for (const s of r.sparks) {
      const sy = CONFIG.car.screenY - (s.dist - r.dist);
      const a = Math.max(0, s.t);
      ctx.strokeStyle = 'rgba(255,210,63,' + a + ')';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(s.x, sy, (1 - a) * 30, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(255,210,63,' + a + ')';
      ctx.font = '800 15px Inter, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('+' + CONFIG.scoring.pickup, s.x, sy - 10);
    }
  }

  function drawBoost(state) {
    const r = state.run;
    if (!r || !r.boost) return;
    const p = Math.min(1, r.boostT / CONFIG.boost.bonusEvery);
    ctx.fillStyle = 'rgba(22,30,50,.85)';
    rr(14, 12, 150, 26, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,210,63,.25)';
    rr(18, 16, 142 * Math.max(p, 0.04), 18, 5); ctx.fill();
    ctx.fillStyle = p >= 1 ? '#ffd23f' : '#ffb23f';
    ctx.font = '800 13px Inter, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('▲ ' + CONFIG.boost.mult.toFixed(2).replace(/\.00$/,'').replace(/0$/,'') + '×', 18, 25);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillText(p >= 1 ? '+1 READY' : '+1 in ' + Math.max(0, Math.ceil(CONFIG.boost.bonusEvery - r.boostT)) + 's', 78, 25);
  }

  function drawExplosion(state) {
    const r = state.run;
    if (!r || r.boom <= 0) return;
    const x = r.x, y = CONFIG.car.screenY;
    const a = Math.min(1, r.boom);
    const rad = 30 + (1 - a) * 70;
    ctx.fillStyle = 'rgba(120,40,30,' + (0.35 * a) + ')';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,150,40,' + (0.55 * a) + ')';
    ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,90,' + (0.5 * a) + ')';
    ctx.beginPath(); ctx.arc(x, y, rad * 0.6, 0, 7); ctx.fill();
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * 6.283;
      const dist = (1 - a) * 90 * (0.5 + (i % 3) * 0.3);
      ctx.fillStyle = i % 2 ? '#ffb23f' : '#e5484d';
      ctx.fillRect(x + Math.cos(ang) * dist, y + Math.sin(ang) * dist * 0.8, 6, 6);
    }
    if (a > 0.45) {
      ctx.fillStyle = 'rgba(40,16,16,' + a + ')';
      ctx.font = '800 24px Inter, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('BOOM!', x, y - rad - 16);
    }
    ctx.fillStyle = 'rgba(255,205,120,.9)';
    ctx.font = '800 15px Inter, sans-serif';
    ctx.fillText('0 PTS · HEIKKI IS FURIOUS · RÄJÄHTI!', W / 2, 48);
  }

  function render(state, dt) {
    frame += 1;
    const c = confFor(state);
    drawBackground(state, c);
    drawScenery(state, c);
    if (state.run) {
      drawGround(c);
      drawRoad(state, c);
      const r = state.run;
      for (const o of r.obstacles) {
        if (o.dead) continue;
        drawObstacle(o, CONFIG.car.screenY - (o.dist - r.dist), c);
      }
      for (const g of r.gates) {
        if (g.done) continue;
        drawGate(state, g, QUESTIONS[g.qid]);
      }
      drawQuestionPanel(state);
      drawPickups(state);
      drawFinish(state, c);
      drawFlakes(state, c);
      drawHeikkiMood(state);
      drawWhiteout(state, c);
      drawGust(state, c);
      drawCar(state, c);
      drawBoost(state);
      drawFlash(state);
      drawExplosion(state);
    }
  }

  function updateHud(state) {
    const conf = confFor(state);
    const r = state.run;
    $('.round-chip b').textContent = (state.roundIdx + 1) + '/' + ROUNDS.length;
    $('.month-chip').textContent = conf ? conf.tag : '';
    $('.attempt-chip b').textContent = r ? r.attempt : (state.attempts[conf ? conf.id : ''] || 0);
    $('.score-chip b').textContent = r ? r.score : CONFIG.scoring.start;
    $('.speed-chip b').textContent = r ? Math.round(Game.driveSpeed(state) * 0.11) + ' km/h' : '0 km/h';
    const m = $('#app').querySelector('[data-action="mute"]');
    if (m) { m.textContent = state.muted ? '🔇 Muted' : '🔊 Sound'; m.classList.toggle('muted', !!state.muted); m.title = state.muted ? 'Unmute (M)' : 'Mute (M)'; }
    const p = $('#app').querySelector('[data-action="pause"]');
    if (p) { p.classList.toggle('active', state.phase==='paused'); p.textContent = state.phase==='paused' ? '▶' : '⏸'; p.title = state.phase==='paused' ? 'Resume (P)' : 'Pause (P)'; }
    const bb = document.getElementById('boostBtn');
    if (bb) {
      const hasGate = !!(r && r.activeGate && !r.activeGate.done);
      bb.classList.toggle('lock-ready', hasGate);
      bb.textContent = hasGate ? '↑ TAP TO LOCK ANSWER' : '↑ HOLD TO BOOST';
      bb.style.display = (state.phase==='drive' || state.phase==='countdown') ? '' : 'none';
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
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 4200);
  }

  return { init, render, updateHud, say, holdBubble, clearBubble, showOverlay, hideOverlay, showModal, hideModal, toast, el };
})();