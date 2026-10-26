const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.CINEMAN_BASE_URL||'http://127.0.0.1:8175';
const root=path.join(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 for(const [id,slug,width,dpr] of [['C01','baogong',390,2,960],['C04','ylc',390,3,1280],['C05','arthouse',1440,2,1280]]){
  const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:dpr,reducedMotion:'reduce'}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.addInitScript(()=>new MutationObserver(()=>{
   const image=document.querySelector('#cinema-exterior');
   if(image&&!window.imageAtReveal&&(document.body.classList.contains('reveal')||!document.body.classList.contains('page-entering')))window.imageAtReveal={ready:image.complete&&image.naturalWidth>0,at:performance.now(),src:image.currentSrc};
  }).observe(document,{childList:true,subtree:true,attributes:true,attributeFilter:['class']}));
  const stem=`${slug}-exterior${['C02','C03','C04'].includes(id)?'-v2':''}`;
  await page.goto(base+'/index.html');
  const offset=['C05','C02','C01','C03','C04'].indexOf(id)-2;
  for(let i=0;i<Math.abs(offset);i++)await page.locator(offset>0?'#next-cinema':'#previous-cinema').click();
  await page.evaluate(()=>new MutationObserver((records,observer)=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeName==='LINK'&&node.as==='image'){node.addEventListener('load',()=>window.heroPreloadComplete=true,{once:true});observer.disconnect();}}).observe(document.head,{childList:true}));
  await page.locator(`[data-cinema-id="${id}"] .select-button`).click();await page.waitForFunction(()=>window.heroPreloadComplete);
  const preload=await page.locator('link[rel=preload][as=image]').evaluateAll(links=>links.map(l=>({sizes:l.imageSizes,srcset:l.imageSrcset,priority:l.fetchPriority})));
  assert.equal(preload.length,1);assert.equal(preload[0].priority,'high');
  await page.locator('#confirm-selection').click();await page.waitForURL('**/game.html?*',{waitUntil:'domcontentloaded'});await page.locator('#venue-data').waitFor();assert.equal(new URL(page.url()).searchParams.get('cinema'),id);await page.waitForFunction(()=>window.imageAtReveal);
  const visual=await page.evaluate(()=>({src:document.querySelector('#cinema-exterior').currentSrc,sizes:document.querySelector('#cinema-exterior').sizes,footerPriority:document.querySelector('#cinema-counter').fetchPriority,reveal:window.imageAtReveal}));
  const target=new URL(visual.src).pathname.split('/').at(-1);assert([`${stem}-960.webp`,`${stem}-1280.webp`].includes(target),JSON.stringify(visual));assert(visual.reveal.ready,JSON.stringify(visual));assert.equal(visual.sizes,preload[0].sizes);assert.equal(visual.footerPriority,'low');
  assert(!requests.some(url=>url.endsWith(`/landscape/${stem}.webp`)),requests.join('\n'));
  const bytes=fs.statSync(path.join(root,'assets/cinemas/optimized',target)).size,original=fs.statSync(path.join(root,'assets/cinemas/landscape',stem+'.webp')).size;assert(bytes<original*.6);
  assert.deepEqual(errors,[]);console.log('PASS',id,`${width}px @${dpr}x`,`${Math.round(original/1024)}→${Math.round(bytes/1024)} KiB`, 'selected hero preloaded, matching responsive source, image ready before reveal, low-priority footer');await page.close();
 }
 for(const failure of['stalled','broken','decode-throws']){
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(failure==='decode-throws')await page.addInitScript(()=>HTMLImageElement.prototype.decode=()=>{throw Error('Injected decoder failure');});
  else await page.route('**/assets/cinemas/optimized/baogong-exterior-*.webp',async route=>{
   if(failure==='stalled')await new Promise(resolve=>setTimeout(resolve,1500));
   try{await route.abort();}catch{}
  });
  const start=Date.now();await page.goto(`${base}/game.html?cinema=C01&fresh=1&run=image-${failure}`,{waitUntil:'domcontentloaded'});
  await page.locator('#venue-data').waitFor();await page.waitForFunction(()=>!document.body.classList.contains('page-entering'));
  assert(Date.now()-start<1200,`${failure} blocked reveal`);assert(!await page.locator('#management-form').evaluate(e=>e.inert));assert.deepEqual(errors,[]);
  console.log('PASS',failure,'image/network/decoder failure cannot trap the game behind curtains');await page.close();
 }
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
