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
  const api={calculate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaFinancialTotals=api;
})(globalThis);
