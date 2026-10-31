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
    return {maintenance:amount(values.maintenance??0),averagePrice:weighted/seatSum,ticketFull:cinemaID==='C02'?undefined:amount(values.ticketFull),secondRunMode:values.secondRunMode,specialHallPrices:specials};
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
  function marketingFactor(cinemaID,tier,budget=0){
    const spend=amount(budget);
    if(tier==='special')return 1;
    if(['C01','C03','C04'].includes(cinemaID)&&spend===0)return .5;
    if(cinemaID==='C02'&&spend>10000)return 1.1;
    if(cinemaID==='C05'&&tier==='average'&&spend>10000)return 2;
    return 1;
  }
  const specialBaseline=locationID=>({LOC01:150,LOC06:50,LOC08:50}[locationID]??100);
  function specialGross(price,rawRate,factor=1,baseline=100){
    price=amount(price);if(price<400||price>600||price%10!==0)throw Error('特別場票價需為400至600元，步長10元');
    const viewers=round((price===400?baseline:baseline*rawRate*(price>500?.7:1))*amount(factor));return {viewers,gross:viewers*price};
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
  function screeningPlan(movies,cinemaID,selected,featuredShare,ledger,screenCount=1){
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
      kept=[...fresh,...(screenCount>1?retained.slice(0,Math.max(0,6-fresh.length)):winners)];
    }
    const keepIDs=new Set(kept.map(h=>h.id));
    const secondary=featured?kept.find(h=>h.id!==selected):null;
    const removed=live.filter(h=>!keepIDs.has(h.id)).map(h=>h.id);
    const active=kept.length;
    const shares=Object.fromEntries(live.map(h=>[h.id,!keepIDs.has(h.id)?0:!selected?1/active:h.id===selected?featuredShare:active>1?(1-featuredShare)/(active-1):0]));
    const penalized=!!featured&&featuredShare>(cinemaID==='C01'?.8:cinemaID==='C02'?.6:1);
    return{shares,removed,secondaryID:secondary?.id||null,penalized};
  }
  function settle({database,movies,cinemaID,locationID,allocation,values,ledger,events}){
    const now=movies.lastWeek,live=showing(movies),by=new Map(database.movies.map(m=>[m.id,m]));
    const eventRules=events&&root.CinemaEventRules,eventSettings=eventRules?eventRules.settings(events,now):{};
    const carry=carryCandidate(movies,ledger),selected=eventSettings.shutdown?null:values.featuredFilm;
    if(!eventSettings.shutdown&&((movies.current.length||carry)&&!selected||selected&&(!live.some(h=>h.id===selected)||!movies.current.includes(selected)&&selected!==carry)))throw Error('請先選擇本週新片或可沿用的上週主打片');
    const capacity=R().screeningCapacity(allocation.screenCount,cinemaID),slots=eventSettings.shutdown?1:amount(values.featuredSlots);if(!Number.isInteger(slots)||slots<1||slots>R().maximumFeaturedSlots(allocation.screenCount,cinemaID))throw Error('場次占比錯誤');
    const operating=allocation.screens.filter(s=>!s.underConstructionUntil||s.underConstructionUntil<=now);
    const p=pricing(cinemaID,allocation,values);
    const availableSeats=operating.reduce((sum,s)=>sum+s.size,0);
    if(availableSeats)p.averagePrice=operating.reduce((sum,s)=>sum+s.size*(s.type==='EXTRA'?amount(values[extraKey(s)]):standardPrice(cinemaID,values,allocation.screenCount)),0)/availableSeats;
    const venue={cinemaID,locationID,screenCount:allocation.screenCount},featuredShare=slots/capacity;
    const plan=screeningPlan(movies,cinemaID,selected,featuredShare,ledger,allocation.screenCount);
    const result=live.map(h=>{
      const movie=by.get(h.id),share=plan.shares[h.id],forcedOff=plan.removed.includes(h.id);
      const rawRate=R().attendance(movie,h,now,movies.seed);
      let rate=forcedOff?0:R().effectiveAttendance(movie,h,now,movies.seed,venue,p);
      if(plan.penalized&&h.id!==selected&&movie.tier!=='special')rate*=.5;
      if(['C03','C04'].includes(cinemaID)&&featuredShare>.8&&h.id===selected&&movie.tier!=='special')rate*=.75;
      if(allocation.screenCount>7&&featuredShare>.5&&h.id===selected&&movie.tier!=='special')rate*=.25;
      const eventRate=eventRules?eventRules.attendance(events,now,movie,h.id===selected,rate):{rate,zero:false};rate=eventRate.rate;
      if(!forcedOff&&share>0&&!eventRate.zero)rate=Math.max(.001,rate);
      if(eventSettings.shutdown||eventRules&&eventRules.ticketZero(events,now))rate=0;
      const audienceFactor=marketingFactor(cinemaID,movie.tier,values.marketing);
      const dailyViewers=round(rate*availableSeats*6*share*audienceFactor);
      return {id:h.id,rawRate,rate,share,forcedOff,marketingFactor:audienceFactor,dailyViewers,regularGross:dailyViewers*p.averagePrice*3*(eventRules?eventRules.regularFactor(events,now):1),specialViewers:0,specialGross:0};
    });
    let specialSessionCount=0;
    if(availableSeats>0&&!eventSettings.shutdown&&!(eventRules&&eventRules.ticketZero(events,now))&&!['C02','C05'].includes(cinemaID))for(let i=1;i<=5;i++){
      const suffix=i===1?'':String(i),id=values['specialMovie'+suffix];if(!id)continue;
      const film=result.find(f=>f.id===id);if(!film)throw Error('特別場電影已下檔');
      if(film.forcedOff)continue;
      const extra=specialGross(values['specialPrice'+suffix],film.rawRate,film.marketingFactor,(eventSettings.specialBase??specialBaseline(locationID)));film.specialViewers+=extra.viewers;film.specialGross+=extra.gross;specialSessionCount++;
    }
    const films=result.map(f=>({...f,gross:round(f.regularGross+f.specialGross)}));return{earnedAt:now,bookedAt:now+1,specialSessionCount,featuredID:selected||null,extendedFeatured:selected===carry&&carry!==null,strategyRetirements:plan.removed,total:films.reduce((s,f)=>s+f.gross,0),films};
  }
  function createLedger(){return{version:1,lastSettledWeek:null,receipts:[],totalsByMovie:{},byYear:{}};}
  function resolveLedger(saved,now){
    if(saved===undefined)return createLedger();
    if(saved?.version!==1||!Array.isArray(saved.receipts)||typeof saved.totalsByMovie!=='object'||saved.totalsByMovie===null||typeof saved.byYear!=='object'||saved.byYear===null)throw Error('票房存檔無法讀取');
    if(saved.receipts.some(r=>r.featuredID===undefined&&r.extendedFeatured===undefined&&legacyFeatured(r)))saved={...saved,receipts:saved.receipts.map(r=>r.featuredID===undefined&&r.extendedFeatured===undefined&&legacyFeatured(r)?{...r,featuredID:legacyFeatured(r),extendedFeatured:false}:r)};
    let previous=0,previousFeatured=null;const totals={},years={},extended=new Set();for(const receipt of saved.receipts){
      if(!Number.isInteger(receipt.earnedAt)||receipt.earnedAt<=previous||receipt.bookedAt!==receipt.earnedAt+1||receipt.bookedAt>now||!Array.isArray(receipt.films)||new Set(receipt.films.map(f=>f.id)).size!==receipt.films.length)throw Error('票房入帳週次錯誤');
      if(receipt.specialSessionCount!==undefined&&(!Number.isInteger(receipt.specialSessionCount)||receipt.specialSessionCount<0||receipt.specialSessionCount>5))throw Error('特別場次數存檔錯誤');
      let total=0;for(const f of receipt.films){if(!/^MV\d{4}$/.test(f.id)||!Number.isSafeInteger(f.gross)||f.gross<0)throw Error('單片票房存檔錯誤');total+=f.gross;totals[f.id]=(totals[f.id]||0)+f.gross;}
      if(receipt.featuredID!==undefined&&receipt.featuredID!==null&&!receipt.films.some(f=>f.id===receipt.featuredID))throw Error('主打紀錄錯誤');
      if(receipt.extendedFeatured!==undefined&&typeof receipt.extendedFeatured!=='boolean')throw Error('沿用紀錄錯誤');
      if(receipt.extendedFeatured){if(!receipt.featuredID||previousFeatured!==receipt.featuredID||receipt.earnedAt!==previous+1||extended.has(receipt.featuredID))throw Error('電影重複沿用');extended.add(receipt.featuredID);}
      previousFeatured=receipt.featuredID||null;
      if(total!==receipt.total)throw Error('票房合計錯誤');const year=receipt.accountingYear??(2022+Math.floor((receipt.bookedAt-1)/50));if(receipt.accountingYear!==undefined&&(receipt.earnedAt%50!==0||receipt.accountingYear!==2022+Math.floor((receipt.earnedAt-1)/50)))throw Error('年度結算歸屬錯誤');years[year]=(years[year]||0)+total;previous=receipt.earnedAt;
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
  function lineupRange(cinemaID,screenCount){
    if(!Number.isInteger(screenCount)||screenCount<1)throw Error('片量目標廳數錯誤');
    if(screenCount===1||cinemaID==='C05')return null;
    if(cinemaID==='C01')return{min:4,max:6};
    if(cinemaID==='C02')return{min:Math.ceil(screenCount*5/3),max:screenCount*2};
    if(cinemaID==='C03')return{min:8,max:10};
    if(cinemaID==='C04')return{min:10,max:15};
    return null;
  }
  function balanceLineup(database,movies,ledger,cinemaID,screenCount){
    const hard=retireLowGross(movies,ledger,movies.lastWeek);
    const next=hard===movies?{...movies,history:movies.history.map(h=>({...h}))}:hard,now=next.lastWeek;
    const by=new Map(database.movies.map(m=>[m.id,m])),target=lineupRange(cinemaID,screenCount);
    const retire=(h,reason)=>{h.retiredAt=now;h.retirementReason=reason;};
    // Fixed initial-film expiry is never protected by a soft lineup target.
    for(const h of showing(next))if(h.initial&&h.id==='MV0003'&&now>=2)retire(h,'fixed-expiry');
    if(!target){
      for(const h of showing(next))if(R().retirement(by.get(h.id),h,now,next.seed))retire(h,'random');
      return next;
    }
    const previous=ledger?.receipts.find(r=>r.earnedAt===now-1),gross=new Map((previous?.films||[]).map(f=>[f.id,f.gross]));
    const fresh=new Set(next.current),old=showing(next).filter(h=>!fresh.has(h.id)).sort((a,b)=>(gross.get(a.id)||0)-(gross.get(b.id)||0)||a.releasedAt-b.releasedAt||a.id.localeCompare(b.id));
    const candidates=old.filter(h=>R().retirementEligible(by.get(h.id),h,now));
    let count=showing(next).length;
    // Existing random odds apply above the floor; weakest eligible titles leave
    // first so the best previous-week performers receive shortage protection.
    for(const h of candidates){
      if(count<=target.min)break;
      if(R().retirement(by.get(h.id),h,now,next.seed)){retire(h,'random');count--;}
    }
    // Do not retire young/special films early merely to force a soft target.
    // Baogong already has an independent scheduling cap; expand it to six.
    for(const h of cinemaID==='C01'?old:candidates){
      if(count<=target.max)break;
      if(h.retiredAt==null){retire(h,'lineup-cap');count--;}
    }
    return next;
  }
  function advance(context,ledger,{deferRelease=false,earlyClose=false}={}){
    const now=context.movies.lastWeek;ledger=resolveLedger(ledger,now);if(ledger.lastSettledWeek!==null&&ledger.lastSettledWeek>=now)throw Error('本週已結算');
    const receipt=settle({...context,ledger}),nextNow=now+1,year=2022+Math.floor((nextNow-1)/50);
    if(deferRelease){if(now%50!==0&&!earlyClose)throw Error('只有年末可開年度會議');if(now%50===0)receipt.accountingYear=2022+Math.floor((now-1)/50);}
    const reportYear=receipt.accountingYear??year;
    const next={...ledger,lastSettledWeek:now,receipts:[...ledger.receipts,receipt],byYear:{...ledger.byYear},totalsByMovie:{...ledger.totalsByMovie}};next.byYear[reportYear]=(next.byYear[reportYear]||0)+receipt.total;for(const f of receipt.films)next.totalsByMovie[f.id]=(next.totalsByMovie[f.id]||0)+f.gross;
    if(deferRelease)return{movies:context.movies,ledger:next,year:reportYear,week:(now-1)%50+1,receipt};
    return releaseAfterSettlement(context,next,receipt);
  }
  function releaseAfterSettlement(context,next,receipt){
    const now=context.movies.lastWeek,nextNow=now+1,year=2022+Math.floor((nextNow-1)/50),week=(nextNow-1)%50+1;
    let movies=structuredClone(context.movies);for(const h of showing(movies))if(receipt.strategyRetirements.includes(h.id)){h.retiredAt=now;h.retirementReason='baogong-focus';}
    movies=R().releaseWeek(context.database,movies,year,week);for(const h of movies.history)h.retiredAt??=null;
    movies=balanceLineup(context.database,movies,next,context.cinemaID,context.allocation?.screenCount??1);
    return{movies,ledger:next,year,week,receipt};
  }
  function completeYear(context,ledger){
    const now=context.movies.lastWeek;if(now%50!==0)throw Error('並非年度會議');
    resolveLedger(ledger,now+1);const receipt=ledger.receipts.at(-1);
    if(receipt?.earnedAt!==now||receipt.accountingYear!==2022+Math.floor((now-1)/50))throw Error('年度尚未結算');
    return releaseAfterSettlement(context,ledger,receipt);
  }
  const api={extraKey,standardPrice,pricing,hydrate,showing,marketingFactor,specialBaseline,specialGross,carryCandidate,screeningPlan,settle,createLedger,resolveLedger,retireLowGross,lineupRange,balanceLineup,advance,completeYear};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaBoxOffice=api;
})(globalThis);
