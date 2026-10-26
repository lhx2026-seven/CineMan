const assert=require('node:assert/strict');globalThis.CinemaRules=require('../assignment-rules.js');const M=require('../annual-meeting.js');let shareholders=0;for(let i=0;i<10000;i++){const s=M.create(2022,'meeting/'+i);if(s.role==='shareholders')shareholders++;assert.deepEqual(M.resolve(JSON.parse(JSON.stringify(s)),2022,50,'meeting/'+i),s);}assert(Math.abs(shareholders/10000-.5)<.02);assert.equal(M.resolve(undefined,2022,1,'seed'),null);assert.throws(()=>M.resolve(M.create(2022,'seed'),2022,49,'seed'));assert.throws(()=>M.resolve(M.create(2022,'seed'),2023,50,'seed'));const a={receipts:[{bookedAt:50,gross:20000},{bookedAt:51,gross:25000}]};assert.deepEqual(M.summary(2022,{byYear:{2022:100000,2023:200000}},a),{ticket:100000,space:20000,knownIncome:120000,expenses:null,profit:null});assert.equal(M.summary(2023,null,a).space,25000);console.log('PASS 50/50 roles, stable reload, meeting only at matching-year W50, income recognition and no invented costs/profit:',shareholders);

assert.deepEqual(M.profitAxis(-1520000,3150000),{upper:3200000,lower:-1600000,step:100000});
assert.deepEqual(M.profitAxis(-5520000,12800000),{upper:13000000,lower:-6000000,step:1000000});
assert.deepEqual(M.profitAxis(-1600000,3200000),{upper:3200000,lower:-1600000,step:100000});
assert.deepEqual(M.profitAxis(100,3150000),{upper:3200000,lower:0,step:100000});
assert.deepEqual(M.profitAxis(-5520000,-100),{upper:0,lower:-5600000,step:100000});
assert.deepEqual(M.profitAxis(0,0),{upper:1,lower:-1,step:1});
for(const [min,max] of [[-1,1],[-9999999,10000000],[123,123],[-123,-123]]){const a=M.profitAxis(min,max);assert(a.upper>=max&&a.lower<=min&&a.upper>a.lower&&a.upper>=0&&a.lower<=0);}
assert.throws(()=>M.profitAxis(1,-1));assert.throws(()=>M.profitAxis(NaN,1));
console.log('PASS outward rounded shared-magnitude axes, user examples, zero inclusion, exact boundaries, single-sign and flat series');
