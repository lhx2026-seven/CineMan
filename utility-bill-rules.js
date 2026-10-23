'use strict';
(function(root){
  const RANGES=Object.freeze({C01:[350,450],C02:[250,350],C03:[450,600],C04:[450,600],C05:[350,450]});
  const BILLING_WEEKS=Object.freeze([8,16,24,32,40,48]);
  function billingWeeks(throughWeek){const result=[];for(let base=0;base<throughWeek;base+=50)for(const week of BILLING_WEEKS)if(base+week<=throughWeek)result.push(base+week);return result;}
  const yearOf=week=>2022+Math.floor((week-1)/50);
  const seasonFactor=week=>{const w=(week-1)%50+1;return [24,32,40].includes(w)?1.5:1;};
  const amount=(seats,coefficient,factor)=>Math.round(seats*coefficient*factor);
  function create(property,totalSeats){
    if(!RANGES[property.cinemaID]||!Number.isSafeInteger(totalSeats)||totalSeats<=0)throw Error('公共事業帳單場地資料錯誤');
    return{version:1,cinemaID:property.cinemaID,runId:property.runId,totalSeats,throughWeek:0,receipts:[]};
  }
  function resolve(saved,property,week){
    if(saved==null)return null;
    const range=RANGES[property.cinemaID];
    if(saved.version!==1||saved.cinemaID!==property.cinemaID||saved.runId!==property.runId||!range||!Number.isSafeInteger(saved.totalSeats)||saved.totalSeats<=0||!Number.isInteger(saved.throughWeek)||saved.throughWeek<0||saved.throughWeek>week||!Array.isArray(saved.receipts)||saved.receipts.length!==billingWeeks(saved.throughWeek).length)throw Error('公共事業帳單存檔錯誤');
    const expected=billingWeeks(saved.throughWeek);
    for(let i=0;i<saved.receipts.length;i++){
      const r=saved.receipts[i];if(r.week!==expected[i]||r.year!==yearOf(r.week)||!Number.isInteger(r.coefficient)||r.coefficient<range[0]||r.coefficient>range[1]||r.seasonFactor!==seasonFactor(r.week)||!Number.isSafeInteger(r.amount)||r.amount!==amount(saved.totalSeats,r.coefficient,r.seasonFactor))throw Error('公共事業帳單金額錯誤');
    }
    return saved;
  }
  function sync(saved,property,totalSeats,week){
    const old=resolve(saved,property,week)||create(property,totalSeats);
    if(old.throughWeek===week)return old;
    const receipts=[...old.receipts],range=RANGES[property.cinemaID];
    for(const due of billingWeeks(week).slice(receipts.length)){
      const coefficient=range[0]+Math.floor(root.CinemaRules.seededRandom(`utilities/v1/${property.cinemaID}/${property.runId}/${due}`)()*(range[1]-range[0]+1));
      const factor=seasonFactor(due),cost=amount(old.totalSeats,coefficient,factor);if(!Number.isSafeInteger(cost))throw Error('公共事業帳單金額超出範圍');
      receipts.push({week:due,year:yearOf(due),coefficient,seasonFactor:factor,amount:cost});
    }
    return{...old,throughWeek:week,receipts};
  }
  function totals(state,week,year=yearOf(week)){
    let weekly=0,annual=0;for(const r of state?.receipts||[])if(r.year===year){annual+=r.amount;if(r.week===week)weekly+=r.amount;}
    return{weekly,annual};
  }
  const api={RANGES,BILLING_WEEKS,seasonFactor,create,resolve,sync,totals};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaUtilityBills=api;
})(globalThis);
