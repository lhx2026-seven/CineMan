const assert = require('node:assert/strict');
const fs = require('node:fs');
const rules = require('../assignment-rules.js');
const data = JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../data/cinemas.json')));
const audit = [];
for (const row of data.cinemas) {
  const choices = rules.enumerateCounts(row, data);
  assert(choices.length, `Infeasible rule: ${row.cinemaID}/${row.screens}`);
  for (const {counts,seatBounds} of choices) {
    assert.equal(Object.values(counts).reduce((a,b)=>a+b), row.screens);
    assert(seatBounds.max >= rules.normalize(row).minSeats);
  }
  audit.push({cinemaID:row.cinemaID, screens:row.screens, feasibleTypeCombinations:choices.length,
    minPossibleSeats:Math.min(...choices.map(x=>Math.max(x.seatBounds.min,rules.normalize(row).minSeats))),
    maxPossibleSeats:Math.max(...choices.map(x=>x.seatBounds.max))});
}
const a = data.screens.find(s=>s.type==='A'&&s.size===500);
assert.deepEqual(rules.validateAssignment({cinemaID:'C01',screens:[a],totalSeats:500},data),[]);
assert(rules.validateAssignment({cinemaID:'C01',screens:[a],totalSeats:499},data).includes('Incorrect seat sum'));
const d20=data.screens.find(s=>s.type==='D'&&s.size===20);
assert(rules.validateAssignment({cinemaID:'C05',screens:[d20],totalSeats:20},data).length);
const imax=data.screens.find(s=>s.name==='IMAX (300席)');
assert(rules.validateAssignment({cinemaID:'C04',screens:[...Array(2).fill(imax),...Array(8).fill(d20)],totalSeats:760},data).some(e=>e.includes('Exceeded limit')));
console.log(JSON.stringify(audit,null,2));
console.log('PASS all 31 rules feasible; hard bounds, totals and special-hall caps verified');
