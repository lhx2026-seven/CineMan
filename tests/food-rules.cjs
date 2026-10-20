const assert=require('node:assert/strict');globalThis.CinemaRules=require('../assignment-rules.js');require('../food-rules.js');
const {PRODUCTS,draw}=CinemaFood;
assert.equal(PRODUCTS.length,15);assert.equal(new Set(PRODUCTS).size,15);
for(const id of ['C01','C02','C03','C04','C05']){
 const counts=new Map(PRODUCTS.map(product=>[product,0]));let total=0;
 for(let n=0;n<20000;n++){const seed=`${id}/test-${n}`,product=draw(seed);assert.equal(draw(seed),product);if(product!==null){assert(counts.has(product));counts.set(product,counts.get(product)+1);total++;}}
 assert(Math.abs(total/20000-.5)<.02);for(const count of counts.values())assert(Math.abs(count/total-1/PRODUCTS.length)<.015);
 console.log('PASS',id,'50% presence, uniform product pool, deterministic results');
}
