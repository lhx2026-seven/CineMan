const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.CINEMAN_BASE_URL||'http://127.0.0.1:8144';
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  for(const width of[390,1440])for(const[id,slug]of Object.entries({C01:'baogong',C02:'century',C03:'broadway',C04:'ylc',C05:'arthouse'}).filter(([id])=>!process.env.CINEMAN_TEST_CINEMA||id===process.env.CINEMAN_TEST_CINEMA)){
    const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
    await page.goto(`${base}/game.html?cinema=${id}&fresh=1&run=year-visuals-${id}-${width}`);
    await page.locator('#venue-data').waitFor();await page.evaluate(()=>CinemaSave.setEnabled(true));
    await page.locator('#tab-films').click();await page.locator('.film-select').first().click();
    await page.waitForFunction(()=>document.querySelector('#draft-status').textContent==='已自動存檔');
    async function check(year){
      await page.locator('#cinema-counter').scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>['cinema-exterior','cinema-counter'].every(id=>{const img=document.getElementById(id);return img.complete&&img.naturalWidth>0;}));
      const visuals=await page.evaluate(()=>['cinema-exterior','cinema-counter'].map(id=>{const e=document.getElementById(id);return{src:e.currentSrc,alt:e.alt,scene:e.dataset.scene};}));
      assert(visuals[0].src.includes(year>=2025?`${slug}-ticket`:year>=2023?`${slug}-interior`:slug+'-exterior'),JSON.stringify(visuals));
      assert(visuals[1].src.includes(`${slug}-${year>=2024?'projection':'counter'}`),JSON.stringify(visuals));
      assert.equal(visuals[1].scene,year>=2024?'projection':'counter');
      assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
    }
    async function jump(year,week){
      await page.evaluate(async({year,week})=>{
        const s=await CinemaSave.getByRun(new URL(location.href).searchParams.get('run'));
        s.year=year;s.week=week;s.annualMeeting=null;
        let m=CinemaMovieRules.create(s.runId,s.allocation.screenCount);
        const now=CinemaMovieRules.absoluteWeek(year,week);
        for(let w=1;w<=now;w++)m=CinemaMovieRules.releaseWeek(CinemaMovieDatabase,m,2022+Math.floor((w-1)/50),(w-1)%50+1);
        s.movies=CinemaBoxOffice.hydrate(CinemaMovieDatabase,m);s.values.featuredFilm=m.current[0];
        for(const key of['activation','boxOffice','distributor','foodRevenue','merchandise','operatingExpenses','rent','propertyTax','managementFee','utilityBills'])delete s[key];
        await CinemaSave.save(s);
      },{year,week});
      requests.length=0;await page.reload();await page.locator('#venue-data').waitFor();
      await page.waitForFunction(()=>document.querySelector('#draft-status').textContent==='已自動存檔');
    }
    await check(2022);
    await jump(2023,1);await check(2023);
    assert(!requests.some(url=>url.includes(`${slug}-exterior`)),'2023 reload fetched the old exterior');
    await jump(2023,50);await check(2023);
    await page.locator('#tab-films').click();
    const select=page.locator('.film-option:not([hidden]) .film-select');if(await select.count())await select.first().click();
    await page.locator('#next-week').click();await page.waitForFunction(()=>document.querySelector('.week-badge').textContent==='2023年度會議');
    await check(2023);await page.locator('#next-week').click();
    await page.waitForFunction(()=>document.querySelector('.week-badge').textContent==='2024 W1');await check(2024);
    await page.waitForFunction(()=>document.querySelector('#draft-status').textContent==='已自動存檔');
    requests.length=0;await page.reload();await page.locator('#venue-data').waitFor();await check(2024);
    assert(!requests.some(url=>url.includes(`${slug}-counter`)),'2024 reload fetched the old counter');
    await page.locator('.counter-scene').screenshot({path:`/tmp/cineman-projection-${slug}-${width}.png`});
    await jump(2024,50);await check(2024);
    await page.locator('#tab-films').click();
    const select2024=page.locator('.film-option:not([hidden]) .film-select');if(await select2024.count())await select2024.first().click();
    await page.locator('#next-week').click();await page.waitForFunction(()=>document.querySelector('.week-badge').textContent==='2024年度會議');await check(2024);
    await page.locator('#next-week').click();await page.waitForFunction(()=>document.querySelector('.week-badge').textContent==='2025 W1');await check(2025);
    assert.equal(await page.locator('#cinema-exterior').evaluate(e=>getComputedStyle(e).objectFit),'contain');
    assert((await page.locator('#cinema-exterior').getAttribute('alt')).includes(id==='C01'?'復古全票':id==='C02'?'日期2025.01.01':'片名CineMan'));
    await page.waitForFunction(()=>document.querySelector('#draft-status').textContent==='已自動存檔');
    requests.length=0;await page.reload();await page.locator('#venue-data').waitFor();await check(2025);
    assert(!requests.some(url=>url.includes(`${slug}-interior`)),'2025 reload fetched the superseded interior');
    await page.locator('.cinema-hero').screenshot({path:`/tmp/cineman-ticket-${slug}-${width}.png`});
    await jump(2026,1);await check(2026);
    assert.deepEqual(errors,[]);console.log('PASS',id,width,'2022 exterior, 2023 interior, 2023 meeting retains counter, 2024 projection, 2025 ticket live switch/reload/contain, 2026 ticket retained and no superseded image requests');
    await page.close();
  }
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
