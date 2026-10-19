'use strict';
(function() {
  const toggle=document.querySelector('#auto-save-toggle'),resume=document.querySelector('#resume-game');
  const label=document.querySelector('#saved-game-label'),status=document.querySelector('#auto-save-status');
  const drawer=document.querySelector('#save-drawer'),list=document.querySelector('#save-list'),clear=document.querySelector('#clear-saves');
  let refreshing=0;
  function setOpen(open) { drawer.hidden=!open;resume.setAttribute('aria-expanded',String(open)); }
  async function continueRun(runId) {
    try {
      const record=await CinemaSave.getByRun(runId);if(!record){await refresh();return;}
      location.assign(`game.html?cinema=${encodeURIComponent(record.cinemaID)}&run=${encodeURIComponent(record.runId)}&resume=1&v=autosave-v23`);
    } catch {status.textContent='無法讀取存檔，請重試。';}
  }
  async function refresh() {
    const token=++refreshing;
    try {
      const settings=await CinemaSave.getSettings();
      let records=[],recordError=false;
      try { records=await CinemaSave.list(); } catch { recordError=true; }
      if(token!==refreshing)return;
      toggle.disabled=false;toggle.setAttribute('aria-checked',String(settings.enabled));
      document.querySelector('#auto-save-value').textContent=settings.enabled?'ON':'OFF';
      resume.disabled=!records.length;
      label.textContent=records.length>1?`${records.length} 筆存檔`:records.length?CinemaSave.label(records[0]):recordError?'存檔無法讀取':'尚無存檔';status.textContent='';
      list.replaceChildren();
      records.forEach(record=>{
        const button=document.createElement('button');button.type='button';button.textContent=CinemaSave.label(record);
        button.addEventListener('click',()=>continueRun(record.runId));list.append(button);
      });
      if(!records.length)setOpen(false);
    } catch {
      if(token!==refreshing)return;toggle.disabled=true;resume.disabled=true;setOpen(false);
      toggle.setAttribute('aria-checked','false');document.querySelector('#auto-save-value').textContent='OFF';
      label.textContent='';status.textContent='此瀏覽器暫時無法使用自動存檔。';
    }
  }
  toggle.addEventListener('click',async()=>{
    toggle.disabled=true;
    try { await CinemaSave.setEnabled(toggle.getAttribute('aria-checked')!=='true');await refresh(); }
    catch {status.textContent='無法更新自動存檔設定，請重試。';toggle.disabled=false;}
  });
  resume.addEventListener('click',()=>setOpen(drawer.hidden));
  clear.addEventListener('click',async()=>{
    if(!window.confirm('確定清空所有經營紀錄？此操作無法復原。'))return;
    clear.disabled=true;
    try {await CinemaSave.clear();await refresh();}
    catch {status.textContent='清空紀錄失敗，請重試。';}
    finally {clear.disabled=false;}
  });
  CinemaSave.subscribe(refresh);window.addEventListener('focus',refresh);window.addEventListener('pageshow',refresh);refresh();
})();
