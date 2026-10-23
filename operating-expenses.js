'use strict';
(function(root){
  const KEYS=Object.freeze(['personnel','goods','maintenance','marketing','other']);
  const whole=value=>Math.round(value+Number.EPSILON*Math.max(1,Math.abs(value))*4);
  function number(value){const n=Number(value);if(!Number.isSafeInteger(n)||n<0)throw Error('營運支出參數錯誤');return n;}
  function eventTotal(events){
    if(!Array.isArray(events)||events.some(e=>!e||typeof e.id!=='string'||!e.id||!Number.isSafeInteger(e.amount)||e.amount<0)||new Set(events.map(e=>e.id)).size!==events.length)throw Error('事件支出紀錄錯誤');
    return events.reduce((sum,e)=>sum+e.amount,0);
  }
  function calculate(inputs){
    for(const key of['staffing','foodCost','maintenance','marketing','specialSessions','posterQuantity','posterPrice','figureQuantity','figurePrice'])number(inputs[key]);
    if(inputs.specialSessions>5)throw Error('特別場場數錯誤');
    const amounts={personnel:whole(inputs.staffing*1.2+inputs.specialSessions*500),goods:whole(inputs.foodCost+inputs.posterQuantity*inputs.posterPrice*.1+inputs.figureQuantity*inputs.figurePrice*.2),maintenance:inputs.maintenance,marketing:inputs.marketing,other:inputs.consumables===undefined?0:whole(number(inputs.consumables)+inputs.specialSessions*5000+eventTotal(inputs.eventExpenses??[]))};
    if(KEYS.some(key=>!Number.isSafeInteger(amounts[key])||amounts[key]<0))throw Error('營運支出超出範圍');
    return amounts;
  }
  function create(){return{version:2,lastSettledWeek:null,receipts:[]};}
  function resolve(saved,now){
    if(saved==null)return create();
    if(![1,2].includes(saved.version)||!Array.isArray(saved.receipts))throw Error('營運支出存檔錯誤');
    let previous=0;const eventIDs=new Set();
    for(const r of saved.receipts){
      if(!Number.isInteger(r.earnedAt)||r.earnedAt<=previous||r.bookedAt!==r.earnedAt+1||r.bookedAt>now||!r.inputs||!r.amounts)throw Error('營運支出週次錯誤');
      if(r.accountingYear!==undefined&&(r.earnedAt%50!==0||r.accountingYear!==2022+Math.floor((r.earnedAt-1)/50)))throw Error('營運支出年度錯誤');
      const expected=calculate(r.inputs);if(KEYS.some(k=>(r.amounts[k]??0)!==expected[k])||r.total!==KEYS.reduce((sum,k)=>sum+expected[k],0))throw Error('營運支出金額錯誤');for(const e of r.inputs.eventExpenses??[]){if(eventIDs.has(e.id))throw Error('事件重複扣款');eventIDs.add(e.id);}previous=r.earnedAt;
    }
    if(saved.lastSettledWeek!==(previous||null))throw Error('營運支出結算紀錄錯誤');
    return saved;
  }
  function advance(state,ticketReceipt,values,merchandiseReceipt,eventExpenses=[]){
    const {earnedAt,bookedAt}=ticketReceipt;
    if(!Number.isInteger(earnedAt)||earnedAt<1||bookedAt!==earnedAt+1||earnedAt<=(state.lastSettledWeek||0)||merchandiseReceipt?.earnedAt!==earnedAt||merchandiseReceipt.bookedAt!==bookedAt)throw Error('營運支出重複或錯週結算');
    eventTotal(eventExpenses);
    const pastIDs=new Set(eventExpenses.length?state.receipts.flatMap(r=>(r.inputs.eventExpenses??[]).map(e=>e.id)):[]);
    if(eventExpenses.some(e=>pastIDs.has(e.id)))throw Error('事件重複扣款');
    const inputs={consumables:number(values.consumables??0),eventExpenses:eventExpenses.map(e=>({...e})),staffing:number(values.staffing),foodCost:number(values.foodCost),maintenance:number(values.maintenance),marketing:number(values.marketing),specialSessions:number(ticketReceipt.specialSessionCount??0)};
    for(const kind of['poster','figure']){const item=merchandiseReceipt.items[kind];inputs[kind+'Quantity']=number(item.produced);inputs[kind+'Price']=number(item.price);}
    const amounts=calculate(inputs),receipt={earnedAt,bookedAt,inputs,amounts,total:KEYS.reduce((sum,k)=>sum+amounts[k],0),...(ticketReceipt.accountingYear!==undefined?{accountingYear:ticketReceipt.accountingYear}:{})};
    return{version:2,lastSettledWeek:earnedAt,receipts:[...state.receipts,receipt]};
  }
  function totals(state,now,year=2022+Math.floor((now-1)/50)){
    const weekly=Object.fromEntries(KEYS.map(k=>[k,0])),annual={...weekly};
    for(const r of state?.receipts||[])if((r.accountingYear??(2022+Math.floor((r.bookedAt-1)/50)))===year)for(const key of KEYS){annual[key]+=(r.amounts[key]??0);if(r.bookedAt===now)weekly[key]+=(r.amounts[key]??0);}
    return{weekly,annual};
  }
  const api={KEYS,calculate,create,resolve,advance,totals};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaOperatingExpenses=api;
})(globalThis);
