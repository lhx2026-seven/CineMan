const{chromium}=require('playwright'),assert=require('node:assert/strict');const base=process.env.CINEMAN_BASE_URL||'http://127.0.0.1:8193';
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});for(const width of[390,1440]){const p=await b.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
 for(const route of['index.html','game.html?cinema=C03&fresh=1&run=ui-fonts']){
  await p.goto(base+'/'+route);if(route.startsWith('game'))await p.locator('#venue-data').waitFor();else await p.locator('.select-button').first().waitFor();
  assert((await p.locator('.logo').evaluate(e=>getComputedStyle(e).fontFamily)).startsWith('Georgia'));
  const wrong=await p.evaluate(()=>{const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),bad=[];let text;while(text=walker.nextNode()){const e=text.parentElement;if(!/[a-zA-Z0-9]/.test(text.textContent)||e.closest('.logo,.entry-title > span,script,style'))continue;const font=getComputedStyle(e).fontFamily;if(!font.startsWith('Arial'))bad.push({text:text.textContent.trim().slice(0,40),font});}return bad;});assert.deepEqual(wrong,[]);
  if(route.startsWith('game'))for(const selector of['#weekly-box-office','#weekly-profit','#annual-profit','#annual-income-tax','#share-output','[name=staffing]'])assert((await p.locator(selector).evaluate(e=>getComputedStyle(e).fontFamily)).startsWith('Arial'));
  assert(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));console.log('PASS',width,route,'all Latin/digit UI text uses Arial, logo remains Georgia, no overflow');
 }await p.close();}await b.close();})().catch(e=>{console.error(e);process.exit(1)});
