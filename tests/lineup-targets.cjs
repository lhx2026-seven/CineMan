const assert=require('node:assert/strict');globalThis.CinemaRules=require('../assignment-rules.js');globalThis.CinemaMovieRules=require('../movie-rules.js');globalThis.CinemaParameters=require('../parameter-rules.js');
const B=require('../box-office.js'),R=CinemaMovieRules,db=require('../data/movies.json');
for(const [id,n,range] of [['C01',3,{min:4,max:6}],['C03',5,{min:8,max:10}],['C04',20,{min:10,max:15}],['C02',2,{min:4,max:4}],['C02',3,{min:5,max:6}],['C02',4,{min:7,max:8}],['C02',6,{min:10,max:12}],['C05',2,null],['C01',1,null],['C05',1,null]])assert.deepEqual(B.lineupRange(id,n),range);
const ids=db.movies.filter(m=>!m.initial&&m.tier!=='special').slice(0,30).map(m=>m.id);
const fixture=(count,age=6)=>({version:1,weeksPerYear:50,seed:'lineup-target',lastWeek:20,current:ids.slice(count-2,count),history:ids.slice(0,count).map((id,i)=>({id,releasedAt:i>=count-2?20:21-age,initial:false,retiredAt:null}))});
const ledger=movies=>({receipts:[{earnedAt:19,bookedAt:20,films:movies.history.filter(h=>!movies.current.includes(h.id)).map((h,i)=>({id:h.id,gross:10000+i*10000}))}]});
for(const [id,n] of [['C01',3],['C02',6],['C03',8],['C04',20]]){
 const range=B.lineupRange(id,n),movies=fixture(range.max+4),l=ledger(movies),before=JSON.stringify({movies,l});
 for(let i=0;i<100;i++){
  const input={...movies,seed:'lineup/'+i},out=B.balanceLineup(db,input,l,id,n),live=B.showing(out);
  assert(live.length>=range.min&&live.length<=range.max);assert(out.current.every(id=>live.some(h=>h.id===id)));
  assert.deepEqual(out,B.balanceLineup(db,input,l,id,n));assert.deepEqual(B.hydrate(db,out),out);
 }
 assert.equal(JSON.stringify({movies,l}),before);
 const small=fixture(range.min),retained=B.balanceLineup(db,small,ledger(small),id,n);assert.equal(B.showing(retained).length,range.min);
 const high=small.history.filter(h=>!small.current.includes(h.id)).at(-1).id;assert(B.showing(retained).some(h=>h.id===high));
 const poor=ledger(small);poor.receipts[0].films.forEach(f=>f.gross=1999);const fallen=B.balanceLineup(db,small,poor,id,n);assert.deepEqual(B.showing(fallen).map(h=>h.id),small.current);assert(fallen.history.filter(h=>!small.current.includes(h.id)).every(h=>h.retirementReason==='low-gross'));
}
// Make all eligible random rolls hit; only the weakest old titles may leave
// while the higher previous-week gross titles are protected at the floor.
const realRetirement=R.retirement;R.retirement=()=>true;
for(const [id,n]of [['C01',3],['C02',4],['C03',8],['C04',20]]){
 const range=B.lineupRange(id,n),m=fixture(range.max+2),l=ledger(m),result=B.balanceLineup(db,m,l,id,n),kept=B.showing(result).filter(h=>!m.current.includes(h.id));
 assert.equal(B.showing(result).length,range.min);assert.deepEqual(kept.map(h=>h.id),m.history.slice(0,-2).slice(-(range.min-2)).map(h=>h.id));
}
R.retirement=realRetirement;
// Ordinary films before age five and long-run specials before age thirteen
// aren't retired early merely because a non-Baogong lineup exceeds its goal.
const young=fixture(13,3);assert.equal(B.showing(B.balanceLineup(db,young,ledger(young),'C03',8)).length,13);
const long={...fixture(2),history:[{id:'MV0504',releasedAt:9,initial:false,retiredAt:null},{id:'MV0505',releasedAt:9,initial:false,retiredAt:null},...fixture(2).history]};long.current=fixture(2).current;
assert(B.showing(B.balanceLineup(db,long,{receipts:[]},'C04',20)).some(h=>h.id==='MV0504'));
const initial={...fixture(2),lastWeek:2,history:[{id:'MV0003',releasedAt:1,initial:true,retiredAt:null},...fixture(2).history.map(h=>({...h,releasedAt:2}))]};
assert.equal(B.balanceLineup(db,initial,{receipts:[]},'C04',20).history.find(h=>h.id==='MV0003').retiredAt,2);
for(const [id,n]of [['C01',1],['C05',2]]){const m=fixture(12),out=B.balanceLineup(db,m,ledger(m),id,n);for(const h of m.history)assert.equal(out.history.find(x=>x.id===h.id).retiredAt,R.retirement(db.movies.find(x=>x.id===h.id),h,m.lastWeek,m.seed)?m.lastWeek:null);}
// Non-single Baogong retains two new films and up to four best old films.
const many=fixture(9,3),l=ledger(many),plan=B.screeningPlan(many,'C01',many.current[0],.8,l,3);
assert.equal(many.history.length-plan.removed.length,6);assert(many.current.every(id=>!plan.removed.includes(id)));
assert.equal(many.history.length-B.screeningPlan(many,'C01',many.current[0],.80001,l,3).removed.length,2);
console.log('PASS soft lineup ranges, ranked floor protection, upper trimming, forced low-gross/fixed expiry, young/special protection, one-screen/public exemptions, deterministic reload and Baogong focus exception');

for(const [cinemaID,screenCount,seats]of[['C01',3,1000],['C02',6,750],['C03',7,1800],['C04',16,2500],['C05',2,450]]){
 let movies=B.hydrate(db,R.resolve(db,'lineup-season-'+cinemaID,screenCount,2022,1)),book=B.createLedger();
 const allocation={screenCount,totalSeats:seats,screens:Array.from({length:screenCount},(_,i)=>({type:'NORMAL',name:'normal',size:Math.floor(seats/screenCount)+(i<seats%screenCount?1:0)}))};
 for(let n=1;n<=65;n++){
  const range=B.lineupRange(cinemaID,screenCount),count=B.showing(movies).length;if(range&&n>=5)assert(count>=range.min&&count<=range.max,`${cinemaID} week ${n}: ${count}`);
  const context={database:db,movies,cinemaID,locationID:'LOC01',allocation,values:{marketing:10000,maintenance:200000,ticketFull:300,secondRunPrice:160,secondRunMode:'double',featuredFilm:movies.current[0]||B.carryCandidate(movies,book),featuredSlots:Math.floor(R.screeningCapacity(screenCount,cinemaID)*.5)}};
  let out=B.advance(context,book,{deferRelease:movies.lastWeek%50===0});if(movies.lastWeek%50===0){assert.equal(out.movies.lastWeek,n);out=B.completeYear({...context,movies:out.movies},out.ledger);}
  movies=out.movies;book=out.ledger;B.resolveLedger(book,n+1);assert.deepEqual(B.hydrate(db,movies),movies);assert.equal(book.receipts.length,n);
 }
 console.log('PASS',cinemaID,'65-week real release/settlement simulation, target warm-up, persisted retirement protection, virtual meeting and next-year continuity');
}
