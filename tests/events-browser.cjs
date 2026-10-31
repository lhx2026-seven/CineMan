const{chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.CINEMAN_BASE_URL||'http://127.0.0.1:8190';
globalThis.CinemaRules=require('../assignment-rules.js');const P=require('../property-rules.js'),DB=require('../data/cinemas.json');
function seed(id,predicate){for(let n=0;n<10000;n++){const run='event-browser/'+n,p=P.draw(DB,id,run),a=CinemaRules.generate(DB,id,run,null,p.locationID);if(predicate(p,a))return run;}throw Error('no test seed');}
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
async function open(event,id='C03',predicate=()=>true,width=390,allWeeks=false){const p=await b.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(({event,allWeeks})=>{let db;Object.defineProperty(globalThis,'CinemaEventDatabase',{configurable:true,get:()=>db,set:v=>{db={...v,events:v.events.map(e=>({...e,condition:e.id===event?(e.id==='eb002'?{staffBelow:6000}:allWeeks?{}:{calendar:[[2022,2,2]]}):{cinemas:['disabled-in-test']}}))};}});},{event,allWeeks});
 await p.goto(`${base}/game.html?cinema=${id}&fresh=1&run=${encodeURIComponent(seed(id,predicate))}`);await p.locator('#venue-data').waitFor();await p.waitForFunction(()=>document.body.classList.contains('page-entering')===false);await p.evaluate(()=>CinemaSave.setEnabled(true));
 assert(await p.locator('#event-notice-dialog').isHidden());
 await p.locator('#tab-films').click();await p.locator('.film-select').first().click();await p.locator('#next-week').click();await p.locator('#ticket-confirm').click();await p.waitForFunction(()=>document.querySelector('.week-badge').textContent==='2022 W2');
 return{p,errors};}
async function save(p){await p.waitForFunction(()=>document.querySelector('#draft-status').textContent==='已自動存檔');return p.evaluate(async()=>CinemaSave.getByRun(new URL(location.href).searchParams.get('run')));}
async function notices(p,choice=0){const sequence=[];for(let i=0;i<5;i++){if(await p.locator('#payment-notice-dialog').isVisible()){sequence.push('payment');await p.locator('#payment-notice-ok').click();continue;}if(await p.locator('#event-notice-dialog').isVisible()){sequence.push('event');await p.locator('#event-notice-actions button').nth(choice).click();await p.locator('#event-notice-dialog').waitFor({state:'hidden'});continue;}break;}return sequence;}
async function next(p,w){w=Number((await p.locator('.week-badge').textContent()).match(/W(\d+)/)[1])+1;await notices(p);await p.locator('#tab-films').click();if(await p.locator('.film-select:enabled').count())await p.locator('.film-select:enabled').first().click();await p.locator('#next-week').click();if(await p.locator('#ticket-confirm-dialog').isVisible())await p.locator('#ticket-confirm').click();await p.waitForFunction(w=>document.querySelector('.week-badge').textContent===`2022 W${w}`,w);}
// Decisions block progress, lock exactly one week, restore settings, survive reload.
{
 const{p,errors}=await open('ec003');assert(await p.locator('#event-notice-dialog').isVisible());assert(await p.locator('#next-week').isDisabled());
 const initial=await p.locator('[name=staffing]').inputValue(),halls=Number(await p.locator('#venue-screen-count').textContent());await notices(p);assert.equal(await p.locator('[name=staffing]').inputValue(),String((halls+1)*10000));assert(await p.locator('[name=staffing]').isDisabled());
 const before=await save(p);await p.reload();await p.locator('#venue-data').waitFor();assert(await p.locator('#event-notice-dialog').isHidden());assert.equal((await save(p)).eventState.draws.length,1);
 await next(p,2);assert.equal(await p.locator('[name=staffing]').inputValue(),initial);assert(await p.locator('[name=staffing]').isEnabled());const after=await save(p);assert.equal(after.operatingExpenses.receipts.at(-1).inputs.staffing,(halls+1)*10000);assert.equal(before.eventState.draws[0].choice,'1');assert.deepEqual(errors,[]);console.log('PASS decision, budget lock, one-week expiry, reload and actual payroll');await p.close();
}
// Whole-week shutdown must require an explicit staffing decision next week.
for(const width of[390,1440]){
 const{p,errors}=await open('eb002','C03',()=>true,width);assert(await p.locator('#event-notice-title').evaluate(e=>e.classList.contains('sr-only')));assert.equal(await p.locator('#event-notice-message').evaluate(e=>getComputedStyle(e).fontSize),'17px');
 await notices(p,1);await next(p,3);assert(await p.locator('#event-notice-dialog').isVisible());assert(await p.locator('#next-week').isDisabled());let s=await save(p);assert.equal(s.boxOffice.receipts.at(-1).total,0);assert.equal(s.eventState.draws.at(-1).id,'eb002');assert.equal(s.eventState.draws.at(-1).choice,null);
 if(width===390)await p.evaluate(async()=>{
  const s=await CinemaSave.getByRun(new URL(location.href).searchParams.get('run')),draw=s.eventState.draws.at(-1),input=document.querySelector('[name=staffing]');
  s.eventBudgetState={week:3,restore:{staffing:{value:input.value,min:input.min,max:input.max,step:input.step,disabled:false}}};s.values.staffing='500000';
  draw.id='eb004';draw.key='eb004/3';draw.message='舊版誤抽的一般事件';draw.applied=true;draw.choices=[];draw.effects=[];
  s.eventState.effects.push({kind:'lock',field:'staffing',value:500000,source:'eb004/3',start:3,end:3});await CinemaSave.save(s);
 });
 await p.reload();await p.locator('#venue-data').waitFor();assert(await p.locator('#event-notice-dialog').isVisible());assert.equal((await save(p)).eventState.draws.at(-1).id,'eb002');assert.notEqual(await p.locator('[name=staffing]').inputValue(),'500000');
 await notices(p,0);const halls=Number(await p.locator('#venue-screen-count').textContent());assert.equal(await p.locator('[name=staffing]').inputValue(),String((halls+1)*8000));
 await next(p,4);s=await save(p);assert(s.boxOffice.receipts.at(-1).total>0);assert.equal(s.eventState.draws.at(-1).choice,'1');assert(await p.locator('#event-notice-dialog').isHidden());assert(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));assert.deepEqual(errors,[]);
 console.log('PASS',width,'hidden generic title, larger event text, shutdown follow-up/reload and explicit staffed reopening');await p.close();
}
// Automatic extra expense leaves slider unchanged and charges once.
{
 const{p,errors}=await open('eb006', 'C03',()=>true,1440);await notices(p);const value=Number(await p.locator('[name=maintenance]').inputValue());await next(p,2);const s=await save(p);assert.equal(s.operatingExpenses.receipts.at(-1).amounts.maintenance,value+200000);assert.equal(Number(await p.locator('[name=maintenance]').inputValue()),value);await p.reload();await p.locator('#venue-data').waitFor();assert.deepEqual((await save(p)).operatingExpenses,s.operatingExpenses);assert.deepEqual(errors,[]);console.log('PASS extra maintenance expense and no repeated deduction');await p.close();
}
// Confirmed ec002 locks two budgets for one week; no extra 100,000 compensation.
{
 const{p,errors}=await open('ec002');await notices(p);
 assert.equal(await p.locator('[name=maintenance]').inputValue(),'100000');assert(await p.locator('[name=maintenance]').isDisabled());
 assert.equal(await p.locator('[name=consumables]').inputValue(),'20000');assert(await p.locator('[name=consumables]').isDisabled());
 await save(p);await p.reload();await p.locator('#venue-data').waitFor();assert.equal(await p.locator('[name=maintenance]').inputValue(),'100000');
 await next(p,2);const s=await save(p);assert.equal(s.operatingExpenses.receipts.at(-1).amounts.maintenance,100000);assert.equal(s.operatingExpenses.receipts.at(-1).amounts.other,20000);
 assert(await p.locator('[name=maintenance]').isEnabled());assert(await p.locator('[name=consumables]').isEnabled());assert.equal(await p.locator('[name=maintenance]').inputValue(),'10000');assert.equal(await p.locator('[name=consumables]').inputValue(),'0');
 assert.deepEqual(errors,[]);console.log('PASS ec002 confirmed locks, exact expense rows, reload and next-week restoration');await p.close();
}
// A four-week buff cannot redraw; all receipts retain a validated event version.
{
 const{p,errors}=await open('ea011');await notices(p);for(let w=2;w<=5;w++)await next(p,w);const s=await save(p);assert.equal(s.eventState.draws.length,1);assert.equal(s.eventState.effects[0].end,5);assert.equal(await p.locator('#weekly-concessions').textContent(),'0');assert(s.foodRevenue.receipts.every(r=>r.ruleVersion===5));assert.deepEqual(errors,[]);console.log('PASS four-week effect lifetime, annual zero-food-cost gate and versioned receipts');await p.close();
}
// Bills must remain ahead of a same-week event, including after refresh.
{
 const{p,errors}=await open('ec003','C03',()=>true,390,true);await notices(p);for(let w=2;w<=3;w++)await next(p,w);assert(await p.locator('#payment-notice-dialog').isVisible());
 // A normal eligible weekly event is restored from the ledger rather than rerolled.
 await p.reload();await p.locator('#venue-data').waitFor();assert(await p.locator('#payment-notice-dialog').isVisible());const sequence=await notices(p);assert.deepEqual(sequence,['payment','event']);assert.deepEqual(errors,[]);console.log('PASS payment-first queue and refresh safety');await p.close();
}
// Upgrade: chosen original hall remains reserved for 12 weeks, opens W13, price confirmation.
{
 const{p,errors}=await open('ec010','C01',(pr,a)=>pr.locationID!=='LOC08'&&!a.screens.some(s=>s.type==='EXTRA'&&s.name.startsWith('IMAX'))&&a.screens.some(s=>s.type!=='EXTRA'&&s.size>=300));await notices(p);const initial=await save(p),upgrade=initial.eventState.effects.find(e=>e.kind==='upgrade');assert.equal(upgrade.readyAt,14);assert((await p.locator('#venue-screens').textContent()).includes('改裝中'));
 for(let w=2;w<=13;w++)await next(p,w);await notices(p);assert((await p.locator('#venue-extra-names').textContent()).includes('IMAX'));assert(await p.locator('[name=ticketExtra_IMAX]').isEnabled());assert.equal((await save(p)).allocation.totalSeats,initial.allocation.totalSeats);
 await p.locator('#tab-films').click();await p.locator('.film-select').first().click();await p.locator('#next-week').click();assert(await p.locator('#ticket-confirm-dialog').isVisible());assert.equal(await p.locator('#ticket-confirm-title').textContent(),'請確認新特殊廳票價');await p.locator('#ticket-confirm').click();await p.waitForFunction(()=>document.querySelector('.week-badge').textContent==='2022 W15');await notices(p);assert(await p.locator('[name=ticketExtra_IMAX]').isDisabled());await p.reload();await p.locator('#venue-data').waitFor();assert((await p.locator('#venue-extra-names').textContent()).includes('IMAX'));assert.deepEqual(errors,[]);console.log('PASS 12-week upgrade, stable seats, opening-week ticket setup and reload');await p.close();
}
// Close a hall, preserving the fixed lease and original assignment checkpoint.
{
 const{p,errors}=await open('ec013','C03',(pr,a)=>a.screens.some(s=>s.type==='EXTRA'&&s.name.startsWith('VIP')));await notices(p);const first=await save(p);await next(p,2);const second=await save(p);assert.equal(Number(await p.locator('#venue-screen-count').textContent()),first.allocation.screenCount-1);assert.equal(second.rent.amount,first.rent.amount);assert.deepEqual(second.allocation,first.allocation);await p.reload();await p.locator('#venue-data').waitFor();assert.equal(Number(await p.locator('#venue-screen-count').textContent()),first.allocation.screenCount-1);assert.deepEqual(errors,[]);console.log('PASS one-hall closure, fixed rent, saved original assignment and reload');await p.close();
}
// Sale proceeds enter other income, new rent starts on the existing four-week schedule.
{
 const{p,errors}=await open('ef003','C01',pr=>pr.tenure==='owned');await notices(p);const before=await save(p),cash=before.eventState.effects.find(e=>e.kind==='sellLand').value;await next(p,2);assert.equal(await p.locator('#weekly-activation').textContent(),cash.toLocaleString('zh-TW'));for(let w=3;w<=4;w++)await next(p,w);const after=await save(p);assert(after.eventState.feeReceipts.some(r=>r.week===4&&r.rentDelta>0));await notices(p);await p.reload();await p.locator('#venue-data').waitFor();assert.equal((await save(p)).eventState.receipts.filter(r=>r.gross>0).length,1);assert.deepEqual(errors,[]);console.log('PASS land sale income, subsequent rent and no duplicated proceeds');await p.close();
}
{
 const{p,errors}=await open('ec016');await notices(p);const first=await save(p),target=first.eventState.effects.find(e=>e.kind==='reissue').movieID;await next(p,2);const after=await save(p);assert(after.movies.current.includes(target));assert.equal(after.movies.history.find(h=>h.id===target).releasedAt,3);assert.equal(after.movies.current.length,2);assert.equal(after.distributor.contracts[target].share,0);await p.reload();await p.locator('#venue-data').waitFor();assert.deepEqual((await save(p)).movies,after.movies);assert.deepEqual(errors,[]);console.log('PASS reissue replaces one fresh slot, attendance resets and free special contract');await p.close();
}
{
 const{p,errors}=await open('ef006');await notices(p);for(let w=2;w<=5;w++)await next(p,w);await notices(p);await p.locator('#tab-films').click();await p.locator('.film-select').first().click();await p.locator('#next-week').click();await p.waitForFunction(()=>!document.querySelector('#annual-meeting-section').hidden);const s=await save(p);assert(s.annualMeeting.early);assert.equal(s.boxOffice.receipts.at(-1).earnedAt,6);assert.equal(await p.locator('#next-week').textContent(),'退出 →');await p.reload();await p.locator('#venue-data').waitFor();assert(await p.locator('#annual-meeting-section').isVisible());await p.locator('#next-week').click();await p.waitForURL('**/index.html');assert.deepEqual(errors,[]);console.log('PASS countdown closure, last-week settlement, early meeting reload and exit');await p.close();
}

// Immediate board dissolution does not create a fictional extra operating week.
{
 const{p,errors}=await open('ef002');await notices(p);await p.waitForFunction(()=>!document.querySelector('#annual-meeting-section').hidden);const s=await save(p);assert(s.annualMeeting.early);assert.equal(s.annualMeeting.virtualAt,2);assert.equal(s.boxOffice.receipts.length,1);await p.reload();await p.locator('#venue-data').waitFor();assert(await p.locator('#annual-meeting-section').isVisible());assert((await p.locator('#next-week').textContent()).includes('退出'));assert.deepEqual(errors,[]);console.log('PASS immediate dissolution settles no extra fictional week and restores terminal meeting');await p.close();
}
// Existing special-film story occupies the sole weekly event slot, after bills.
{
 const{p,errors}=await open('ee020');await notices(p);await save(p);
 await p.evaluate(async()=>{const s=await CinemaSave.getByRun(new URL(location.href).searchParams.get('run'));s.year=2026;s.week=4;let m=CinemaMovieRules.resolve(CinemaMovieDatabase,s.runId,s.allocation.screenCount,2026,4);m.history=m.history.filter(h=>h.id!=='MV0503');m.history.push({id:'MV0503',releasedAt:201,initial:false,retiredAt:null});m.current=m.current.filter(id=>id!=='MV0503');s.movies=CinemaBoxOffice.hydrate(CinemaMovieDatabase,m);for(const key of ['activation','boxOffice','distributor','foodRevenue','merchandise','operatingExpenses'])delete s[key];await CinemaSave.save(s);});
 await p.reload();await p.locator('#venue-data').waitFor();assert(await p.locator('#payment-notice-dialog').isVisible());await p.locator('#payment-notice-ok').click();assert.equal(await p.locator('#event-notice-title').textContent(),'影迷守護戲院');await notices(p);const s=await save(p);assert(!s.eventState.draws.some(d=>d.week===204));await p.reload();await p.locator('#venue-data').waitFor();assert(await p.locator('#event-notice-dialog').isHidden());assert.deepEqual(errors,[]);console.log('PASS existing film story occupies one event slot after bill, acknowledgment and reload');await p.close();
}
await b.close();})().catch(e=>{console.error(e);process.exit(1)});
