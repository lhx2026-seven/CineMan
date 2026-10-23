'use strict';
(function(root) {
  const ACTIVITIES=Object.freeze({
    mall:{name:'商場櫃位租金',unit:'單位/月',min:20000,max:100000,step:5000},
    claw:{name:'娃娃機台租金',unit:'單位/月',min:10000,max:100000,step:2000},
    parking:{name:'停車場收費',unit:'單位/小時',min:10,max:100,step:5},
    billboard:{name:'電子看板廣告費',unit:'單位/秒',min:0.5,max:3,step:0.5},
    hotel:{name:'電影院主題旅社收費',unit:'單位/夜',min:500,max:10000,step:500}
  });
  const COMMON=['mall','claw','parking','billboard'];
  const hotelEligible=id=>['C01','C02'].includes(id);
  const commonFor=id=>['C01','C02','C05'].includes(id)?COMMON.filter(type=>type!=='billboard'):COMMON;
  function locations(database,cinemaID){return database.locations.filter(location=>location[`cinemaID_${cinemaID}_applicable`]===true);}
  function draw(database,cinemaID,runId) {
    const eligible=locations(database,cinemaID);if(!eligible.length)throw Error('沒有適用地點');
    const random=key=>root.CinemaRules.seededRandom(`property/v1/${cinemaID}/${runId}/${key}`);
    const location=eligible[Math.floor(random('location')()*eligible.length)];
    const owned=random('tenure')()<({C03:0.03,C04:0.01}[cinemaID]??0.05),hasSpace=random('space')()<0.33;
    let activationType=null;
    if(hasSpace){const type=random('activity'),pool=commonFor(cinemaID);activationType=hotelEligible(cinemaID)&&type()<0.01?'hotel':pool[Math.floor(type()*pool.length)];}
    return {version:1,cinemaID,runId,locationID:location.locationID,tenure:owned?'owned':'rented',hasSpace,activationType,rentalActive:!owned,realEstateTaxActive:owned};
  }
  function validate(record,database,cinemaID,runId){
    if(!record||record.version!==1||record.cinemaID!==cinemaID||record.runId!==runId||!locations(database,cinemaID).some(location=>location.locationID===record.locationID))throw Error('場地首抽存檔不相容');
    if(!['owned','rented'].includes(record.tenure)||typeof record.hasSpace!=='boolean'||record.rentalActive!==(record.tenure==='rented')||record.realEstateTaxActive!==(record.tenure==='owned'))throw Error('土地權屬存檔不相容');
    if(record.hasSpace?(!Object.hasOwn(ACTIVITIES,record.activationType)||(record.activationType==='hotel'&&!hotelEligible(cinemaID))):record.activationType!==null)throw Error('空間活化存檔不相容');
    return record;
  }
  function resolve(database,cinemaID,runId,saved){return saved===undefined?draw(database,cinemaID,runId):validate(saved,database,cinemaID,runId);}
  const api={ACTIVITIES,COMMON,commonFor,hotelEligible,locations,draw,validate,resolve};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaProperty=api;
})(globalThis);
