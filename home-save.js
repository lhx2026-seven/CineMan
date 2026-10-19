'use strict';
(function() {
  const toggle=document.querySelector('#auto-save-toggle'),resume=document.querySelector('#resume-game');
  const label=document.querySelector('#saved-game-label'),status=document.querySelector('#auto-save-status');
  let refreshing=0;
  async function refresh() {
    const token=++refreshing;
    try {
      const settings=await CinemaSave.getSettings();
      let record=null, recordError=false;
      try { record=await CinemaSave.getLatest(); } catch { recordError=true; }
      if(token!==refreshing)return;
      toggle.disabled=false;toggle.setAttribute('aria-checked',String(settings.enabled));
      document.querySelector('#auto-save-value').textContent=settings.enabled?'ON':'OFF';
      resume.disabled=!record;label.textContent=record?CinemaSave.label(record):recordError?'存檔無法讀取':'尚無存檔';status.textContent='';
    } catch {
      if(token!==refreshing)return;toggle.disabled=true;resume.disabled=true;
      toggle.setAttribute('aria-checked','false');document.querySelector('#auto-save-value').textContent='OFF';
      label.textContent='';status.textContent='此瀏覽器暫時無法使用自動存檔。';
    }
  }
  toggle.addEventListener('click',async()=>{
    toggle.disabled=true;
    try { await CinemaSave.setEnabled(toggle.getAttribute('aria-checked')!=='true');await refresh(); }
    catch {status.textContent='無法更新自動存檔設定，請重試。';toggle.disabled=false;}
  });
  resume.addEventListener('click',async()=>{
    resume.disabled=true;
    try {
      const record=await CinemaSave.getLatest();if(!record){await refresh();return;}
      location.assign(`game.html?cinema=${encodeURIComponent(record.cinemaID)}&run=${encodeURIComponent(record.runId)}&resume=1&v=autosave-v22`);
    } catch {status.textContent='無法讀取存檔，請重試。';resume.disabled=false;}
  });
  CinemaSave.subscribe(refresh);window.addEventListener('focus',refresh);window.addEventListener('pageshow',refresh);refresh();
})();
