const assert=require('node:assert/strict'),F=require('../financial-totals.js');assert.deepEqual(F.calculate({ticket:100000,food:20000,merchandise:10000,other:5000,gross:500000},{personnel:24000,goods:10000,maintenance:10000,marketing:5000,other:2000,utilities:8000,premises:12000}),{income:135000,expenses:71000,profit:64000});assert.deepEqual(F.calculate({ticket:-20000,food:1000},{personnel:24000,other:5000}),{income:-19000,expenses:29000,profit:-48000});assert.deepEqual(F.calculate({},{}),{income:0,expenses:0,profit:0});assert.throws(()=>F.calculate({ticket:NaN},{}));console.log('PASS net ticket plus three revenue sources, all seven expense rows, no gross double-counting, negative receipts/losses, zero periods and invalid inputs');

assert.equal(F.incomeTax(2026,100000,40000),3000);
assert.equal(F.incomeTax(2026,100000,100000),0);
assert.equal(F.incomeTax(2026,100000,140000),0);
assert.equal(F.incomeTax(2026,-100000,40000),0);
assert.equal(F.incomeTax(2026,0,0),0);
assert.equal(F.incomeTax(2026,10,0),1);
assert.equal(F.incomeTax(2026,9,0),0);
assert.throws(()=>F.incomeTax(2026,NaN,0));assert.throws(()=>F.incomeTax(2026,100,-1));
const totals=F.calculate({ticket:100000,food:20000,merchandise:10000,other:5000},{personnel:10000,goods:20000,maintenance:1000,marketing:2000,other:3000,utilities:4000,premises:5000});
assert.equal(F.incomeTax(2026,100000,totals.expenses),2750);
assert.equal(totals.profit-F.incomeTax(2026,100000,totals.expenses),87250);
console.log('PASS net ticket minus all expenses at 5%, no food/merchandise/other income in tax base, 2026 exempts nonpositive base and whole-dollar rounding');

for(const year of[2022,2023,2024,2025]){
 assert.equal(F.incomeTax(year,100000,40000),10500);
 assert.equal(F.incomeTax(year,100000,140000),7500);
 assert.equal(F.incomeTax(year,-100000,40000),-7500);
 assert.equal(F.incomeTax(year,-20,0),-2);
 assert.equal(F.incomeTax(year,0,0),0);
}
assert.equal(F.incomeTax(2025,4,0),1); // Combine 0.2 + 0.3 before rounding.
assert.equal(F.incomeTax(2027,100000,40000),3000);
console.log('PASS 2022–2025 entertainment tax regardless of surplus exemption, signed credits, combined rounding and 2026 cutoff');

const states={
 distributor:{receipts:[{at:1,accountingYear:2022,net:-1000},{at:2,accountingYear:2022,net:10000},{at:4,accountingYear:2022,net:-2000},{at:51,accountingYear:2022,net:4000},{at:51,accountingYear:2023,net:-500}]},
 foodRevenue:{receipts:[{bookedAt:2,gross:1000},{bookedAt:51,gross:999999}]},
 merchandise:{receipts:[{bookedAt:3,total:500}]},activation:{receipts:[{bookedAt:4,gross:2000}]},
 operatingExpenses:{receipts:[{bookedAt:2,total:2500},{bookedAt:51,accountingYear:2022,total:500}]},
 rent:{receipts:[{week:4,year:2022,amount:10000}]},managementFee:{receipts:[{week:4,year:2022,amount:1000}]},
 utilityBills:{receipts:[{week:8,year:2022,amount:2000}]},propertyTax:{receipts:[{week:46,year:2022,amount:300}]}
};
const before=JSON.stringify(states),trend=F.annualTrend(2022,states),profit=w=>trend.points[w-1].profit;
assert.equal(trend.points.length,51);assert.equal(profit(1),-925);assert.equal(profit(2),6500);assert.equal(profit(3),7000);assert.equal(profit(4),-3525);assert.equal(profit(8),-5525);assert.equal(profit(46),-5825);assert.equal(profit(50),-5825);assert.equal(profit(51),-2625);assert.equal(trend.min,-5825);assert.equal(trend.max,7000);assert.equal(JSON.stringify(states),before);
const nextYear=F.annualTrend(2023,states);assert.equal(nextYear.points[0].profit,-500+999999-F.incomeTax(2023,-500,0));
for(const year of[2022,2025,2026]){
 const s={distributor:{receipts:[{at:(year-2022)*50+1,accountingYear:year,net:100000}]},rent:{receipts:[{week:(year-2022)*50+4,year,amount:80000}]}};
 const t=F.annualTrend(year,s);assert.equal(t.points[0].profit,100000-F.incomeTax(year,100000,0));assert.equal(t.points[3].profit,20000-F.incomeTax(year,100000,80000));
}
const emptyTrend=F.annualTrend(2022);assert(emptyTrend.points.every(p=>p.profit===0));assert.equal(emptyTrend.min,0);assert.equal(emptyTrend.max,0);
assert.throws(()=>F.annualTrend(2021));assert.throws(()=>F.annualTrend(2022,{distributor:{receipts:[{at:52,accountingYear:2022,net:1}]}}));
console.log('PASS annual after-tax cumulative trend, min/max, all income/expense ledgers, booking weeks, signed tax credits, 2026 cutoff, virtual W50 close, next-year exclusion, flat series and immutable inputs');
