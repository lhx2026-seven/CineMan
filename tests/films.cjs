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
