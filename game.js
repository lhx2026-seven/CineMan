'use strict';
const cinemas = {
  C01: { slug:'baogong', name:'寶宮戲院', type:'歷史悠久的大戲院', color:'#ff493d', exterior:'baogong-exterior.webp' },
  C02: { slug:'century', name:'世紀戲院', type:'碩果僅存的老牌二輪戲院', color:'#f57418', exterior:'century-exterior-v2.webp' },
  C03: { slug:'broadway', name:'布洛威影城', type:'小規模連鎖影城', color:'#cd47d6', exterior:'broadway-exterior-v2.webp' },
  C04: { slug:'ylc', name:'YLC影城', type:'結合商場的大型連鎖影城', color:'#338cff', exterior:'ylc-exterior-v2.webp' },
  C05: { slug:'arthouse', name:'公會堂電影中心', type:'公部門支持的藝術電影院', color:'#58c96b', exterior:'arthouse-exterior.webp' },
};
const id = new URLSearchParams(location.search).get('cinema');
const cinema = Object.hasOwn(cinemas, id) ? cinemas[id] : null;
if (!cinema) {
  location.replace('index.html');
} else {
  initGame();
}

function initGame() {
  const runUrl = new URL(location.href);
  let runId = runUrl.searchParams.get('run');
  if (!runId || runId.length > 256) {
    runId = CinemaRules.freshSeed();
    runUrl.searchParams.set('run', runId);
    history.replaceState(null, '', runUrl);
  }
  // Week 1 has no events. Future weekly progression supplies its event list here.
  CinemaEvents.render({events:[]});
  let venueReady = false;
  const venueRetry = document.querySelector('#venue-retry');
  async function loadVenue() {
    venueRetry.hidden = true;
    const message = document.querySelector('#venue-loading');
    message.textContent = '正在分派影廳…';
    try {
      const allocation = await CinemaVenue.assign(id, runId);
      CinemaVenue.render(allocation);
      venueReady = true;
      updateControls();
    } catch (error) {
      message.textContent = '影廳資料暫時無法載入，請重試。';
      venueRetry.hidden = false;
      console.error('Venue allocation failed:', error);
    }
  }
  venueRetry.addEventListener('click', loadVenue);

  document.title = `CineMan｜${cinema.name}・本週營運配置`;
  document.documentElement.style.setProperty('--accent', cinema.color);
  document.querySelector('#cinema-name').textContent = cinema.name;
  document.querySelector('#cinema-type').textContent = cinema.type;
  const exterior = document.querySelector('#cinema-exterior');
  exterior.sizes = '(max-width: 760px) calc(100vw - 20px), (max-width: 992px) 52vw, 510px';
  exterior.srcset = `assets/cinemas/optimized/${cinema.exterior.replace('.webp', '-640.webp')} 640w, assets/cinemas/landscape/${cinema.exterior} 1774w`;
  exterior.fetchPriority = 'high';
  exterior.decoding = 'async';
  exterior.src = `assets/cinemas/landscape/${cinema.exterior}`;
  exterior.alt = `${cinema.name}外觀`;
  const counter = document.querySelector('#cinema-counter');
  const counterVersion = id === 'C02' ? '' : id === 'C01' ? '-v4' : '-v2';
  counter.sizes = '(max-width: 760px) calc(100vw - 32px), 960px';
  counter.srcset = `assets/cinemas/optimized/${cinema.slug}-counter${counterVersion}-960.webp 960w, assets/cinemas/counters/${cinema.slug}-counter${counterVersion}.webp ${id === 'C01' ? 2048 : 1774}w`;
  counter.decoding = 'async';
  counter.src = `assets/cinemas/counters/${cinema.slug}-counter${counterVersion}.webp`;
  document.body.dataset.cinema = cinema.slug;
  counter.alt = `${cinema.name}售票櫃台`;
  document.querySelector('#game-content').hidden = false;
  const reportTabList = document.querySelector('.report-tabs');
  const reportTabs = [...reportTabList.querySelectorAll('[role="tab"]')];
  function activateReport(tab, focus = false) {
    reportTabs.forEach(button => {
      const active = button === tab;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      document.getElementById(button.getAttribute('aria-controls')).hidden = !active;
    });
    if (focus) tab.focus({ preventScroll:true });
  }
  reportTabs.forEach(tab => tab.addEventListener('click', () => activateReport(tab)));
  reportTabList.addEventListener('keydown', event => {
    const index = reportTabs.indexOf(document.activeElement);
    if (index < 0) return;
    let target;
    if (event.key === 'ArrowRight') target = (index + 1) % reportTabs.length;
    else if (event.key === 'ArrowLeft') target = (index + reportTabs.length - 1) % reportTabs.length;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = reportTabs.length - 1;
    else return;
    event.preventDefault();
    activateReport(reportTabs[target], true);
  });
  const form = document.querySelector('#management-form');
  const tabList = document.querySelector('.management-tabs');
  const tabs = [...tabList.querySelectorAll('[role="tab"]')];
  function activateTab(tab, moveFocus = false) {
    const listTop = tabList.getBoundingClientRect().top;
    tabs.forEach(button => {
      const active = button === tab;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      document.getElementById(button.getAttribute('aria-controls')).hidden = !active;
    });
    if (moveFocus) tab.focus({ preventScroll:true });
    if (listTop <= 1) tabList.scrollIntoView({ block:'start' });
  }
  tabs.forEach(tab => tab.addEventListener('click', () => activateTab(tab)));
  tabList.addEventListener('keydown', event => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    let target;
    if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') target = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = tabs.length - 1;
    else return;
    event.preventDefault();
    activateTab(tabs[target], true);
  });
  const draftKey = `cineman.gameDraft.${id}`;
  const draftStatus = document.querySelector('#draft-status');
  let saved = false;
  try {
    const stored = JSON.parse(localStorage.getItem(draftKey) || 'null');
    const draft = stored?.runId === runId ? stored.values : null;
    if (draft && typeof draft === 'object') {
      for (const control of form.elements) {
        if (!control.name || !Object.hasOwn(draft, control.name)) continue;
        if (control.type === 'checkbox') control.checked = draft[control.name] === true;
        else if (control.type === 'radio') control.checked = control.value === draft[control.name];
        else if (typeof draft[control.name] === 'string') control.value = draft[control.name];
      }
      saved = true;
    }
  } catch { /* This preview also works when browser storage is unavailable. */ }

  function updateControls() {
    for (const item of ['poster', 'figure']) {
      const enabled = form.elements[`${item}Enabled`].checked;
      const settings = document.querySelector(`#${item}-settings`);
      settings.hidden = !enabled;
      settings.disabled = !enabled;
      form.elements[`${item}Enabled`].setAttribute('aria-expanded', String(enabled));
    }
    const featured = form.querySelector('input[name="featuredFilm"]:checked');
    document.querySelector('#next-week').disabled = !featured || !venueReady;
    const share = document.querySelector('#featured-share');
    share.disabled = !featured;
    document.querySelector('#share-output').textContent = featured ? `${share.value}%` : '—';
    document.querySelector('#share-hint').textContent = featured ? `${featured.value === 'new-01' ? '新片 01' : '新片 02'}是本週主打片。` : '先選擇一部主打片，再安排場次。';
    form.querySelectorAll('.film-option').forEach(option => {
      const checked = option.querySelector('input').checked;
      option.querySelector('.feature-indicator').firstChild.textContent = checked ? '本週主打片 ' : '設為主打片 ';
      option.querySelector('.feature-indicator > span').textContent = checked ? '●' : '○';
    });
  }
  function saveDraft() {
    const draft = {};
    for (const control of form.elements) {
      if (!control.name) continue;
      if (control.type === 'checkbox') draft[control.name] = control.checked;
      else if (control.type === 'radio') { if (control.checked) draft[control.name] = control.value; }
      else draft[control.name] = control.value;
    }
    try {
      localStorage.setItem(draftKey, JSON.stringify({runId, values:draft}));
      draftStatus.textContent = '本週配置已保留在這個瀏覽器';
      saved = true;
    } catch {
      draftStatus.textContent = '這個瀏覽器無法保存配置，請保持本頁開啟';
      saved = false;
    }
  }
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', () => { updateControls(); saveDraft(); });
  form.addEventListener('change', () => { updateControls(); saveDraft(); });
  updateControls();
  loadVenue();
  document.querySelector('#next-week').addEventListener('click', () => {
    if (!venueReady || !form.querySelector('input[name="featuredFilm"]:checked')) return;
    saveDraft();
    document.querySelector('#dialog-save-status').textContent = saved ? '你的配置已保留，可以繼續調整。' : '目前配置僅保留在本頁，請勿關閉頁面。';
    document.querySelector('#week-dialog').showModal();
  });
  const reveal = () => {
    document.body.classList.add('reveal');
    setTimeout(() => document.body.classList.remove('page-entering', 'reveal'), 500);
  };
  Promise.race([exterior.decode().catch(() => {}), new Promise(resolve => setTimeout(resolve, 350))]).then(reveal);
}
