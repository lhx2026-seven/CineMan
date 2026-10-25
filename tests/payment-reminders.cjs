const assert=require('node:assert/strict'),E=require('../weekly-events.js'),P=require('../parameter-rules.js').DATA.compute;
const events=(week,id='C01',rentWeeks=[],taxWeeks=[])=>E.paymentReminders({week,cinemaID:id,rent:{receipts:rentWeeks.map(week=>({week,amount:100}))},propertyTax:{receipts:taxWeeks.map(week=>({week,amount:200}))},managementFee:{receipts:['C03','C04'].includes(id)&&week%4===0?[{week,amount:300}]:[]},utilityBills:{receipts:[8,16,24,32,40,48].includes((week-1)%50+1)?[{week,amount:100}]:[]},parameters:P});
const titles=es=>es.map(e=>e.title);
assert.deepEqual(events(1),[]);assert.deepEqual(events(5,'C01',[4]),[]);assert.deepEqual(titles(events(4,'C01',[4])),['本週應繳租金']);
for(const id of['C03','C04']){assert.deepEqual(titles(events(4,id,[4])),['本週應繳租金、管理費合計']);assert.deepEqual(titles(events(4,id)),['本週應繳管理費']);assert.deepEqual(titles(events(8,id,[8])),['本週應繳水電網路費','本週應繳租金、管理費合計']);}
assert.deepEqual(titles(events(46,'C01',[],[46])),['本週應繳房屋稅、地價稅合計']);assert.deepEqual(events(47,'C01',[],[46]),[]);assert.deepEqual(events(46,'C05'),[]);assert.deepEqual(titles(events(58,'C01',[58])),['本週應繳水電網路費','本週應繳租金']);assert.deepEqual(titles(events(96,'C03',[96],[96])),['本週應繳租金、管理費合計','本週應繳房屋稅、地價稅合計']);const all=events(96,'C03',[96],[96]);assert.equal(new Set(all.map(e=>e.id)).size,2);assert(all.every(e=>e.noticeOnly));assert.deepEqual(events(96,'C03',[96],[96]),all);console.log('PASS billing-backed rent/tax, billing-backed utilities and management, combined wording, owned management-only, no duplicates, first-week empty and continuous cross-year reminders');

assert.deepEqual(E.paymentReminders({week:4,cinemaID:'C03',parameters:P}),[]);

assert.equal(events(4,'C03',[4])[0].amount,400);
assert.equal(events(4,'C03')[0].amount,300);
assert.equal(events(46,'C01',[],[46])[0].amount,200);
assert.equal(events(8,'C01',[])[0].amount,100);
assert.deepEqual(E.paymentReminders({week:4,rent:{receipts:[{week:4,amount:0},{week:3,amount:900}]} }),[]);
console.log('PASS actual positive billed amounts and combined rent/management totals');
