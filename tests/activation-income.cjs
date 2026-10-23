const assert=require('node:assert/strict');globalThis.CinemaRules=require('../assignment-rules.js');globalThis.CinemaProperty=require('../property-rules.js');const A=require('../activation-rules.js'),P=CinemaProperty;
for(const kind of Object.keys(P.ACTIVITIES)){
 const rate=P.ACTIVITIES[kind].min;let s=A.create(kind,rate,1);assert(A.editable(s,1));for(let now=2;now<=4;now++)assert(!A.editable(s,now));assert(A.editable(s,5));assert.throws(()=>A.change(s,rate+P.ACTIVITIES[kind].step,3));
 for(let w=1;w<=8;w++){const before=JSON.stringify(s);const n=A.advance(s,w,101,'income');assert.equal(JSON.stringify(s),before);s=n;A.resolve(s,kind,rate,w+1);}
 if(A.MONTHLY.includes(kind)){assert.deepEqual(s.receipts.map(r=>r.bookedAt),[5,9]);assert.equal(s.receipts[0].gross,kind==='billboard'?rate*1296000:rate);}else{assert.equal(s.receipts.length,8);assert.equal(s.receipts[0].gross,kind==='parking'?rate*2*101*3*.5:rate*4*2);}
 const changed=A.change(s,rate+P.ACTIVITIES[kind].step,9);assert(!A.editable(changed,12));assert(A.editable(changed,13));assert.equal(changed.nextMonthlyAt,13);
 assert.throws(()=>A.advance(s,8,101,'income'));assert.deepEqual(A.resolve(JSON.parse(JSON.stringify(s)),kind,rate,9),s);
 let penalty=0;for(let i=0;i<4000;i++){let high=A.create(kind,P.ACTIVITIES[kind].max,1);for(let w=1;w<=4;w++)high=A.advance(high,w,100,'penalty/'+i);const record=high.receipts.at(-1);if(record.zeroDemand){penalty++;assert.equal(record.gross,0);}}
 assert(Math.abs(penalty/4000-.5)<.04,kind+' '+penalty);
 const mid=P.ACTIVITIES[kind].min+Math.floor((P.ACTIVITIES[kind].max-P.ACTIVITIES[kind].min)/P.ACTIVITIES[kind].step/2)*P.ACTIVITIES[kind].step;let low=A.create(kind,mid,1);for(let w=1;w<=4;w++)low=A.advance(low,w,100,'low');assert(low.receipts.every(r=>!r.zeroDemand));
}
let crossing=A.create('hotel',500,50);crossing=A.advance(crossing,50,0,'year');assert.equal(A.totals(crossing,51).annual,4000);assert.equal(A.totals(crossing,50).annual,0);
let month=A.create('mall',20000,1);for(let w=1;w<=4;w++)month=A.advance(month,w,0,'month');const original=month.receipts[0].gross;month=A.change(month,25000,5);for(let w=5;w<=8;w++)month=A.advance(month,w,0,'month');assert.equal(month.receipts[0].gross,original);assert.equal(month.receipts[1].gross,25000);
console.log('PASS all five income formulas, W1→W5 delay, recurring four-week receipts, four-week price lock, threshold exclusions and 50% high-price zero demand, immutable settlement/reload, new quotes and W50 rollover');

assert.equal(P.ACTIVITIES.largeMall.max,1000000);assert.equal(P.ACTIVITIES.mall.max,100000);
assert.equal(P.ACTIVITIES.largeMall.name,P.ACTIVITIES.mall.name);
assert.throws(()=>A.create('mall',1000000,1));assert.throws(()=>A.create('largeMall',1005000,1));
let large=A.create('largeMall',510000,1);for(let w=1;w<=4;w++)large=A.advance(large,w,0,'large-midpoint');assert.equal(large.receipts[0].gross,510000);assert.equal(large.receipts[0].zeroDemand,false);
assert.deepEqual(A.resolve(JSON.parse(JSON.stringify(large)),'largeMall',510000,5),large);
console.log('PASS large mall monthly quote, million cap, own midpoint penalty and saved settlement');
