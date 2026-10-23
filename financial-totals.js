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
  // Annual recognized amounts; merchandise is excluded and negative bases remain signed.
  function incomeTax(year,ticketBase,foodRevenue,foodCost){
    if(!Number.isInteger(year)||year<2022||![ticketBase,foodRevenue,foodCost].every(Number.isSafeInteger))throw Error('所得稅基礎資料錯誤');
    const value=((ticketBase+foodRevenue-foodCost)*2+(year<=2025?ticketBase*3:0))/40;
    const tax=Math.sign(value)*Math.round(Math.abs(value)+Number.EPSILON*Math.max(1,Math.abs(value))*4);
    if(!Number.isSafeInteger(tax))throw Error('所得稅金額超出範圍');
    return tax||0;
  }
  const api={calculate,incomeTax};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaFinancialTotals=api;
})(globalThis);
