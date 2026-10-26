'use strict';
(function(root){
  const INCOME=['ticket','food','merchandise','other'];
  const EXPENSES=['personnel','goods','maintenance','marketing','other','utilities','premises'];
  function calculate(income,expenses){
    const sum=(values,keys)=>keys.reduce((n,k)=>{const value=values[k]??0;if(!Number.isSafeInteger(value))throw Error('財報合計資料錯誤');return n+value;},0);
    const revenue=sum(income,INCOME),cost=sum(expenses,EXPENSES);
    if(!Number.isSafeInteger(revenue)||!Number.isSafeInteger(cost)||!Number.isSafeInteger(revenue-cost))throw Error('財報合計超出範圍');
    return{income:revenue,expenses:cost,profit:revenue-cost};
  }
  // Positive net-ticket surplus at 5%, plus signed entertainment tax through 2025.
  function incomeTax(year,netTicket,totalExpenses){
    if(!Number.isInteger(year)||year<2022||![netTicket,totalExpenses].every(Number.isSafeInteger)||totalExpenses<0)throw Error('預扣稅金基礎資料錯誤');
    const base=netTicket-totalExpenses;
    if(!Number.isSafeInteger(base))throw Error('預扣稅金基礎超出範圍');
    const numerator=Math.max(0,base)*2+(year<=2025?netTicket*3:0);
    if(!Number.isSafeInteger(numerator))throw Error('預扣稅金超出範圍');
    const value=numerator/40;
    return Math.sign(value)*Math.round(Math.abs(value))||0;
  }
  // Reconstruct displayed cumulative after-tax profit from immutable bookings.
  // 51 is the virtual year-end close that recognizes operating W50 receipts.
  function annualTrend(year,states={}){
    if(!Number.isInteger(year)||year<2022)throw Error('年度走勢年份錯誤');
    const base=(year-2022)*50,buckets=Array.from({length:51},()=>({ticket:0,income:0,expenses:0}));
    const yearOf=week=>2022+Math.floor((week-1)/50);
    function add(state,key,date,amount,accountingYear){
      for(const r of state?.receipts||[]){
        const at=r[date],y=accountingYear(r,at);if(y!==year)continue;
        const index=at-base-1,value=r[amount];
        if(!Number.isInteger(index)||index<0||index>50||!Number.isSafeInteger(value))throw Error('年度走勢入帳資料錯誤');
        buckets[index][key]+=value;
      }
    }
    add(states.distributor,'ticket','at','net',r=>r.accountingYear);
    for(const [key,amount] of [['activation','gross'],['foodRevenue','gross'],['merchandise','total']])add(states[key],'income','bookedAt',amount,(r,at)=>r.accountingYear??yearOf(at));
    add(states.operatingExpenses,'expenses','bookedAt','total',(r,at)=>r.accountingYear??yearOf(at));
    for(const key of ['rent','propertyTax','managementFee','utilityBills'])add(states[key],'expenses','week','amount',r=>r.year);
    let ticket=0,income=0,expenses=0;
    const points=buckets.map((bucket,index)=>{
      ticket+=bucket.ticket;income+=bucket.income;expenses+=bucket.expenses;
      const profit=calculate({ticket,other:income},{other:expenses}).profit-incomeTax(year,ticket,expenses);
      if(!Number.isSafeInteger(profit))throw Error('年度走勢金額超出範圍');
      return{week:index+1,profit};
    });
    return{year,points,min:Math.min(...points.map(p=>p.profit)),max:Math.max(...points.map(p=>p.profit))};
  }
  const api={calculate,incomeTax,annualTrend};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaFinancialTotals=api;
})(globalThis);
