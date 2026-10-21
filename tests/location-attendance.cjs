const assert=require('node:assert/strict');globalThis.CinemaRules=require('../assignment-rules.js');const R=require('../movie-rules.js'),db=require('../data/movies.json');
const apply=(locationID,extra={})=>R.locationAttendance({attendanceRate:.4,locationID,cinemaID:'C01',tier:'average',screenCount:3,...extra});
const near=(a,b)=>assert(Math.abs(a-b)<1e-12,`${a} != ${b}`);
near(apply('LOC01'),.9);near(apply('LOC01',{cinemaID:'C05'}),.9);near(apply('LOC01',{cinemaID:'C03'}),.4);
near(apply('LOC02',{tier:'hit'}),.7);near(apply('LOC02'),.4);
near(apply('LOC03',{cinemaID:'C02'}),.65);near(apply('LOC03',{cinemaID:'C01'}),.4);
near(apply('LOC04',{tier:'hit'}),.9);near(apply('LOC04',{tier:'special'}),.4);
near(apply('LOC05',{tier:'hit',screenCount:3}),.6);near(apply('LOC05',{tier:'hit',screenCount:4}),.4);near(apply('LOC05',{tier:'bomb',screenCount:1}),.4);
near(apply('LOC06',{tier:'bomb'}),.2);near(apply('LOC06',{tier:'average'}),.2);near(apply('LOC06',{tier:'hit'}),.4);near(apply('LOC06',{tier:'special'}),.4);
near(apply('LOC07'),.15);near(apply('LOC07',{tier:'hit'}),.4);
for(const tier of ['hit','bomb','average','special'])near(apply('LOC08',{tier}),.2);
assert.equal(apply('LOC01',{attendanceRate:.8}),1);assert.equal(apply('LOC02',{tier:'hit',attendanceRate:.8}),1);assert.equal(apply('LOC07',{attendanceRate:.1}),0);
for(const locationID of Array.from({length:8},(_,i)=>'LOC0'+(i+1)))for(const tier of ['hit','bomb','average','special'])for(const cinemaID of ['C01','C02','C03','C04','C05'])for(const screenCount of [1,3,4,25])for(const attendanceRate of [0,.01,.4,.99,1]){const result=apply(locationID,{tier,cinemaID,screenCount,attendanceRate});assert(result>=0&&result<=1);}
const hit=db.movies.find(m=>m.tier==='hit'),record={releasedAt:1,initial:false};const venue={locationID:'LOC01',cinemaID:'C01',screenCount:3};
for(let week=1;week<=6;week++){const raw=R.attendance(hit,record,week,'weekly');near(R.effectiveAttendance(hit,record,week,'weekly',venue),Math.min(1,raw+.5));}
const special=db.movies.find(m=>m.id==='MV0503');near(R.effectiveAttendance(special,record,5,'weekly',{...venue,locationID:'LOC08'}),.25);
for(const extra of [{locationID:'bad'},{tier:'unknown'},{cinemaID:'bad'},{attendanceRate:NaN},{screenCount:0}])assert.throws(()=>apply('LOC01',extra));
console.log('PASS all eight location rules, cinema/tier applicability, <4 boundary, percentage-point changes, 0–100% clamp, weekly/special composition, invalid inputs');
