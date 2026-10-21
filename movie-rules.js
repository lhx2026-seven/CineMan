'use strict';
(function(root){
  const WEEKS_PER_YEAR=50;
  const POOLS=[['average','special'],['hit','bomb','special']];
  const eventText='地產商原有意收購戲院土地，但影迷熱情發動連署，戲院所有人決定拒絕與地產商簽約';
  const indexes=new WeakMap(),plans=new Map();
  const index=database=>{if(!indexes.has(database))indexes.set(database,new Map(database.movies.map(m=>[m.id,m])));return indexes.get(database);};
  const random=(seed,key)=>root.CinemaRules.seededRandom(`movies/v1/${seed}/${key}`);
  const integer=(seed,key,min,max)=>min+Math.floor(random(seed,key)()*(max-min+1));
  function absoluteWeek(year,week){if(!Number.isInteger(year)||!Number.isInteger(week)||week<1||week>WEEKS_PER_YEAR)throw Error('Invalid movie calendar');return(year-2022)*WEEKS_PER_YEAR+week;}
  function reservations(database,seed){
    const cacheKey=seed; if(plans.has(cacheKey)&&plans.get(cacheKey).database===database)return plans.get(cacheKey).result;
    const used=new Set(),result={};
    for(const m of database.movies.filter(m=>!m.initial&&m.releaseYear)){
      const slots=[];for(let w=1;w<=WEEKS_PER_YEAR;w++)for(let p=0;p<2;p++)if(POOLS[p].includes(m.tier)&&!used.has(`${m.releaseYear}/${w}/${p}`))slots.push({year:m.releaseYear,week:w,pool:p});
      if(!slots.length)throw Error('Mandatory release capacity exceeded');
      const slot=slots[integer(seed,`reservation/${m.id}`,0,slots.length-1)];used.add(`${slot.year}/${slot.week}/${slot.pool}`);result[m.id]=slot;
    }if(plans.size>=100)plans.clear();plans.set(cacheKey,{database,result});return result;
  }
  function create(seed,screenCount){return{version:1,weeksPerYear:WEEKS_PER_YEAR,seed,history:screenCount===1?[]:['MV0001','MV0002','MV0003'].map(id=>({id,releasedAt:1,initial:true})),current:[],lastWeek:0};}
  function eligible(movie,state,year,week,database){
    if(movie.initial||state.history.some(h=>h.id===movie.id)||movie.releaseYear&&movie.releaseYear!==year)return false;
    const now=absoluteWeek(year,week),by=index(database);
    if(movie.previousID){const prev=state.history.find(h=>h.id===movie.previousID);if(!prev)return false;const gap=integer(state.seed,`gap/${prev.id}/${movie.id}/${prev.releasedAt}`,movie.gapMin,movie.gapMax);if(now-prev.releasedAt<gap)return false;}
    if(movie.seriesID){
      const same=state.history.filter(h=>by.get(h.id)?.seriesID===movie.seriesID);
      const last=same.length?Math.max(...same.map(h=>h.releasedAt)):null;
      const gap=movie.seriesGap || (!movie.previousID&&movie.gapMin!==null&&last!==null?integer(state.seed,`series/${movie.seriesID}/${last}`,movie.gapMin,movie.gapMax):0);
      if(last!==null&&now-last<gap)return false;
      // Keep an optional franchise release from blocking a mandatory upcoming one.
      if(movie.seriesGap){const plan=reservations(database,state.seed);for(const other of database.movies){if(other.id===movie.id||other.seriesID!==movie.seriesID||state.history.some(h=>h.id===other.id)||!plan[other.id])continue;const slot=plan[other.id],distance=absoluteWeek(slot.year,slot.week)-now;if(distance>=0&&distance<movie.seriesGap)return false;}}
    }return true;
  }
  function releaseWeek(database,state,year,week){
    const now=absoluteWeek(year,week);
    if(state.lastWeek===now)return state;
    if(now!==state.lastWeek+1)throw Error('Release weeks must advance sequentially');
    const next=structuredClone(state),plan=reservations(database,state.seed),pair=[];
    const due=database.movies.filter(m=>!m.initial&&plan[m.id]?.year===year&&plan[m.id]?.week<=week&&!next.history.some(h=>h.id===m.id));
    for(let pool=0;pool<2;pool++){
      const mandatory=due.find(m=>plan[m.id].pool===pool);
      let candidates=database.movies.filter(m=>POOLS[pool].includes(m.tier)&&eligible(m,next,year,week,database)&&!due.some(d=>d.id===m.id&&plan[d.id].pool!==pool));
      if(mandatory){if(!candidates.some(m=>m.id===mandatory.id))throw Error(`Mandatory film blocked: ${mandatory.id}`);candidates=[mandatory];}
      if(!candidates.length)continue;
      const movie=candidates[integer(state.seed,`draw/${now}/${pool}`,0,candidates.length-1)];
      next.history.push({id:movie.id,releasedAt:now,initial:false});pair.push(movie.id);
    }next.current=pair;next.lastWeek=now;return next;
  }
  function attendance(movie,record,now,seed){
    const age=now-record.releasedAt+1;if(age<1)throw Error('Movie has not opened');
    if(record.initial)return movie.id==='MV0003'?.1:.5;
    if(movie.id==='MV0503')return[.5,.7,.9,.99][age-1]??.5;
    if(movie.id==='MV0504'||movie.id==='MV0505')return age<=4?1:age<=8?(movie.id==='MV0504'?.9:.8):age<=12?(movie.id==='MV0504'?.5:.6):.01;
    const range={hit:[50,100],bomb:[1,10],average:[1,50]}[movie.tier];if(!range)throw Error('Missing attendance profile');
    const base=integer(seed,`attendance/${movie.id}/${record.releasedAt}`,range[0],range[1])/100;
    if(age===1)return base;if(age>=5)return .01;
    const limits={2:[0,50],3:[50,75],4:[50,99]}[age];return base*(1-integer(seed,`decline/${movie.id}/${now}`,limits[0],limits[1])/100);
  }
  function retirement(movie,record,now,seed){
    const age=now-record.releasedAt+1;
    if(record.initial&&movie.id==='MV0003')return now>=2;
    const threshold=record.initial?3:['MV0504','MV0505'].includes(movie.id)?13:5;
    if((record.initial?now:age)<threshold)return false;
    return random(seed,`retire/${movie.id}/${now}`)()<(movie.id==='MV0503'?.5:.9);
  }
  function eventsFor(state,now){return state.history.some(h=>h.id==='MV0503'&&now-h.releasedAt+1===4)?[{id:'MV0503-week4',title:'影迷守護戲院',message:eventText}]:[];}
  function resolve(database,seed,screenCount,year,week,saved){
    const now=absoluteWeek(year,week),by=index(database);
    if(saved!==undefined){
      if(saved?.version===1 && saved.weeksPerYear===undefined && Array.isArray(saved.history)){
        // Previous builds used 52-week absolute dates. Preserve the actual films
        // and order; fold the old year's final two weeks into its new W50.
        const convert=n=>Number.isInteger(n)&&n>=1?Math.floor((n-1)/52)*WEEKS_PER_YEAR+Math.min((n-1)%52+1,WEEKS_PER_YEAR):n;
        saved={...saved,weeksPerYear:WEEKS_PER_YEAR,lastWeek:convert(saved.lastWeek),history:saved.history.map(h=>({...h,releasedAt:convert(h.releasedAt)}))};
      }
      if(saved?.version!==1||saved.weeksPerYear!==WEEKS_PER_YEAR||saved.seed!==seed||saved.lastWeek!==now||!Array.isArray(saved.history)||!Array.isArray(saved.current)||saved.current.length>2||new Set(saved.current).size!==saved.current.length||new Set(saved.history.map(h=>h.id)).size!==saved.history.length||saved.history.some(h=>!by.has(h.id)||h.initial!==by.get(h.id).initial||!Number.isInteger(h.releasedAt)||h.releasedAt<1||h.releasedAt>now)||saved.current.some(id=>!saved.history.some(h=>h.id===id&&h.releasedAt===now)))throw Error('Movie save is incompatible');return saved;}
    let state=create(seed,screenCount);for(let n=1;n<=now;n++)state=releaseWeek(database,state,2022+Math.floor((n-1)/WEEKS_PER_YEAR),(n-1)%WEEKS_PER_YEAR+1);return state;
  }
  const api={WEEKS_PER_YEAR,POOLS,absoluteWeek,reservations,create,eligible,releaseWeek,attendance,retirement,eventsFor,resolve};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaMovieRules=api;
})(globalThis);
