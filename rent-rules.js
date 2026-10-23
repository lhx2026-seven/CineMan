'use strict';
(function(root){
  const RANGES=Object.freeze({LOC01:[300,400],LOC02:[350,500],LOC03:[250,400],LOC04:[200,350],LOC05:[200,300],LOC06:[200,350],LOC07:[150,250],LOC08:[100,150]});
  const yearOf=week=>2022+Math.floor((week-1)/50);
  const rounded=(seats,locationCoefficient,randomCoefficient)=>Math.round(seats*locationCoefficient*randomCoefficient/10000)*10000;
  function create(property,totalSeats){
    const firstDueWeek=4;
    const range=RANGES[property.locationID];
    if(!range||!Number.isSafeInteger(totalSeats)||totalSeats<=0)throw Error('租金首抽資料錯誤');
    const random=key=>root.CinemaRules.seededRandom(`rent/v1/${property.cinemaID}/${property.runId}/${key}`)();
    // Location ranges use integer coefficients; both draws happen only once.
    const locationCoefficient=range[0]+Math.floor(random('location')*(range[1]-range[0]+1));
    const randomCoefficient=5+Math.floor(random('multiplier')*6);
    const rentFactor=property.cinemaID==='C05'?0.5:1;
    return{version:1,rentFactor,cinemaID:property.cinemaID,runId:property.runId,tenure:property.tenure,locationID:property.locationID,totalSeats,locationCoefficient,randomCoefficient,amount:property.rentalActive?rounded(totalSeats,locationCoefficient,randomCoefficient)*rentFactor:0,firstDueWeek,throughWeek:0,receipts:[]};
  }
  function resolve(saved,property,week){
    if(saved==null)return null;
    // Existing leases drawn under the earlier 2–10 range remain fixed.
    const range=RANGES[saved.locationID],rentFactor=saved.rentFactor??1;
    if(saved.version!==1||(saved.rentFactor!==undefined&&rentFactor!==(property.cinemaID==='C05'?0.5:1))||saved.cinemaID!==property.cinemaID||saved.runId!==property.runId||saved.tenure!==property.tenure||saved.locationID!==property.locationID||!range||!Number.isSafeInteger(saved.totalSeats)||saved.totalSeats<=0||!Number.isInteger(saved.locationCoefficient)||saved.locationCoefficient<range[0]||saved.locationCoefficient>range[1]||!Number.isInteger(saved.randomCoefficient)||saved.randomCoefficient<2||saved.randomCoefficient>10||saved.amount!==(property.rentalActive?rounded(saved.totalSeats,saved.locationCoefficient,saved.randomCoefficient)*rentFactor:0)||saved.firstDueWeek!==4||!Number.isInteger(saved.throughWeek)||saved.throughWeek<0||saved.throughWeek>week||!Array.isArray(saved.receipts))throw Error('租金存檔錯誤');
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
  const api={RANGES,rounded,create,resolve,sync,totals};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaRent=api;
})(globalThis);
