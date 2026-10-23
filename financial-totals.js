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
  const api={calculate,incomeTax};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaFinancialTotals=api;
})(globalThis);
