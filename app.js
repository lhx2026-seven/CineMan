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
      const card = document.createElement('article');
      card.className = `cinema-card ${slug}`;
      card.dataset.cinemaId = id;
      card.innerHTML = `
        <figure class="cinema-visual">
          <img src="assets/cinemas/landscape/${slug}-exterior${id === 'C03' || id === 'C04' ? '-v2' : ''}.webp" alt="${name}外觀示意" width="1774" height="887">
        </figure>
        <div class="card-content">
          <h2>${name}</h2><div class="type">${type}</div>
          <button type="button" class="select-button" aria-pressed="false">選擇${name}</button>
        </div>
        <figure class="cinema-visual">
          <img src="assets/cinemas/landscape/${slug}-interior.webp" alt="${name}內裝示意" width="1774" height="887" loading="lazy">
        </figure>`;
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
        status.textContent = `已選擇${name}，可隨時改選其他戲院。`;
      };
      card.querySelector('.select-button').addEventListener('click', choose);
      container.append(card);
      if (selectedId === id) choose();
    }
    // Reapply after all five cards exist so restored selection updates every button.
    const restored = container.querySelector(`[data-cinema-id="${definitions.some(d => d[0] === selectedId) ? selectedId : ''}"] .select-button`);
    if (restored) restored.click();
    else status.textContent = '五種戲院 · 欣賞外觀與內裝，選擇你的起點';
  } catch (error) {
    container.replaceChildren();
    selection.hidden = true;
    status.textContent = '無法載入戲院資料，請確認透過網頁伺服器開啟，然後重新整理。';
    console.error('Cinema data loading failed:', error);
  }
}
init();
