// Component regressions assert baseline prices/finance/layout. Exercise the real
// random event pool separately in events-season-browser.cjs.
module.exports=page=>page.addInitScript(()=>{
 let database;
 Object.defineProperty(globalThis,'CinemaEventDatabase',{configurable:true,get:()=>database,set:value=>{database={...value,events:value.events.map(event=>({...event,enabled:false}))};}});
});
