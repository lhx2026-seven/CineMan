'use strict';
(function(root){
  const yearOf=week=>2022+Math.floor((week-1)/50);
  const money=value=>Math.round(value+Number.EPSILON*Math.max(1,Math.abs(value))*4);
  function draw(seed,key,rule){
    if(!rule||!Number.isFinite(rule.min)||!Number.isFinite(rule.max)||!(rule.step>0))throw Error('片商參數不完整');
    const count=Math.round(Math.abs(rule.max-rule.min)/rule.step)+1;
    const index=Math.floor(root.CinemaRules.seededRandom(`distributor/v1/${seed}/${key}`)()*count);
    return Number((rule.min+Math.sign(rule.max-rule.min)*index*rule.step).toFixed(8));
  }
  function contract(movie,cinemaID,seed){
    const rules=root.CinemaParameters.DATA.compute,key=movie.id;
    if(movie.tier==='special')return{id:key,tier:movie.tier,share:0,guarantee:0,rental:0};
    if(!['hit','bomb','average'].includes(movie.tier))throw Error('電影拆帳分類錯誤');
    if(cinemaID==='C02')return{id:key,tier:movie.tier,share:0,guarantee:0,rental:draw(seed,key+'/rental',rules[`second_run_${movie.tier}_film_pay`])};
    return{id:key,tier:movie.tier,share:draw(seed,key+'/share',rules[`${movie.tier}_film_distributor_share`])*(cinemaID==='C05'?.5:1),guarantee:movie.tier==='bomb'&&cinemaID!=='C05'?draw(seed,key+'/guarantee',rules.bomb_film_distributor_guarantee):0,rental:0};
  }
  function create(cinemaID,seed){return{version:1,cinemaID,seed,lastGrossWeek:null,contracts:{},receipts:[]};}
  function sync(saved,{database,movies,boxOffice,cinemaID,now,year}){
    const old=saved||create(cinemaID,movies.seed);
    const state={...old,contracts:{...old.contracts},receipts:[...old.receipts]};
    const byID=new Map(database.movies.map(m=>[m.id,m]));
    const featuredIDs=new Set(boxOffice.receipts.map(r=>r.featuredID).filter(Boolean));
    const append=(type,filmID,at,accountingYear,gross,deduction)=>state.receipts.push({type,filmID,at,accountingYear,gross,deduction,net:gross+deduction});
    for(const h of movies.history){
      if(!state.contracts[h.id])state.contracts[h.id]={...contract(byID.get(h.id),cinemaID,movies.seed),releasedAt:h.releasedAt,rentalPaid:false,closedAt:null,paidShare:0};
      const c={...state.contracts[h.id]};if(h.reissued&&c.tier==='special'&&c.releasedAt!==h.releasedAt){c.releasedAt=h.releasedAt;c.closedAt=null;}state.contracts[h.id]=c;
      if(!c.rentalPaid){
        if(c.rental)append('rental',h.id,h.releasedAt,yearOf(h.releasedAt),0,c.rental);
        c.rentalPaid=true;
      }
    }
    for(const r of boxOffice.receipts){
      if(r.earnedAt<=(old.lastGrossWeek||0))continue;
      for(const f of r.films){
        const c=state.contracts[f.id];if(!c)throw Error('電影拆帳合約遺失');
        const deduction=-money(f.gross*Math.abs(c.share))||0;
        append('gross',f.id,r.bookedAt,r.accountingYear??yearOf(r.bookedAt),f.gross,deduction);
        c.paidShare+=deduction;
      }
      state.lastGrossWeek=r.earnedAt;
    }
    for(const h of movies.history){
      const c=state.contracts[h.id];
      if(h.retiredAt==null||c.closedAt!==null)continue;
      if(c.guarantee&&featuredIDs.has(h.id)){
        const deduction=Math.min(0,c.guarantee-c.paidShare);
        // New retirements post when observed; legacy migration reconstructs the
        // historical retirement date without changing gross receipts.
        const at=saved?now:h.retiredAt,accountingYear=saved?year:yearOf(at);
        if(deduction)append('guarantee',h.id,at,accountingYear,0,deduction);
      }
      c.closedAt=h.retiredAt;
    }
    if(state.receipts.some(r=>r.at>now||r.accountingYear>year))throw Error('拆帳入帳日期超前');
    return state;
  }
  function totals(state,now,year=yearOf(now)){
    let weekly=0,annual=0;for(const r of state?.receipts||[])if(r.accountingYear===year){annual+=r.net;if(r.at===now)weekly+=r.net;}
    return{weekly,annual};
  }
  function resolve(saved,cinemaID,seed,now){
    if(saved==null)return null;
    if(saved.version!==1||saved.cinemaID!==cinemaID||saved.seed!==seed||!saved.contracts||!Array.isArray(saved.receipts)||saved.lastGrossWeek!==null&&(!Number.isInteger(saved.lastGrossWeek)||saved.lastGrossWeek>=now))throw Error('拆帳存檔錯誤');
    const seen=new Set(),shares={};
    for(const r of saved.receipts){
      const key=`${r.type}/${r.filmID}/${r.at}`;
      if(seen.has(key)||!['gross','rental','guarantee'].includes(r.type)||!saved.contracts[r.filmID]||!Number.isInteger(r.at)||r.at<1||r.at>now||!Number.isInteger(r.accountingYear)||![yearOf(r.at),yearOf(r.at)-1].includes(r.accountingYear)||!Number.isSafeInteger(r.gross)||r.gross<0||!Number.isSafeInteger(r.deduction)||r.deduction>0||r.net!==r.gross+r.deduction)throw Error('拆帳收據錯誤');
      seen.add(key);if(r.type==='gross')shares[r.filmID]=(shares[r.filmID]||0)+r.deduction;
    }
    for(const [id,c]of Object.entries(saved.contracts))if(c.id!==id||!['hit','bomb','average','special'].includes(c.tier)||!Number.isFinite(c.share)||c.share>0||c.share< -1||!Number.isSafeInteger(c.guarantee)||c.guarantee>0||!Number.isSafeInteger(c.rental)||c.rental>0||!Number.isInteger(c.releasedAt)||c.releasedAt<1||c.releasedAt>now||typeof c.rentalPaid!=='boolean'||c.closedAt!==null&&(!Number.isInteger(c.closedAt)||c.closedAt<c.releasedAt||c.closedAt>now)||c.paidShare!==(shares[id]||0))throw Error('片商合約存檔錯誤');
    return saved;
  }
  const api={draw,contract,create,sync,totals,resolve};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaDistributor=api;
})(globalThis);
