const UI = (() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];

  function toast(msg, ms=2200){
    const root=$('#toastRoot'); if(!root) return;
    const t=document.createElement('div'); t.className='toast'; t.textContent=msg;
    root.appendChild(t); setTimeout(()=>t.remove(),ms);
  }

  function renderScoreStrip(state){
    const root=$('#scoreStrip'); if(!root) return;
    root.innerHTML='';
    for(const team of state.teams){
      const score=state.scores[team.id]||0;
      const chip=document.createElement('div'); chip.className='score-chip';
      chip.innerHTML=`<span style="display:flex;align-items:center;gap:8px"><span class="dot" style="background:${team.color}"></span><span>${team.emoji} ${escapeHtml(team.name)}</span></span><b>${score}</b>`;
      root.appendChild(chip);
    }
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  function showView(id){
    for(const v of $$('.view')) v.classList.add('hidden');
    const el=document.getElementById(id); if(el) el.classList.remove('hidden');
  }

  function renderSetup(state){
    showView('viewSetup');
    renderScoreStrip(state);
    const editor=$('#teamEditor'); editor.innerHTML='';
    for(const team of state.teams){
      const row=document.createElement('div'); row.className='team-row';
      row.innerHTML=`
        <button class="emoji-btn" data-emoji="${team.id}" aria-label="Pick emoji">${team.emoji}</button>
        <span class="color-dot" style="background:${team.color}"></span>
        <input data-name="${team.id}" value="${escapeHtml(team.name)}" maxlength="20" placeholder="Team name">
        <button class="icon-del" data-del="${team.id}" title="Remove">✕</button>
      `;
      editor.appendChild(row);
    }
    $('#btnAddTeam').disabled = state.teams.length >= CONFIG.maxTeams;
    $$('[data-del]').forEach(b=>{
      if(state.teams.length<=CONFIG.minTeams) b.disabled=true;
    });
  }

  function renderLobby(state){
    showView('viewLobby');
    renderScoreStrip(state);
    const grid=$('#questionGrid'); grid.innerHTML='';
    QUESTIONS.forEach((q,i)=>{
      const done = (state.questionState[q.id]?.revealed||0) >= 5;
      const revealed = state.questionState[q.id]?.revealed||0;
      const card=document.createElement('div'); card.className='q-card'+(done?' done':'');
      card.dataset.qid=q.id;
      card.innerHTML=`
        <div class="q-num">QUESTION ${i+1} · ${done?'DONE': revealed? revealed+'/5 REVEALED' : 'READY'}</div>
        <div class="q-text" style="font-size:22px">🔒 Secret — tap to reveal on TV</div>
        <div class="q-hint">${done? 'Completed' : revealed? 'In progress — continue on TV' : 'Hidden until you open it'}</div>
        <div class="q-meta"><span class="q-pill">5 answers</span><span class="q-pill">reveal bottom → top · 5 → 50</span></div>
      `;
      card.addEventListener('click',()=> Main.openQuestion(q.id));
      grid.appendChild(card);
    });
  }

  function renderPlay(state){
    showView('viewPlay');
    renderScoreStrip(state);
    const q=App.questionById(state.currentQ);
    if(!q) return;
    $('#playQNum').textContent='QUESTION '+(QUESTIONS.findIndex(x=>x.id===q.id)+1)+' OF '+QUESTIONS.length;
    $('#playQText').textContent=q.q;
    $('#playQHint').textContent=q.hint;
    renderTimer(state.timer);
    renderAnswers(state, q);
    const qs=state.questionState[q.id];
    const order=App.revealOrder(q);
    const allRevealed = qs.revealed >= order.length;
    const btn=$('#btnRevealNext');
    btn.textContent = allRevealed ? 'All revealed ✓' : `Reveal next ↑ (${qs.revealed}/${order.length})`;
    btn.disabled = allRevealed;
  }

  function renderTimer(timer){
    const box=$('#timerBox'); const num=$('#timerNum'); const label=$('#timerLabel'); const fg=$('#timerFg');
    if(!box) return;
    num.textContent=String(timer.remaining);
    const pct = 1 - timer.remaining / CONFIG.timerSeconds;
    const circ = 2*Math.PI*44;
    const off = circ * pct;
    fg.style.strokeDasharray=String(circ);
    fg.style.strokeDashoffset=String(off);
    box.classList.toggle('urgent', timer.remaining<=10 && timer.remaining>0 && timer.running);
    box.classList.toggle('done', timer.done);
    if(timer.done){ label.textContent='¡TIEMPO! — reveal answers ↑'; box.classList.add('flash'); setTimeout(()=>box.classList.remove('flash'),700); }
    else if(timer.running){ label.textContent='Debate! All teams discuss…'; }
    else if(timer.remaining===CONFIG.timerSeconds){ label.textContent='Press Start — all teams debate!'; }
    else { label.textContent='Paused — resume or reset'; }
    $('#btnTimerStart').textContent = timer.running ? 'Running…' : (timer.done ? 'Finished' : `Start ${CONFIG.timerSeconds}s`);
    $('#btnTimerStart').disabled = timer.running || timer.done;
    $('#btnTimerPause').disabled = !timer.running;
    $('#btnTimerPause').textContent = timer.running ? 'Pause' : 'Paused';
  }

  function renderAnswers(state, q){
    const list=$('#answerList'); list.innerHTML='';
    const qs=state.questionState[q.id];
    const orderAsc=App.revealOrder(q);
    const displayOrder=[...orderAsc].reverse();
    displayOrder.forEach((ans, displayIdx)=>{
      const ascIdx = orderAsc.findIndex(a=>a.origIdx===ans.origIdx);
      const revealed = ascIdx < qs.revealed;
      const card=document.createElement('div'); card.className='answer-card '+(revealed?'revealed':'hiddenAns');
      const left=document.createElement('div'); left.className='answer-left';
      left.innerHTML=`<div class="answer-rank">${ans.rank+1}</div><div><div class="answer-text">${revealed? escapeHtml(ans.text) : '•••••••••••••••••'}</div><div style="font-size:11px;color:#64748b">${revealed? 'Survey: '+ans.survey+'% · Rank #'+(ans.rank+1) : 'Hidden — reveal bottom → top'}</div></div>`;
      const badge=document.createElement('span'); badge.className='answer-points'; badge.textContent = revealed? ans.points+' pts' : '? pts';
      const leftWrap=document.createElement('div'); leftWrap.style.display='flex'; leftWrap.style.alignItems='center'; leftWrap.style.gap='8px'; leftWrap.append(left,badge);
      const actions=document.createElement('div'); actions.className='answer-actions';
      for(const team of state.teams){
        const key=ans.origIdx+'|'+team.id;
        const active=!!qs.awards[key];
        const chip=document.createElement('button'); chip.className='team-chip'+(active?' active':'');
        chip.dataset.award=key; chip.dataset.qid=q.id;
        chip.style.borderColor=active? team.color : '#e2e8f0';
        chip.innerHTML=`<span class="chip-emoji">${team.emoji}</span><span>${escapeHtml(team.name.slice(0,10))}</span><span style="font-size:11px;opacity:.7">${active? '+'+ans.points : '+0'}</span>`;
        if(!revealed) chip.disabled=true;
        chip.addEventListener('click', (e)=>{
          e.stopPropagation();
          const added=App.toggleAward(q.id, ans.origIdx, team.id);
          SFX.start();
          if(added) SFX.ding(); else SFX.tick();
          renderScoreStrip(App.getState());
          renderAnswers(App.getState(), q);
        });
        actions.appendChild(chip);
      }
      card.append(leftWrap, actions);
      list.appendChild(card);
    });
  }

  function renderPodium(state){
    showView('viewPodium');
    renderScoreStrip(state);
    const sorted=App.podium();
    const board=$('#podiumBoard'); board.innerHTML='';
    const order=[1,0,2];
    const labels=['2ND','1ST','3RD']; const classes=['silver','gold','bronze']; const medals=['🥈','🥇','🥉'];
    for(let i=0;i<3;i++){
      const idx=order[i];
      const entry=sorted[idx];
      const col=document.createElement('div'); col.className='podium-col '+classes[i];
      if(!entry) col.innerHTML=`<div class="podium-medal">${medals[i]}</div><div class="podium-name" style="color:#94a3b8">—</div><div class="podium-score">—</div>`;
      else col.innerHTML=`<div class="podium-medal">${medals[i]}</div><div class="podium-name">${entry.team.emoji} ${escapeHtml(entry.team.name)}</div><div class="podium-score" style="color:${entry.team.color}">${entry.score} pts</div><div style="font-size:12px;color:#64748b">${labels[i]}</div>`;
      if(i===1) col.style.transform='translateY(-8px)';
      board.appendChild(col);
    }
    const list=$('#podiumList'); list.innerHTML='';
    sorted.forEach((e,i)=>{
      const row=document.createElement('div'); row.className='podium-row';
      row.innerHTML=`<span><b>#${i+1}</b> ${e.team.emoji} ${escapeHtml(e.team.name)}</span><b style="color:${e.team.color}">${e.score} pts</b>`;
      list.appendChild(row);
    });
    spawnConfetti();
  }

  function spawnConfetti(){
    const root=$('#confetti'); if(!root) return;
    root.innerHTML='';
    const colors=['#e11d48','#f59e0b','#0ea5e9','#10b981','#8b5cf6','#ec4899'];
    for(let i=0;i<90;i++){
      const el=document.createElement('i');
      el.style.left=(Math.random()*100)+'%';
      el.style.setProperty('--c', colors[i%colors.length]);
      el.style.animationDelay=(Math.random()*0.6)+'s';
      el.style.animationDuration=(1.6+Math.random()*1.2)+'s';
      root.appendChild(el);
    }
    setTimeout(()=>{ if(root) root.innerHTML=''; }, 3500);
  }

  let emojiPicker=null;
  function openEmojiPicker(anchor, teamId){
    closeEmojiPicker();
    const rect=anchor.getBoundingClientRect();
    const pop=document.createElement('div'); pop.className='emoji-pop';
    EMOJIS.forEach(em=>{
      const b=document.createElement('button'); b.textContent=em;
      b.addEventListener('click',()=>{
        App.updateTeam(teamId,{emoji:em});
        renderSetup(App.getState());
        closeEmojiPicker();
      });
      pop.appendChild(b);
    });
    document.body.appendChild(pop);
    const w=pop.offsetWidth|| 280;
    pop.style.left=Math.min(window.innerWidth - w - 8, rect.left)+'px';
    pop.style.top=(rect.bottom+6)+'px';
    emojiPicker=pop;
    setTimeout(()=>{
      const h=e=>{ if(!pop.contains(e.target) && e.target!==anchor) closeEmojiPicker(); document.removeEventListener('click',h); };
      document.addEventListener('click',h);
    },0);
  }
  function closeEmojiPicker(){ if(emojiPicker){ emojiPicker.remove(); emojiPicker=null; } }

  return { toast, renderSetup, renderLobby, renderPlay, renderPodium, renderScoreStrip, renderTimer, openEmojiPicker, closeEmojiPicker, showView, escapeHtml };
})();
