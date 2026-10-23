'use strict';
(function(root){
  const RANGES=Object.freeze({LOC01:[300,400],LOC02:[350,500],LOC03:[250,400],LOC04:[200,350],LOC05:[200,300],LOC06:[200,350],LOC07:[150,250],LOC08:[100,150]});
  const CINEMA_COEFFICIENTS=Object.freeze({C01:4,C02:3,C03:4,C04:5,C05:3});
  const yearOf=week=>2022+Math.floor((week-1)/50);
  const rounded=(seats,locationCoefficient,cinemaCoefficient)=>Math.round(seats*locationCoefficient*cinemaCoefficient/10000)*10000;
  function create(property,totalSeats){
    const firstDueWeek=4;
    const range=RANGES[property.locationID],cinemaCoefficient=CINEMA_COEFFICIENTS[property.cinemaID];
    if(!range||!cinemaCoefficient||!Number.isSafeInteger(totalSeats)||totalSeats<=0)throw Error('租金首抽資料錯誤');
    const random=key=>root.CinemaRules.seededRandom(`rent/v1/${property.cinemaID}/${property.runId}/${key}`)();
    // The location coefficient is drawn once; the cinema coefficient is fixed.
    const locationCoefficient=range[0]+Math.floor(random('location')*(range[1]-range[0]+1));
    const rentFactor=property.cinemaID==='C05'?0.5:1;
    return{version:2,rentFactor,cinemaID:property.cinemaID,runId:property.runId,tenure:property.tenure,locationID:property.locationID,totalSeats,locationCoefficient,cinemaCoefficient,amount:property.rentalActive?rounded(totalSeats,locationCoefficient,cinemaCoefficient)*rentFactor:0,firstDueWeek,throughWeek:0,receipts:[]};
  }
  function resolve(saved,property,week){
    if(saved==null)return null;
    // Version 1 leases keep their original random multiplier and fixed invoices.
    const range=RANGES[saved.locationID],rentFactor=saved.rentFactor??1;
    const coefficient=saved.version===1?saved.randomCoefficient:saved.cinemaCoefficient;
    const validCoefficient=saved.version===1?Number.isInteger(coefficient)&&coefficient>=2&&coefficient<=10:coefficient===CINEMA_COEFFICIENTS[property.cinemaID];
    if(![1,2].includes(saved.version)||!validCoefficient||(saved.version===2&&saved.rentFactor===undefined)||(saved.rentFactor!==undefined&&rentFactor!==(property.cinemaID==='C05'?0.5:1))||saved.cinemaID!==property.cinemaID||saved.runId!==property.runId||saved.tenure!==property.tenure||saved.locationID!==property.locationID||!range||!Number.isSafeInteger(saved.totalSeats)||saved.totalSeats<=0||!Number.isInteger(saved.locationCoefficient)||saved.locationCoefficient<range[0]||saved.locationCoefficient>range[1]||saved.amount!==(property.rentalActive?rounded(saved.totalSeats,saved.locationCoefficient,coefficient)*rentFactor:0)||saved.firstDueWeek!==4||!Number.isInteger(saved.throughWeek)||saved.throughWeek<0||saved.throughWeek>week||!Array.isArray(saved.receipts))throw Error('租金存檔錯誤');
    const expected=property.rentalActive&&saved.throughWeek>=saved.firstDueWeek?Math.floor((saved.throughWeek-saved.firstDueWeek)/4)+1:0;
    if(saved.receipts.length!==expected||saved.receipts.some((r,i)=>r.week!==saved.firstDueWeek+i*4||r.year!==yearOf(r.week)||r.amount!==saved.amount))throw Error('租金出帳紀錄錯誤');
    return saved;
  }
  function sync(saved,property,totalSeats,week){
    const old=resolve(saved,property,week)||create(property,totalSeats);
    if(old.throughWeek===week)return old;
    const receipts=[...old.receipts];
    if(property.rentalActive)for(let due=old.firstDueWeek+receipts.length*4;due<=week;due+=4)receipts.push({week:due,year:yearOf(due),amount:old.amount});
    return{...old,throughWeek:week,receipts};
  }
  function totals(state,week,year=yearOf(week)){
    let weekly=0,annual=0;for(const r of state?.receipts||[])if(r.year===year){annual+=r.amount;if(r.week===week)weekly+=r.amount;}
    return{weekly,annual};
  }
  const api={RANGES,CINEMA_COEFFICIENTS,rounded,create,resolve,sync,totals};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaRent=api;
})(globalThis);
