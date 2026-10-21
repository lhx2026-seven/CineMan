'use strict';
(function(root){
  const R=()=>root.CinemaMovieRules;
  const round=value=>Math.round(value+Number.EPSILON*Math.max(1,Math.abs(value))*4);
  const amount=value=>{const n=typeof value==='number'?value:typeof value==='string'&&value.trim()!==''?Number(value):NaN;if(!Number.isFinite(n)||n<0)throw Error('票價資料不完整');return n;};
  const format=screen=>screen.name.replace(/\s*\([^)]*\)$/, '');
  const extraKey=screen=>'ticketExtra_'+format(screen).replace(/[^a-zA-Z0-9]/g,'');
  function standardPrice(cinemaID,values,screenCount){
    if(cinemaID==='C02'){const divisor={single:1,double:2,unlimited:screenCount*2}[values.secondRunMode];if(!divisor)throw Error('請選擇售票方式');return amount(values.secondRunPrice)/divisor;}
    const full=amount(values.ticketFull);if(cinemaID==='C05')return full;
    const derived=root.CinemaParameters.derive(full);return(full+(derived.ticketDiscount+derived.ticketMorning+derived.ticketAccessible)/3)/2;
  }
  function pricing(cinemaID,allocation,values){
    const base=standardPrice(cinemaID,values,allocation.screenCount);let seatSum=0,weighted=0;const specials=[];
    for(const screen of allocation.screens){if(!Number.isInteger(screen.size)||screen.size<=0)throw Error('影廳座位資料錯誤');const price=screen.type==='EXTRA'?amount(values[extraKey(screen)]):base;seatSum+=screen.size;weighted+=price*screen.size;if(screen.type==='EXTRA')specials.push(price);}
    if(seatSum!==allocation.totalSeats||allocation.screens.length!==allocation.screenCount)throw Error('影廳合計資料錯誤');
    return {averagePrice:weighted/seatSum,ticketFull:cinemaID==='C02'?undefined:amount(values.ticketFull),secondRunMode:values.secondRunMode,specialHallPrices:specials};
  }
  function hydrate(database,state){
    const copy=structuredClone(state),by=new Map(database.movies.map(m=>[m.id,m]));
    for(const h of copy.history){
      if(h.retiredAt!==undefined&&h.retiredAt!==null&&(!Number.isInteger(h.retiredAt)||h.retiredAt<h.releasedAt||h.retiredAt>copy.lastWeek))throw Error('下檔存檔日期錯誤');
      if(copy.current.includes(h.id)&&h.retiredAt!==undefined&&h.retiredAt!==null)throw Error('本週新片不可已下檔');
      if(h.retiredAt===undefined){h.retiredAt=null;for(let w=h.releasedAt+1;w<=copy.lastWeek;w++)if(R().retirement(by.get(h.id),h,w,copy.seed)){h.retiredAt=w;break;}}
    }return copy;
  }
  const showing=state=>state.history.filter(h=>h.retiredAt===null||h.retiredAt===undefined);
  function specialGross(price,rawRate){
    price=amount(price);if(price<400||price>600||price%10!==0)throw Error('特別場票價需為400至600元，步長10元');
    const viewers=round(price===400?100:100*rawRate*(price>500?.7:1));return {viewers,gross:viewers*price};
  }
  function legacyFeatured(receipt){
    const films=receipt?.films;if(!Array.isArray(films)||films.length<3||films.some(f=>!Number.isFinite(f.share)||f.share<0||f.share>1)||Math.abs(films.reduce((sum,f)=>sum+f.share,0)-1)>1e-10)return null;
    // Old versions gave every non-featured film the same share. Only an
    // unambiguous single outlier identifies the feature; equal/two-film cases do not.
    const candidates=films.filter(film=>{const rest=films.filter(f=>f!==film);return rest.every(f=>Math.abs(f.share-rest[0].share)<1e-12);});
    return candidates.length===1?candidates[0].id:null;
  }
  function carryCandidate(movies,ledger){
    if(!movies||!ledger)return null;
    const previous=ledger?.receipts.find(r=>r.earnedAt===movies.lastWeek-1);
    const id=previous?.featuredID||(previous?.extendedFeatured===undefined?legacyFeatured(previous):null);
    if(!id||!showing(movies).some(h=>h.id===id)||ledger.receipts.some(r=>r.featuredID===id&&r.extendedFeatured===true))return null;
    return id;
  }
  function screeningPlan(movies,cinemaID,selected,featuredShare,ledger){
    const live=showing(movies),featured=live.find(h=>h.id===selected);
    const cap=cinemaID==='C01'?(featured&&featuredShare>.8?2:3):live.length;
    const others=live.filter(h=>h.id!==selected).sort((a,b)=>Number(b.releasedAt===featured?.releasedAt&&!!b.initial===!!featured?.initial)-Number(a.releasedAt===featured?.releasedAt&&!!a.initial===!!featured?.initial)||b.releasedAt-a.releasedAt||a.id.localeCompare(b.id));
    let kept=(featured?[featured,...others]:others).slice(0,cap);
    if(cinemaID==='C01'&&!(featured&&featuredShare>.8)){
      const previous=ledger?.receipts.find(r=>r.earnedAt===movies.lastWeek-1);
      const gross=new Map((previous?.films||[]).map(f=>[f.id,f.gross]));
      const fresh=live.filter(h=>movies.current.includes(h.id));
      const old=live.filter(h=>!movies.current.includes(h.id)).sort((a,b)=>(gross.get(b.id)||0)-(gross.get(a.id)||0)||b.releasedAt-a.releasedAt||a.id.localeCompare(b.id));
      // A manually carried feature remains the first retained-film choice.
      const retained=featured&&!movies.current.includes(featured.id)?[featured,...old.filter(h=>h.id!==featured.id)]:old;
      const winners=retained.slice(0,1),second=retained[1];
      const highest=Math.max(0,...old.map(h=>gross.get(h.id)||0));
      if(second&&(gross.get(second.id)||0)>=2000&&(gross.get(second.id)||0)>=highest*.5)winners.push(second);
      kept=[...fresh,...winners];
    }
    const keepIDs=new Set(kept.map(h=>h.id));
    const secondary=featured?kept.find(h=>h.id!==selected):null;
    const removed=live.filter(h=>!keepIDs.has(h.id)).map(h=>h.id);
    const active=kept.length;
    const shares=Object.fromEntries(live.map(h=>[h.id,!keepIDs.has(h.id)?0:!selected?1/active:h.id===selected?featuredShare:active>1?(1-featuredShare)/(active-1):0]));
    const penalized=!!featured&&featuredShare>(cinemaID==='C01'?.8:cinemaID==='C02'?.6:1);
    return{shares,removed,secondaryID:secondary?.id||null,penalized};
  }
  function settle({database,movies,cinemaID,locationID,allocation,values,ledger}){
    const now=movies.lastWeek,live=showing(movies),by=new Map(database.movies.map(m=>[m.id,m]));
    const carry=carryCandidate(movies,ledger),selected=values.featuredFilm;
    if((movies.current.length||carry)&&!selected||selected&&(!live.some(h=>h.id===selected)||!movies.current.includes(selected)&&selected!==carry))throw Error('請先選擇本週新片或可延用的上週主打片');
    const slots=amount(values.featuredSlots),capacity=R().screeningCapacity(allocation.screenCount,cinemaID);if(!Number.isInteger(slots)||slots>R().maximumFeaturedSlots(allocation.screenCount,cinemaID))throw Error('場次占比錯誤');
    const p=pricing(cinemaID,allocation,values),venue={cinemaID,locationID,screenCount:allocation.screenCount},featuredShare=slots/capacity;
    const plan=screeningPlan(movies,cinemaID,selected,featuredShare,ledger);
    const result=live.map(h=>{
      const movie=by.get(h.id),share=plan.shares[h.id],forcedOff=plan.removed.includes(h.id);
      const rawRate=R().attendance(movie,h,now,movies.seed);
      let rate=forcedOff?0:R().effectiveAttendance(movie,h,now,movies.seed,venue,p);
      if(plan.penalized&&h.id!==selected&&movie.tier!=='special')rate*=.5;
      if(['C03','C04'].includes(cinemaID)&&featuredShare>.8&&h.id===selected&&movie.tier!=='special')rate*=.75;
      if(allocation.screenCount>7&&featuredShare>.5&&h.id===selected&&movie.tier!=='special')rate*=.25;
      const dailyViewers=round(rate*allocation.totalSeats*6*share);
      return {id:h.id,rawRate,rate,share,forcedOff,dailyViewers,regularGross:dailyViewers*p.averagePrice*3,specialViewers:0,specialGross:0};
    });
    if(!['C02','C05'].includes(cinemaID))for(let i=1;i<=5;i++){
      const suffix=i===1?'':String(i),id=values['specialMovie'+suffix];if(!id)continue;
      const film=result.find(f=>f.id===id);if(!film)throw Error('特別場電影已下檔');
      if(film.forcedOff)continue;
      const extra=specialGross(values['specialPrice'+suffix],film.rawRate);film.specialViewers+=extra.viewers;film.specialGross+=extra.gross;
    }
    const films=result.map(f=>({...f,gross:round(f.regularGross+f.specialGross)}));return{earnedAt:now,bookedAt:now+1,featuredID:selected||null,extendedFeatured:selected===carry&&carry!==null,strategyRetirements:plan.removed,total:films.reduce((s,f)=>s+f.gross,0),films};
  }
  function createLedger(){return{version:1,lastSettledWeek:null,receipts:[],totalsByMovie:{},byYear:{}};}
  function resolveLedger(saved,now){
    if(saved===undefined)return createLedger();
    if(saved?.version!==1||!Array.isArray(saved.receipts)||typeof saved.totalsByMovie!=='object'||saved.totalsByMovie===null||typeof saved.byYear!=='object'||saved.byYear===null)throw Error('票房存檔無法讀取');
    if(saved.receipts.some(r=>r.featuredID===undefined&&r.extendedFeatured===undefined&&legacyFeatured(r)))saved={...saved,receipts:saved.receipts.map(r=>r.featuredID===undefined&&r.extendedFeatured===undefined&&legacyFeatured(r)?{...r,featuredID:legacyFeatured(r),extendedFeatured:false}:r)};
    let previous=0,previousFeatured=null;const totals={},years={},extended=new Set();for(const receipt of saved.receipts){
      if(!Number.isInteger(receipt.earnedAt)||receipt.earnedAt<=previous||receipt.bookedAt!==receipt.earnedAt+1||receipt.bookedAt>now||!Array.isArray(receipt.films)||new Set(receipt.films.map(f=>f.id)).size!==receipt.films.length)throw Error('票房入帳週次錯誤');
      let total=0;for(const f of receipt.films){if(!/^MV\d{4}$/.test(f.id)||!Number.isSafeInteger(f.gross)||f.gross<0)throw Error('單片票房存檔錯誤');total+=f.gross;totals[f.id]=(totals[f.id]||0)+f.gross;}
      if(receipt.featuredID!==undefined&&receipt.featuredID!==null&&!receipt.films.some(f=>f.id===receipt.featuredID))throw Error('主打紀錄錯誤');
      if(receipt.extendedFeatured!==undefined&&typeof receipt.extendedFeatured!=='boolean')throw Error('延用紀錄錯誤');
      if(receipt.extendedFeatured){if(!receipt.featuredID||previousFeatured!==receipt.featuredID||receipt.earnedAt!==previous+1||extended.has(receipt.featuredID))throw Error('電影重複延用');extended.add(receipt.featuredID);}
      previousFeatured=receipt.featuredID||null;
      if(total!==receipt.total)throw Error('票房合計錯誤');const year=2022+Math.floor((receipt.bookedAt-1)/50);years[year]=(years[year]||0)+total;previous=receipt.earnedAt;
    }
    if(saved.lastSettledWeek!==(previous||null)||JSON.stringify(Object.entries(totals).sort())!==JSON.stringify(Object.entries(saved.totalsByMovie).sort())||JSON.stringify(Object.entries(years).sort())!==JSON.stringify(Object.entries(saved.byYear).sort()))throw Error('票房累計存檔錯誤');return saved;
  }
  function retireLowGross(movies,ledger,week=movies.lastWeek){
    const previous=ledger?.receipts.find(r=>r.earnedAt===week-1);
    if(!previous)return movies;
    const earned=new Map(previous.films.map(f=>[f.id,f.gross])),copy=structuredClone(movies);
    for(const h of showing(copy))if(earned.has(h.id)&&earned.get(h.id)<2000){h.retiredAt=week;h.retirementReason='low-gross';}
    return copy;
  }
  function advance(context,ledger){
    const now=context.movies.lastWeek;ledger=resolveLedger(ledger,now);if(ledger.lastSettledWeek!==null&&ledger.lastSettledWeek>=now)throw Error('本週已結算');
    const receipt=settle({...context,ledger}),nextNow=now+1,year=2022+Math.floor((nextNow-1)/50),week=(nextNow-1)%50+1;
    const next=structuredClone(ledger);next.lastSettledWeek=now;next.receipts.push(receipt);next.byYear[year]=(next.byYear[year]||0)+receipt.total;for(const f of receipt.films)next.totalsByMovie[f.id]=(next.totalsByMovie[f.id]||0)+f.gross;
    let movies=structuredClone(context.movies);for(const h of showing(movies))if(receipt.strategyRetirements.includes(h.id)){h.retiredAt=now;h.retirementReason='baogong-focus';}
    movies=retireLowGross(movies,next,nextNow);movies=structuredClone(movies);const by=new Map(context.database.movies.map(m=>[m.id,m]));
    for(const h of showing(movies))if(R().retirement(by.get(h.id),h,nextNow,movies.seed))h.retiredAt=nextNow;
    movies=R().releaseWeek(context.database,movies,year,week);for(const h of movies.history)h.retiredAt??=null;
    return{movies,ledger:next,year,week,receipt};
  }
  const api={extraKey,standardPrice,pricing,hydrate,showing,specialGross,carryCandidate,screeningPlan,settle,createLedger,resolveLedger,retireLowGross,advance};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaBoxOffice=api;
})(globalThis);
