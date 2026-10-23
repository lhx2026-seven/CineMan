'use strict';
(function(root){
  const COEFFICIENTS=Object.freeze({LOC01:1,LOC02:1.1,LOC03:.9,LOC04:.8,LOC05:.7,LOC06:.7,LOC07:.8,LOC08:.6});
  // Integer tenths avoid floating-point errors when rounding half dollars.
  const calculate=(seats,coefficient)=>Math.round(seats*seats*Math.round(coefficient*10)/10);
  const yearOf=week=>2022+Math.floor((week-1)/50);
  const taxable=property=>property.realEstateTaxActive&&property.cinemaID!=='C05';
  function create(property,totalSeats){
    const coefficient=COEFFICIENTS[property.locationID];
    if(coefficient===undefined||!Number.isSafeInteger(totalSeats)||totalSeats<=0)throw Error('不動產稅場地資料錯誤');
    const amount=taxable(property)?calculate(totalSeats,coefficient):0;
    if(!Number.isSafeInteger(amount))throw Error('不動產稅金額超出範圍');
    return{version:1,cinemaID:property.cinemaID,runId:property.runId,tenure:property.tenure,locationID:property.locationID,totalSeats,coefficient,amount,throughWeek:0,receipts:[]};
  }
  function resolve(saved,property,week){
    if(saved==null)return null;
    const legacyPublic=property.cinemaID==='C05'&&property.realEstateTaxActive&&saved.amount===calculate(saved.totalSeats,saved.coefficient);
    if(saved.version!==1||saved.cinemaID!==property.cinemaID||saved.runId!==property.runId||saved.tenure!==property.tenure||saved.locationID!==property.locationID||saved.coefficient!==COEFFICIENTS[property.locationID]||!Number.isSafeInteger(saved.totalSeats)||saved.totalSeats<=0||!Number.isSafeInteger(saved.amount)||(!legacyPublic&&saved.amount!==(taxable(property)?calculate(saved.totalSeats,saved.coefficient):0))||!Number.isInteger(saved.throughWeek)||saved.throughWeek<0||saved.throughWeek>week||!Array.isArray(saved.receipts))throw Error('不動產稅存檔錯誤');
    const count=(taxable(property)||legacyPublic)&&saved.throughWeek>=46?Math.floor((saved.throughWeek-46)/50)+1:0;
    if(saved.receipts.length!==count||saved.receipts.some((r,i)=>r.week!==46+i*50||r.year!==yearOf(r.week)||r.amount!==saved.amount))throw Error('不動產稅出帳紀錄錯誤');
    return property.cinemaID==='C05'&&property.realEstateTaxActive&&(saved.amount!==0||saved.receipts.length)?{...saved,amount:0,receipts:[]}:saved;
  }
  function sync(saved,property,totalSeats,week){
    const old=resolve(saved,property,week)||create(property,totalSeats);
    if(old.throughWeek===week)return old;
    const receipts=[...old.receipts];
    if(taxable(property))for(let due=46+receipts.length*50;due<=week;due+=50)receipts.push({week:due,year:yearOf(due),amount:old.amount});
    return{...old,throughWeek:week,receipts};
  }
  function totals(state,week,year=yearOf(week)){
    let weekly=0,annual=0;for(const r of state?.receipts||[])if(r.year===year){annual+=r.amount;if(r.week===week)weekly+=r.amount;}
    return{weekly,annual};
  }
  const api={COEFFICIENTS,calculate,create,resolve,sync,totals};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaPropertyTax=api;
})(globalThis);
