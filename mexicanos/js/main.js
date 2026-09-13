const Main = (() => {
  let timerInt=null;

  function tickTimer(){
    const s=App.getState();
    if(!s.timer.running || s.timer.done) return;
    s.timer.remaining -= 1;
    if(s.timer.remaining <= 0){
      s.timer.remaining=0; s.timer.running=false; s.timer.done=true;
      SFX.tiempo();
      UI.toast('¡TIEMPO! Show sheets, then reveal!', 2600);
    } else if(s.timer.remaining<=5){
      SFX.tick();
    }
    App.save();
    UI.renderTimer(s.timer);
  }

  function startTimer(){
    const s=App.getState();
    if(s.timer.done || s.timer.running) return;
    SFX.start();
    s.timer.running=true;
    App.save();
    UI.renderTimer(s.timer);
    if(timerInt) clearInterval(timerInt);
    timerInt=setInterval(tickTimer,1000);
  }

  function pauseTimer(){
    const s=App.getState();
    s.timer.running=false;
    App.save();
    UI.renderTimer(s.timer);
    if(timerInt) { clearInterval(timerInt); timerInt=null; }
  }

  function resetTimer(){
    const s=App.getState();
    s.timer.remaining=CONFIG.timerSeconds;
    s.timer.running=false; s.timer.done=false;
    App.save();
    UI.renderTimer(s.timer);
    if(timerInt) { clearInterval(timerInt); timerInt=null; }
    SFX.tick();
  }

  function openQuestion(qid){
    SFX.start();
    App.setCurrentQuestion(qid);
    UI.renderPlay(App.getState());
    if(timerInt){ clearInterval(timerInt); timerInt=null; }
  }

  function revealNext(){
    const s=App.getState();
    if(!s.currentQ) return;
    SFX.start(); SFX.reveal();
    App.revealNext(s.currentQ);
    UI.renderPlay(App.getState());
    if(App.isQuestionDone(s.currentQ)){
      UI.toast('All 5 revealed — tap team icons to score!',2500);
    }
  }

  function bind(){
    document.getElementById('btnMute').addEventListener('click',()=>{
      const s=App.getState();
      s.muted=!s.muted; SFX.setMuted(s.muted); App.save();
      document.getElementById('btnMute').textContent=s.muted?'🔇':'🔊';
    });

    document.getElementById('btnNewGame').addEventListener('click',()=>{
      if(!confirm('Start a new game? Scores will reset.')) return;
      App.reset();
      UI.renderSetup(App.getState());
      UI.toast('New game — edit teams and start!');
    });

    document.getElementById('btnAddTeam').addEventListener('click',()=>{
      SFX.start();
      const t=App.addTeam();
      if(!t) UI.toast('Max '+CONFIG.maxTeams+' teams');
      else UI.renderSetup(App.getState());
    });

    document.getElementById('teamEditor').addEventListener('click',(e)=>{
      const btn=e.target.closest('[data-emoji]');
      if(btn){ UI.openEmojiPicker(btn, btn.dataset.emoji); return; }
      const del=e.target.closest('[data-del]');
      if(del){
        const ok=App.removeTeam(del.dataset.del);
        if(!ok) UI.toast('Need at least '+CONFIG.minTeams+' teams');
        UI.renderSetup(App.getState());
      }
    });
    document.getElementById('teamEditor').addEventListener('input',(e)=>{
      const inp=e.target.closest('[data-name]');
      if(inp) App.updateTeam(inp.dataset.name,{name: inp.value.slice(0,20)});
      const s=App.getState();
      UI.renderScoreStrip(s);
    });

    document.getElementById('btnStartGame').addEventListener('click',()=>{
      const s=App.getState();
      if(s.teams.some(t=>!t.name.trim())){ UI.toast('Give every team a name'); return; }
      SFX.start();
      App.save();
      UI.renderLobby(s);
    });

    document.getElementById('btnFinish').addEventListener('click',()=>{
      SFX.start();
      UI.renderPodium(App.getState());
      SFX.win();
    });

    document.getElementById('btnTimerStart').addEventListener('click', startTimer);
    document.getElementById('btnTimerPause').addEventListener('click', pauseTimer);
    document.getElementById('btnTimerReset').addEventListener('click', resetTimer);
    document.getElementById('btnRevealNext').addEventListener('click', revealNext);
    document.getElementById('btnBackLobby').addEventListener('click',()=>{
      SFX.start();
      App.clearCurrentQuestion();
      if(timerInt){ clearInterval(timerInt); timerInt=null; }
      UI.renderLobby(App.getState());
    });

    document.getElementById('btnPodiumLobby').addEventListener('click',()=>{
      SFX.start();
      UI.renderLobby(App.getState());
    });
    document.getElementById('btnPodiumNew').addEventListener('click',()=>{
      if(!confirm('New game? This clears scores.')) return;
      App.reset();
      UI.renderSetup(App.getState());
    });

    document.addEventListener('keydown',(e)=>{
      const s=App.getState();
      if(e.code==='Space' && s.currentQ){
        const playVisible=!document.getElementById('viewPlay').classList.contains('hidden');
        if(playVisible){ e.preventDefault(); if(!s.timer.done) startTimer(); else revealNext(); }
      }
      if(e.key==='r' || e.key==='R'){
        if(!document.getElementById('viewPlay').classList.contains('hidden')) resetTimer();
      }
      if(e.key==='n' || e.key==='N'){
        if(!document.getElementById('viewPlay').classList.contains('hidden')) revealNext();
      }
    });
  }

  function isUnlocked(){
    try { return sessionStorage.getItem('mexicanos-unlocked') === '1'; } catch(e){ return false; }
  }
  function setUnlocked(){
    try { sessionStorage.setItem('mexicanos-unlocked','1'); } catch(e){}
  }
  function showLock(){
    const overlay=document.getElementById('lockOverlay');
    if(overlay) overlay.style.display='flex';
  }
  function hideLock(){
    const overlay=document.getElementById('lockOverlay');
    if(overlay) overlay.style.display='none';
  }
  function tryUnlock(){
    const inp=document.getElementById('lockInput');
    const val=(inp && inp.value || '').trim();
    if(val===CONFIG.passcode){
      SFX.start(); SFX.ding();
      setUnlocked(); hideLock();
      bootApp();
    } else {
      SFX.buzz();
      if(inp){ inp.value=''; inp.placeholder='Wrong — try again'; inp.classList.add('shake'); setTimeout(()=>inp.classList.remove('shake'),400); inp.focus(); }
      UI.toast('Wrong passcode');
    }
  }
  function bootApp(){
    const s=App.ensureState();
    SFX.setMuted(!!s.muted);
    const muteBtn=document.getElementById('btnMute');
    if(muteBtn) muteBtn.textContent=s.muted?'🔇':'🔊';
    bind();
    if(s.currentQ) UI.renderPlay(s);
    else if(s.teams && s.teams.length) {
      const hasScores = Object.values(s.scores).some(v=>v>0) || QUESTIONS.some(q=> (s.questionState[q.id]?.revealed||0)>0);
      if(hasScores) UI.renderLobby(s);
      else UI.renderSetup(s);
    } else UI.renderSetup(s);
  }
  function boot(){
    if(!isUnlocked()){
      showLock();
      const btn=document.getElementById('lockBtn');
      const inp=document.getElementById('lockInput');
      if(btn) btn.addEventListener('click', tryUnlock);
      if(inp) inp.addEventListener('keydown', (e)=>{ if(e.key==='Enter') tryUnlock(); });
      // keep app hidden behind lock until unlocked
      return;
    }
    hideLock();
    bootApp();
  }

  document.addEventListener('DOMContentLoaded', boot);
  return { openQuestion, revealNext };
})();
