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
  let boxOffice=null,distributor=null,rent=null,propertyTax=null,managementFee=null,operatingExpenses=null,utilityBills=null,foodRevenue=null,merchandise=null,advancing=false,annualMeeting=null;
  let checkpoint = null, currentAllocation = null, restoring = true, bootFailed = false, storeAvailable = true;
  let saveQueue = Promise.resolve(false), saveRevision = 0,financialSummary=null,paymentNoticeAcknowledgedWeek=0,eventNoticeAcknowledged={week:0,ids:[]};
  const gameDate = {year:2022,week:1};
  const currentWeek=()=>CinemaMovieRules.absoluteWeek(gameDate.year,gameDate.week)+(annualMeeting?.settled?1:0);
  const displayPeriod=()=>annualMeeting?.settled?`${gameDate.year}年度會議`:`${gameDate.year} W${gameDate.week}`;
  const moviesByID=new Map(CinemaMovieDatabase.movies.map(movie=>[movie.id,movie]));
  let venueReady = false;
  let venueScreenCount = 0;
  const venueRetry = document.querySelector('#venue-retry');
  async function loadVenue() {
    venueReady=false;form.inert=true;tabList.inert=true;
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
      distributor=CinemaDistributor.sync(CinemaDistributor.resolve(checkpoint?.distributor,id,movies.seed,currentWeek()),{database:CinemaMovieDatabase,movies,boxOffice,cinemaID:id,now:currentWeek(),year:gameDate.year});
      rent=CinemaRent.sync(checkpoint?.rent,property,allocation.totalSeats,CinemaMovieRules.absoluteWeek(gameDate.year,gameDate.week));
      propertyTax=CinemaPropertyTax.sync(checkpoint?.propertyTax,property,allocation.totalSeats,CinemaMovieRules.absoluteWeek(gameDate.year,gameDate.week));
      managementFee=CinemaManagementFee.sync(checkpoint?.managementFee,property,allocation.totalSeats,CinemaMovieRules.absoluteWeek(gameDate.year,gameDate.week));
      operatingExpenses=CinemaOperatingExpenses.resolve(checkpoint?.operatingExpenses,currentWeek());
      utilityBills=CinemaUtilityBills.sync(checkpoint?.utilityBills,property,allocation.totalSeats,CinemaMovieRules.absoluteWeek(gameDate.year,gameDate.week));
      renderMovieWeek(restoredDraft||{});
      CinemaVenue.render(allocation);
      renderSpecialPricing(allocation);
      venueScreenCount = allocation.screenCount;
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
      share.value = String(Math.max(1,Math.min(CinemaMovieRules.maximumFeaturedSlots(venueScreenCount,id),slots)));
      currentAllocation = allocation;
      venueReady = true;
      updateControls();
      renderFinance();
      renderBulletin();
      saveDraft();
    } catch (error) {
      venueReady=false;form.inert=true;tabList.inert=true;
      document.querySelector('#next-week').disabled=true;
      message.hidden = false;
      message.textContent = '營運資料暫時無法載入，請重試。';
      venueRetry.hidden = false;
      console.error('Venue allocation failed:', error);
    }
  }
  venueRetry.addEventListener('click', () => bootFailed ? startGame() : loadVenue());

  document.title = `CineMan｜${cinema.name}營業中`;
  document.documentElement.style.setProperty('--accent', cinema.color);
  document.querySelector('#cinema-name').textContent = cinema.name;
  document.querySelector('#cinema-type').textContent = cinema.type;
  const exterior = document.querySelector('#cinema-exterior');
  exterior.sizes = '(max-width: 760px) calc(100vw - 20px), (max-width: 992px) 52vw, 510px';
  exterior.fetchPriority = 'high';
  exterior.decoding = 'async';
  const counter = document.querySelector('#cinema-counter');
  counter.sizes = '(max-width: 760px) calc(100vw - 32px), 960px';
  counter.decoding = 'async';
  counter.fetchPriority = 'low';
  document.body.dataset.cinema = cinema.slug;
  function renderYearVisuals() {
    const year=gameDate.year;
    const heroScene=[2023,2025].includes(year)?'interior':'exterior';
    const footerScene=[2024,2025].includes(year)?'ticket':'counter';
    const ticketYear=year===2024&&id!=='C01'?'-2024':'';
    const ticketFile=`${cinema.slug}-ticket-scene-v${id==='C01'?2:1}${ticketYear}.webp`;
    const ticketDescription='單張電影票情境照，'+(id==='C01'?'復古全票，票號A199308，手寫8排5號、1月1日第1場':id==='C02'?`全票，世紀戲院紅章，藍色蓋印日期${year===2024?'2024':'2025'}.01.01`:id==='C05'?`全票，片名CineMan，日期${year===2024?'2024':'2025'}.01.01，時間11：00，1廳8排5號`:'電影票，片名CineMan');
    const counterVersion=id==='C02'?'':id==='C01'?'-v4':'-v2';
    for(const [image,scene] of [[exterior,heroScene],[counter,footerScene]]){
      const file=scene==='ticket'?ticketFile:scene==='interior'?`${cinema.slug}-interior.webp`:scene==='exterior'?cinema.exterior:scene==='projection'?`${cinema.slug}-projection.webp`:`${cinema.slug}-counter${counterVersion}.webp`;
      if(image.dataset.asset===file)continue;
      const folder=scene==='ticket'?'tickets':scene==='counter'?'counters':scene==='projection'?'projection':'landscape';
      const widths=image===counter?(scene==='projection'?[960]:[960,1280]):[640,960,1280],fullWidth=scene==='counter'&&id==='C01'?2048:1774;
      image.dataset.asset=file;image.dataset.scene=scene;
      image.srcset=[...widths.map(width=>`assets/cinemas/optimized/${file.replace('.webp',`-${width}.webp`)} ${width}w`),`assets/cinemas/${folder}/${file} ${fullWidth}w`].join(', ');
      image.src=`assets/cinemas/${folder}/${file}`;
      image.alt=cinema.name+(scene==='ticket'?ticketDescription:scene==='interior'?'影廳內部':scene==='exterior'?'外觀':scene==='projection'?'觀眾席後方與放映窗':'售票櫃台');
      if(image===counter)image.closest('.counter-scene').setAttribute('aria-label',image.alt);
    }
  }
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
    const byID=moviesByID;
    const retained=CinemaBoxOffice.showing(movies).filter(h=>!movies.current.includes(h.id)).map(h=>byID.get(h.id));
    films.setMovies(movies.current.map(id=>byID.get(id)),values,retained,boxOffice?.totalsByMovie||{},byID.get(CinemaBoxOffice.carryCandidate(movies,boxOffice))||null);
  }
  function renderBulletin(){
    if(annualMeeting){
      CinemaEvents.render({events:[]});
      CinemaMeeting.render({state:annualMeeting,cinemaName:cinema.name,trend:CinemaFinancialTotals.annualTrend(gameDate.year,{distributor,activation,foodRevenue,merchandise,operatingExpenses,rent,propertyTax,managementFee,utilityBills}),figures:{...CinemaMeeting.summary(gameDate.year,boxOffice,activation,foodRevenue,merchandise,distributor),expenses:financialSummary?.annual.expenses??null,preTaxProfit:financialSummary?.annual.profit??null,profit:financialSummary?.annual.afterTaxProfit??null},topFive:secondRun?[]:CinemaMeeting.topFilms(gameDate.year,boxOffice,CinemaMovieDatabase),showRanking:!secondRun});
    }else{
      document.querySelector('#annual-meeting-section').hidden=true;
      const week=currentWeek();
      CinemaEvents.render({events:CinemaMovieRules.eventsFor(movies,week),defer:showPaymentNotice(),
        acknowledged:eventNoticeAcknowledged.week===week?eventNoticeAcknowledged.ids:[],
        onAcknowledge:eventID=>{
          if(eventNoticeAcknowledged.week!==week)eventNoticeAcknowledged={week,ids:[]};
          if(!eventNoticeAcknowledged.ids.includes(eventID))eventNoticeAcknowledged.ids.push(eventID);
          saveDraft();
        }});
    }
  }
  function showPaymentNotice(){
    const week=currentWeek();
    if(!venueReady||annualMeeting||paymentNoticeAcknowledgedWeek===week)return false;
    const notices=CinemaEvents.paymentReminders({week,rent,propertyTax,managementFee,utilityBills});
    if(!notices.length)return false;
    if(paymentNoticeDialog.open)return true;
    const rows=notices.map(notice=>{
      const row=document.createElement('p'),label=document.createElement('span'),amount=document.createElement('strong');
      label.textContent=notice.title;amount.textContent=`NT$${notice.amount.toLocaleString('zh-TW')}`;
      row.append(label,' ',amount);return row;
    });
    document.querySelector('#payment-notice-list').replaceChildren(...rows);
    paymentNoticeDialog.dataset.week=String(week);
    paymentNoticeDialog.showModal();
    return true;
  }
  function renderFinance(){
    renderYearVisuals();
    const now=currentWeek(),receipt=boxOffice?.receipts.find(r=>r.bookedAt===now&&(r.accountingYear??(2022+Math.floor((r.bookedAt-1)/50)))===gameDate.year);
    document.querySelector('.week-badge').textContent=`${displayPeriod()}`;
    document.querySelector('#report-weekly .report-period').textContent=`${displayPeriod()}`;
    document.querySelector('#report-annual .report-period').textContent=String(gameDate.year);
    const net=CinemaDistributor.totals(distributor,now,gameDate.year);
    document.querySelector('#weekly-net-box-office').textContent=net.weekly.toLocaleString('zh-TW');
    document.querySelector('#annual-net-box-office').textContent=net.annual.toLocaleString('zh-TW');
    const expenses=CinemaOperatingExpenses.totals(operatingExpenses,now,gameDate.year);
    for(const period of['weekly','annual'])for(const key of CinemaOperatingExpenses.KEYS)document.querySelector(`#${period}-${key}`).textContent=expenses[period][key].toLocaleString('zh-TW');
    const utilities=CinemaUtilityBills.totals(utilityBills,now,gameDate.year);
    document.querySelector('#weekly-utilities').textContent=utilities.weekly.toLocaleString('zh-TW');
    document.querySelector('#annual-utilities').textContent=utilities.annual.toLocaleString('zh-TW');
    const rental=CinemaRent.totals(rent,now,gameDate.year);
    const realEstateTax=CinemaPropertyTax.totals(propertyTax,now,gameDate.year);
    const management=CinemaManagementFee.totals(managementFee,now,gameDate.year);
    document.querySelector('#weekly-rent').textContent=(rental.weekly+realEstateTax.weekly+management.weekly).toLocaleString('zh-TW');
    document.querySelector('#annual-rent').textContent=(rental.annual+realEstateTax.annual+management.annual).toLocaleString('zh-TW');
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
    financialSummary=Object.fromEntries(['weekly','annual'].map(period=>[period,CinemaFinancialTotals.calculate({ticket:net[period],food:concessions[period],merchandise:merchIncome[period],other:income?.[period]||0},{...expenses[period],utilities:utilities[period],premises:rental[period]+realEstateTax[period]+management[period]})]));
    financialSummary.annual.tax=CinemaFinancialTotals.incomeTax(gameDate.year,net.annual,financialSummary.annual.expenses);
    financialSummary.annual.afterTaxProfit=financialSummary.annual.profit-financialSummary.annual.tax;
    document.querySelector('#annual-income-tax').textContent=(-financialSummary.annual.tax||0).toLocaleString('zh-TW');
    document.querySelector('#annual-profit').textContent=financialSummary.annual.afterTaxProfit.toLocaleString('zh-TW');
    document.querySelector('#weekly-profit').textContent=financialSummary.weekly.profit.toLocaleString('zh-TW');
    document.querySelector('#annual-pretax-profit').textContent=financialSummary.annual.profit.toLocaleString('zh-TW');
    document.querySelector('#report-weekly caption').textContent=`${displayPeriod()} 週報，依本週實際入帳收入與已出帳支出列計`;
    document.querySelector('#report-annual caption').textContent=`${gameDate.year} 年報，依本年度累計入帳收支及預扣稅金列計`;
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
    restoring=true;form.inert=true;tabList.inert=true;
    document.querySelector('#next-week').disabled=true;
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
        document.querySelector('.week-badge').textContent=`${displayPeriod()}`;
        document.querySelector('#report-weekly .report-period').textContent=`${displayPeriod()}`;
        document.querySelector('#report-annual .report-period').textContent=String(gameDate.year);
      }
      paymentNoticeAcknowledgedWeek=Number.isSafeInteger(checkpoint?.paymentNoticeAcknowledgedWeek)?checkpoint.paymentNoticeAcknowledgedWeek:0;
      if(Number.isSafeInteger(checkpoint?.eventNoticeAcknowledged?.week)&&Array.isArray(checkpoint.eventNoticeAcknowledged.ids)&&checkpoint.eventNoticeAcknowledged.ids.every(id=>typeof id==='string'))eventNoticeAcknowledged=structuredClone(checkpoint.eventNoticeAcknowledged);
      renderYearVisuals();
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
    restoring=false;
    await loadVenue();
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
    form.inert=restoring||!venueReady||!!annualMeeting;tabList.inert=!venueReady||!!annualMeeting;form.hidden=!!annualMeeting;tabList.hidden=!!annualMeeting;
    document.querySelector('.operations-section').hidden=!!annualMeeting;
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
    if(venueReady)share.value=String(Math.max(1,Math.min(Number(share.value),CinemaMovieRules.maximumFeaturedSlots(venueScreenCount,id))));
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
      values,featuredCapacity:CinemaFilms.screeningCapacity(venueScreenCount,id),allocation:currentAllocation,exclusiveFood,property,activation,annualMeeting,movies,boxOffice,distributor,rent,propertyTax,managementFee,operatingExpenses,utilityBills,foodRevenue,merchandise,budgetLocks,paymentNoticeAcknowledgedWeek,eventNoticeAcknowledged,
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
  const ticketConfirmDialog=document.querySelector('#ticket-confirm-dialog');
  const paymentNoticeDialog=document.querySelector('#payment-notice-dialog');
  paymentNoticeDialog.addEventListener('cancel',event=>event.preventDefault());
  document.querySelector('#payment-notice-ok').addEventListener('click',()=>{
    paymentNoticeAcknowledgedWeek=Number(paymentNoticeDialog.dataset.week);
    paymentNoticeDialog.close();
    saveDraft();
    CinemaEvents.present();
  });
  function returnToTicketPricing(){
    ticketConfirmDialog.close();
    activateTab(tabs.find(tab=>tab.id==='tab-pricing'),true);
    tabList.scrollIntoView({block:'start'});
    saveDraft();
  }
  document.querySelector('#ticket-return').addEventListener('click',returnToTicketPricing);
  ticketConfirmDialog.addEventListener('cancel',event=>{event.preventDefault();returnToTicketPricing();});
  document.querySelector('#ticket-confirm').addEventListener('click',()=>{
    ticketConfirmDialog.close();
    advanceWeek(false,true);
  });
  async function advanceWeek(fromMeeting=false,ticketConfirmed=false) {
    if(advancing||!venueReady)return;
    if(annualMeeting&&!fromMeeting)return;
    if(!annualMeeting?.settled&&((movies.current.length||CinemaBoxOffice.carryCandidate(movies,boxOffice))&&!form.querySelector('[name="featuredFilm"]:checked')))return;
    if(gameDate.week===1&&!annualMeeting&&!ticketConfirmed){
      if(!ticketConfirmDialog.open){ticketConfirmDialog.showModal();document.querySelector('#ticket-return').focus();}
      return;
    }
    advancing=true;updateControls();
    try {
      const values=formValues(),finishing=annualMeeting?.settled===true,closing=gameDate.week===50&&!finishing;
      if(finishing){
        const next=CinemaBoxOffice.completeYear({database:CinemaMovieDatabase,movies,cinemaID:id,allocation:currentAllocation},boxOffice);
        movies=next.movies;gameDate.year=next.year;gameDate.week=next.week;annualMeeting=null;
      }else{
        captureActivation();
        const next=CinemaBoxOffice.advance({database:CinemaMovieDatabase,movies,cinemaID:id,locationID:property.locationID,allocation:currentAllocation,values},boxOffice,{deferRelease:closing});
        const nextActivation=activation?CinemaActivation.advance(activation,movies.lastWeek,next.receipt.films.reduce((sum,f)=>sum+f.dailyViewers,0),runId,next.receipt.accountingYear):null;
        const nextFood=CinemaConcessions.advance(foodRevenue,next.receipt,values,exclusiveFood,runId,venueScreenCount,currentAllocation.totalSeats);
        const nextMerchandise=CinemaMerchandise.advance(merchandise,next.receipt,values);
        const nextExpenses=CinemaOperatingExpenses.advance(operatingExpenses,next.receipt,values,nextMerchandise.receipts.at(-1));
        operatingExpenses=nextExpenses;merchandise=nextMerchandise;foodRevenue=nextFood;activation=nextActivation;movies=next.movies;boxOffice=next.ledger;gameDate.year=next.year;gameDate.week=next.week;
        annualMeeting=closing?CinemaMeeting.create(gameDate.year,runId,true):null;
      }
      distributor=CinemaDistributor.sync(distributor,{database:CinemaMovieDatabase,movies,boxOffice,cinemaID:id,now:currentWeek(),year:gameDate.year});
      rent=CinemaRent.sync(rent,property,currentAllocation.totalSeats,CinemaMovieRules.absoluteWeek(gameDate.year,gameDate.week));
      propertyTax=CinemaPropertyTax.sync(propertyTax,property,currentAllocation.totalSeats,CinemaMovieRules.absoluteWeek(gameDate.year,gameDate.week));
      managementFee=CinemaManagementFee.sync(managementFee,property,currentAllocation.totalSeats,CinemaMovieRules.absoluteWeek(gameDate.year,gameDate.week));
      utilityBills=CinemaUtilityBills.sync(utilityBills,property,currentAllocation.totalSeats,CinemaMovieRules.absoluteWeek(gameDate.year,gameDate.week));
      for(const kind of CinemaMerchandise.KINDS){values[kind+'Quantity']='0';values[kind+'Scrap']=false;form.elements[kind+'Quantity'].value='0';form.elements[kind+'Scrap'].checked=false;}
      delete values.featuredFilm;values.featuredSlots=String(CinemaFilms.screeningCapacity(venueScreenCount,id)-1);values.specialCount='1';
      for(let i=1;i<=5;i++)values['specialMovie'+(i===1?'':i)]='';
      restoredDraft=values;if(!annualMeeting?.settled)renderMovieWeek(values);form.elements.specialCount.value='1';form.elements.featuredSlots.value=values.featuredSlots;
      renderFinance();
      renderBulletin();
      if(annualMeeting?.settled){activateReport(reportTabs.find(tab=>tab.id==='tab-annual'));document.querySelector('#annual-meeting-section').scrollIntoView({block:'start',behavior:'smooth'});}
      checkpoint={...checkpoint,movies,boxOffice,distributor,rent,propertyTax,managementFee,operatingExpenses,utilityBills,foodRevenue,merchandise,activation,annualMeeting,featuredCapacity:CinemaFilms.screeningCapacity(venueScreenCount,id),allocation:currentAllocation,values,year:gameDate.year,week:gameDate.week};
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
      renderYearVisuals();
      // Give the selected hero a brief chance to decode, never an unbounded
      // image/network wait. Footer images and recovery controls never block entry.
      if(venueReady&&typeof exterior.decode==='function'){
        let imageTimer;
        try{await Promise.race([exterior.decode(),new Promise(resolve=>{imageTimer=setTimeout(resolve,180);})]);}
        catch{ /* A failed image must never trap the game behind its curtains. */ }
        finally{clearTimeout(imageTimer);}
      }
      // Errors must never leave the retry control trapped behind the curtains.
      document.body.classList.add('reveal');
      setTimeout(() => document.body.classList.remove('page-entering', 'reveal'), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500);
    }
  }
}
