const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.CINEMAN_BASE_URL||'http://127.0.0.1:8169';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 for(const [id,tenure,width] of [['C01','rented',320],['C03','rented',390],['C04','rented',1440],['C04','owned',390],['C01','owned',1440],['C05','owned',390]]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/game.html?cinema=${id}&fresh=1&run=notice-seed`);await page.locator('#venue-data').waitFor();
  const run=await page.evaluate(({id,tenure})=>{for(let i=0;i<10000;i++){const seed=`notice-${id}-${i}`;if(CinemaProperty.draw(CinemaDatabase,id,seed).tenure===tenure)return seed;}throw Error('seed');},{id,tenure});
  await page.goto(`${base}/game.html?cinema=${id}&fresh=1&run=${run}`);await page.locator('#venue-data').waitFor();
  await page.evaluate(()=>CinemaSave.setEnabled(true));await page.locator('#tab-films').click();await page.locator('.film-select').first().click();
  const saved=()=>page.waitForFunction(()=>document.querySelector('#draft-status').textContent==='已自動存檔');
  const read=()=>page.evaluate(()=>CinemaSave.getByRun(new URL(location.href).searchParams.get('run')));
  const dialog=page.locator('#payment-notice-dialog');await saved();assert(!await dialog.isVisible());
  async function jump(year,week){
   await page.evaluate(async({year,week})=>{
    const s=await CinemaSave.getByRun(new URL(location.href).searchParams.get('run'));s.year=year;s.week=week;s.annualMeeting=null;
    let m=CinemaMovieRules.create(s.runId,s.allocation.screenCount);const end=CinemaMovieRules.absoluteWeek(year,week);
    for(let n=1;n<=end;n++)m=CinemaMovieRules.releaseWeek(CinemaMovieDatabase,m,2022+Math.floor((n-1)/50),(n-1)%50+1);
    s.movies=CinemaBoxOffice.hydrate(CinemaMovieDatabase,m);s.values.featuredFilm=m.current[0];
    for(const key of ['activation','foodRevenue','merchandise','boxOffice','distributor','operatingExpenses'])delete s[key];
    await CinemaSave.save(s);
   },{year,week});await page.reload();await page.locator('#venue-data').waitFor();await saved();
  }
  const next=async period=>{await page.locator('#tab-films').click();await page.locator('.film-select').first().click();await page.locator('#next-week').click();await page.waitForFunction(text=>document.querySelector('.week-badge').textContent===text,period);await saved();};
  async function check(){
   const s=await read(),week=(s.year-2022)*50+s.week;
   const expected=await page.evaluate(({s,week})=>CinemaEvents.paymentReminders({...s,week}),{s,week});
   assert.equal(await dialog.isVisible(),expected.length>0);
   if(!expected.length)return;
   assert.equal(await dialog.locator('button').count(),1);assert.equal(await dialog.locator('button').textContent(),'了解');
   assert.deepEqual(await page.locator('#payment-notice-list p').allTextContents(),expected.map(n=>`${n.title} NT$${n.amount.toLocaleString('zh-TW')}`));
   assert.equal(await page.locator('#weekly-event-list').getByText(/本週應繳|本週繳交/).count(),0);
   const box=await dialog.boundingBox();assert(Math.abs(box.x+box.width/2-width/2)<2);assert(Math.abs(box.y+box.height/2-500)<2);
   assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
   await dialog.screenshot({path:`/tmp/cineman-payment-${id}-${tenure}-${width}-W${s.week}.png`});
   await page.keyboard.press('Escape');assert(await dialog.isVisible());
   await page.reload();await page.locator('#venue-data').waitFor();await saved();assert(await dialog.isVisible());
   await page.locator('#payment-notice-ok').click();await saved();assert(!await dialog.isVisible());
   const ack=await read();assert.equal(ack.paymentNoticeAcknowledgedWeek,week);
   for(const key of ['rent','managementFee','propertyTax','utilityBills'])assert.deepEqual(ack[key],s[key]);
   await page.reload();await page.locator('#venue-data').waitFor();await saved();assert(!await dialog.isVisible());
  }
  await jump(2022,7);assert(!await dialog.isVisible());await next('2022 W8');await check();
  await next('2022 W9');assert(!await dialog.isVisible());
  await jump(2022,45);assert(!await dialog.isVisible());await next('2022 W46');await check();
  await jump(2023,2);await check();
  assert.deepEqual(errors,[]);console.log('PASS',id,tenure,width,'actual bill amounts, combined notices, centered single button, no duplicate events/charges, unacknowledged reload, acknowledgement persisted, tax exemptions and cross-year due week');await page.close();
 }
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
