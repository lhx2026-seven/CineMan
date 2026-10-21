const assert=require('node:assert/strict');require('../films.js');const F=globalThis.CinemaFilms;
for (let halls=1;halls<=25;halls++) {
 const capacity=F.screeningCapacity(halls);assert.equal(capacity,6*halls);
 assert.equal(F.sharePercentage(0,halls),0);assert.equal(F.sharePercentage(capacity,halls),100);
 assert.equal(F.sharePercentage(1,halls),100/(6*halls));
}
assert.throws(()=>F.sharePercentage(.5,3));assert.throws(()=>F.sharePercentage(19,3));assert.throws(()=>F.screeningCapacity(0));
console.log('PASS screening capacity and integer share bounds for 1–25 screens');
