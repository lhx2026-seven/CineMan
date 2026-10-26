const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.CINEMAN_BASE_URL||'http://127.0.0.1:8162';
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  for(const width of[390,1440])for(const[id,slug]of Object.entries({C01:'baogong',C02:'century',C03:'broadway',C04:'ylc',C05:'arthouse'}).filter(([id])=>!process.env.CINEMAN_TEST_CINEMA||id===process.env.CINEMAN_TEST_CINEMA)){
    const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
    await page.goto(`${base}/game.html?cinema=${id}&fresh=1&run=year-visuals-${id}-${width}`);
    await page.locator('#venue-data').waitFor();await page.evaluate(()=>CinemaSave.setEnabled(true));
    await page.locator('#tab-films').click();await page.locator('.film-select').first().click();
    await page.waitForFunction(()=>document.querySelector('#draft-status').textContent==='已自動存檔');
    const expected=year=>({hero:[2023,2025].includes(year)?'interior':'exterior',footer:[2024,2025].includes(year)?'ticket':'counter'});
    async function check(year){
      await page.locator('#cinema-counter').scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>['cinema-exterior','cinema-counter'].every(id=>{const img=document.getElementById(id);return img.complete&&img.naturalWidth>0;}));
      const visuals=await page.evaluate(()=>['cinema-exterior','cinema-counter'].map(id=>{const e=document.getElementById(id);return{src:e.currentSrc,alt:e.alt,scene:e.dataset.scene,fit:getComputedStyle(e).objectFit};}));
      const config=expected(year);assert.equal(visuals[0].scene,config.hero);assert.equal(visuals[1].scene,config.footer);
      assert(visuals[0].src.includes(`${slug}-${config.hero}`),JSON.stringify(visuals));
      if(config.footer==='ticket'){
        assert(visuals[1].src.includes(`${slug}-ticket-scene-v${id==='C01'?2:1}`));assert(visuals[1].alt.includes('單張電影票情境照'));assert.equal(visuals[1].fit,'contain');
        assert(visuals[1].alt.includes(id==='C01'?'復古全票':['C02','C05'].includes(id)?'日期2025.01.01':'片名CineMan'));
        assert(await page.locator('.next-week-area #next-week').isVisible());
      }else assert(visuals[1].src.includes(`${slug}-counter`),JSON.stringify(visuals));
      assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
    }
    async function acknowledgeNotices(){
      if(await page.locator('#payment-notice-dialog').isVisible())await page.locator('#payment-notice-ok').click();
      while(await page.locator('#event-notice-dialog').isVisible())await page.locator('#event-notice-actions button').filter({hasText:'了解'}).click();
    }
    async function reload(year){
      requests.length=0;await page.reload();await page.locator('#venue-data').waitFor();await acknowledgeNotices();await check(year);
      await page.waitForFunction(()=>document.querySelector('#draft-status').textContent==='已自動存檔');
      const config=expected(year),unused=[config.hero==='interior'?'exterior':'interior',config.footer==='ticket'?'counter':'ticket','projection'];
      assert(!requests.some(url=>unused.some(kind=>url.includes(`${slug}-${kind}`))),`Loaded unused yearly image: ${requests.join(',')}`);
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
      await reload(year);
    }
    await check(2022);
    for(const year of[2022,2023,2024,2025]){
      await jump(year,50);await page.locator('#tab-films').click();
      const select=page.locator('.film-option:not([hidden]) .film-select');if(await select.count())await select.first().click();
      await page.locator('#next-week').click();await page.waitForFunction(y=>document.querySelector('.week-badge').textContent===`${y}年度會議`,year);await check(year);
      await page.locator('#next-week').click();await page.waitForFunction(y=>document.querySelector('.week-badge').textContent===`${y} W1`,year+1);await check(year+1);
      await page.waitForFunction(()=>document.querySelector('#draft-status').textContent==='已自動存檔');await reload(year+1);
      if([2024,2025].includes(year+1))await page.locator('.counter-scene').screenshot({path:`/tmp/cineman-footer-ticket-${slug}-${year+1}-${width}.png`});
    }
    assert(fs.existsSync(path.join(__dirname,`../assets/cinemas/projection/${slug}-projection.webp`)),'Projection backup must be retained');
    assert.deepEqual(errors,[]);console.log('PASS',id,width,'all five yearly layouts, all four live year boundaries, meeting preserves year, reload avoids unused images, full footer tickets and projection backup');
    await page.close();
  }
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
