// ============================================================
//  SPRINT TACTICS — UI renderer (reads state, calls App action+)
//  `window.App` provides handlers; `window.GameState` holds state.
// ============================================================
const UI = (() => {
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

  const PRIORITY_LABEL = { highest: 'Highest', high: 'High', medium: 'Medium', low: 'Low', lowest: 'Lowest' };
  const PRIORITY_CLS = { highest: 'p-highest', high: 'p-high', medium: 'p-medium', low: 'p-low', lowest: 'p-lowest' };

  function bar(value, danger) {
    const v = Math.max(0, Math.min(100, value));
    const color = danger ? 'danger' : '';
    return `<div class="bar ${color}"><div class="bar-fill" style="width:${v}%"></div></div>`;
  }

  // ---------- top bar ----------
  function topBar(state) {
    const shipped = state.tickets['t-ship'].status === 'done';
    const openBugs = state.bugs.filter((b) => b.status !== 'done').length;
    return el('header', 'topbar',
      `<div class="brand"><span class="brand-mark">🎮</span><span class="brand-title">SPRINTFIRE</span></div>
       <div class="topmeta">
         <span class="chip">Sprint <b>${Math.min(state.sprint + 1, CONFIG.sprints)}</b> / ${CONFIG.sprints}</span>
         <span class="chip">Shipped <b>${state.totalShipped}</b> pts</span>
         <span class="chip">Open bugs <b>${openBugs}</b></span>
         <button class="btn ghost" data-action="new">New game</button>
         <button class="btn primary" data-action="endsprint" ${state.phase === 'over' ? 'disabled' : ''}>End Sprint →</button>
       </div>`);
  }

  // ---------- backlog column ----------
  function ticketCard(state, t, onSelect) {
    const type = TYPES[t.type];
    const av = Game.isUnlocked(state, t);
    const selected = state.selected === t.id;
    const isAssigned = t.status === 'inprogress';
    const prio = PRIORITY_LABEL[t.priority] || '';
    const prioCls = PRIORITY_CLS[t.priority] || '';
    const author = t.author === 'pm' ? 'PM' : (Game.memberById(t.author) ? Game.memberById(t.author).name : t.author);
    const homeTurf = isAssigned && t.author === (state.crew[t.assignee] ? t.assignee : null);

    let statusTag = '';
    if (isAssigned) {
      const m = Game.memberById(t.assignee);
      statusTag = `<span class="tag assigned" style="color:${m.color}">→ ${m.name}</span>`;
    } else if (!av) {
      statusTag = `<span class="tag locked">🔒 locked</span>`;
    }
    const node = el('div', 'ticket card-select ' + (selected ? 'selected ' : '') + (!av ? 'locked ' : '') + type.cls,
      `<div class="ticket-head">
         <span class="points">${type.icon} ${t.points}</span>
         <span class="ttype">${type.label}</span>
         <span class="prio ${prioCls}">${prio}</span>
         ${statusTag}
       </div>
       <div class="ticket-title">${esc(t.title)}</div>
       <div class="ticket-desc">${esc(t.desc)}</div>
       <div class="ticket-foot"><span class="author">by ${esc(author)}</span></div>`);
    node.dataset.tid = t.id;
    return node;
  }

  function bugCard(state, b) {
    const selected = state.selected === b.id;
    const isAssigned = b.status === 'inprogress';
    let statusTag = '';
    if (isAssigned) {
      const m = Game.memberById(b.assignee);
      statusTag = `<span class="tag assigned" style="color:${m.color}">→ ${m.name}</span>`;
    }
    const node = el('div', 'ticket card-select bug ' + (selected ? 'selected ' : ''),
      `<div class="ticket-head"><span class="points">🐞 ${b.points}</span><span class="ttype">Bug</span>${statusTag}</div>
       <div class="ticket-title">${esc(b.title)}</div>
       <div class="ticket-desc">${esc(b.desc)}</div>
       <div class="ticket-foot"><span class="author">hallucinated · to fix</span></div>`);
    node.dataset.tid = b.id;
    return node;
  }

  function backlogPanel(state, onSelect, onEnd) {
    const avail = Game.availableTickets(state).concat(Game.availableBugs(state));
    const panel = el('div', 'backlog');
    panel.appendChild(el('div', 'panel-head', '<span>Backlog</span><span class="hint">click a ticket, then a team member</span>'));

    const list = el('div', 'backlog-list');
    if (avail.length === 0) {
      list.appendChild(el('div', 'empty', 'No available tickets. Complete predecessors to unlock more, or End Sprint.'));
    } else {
      for (const b of state.bugs) {
        if (b.status === 'backlog') list.appendChild(bugCard(state, b));
      }
      const sorted = Game.availableTickets(state).sort((a, b) => {
        const pa = PRIORITY[a.priority] || 9, pb = PRIORITY[b.priority] || 9;
        return pa - pb;
      });
      for (const t of sorted) list.appendChild(ticketCard(state, t));
    }
    panel.appendChild(list);
    return panel;
  }

  // ---------- crew ----------
  function memberCard(state, m) {
    const c = state.crew[m.id];
    const assigned = Object.values(state.tickets).filter((t) => t.status === 'inprogress' && t.assignee === m.id);
    const assignedBugs = state.bugs.filter((b) => b.status === 'inprogress' && b.assignee === m.id);
    const occupied = c.exhausted || c.offline || c.quit;

    const cls = ['member'];
    if (c.quit) {
      cls.push('quit');
    } else {
      if (c.exhausted) cls.push('exhausted');
      if (m.isAI && c.offline) cls.push('offline');
    }
    const card = el('div', cls.join(' '));
    card.style.setProperty('--c', m.color);

    // header
    const head = el('div', 'member-head');
    head.appendChild(el('div', 'avatar', `<span style="background:${m.color}">${m.symbol}</span>`));
    const tags = [];
    if (c.quit) {
      tags.push('<span class="tag quit">QUIT</span>');
    } else {
      if (c.exhausted) tags.push('<span class="tag exhausted">EXHAUSTED · rests this sprint</span>');
      if (m.isAI && c.offline) tags.push('<span class="tag offline">OFFLINE · context maxed</span>');
    }
    head.appendChild(el('div', 'member-id',
      `<div class="member-name">${esc(m.name)} <span class="role">· ${esc(m.role)}</span> ${tags.join(' ')}</div>
       <div class="member-bio">${esc(m.twoLines || '')}</div>`));
    card.appendChild(head);

    // capacity row (hard, visible) + workload
    const cap = Game.memberCap(state, m.id);
    const load = Game.currentLoad(state, m.id);
    const ratio = cap > 0 ? load / cap : 0;
    const capRow = el('div', 'bar-row cap-row',
      `<div class="bar-label">Load</div>${bar(Math.min(100, ratio * 100), ratio >= CONFIG.heavyLoadRatio)}<span class="cap-num">${load}/${Math.round(cap)} <span class="cap-unit">pts</span></span>`);
    const bars = el('div', 'member-bars');
    bars.appendChild(capRow);
    if (m.isAI) {
      const tokRatio = c.tokensUsed / CONFIG.novaTokenBudget;
      const warn = tokRatio >= CONFIG.novaTokenWarnPct;
      bars.appendChild(el('div', 'bar-row',
        `<div class="bar-label">Tokens</div>${bar(Math.min(100, tokRatio * 100), warn)}<span class="cap-num">${c.tokensUsed}/${CONFIG.novaTokenBudget}</span>`));
    } else {
      bars.appendChild(el('div', 'bar-row',
        `<div class="bar-label">Wellbeing</div>${bar(c.wellbeing, c.wellbeing <= CONFIG.quitEventBaseThresh)}<span class="cap-num">${Math.round(c.wellbeing)}</span>`));
    }
    card.appendChild(bars);

    // assigned tickets
    const slot = el('div', 'member-slots');
    if (occupied) {
      slot.appendChild(el('div', 'slot-empty', c.quit ? '— not available (any sprint)' : '— unavailable'));
    } else if (assigned.length === 0 && assignedBugs.length === 0) {
      slot.appendChild(el('div', 'slot-empty', 'No tickets — pick one, then click here'));
    }
    for (const t of assigned) {
      const sc = el('div', 'slot-ticket', `<span class="points">${TYPES[t.type].icon} ${t.remaining}</span> <span>${esc(t.title)}</span>`);
      const rm = el('button', 'slot-x', '✕'); rm.dataset.ticket = t.id;
      sc.appendChild(rm);
      slot.appendChild(sc);
    }
    for (const b of assignedBugs) {
      const sc = el('div', 'slot-ticket bug', `<span class="points">🐞 ${b.remaining}</span> <span>${esc(b.title)}</span>`);
      const rm = el('button', 'slot-x', '✕'); rm.dataset.bug = b.id;
      sc.appendChild(rm);
      slot.appendChild(sc);
    }
    card.dataset.member = m.id;
    card.addEventListener('click', (e) => {
      const x = e.target.closest('[data-ticket]');
      const bx = e.target.closest('[data-bug]');
      if (x) { App.unassign(x.dataset.ticket); return; }
      if (bx) { App.unassignBug(bx.dataset.bug); return; }
      App.assignSelected(m.id);
    });
    card.appendChild(slot);
    return card;
  }

  function teamBoard(state) {
    const board = el('section', 'board');
    const grid = el('div', 'crew-grid');
    for (const m of TEAM) grid.appendChild(memberCard(state, m));
    board.appendChild(grid);
    return board;
  }

  // ---------- layout ----------
  function mainLayout(state) {
    const wrap = el('div', 'main-wrap');
    wrap.appendChild(backlogPanel(state));
    wrap.appendChild(teamBoard(state));
    return wrap;
  }

  // ---------- render ----------
  function render(state) {
    const app = $('#app');
    app.innerHTML = '';
    app.appendChild(topBar(state));
    app.appendChild(mainLayout(state));

    // bind global actions
    app.querySelectorAll('[data-action="endsprint"]').forEach((b) => b.addEventListener('click', App.endSprint));
    app.querySelectorAll('[data-action="new"]').forEach((b) => b.addEventListener('click', App.newGame));

    // ticket selection — click a card to select it, then click a team member
    app.querySelectorAll('.backlog .ticket').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset.tid;
        App.selectTicket(id);
      });
    });

    // clicking empty backdrop deselects
    app.addEventListener('click', (e) => {
      if (!e.target.closest('.ticket') && !e.target.closest('.member')) {
        if (state.selected) { state.selected = null; render(state); }
      }
    });
  }

  // ---------- modal ----------
  function showModal({ title, body, takeaway, win, stars, verdict, actions, onShow }) {
    let m = $('#modal');
    if (!m) { m = el('div', 'modal-backdrop', ''); m.id = 'modal'; document.body.appendChild(m); }
    const starsHtml = win && stars !== undefined
      ? `<div class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>` : '';
    const verdictHtml = verdict ? `<div class="verdict ${win ? (stars !== undefined && stars < 3 ? 'ok' : 'win') : 'fail'}">${esc(verdict)}</div>` : '';
    const modalCls = !win ? 'fail' : (stars !== undefined && stars < 3) ? 'ok' : 'win';
    m.innerHTML = `<div class="modal ${modalCls}">
        ${verdictHtml}
        <div class="modal-title">${esc(title)}</div>
        ${starsHtml}
        <div class="modal-body">${esc(body)}</div>
        <div class="modal-takeaway">${esc(takeaway || '')}</div>
        <div class="modal-actions">
          ${(actions || []).map((a) => `<button class="btn ${a.kind || 'primary'}" data-modal="${a.id}">${esc(a.label)}</button>`).join('')}
        </div>
      </div>`;
    m.style.display = 'flex';
    for (const a of (actions || [])) {
      m.querySelector(`[data-modal="${a.id}"]`).addEventListener('click', () => { m.style.display = 'none'; a.onClick && a.onClick(); });
    }
    if (onShow) onShow();
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

  return { render, showModal, hideModal, toast, el };
})();
