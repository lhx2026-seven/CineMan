'use strict';
(function(root){
  const MONTHLY=['mall','claw','billboard'];
  const round=n=>Math.round(n+Number.EPSILON*Math.max(1,Math.abs(n))*4);
  const activity=kind=>{const a=root.CinemaProperty.ACTIVITIES[kind];if(!a)throw Error('空間活化類型錯誤');return a;};
  function validRate(kind,rate){const a=activity(kind);return Number.isFinite(rate)&&rate>=a.min&&rate<=a.max&&Math.abs((rate-a.min)/a.step-Math.round((rate-a.min)/a.step))<1e-8;}
  function create(kind,rate,now){if(!validRate(kind,rate))throw Error('空間活化定價錯誤');return{version:1,kind,rate,lastChangedAt:now,nextMonthlyAt:now+4,lastSettledAt:now-1,receipts:[]};}
  function resolve(saved,kind,rate,now){
    if(saved===undefined||saved===null)return create(kind,rate,now);
    if(saved.version!==1||saved.kind!==kind||!validRate(kind,saved.rate)||!Number.isInteger(saved.lastChangedAt)||saved.lastChangedAt<1||saved.lastChangedAt>now||!Number.isInteger(saved.nextMonthlyAt)||saved.nextMonthlyAt<saved.lastChangedAt+4||!Number.isInteger(saved.lastSettledAt)||saved.lastSettledAt<saved.lastChangedAt-1||saved.lastSettledAt!==now-1||!Array.isArray(saved.receipts))throw Error('空間收入存檔錯誤');
    let last=0;for(const r of saved.receipts){
      if(r.accountingYear!==undefined&&(r.earnedAt%50!==0||r.accountingYear!==2022+Math.floor((r.earnedAt-1)/50)))throw Error('收入年度歸屬錯誤');if(!Number.isInteger(r.bookedAt)||r.bookedAt<=last||r.bookedAt>now||!Number.isSafeInteger(r.gross)||r.gross<0||typeof r.zeroDemand!=='boolean'||!validRate(kind,r.rate))throw Error('空間收入紀錄錯誤');last=r.bookedAt;}
    return structuredClone(saved);
  }
  function editable(state,now){return now===state.lastChangedAt||now>=state.lastChangedAt+4;}
  function change(state,rate,now){
    if(!validRate(state.kind,rate))throw Error('空間活化定價錯誤');
    if(rate===state.rate)return state;
    if(!editable(state,now))throw Error('空間活化定價尚未滿四週');
    return{...state,rate,lastChangedAt:now,nextMonthlyAt:now+4};
  }
  function advance(state,earnedAt,dailyViewers,seed,accountingYear){
    if(!Number.isInteger(earnedAt)||earnedAt!==state.lastSettledAt+1||!Number.isInteger(dailyViewers)||dailyViewers<0)throw Error('空間收入結算週次錯誤');
    const next=structuredClone(state),bookedAt=earnedAt+1;next.lastSettledAt=earnedAt;
    const monthly=MONTHLY.includes(state.kind);
    if(monthly&&bookedAt<state.nextMonthlyAt)return next;
    if(monthly&&bookedAt!==state.nextMonthlyAt)throw Error('空間收入入帳週次錯誤');
    const a=activity(state.kind),high=state.rate>(a.min+a.max)/2;
    const zeroDemand=high&&root.CinemaRules.seededRandom(`activation/v1/${seed}/${state.kind}/${bookedAt}`)()<.5;
    const base=state.kind==='billboard'?state.rate*1296000:state.kind==='parking'?state.rate*2*dailyViewers*3*.5:state.kind==='hotel'?state.rate*4*2:state.rate;
    next.receipts.push({earnedAt,bookedAt,rate:state.rate,dailyViewers,zeroDemand,gross:zeroDemand?0:round(base),...(accountingYear!==undefined?{accountingYear}:{})});
    if(monthly)next.nextMonthlyAt+=4;
    return next;
  }
  function totals(state,now,year=2022+Math.floor((now-1)/50)){return{weekly:state.receipts.filter(r=>r.bookedAt===now&&(r.accountingYear??(2022+Math.floor((r.bookedAt-1)/50)))===year).reduce((s,r)=>s+r.gross,0),annual:state.receipts.filter(r=>(r.accountingYear??(2022+Math.floor((r.bookedAt-1)/50)))===year).reduce((s,r)=>s+r.gross,0)};}
  const api={MONTHLY,create,resolve,editable,change,advance,totals};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaActivation=api;
})(globalThis);
