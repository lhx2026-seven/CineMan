const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.CINEMAN_BASE_URL||'http://127.0.0.1:8170';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 for(const width of[320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/game.html?cinema=C01&fresh=1&run=event-ui-${width}`);await page.locator('#venue-data').waitFor();
  assert.equal(await page.locator('#weekly-bulletin,#weekly-events,.workspace-bar').count(),0);
  assert(await page.locator('#annual-meeting-section').isHidden());
  const badge=page.locator('.hero-title-row .week-badge');assert.equal(await badge.textContent(),'2022 W1');
  assert.equal(await badge.evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');assert.equal(await badge.evaluate(e=>getComputedStyle(e).fontSize),await page.locator('#venue-seat-count').evaluate(e=>getComputedStyle(e).fontSize));
  const label=await page.locator('#finance-title').boundingBox(),weekly=await page.locator('#tab-weekly').boundingBox();assert(label.x+label.width<weekly.x);assert(Math.abs(label.y+label.height/2-weekly.y-weekly.height/2)<2);
  for(const property of['color','backgroundColor','borderColor','boxShadow','borderRadius','fontSize','minHeight'])assert.equal(await page.locator('#tab-weekly').evaluate((e,p)=>getComputedStyle(e)[p],property),await page.locator('#tab-budget').evaluate((e,p)=>getComputedStyle(e)[p],property),property);
  await page.locator('#tab-annual').click();assert.equal(await page.locator('#tab-annual').getAttribute('aria-selected'),'true');assert(await page.locator('#report-weekly').isHidden());await page.keyboard.press('ArrowLeft');assert(await page.locator('#report-weekly').isVisible());
  const dialog=page.locator('#event-notice-dialog');assert(!await dialog.isVisible());
  await page.evaluate(()=>CinemaEvents.render({events:[{id:'notice',title:'測試公告',message:'事件內容測試'},{id:'choice',title:'測試決策',message:'選擇一個行動',choices:[{id:'yes',label:'採取行動'},{id:'no',label:'維持原狀'}]}],onAcknowledge:id=>(window.acks??=[]).push(id),onDecision:async result=>{window.eventDecision=result;}}));
  assert(await dialog.isVisible());assert.equal(await page.locator('#event-notice-title').textContent(),'測試公告');assert.equal(await dialog.locator('button').textContent(),'了解');
  const box=await dialog.boundingBox();assert(Math.abs(box.x+box.width/2-width/2)<2);assert(Math.abs(box.y+box.height/2-500)<2);
  await dialog.screenshot({path:`/tmp/cineman-event-dialog-${width}.png`});
  await page.keyboard.press('Escape');assert(await dialog.isVisible());await dialog.locator('button').click();assert.equal(await page.locator('#event-notice-title').textContent(),'測試決策');
  await dialog.locator('button').first().click();assert(!await dialog.isVisible());assert.deepEqual(await page.evaluate(()=>window.acks),['notice','choice']);assert.deepEqual(await page.evaluate(()=>window.eventDecision),{eventId:'choice',choiceId:'yes'});
  await page.evaluate(()=>CinemaEvents.render({events:[{id:'retry',title:'重試',message:'決策測試',choices:[{id:'go',label:'決定'}]}],onDecision:async()=>{if(!window.retried){window.retried=true;throw Error('expected');}}}));
  await dialog.locator('button').click();assert((await page.locator('#event-notice-status').textContent()).includes('請重試'));assert(await dialog.locator('button').isEnabled());await dialog.locator('button').click();assert(!await dialog.isVisible());
  await page.evaluate(()=>{document.querySelector('#payment-notice-dialog').dataset.week='1';document.querySelector('#payment-notice-dialog').showModal();CinemaEvents.render({events:[{id:'queued',title:'排隊事件',message:'繳費通知之後顯示'}],defer:true});});
  assert(!await dialog.isVisible());await page.locator('#payment-notice-ok').click();assert(await dialog.isVisible());await dialog.locator('button').click();
  await page.evaluate(()=>CinemaEvents.render({events:[{id:'read',title:'已讀',message:'不再顯示'}],acknowledged:['read']}));assert(!await dialog.isVisible());
  await page.screenshot({path:`/tmp/cineman-report-layout-${width}.png`,fullPage:true});assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));assert.deepEqual(errors,[]);
  console.log('PASS',width,'no inline events, relocated date, compact report title, matching tabs/keyboard, centered event queue, decisions/retry, acknowledgements and payment-first sequence');await page.close();
 }
 const page=await browser.newPage({reducedMotion:'reduce'});
 await page.goto(`${base}/game.html?cinema=C01&fresh=1&run=event-save-check`);await page.locator('#venue-data').waitFor();
 await page.evaluate(()=>CinemaSave.setEnabled(true));await page.locator('#tab-films').click();await page.locator('.film-select').first().click();
 await page.waitForFunction(()=>document.querySelector('#draft-status').textContent==='已自動存檔');
 const eventWeek=await page.evaluate(async()=>{
   const s=await CinemaSave.getByRun(new URL(location.href).searchParams.get('run'));let m=CinemaMovieRules.create(s.runId,s.allocation.screenCount),target=null;
   for(let n=1;n<=250;n++){
     m=CinemaMovieRules.releaseWeek(CinemaMovieDatabase,m,2022+Math.floor((n-1)/50),(n-1)%50+1);
     if(CinemaMovieRules.eventsFor(m,n).length){target=n;break;}
   }
   if(!target)throw Error('Expected existing special-film event');
   s.year=2022+Math.floor((target-1)/50);s.week=(target-1)%50+1;s.annualMeeting=null;s.movies=CinemaBoxOffice.hydrate(CinemaMovieDatabase,m);s.values.featuredFilm=m.current[0];s.paymentNoticeAcknowledgedWeek=target;
   for(const key of ['eventNoticeAcknowledged','boxOffice','distributor','foodRevenue','merchandise','activation','operatingExpenses'])delete s[key];
   await CinemaSave.save(s);return target;
 });
 await page.reload();await page.locator('#event-notice-dialog').waitFor();assert.equal(await page.locator('#event-notice-title').textContent(),'影迷守護戲院');
 await page.reload();await page.locator('#event-notice-dialog').waitFor();await page.locator('#event-notice-actions button').click();
 await page.waitForFunction(()=>document.querySelector('#draft-status').textContent==='已自動存檔');
 const ack=await page.evaluate(()=>CinemaSave.getByRun(new URL(location.href).searchParams.get('run')));assert.deepEqual(ack.eventNoticeAcknowledged,{week:eventWeek,ids:['MV0503-week4']});
 await page.reload();await page.locator('#venue-data').waitFor();assert(!await page.locator('#event-notice-dialog').isVisible());await page.close();
 console.log('PASS existing special-film event, unread reload and persisted acknowledgement without inventing random events');
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
