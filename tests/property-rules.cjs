const assert=require('node:assert/strict');globalThis.CinemaRules=require('../assignment-rules.js');const P=require('../property-rules.js'),db=require('../data/cinemas.json');
function close(actual,n,p){assert(Math.abs(actual-n*p)<=6*Math.sqrt(n*p*(1-p))+3,`${actual}/${n} != ${p}`);}
for(const id of ['C01','C02','C03','C04','C05']){
 const expected={C01:['LOC01','LOC03','LOC07'],C02:['LOC01','LOC03','LOC04','LOC07'],C03:['LOC01','LOC02','LOC03','LOC04','LOC05','LOC07','LOC08'],C04:['LOC01','LOC02','LOC05','LOC06'],C05:['LOC01','LOC02','LOC03','LOC05','LOC07']};assert.deepEqual(P.locations(db,id).map(l=>l.locationID),expected[id]);
 const n=50000,stats={owned:0,space:0,types:{},locations:{}};const allowed=P.locations(db,id);
 for(let k=0;k<n;k++){const record=P.draw(db,id,'property-test/'+k);assert.equal(P.validate(record,db,id,record.runId),record);assert(allowed.some(location=>location.locationID===record.locationID));stats.owned+=record.tenure==='owned';stats.space+=record.hasSpace;stats.locations[record.locationID]=(stats.locations[record.locationID]||0)+1;if(record.hasSpace)stats.types[record.activationType]=(stats.types[record.activationType]||0)+1;}
 close(stats.owned,n,({C03:.03,C04:.01}[id]??.05));close(stats.space,n,.33);Object.values(stats.locations).forEach(count=>close(count,n,1/allowed.length));
 const pool=P.commonFor(id);if(['C01','C02','C05'].includes(id))assert(!stats.types.billboard);
 if(P.hotelEligible(id)){close(stats.types.hotel||0,stats.space,.01);pool.forEach(type=>close(stats.types[type],stats.space,.99/pool.length));}else{assert(!stats.types.hotel);pool.forEach(type=>close(stats.types[type],stats.space,1/pool.length));}
 assert.deepEqual(P.draw(db,id,'fixed'),P.draw(db,id,'fixed'));const saved=P.draw(db,id,'saved');assert.equal(P.resolve(db,id,'saved',saved),saved);assert.deepEqual(P.resolve(db,id,'legacy',undefined),P.draw(db,id,'legacy'));assert.throws(()=>P.validate({...saved,locationID:'bad'},db,id,'saved'));
 console.log('PASS',id,JSON.stringify(stats));
}
const invalid=P.draw(db,'C03','invalid');assert.throws(()=>P.validate({...invalid,hasSpace:true,activationType:'hotel'},db,'C03','invalid'));assert.throws(()=>P.validate({...invalid,hasSpace:true,activationType:'toString'},db,'C03','invalid'));assert.throws(()=>P.validate({...invalid,rentalActive:!invalid.rentalActive},db,'C03','invalid'));
console.log('PASS conditional hotel probability, eligible locations, deterministic draws, corruption checks');

// Existing records retain their original draw even after the new pool excludes billboards.
for(const id of ['C01','C02','C05']){const old={...P.draw(db,id,'old-board'),hasSpace:true,activationType:'billboard'};assert.equal(P.resolve(db,id,'old-board',old),old);}
console.log('PASS historical billboard saves retained without reroll');
