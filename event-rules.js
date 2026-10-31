'use strict';
(function(root){
  const yearOf=w=>2022+Math.floor((w-1)/50),weekOf=w=>(w-1)%50+1;
  const money=n=>Math.round(n+Number.EPSILON*Math.max(1,Math.abs(n))*4);
  const random=(seed,key)=>root.CinemaRules.seededRandom(`events/v1/${seed}/${key}`)();
  const kinds=new Set(['attendance','lock','expense','regularGross','shutdown','fact','spaceZero','upgrade','closeHall','reissue','foodAdd','foodFactor','foodZero','income','ticketZero','specialBase','end','sellLand','raiseRent']);
  const RECOVERY_EVENTS=Object.freeze(['eb002','ef001','ef002','ec005','ec007','eb008']);
  const active=(e,w)=>e.start<=w&&w<=e.end;
  const numeric=n=>Number.isSafeInteger(n)&&n>=0;
  function create(week){return{version:1,introducedAt:week,throughWeek:0,draws:[],effects:[],facts:{},frames:[],annualProfits:{},receipts:[],feeReceipts:[],acknowledged:[]};}
  function resolve(saved,now,database){
    if(saved==null)return create(now);
    if(saved.version!==1||!numeric(saved.introducedAt)||saved.introducedAt<1||saved.introducedAt>now||!numeric(saved.throughWeek)||saved.throughWeek>now||!saved.facts||!saved.annualProfits||!['draws','effects','frames','receipts','feeReceipts','acknowledged'].every(k=>Array.isArray(saved[k])))throw Error('事件存檔無法讀取');
    const known=new Set(database.events.map(e=>e.id)),weeks=new Set(),keys=new Set();
    for(const d of saved.draws){if(!known.has(d.id)||!Number.isInteger(d.week)||d.week<saved.introducedAt||d.week>now||weeks.has(d.week)||d.key!==`${d.id}/${d.week}`||typeof d.message!=='string'||typeof d.applied!=='boolean'||!Array.isArray(d.choices)||d.choice!==null&&!d.choices.some(c=>c.id===d.choice))throw Error('事件抽選紀錄錯誤');weeks.add(d.week);keys.add(d.key);}
    for(const e of saved.effects)if(!keys.has(e.source)||!kinds.has(e.kind)||!Number.isInteger(e.start)||!Number.isInteger(e.end)||e.start<1||e.end<e.start)throw Error('事件效果紀錄錯誤');
    let last=0;for(const f of saved.frames){if(!Number.isInteger(f.week)||f.week<=last||f.week>=now||!f.values||!numeric(f.viewers)||!Number.isFinite(f.averagePrice)||!Number.isSafeInteger(f.profit)||typeof f.shutdown!=='boolean')throw Error('事件上週資料錯誤');last=f.week;}
    last=0;for(const r of saved.receipts){if(!Number.isInteger(r.earnedAt)||r.earnedAt<=last||r.bookedAt!==r.earnedAt+1||r.bookedAt>now||r.accountingYear!==yearOf(r.earnedAt)||!numeric(r.gross))throw Error('事件收入紀錄錯誤');last=r.earnedAt;}
    last=0;for(const r of saved.feeReceipts){if(!Number.isInteger(r.week)||r.week<=last||r.week>now||r.year!==yearOf(r.week)||!Number.isSafeInteger(r.rentDelta)||!Number.isSafeInteger(r.taxDelta))throw Error('事件場地費用紀錄錯誤');last=r.week;}
    for(const e of saved.effects){
      if(['lock','expense','income','foodAdd','specialBase','sellLand'].includes(e.kind)&&!numeric(e.value)||e.factor!==undefined&&(!Number.isFinite(e.factor)||e.factor<0)||e.set!==undefined&&(!Number.isFinite(e.set)||e.set<0||e.set>1))throw Error('事件效果數值錯誤');
      if(['closeHall','upgrade'].includes(e.kind)&&(!numeric(e.screenID)||!['VIP','IMAX','4DX'].includes(e.format)))throw Error('事件影廳紀錄錯誤');
      if(e.kind==='upgrade'&&(!Number.isInteger(e.readyAt)||e.readyAt<=e.start||e.end!==e.readyAt-1))throw Error('改裝期限錯誤');
      if(e.kind==='reissue'&&!['MV0504','MV0505'].includes(e.movieID))throw Error('重映片單錯誤');
    }
    if(saved.acknowledged.some(k=>!keys.has(k)))throw Error('事件確認紀錄錯誤');
    return structuredClone(saved);
  }
  function owner(state,property,week){return property.tenure==='owned'&&!state.effects.some(e=>e.kind==='sellLand'&&e.start<=week);}
  function live(ctx){return(ctx.movies?.history||[]).filter(h=>h.retiredAt==null);}
  const format=s=>s.name.replace(/\s*\([^)]*\)$/, '');
  function postShutdown(state,week){
    const previous=state.frames.findLast(f=>f.week===week-1);
    return previous?previous.shutdown:state.effects.some(e=>e.kind==='shutdown'&&active(e,week-1));
  }
  function eligible(event,state,ctx){
    if(postShutdown(state,ctx.week)&&!RECOVERY_EVENTS.includes(event.id))return false;
    if(ctx.week===1||event.enabled===false)return false;
    const now=ctx.week,year=yearOf(now),w=weekOf(now),c=event.condition,previous=state.frames.at(-1),prior=previous?.week===now-1?previous:null;
    const earlier=state.draws.filter(d=>d.id===event.id),last=earlier.at(-1);
    if(last?.week===now||!event.repeatable&&last||last&&now-last.week<(event.cooldown||0)||event.maxPerYear&&earlier.filter(d=>yearOf(d.week)===year).length>=event.maxPerYear)return false;
    if(state.effects.some(e=>e.source.startsWith(event.id+'/')&&e.end>=now))return false;
    if(c.years&&(year<c.years[0]||year>c.years[1])||c.weeks&&(w<c.weeks[0]||w>c.weeks[1])||c.calendar&&!c.calendar.some(([y,a,b])=>y===year&&w>=a&&w<=b)||c.cinemas&&!c.cinemas.includes(ctx.cinemaID))return false;
    if(c.activity&&ctx.property.activationType!==c.activity||c.fact&&!state.facts[c.fact]||c.anyFact&&!c.anyFact.some(k=>state.facts[k]))return false;
    if(c.owned!==undefined&&owner(state,ctx.property,now)!==c.owned||c.originalRented&&ctx.property.tenure!=='rented'||c.notTown&&ctx.property.locationID==='LOC08')return false;
    const halls=ctx.allocation.screenCount,screens=ctx.allocation.screens;
    if(c.normalSeats&&!screens.some(s=>s.type!=='EXTRA'&&!s.underConstructionUntil&&s.size>=c.normalSeats)||c.format&&!screens.some(s=>s.type==='EXTRA'&&format(s)===c.format))return false;
    if(c.annualLosses){for(let y=year-1;y>=year-c.annualLosses;y--)if(!(state.annualProfits[y]<0))return false;}
    if(c.closedWeeks){let count=0;for(let n=state.frames.length-1;n>=0&&state.frames[n].week===now-1-count&&state.frames[n].shutdown;n--)count++;if(count<c.closedWeeks)return false;}
    if(['staffBelow','maintenanceBelow','lastSpecial','lastPoster','foodAbove','productionCost','foodRatioAbove','foodRatioBelow','weeklyLosses'].some(k=>c[k]!==undefined)&&!prior)return false;
    if(c.staffBelow){const count=c.consecutive||1,recent=state.frames.slice(-count);if(recent.length<count||recent.some((f,i)=>f.week!==now-count+i||Number(f.values.staffing)>=(Number(f.halls)+1)*c.staffBelow))return false;}
    if(c.maintenanceBelow&&Number(prior.values.maintenance)>=prior.halls*c.maintenanceBelow||c.lastSpecial&&prior.specialSessions<1||c.lastPoster&&prior.values.posterEnabled!==true||c.foodAbove!==undefined&&Number(prior.values.foodCost)<=c.foodAbove)return false;
    if(c.productionCost&&!(Number(prior.values[c.productionCost+'Quantity'])*Number(prior.values[c.productionCost+'Price'])*(c.productionCost==='poster'?.1:.2)>2000))return false;
    if(c.foodRatioAbove!==undefined&&!(Number(prior.values.foodCost)>prior.averagePrice*prior.viewers*c.foodRatioAbove)||c.foodRatioBelow!==undefined&&!(Number(prior.values.foodCost)<prior.averagePrice*prior.viewers*c.foodRatioBelow))return false;
    if(c.weeklyLosses){const recent=state.frames.slice(-c.weeklyLosses);if(recent.length<c.weeklyLosses||recent.some((f,i)=>f.week!==now-c.weeklyLosses+i||f.profit>=0))return false;}
    // Film conditions also use the preceding operating week's actual lineup.
    const filmIDs=prior?.liveIDs||[],by=new Map(ctx.database.movies.map(m=>[m.id,m]));
    if(c.movies&&!c.movies.some(id=>filmIDs.includes(id))||c.allMovies&&!c.allMovies.every(id=>filmIDs.includes(id))||c.series&&!filmIDs.some(id=>by.get(id)?.seriesID===c.series)||c.titleContains&&!filmIDs.some(id=>by.get(id)?.title.includes(c.titleContains)))return false;
    return true;
  }
  function valueOf(value,ctx,field){
    if(value==='min')return Number(ctx.minimums?.[field]??0);
    if(value==='halls*100000')return ctx.allocation.screenCount*100000;
    if(typeof value==='string'&&/^hallsPlus1\*\d+$/.test(value))return(ctx.allocation.screenCount+1)*Number(value.split('*')[1]);
    if(!numeric(value))throw Error('事件金額設定錯誤');return value;
  }
  function materialize(definitions,draw,ctx){
    return definitions.map((definition,n)=>{
      const e={...structuredClone(definition),source:draw.key,start:draw.week+(definition.delay||0)};e.end=e.start+(definition.duration||1)-1;
      if(Object.hasOwn(e,'value')&&e.kind!=='fact')e.value=valueOf(e.value,ctx,e.field);
      if(e.kind==='upgrade'||e.kind==='closeHall'){
        const screens=ctx.allocation.screens.filter(s=>e.kind==='upgrade'?s.type!=='EXTRA'&&!s.underConstructionUntil&&s.size>=e.minSeats:s.type==='EXTRA'&&format(s)===e.format);
        if(!screens.length)throw Error('事件影廳條件已失效');const screen=screens[Math.floor(random(ctx.seed,`${draw.key}/hall/${n}`)*screens.length)];
        e.screenID=screen.eventScreenID??ctx.allocation.screens.indexOf(screen);
        if(e.kind==='upgrade'){e.readyAt=e.start;e.start=draw.week;e.end=e.readyAt-1;}
      }
      if(e.kind==='reissue')e.movieID=random(ctx.seed,draw.key+'/reissue')<.5?'MV0504':'MV0505';
      if(e.kind==='sellLand'){e.value=money(ctx.allocation.totalSeats*1000000*ctx.rent.locationCoefficient);e.rentAmount=root.CinemaRent.create({...ctx.property,tenure:'rented',rentalActive:true,realEstateTaxActive:false},ctx.allocation.totalSeats).amount;}
      if(e.kind==='raiseRent')e.factor=(110+Math.floor(random(ctx.seed,draw.key+'/rent')*11))/100;
      return e;
    });
  }
  function apply(draw,state,ctx,definitions){
    const effects=materialize(definitions,draw,ctx);state.effects.push(...effects);draw.applied=true;
    for(const e of effects)if(e.kind==='fact')state.facts[e.name]=e.value;
  }
  function staffingFollowUp(state,week){
    const last=state.draws.findLast(d=>d.id==='eb002'&&d.applied);
    return !!last&&last.choice==='2'&&last.week<week;
  }
  function begin(state,ctx,database){
    if(ctx.week===1){
      const removed=new Set(state.draws.filter(d=>d.week===1).map(d=>d.key));
      return{...state,throughWeek:1,draws:state.draws.filter(d=>d.week!==1),effects:state.effects.filter(e=>!removed.has(e.source)),facts:{},acknowledged:state.acknowledged.filter(key=>!removed.has(key))};
    }
    const stale=state.draws.find(d=>d.week===ctx.week);
    const recovery=postShutdown(state,ctx.week);
    if((recovery||staffingFollowUp(state,ctx.week))&&stale&&!(recovery?RECOVERY_EVENTS:['eb002','ef002']).includes(stale.id)&&stale.choice===null&&!state.acknowledged.includes(stale.key)){
      const remaining=state.effects.filter(e=>e.source!==stale.key),facts={};for(const e of remaining)if(e.kind==='fact')facts[e.name]=e.value;
      state={...state,draws:state.draws.filter(d=>d.key!==stale.key),effects:remaining,facts,throughWeek:ctx.week-1};
    }
    if(state.draws.some(d=>d.week===ctx.week)||state.throughWeek>=ctx.week)return state;
    const next=structuredClone(state);let candidates=database.events.filter(e=>eligible(e,state,ctx));next.throughWeek=ctx.week;
    if(!recovery&&staffingFollowUp(state,ctx.week)){
      const staffing=database.events.find(e=>e.id==='eb002'&&e.enabled!==false);
      // Keep mandatory staffing decisions from being replaced by unrelated
      // weekly news. An eligible board dissolution still shares this slot.
      if(staffing)candidates=[staffing,...candidates.filter(e=>e.id==='ef002')];
    }
    if(!candidates.length)return next;
    const total=candidates.reduce((sum,e)=>sum+e.weight,0),needle=random(ctx.seed,`draw/${ctx.week}`)*total;let sum=0;
    const event=candidates.find(e=>(sum+=e.weight)>needle)||candidates.at(-1);
    const draw={id:event.id,key:`${event.id}/${ctx.week}`,week:ctx.week,message:event.message,choice:null,applied:false,choices:structuredClone(event.choices||[]),effects:structuredClone(event.effects)};
    next.draws.push(draw);if(!draw.choices.length)apply(draw,next,ctx,draw.effects);return next;
  }
  function decide(state,ctx,eventID,choiceID){
    const next=structuredClone(state),d=next.draws.find(d=>d.key===eventID&&d.week===ctx.week);if(!d)throw Error('本週事件不存在');
    if(d.applied){if(d.choice===choiceID)return state;throw Error('事件已完成決策');}
    const choice=d.choices.find(c=>c.id===choiceID);if(!choice)throw Error('事件選項不存在');d.choice=choiceID;apply(d,next,ctx,choice.effects);return next;
  }
  function notice(state,week){const d=state.draws.find(d=>d.week===week);if(!d||state.acknowledged.includes(d.key)||postShutdown(state,week)&&!RECOVERY_EVENTS.includes(d.id))return[];return[{id:d.key,title:'本週大事',message:d.message,choices:d.applied?[]:d.choices.map(c=>({id:c.id,label:c.label}))}];}
  function acknowledge(state,key){if(state.acknowledged.includes(key))return state;const d=state.draws.find(d=>d.key===key);if(!d?.applied)throw Error('請先完成事件決策');return{...state,acknowledged:[...state.acknowledged,key]};}
  function pending(state,week){return notice(state,week).length>0;}
  function effects(state,week){return state.effects.filter(e=>active(e,week));}
  function settings(state,week){
    const list=effects(state,week),locks={},expenses={personnel:0,goods:0,maintenance:0,marketing:0,other:0};
    for(const e of list){if(e.kind==='lock')locks[e.field]=e.value;if(e.kind==='expense')expenses[e.field]+=e.value;}
    return{locks,expenses,shutdown:list.some(e=>e.kind==='shutdown'),foodZero:list.some(e=>['foodZero','shutdown'].includes(e.kind)),foodAdd:list.filter(e=>e.kind==='foodAdd').reduce((n,e)=>n+e.value,0),foodFactor:list.filter(e=>e.kind==='foodFactor').reduce((n,e)=>n*e.factor,1),spaceZero:list.some(e=>['spaceZero','shutdown'].includes(e.kind)),specialBase:list.findLast(e=>e.kind==='specialBase')?.value};
  }
  function attendance(state,week,movie,featured,rate){
    if(movie.tier==='special')return{rate,zero:false};let zero=false;
    for(const e of effects(state,week).filter(e=>e.kind==='attendance')){
      if(e.scope==='featured'&&!featured||e.scope==='average'&&movie.tier!=='average'||e.scope==='ghost'&&!movie.title.includes('鬼')||e.movies&&!e.movies.includes(movie.id)||e.series&&movie.seriesID!==e.series)continue;
      rate=e.set!==undefined?e.set:rate*e.factor;if(e.set===0)zero=true;
    }return{rate:Math.max(0,Math.min(1,rate)),zero};
  }
  function regularFactor(state,week){return effects(state,week).filter(e=>e.kind==='regularGross').reduce((n,e)=>n*e.factor,1);}
  function ticketZero(state,week){return effects(state,week).some(e=>e.kind==='ticketZero');}
  function project(base,state,week){
    let screens=base.screens.map((s,i)=>({...s,eventScreenID:i}));
    for(const e of state.effects){
      if(e.kind==='closeHall'&&week>=e.start)screens=screens.filter(s=>s.eventScreenID!==e.screenID);
      if(e.kind==='upgrade'&&week>=e.start){const s=screens.find(s=>s.eventScreenID===e.screenID);if(!s)continue;if(week<e.readyAt)s.underConstructionUntil=e.readyAt;else{delete s.underConstructionUntil;s.type='EXTRA';s.name=e.format;}}
    }
    const counts={...Object.fromEntries(Object.keys(base.counts).map(k=>[k,0]))};for(const s of screens)counts[s.type]=(counts[s.type]||0)+1;
    return{...base,screens,screenCount:screens.length,totalSeats:screens.reduce((n,s)=>n+s.size,0),counts};
  }
  function reissue(movies,state,week){
    const e=state.effects.find(e=>e.kind==='reissue'&&e.start===week);if(!e||movies.current.includes(e.movieID))return movies;
    const next=structuredClone(movies),replace=next.current[0];
    if(replace)next.history=next.history.filter(h=>h.id!==replace||h.releasedAt!==week);
    next.history=next.history.filter(h=>h.id!==e.movieID);next.history.push({id:e.movieID,releasedAt:week,initial:false,retiredAt:null,reissued:true});
    next.current=next.current.length?[e.movieID,...next.current.slice(1)]:[e.movieID];return next;
  }
  function finish(state,ctx){
    if(state.frames.some(f=>f.week===ctx.week))throw Error('事件週次已結算');
    const next=structuredClone(state),s=settings(state,ctx.week),food=ctx.foodReceipt;
    const values=Object.fromEntries(['staffing','maintenance','foodCost','posterEnabled','posterQuantity','posterPrice','figureQuantity','figurePrice'].map(k=>[k,ctx.values[k]??(k==='posterEnabled'?false:'0')]));
    if(ctx.merchandiseReceipt)for(const kind of ['poster','figure'])values[kind+'Quantity']=String(ctx.merchandiseReceipt.items[kind].produced);
    next.frames.push({week:ctx.week,halls:ctx.halls,values,viewers:food.viewers,averagePrice:food.averagePrice,profit:ctx.profit,specialSessions:ctx.ticketReceipt.specialSessionCount,liveIDs:ctx.ticketReceipt.films.filter(f=>!f.forcedOff).map(f=>f.id),shutdown:s.shutdown||ctx.halls===0});next.frames=next.frames.slice(-8);
    const gross=s.shutdown?0:effects(state,ctx.week).filter(e=>e.kind==='income'||e.kind==='sellLand').reduce((n,e)=>n+e.value,0);
    next.receipts.push({earnedAt:ctx.week,bookedAt:ctx.week+1,accountingYear:yearOf(ctx.week),gross});return next;
  }
  function closeYear(state,year,profit){if(!Number.isSafeInteger(profit))throw Error('年度事件損益錯誤');return{...state,annualProfits:{...state.annualProfits,[year]:profit}};}
  function ending(state,week){return state.effects.some(e=>e.kind==='end'&&e.start<=week);}
  function billing(state,week,rent,tax){
    if(state.feeReceipts.some(r=>r.week===week))return state;
    const sale=state.effects.find(e=>e.kind==='sellLand'&&e.start<week),raises=state.effects.filter(e=>e.kind==='raiseRent'&&e.start<week);
    const oldRent=(rent?.receipts||[]).filter(r=>r.week===week).reduce((n,r)=>n+r.amount,0),oldTax=(tax?.receipts||[]).filter(r=>r.week===week).reduce((n,r)=>n+r.amount,0);
    const base=sale?(week%4===0?sale.rentAmount:0):oldRent;
    const increased=raises.reduce((n,e)=>Math.round(n*e.factor/10000)*10000,base),rentDelta=increased-oldRent,taxDelta=sale?-oldTax:0;
    return{...state,feeReceipts:[...state.feeReceipts,{week,year:yearOf(week),rentDelta,taxDelta}]};
  }
  function totals(state,now,year){const result={weekly:0,annual:0,premisesWeekly:0,premisesAnnual:0};for(const r of state?.receipts||[])if(r.accountingYear===year){result.annual+=r.gross;if(r.bookedAt===now)result.weekly+=r.gross;}for(const r of state?.feeReceipts||[])if(r.year===year){result.premisesAnnual+=r.rentDelta+r.taxDelta;if(r.week===now)result.premisesWeekly+=r.rentDelta+r.taxDelta;}return result;}
  const api={RECOVERY_EVENTS,create,resolve,postShutdown,eligible,owner,staffingFollowUp,begin,decide,notice,acknowledge,pending,effects,settings,attendance,regularFactor,ticketZero,project,reissue,finish,closeYear,ending,billing,totals};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaEventRules=api;
})(globalThis);
