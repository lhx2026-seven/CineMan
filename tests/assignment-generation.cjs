const assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path');
const R=require('../assignment-rules.js');
const db=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/cinemas.json')));
assert.equal(R.chance('normal',8),1/8); assert.equal(R.chance(null,8),0); assert.equal(R.chance(0,8),0);assert.equal(R.chance(1,8),1);
assert.throws(()=>R.chance(-1,8));assert.throws(()=>R.generate(db,'C04','seed',13));assert.throws(()=>R.generate(db,'C99','seed'));assert.throws(()=>R.generate(db,'C01',''));
assert.deepEqual(R.generate(db,'C04','reproducible'),R.generate(db,'C04','reproducible'));
assert.notEqual(R.freshSeed(),R.freshSeed());
function close(actual,count,p,label){const tolerance=6*Math.sqrt(count*p*(1-p))+3;assert(Math.abs(actual-count*p)<=tolerance,`${label}: ${actual}/${count}, target ${p}`);}
let checked=0;
for(const row of db.cinemas){
 const m=R.model(row,db), samples=1500;let withA=0, d20=0, d=0, non500=0, a=0;
 for(let i=0;i<samples;i++){
  const out=R.generate(db,row.cinemaID,`rules/${row.cinemaID}/${row.screens}/${i}`,row.screens);
  assert.deepEqual(R.validateAssignment(out,db),[]);assert.equal(out.screenCount,row.screens);
  assert.equal(out.totalSeats,out.screens.reduce((n,s)=>n+s.size,0));
  withA+=Number(out.counts.A>0);
  for(const screen of out.screens){if(screen.type==='D'){d++;d20+=Number(screen.size===20);}if(screen.type==='A'){a++;non500+=Number(screen.size!==500);}}
  checked++;
 }
 close(withA,samples,m.effectiveA,`${row.cinemaID}/${row.screens} A`);
 if(!m.rule.minSeats){close(d20,d,m.rule.chanceD20,`${row.cinemaID}/${row.screens} D20`);close(non500,a,m.rule.chanceNon500,`${row.cinemaID}/${row.screens} non500`);}
 console.log('PASS',row.cinemaID,row.screens,'halls; effective A',m.effectiveA,'; D20',d?`${d20}/${d}`:'n/a');
}
for(const id of ['C01','C02','C03','C04','C05']){
 const rows=db.cinemas.filter(r=>r.cinemaID===id),n=12000,counts={};
 for(let i=0;i<n;i++){const out=R.generate(db,id,`allcounts/${id}/${i}`);counts[out.screenCount]=(counts[out.screenCount]||0)+1;checked++;}
 for(const row of rows)close(counts[row.screens]||0,n,1/rows.length,`${id} screen count ${row.screens}`);
 assert.equal(Object.keys(counts).length,rows.length);
}
// Database boundary failures must fail explicitly, never manufacture a fallback.
const bad=structuredClone(db);bad.cinemas=[{...bad.cinemas[0],'screens size total\nmin':1001}];
assert.throws(()=>R.generate(bad,'C01','impossible'),/No valid assignment/);
const fixture=structuredClone(db);fixture.cinemas=[{...fixture.cinemas[0],'screens type=A\nsize=non-500\nchance':0}];
for(let i=0;i<100;i++)assert.equal(R.generate(fixture,'C01',`zero/${i}`).screens[0].size,500);
fixture.cinemas[0] = {...fixture.cinemas[0],'screens type=A\nsize=non-500\nchance':1};
// Model caches treat source objects as immutable; use a fresh database after edits.
const fixture2=structuredClone(fixture);
for(let i=0;i<100;i++)assert.notEqual(R.generate(fixture2,'C01',`one/${i}`).screens[0].size,500);
// An independent analytic oracle for minimum-seat conditioning:
// B(200/250/300) + C(100/150), total>=400 has exactly three equally weighted outcomes.
const seatFixture=structuredClone(db);
seatFixture.cinemas=[{...db.cinemas.find(r=>r.cinemaID==='C02'&&r.screens===2),
 'screens type=B\nmin':1,'screens type=B\nmax':1,'screens type=C\nmin':1,'screens type=C\nmax':1}];
const frequencies={};
for(let i=0;i<10000;i++){
 const out=R.generate(seatFixture,'C02',`conditional/${i}`);
 const key=out.screens.map(s=>`${s.type}${s.size}`).sort().join('+');
 frequencies[key]=(frequencies[key]||0)+1;
}
assert.deepEqual(Object.keys(frequencies).sort(),['B250+C150','B300+C100','B300+C150']);
for(const count of Object.values(frequencies))close(count,10000,1/3,'conditional seat oracle');
// Two EXTRA draws: of nine ordered equal-weight pairs, seven satisfy the caps.
// VIP+VIP is one of seven, not one of six unordered combinations.
const extraFixture=structuredClone(db);
const extraRow={...db.cinemas[0],screens:2};
for(const type of R.TYPES){extraRow[`screens type=${type}\nmin`]=type==='EXTRA'?2:0;extraRow[`screens type=${type}\nmax`]=type==='EXTRA'?2:0;}
extraRow['screens type=A\nchance']=null;
extraFixture.cinemas=[extraRow];let twoVIP=0;
for(let i=0;i<10000;i++){
 const out=R.generate(extraFixture,'C01',`extra/${i}`);
 assert.deepEqual(R.validateAssignment(out,extraFixture),[]);
 twoVIP+=Number(out.screens.every(s=>s.name==='VIP (20席)'));
}
close(twoVIP,10000,1/7,'special-cap oracle');
console.log('PASS analytic seat-threshold and special-cap conditional distribution oracles (20,000 extra draws)');
console.log(`PASS ${checked} assignments: all 31 rows, repeatable seeds, probability bounds, 0/100%, impossible rules, special caps and allowed count frequencies`);
