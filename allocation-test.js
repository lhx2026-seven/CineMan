'use strict';
(async function() {
  const $ = selector => document.querySelector(selector);
  const status = $('#test-status');
  const actions = ['#test-single','#test-fresh','#test-batch','#test-export'];
  const inputs = ['#test-cinema','#test-count','#test-seed','#test-samples'];
  const percent = value => (value*100).toFixed(2) + '%';
  let database, single = null, batch = null, cancelled = false;
  for (const s of inputs) $(s).disabled = true;
  function setStatus(text, error = false) { status.textContent = text; status.classList.toggle('test-error', error); }
  function tableRows(selector, rows) {
    $(selector).replaceChildren(...rows.map(values => {
      const tr = document.createElement('tr');
      for (const value of values) { const td = document.createElement('td'); td.textContent = value; tr.append(td); }
      return tr;
    }));
  }
  function config() {
    const seed = $('#test-seed').value.trim();
    if (!seed) throw Error('請輸入種子');
    return {cinemaID:$('#test-cinema').value, seed,
      screenCount:$('#test-count').value ? Number($('#test-count').value) : null};
  }
  function chosenRules() { return database.cinemas.filter(r => r.cinemaID === $('#test-cinema').value); }
  function drawRules() {
    const rawChance = (row, key) => `${row[key] ?? '空白'} → ${percent(CinemaRules.chance(row[key],row.screens))}`;
    tableRows('#test-rule-rows', chosenRules().map(row => {
      const rule = CinemaRules.normalize(row);
      return [row.screens, ...CinemaRules.TYPES.map(type => `${rule.ranges[type].min}–${rule.ranges[type].max}`), rule.minSeats || '—',
        rawChance(row,'screens type=A\nchance'), rawChance(row,'screens type=A\nsize=non-500\nchance'),rawChance(row,'screens type=D\nsize=20\nchance')];
    }));
  }
  function changeCinema() {
    const select = $('#test-count'); select.replaceChildren(new Option('依資料庫抽選',''));
    for (const row of chosenRules()) select.add(new Option(`${row.screens} 廳`,String(row.screens)));
    drawRules();
  }
  function makeSingle() {
    try {
      const c = config(); single = CinemaRules.generate(database,c.cinemaID,c.seed,c.screenCount);
      const errors = CinemaRules.validateAssignment(single,database);
      $('#test-profile').textContent = `戲院：${single.cinemaID}\n種子：${single.seed}\n${single.screenCount} 廳／${single.totalSeats} 席\n類型數：${JSON.stringify(single.counts)}\nA 設定：${percent(single.probabilities.aConfigured)}；受限目標：${percent(single.probabilities.aEffective)}\nA 非 500 席設定：${percent(single.probabilities.aNon500)}；D20 設定：${percent(single.probabilities.d20)}\n驗證：${errors.length ? errors.join('；') : '通過全部約束'}`;
      tableRows('#test-screen-rows', single.screens.map((s,i)=>[i+1,s.type,s.name,s.size]));
      $('#test-export').disabled = false;
      setStatus('已生成一筆；相同輸入可重現。');
    } catch (error) { setStatus(error.message,true); }
  }
  function drawBatch() {
    const groups = Object.values(batch.groups).sort((a,b)=>a.screenCount-b.screenCount);
    tableRows('#test-batch-rows',groups.map(g=>[g.screenCount,g.samples,(g.seats/g.samples).toFixed(1),
      percent(g.aConfigured),percent(g.aEffective),percent(g.withA/g.samples),percent(g.d20Configured),g.d ? percent(g.d20/g.d) : '—',g.violations]));
    $('#test-summary').textContent = `戲院：${batch.config.cinemaID}；種子前綴：${batch.config.seed}\n已完成：${batch.completed} / ${batch.requested}\n違規：${batch.violations}\n最少／最多總座位：${batch.completed ? batch.minSeats : '—'} / ${batch.completed ? batch.maxSeats : '—'}\n平均總座位：${batch.completed ? (batch.totalSeats/batch.completed).toFixed(2) : '—'}\n特殊廳出現的戲院數：${JSON.stringify(batch.extraPresence)}\n逐廳座位規格次數：${JSON.stringify(batch.seatFrequencies)}`;
  }
  async function runBatch() {
    let c, requested;
    try {
      c = config(); requested = Number($('#test-samples').value);
      if (!Number.isInteger(requested) || requested < 1 || requested > 10000) throw Error('樣本數須為 1–10,000 的整數');
    } catch (error) { setStatus(error.message,true); return; }
    cancelled = false;
    for (const s of [...actions,...inputs]) $(s).disabled = true;
    $('#test-cancel').hidden = false;
    batch = {config:c,requested,completed:0,violations:0,minSeats:Infinity,maxSeats:0,totalSeats:0,groups:{},extraPresence:{},seatFrequencies:{},samples:[]};
    try {
      for (let i=0;i<requested && !cancelled;i++) {
        const seed = `${c.seed}/batch/${i}`;
        const a = CinemaRules.generate(database,c.cinemaID,seed,c.screenCount);
        const errors = CinemaRules.validateAssignment(a,database);
        const g = batch.groups[a.screenCount] ||= {screenCount:a.screenCount,samples:0,seats:0,withA:0,d:0,d20:0,violations:0,
          aConfigured:a.probabilities.aConfigured,aEffective:a.probabilities.aEffective,d20Configured:a.probabilities.d20};
        g.samples++; g.seats+=a.totalSeats;g.withA+=Number(a.counts.A>0);g.violations+=Number(errors.length>0);
        const extras = new Set();
        for (const s of a.screens) {
          const label = `${s.type}/${s.name}`;batch.seatFrequencies[label]=(batch.seatFrequencies[label]||0)+1;
          if (s.type==='D') { g.d++;g.d20+=Number(s.size===20); }
          if (s.type==='EXTRA') extras.add(s.name);
        }
        for (const name of extras) batch.extraPresence[name]=(batch.extraPresence[name]||0)+1;
        batch.completed++;batch.violations+=Number(errors.length>0);batch.totalSeats+=a.totalSeats;
        batch.minSeats=Math.min(batch.minSeats,a.totalSeats);batch.maxSeats=Math.max(batch.maxSeats,a.totalSeats);
        batch.samples.push({seed,screenCount:a.screenCount,totalSeats:a.totalSeats,counts:a.counts,
          screens:a.screens.map(s=>({type:s.type,name:s.name,size:s.size})),errors});
        if ((i+1)%100===0) { drawBatch();setStatus(`抽樣中：${i+1} / ${requested}`);await new Promise(resolve=>setTimeout(resolve,0)); }
      }
      drawBatch();setStatus(`${cancelled ? '已停止' : '抽樣完成'}：${batch.completed} 筆，${batch.violations} 筆違規。`);
    } catch (error) { drawBatch();setStatus(`抽樣中止：${error.message}`,true); }
    finally {
      for (const s of [...actions,...inputs]) $(s).disabled = false;
      $('#test-cancel').hidden = true;
    }
  }
  $('#test-single').addEventListener('click',makeSingle);
  $('#test-fresh').addEventListener('click',()=>{ $('#test-seed').value=CinemaRules.freshSeed();makeSingle(); });
  $('#test-batch').addEventListener('click',runBatch);
  $('#test-cancel').addEventListener('click',()=>{cancelled=true;});
  $('#test-cinema').addEventListener('change',changeCinema);
  $('#test-export').addEventListener('click',()=>{
    const result = {engineVersion:CinemaRules.VERSION,dataVersion:CinemaRules.fingerprint(database),exportedAt:new Date().toISOString(),single,batch};
    const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='cineman-allocation-test.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  try {
    const response=await fetch('data/cinemas.json');if(!response.ok)throw Error('無法載入資料庫');database=await response.json();
    $('#test-version').textContent=`引擎：${CinemaRules.VERSION}；資料指紋：${CinemaRules.fingerprint(database)}`;
    changeCinema();for(const s of [...actions,...inputs])$(s).disabled=false;$('#test-export').disabled=true;setStatus('資料庫已載入，可開始測試。');
  } catch(error){setStatus(error.message,true);}
})();
