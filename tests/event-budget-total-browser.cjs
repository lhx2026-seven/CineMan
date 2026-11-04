const{chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.CINEMAN_BASE_URL||'http://127.0.0.1:8203';
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
for(const width of[390,1440])for(const[event,choice,extra,locked]of[['ec002',0,120000,[]],['ec003',0,10000,[]],['eb011',0,0,['consumables']],['ef001',0,100000,['staffing','maintenance']]]){
 const p=await b.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(event=>{let db;Object.defineProperty(globalThis,'CinemaEventDatabase',{configurable:true,get:()=>db,set:v=>db={...v,events:v.events.map(e=>({...e,condition:e.id===event?{calendar:[[2022,2,2]]}:{cinemas:['test-disabled']}}))}});},event);
 await p.goto(`${base}/game.html?cinema=C03&fresh=1&run=event-total-${event}-${width}`);await p.locator('#venue-data').waitFor();await p.evaluate(()=>CinemaSave.setEnabled(true));
 async function total(expectedExtra){const values=await p.evaluate(()=>({sum:['staffing','foodCost','maintenance','marketing','consumables'].reduce((n,k)=>n+Number(document.querySelector(`[name=${k}]`).value),0),display:Number(document.querySelector('#budget-total').textContent.replace(/[^0-9]/g,''))}));assert.equal(values.display,values.sum+expectedExtra);}
 await total(0);await p.locator('#tab-films').click();await p.locator('.film-select').first().click();await p.locator('#next-week').click();await p.locator('#ticket-confirm').click();await p.waitForFunction(()=>document.querySelector('.week-badge').textContent==='2022 W2');
 await p.locator('#event-notice-actions button').nth(choice).click();await p.locator('#event-notice-dialog').waitFor({state:'hidden'});await total(extra);
 for(const name of locked)assert(await p.locator(`[name=${name}]`).isDisabled());
 // Input-only updates use the light slider path and must retain the event cost.
 await p.evaluate(()=>{const c=document.querySelector('[name=marketing]');c.value='5000';c.dispatchEvent(new Event('input',{bubbles:true}));});await total(extra);
 await p.locator('#tab-budget').click();await p.waitForFunction(()=>document.querySelector('#draft-status').textContent==='已自動存檔');await p.reload();await p.locator('#venue-data').waitFor();await total(extra);
 await p.locator('#tab-films').click();if(await p.locator('.film-select:enabled').count())await p.locator('.film-select:enabled').first().click();await p.locator('#next-week').click();await p.waitForFunction(()=>document.querySelector('.week-badge').textContent==='2022 W3');await total(0);assert.deepEqual(errors,[]);
 console.log('PASS',width,event,'immediate total, slider changes, locked costs counted once, reload and expiry');await p.close();
}await b.close();})().catch(e=>{console.error(e);process.exit(1)});
