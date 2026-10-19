const assert=require('node:assert/strict');
globalThis.CinemaRules=require('../assignment-rules.js');require('../films.js');
const F=globalThis.CinemaFilms;
const pool=[...F.OLD_FILMS,...Array.from({length:5},(_,i)=>({id:`MV${1000+i}`,title:`新片 ${i}`}))];
const source=JSON.stringify(pool);
assert.deepEqual(F.pickNewMovies(pool,'test'),F.pickNewMovies(pool,'test'));
assert.throws(()=>F.pickNewMovies(F.OLD_FILMS,'seed'),/At least two/);
assert.throws(()=>F.pickNewMovies([...pool,pool[0]],'seed'),/duplicate/);
const frequencies={};const n=10000;
for(let i=0;i<n;i++){
 const pair=F.pickNewMovies(pool,`week/1/${i}`);
 assert.equal(pair.length,2);assert.notEqual(pair[0].id,pair[1].id);
 for(const movie of pair){assert(!F.OLD_FILMS.some(old=>old.id===movie.id));frequencies[movie.id]=(frequencies[movie.id]||0)+1;}
}
for(const count of Object.values(frequencies))assert(Math.abs(count-n*.4)<6*Math.sqrt(n*.4*.6)+3);
assert.equal(JSON.stringify(pool),source);
console.log('PASS 10,000 new-release draws: deterministic seeds, two distinct IDs, fixed old films excluded, uniform marginal frequency, source unchanged');
for (let halls=1;halls<=25;halls++) {
 const capacity=F.screeningCapacity(halls);assert.equal(capacity,6*halls);
 assert.equal(F.sharePercentage(0,halls),0);assert.equal(F.sharePercentage(capacity,halls),100);
 assert.equal(F.sharePercentage(1,halls),100/(6*halls));
}
assert.throws(()=>F.sharePercentage(.5,3));assert.throws(()=>F.sharePercentage(19,3));assert.throws(()=>F.screeningCapacity(0));
const showing=[...F.OLD_FILMS,{id:'MV0004',title:'新片四'},{id:'MV0005',title:'新片五'}];
assert.deepEqual(F.retirementPool(showing,1),{forced:[],randomPool:[]});
assert.deepEqual(F.retirementPool(showing,2).forced.map(m=>m.id),['MV0003']);assert.equal(F.retirementPool(showing,2).randomPool.length,0);
assert.deepEqual(F.retirementPool(showing,3).randomPool.map(m=>m.id),['MV0001','MV0002','MV0004','MV0005']);
assert.deepEqual(F.drawRetirements(showing,2,0,'week2').forced.map(m=>m.id),['MV0003']);
assert.throws(()=>F.drawRetirements(showing,3,undefined,'seed'),/count/);
assert.deepEqual(F.drawRetirements(showing,3,2,'week3'),F.drawRetirements(showing,3,2,'week3'));
const appearances={};for(let i=0;i<10000;i++){const result=F.drawRetirements(showing,3,1,`retire/${i}`);assert.equal(result.random.length,1);const id=result.random[0].id;assert.notEqual(id,'MV0003');appearances[id]=(appearances[id]||0)+1;}
for(const id of['MV0001','MV0002','MV0004','MV0005'])assert(Math.abs(appearances[id]-2500)<6*Math.sqrt(10000*.25*.75)+3);
assert.equal(F.retirementPool([{id:'MV003',title:'酆都'}],2).forced.length,1);
console.log('PASS integer screening units for 1–25 halls, W2 forced retirement, W3 shared pool and explicit random quantity');
