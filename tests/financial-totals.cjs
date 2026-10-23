const assert=require('node:assert/strict'),F=require('../financial-totals.js');assert.deepEqual(F.calculate({ticket:100000,food:20000,merchandise:10000,other:5000,gross:500000},{personnel:24000,goods:10000,maintenance:10000,marketing:5000,other:2000,utilities:8000,premises:12000}),{income:135000,expenses:71000,profit:64000});assert.deepEqual(F.calculate({ticket:-20000,food:1000},{personnel:24000,other:5000}),{income:-19000,expenses:29000,profit:-48000});assert.deepEqual(F.calculate({},{}),{income:0,expenses:0,profit:0});assert.throws(()=>F.calculate({ticket:NaN},{}));console.log('PASS net ticket plus three revenue sources, all seven expense rows, no gross double-counting, negative receipts/losses, zero periods and invalid inputs');

for(const year of[2022,2023,2024,2025])assert.equal(F.incomeTax(year,100000,40000,20000),13500);
assert.equal(F.incomeTax(2026,100000,40000,20000),6000);
assert.equal(F.incomeTax(2022,-100000,40000,20000),-11500);
assert.equal(F.incomeTax(2026,-100000,40000,20000),-4000);
assert.equal(F.incomeTax(2022,0,0,0),0);
assert.equal(F.incomeTax(2026,10,0,0),1);
assert.equal(F.incomeTax(2026,-10,0,0),-1);
assert.throws(()=>F.incomeTax(2026,NaN,0,0));
console.log('PASS annual net ticket plus pure food less food cost, 2022–2025 extra 7.5%, signed credits and final dollar rounding');
