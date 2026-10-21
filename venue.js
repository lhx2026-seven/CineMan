'use strict';
(function(root) {
  async function assign(cinemaID, runId, savedAllocation = null, locationID = null) {
    const database = root.CinemaDatabase;
    if (!database) throw Error('無法讀取戲院資料');
    // The run in the URL keeps refreshes stable. A new homepage confirmation
    // creates a fresh run and therefore a new field allocation and form draft.
    if (savedAllocation) {
      if (savedAllocation.cinemaID !== cinemaID || savedAllocation.seed !== runId || root.CinemaRules.validateAssignment(savedAllocation,database).length) throw Error('存檔場地與資料庫不相符');
      if(locationID==='LOC08'){
        if(savedAllocation.screens.some(screen=>screen.type==='EXTRA'))return root.CinemaRules.generate(database,cinemaID,runId,savedAllocation.screenCount,locationID);
        const updated={...savedAllocation,locationID,constraints:{...savedAllocation.constraints,ranges:{...savedAllocation.constraints.ranges,EXTRA:{min:0,max:0}}}};
        if(root.CinemaRules.validateAssignment(updated,database).length)throw Error('小城鎮影廳配置不相容');
        return updated;
      }
      return savedAllocation;
    }
    const allocation = root.CinemaRules.generate(database, cinemaID, runId, null, locationID);
    return allocation;
  }
  function render(allocation) {
    document.querySelector('#venue-screen-count').textContent = allocation.screenCount;
    document.querySelector('#venue-seat-count').textContent = allocation.totalSeats.toLocaleString('zh-TW');
    const extras = new Map();
    for (const screen of allocation.screens.filter(s => s.type === 'EXTRA')) {
      const label = screen.name.replace(/\s*\([^)]*\)$/, '');
      extras.set(label, (extras.get(label) || 0) + 1);
    }
    document.querySelector('#venue-extra-names').textContent = extras.size ? `含 ${allocation.counts.EXTRA} 個特殊廳：${Array.from(extras, ([name,n]) => `${name}廳 × ${n}`).join('、')}` : '無特殊廳';
    document.querySelector('#venue-details-title').textContent = '影廳明細';
    const rows = allocation.screens.map((screen,index) => {
      const tr = document.createElement('tr');
      const label = screen.type === 'EXTRA' ? `${index+1}廳（${screen.name.replace(/\s*\([^)]*\)$/, '')}廳）` : `${index+1}廳`;
      for (const value of [label, screen.size.toLocaleString('zh-TW')]) {
        const cell = document.createElement('td'); cell.textContent = value; tr.append(cell);
      }
      return tr;
    });
    document.querySelector('#venue-screens').replaceChildren(...rows);
    document.querySelector('#venue-profile').dataset.runId = allocation.seed;
    document.querySelector('#venue-loading').hidden = true;
    document.querySelector('#venue-data').hidden = false;
  }
  const toggle = document.querySelector('#venue-details-title');
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(expanded));
    document.querySelector('#venue-details-panel').hidden = !expanded;
  });
  root.CinemaVenue = {assign, render};
})(globalThis);
