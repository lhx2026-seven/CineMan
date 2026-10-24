const{chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.CINEMAN_BASE_URL||'http://127.0.0.1:8163';
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  for(const width of[320,390,1440]){
    const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${base}/game.html?cinema=C01&fresh=1&run=report-alignment-${width}`);await page.locator('#venue-data').waitFor();
    for(const period of['weekly','annual']){
      await page.evaluate(period=>{
        document.querySelector(`#${period}-box-office`).textContent='123,456,789';
        document.querySelector(`#${period}-net-box-office`).textContent='12,345,678,901';
        document.querySelector(`#${period}-concessions`).textContent='12,345';
        document.querySelector(`#${period}-goods`).textContent='987,654,321';
      },period);
      await page.locator(`#tab-${period==='weekly'?'annual':'weekly'}`).click();
      await page.locator(`#tab-${period}`).click();
      const aligned=()=>page.evaluate(period=>['box-office','net-box-office','concessions','goods'].every(key=>{
        const cell=document.getElementById(`${period}-${key}`),style=getComputedStyle(cell),box=cell.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(cell);const text=range.getBoundingClientRect();
        return Math.abs(text.right-(box.right-parseFloat(style.paddingRight)))<1&&text.left>=box.left+parseFloat(style.paddingLeft)-1&&text.height<25;
      }),period);
      assert(await aligned(),`${width} ${period} amounts overflow or have unequal right edges`);
      await page.setViewportSize({width:width+30,height:1000});await page.setViewportSize({width,height:1000});
      await page.waitForTimeout(80);assert(await aligned(),`${width} ${period} resize alignment`);
      await page.locator('#financial-report').screenshot({path:`/tmp/cineman-report-alignment-${period}-${width}.png`});
    }
    assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));assert.deepEqual(errors,[]);
    console.log('PASS',width,'weekly/annual long gross/net/expense amounts share the exact column edge, short values stay readable, tabs and resize');await page.close();
  }
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
