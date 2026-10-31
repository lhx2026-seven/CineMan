const assert=require('node:assert/strict');
globalThis.CinemaRules=require('../assignment-rules.js');globalThis.CinemaRent=require('../rent-rules.js');
const E=require('../event-rules.js'),db=require('../data/events.json'),movies=require('../data/movies.json');
assert.equal(db.events.length,80);assert.equal(new Set(db.events.map(e=>e.id)).size,80);
function context(event){const c=event?.condition||{},year=c.calendar?.[0][0]??c.years?.[0]??2026,w=c.calendar?.[0][1]??c.weeks?.[0]??30,week=(year-2022)*50+w;
 const screens=[{type:'A',name:'A',size:300},{type:'B',name:'B',size:150},...['VIP','IMAX','4DX'].map(name=>({type:'EXTRA',name,size:100}))].map((s,i)=>({...s,eventScreenID:i}));
 const property={cinemaID:c.cinemas?.[0]||'C03',runId:'events-test',locationID:'LOC01',tenure:c.owned===true?'owned':'rented',rentalActive:c.owned!==true,realEstateTaxActive:c.owned===true,activationType:c.activity||'mall'};
 return{week,seed:'events-test',cinemaID:property.cinemaID,property,database:movies,allocation:{cinemaID:property.cinemaID,seed:'events-test',screens,screenCount:screens.length,totalSeats:750,counts:{A:1,B:1,C:0,EXTRA:3}},rent:{locationCoefficient:1,amount:100000},minimums:{staffing:2000,maintenance:0,foodCost:0,consumables:0},movies:{current:[],history:[]}};
}
function stateFor(event,ctx){const s=E.create(ctx.week),c=event.condition;s.facts={blockedExit:true,labor:true,extinguisher:true,recheck:true,shutdownOrder:true,foodDanger:true};
 for(let y=2022;y<2027;y++)s.annualProfits[y]=-1;
 for(let w=ctx.week-8;w<ctx.week;w++)s.frames.push({week:w,halls:ctx.allocation.screenCount,values:{staffing:'0',maintenance:'0',foodCost:String(c.foodRatioAbove?100000: c.foodAbove?10001:0),posterEnabled:true,posterQuantity:'1000',posterPrice:'100',figureQuantity:'1000',figurePrice:'100'},viewers:100,averagePrice:100,profit:-1,specialSessions:1,liveIDs:movies.movies.map(m=>m.id),shutdown:true});return s;
}
for(const entry of db.events){const event={...entry,enabled:true};const ctx=context(event),state=stateFor(event,ctx),before=JSON.stringify(state);assert(E.eligible(event,state,ctx),event.id+' eligibility');const selected=E.begin(state,ctx,{events:[event]});assert.equal(JSON.stringify(state),before);assert.equal(selected.draws.at(-1).id,event.id);assert.deepEqual(E.begin(selected,ctx,db),selected);
 for(const choice of event.choices||[{id:null}]){const applied=choice.id?E.decide(selected,ctx,selected.draws.at(-1).key,choice.id):selected;assert(applied.draws.at(-1).applied);const ack=E.acknowledge(applied,applied.draws.at(-1).key);assert(!E.pending(ack,ctx.week));assert.deepEqual(E.resolve(ack,ctx.week,db),ack);assert(!E.eligible(event,ack,ctx));if(choice.id)assert.deepEqual(E.decide(applied,ctx,applied.draws.at(-1).key,choice.id),applied);}
}
console.log('PASS all 80 conditions, automatic effects and every decision branch; immutable/idempotent weekly selection, acknowledgment and reload');
const a={...db.events[0],condition:{},weight:1},b={...db.events[1],condition:{},weight:1};let ctx=context(),counts={};for(let i=0;i<20000;i++){const r=E.begin(E.create(ctx.week),{...ctx,seed:'weights/'+i},{events:[a,b]}).draws[0];counts[r.id]=(counts[r.id]||0)+1;}assert(Math.abs(counts[a.id]/20000-.5)<.02);
console.log('PASS equally weighted 100% conditions share selection approximately 50/50 in 20,000 seeded runs');
const event=id=>db.events.find(e=>e.id===id);
let c=context(event('ea011')),s=E.begin(E.create(c.week),c,{events:[event('ea011')]});assert(!E.eligible(event('ea011'),s,{...c,week:c.week+3}));assert(E.eligible(event('ea011'),s,{...c,week:c.week+4}));
assert.equal(E.attendance(s,c.week,{id:'MV0057',title:'一生',tier:'hit'},true,.5).rate,.6);assert.equal(E.attendance(s,c.week,{id:'MV0504',title:'豪情四兄弟',tier:'special'},true,1).rate,1);
for(const id of['ec004','ec006']){const e=event(id),cc=context(e);let q=E.begin(E.create(cc.week),cc,{events:[e]});if(e.choices)q=E.decide(q,cc,q.draws[0].key,'1');assert(!E.eligible(e,q,{...cc,week:cc.week+99}));assert(E.eligible(e,q,{...cc,week:cc.week+100}));}
const budget=event('eb001'),bc=context(budget),bs=stateFor(budget,bc);assert(E.eligible(budget,bs,bc));bs.frames.at(-1).values.staffing=String((bc.allocation.screenCount+1)*8000);assert(!E.eligible(budget,bs,bc));
console.log('PASS inclusive four-week effects, special-film immunity, 100-week rolling cooldown and strict preceding-week thresholds');
// Chain state persists only while the underlying unresolved condition remains.
const chain=event('ec003');c=context(chain);s=E.begin(E.create(c.week),c,{events:[chain]});s=E.decide(s,c,s.draws[0].key,'2');assert(E.eligible(event('ea005'),s,{...c,week:c.week+1}));s.facts.blockedExit=false;assert(!E.eligible(event('ea005'),s,{...c,week:c.week+1}));
// Construction uses a stable original hall identity; closure never redraws other halls.
c=context(event('ec010'));s=E.begin(E.create(c.week),c,{events:[event('ec010')]});const upgrade=s.effects.find(e=>e.kind==='upgrade'),building=E.project(c.allocation,s,c.week),ready=E.project(c.allocation,s,c.week+12);assert.equal(building.totalSeats,c.allocation.totalSeats);assert(building.screens.find(h=>h.eventScreenID===upgrade.screenID).underConstructionUntil);assert.equal(ready.screens.find(h=>h.eventScreenID===upgrade.screenID).name,'IMAX');assert(!E.eligible(event('ec010'),E.create(c.week),{...c,property:{...c.property,locationID:'LOC08'}}));
c=context(event('ec013'));s=E.begin(stateFor(event('ec013'),c),c,{events:[event('ec013')]});const gone=E.project(c.allocation,s,c.week+1);assert.equal(gone.screenCount,c.allocation.screenCount-1);assert.equal(gone.totalSeats,c.allocation.totalSeats-100);
console.log('PASS dependency flag clearing, 12-week construction, other halls unchanged, LOC08 prohibition and one-hall/seat removal');
// Land sale revenue and future-only lease/tax changes are immutable separate ledger adjustments.
c=context(event('ef003'));s=E.begin(stateFor(event('ef003'),c),c,{events:[event('ef003')]});const sale=s.effects.find(e=>e.kind==='sellLand');assert.equal(sale.value,750000000);assert(!E.owner(s,c.property,c.week));const due=c.week+(4-c.week%4||4);s=E.billing(s,due,{receipts:[]},{receipts:[]});assert.equal(s.feeReceipts.at(-1).rentDelta,sale.rentAmount);assert.deepEqual(E.billing(s,due,{receipts:[]},{receipts:[]}),s);
const re=event('ec016');c=context(re);s=E.begin(E.create(c.week),c,{events:[re]});s=E.decide(s,c,s.draws[0].key,'1');const target=s.effects.find(e=>e.kind==='reissue').movieID;const current={current:['MV0057','MV0058'],history:[{id:target,releasedAt:1,initial:false,retiredAt:3},{id:'MV0057',releasedAt:c.week+1,initial:false},{id:'MV0058',releasedAt:c.week+1,initial:false}],lastWeek:c.week+1};const reopened=E.reissue(current,s,c.week+1);assert.equal(reopened.current.length,2);assert.equal(reopened.current[0],target);assert.equal(reopened.history.find(h=>h.id===target).releasedAt,c.week+1);assert.deepEqual(E.reissue(reopened,s,c.week+1),reopened);
console.log('PASS land-sale cash formula, no retroactive rent/tax changes, billing idempotence and fresh two-film reissue cycle');

for(const event of db.events.filter(e=>e.enabled===false))assert(!E.eligible(event,E.create(context(event).week),context(event)));

assert(db.events.every(e=>e.enabled));
{const event=db.events.find(e=>e.id==='ec002'),ctx=context(event),s=E.begin(stateFor(event,ctx),ctx,{events:[event]}),settings=E.settings(s,ctx.week);assert.deepEqual(settings.locks,{maintenance:100000,consumables:20000});assert.equal(settings.expenses.other,0);}
console.log('PASS all 80 enabled; ec002 locks maintenance 100000 and consumables 20000 without extra compensation');

{const ctx={...context(),week:1};const s=E.begin(E.create(1),ctx,db);assert.equal(s.draws.length,0);assert.equal(s.effects.length,0);assert(!E.pending(s,1));assert(db.events.every(e=>!E.eligible(e,s,ctx)));assert(E.begin(s,{...ctx,week:2},db).draws.length===1);assert(E.begin(E.create(51),{...ctx,week:51},db).draws.length===1);}
console.log('PASS 2022 W1 is event-free, W2 and later-year W1 still draw events');

{
 const staffing={...db.events.find(e=>e.id==='eb002'),condition:{}},normal={...db.events.find(e=>e.id==='eb004'),condition:{},weight:1},c={...context(staffing),week:2};
 let s=E.begin(E.create(2),c,{events:[staffing]});s=E.decide(s,c,s.draws[0].key,'2');assert(E.staffingFollowUp(s,3));
 const frame=week=>({week,halls:5,values:{staffing:'2000'},viewers:0,averagePrice:100,profit:-1,specialSessions:0,liveIDs:[],shutdown:true});s.frames=[frame(2)];
 const next=E.begin(s,{...c,week:3},{events:[normal,staffing]});assert.equal(next.draws.at(-1).id,'eb002');assert(E.pending(next,3));
 const resumed=E.decide(next,{...c,week:3},next.draws.at(-1).key,'1');assert(!E.staffingFollowUp(resumed,4));assert(!E.settings(resumed,3).shutdown);
 const again=E.decide(next,{...c,week:3},next.draws.at(-1).key,'2');assert(E.settings(again,3).shutdown);
 again.frames=[frame(2),frame(3)];const board=db.events.find(e=>e.id==='ef002');const ids=new Set();for(let i=0;i<100;i++)ids.add(E.begin(again,{...c,week:4,seed:'board-'+i},{events:[staffing,normal,board]}).draws.at(-1).id);assert.deepEqual([...ids].sort(),['eb002','ef002']);
 const stale=E.begin(s,{...c,week:3},{events:[normal]});assert.equal(stale.draws.at(-1).id,'eb004');const recovered=E.begin(stale,{...c,week:3},{events:[normal,staffing]});assert.equal(recovered.draws.at(-1).id,'eb002');assert(!recovered.effects.some(e=>e.source==='eb004/3'));
 console.log('PASS staffing closure requires a new decision, resume clears follow-up, board can still trigger and unread stale saves recover');
}
