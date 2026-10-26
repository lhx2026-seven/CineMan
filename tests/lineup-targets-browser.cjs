const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.CINEMAN_BASE_URL||'http://127.0.0.1:8178';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 for(const [id,halls]of[['C01',3],['C02',6],['C03',7],['C04',14],['C05',2]]){
  const page=await browser.newPage({viewport:{width:390,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/game.html?cinema=${id}&fresh=1&run=lineup-seed`);await page.locator('#venue-data').waitFor();
  const run=await page.evaluate(({id,halls})=>{for(let i=0;i<300;i++){const run=`lineup-ui-${id}-${i}`,p=CinemaProperty.draw(CinemaDatabase,id,run),a=CinemaRules.generate(CinemaDatabase,id,run,null,p.locationID);if(a.screenCount===halls)return run;}throw Error('seed');},{id,halls});
  await page.goto(`${base}/game.html?cinema=${id}&fresh=1&run=${run}`);await page.locator('#venue-data').waitFor();await page.evaluate(()=>CinemaSave.setEnabled(true));
  const saved=()=>page.waitForFunction(()=>document.querySelector('#draft-status').textContent==='已自動存檔');
  const read=()=>page.evaluate(()=>CinemaSave.getByRun(new URL(location.href).searchParams.get('run')));
  await page.locator('#tab-budget').click();
  await page.evaluate(()=>{for(const [name,value]of[['marketing',10000],['maintenance',100000]]){const input=document.querySelector(`[name="${name}"]`);input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}});
  const counts=[];
  for(let week=1;week<=12;week++){
   await page.locator('#tab-films').click();const s=await read();
   if(s){const result=await page.evaluate(s=>({live:CinemaBoxOffice.showing(s.movies).length,range:CinemaBoxOffice.lineupRange(s.cinemaID,s.allocation.screenCount)}),s);counts.push(result.live);assert.equal(await page.locator('.film-option:not([hidden])').count(),s.movies.current.length);assert.equal(await page.locator('.old-film').count(),result.live-s.movies.current.length);}
   await page.locator('.film-select').first().click();
   await page.locator('[name=featuredSlots]').evaluate(input=>{input.value=String(Math.floor(Number(input.max)/2));input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});
   await page.locator('#next-week').click();if(week===1)await page.locator('#ticket-confirm').click();
   await page.waitForFunction(week=>document.querySelector('.week-badge').textContent===`2022 W${week+1}`,week);
   if(await page.locator('#payment-notice-dialog').isVisible())await page.locator('#payment-notice-ok').click();await saved();
  }
  const before=await read();await page.reload();await page.locator('#venue-data').waitFor();await saved();const after=await read();assert.deepEqual(after.movies,before.movies);assert.deepEqual(after.boxOffice,before.boxOffice);
  assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));assert.deepEqual(errors,[]);
  console.log('PASS',id,halls,'12 UI settlements, new+retained cards match live films, reload preserves protected movies and receipts; counts:',counts.join(','));await page.close();
 }
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
