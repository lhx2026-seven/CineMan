'use strict';
(function(root){
  const COEFFICIENTS=Object.freeze([400,450,500,550,600]);
  const eligible=id=>['C03','C04'].includes(id);
  const yearOf=week=>2022+Math.floor((week-1)/50);
  function create(property,totalSeats){
    if(!Number.isSafeInteger(totalSeats)||totalSeats<=0)throw Error('管理費座位數錯誤');
    const coefficient=eligible(property.cinemaID)?COEFFICIENTS[Math.floor(root.CinemaRules.seededRandom(`management-fee/v1/${property.cinemaID}/${property.runId}`)()*COEFFICIENTS.length)]:0;
    const amount=totalSeats*coefficient;if(!Number.isSafeInteger(amount))throw Error('管理費金額超出範圍');
    return{version:1,cinemaID:property.cinemaID,runId:property.runId,totalSeats,coefficient,amount,throughWeek:0,receipts:[]};
  }
  function resolve(saved,property,week){
    if(saved==null)return null;
    if(saved.version!==1||saved.cinemaID!==property.cinemaID||saved.runId!==property.runId||!Number.isSafeInteger(saved.totalSeats)||saved.totalSeats<=0||!(eligible(property.cinemaID)?COEFFICIENTS.includes(saved.coefficient):saved.coefficient===0)||!Number.isSafeInteger(saved.amount)||saved.amount!==saved.totalSeats*saved.coefficient||!Number.isInteger(saved.throughWeek)||saved.throughWeek<0||saved.throughWeek>week||!Array.isArray(saved.receipts))throw Error('管理費存檔錯誤');
    const count=eligible(property.cinemaID)?Math.floor(saved.throughWeek/4):0;
    if(saved.receipts.length!==count||saved.receipts.some((r,i)=>r.week!==(i+1)*4||r.year!==yearOf(r.week)||r.amount!==saved.amount))throw Error('管理費出帳紀錄錯誤');
    return saved;
  }
  function sync(saved,property,totalSeats,week){
    const old=resolve(saved,property,week)||create(property,totalSeats);
    if(old.throughWeek===week)return old;
    const receipts=[...old.receipts];
    if(eligible(property.cinemaID))for(let due=(receipts.length+1)*4;due<=week;due+=4)receipts.push({week:due,year:yearOf(due),amount:old.amount});
    return{...old,throughWeek:week,receipts};
  }
  function totals(state,week,year=yearOf(week)){
    let weekly=0,annual=0;for(const r of state?.receipts||[])if(r.year===year){annual+=r.amount;if(r.week===week)weekly+=r.amount;}
    return{weekly,annual};
  }
  const api={COEFFICIENTS,eligible,create,resolve,sync,totals};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaManagementFee=api;
})(globalThis);
