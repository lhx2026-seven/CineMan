const assert=require('node:assert/strict');globalThis.CinemaMovieRules=require('../movie-rules.js');require('../films.js');const F=globalThis.CinemaFilms;
for (let halls=1;halls<=25;halls++) {
 const capacity=F.screeningCapacity(halls);assert.equal(capacity,6*halls);
 assert.equal(F.sharePercentage(0,halls),0);assert.equal(F.sharePercentage(capacity,halls),100);
 assert.equal(F.sharePercentage(1,halls),100/(6*halls));
}
assert.throws(()=>F.sharePercentage(.5,3));assert.throws(()=>F.sharePercentage(19,3));assert.throws(()=>F.screeningCapacity(0));
console.log('PASS screening capacity and integer share bounds for 1–25 screens');

for(let n=1;n<=25;n++){assert.equal(F.screeningCapacity(n,"C02"),n*2);assert.equal(F.sharePercentage(1,n,"C02"),100/(n*2));assert.equal(F.sharePercentage(n*2-1,n,"C02"),100-100/(n*2));}
console.log("PASS second-run steps use 2 slots per hall; other cinemas keep 6");
