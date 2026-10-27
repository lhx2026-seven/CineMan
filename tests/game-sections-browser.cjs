const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.CINEMAN_BASE_URL||'http://127.0.0.1:8171';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 for(const width of[320,390,1440])for(const id of['C01','C02','C03','C04','C05']){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/game.html?cinema=${id}&fresh=1&run=sections-${width}-${id}`);await page.locator('#venue-data').waitFor();
  const result=await page.evaluate(()=>{
   const hero=document.querySelector('.cinema-hero'),report=document.querySelector('#financial-report'),ops=document.querySelector('.operations-section'),footer=document.querySelector('.counter-scene');
   const name=document.querySelector('#cinema-name').getBoundingClientRect(),week=document.querySelector('.week-badge'),date=week.getBoundingClientRect();
   return{borders:[hero,report,ops,footer].map(e=>getComputedStyle(e).borderTopWidth),contained:hero.contains(document.querySelector('#venue-profile'))&&hero.contains(week)&&ops.contains(document.querySelector('.management-tabs'))&&ops.contains(document.querySelector('#management-form'))&&footer.contains(document.querySelector('#next-week')),right:date.left>=name.right&&Math.abs(date.y+date.height/2-name.y-name.height/2)<2,font:getComputedStyle(week).fontSize,seatFont:getComputedStyle(document.querySelector('#venue-seat-count')).fontSize,background:getComputedStyle(week).backgroundColor,dateBorder:getComputedStyle(week).borderTopWidth,overflow:document.documentElement.scrollWidth>innerWidth,innerBorder:getComputedStyle(document.querySelector('#panel-budget')).borderTopWidth,opsTop:ops.getBoundingClientRect().top,reportBottom:report.getBoundingClientRect().bottom,heroBottom:hero.getBoundingClientRect().bottom,footerTop:footer.getBoundingClientRect().top,opsBottom:ops.getBoundingClientRect().bottom};
  });
  assert(result.contained);assert(result.right);assert.equal(result.font,result.seatFont);assert.equal(result.background,'rgba(0, 0, 0, 0)');assert.equal(result.dateBorder,'1px');assert(result.borders.every(b=>parseFloat(b)>0));assert.equal(result.innerBorder,'0px');assert(!result.overflow);assert(result.opsTop>Math.max(result.reportBottom,result.heroBottom));assert(result.footerTop>result.opsBottom);
  // The image must not stretch with the annual ledger or cover venue text.
  const imageBounds=()=>page.locator('#cinema-exterior').evaluate(e=>{const image=e.getBoundingClientRect(),caption=document.querySelector('.hero-caption').getBoundingClientRect(),profile=document.querySelector('#venue-profile').getBoundingClientRect();return{width:image.width,height:image.height,bottom:image.bottom,captionTop:caption.top,profileTop:profile.top};});
  const weeklyImage=await imageBounds();
  for(const tab of['annual','weekly','annual','weekly']){
   await page.locator(`#tab-${tab}`).click();const image=await imageBounds();
   assert(Math.abs(image.height-weeklyImage.height)<1,JSON.stringify({width,id,tab,image,weeklyImage}));
   assert(Math.abs(image.width/image.height-2)<.02);
   assert(image.bottom<=image.captionTop+1&&image.bottom<=image.profileTop+1);
   if(width>760)assert(await page.evaluate(()=>Math.abs(document.querySelector('.cinema-hero').getBoundingClientRect().height-document.querySelector('#financial-report').getBoundingClientRect().height)<1),'Desktop overview cards must have equal heights');
  }
  await page.locator('#venue-details-title').click();
  const expandedImage=await imageBounds();assert(Math.abs(expandedImage.height-weeklyImage.height)<1);
  if(width>760)assert(await page.evaluate(()=>Math.abs(document.querySelector('.cinema-hero').getBoundingClientRect().height-document.querySelector('#financial-report').getBoundingClientRect().height)<1),'Expanded venue and report must stay equal in height');
  await page.locator('#venue-details-title').click();
  await page.locator('#cinema-exterior').evaluate(e=>{e.style.aspectRatio='';e.width=2048;e.height=1536;});
  const altered=await imageBounds();assert(Math.abs(altered.height-weeklyImage.height)<1,'Intrinsic image dimensions must not change the reserved image ratio');
  for(const tab of['pricing','films','budget']){await page.locator(`#tab-${tab}`).click();assert(await page.locator(`.operations-section #panel-${tab}`).isVisible());}
  await page.evaluate(()=>document.querySelector('.week-badge').textContent='2026年度會議');assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
  if(id==='C01'){await page.locator('.cinema-overview').screenshot({path:`/tmp/cineman-four-sections-top-${width}.png`});await page.locator('.operations-section').screenshot({path:`/tmp/cineman-four-sections-controls-${width}.png`});}
  assert.deepEqual(errors,[]);console.log('PASS',id,width,'four bordered groups, week beside name, seat-sized plain date, grouped operating tabs/panels, footer action and no overflow');await page.close();
 }
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
