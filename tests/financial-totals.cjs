const assert=require('node:assert/strict'),F=require('../financial-totals.js');assert.deepEqual(F.calculate({ticket:100000,food:20000,merchandise:10000,other:5000,gross:500000},{personnel:24000,goods:10000,maintenance:10000,marketing:5000,other:2000,utilities:8000,premises:12000}),{income:135000,expenses:71000,profit:64000});assert.deepEqual(F.calculate({ticket:-20000,food:1000},{personnel:24000,other:5000}),{income:-19000,expenses:29000,profit:-48000});assert.deepEqual(F.calculate({},{}),{income:0,expenses:0,profit:0});assert.throws(()=>F.calculate({ticket:NaN},{}));console.log('PASS net ticket plus three revenue sources, all seven expense rows, no gross double-counting, negative receipts/losses, zero periods and invalid inputs');

assert.equal(F.incomeTax(100000,40000),3000);
assert.equal(F.incomeTax(100000,100000),0);
assert.equal(F.incomeTax(100000,140000),0);
assert.equal(F.incomeTax(-100000,40000),0);
assert.equal(F.incomeTax(0,0),0);
assert.equal(F.incomeTax(10,0),1);
assert.equal(F.incomeTax(9,0),0);
assert.throws(()=>F.incomeTax(NaN,0));assert.throws(()=>F.incomeTax(100,-1));
const totals=F.calculate({ticket:100000,food:20000,merchandise:10000,other:5000},{personnel:10000,goods:20000,maintenance:1000,marketing:2000,other:3000,utilities:4000,premises:5000});
assert.equal(F.incomeTax(100000,totals.expenses),2750);
assert.equal(totals.profit-F.incomeTax(100000,totals.expenses),87250);
console.log('PASS net ticket minus all expenses at 5%, no food/merchandise/other income in tax base, no year surcharge, exempt nonpositive base and whole-dollar rounding');
