'use strict';
const cinemas = {
  C01: { slug:'baogong', name:'寶宮戲院', type:'歷史悠久的大戲院', color:'#ff493d', exterior:'baogong-exterior.webp' },
  C02: { releaseType:'second_run', slug:'century', name:'世紀戲院', type:'碩果僅存的老牌二輪戲院', color:'#f57418', exterior:'century-exterior-v2.webp' },
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
  const specialScreenings=document.querySelector('.special-screenings');
  specialScreenings.hidden=['C02','C05'].includes(id);
  specialScreenings.disabled=specialScreenings.hidden;
  const secondRun=cinema.releaseType==='second_run';
  const standardPricing=document.querySelector('#standard-ticket-pricing');
  const secondRunPricing=document.querySelector('#second-run-pricing');
  standardPricing.hidden=secondRun;standardPricing.disabled=secondRun;
  secondRunPricing.hidden=!secondRun;secondRunPricing.disabled=!secondRun;
  if(id==='C05') {
    for(const name of ['ticketDiscount','ticketMorning']) {
      const input=standardPricing.querySelector(`[name="${name}"]`);
      input.disabled=true;input.closest('label').hidden=true;
    }
    standardPricing.querySelector('.standard-ticket-grid').style.gridTemplateColumns='repeat(2,minmax(0,1fr))';
  }
  const runUrl = new URL(location.href);
  const freshEntry=runUrl.searchParams.get('fresh')==='1' && runUrl.searchParams.get('resume')!=='1';
  if(freshEntry){runUrl.searchParams.delete('fresh');history.replaceState(null,'',runUrl);}
  let runId = runUrl.searchParams.get('run');
  if (!runId || runId.length > 256) {
    runId = CinemaRules.freshSeed();
    runUrl.searchParams.set('run', runId);
    history.replaceState(null, '', runUrl);
  }
  // Week 1 has no events. Future weekly progression supplies its event list here.
  CinemaEvents.render({events:[]});
  let restoredDraft = null;
  let exclusiveFood = null;
  let property = null;
  let checkpoint = null, currentAllocation = null, restoring = true, bootFailed = false, storeAvailable = true;
  let saveQueue = Promise.resolve(false), saveRevision = 0;
  const gameDate = {year:2026,week:1};
  let venueReady = false;
  let venueScreenCount = 0;
  const venueRetry = document.querySelector('#venue-retry');
  async function loadVenue() {
    venueRetry.hidden = true;
    const message = document.querySelector('#venue-loading');
    message.hidden = true;
    try {
      const allocation = await CinemaVenue.assign(id, runId, checkpoint?.allocation);
      CinemaVenue.render(allocation);
      renderSpecialPricing(allocation);
      venueScreenCount = allocation.screenCount;
      films.setVenue(venueScreenCount,gameDate.week);
      const share = document.querySelector('#featured-share');
      const capacity = CinemaFilms.screeningCapacity(venueScreenCount);
      let slots = capacity - 1;
      if (typeof restoredDraft?.featuredSlots === 'string' && Number.isFinite(Number(restoredDraft.featuredSlots))) {
        slots = Math.round(Number(restoredDraft.featuredSlots));
      } else if (typeof restoredDraft?.featuredShare === 'string' && Number.isFinite(Number(restoredDraft.featuredShare))) {
        slots = Math.round(capacity * Number(restoredDraft.featuredShare) / 100);
      }
      share.max = String(capacity);
      share.value = String(Math.max(0,Math.min(capacity,slots)));
      currentAllocation = allocation;
      venueReady = true;
      updateControls();
      saveDraft();
    } catch (error) {
      message.hidden = false;
      message.textContent = '影廳資料暫時無法載入，請重試。';
      venueRetry.hidden = false;
      console.error('Venue allocation failed:', error);
    }
  }
  venueRetry.addEventListener('click', () => bootFailed ? bootstrap() : loadVenue());

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
  CinemaParameters.apply(form,id);
  const films = CinemaFilms.init(form);
  function renderProperty() {
    const location=CinemaDatabase.locations.find(location=>location.locationID===property.locationID);
    const summary=document.querySelector('#property-summary');
    summary.textContent=`${location.name} · ${property.tenure==='owned'?'自有土地':'承租場地'}`;summary.hidden=false;
    const report=document.querySelector('#financial-report');
    report.dataset.rentalActive=String(property.rentalActive);report.dataset.realEstateTaxActive=String(property.realEstateTaxActive);
    const field=document.querySelector('#activation-field'),input=form.elements.activationRate;
    field.hidden=!property.hasSpace;input.disabled=!property.hasSpace;
    if(property.hasSpace){
      const activity=CinemaProperty.ACTIVITIES[property.activationType];
      document.querySelector('#activation-name').textContent=activity.name;
      document.querySelector('#activation-kind').textContent=`（${activity.unit}）`;
      for(const key of ['min','max','step'])input[key]=String(activity[key]);
      input.value=input.min;
      if(!input.classList.contains('amount-range'))CinemaParameters.makeSlider(input);
      input.setAttribute('aria-label',`${activity.name}，${activity.unit}`);
    }
  }
  function setBudgetLocks(locks = {}) {
    for (const name of ['maintenance','consumables']) {
      const control = form.elements[name], reason = locks[name];
      const locked = !!reason;
      control.disabled = locked;
      control.closest('.budget-field').classList.toggle('is-locked', locked);
      const badge = document.querySelector(`#${name}-lock`);
      badge.hidden = !locked;
      if (locked) { control.setAttribute('aria-describedby', badge.id); badge.title = typeof reason === 'string' ? reason : '鎖定'; }
      else control.removeAttribute('aria-describedby');
    }
  }
  window.CinemaManagement = {setBudgetLocks(locks){setBudgetLocks(locks);saveDraft();}};
  setBudgetLocks();
  function renderSpecialPricing(allocation) {
    const formats = [...new Set(allocation.screens.filter(screen => screen.type === 'EXTRA')
      .map(screen => screen.name.replace(/\s*\([^)]*\)$/, '')))];
    const fields = formats.map(format => {
      const label = document.createElement('label'); label.className = 'field';
      const title = document.createElement('span'); title.textContent = `${format}廳`;
      const wrap = document.createElement('span'); wrap.className = 'input-wrap';
      const currency = document.createElement('span'); currency.textContent = 'NT$';
      const input = document.createElement('input'); input.type = 'number';
      input.name = `ticketExtra_${format.replace(/[^a-zA-Z0-9]/g, '')}`;
      input.min = '0'; input.step = '1'; input.placeholder = '—'; input.inputMode = 'numeric';
      CinemaParameters.applyTo(input,id);
      if (typeof restoredDraft?.[input.name] === 'string') input.value = restoredDraft[input.name];
      wrap.append(currency, input);CinemaParameters.makeSlider(input); label.append(title, wrap);label.htmlFor=input.id; return label;
    });
    document.querySelector('#special-ticket-fields').replaceChildren(...fields);
    document.querySelector('#special-ticket-group').hidden = !formats.length;
  }

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
  form.inert = true;
  async function bootstrap() {
    restoring=true;form.inert=true;
    bootFailed = false;venueRetry.hidden = true;
    try {
      const [settings,record] = freshEntry ? [{enabled:null},null] : await Promise.all([
        CinemaSave.getSettings(),
        CinemaSave.getByRun(runId).catch(error=>{if(runUrl.searchParams.get('resume')==='1')throw error;return null;})
      ]);
      checkpoint = record?.cinemaID === id && record.runId === runId ? record : null;
      if (runUrl.searchParams.get('resume') === '1' && !checkpoint) throw Error('找不到這一局的存檔');
      property=CinemaProperty.resolve(CinemaDatabase,id,runId,checkpoint?.property);
      renderProperty();
      exclusiveFood=checkpoint && Object.hasOwn(checkpoint,'exclusiveFood') ? checkpoint.exclusiveFood : CinemaFood.draw(`${id}/${runId}`);
      if(exclusiveFood!==null && !CinemaFood.PRODUCTS.includes(exclusiveFood))throw Error('獨家餐飲存檔無法讀取');
      document.querySelector('#exclusive-food').hidden=exclusiveFood===null;
      document.querySelector('#exclusive-food-name').textContent=exclusiveFood || '';
      form.elements.exclusiveFoodPrice.disabled=exclusiveFood===null;
      restoredDraft = checkpoint?.values || null;
      if (!restoredDraft && settings.enabled) {
        // One-time compatibility read; all new writes go exclusively to IndexedDB.
        try { const legacy=JSON.parse(localStorage.getItem(draftKey)||'null');if(legacy?.runId===runId)restoredDraft=legacy.values; } catch {}
      }
      if (checkpoint) {
        gameDate.year=checkpoint.year;gameDate.week=checkpoint.week;
        document.querySelector('.workspace-bar .week-badge').textContent=`${gameDate.year} W${gameDate.week}`;
        document.querySelector('#report-weekly .report-period').textContent=`${gameDate.year} W${gameDate.week}`;
        document.querySelector('#report-annual .report-period').textContent=String(gameDate.year);
        document.querySelector('#report-weekly caption').textContent=`${gameDate.year} W${gameDate.week} 週報，結算規則尚未設定，金額均待結算`;
        document.querySelector('#report-annual caption').textContent=`${gameDate.year} 年報，結算規則尚未設定，金額均待結算`;
      }
      if (restoredDraft) {
        for (const control of form.elements) {
          if (!control.name || CinemaParameters.isDerived(control.name) || !Object.hasOwn(restoredDraft,control.name)) continue;
          if (control.type==='checkbox') control.checked=restoredDraft[control.name]===true;
          else if(control.type==='radio')control.checked=control.value===restoredDraft[control.name];
          else if(typeof restoredDraft[control.name]==='string')control.value=control.classList.contains('amount-range') && restoredDraft[control.name]==='' ? control.min : restoredDraft[control.name];
        }
      }
      for(const name of ['posterQuantity','figureQuantity']) {
        const quantity=form.elements[name];
        if(!Number.isInteger(quantity.valueAsNumber)||quantity.valueAsNumber<1)quantity.value='1';
      }
      setBudgetLocks(checkpoint?.budgetLocks || {});
      if (checkpoint?.tabID) { const tab=tabs.find(t=>t.id===checkpoint.tabID);if(tab)activateTab(tab); }
      if (checkpoint?.reportTabID) { const tab=reportTabs.find(t=>t.id===checkpoint.reportTabID);if(tab)activateReport(tab); }
      if (checkpoint?.detailsOpen) {
        document.querySelector('#venue-details-title').setAttribute('aria-expanded','true');
        document.querySelector('#venue-details-panel').hidden=false;
      }
      storeAvailable=true;
      draftStatus.textContent=settings.enabled===false?'自動存檔 OFF':'';
    } catch(error) {
      storeAvailable=false;
      if(runUrl.searchParams.get('resume')==='1' || checkpoint) {
        bootFailed=true;venueRetry.hidden=false;
        document.querySelector('#venue-loading').hidden=false;
        document.querySelector('#venue-loading').textContent='無法讀取存檔，請重試或返回首頁。';
        draftStatus.textContent='存檔尚未讀取，沒有重新分派場地。';
        form.inert=false;return;
      }
      if(!property){property=CinemaProperty.draw(CinemaDatabase,id,runId);renderProperty();}
      draftStatus.textContent='自動存檔暫時無法使用，本次設定尚未保存。';
    }
    restoring=false;form.inert=false;
    films.restoreView();updateControls();await loadVenue();
  }

  function updateControls() {
    CinemaParameters.updateDerived(form);
    CinemaParameters.syncSliders(form);
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
    share.disabled = !featured || !venueReady;
    const percentage = venueReady ? CinemaFilms.sharePercentage(Number(share.value),venueScreenCount) : 0;
    const formattedShare = percentage.toLocaleString('zh-TW',{maximumFractionDigits:2}) + '%';
    document.querySelector('#share-output').textContent = featured && venueReady ? formattedShare : '—';
    if (venueReady) share.setAttribute('aria-valuetext',`${formattedShare}（${share.value}／${share.max}場）`);
    document.querySelector('#featured-settings').hidden = !featured;
    if (featured) document.querySelector('#featured-heading').textContent = `選擇${films.titleFor(featured.value)}為本週主打，場次占比`;
    films.update();
  }
  function saveDraft(stageForNavigation=false) {
    if(restoring || !venueReady || !storeAvailable)return saveQueue;
    const values = {};
    for (const control of form.elements) {
      if (!control.name || CinemaParameters.isDerived(control.name) || control.closest('.special-screenings')?.disabled || (control.name==='activationRate'&&!property?.hasSpace)) continue;
      if (control.type==='checkbox')values[control.name]=control.checked;
      else if(control.type==='radio'){if(control.checked)values[control.name]=control.value;}
      else values[control.name]=control.value;
    }
    const budgetLocks=Object.fromEntries(['maintenance','consumables'].map(name=>[name,form.elements[name].disabled ? document.querySelector(`#${name}-lock`).title || true : false]));
    const snapshot={cinemaID:id,cinemaName:cinema.name,runId,year:gameDate.year,week:gameDate.week,
      values,allocation:currentAllocation,exclusiveFood,property,budgetLocks,
      tabID:tabs.find(tab=>tab.getAttribute('aria-selected')==='true')?.id,
      reportTabID:reportTabs.find(tab=>tab.getAttribute('aria-selected')==='true')?.id,
      detailsOpen:document.querySelector('#venue-details-title').getAttribute('aria-expanded')==='true'};
    if(stageForNavigation===true)CinemaSave.stageNavigation(snapshot);
    const revision=++saveRevision;
    draftStatus.textContent='自動存檔中…';
    // Start the transaction immediately, including before navigation/refresh.
    // IndexedDB orders overlapping readwrite transactions on these stores.
    saveQueue=CinemaSave.save(snapshot).then(written=>{
      if(revision===saveRevision){saved=written;draftStatus.textContent=written?'已自動存檔':'自動存檔 OFF';}return written;
    }).catch(()=>{if(revision===saveRevision){saved=false;draftStatus.textContent='自動存檔失敗，本次設定尚未保存。';}return false;});
    return saveQueue;
  }
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', () => { updateControls(); saveDraft(); });
  form.addEventListener('change', () => { updateControls(); saveDraft(); });
  updateControls();
  const ready=bootstrap();
  const homePrefetch=document.createElement('link');homePrefetch.rel='prefetch';homePrefetch.as='document';homePrefetch.href=document.querySelector('.logo a').href;document.head.append(homePrefetch);
  for (const list of [tabList,reportTabList]) {
    list.addEventListener('click',()=>saveDraft());
    list.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key))saveDraft();});
  }
  document.querySelector('#venue-details-title').addEventListener('click',()=>saveDraft());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)saveDraft();});
  window.addEventListener('pagehide',()=>saveDraft());
  document.querySelector('.logo a').addEventListener('click',event=>{
    if(event.button!==0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;
    // Let the native link navigate immediately. The homepage can finish the
    // checkpoint if this page's in-flight IndexedDB transaction is interrupted.
    saveDraft(true);
  });
  document.querySelector('#next-week').addEventListener('click', async () => {
    if (!venueReady || !form.querySelector('input[name="featuredFilm"]:checked')) return;
    await saveDraft();
    document.querySelector('#dialog-save-status').textContent = saved ? '你的配置已保留，可以繼續調整。' : '目前配置僅保留在本頁，請勿關閉頁面。';
    document.querySelector('#week-dialog').showModal();
  });
  const reveal = () => {
    document.body.classList.add('reveal');
    setTimeout(() => document.body.classList.remove('page-entering', 'reveal'), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500);
  };
  ready.then(reveal);
}
