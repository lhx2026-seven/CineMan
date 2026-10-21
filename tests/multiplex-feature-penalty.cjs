const assert=require('node:assert/strict');globalThis.CinemaRules=require('../assignment-rules.js');globalThis.CinemaMovieRules=require('../movie-rules.js');globalThis.CinemaParameters=require('../parameter-rules.js');const R=CinemaMovieRules,B=require('../box-office.js'),db=require('../data/movies.json');
const ordinary=db.movies.filter(m=>m.tier==='hit').slice(0,2),special=db.movies.find(m=>m.id==='MV0504');
const allocation={screenCount:10,totalSeats:1000,screens:Array.from({length:10},()=>({type:'NORMAL',name:'normal',size:100}))};
for(const count of[7,8,10])for(const cinemaID of['C03','C04'])for(const featured of[...ordinary,special])for(const share of[.5-1/(6*count),.5,.5+1/(6*count),.8,.8+1/(6*count)]){
 const slots=Math.round(share*6*count),actualShare=slots/(6*count),allocated={...allocation,screenCount:count,screens:Array.from({length:count},(_,i)=>({type:'NORMAL',name:'normal',size:i===0?1000-(count-1)*100:100}))};
 const movies={version:1,weeksPerYear:50,seed:'multiplex-penalty',lastWeek:1,current:[featured.id,ordinary.find(m=>m.id!==featured.id).id],history:[...new Set([...ordinary.map(m=>m.id),special.id])].map(id=>({id,releasedAt:1,initial:false,retiredAt:null}))};
 const receipt=B.settle({database:db,movies,cinemaID,locationID:'LOC06',allocation:allocated,values:{marketing:5000,ticketFull:300,featuredFilm:featured.id,featuredSlots:slots,specialMovie:featured.id,specialPrice:500}});
 assert.deepEqual(receipt.strategyRetirements,[]);
 for(const f of receipt.films){const m=db.movies.find(m=>m.id===f.id),h=movies.history.find(h=>h.id===f.id),base=R.effectiveAttendance(m,h,1,movies.seed,{cinemaID,locationID:'LOC06',screenCount:count},{ticketFull:300,specialHallPrices:[]});const applies=f.id===featured.id&&m.tier!=='special';const expected=base*(applies&&actualShare>.8?.75:1)*(applies&&count>7&&actualShare>.5?.25:1);assert(Math.abs(f.rate-expected)<1e-12);assert.equal(f.dailyViewers,Math.round(Number((expected*1000*6*f.share).toFixed(9))));}
 const main=receipt.films.find(f=>f.id===featured.id);assert.equal(main.specialViewers,Math.round(100*main.rawRate));
}
console.log('PASS >7 halls and >50% featured ×0.25, exact 7/50 boundaries, stacking with C03/C04 >80% ×0.75, all ordinary featured choices, non-featured/special immunity, raw-rate special sessions and final viewer rounding');
