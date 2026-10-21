const assert=require('node:assert/strict');globalThis.CinemaRules=require('../assignment-rules.js');const R=require('../movie-rules.js'),db=require('../data/movies.json');
const apply=(extra={})=>R.ticketAttendance({attendanceRate:.9,cinemaID:'C01',screenCount:10,ticketFull:350,specialHallPrices:[],...extra});const near=(a,b)=>assert(Math.abs(a-b)<1e-12,`${a} != ${b}`);
for(const cinemaID of ['C01','C03','C04']){near(apply({cinemaID,ticketFull:350}),.9);near(apply({cinemaID,ticketFull:351}),.4);near(apply({cinemaID,ticketFull:400,specialHallPrices:[600,600,500,400]}),.2);}
for(const secondRunMode of ['double','unlimited'])near(apply({cinemaID:'C02',secondRunMode}),.9);near(apply({cinemaID:'C02',secondRunMode:'single'}),.4);
near(apply({cinemaID:'C05',ticketFull:200}),.9);near(apply({cinemaID:'C05',ticketFull:201}),.85);
near(apply({specialHallPrices:[600,600]}),.7);near(apply({specialHallPrices:[600,400]}),.8);near(apply({specialHallPrices:[500,500]}),.9);
near(apply({screenCount:1,specialHallPrices:[501]}),0);near(apply({attendanceRate:.1,ticketFull:400}),0);near(apply({attendanceRate:1,ticketFull:350}),1);near(apply({attendanceRate:0}),0);
// Exact UI rules provide one price for a format; every actual hall is counted.
const halls=[{type:'NORMAL',format:'normal'},{type:'EXTRA',format:'VIP'},{type:'EXTRA',format:'VIP'},{type:'EXTRA',format:'IMAX'}],prices={VIP:600,IMAX:500};const physicalPrices=halls.filter(h=>h.type==='EXTRA').map(h=>prices[h.format]);near(apply({screenCount:4,specialHallPrices:physicalPrices}),.4);
const movie=db.movies.find(m=>m.id==='MV0504'),record={releasedAt:1,initial:false},venue={locationID:'LOC02',cinemaID:'C03',screenCount:10};near(R.effectiveAttendance(movie,record,1,'seed',venue,{ticketFull:360,specialHallPrices:[600,600]}),1);
// Location clamps first; ticket deductions then stack and clamp again.
const hit=db.movies.find(m=>m.tier==='hit');const location=R.effectiveAttendance(hit,record,1,'seed',venue);near(R.effectiveAttendance(hit,record,1,'seed',venue,{ticketFull:360,specialHallPrices:[]}),Math.max(0,location-.5));
for(const bad of [{ticketFull:NaN},{specialHallPrices:[undefined]},{specialHallPrices:[-1]},{screenCount:1,specialHallPrices:[600,600]},{cinemaID:'C02',secondRunMode:'invalid'}])assert.throws(()=>apply(bad));
console.log('PASS strict >350/>500/>200 boundaries, all five cinema types, second-run modes, actual extra-hall counts, cumulative point deductions and 0–100% bounds');
