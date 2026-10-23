'use strict';
(function(root){
  const KINDS=['poster','figure'],integer=n=>Number.isSafeInteger(n)&&n>=0;
  function create(){return{version:1,lastSettledWeek:null,stock:{poster:0,figure:0},receipts:[]};}
  function calculate(kind,available,price,viewers,expired=false){
    if(!KINDS.includes(kind)||!integer(available)||!integer(viewers)||!integer(price)||price>(kind==='poster'?1000:10000))throw Error('周邊銷售參數錯誤');
    const percent=expired?0:kind==='poster'?(price<=100?100:price<=300?90:price<=500?70:50):(available<10?100:price<=500?100:price<=1000?90:price<=3000?50:10);
    const sold=Math.min(available,viewers,Math.round(available*percent/100)),gross=sold*price;if(!integer(gross))throw Error('周邊收入超出範圍');
    return{percent,sold,remaining:available-sold,gross};
  }
  // Old receipts retain their posted totals. Reconstruct their remaining batches
  // using FIFO, then apply batch expiry only to new settlements.
  function legacyBatches(batches,item,week){
    const next=item.scrap?[]:batches.map(b=>({...b}));
    if(item.produced)next.push({producedAt:week,remaining:item.produced});
    let sold=item.sold;for(const b of next){const count=Math.min(sold,b.remaining);b.remaining-=count;sold-=count;}
    return next.filter(b=>b.remaining>0);
  }
  function batchSale(kind,batches,produced,price,viewers,week,scrap){
    const next=scrap?[]:batches.map(b=>({...b}));
    if(produced)next.push({producedAt:week,remaining:produced});
    const available=next.reduce((sum,b)=>sum+b.remaining,0);
    const sellable=next.filter(b=>week-b.producedAt<4).reduce((sum,b)=>sum+b.remaining,0);
    const sale=calculate(kind,sellable,price,viewers,sellable===0);
    let sold=sale.sold;for(const b of next){if(week-b.producedAt>=4)continue;const count=Math.min(sold,b.remaining);b.remaining-=count;sold-=count;}
    // Expired stock has identical behavior forever. Keep one bucket rather than
    // copying every old batch into each later weekly receipt.
    const remaining=next.filter(b=>b.remaining>0),expired=remaining.filter(b=>week-b.producedAt>=4);
    const compact=remaining.filter(b=>week-b.producedAt<4);
    if(expired.length)compact.unshift({producedAt:expired[0].producedAt,remaining:expired.reduce((sum,b)=>sum+b.remaining,0)});
    return{...sale,available,remaining:available-sale.sold,batches:compact};
  }
  function inventoryBatches(state,kind){
    const last=state.receipts.at(-1)?.items[kind];
    if(last?.salesVersion===2)return last.batches;
    let batches=[];for(const r of state.receipts)batches=legacyBatches(batches,r.items[kind],r.earnedAt);
    return batches;
  }
  function resolve(saved,now){
    if(saved==null)return create();
    if(saved.version!==1||!Array.isArray(saved.receipts)||!saved.stock)throw Error('周邊庫存存檔錯誤');
    let previous=0;const stock={poster:0,figure:0},starts={poster:null,figure:null},batches={poster:[],figure:[]};
    for(const r of saved.receipts){
      if(r.accountingYear!==undefined&&(r.earnedAt%50!==0||r.accountingYear!==2022+Math.floor((r.earnedAt-1)/50)))throw Error('收入年度歸屬錯誤');
      if(!Number.isInteger(r.earnedAt)||r.earnedAt<=previous||r.bookedAt!==r.earnedAt+1||r.bookedAt>now||!integer(r.viewers)||!r.items)throw Error('周邊收入週次錯誤');
      let total=0;
      for(const kind of KINDS){
        const i=r.items[kind];
        if(!i||typeof i.enabled!=='boolean'||typeof i.scrap!=='boolean'||!integer(i.produced)||!integer(i.discarded)||i.opening!==stock[kind]||i.discarded!==(i.scrap?stock[kind]:0)||!i.enabled&&i.produced!==0)throw Error('周邊庫存紀錄錯誤');
        if(i.enabled&&starts[kind]===null)starts[kind]=r.earnedAt;
        let sale;
        if(i.salesVersion===2){
          sale=batchSale(kind,batches[kind],i.produced,i.price,i.enabled?r.viewers:0,r.earnedAt,i.scrap);
          if(!Array.isArray(i.batches)||i.batches.length!==sale.batches.length||i.batches.some((b,n)=>b.producedAt!==sale.batches[n].producedAt||b.remaining!==sale.batches[n].remaining))throw Error('周邊批次庫存錯誤');
          batches[kind]=sale.batches;
        }else{
          if(i.salesVersion!==undefined||i.saleStartedAt!==undefined&&i.saleStartedAt!==starts[kind])throw Error('周邊開賣週次錯誤');
          const available=stock[kind]-i.discarded+i.produced;
          sale={...calculate(kind,available,i.price,i.enabled?r.viewers:0,i.saleStartedAt!=null&&r.earnedAt-i.saleStartedAt>=4),available};
          batches[kind]=legacyBatches(batches[kind],i,r.earnedAt);
        }
        if(i.available!==sale.available||i.sold!==sale.sold||i.remaining!==sale.remaining||i.gross!==sale.gross||i.percent!==sale.percent)throw Error('周邊銷量紀錄錯誤');
        stock[kind]=i.remaining;total+=i.gross;
      }
      if(r.total!==total)throw Error('周邊收入合計錯誤');previous=r.earnedAt;
    }
    if(saved.lastSettledWeek!==(previous||null)||KINDS.some(k=>saved.stock[k]!==stock[k]))throw Error('剩餘庫存合計錯誤');return structuredClone(saved);
  }
  function advance(state,ticketReceipt,values){
    const now=ticketReceipt.earnedAt;if(!Number.isInteger(now)||now<1||ticketReceipt.bookedAt!==now+1||state.lastSettledWeek!==null&&now!==state.lastSettledWeek+1)throw Error('周邊收入重複或錯週結算');
    const viewers=ticketReceipt.films.reduce((sum,f)=>{if(!integer(f.dailyViewers)||!integer(f.specialViewers))throw Error('周邊觀影人次錯誤');return sum+f.dailyViewers*3+f.specialViewers;},0),items={},stock={};let total=0;
    for(const kind of KINDS){
      const opening=state.stock[kind],enabled=values[kind+'Enabled']===true,scrap=values[kind+'Scrap']===true,discarded=scrap?opening:0,produced=enabled?Number(values[kind+'Quantity']):0,price=Number(values[kind+'Price']??0);if(!integer(produced))throw Error('周邊追加量須為非負整數');
      const sale=batchSale(kind,inventoryBatches(state,kind),produced,price,enabled?viewers:0,now,scrap);
      stock[kind]=sale.remaining;total+=sale.gross;items[kind]={enabled,scrap,salesVersion:2,opening,discarded,produced,price,...sale};
    }
    return{version:1,lastSettledWeek:now,stock,receipts:[...state.receipts,{earnedAt:now,bookedAt:now+1,viewers,items,total,...(ticketReceipt.accountingYear!==undefined?{accountingYear:ticketReceipt.accountingYear}:{})}]};
  }
  function totals(state,now,year=2022+Math.floor((now-1)/50)){return{weekly:(state?.receipts||[]).filter(r=>r.bookedAt===now&&(r.accountingYear??(2022+Math.floor((r.bookedAt-1)/50)))===year).reduce((s,r)=>s+r.total,0),annual:(state?.receipts||[]).filter(r=>(r.accountingYear??(2022+Math.floor((r.bookedAt-1)/50)))===year).reduce((s,r)=>s+r.total,0)};}
  const api={KINDS,create,calculate,resolve,advance,totals};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaMerchandise=api;
})(globalThis);
