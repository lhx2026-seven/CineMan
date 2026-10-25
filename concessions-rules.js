'use strict';
(function(root){
  const round=n=>Math.round(n+Number.EPSILON*Math.max(1,Math.abs(n))*4);
  function create(){return{version:1,lastSettledWeek:null,receipts:[]};}
  function calculate(prices,viewers,rate,marketing=0,foodCost,ruleVersion=1){
    if(!Array.isArray(prices)||prices.length<2||prices.length>3||prices.some(p=>!Number.isFinite(p)||p<0)||!Number.isSafeInteger(viewers)||viewers<0||!Number.isFinite(rate)||rate<.01||rate>.9||Math.abs(rate*100-Math.round(rate*100))>1e-8)throw Error('餐飲收入參數錯誤');
    if(!Number.isSafeInteger(marketing)||marketing<0)throw Error('餐飲行銷費參數錯誤');
    const tenths=10+Math.floor(marketing/10000);
    const sum=prices.reduce((s,p)=>s+p,0);
    let gross=sum*viewers*Math.round(rate*100)*tenths/(prices.length*1000);
    // Missing cost identifies legacy receipts, whose posted amounts stay fixed.
    if(foodCost!==undefined&&ruleVersion===1){
      if(!Number.isSafeInteger(foodCost)||foodCost<0)throw Error('餐飲成本參數錯誤');
      if(foodCost*prices.length*3<sum*viewers)gross/=2;
      if(foodCost*prices.length*10<sum*viewers)gross=Math.min(gross,sum*viewers/(prices.length*10));
    }
    return round(gross);
  }
  function purchaseRange(prices,viewers,foodCost,staffing,screenCount){
    if(!Number.isSafeInteger(foodCost)||foodCost<0||!Number.isSafeInteger(staffing)||staffing<0||!Number.isInteger(screenCount)||screenCount<1)throw Error('餐飲購買率預算錯誤');
    if(staffing<screenCount*4000)return[10,10];
    const base=prices.reduce((sum,p)=>sum+p,0)*viewers;
    if(foodCost*prices.length*100<base*10)return[1,10];
    if(foodCost*prices.length*100<base*33)return[11,20];
    return[30,60];
  }
  function resolve(saved,now){
    if(saved==null)return create();
    if(saved.version!==1||!Array.isArray(saved.receipts))throw Error('餐飲收入存檔錯誤');
    let previous=0;for(const r of saved.receipts){
      if(r.accountingYear!==undefined&&(r.earnedAt%50!==0||r.accountingYear!==2022+Math.floor((r.earnedAt-1)/50)))throw Error('收入年度歸屬錯誤');
      if(!Number.isInteger(r.earnedAt)||r.earnedAt<=previous||r.bookedAt!==r.earnedAt+1||r.bookedAt>now||!Array.isArray(r.items)||r.items.some(i=>typeof i.name!=='string')||!Number.isSafeInteger(r.gross)||r.gross!==calculate(r.items.map(i=>i.price),r.viewers,r.purchaseRate,r.marketing??0,r.foodCost,r.ruleVersion??1))throw Error('餐飲收入收據錯誤');
      if(r.ruleVersion!==undefined){if(r.ruleVersion!==2)throw Error('餐飲規則版本錯誤');const [min,max]=purchaseRange(r.items.map(i=>i.price),r.viewers,r.foodCost,r.staffing,r.screenCount);if(Math.round(r.purchaseRate*100)<min||Math.round(r.purchaseRate*100)>max)throw Error('餐飲購買率存檔錯誤');}
      const average=r.items.reduce((s,i)=>s+i.price,0)/r.items.length;if(r.averagePrice!==average)throw Error('餐飲均價存檔錯誤');previous=r.earnedAt;
    }
    if(saved.lastSettledWeek!==(previous||null))throw Error('餐飲結算週次錯誤');return structuredClone(saved);
  }
  function advance(state,ticketReceipt,values,exclusiveFood,seed,screenCount=1){
    const now=ticketReceipt.earnedAt;if(!Number.isInteger(now)||now<1||ticketReceipt.bookedAt!==now+1||state.lastSettledWeek!==null&&now!==state.lastSettledWeek+1)throw Error('餐飲收入重複或錯週結算');
    const items=[{name:'爆米花',price:Number(values.popcornPrice)},{name:'飲料',price:Number(values.drinkPrice)}];
    if(exclusiveFood!==null){if(typeof exclusiveFood!=='string'||!exclusiveFood)throw Error('獨家餐飲錯誤');items.push({name:exclusiveFood,price:Number(values.exclusiveFoodPrice)});}
    const viewers=ticketReceipt.films.reduce((sum,f)=>{if(!Number.isSafeInteger(f.dailyViewers)||f.dailyViewers<0||!Number.isSafeInteger(f.specialViewers)||f.specialViewers<0)throw Error('觀影人次錯誤');return sum+f.dailyViewers*3+f.specialViewers;},0);
    const marketing=Number(values.marketing??0),foodCost=Number(values.foodCost??0),staffing=Number(values.staffing??0);
    const [min,max]=purchaseRange(items.map(i=>i.price),viewers,foodCost,staffing,screenCount);
    const purchaseRate=(min+Math.floor(root.CinemaRules.seededRandom(`concessions/v2/${seed}/${now}/purchase`)()*(max-min+1)))/100;
    const gross=calculate(items.map(i=>i.price),viewers,purchaseRate,marketing,foodCost,2),receipt={ruleVersion:2,earnedAt:now,bookedAt:now+1,items,averagePrice:items.reduce((s,i)=>s+i.price,0)/items.length,viewers,purchaseRate,marketing,foodCost,staffing,screenCount,gross};
    if(ticketReceipt.accountingYear!==undefined)receipt.accountingYear=ticketReceipt.accountingYear;
    return{version:1,lastSettledWeek:now,receipts:[...state.receipts,receipt]};
  }
  function totals(state,now,year=2022+Math.floor((now-1)/50)){return{weekly:(state?.receipts||[]).filter(r=>r.bookedAt===now&&(r.accountingYear??(2022+Math.floor((r.bookedAt-1)/50)))===year).reduce((s,r)=>s+r.gross,0),annual:(state?.receipts||[]).filter(r=>(r.accountingYear??(2022+Math.floor((r.bookedAt-1)/50)))===year).reduce((s,r)=>s+r.gross,0)};}
  const api={create,calculate,purchaseRange,resolve,advance,totals};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaConcessions=api;
})(globalThis);
