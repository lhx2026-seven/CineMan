const{chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.CINEMAN_BASE_URL||'http://127.0.0.1:8163';
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  for(const featured of[false,true]){
    const page=await browser.newPage({viewport:{width:390,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${base}/game.html?cinema=C03&fresh=1&run=guarantee-search`);await page.locator('#venue-data').waitFor();
    const run=await page.evaluate(()=>{for(let i=0;i<1000;i++){const seed='featured-guarantee/'+i,m=CinemaMovieRules.resolve(CinemaMovieDatabase,seed,3,2022,1);if(m.current.some(id=>CinemaMovieDatabase.movies.find(movie=>movie.id===id).tier==='bomb'))return seed;}throw Error('No bomb seed');});
    await page.goto(`${base}/game.html?cinema=C03&fresh=1&run=${encodeURIComponent(run)}`);await page.locator('#venue-data').waitFor();await page.evaluate(()=>CinemaSave.setEnabled(true));await page.locator('#tab-films').click();
    const ids=await page.evaluate(()=>[...document.querySelectorAll('.film-option:not([hidden]) input')].map(e=>({id:e.value,tier:CinemaMovieDatabase.movies.find(m=>m.id===e.value).tier})));
    const bomb=ids.find(m=>m.tier==='bomb').id,selected=featured?bomb:ids.find(m=>m.id!==bomb).id;
    await page.locator(`.film-option[data-film-value="${selected}"] .film-select`).click();if(featured)await page.locator('#featured-share').fill('1');
    await page.waitForFunction(()=>document.querySelector('#draft-status').textContent==='已自動存檔');
    await page.evaluate(async bomb=>{const s=await CinemaSave.getByRun(new URL(location.href).searchParams.get('run'));s.distributor.contracts[bomb].share=-.5;s.distributor.contracts[bomb].guarantee=-100000;await CinemaSave.save(s);},bomb);
    await page.reload();await page.locator('#venue-data').waitFor();await page.locator('#next-week').click();await page.waitForFunction(()=>document.querySelector('.week-badge').textContent==='2022 W2');await page.waitForFunction(()=>document.querySelector('#draft-status').textContent==='已自動存檔');
    await page.evaluate(async bomb=>{const s=await CinemaSave.getByRun(new URL(location.href).searchParams.get('run'));s.movies.history.find(h=>h.id===bomb).retiredAt=2;await CinemaSave.save(s);},bomb);
    await page.reload();await page.locator('#venue-data').waitFor();await page.waitForFunction(()=>document.querySelector('#draft-status').textContent==='已自動存檔');
    const read=()=>page.evaluate(async()=>CinemaSave.getByRun(new URL(location.href).searchParams.get('run'))),state=await read(),contract=state.distributor.contracts[bomb],fees=state.distributor.receipts.filter(r=>r.type==='guarantee'&&r.filmID===bomb);
    assert.equal(state.boxOffice.receipts[0].featuredID,selected);assert.equal(contract.closedAt,2);assert(contract.paidShare>-100000);
    assert.equal(fees.length,featured?1:0);if(featured)assert.equal(fees[0].deduction,-100000-contract.paidShare);
    assert(state.distributor.receipts.some(r=>r.type==='gross'&&r.filmID===bomb));
    await page.reload();await page.locator('#venue-data').waitFor();await page.waitForFunction(()=>document.querySelector('#draft-status').textContent==='已自動存檔');assert.deepEqual((await read()).distributor,state.distributor);assert.deepEqual(errors,[]);
    console.log('PASS',featured?'featured bomb pays cumulative top-up':'non-featured bomb is exempt',', regular share still posts and reload never duplicates fees');await page.close();
  }
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
