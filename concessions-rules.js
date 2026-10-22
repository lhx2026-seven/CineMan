'use strict';
(function(root){
  const round=n=>Math.round(n+Number.EPSILON*Math.max(1,Math.abs(n))*4);
  function create(){return{version:1,lastSettledWeek:null,receipts:[]};}
  function calculate(prices,viewers,rate){
    if(!Array.isArray(prices)||prices.length<2||prices.length>3||prices.some(p=>!Number.isFinite(p)||p<0)||!Number.isSafeInteger(viewers)||viewers<0||!Number.isFinite(rate)||rate<.01||rate>.9||Math.abs(rate*100-Math.round(rate*100))>1e-8)throw Error('餐飲收入參數錯誤');
    return round(prices.reduce((s,p)=>s+p,0)*viewers*Math.round(rate*100)/(prices.length*100));
  }
  function resolve(saved,now){
    if(saved==null)return create();
    if(saved.version!==1||!Array.isArray(saved.receipts))throw Error('餐飲收入存檔錯誤');
    let previous=0;for(const r of saved.receipts){
      if(!Number.isInteger(r.earnedAt)||r.earnedAt<=previous||r.bookedAt!==r.earnedAt+1||r.bookedAt>now||!Array.isArray(r.items)||r.items.some(i=>typeof i.name!=='string')||!Number.isSafeInteger(r.gross)||r.gross!==calculate(r.items.map(i=>i.price),r.viewers,r.purchaseRate))throw Error('餐飲收入收據錯誤');
      const average=r.items.reduce((s,i)=>s+i.price,0)/r.items.length;if(r.averagePrice!==average)throw Error('餐飲均價存檔錯誤');previous=r.earnedAt;
    }
    if(saved.lastSettledWeek!==(previous||null))throw Error('餐飲結算週次錯誤');return structuredClone(saved);
  }
  function advance(state,ticketReceipt,values,exclusiveFood,seed){
    const now=ticketReceipt.earnedAt;if(!Number.isInteger(now)||now<1||ticketReceipt.bookedAt!==now+1||state.lastSettledWeek!==null&&now!==state.lastSettledWeek+1)throw Error('餐飲收入重複或錯週結算');
    const items=[{name:'爆米花',price:Number(values.popcornPrice)},{name:'飲料',price:Number(values.drinkPrice)}];
    if(exclusiveFood!==null){if(typeof exclusiveFood!=='string'||!exclusiveFood)throw Error('獨家餐飲錯誤');items.push({name:exclusiveFood,price:Number(values.exclusiveFoodPrice)});}
    const viewers=ticketReceipt.films.reduce((sum,f)=>{if(!Number.isSafeInteger(f.dailyViewers)||f.dailyViewers<0||!Number.isSafeInteger(f.specialViewers)||f.specialViewers<0)throw Error('觀影人次錯誤');return sum+f.dailyViewers*3+f.specialViewers;},0);
    const purchaseRate=(1+Math.floor(root.CinemaRules.seededRandom(`concessions/v1/${seed}/${now}/purchase`)()*90))/100;
    const gross=calculate(items.map(i=>i.price),viewers,purchaseRate),receipt={earnedAt:now,bookedAt:now+1,items,averagePrice:items.reduce((s,i)=>s+i.price,0)/items.length,viewers,purchaseRate,gross};
    return{version:1,lastSettledWeek:now,receipts:[...state.receipts,receipt]};
  }
  function totals(state,now){return{weekly:(state?.receipts||[]).filter(r=>r.bookedAt===now).reduce((s,r)=>s+r.gross,0),annual:(state?.receipts||[]).filter(r=>Math.floor((r.bookedAt-1)/50)===Math.floor((now-1)/50)).reduce((s,r)=>s+r.gross,0)};}
  const api={create,calculate,resolve,advance,totals};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaConcessions=api;
})(globalThis);
