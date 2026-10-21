const assert=require('node:assert/strict');globalThis.CinemaRules=require('../assignment-rules.js');const R=require('../movie-rules.js'),db=require('../data/movies.json');
const apply=(locationID,extra={})=>R.locationAttendance({attendanceRate:.4,locationID,cinemaID:'C01',tier:'average',screenCount:3,...extra});
const near=(a,b)=>assert(Math.abs(a-b)<1e-12,`${a} != ${b}`);
const factors={LOC01:1,LOC02:1,LOC03:.8,LOC04:.9,LOC05:.8,LOC06:.6,LOC07:.7,LOC08:.6};
for(const [locationID,factor]of Object.entries(factors))for(const tier of ['hit','bomb','average','special'])for(const cinemaID of ['C01','C02','C03','C04','C05'])for(const screenCount of [1,3,4,25])for(const attendanceRate of [0,.01,.4,.99,1])near(apply(locationID,{tier,cinemaID,screenCount,attendanceRate}),attendanceRate*(tier==='special'?1:factor));
const hit=db.movies.find(m=>m.tier==='hit'),record={releasedAt:1,initial:false};const venue={locationID:'LOC01',cinemaID:'C01',screenCount:3};
for(let week=1;week<=6;week++){const raw=R.attendance(hit,record,week,'weekly');near(R.effectiveAttendance(hit,record,week,'weekly',venue),raw);}
const special=db.movies.find(m=>m.id==='MV0503');near(R.effectiveAttendance(special,record,5,'weekly',{...venue,locationID:'LOC08'}),.5);
for(const extra of [{locationID:'bad'},{tier:'unknown'},{cinemaID:'bad'},{attendanceRate:NaN},{screenCount:0}])assert.throws(()=>apply('LOC01',extra));
console.log('PASS only eight initial location factors remain; no withdrawn bonuses by cinema/tier/hall count; weekly/special composition and invalid inputs');

near(R.effectiveAttendance(hit,record,5,"weekly",{...venue,locationID:"LOC06"}),.006);
