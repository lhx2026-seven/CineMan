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
  // Start empty; loading the saved operating week supplies its movie events.
  CinemaEvents.render({events:[]});
  let restoredDraft = null;
  let exclusiveFood = null;
  let property = null, activation = null;
  let movies = null;
  let boxOffice=null,foodRevenue=null,merchandise=null,advancing=false,annualMeeting=null;
  let checkpoint = null, currentAllocation = null, restoring = true, bootFailed = false, storeAvailable = true;
  let saveQueue = Promise.resolve(false), saveRevision = 0;
  const gameDate = {year:2022,week:1};
  const currentWeek=()=>CinemaMovieRules.absoluteWeek(gameDate.year,gameDate.week)+(annualMeeting?.settled?1:0);
  const displayPeriod=()=>annualMeeting?.settled?`${gameDate.year}年度會議`:`${gameDate.year} W${gameDate.week}`;
  let venueReady = false;
  let venueScreenCount = 0;
  const venueRetry = document.querySelector('#venue-retry');
  async function loadVenue() {
    venueRetry.hidden = true;
    const message = document.querySelector('#venue-loading');
    message.hidden = true;
    try {
      const allocation = await CinemaVenue.assign(id, runId, checkpoint?.allocation, property.locationID);
      movies=CinemaMovieRules.resolve(CinemaMovieDatabase,runId,allocation.screenCount,gameDate.year,gameDate.week,checkpoint?.movies);
      movies=CinemaBoxOffice.hydrate(CinemaMovieDatabase,movies);
      boxOffice=CinemaBoxOffice.resolveLedger(checkpoint?.boxOffice,currentWeek());
      foodRevenue=CinemaConcessions.resolve(checkpoint?.foodRevenue,currentWeek());
      merchandise=CinemaMerchandise.resolve(checkpoint?.merchandise,currentWeek());
      if(!annualMeeting?.settled)movies=CinemaBoxOffice.retireLowGross(movies,boxOffice);
      renderMovieWeek(restoredDraft||{});
      renderBulletin();
      CinemaVenue.render(allocation);
      renderSpecialPricing(allocation);
      venueScreenCount = allocation.screenCount;
      films.setVenue(venueScreenCount,gameDate.week);
      const share = document.querySelector('#featured-share');
      const capacity = CinemaFilms.screeningCapacity(venueScreenCount,id);
      let slots = capacity - 1;
      if (typeof restoredDraft?.featuredSlots === 'string' && Number.isFinite(Number(restoredDraft.featuredSlots))) {
        const stored=Number(restoredDraft.featuredSlots),oldCapacity=checkpoint?.featuredCapacity||6*venueScreenCount;
        slots=oldCapacity!==capacity&&stored===oldCapacity-1?capacity-1:Math.round(stored*capacity/oldCapacity);
      } else if (typeof restoredDraft?.featuredShare === 'string' && Number.isFinite(Number(restoredDraft.featuredShare))) {
        slots = Math.round(capacity * Number(restoredDraft.featuredShare) / 100);
      }
      share.max = String(capacity);
      share.value = String(Math.max(0,Math.min(CinemaMovieRules.maximumFeaturedSlots(venueScreenCount,id),slots)));
      currentAllocation = allocation;
      venueReady = true;
      updateControls();
      renderFinance();
      saveDraft();
    } catch (error) {
      message.hidden = false;
      message.textContent = '營運資料暫時無法載入，請重試。';
      venueRetry.hidden = false;
      console.error('Venue allocation failed:', error);
    }
  }
  venueRetry.addEventListener('click', () => bootFailed ? startGame() : loadVenue());

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
  const films = CinemaFilms.init(form,{showBoxOffice:!secondRun});
  function renderMovieWeek(values={}) {
    const byID=new Map(CinemaMovieDatabase.movies.map(movie=>[movie.id,movie]));
    const retained=CinemaBoxOffice.showing(movies).filter(h=>!movies.current.includes(h.id)).map(h=>byID.get(h.id));
    films.setMovies(movies.current.map(id=>byID.get(id)),values,retained,boxOffice?.totalsByMovie||{},byID.get(CinemaBoxOffice.carryCandidate(movies,boxOffice))||null);
  }
  function renderBulletin(){
    if(annualMeeting)CinemaMeeting.render({state:annualMeeting,cinemaName:cinema.name,figures:CinemaMeeting.summary(gameDate.year,boxOffice,activation,foodRevenue,merchandise),topFive:secondRun?[]:CinemaMeeting.topFilms(gameDate.year,boxOffice,CinemaMovieDatabase),showRanking:!secondRun});
    else CinemaEvents.render({events:CinemaMovieRules.eventsFor(movies,currentWeek())});
  }
  function renderFinance(){
    const now=currentWeek(),receipt=boxOffice?.receipts.find(r=>r.bookedAt===now&&(r.accountingYear??(2022+Math.floor((r.bookedAt-1)/50)))===gameDate.year);
    document.querySelector('.week-badge').textContent=`${displayPeriod()}`;
    document.querySelector('#report-weekly .report-period').textContent=`${displayPeriod()}`;
    document.querySelector('#report-annual .report-period').textContent=String(gameDate.year);
    document.querySelector('#weekly-box-office').textContent=(receipt?.total||0).toLocaleString('zh-TW');
    const concessions=CinemaConcessions.totals(foodRevenue,now,gameDate.year);
    const merchIncome=CinemaMerchandise.totals(merchandise,now,gameDate.year);
    document.querySelector('#weekly-concessions').textContent=(concessions.weekly+merchIncome.weekly).toLocaleString('zh-TW');
    document.querySelector('#annual-concessions').textContent=(concessions.annual+merchIncome.annual).toLocaleString('zh-TW');
    const income=activation?CinemaActivation.totals(activation,now,gameDate.year):null;
    const row=document.querySelector('#weekly-activation-row');row.hidden=!income;
    if(income){row.querySelector('th').textContent='其它收入';document.querySelector('#weekly-activation').textContent=income.weekly.toLocaleString('zh-TW');}
    document.querySelector('#annual-other-income').textContent=income?income.annual.toLocaleString('zh-TW'):'—';
    document.querySelector('#annual-box-office').textContent=(boxOffice?.byYear[gameDate.year]||0).toLocaleString('zh-TW');
    document.querySelector('#report-weekly caption').textContent=`${displayPeriod()} 週報，票房、餐飲與空間活化收入依入帳週列計，其餘項目待結算`;
    document.querySelector('#report-annual caption').textContent=`${gameDate.year} 年報，票房、餐飲與空間活化收入依入帳年度累計，其餘項目待結算`;
  }
  function renderProperty() {
    const location=CinemaDatabase.locations.find(location=>location.locationID===property.locationID);
    const summary=document.querySelector('#property-summary');
    summary.querySelector('#property-summary-text').textContent=location.name;summary.hidden=false;
    const report=document.querySelector('#financial-report');
    report.dataset.rentalActive=String(property.rentalActive);report.dataset.realEstateTaxActive=String(property.realEstateTaxActive);
    const field=document.querySelector('#activation-field'),input=form.elements.activationRate;
    field.hidden=!property.hasSpace;input.disabled=!property.hasSpace;
    if(property.hasSpace){
      const activity=CinemaProperty.ACTIVITIES[property.activationType];
      document.querySelector('#activation-name').textContent=activity.name;
      input.dataset.amountUnit=activity.unit;
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
  form.inert = true;
  async function bootstrap() {
    restoring=true;form.inert=true;
    bootFailed = false;venueRetry.hidden = true;
    try {
      const [settings,record] = freshEntry ? [{enabled:null},null] : await Promise.all([
        CinemaSave.getSettings(),
        CinemaSave.getByRun(runId)
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
        document.querySelector('.workspace-bar .week-badge').textContent=`${displayPeriod()}`;
        document.querySelector('#report-weekly .report-period').textContent=`${displayPeriod()}`;
        document.querySelector('#report-annual .report-period').textContent=String(gameDate.year);
        document.querySelector('#report-weekly caption').textContent=`${displayPeriod()} 週報，結算規則尚未設定，金額均待結算`;
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
        if(!Number.isSafeInteger(quantity.valueAsNumber)||quantity.valueAsNumber<0)quantity.value='0';
      }
      annualMeeting=CinemaMeeting.resolve(checkpoint?.annualMeeting,gameDate.year,gameDate.week,runId);
      if(property.hasSpace){const now=currentWeek();activation=CinemaActivation.resolve(checkpoint?.activation,property.activationType,Number(form.elements.activationRate.value),now);form.elements.activationRate.value=String(activation.rate);}
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
      if(!freshEntry || checkpoint) {
        bootFailed=true;venueRetry.hidden=false;
        document.querySelector('#venue-loading').hidden=false;
        document.querySelector('#venue-loading').textContent='無法讀取存檔，請重試或返回首頁。';
        draftStatus.textContent='存檔尚未讀取，沒有重新分派場地。';
        form.inert=true;return;
      }
      if(!property){property=CinemaProperty.draw(CinemaDatabase,id,runId);renderProperty();}
      draftStatus.textContent='自動存檔暫時無法使用，本次設定尚未保存。';
    }
    restoring=false;form.inert=false;
    films.restoreView();updateControls();await loadVenue();
  }

  function updateTicketLocks(){
    const locked=gameDate.week!==1;
    for(const control of form.querySelectorAll('[name="ticketFull"],[name="secondRunPrice"],[name="secondRunMode"],[name^="ticketExtra_"]')){
      control.disabled=locked;control.dataset.yearLocked=String(locked);
      control.title=locked?'每年W1可調整電影票價':'';
    }
    for(const group of [standardPricing,secondRunPricing,document.querySelector('#special-ticket-group')])group.classList.toggle('year-price-locked',locked);
  }
  function updateActivationLock(){
    const input=form.elements.activationRate,now=currentWeek();
    const locked=!!activation&&!CinemaActivation.editable(activation,now);
    input.disabled=!property?.hasSpace||locked;
    input.closest('.budget-field').classList.toggle('is-locked',locked);
    input.title=locked?'設定四週後可調整':'';
  }
  function captureActivation(){
    if(!activation)return;
    const input=form.elements.activationRate,now=currentWeek();
    try{activation=CinemaActivation.change(activation,Number(input.value),now);}catch(error){input.value=String(activation.rate);throw error;}
  }
  function updateControls() {
    updateTicketLocks();updateActivationLock();
    form.inert=restoring||!!annualMeeting;tabList.inert=!!annualMeeting;form.hidden=!!annualMeeting;tabList.hidden=!!annualMeeting;
    document.querySelector('#next-week').hidden=false;
    const nextLabel=annualMeeting?'開始下一年度':gameDate.week===50?'年度會議':'下一週';
    const nextButton=document.querySelector('#next-week');if(nextButton.dataset.label!==nextLabel){nextButton.dataset.label=nextLabel;nextButton.replaceChildren(nextLabel+' ');const arrow=document.createElement('span');arrow.setAttribute('aria-hidden','true');arrow.textContent='→';nextButton.append(arrow);}
    CinemaParameters.updateDerived(form);
    CinemaParameters.syncSliders(form);
    for (const item of ['poster', 'figure']) {
      const enabled = form.elements[`${item}Enabled`].checked;
      const settings = document.querySelector(`#${item}-settings`);
      const stock=merchandise?.stock[item]||0;
      document.querySelector(`#${item}-stock`).textContent=stock.toLocaleString('zh-TW');
      document.querySelector(`#${item}-inventory`).hidden=!enabled&&!stock;
      form.elements[`${item}Scrap`].disabled=!stock;
      form.elements[`${item}Scrap`].closest('.merch-scrap').hidden=!stock;
      settings.hidden = !enabled;
      settings.disabled = !enabled;
      form.elements[`${item}Enabled`].setAttribute('aria-expanded', String(enabled));
    }
    const featured = form.querySelector('input[name="featuredFilm"]:checked');
    document.querySelector('#next-week').disabled = advancing || !venueReady || ((movies?.current.length>0||CinemaBoxOffice.carryCandidate(movies,boxOffice))&&!featured);
    updateFeaturedShare(featured);
    films.update();
  }
  function updateFeaturedShare(featured=form.querySelector('input[name="featuredFilm"]:checked')) {
    const share = document.querySelector('#featured-share');
    share.disabled = !featured || !venueReady;
    if(venueReady)share.value=String(Math.min(Number(share.value),CinemaMovieRules.maximumFeaturedSlots(venueScreenCount,id)));
    const percentage = venueReady ? CinemaFilms.sharePercentage(Number(share.value),venueScreenCount,id) : 0;
    const formattedShare = percentage.toLocaleString('zh-TW',{maximumFractionDigits:2}) + '%';
    document.querySelector('#share-output').textContent = featured && venueReady ? formattedShare : '—';
    if (venueReady) share.setAttribute('aria-valuetext',`${formattedShare}（${share.value}／${share.max}${id==='C02'?'刻度':'場'}）`);
    document.querySelector('#featured-settings').hidden = !featured;
    if (featured) document.querySelector('#featured-heading').textContent = `選擇${films.titleFor(featured.value)}為本週主打，場次占比`;
  }
  function formValues() {
    const values = {};
    for (const control of form.elements) {
      if (!control.name || CinemaParameters.isDerived(control.name) || control.closest('.special-screenings')?.disabled || (control.name==='activationRate'&&!property?.hasSpace)) continue;
      if (control.type==='checkbox')values[control.name]=control.checked;
      else if(control.type==='radio'){if(control.checked)values[control.name]=control.value;}
      else values[control.name]=control.value;
    }
    return values;
  }
  let draftTimer;
  function saveDraft(stageForNavigation=false) {
    clearTimeout(draftTimer);
    if(restoring || !venueReady || !storeAvailable)return saveQueue;
    const values=formValues();
    const budgetLocks=Object.fromEntries(['maintenance','consumables'].map(name=>[name,form.elements[name].disabled ? document.querySelector(`#${name}-lock`).title || true : false]));
    const snapshot={cinemaID:id,cinemaName:cinema.name,runId,year:gameDate.year,week:gameDate.week,
      values,featuredCapacity:CinemaFilms.screeningCapacity(venueScreenCount,id),allocation:currentAllocation,exclusiveFood,property,activation,annualMeeting,movies,boxOffice,foodRevenue,merchandise,budgetLocks,
      tabID:tabs.find(tab=>tab.getAttribute('aria-selected')==='true')?.id,
      reportTabID:reportTabs.find(tab=>tab.getAttribute('aria-selected')==='true')?.id,
      detailsOpen:document.querySelector('#venue-details-title').getAttribute('aria-expanded')==='true'};
    if(stageForNavigation===true)CinemaSave.stageNavigation(snapshot);
    const revision=++saveRevision;
    // Start the transaction immediately, including before navigation/refresh.
    // IndexedDB orders overlapping readwrite transactions on these stores.
    saveQueue=CinemaSave.save(snapshot,{onPreference:enabled=>{if(revision===saveRevision)draftStatus.textContent=enabled?'自動存檔中…':'自動存檔 OFF';}}).then(written=>{
      if(revision===saveRevision){draftStatus.textContent=written?'已自動存檔':'自動存檔 OFF';}return written;
    }).catch(()=>{if(revision===saveRevision){draftStatus.textContent='自動存檔失敗，本次設定尚未保存。';}return false;});
    return saveQueue;
  }
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', event => {
    const input=event.target;
    if(input.name==='activationRate'){captureActivation();updateActivationLock();}
    if(input.type==='range'){
      if(input.name==='ticketFull')CinemaParameters.updateDerived(form);
      if(input.classList.contains('amount-range'))CinemaParameters.syncSliders(form,input);
      if(input.name==='featuredSlots')updateFeaturedShare();
    }else updateControls();
    clearTimeout(draftTimer);draftTimer=setTimeout(()=>saveDraft(),150);
  });
  form.addEventListener('change', event => { if(event.target.name==='activationRate')captureActivation();updateControls(); saveDraft(); });
  startGame();
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
  document.querySelector('#next-week').addEventListener('click',()=>advanceWeek(!!annualMeeting));
  async function advanceWeek(fromMeeting=false) {
    if(advancing||!venueReady)return;
    if(annualMeeting&&!fromMeeting)return;
    if(!annualMeeting?.settled&&((movies.current.length||CinemaBoxOffice.carryCandidate(movies,boxOffice))&&!form.querySelector('[name="featuredFilm"]:checked')))return;
    advancing=true;updateControls();
    try {
      const values=formValues(),finishing=annualMeeting?.settled===true,closing=gameDate.week===50&&!finishing;
      if(finishing){
        const next=CinemaBoxOffice.completeYear({database:CinemaMovieDatabase,movies},boxOffice);
        movies=next.movies;gameDate.year=next.year;gameDate.week=next.week;annualMeeting=null;
      }else{
        captureActivation();
        const next=CinemaBoxOffice.advance({database:CinemaMovieDatabase,movies,cinemaID:id,locationID:property.locationID,allocation:currentAllocation,values},boxOffice,{deferRelease:closing});
        const nextActivation=activation?CinemaActivation.advance(activation,movies.lastWeek,next.receipt.films.reduce((sum,f)=>sum+f.dailyViewers,0),runId,next.receipt.accountingYear):null;
        const nextFood=CinemaConcessions.advance(foodRevenue,next.receipt,values,exclusiveFood,runId);
        const nextMerchandise=CinemaMerchandise.advance(merchandise,next.receipt,values);
        merchandise=nextMerchandise;foodRevenue=nextFood;activation=nextActivation;movies=next.movies;boxOffice=next.ledger;gameDate.year=next.year;gameDate.week=next.week;
        annualMeeting=closing?CinemaMeeting.create(gameDate.year,runId,true):null;
      }
      for(const kind of CinemaMerchandise.KINDS){values[kind+'Quantity']='0';values[kind+'Scrap']=false;form.elements[kind+'Quantity'].value='0';form.elements[kind+'Scrap'].checked=false;}
      delete values.featuredFilm;values.featuredSlots=String(CinemaFilms.screeningCapacity(venueScreenCount,id)-1);values.specialCount='1';
      for(let i=1;i<=5;i++)values['specialMovie'+(i===1?'':i)]='';
      restoredDraft=values;if(!annualMeeting?.settled)renderMovieWeek(values);form.elements.specialCount.value='1';form.elements.featuredSlots.value=values.featuredSlots;
      films.setVenue(venueScreenCount,gameDate.week);renderFinance();
      renderBulletin();
      if(annualMeeting?.settled){activateReport(reportTabs.find(tab=>tab.id==='tab-annual'));document.querySelector('#weekly-events').scrollIntoView({block:'start',behavior:'smooth'});}
      checkpoint={...checkpoint,movies,boxOffice,foodRevenue,merchandise,activation,annualMeeting,featuredCapacity:CinemaFilms.screeningCapacity(venueScreenCount,id),allocation:currentAllocation,values,year:gameDate.year,week:gameDate.week};
      saveDraft();
    }catch(error){document.querySelector('#dialog-save-status').textContent=error.message;document.querySelector('#week-dialog').showModal();console.error('Weekly settlement failed:',error);}
    finally{advancing=false;updateControls();}
  }
  async function startGame() {
    try {
      await bootstrap();
    } catch(error) {
      bootFailed=true;restoring=true;venueReady=false;form.inert=true;
      venueRetry.hidden=false;
      const message=document.querySelector('#venue-loading');
      message.hidden=false;message.textContent='遊戲資料暫時無法載入，請重試或點選 CineMan 返回首頁。';
      draftStatus.textContent='本次載入失敗，既有存檔未變更。';
      console.error('Game initialization failed:',error);
    } finally {
      // Errors must never leave the retry control trapped behind the curtains.
      document.body.classList.add('reveal');
      setTimeout(() => document.body.classList.remove('page-entering', 'reveal'), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500);
    }
  }
}
