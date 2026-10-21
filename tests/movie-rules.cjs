const assert=require('node:assert/strict');globalThis.CinemaRules=require('../assignment-rules.js');const R=require('../movie-rules.js'),db=require('../data/movies.json');
const by=new Map(db.movies.map(m=>[m.id,m]));
assert.equal(db.movies.length,505);assert.equal(db.movies.filter(m=>!m.initial).length,502);assert.equal(by.size,505);
assert.equal(by.get('MV0031').releaseYear,2022);assert.equal(by.get('MV0032').gapMax,200);
assert(db.movies.filter(m=>['SR018','SR019'].includes(m.seriesID)).every(m=>m.seriesGap===8));
for(let run=0;run<20;run++){
 let state=R.create('simulation/'+run,3);const before=JSON.stringify(state);
 const first=R.releaseWeek(db,state,2022,1);assert.equal(JSON.stringify(state),before);assert.deepEqual(first,R.releaseWeek(db,state,2022,1));assert(first.current.every(id=>!by.get(id).initial));assert.equal(first.current.length,2);assert(R.POOLS[0].includes(by.get(first.current[0]).tier));assert(R.POOLS[1].includes(by.get(first.current[1]).tier));
 let shortages=0;
 for(let n=1;n<=250;n++){
  const year=2022+Math.floor((n-1)/50),week=(n-1)%50+1,next=R.releaseWeek(db,state,year,week);
  for(const id of next.current){assert(R.eligible(by.get(id),state,year,week,db));const prev=state.history.find(h=>h.id===by.get(id).previousID);if(prev){const gap=n-prev.releasedAt;assert(gap>=by.get(id).gapMin&&gap<=10000);}}
  assert.equal(new Set(next.history.map(m=>m.id)).size,next.history.length);if(next.current.length<2)shortages++;
  state=next;
 }
 for(const m of db.movies.filter(m=>!m.initial&&m.releaseYear)){const record=state.history.find(h=>h.id===m.id);assert(record,`${m.id} not guaranteed`);assert.equal(2022+Math.floor((record.releasedAt-1)/50),m.releaseYear);}
 console.log('PASS 5-year schedule',run,'unique films, series/year constraints, every guaranteed title released; short weeks',shortages);
}
for(const id of ['MV0001','MV0002']){const m=by.get(id),h={id,releasedAt:1,initial:true};assert.equal(R.attendance(m,h,15,'x'),.5);assert.equal(R.retirement(m,h,2,'x'),false);}
assert(R.retirement(by.get('MV0003'),{releasedAt:1,initial:true},2,'x'));
for(const [id,profile]of [['MV0503',[.5,.7,.9,.99,.5]],['MV0504',[1,1,1,1,.9,.9,.9,.9,.5,.5,.5,.5,.01]],['MV0505',[1,1,1,1,.8,.8,.8,.8,.6,.6,.6,.6,.01]]]){for(let i=0;i<profile.length;i++)assert.equal(R.attendance(by.get(id),{releasedAt:5},5+i,'x'),profile[i]);}
for(const tier of ['hit','bomb','average']){const m=db.movies.find(m=>m.tier===tier),h={releasedAt:1};const limits={hit:[.5,1],bomb:[.01,.1],average:[.01,.5]}[tier];for(let i=0;i<1000;i++){const base=R.attendance(m,h,1,'attendance/'+i);assert(base>=limits[0]&&base<=limits[1]);for(const [w,min,max]of [[2,.5,1],[3,.25,.5],[4,.01,.5]]){const value=R.attendance(m,h,w,'attendance/'+i);assert(value>=base*min-1e-10&&value<=base*max+1e-10);}assert.equal(R.attendance(m,h,5,'attendance/'+i),.01);}}
for(const id of ['MV0503','MV0504','MV0505','MV0001']){const m=by.get(id),h={releasedAt:1,initial:m.initial};let count=0;const n=10000,week=id==='MV0503'?5:id==='MV0001'?3:13;for(let i=0;i<n;i++)count+=R.retirement(m,h,week,'retirement/'+i);assert(Math.abs(count/n-(id==='MV0503'?.5:.9))<.02);}
assert.equal(R.eventsFor({history:[{id:'MV0503',releasedAt:10}]},13).length,1);assert.equal(R.eventsFor({history:[{id:'MV0503',releasedAt:10}]},14).length,0);
const s=R.resolve(db,'restore',1,2022,1);assert(!s.history.some(h=>h.initial));assert.equal(R.resolve(db,'restore',1,2022,1,s),s);assert.throws(()=>R.resolve(db,'restore',1,2022,1,{...s,current:[s.current[0],s.current[0]]}));assert.throws(()=>R.resolve(db,'other',1,2022,1,s));
console.log('PASS tier ranges/1% steps, first-week-based declines, all six special profiles, retirement probabilities, one-time event, save identity');
const fixture={movies:['average','average','hit','hit'].map((tier,i)=>({id:'F'+i,title:'Film'+i,tier,seriesID:null,previousID:null,gapMin:null,gapMax:null,releaseYear:null,initial:false,seriesGap:0}))};const freq={F0:0,F1:0,F2:0,F3:0};for(let i=0;i<10000;i++){const pair=R.releaseWeek(fixture,R.create('uniform/'+i,1),2022,1).current;for(const id of pair)freq[id]++;}for(const count of Object.values(freq))assert(Math.abs(count-5000)<300);console.log('PASS each eligible movie has equal probability within its assigned pool',freq);
const at=n=>[2022+Math.floor((n-1)/50),(n-1)%50+1];
let predecessor={...R.create('boundary',1),history:[{id:'MV0031',releasedAt:1,initial:false}]};assert(!R.eligible(by.get('MV0032'),predecessor,...at(200),db));assert(R.eligible(by.get('MV0032'),predecessor,...at(201),db));assert(!R.eligible(by.get('MV0032'),R.create('boundary',1),2026,50,db));
const unordered={...R.create('unordered',1),history:[{id:'MV0044',releasedAt:1,initial:false}]};assert(!R.eligible(by.get('MV0045'),unordered,...at(8),db));assert(R.eligible(by.get('MV0045'),unordered,...at(9),db));
assert(R.eligible(by.get('MV0017'),R.create('episode-number',1),2022,1,db));
console.log('PASS fixed-200 and eight-week cooldown boundaries, absent predecessors stay locked, episode labels do not invent prerequisites');

assert.equal(R.WEEKS_PER_YEAR,50);assert.equal(R.absoluteWeek(2022,50),50);assert.equal(R.absoluteWeek(2023,1),51);assert.equal(R.absoluteWeek(2026,1),201);assert.throws(()=>R.absoluteWeek(2022,51));
const legacy={...R.resolve(db,"legacy-calendar",1,2022,1)};delete legacy.weeksPerYear;assert.deepEqual(R.resolve(db,"legacy-calendar",1,2022,1,legacy).current,legacy.current);
console.log("PASS 50-week rollover, 2026 offset, W51 rejected, legacy first-week movie choices retained");
const modern=R.resolve(db,'legacy-later',1,2023,1),oldDate=n=>Math.floor((n-1)/50)*52+(n-1)%50+1;
const old={...modern,lastWeek:oldDate(modern.lastWeek),history:modern.history.map(h=>({...h,releasedAt:oldDate(h.releasedAt)}))};delete old.weeksPerYear;
const migrated=R.resolve(db,'legacy-later',1,2023,1,old);assert.deepEqual(migrated.history,modern.history);assert.deepEqual(migrated.current,modern.current);
console.log('PASS cross-year legacy date conversion retains movie IDs and opening years');
