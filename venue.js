'use strict';
(function(root) {
  async function assign(cinemaID, runId) {
    const response = await fetch('data/cinemas.json');
    if (!response.ok) throw Error('無法讀取戲院資料');
    const database = await response.json();
    // The run in the URL keeps refreshes stable. A new homepage confirmation
    // creates a fresh run and therefore a new field allocation and form draft.
    const allocation = root.CinemaRules.generate(database, cinemaID, runId);
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
    document.querySelector('#venue-extra-count').textContent = allocation.counts.EXTRA;
    document.querySelector('#venue-extra-names').textContent = extras.size ? Array.from(extras, ([name,n]) => `${name} × ${n}`).join('、') : '無特殊廳';
    document.querySelector('#venue-details-title').textContent = `影廳明細（${allocation.screenCount} 廳）`;
    const rows = allocation.screens.map((screen,index) => {
      const tr = document.createElement('tr');
      for (const value of [`${index+1} 廳`, screen.type === 'EXTRA' ? screen.name.replace(/\s*\([^)]*\)$/, '') : `${screen.type} 級一般廳`, screen.size.toLocaleString('zh-TW')]) {
        const cell = document.createElement('td'); cell.textContent = value; tr.append(cell);
      }
      return tr;
    });
    document.querySelector('#venue-screens').replaceChildren(...rows);
    document.querySelector('#venue-profile').dataset.runId = allocation.seed;
    document.querySelector('#venue-loading').hidden = true;
    document.querySelector('#venue-data').hidden = false;
  }
  root.CinemaVenue = {assign, render};
})(globalThis);
