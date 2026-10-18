'use strict';
const definitions = [
  ['C01', 'baogong', '寶宮戲院', '老牌首輪戲院'],
  ['C02', 'century', '世紀戲院', '老牌二輪戲院'],
  ['C03', 'broadway', '布洛威影城', '小規模連鎖院線'],
  ['C04', 'ylc', 'YLC影城', '大型商場連鎖院線'],
  ['C05', 'arthouse', '公會堂電影中心', '公租民營藝術電影院'],
];
const status = document.querySelector('#status');
const container = document.querySelector('#cinemas');
const selection = document.querySelector('#selection');
let selectedId = null;
try { selectedId = localStorage.getItem('cineman.selectedCinema'); } catch { /* Storage may be unavailable. */ }

async function init() {
  try {
    const response = await fetch('data/cinemas.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    for (const [id, slug, name, type] of definitions) {
      const rules = data.cinemas.filter(row => row.cinemaID === id);
      if (!rules.length) throw new Error(`Missing rules: ${id}`);
      const counts = rules.map(row => row.screens).sort((a, b) => a - b);
      const locations = data.locations.filter(row => row[`cinemaID_${id}_applicable`] === true);
      const card = document.createElement('article');
      card.className = `cinema-card ${slug}`;
      card.dataset.cinemaId = id;
      card.innerHTML = `
        <figure class="cinema-visual">
          <img src="assets/cinemas/${slug}-exterior.jpg" alt="${name}外觀示意" width="304" height="510">
          <div class="view-switch" role="group" aria-label="${name}視覺切換">
            <button type="button" data-view="exterior" aria-pressed="true">外觀</button>
            <button type="button" data-view="interior" aria-pressed="false">內裝</button>
          </div>
        </figure>
        <div class="card-content">
          <h2>${name}</h2><div class="type">${type}</div>
          <div class="info">
            <p class="fact">影廳數選項<span>${counts.join('、')} 廳</span></p>
            <p class="fact">適用地點<span>${locations.map(row => row.name).join('、')}</span></p>
          </div>
          <button type="button" class="select-button" aria-pressed="false">選擇${name}</button>
        </div>`;
      card.querySelectorAll('[data-view]').forEach(button => {
        button.addEventListener('click', () => {
          const view = button.dataset.view;
          const image = card.querySelector('img');
          image.src = `assets/cinemas/${slug}-${view}.jpg`;
          image.alt = `${name}${view === 'exterior' ? '外觀' : '內裝'}示意`;
          card.querySelectorAll('[data-view]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
        });
      });
      const choose = () => {
        selectedId = id;
        try { localStorage.setItem('cineman.selectedCinema', id); } catch { /* Keep the in-memory selection. */ }
        container.querySelectorAll('.cinema-card').forEach(other => {
          const active = other.dataset.cinemaId === id;
          other.classList.toggle('selected', active);
          const button = other.querySelector('.select-button');
          button.setAttribute('aria-pressed', String(active));
          button.textContent = `${active ? '已選擇' : '選擇'}${other.querySelector('h2').textContent}`;
        });
        selection.hidden = false;
        document.querySelector('#selection-title').textContent = `你的起始戲院：${name}`;
        document.querySelector('#selection-detail').textContent = `可選 ${counts.join('、')} 廳配置，適用地點：${locations.map(row => row.name).join('、')}。`;
        status.textContent = `已選擇${name}，可隨時改選其他戲院。`;
      };
      card.querySelector('.select-button').addEventListener('click', choose);
      container.append(card);
      if (selectedId === id) choose();
    }
    // Reapply after all five cards exist so restored selection updates every button.
    const restored = container.querySelector(`[data-cinema-id="${definitions.some(d => d[0] === selectedId) ? selectedId : ''}"] .select-button`);
    if (restored) restored.click();
    else status.textContent = '五種戲院 · 點選外觀／內裝探索，再選擇你的起點';
  } catch (error) {
    container.replaceChildren();
    selection.hidden = true;
    status.textContent = '無法載入戲院資料，請確認透過網頁伺服器開啟，然後重新整理。';
    console.error('Cinema data loading failed:', error);
  }
}
init();
