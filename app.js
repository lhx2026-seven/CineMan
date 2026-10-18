'use strict';
const definitions = [
  ['C01', 'baogong', '寶宮戲院', '歷史悠久的大戲院', '曾是影迷心目中的聖地，現在要努力在競爭激烈的院線電影市場生存'],
  ['C02', 'century', '世紀戲院', '碩果僅存的老牌二輪戲院', '小本經營，希望能維持服務影迷的初衷'],
  ['C03', 'broadway', '布洛威影城', '小規模連鎖影城', '片單和設備可能有限，仍能稱職扮演好在地居民的娛樂中心'],
  ['C04', 'ylc', 'YLC影城', '結合商場的大型連鎖影城', '人潮多、空間大、片單多元，以高成本換取龐大收益'],
  ['C05', 'arthouse', '公會堂電影中心', '公部門支持的藝術電影院', '放映非主流電影、規劃主題影展，培養公民文化素養'],
];
const stageOrder = ['C05', 'C02', 'C01', 'C03', 'C04'];
definitions.sort((a, b) => stageOrder.indexOf(a[0]) - stageOrder.indexOf(b[0]));
const status = document.querySelector('#status');
const container = document.querySelector('#cinemas');
const selection = document.querySelector('#selection');
const stageScroll = document.querySelector('#stage-scroll');
const confirmButton = document.querySelector('#confirm-selection');
let selectedId = null;
let confirmedId = null;
try {
  localStorage.removeItem('cineman.selectedCinema');
  localStorage.removeItem('cineman.confirmedCinema');
} catch { /* Storage may be unavailable. */ }

confirmButton.addEventListener('click', () => {
  const cinema = definitions.find(([id]) => id === selectedId);
  if (!cinema) return;
  confirmedId = selectedId;
  try { localStorage.setItem('cineman.confirmedCinema', confirmedId); } catch { /* Keep confirmation in memory. */ }
  confirmButton.textContent = '已確定';
  confirmButton.disabled = true;
  status.textContent = `已確認選擇${cinema[2]}，可隨時改選。`;
});

async function init() {
  try {
    const response = await fetch('data/cinemas.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    for (const [id, slug, name, type, description] of definitions) {
      const rules = data.cinemas.filter(row => row.cinemaID === id);
      if (!rules.length) throw new Error(`Missing rules: ${id}`);
      const card = document.createElement('article');
      card.className = `cinema-card ${slug}`;
      card.dataset.cinemaId = id;
      const slot = stageOrder.indexOf(id) - 2;
      card.style.setProperty('--slot', slot);
      card.style.setProperty('--depth', Math.abs(slot));
      card.style.setProperty('--tilt', `${slot * 6}deg`);
      card.innerHTML = `
        <figure class="cinema-visual">
          <img src="assets/cinemas/landscape/${slug}-exterior${id === 'C02' || id === 'C03' || id === 'C04' ? '-v2' : ''}.webp" alt="${name}外觀示意" width="1774" height="887">
        </figure>
        <div class="card-content">
          <h2>${name}</h2><div class="type">${type}</div>
          <p class="description">${description}</p>
          <button type="button" class="select-button" aria-pressed="false">選擇${name}</button>
        </div>
        <figure class="cinema-visual">
          <img src="assets/cinemas/landscape/${slug}-interior.webp" alt="${name}內裝示意" width="1774" height="887" loading="lazy">
        </figure>`;
      const choose = () => {
        if (selectedId !== id) {
          confirmedId = null;
          try { localStorage.removeItem('cineman.confirmedCinema'); } catch { /* Storage may be unavailable. */ }
        }
        selectedId = id;
        try { localStorage.setItem('cineman.selectedCinema', id); } catch { /* Keep the in-memory selection. */ }
        container.querySelectorAll('.cinema-card').forEach(other => {
          const active = other.dataset.cinemaId === id;
          other.classList.toggle('selected', active);
          const button = other.querySelector('.select-button');
          button.setAttribute('aria-pressed', String(active));
          button.textContent = `${active ? '已選擇' : '選擇'}${other.querySelector('h2').textContent}`;
        });
        container.classList.add('has-selection');
        container.style.setProperty('--spot-x', `calc(50% + ${slot} * var(--fan-step))`);
        selection.hidden = false;
        document.querySelector('#selection-title').textContent = `要進入${name}大展身手？`;
        confirmButton.disabled = confirmedId === id;
        confirmButton.textContent = confirmedId === id ? '已確定' : '確定';
        status.textContent = confirmedId === id ? `已確認選擇${name}，可隨時改選。` : `已選擇${name}，請確認你的選擇。`;
        if (stageScroll.scrollWidth > stageScroll.clientWidth) {
          stageScroll.scrollTo({ left: container.offsetLeft + container.clientWidth / 2 + slot * parseFloat(getComputedStyle(container).getPropertyValue('--fan-step')) - stageScroll.clientWidth / 2, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        }
      };
      card.addEventListener('click', choose);
      container.append(card);
    }
    stageScroll.scrollLeft = (stageScroll.scrollWidth - stageScroll.clientWidth) / 2;
    status.textContent = '請選擇你想經營的電影院';
  } catch (error) {
    container.replaceChildren();
    selection.hidden = true;
    status.textContent = '無法載入戲院資料，請確認透過網頁伺服器開啟，然後重新整理。';
    console.error('Cinema data loading failed:', error);
  }
}
init();
