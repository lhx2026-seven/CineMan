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
const previousButton = document.querySelector('#previous-cinema');
const nextButton = document.querySelector('#next-cinema');
let centerIndex = 2;
let suppressClick = false;
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
});

function updateOrbit() {
  const width = container.clientWidth;
  const radius = Math.min(650, width * (width <= 760 ? .88 : .46));
  const depthRadius = width <= 760 ? 270 : 520;
  container.querySelectorAll('.cinema-card').forEach((card, index) => {
    const distance = index - centerIndex;
    const angle = Math.max(-78, Math.min(78, distance * 30));
    const radians = angle * Math.PI / 180;
    const centered = distance === 0;
    const highlighted = centered && card.dataset.cinemaId === selectedId && !selection.hidden;
    card.style.setProperty('--orbit-x', `${Math.sin(radians) * radius}px`);
    card.style.setProperty('--orbit-y', `${highlighted ? -18 : Math.abs(distance) * 12}px`);
    card.style.setProperty('--orbit-z', `${(Math.cos(radians) - 1) * depthRadius}px`);
    card.style.setProperty('--orbit-yaw', `${-angle}deg`);
    card.style.setProperty('--orbit-scale', centered ? (highlighted ? '1.03' : '.96') : '.92');
    card.style.setProperty('--orbit-layer', 20 - Math.abs(distance));
    card.querySelector('.select-button').tabIndex = centered ? 0 : -1;
  });
  container.classList.toggle('has-selection', stageOrder[centerIndex] === selectedId && !selection.hidden);
  previousButton.disabled = centerIndex === 0;
  nextButton.disabled = centerIndex === stageOrder.length - 1;
}

function browseTo(index) {
  const target = Math.max(0, Math.min(stageOrder.length - 1, index));
  if (target === centerIndex) return;
  centerIndex = target;
  selection.hidden = true;
  updateOrbit();
}

function moveCarousel(step) {
  const target = Math.max(0, Math.min(stageOrder.length - 1, centerIndex + step));
  browseTo(target);
}
previousButton.addEventListener('click', () => moveCarousel(-1));
nextButton.addEventListener('click', () => moveCarousel(1));
stageScroll.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    moveCarousel(event.key === 'ArrowLeft' ? -1 : 1);
  }
});
let pointerStart = null;
stageScroll.addEventListener('pointerdown', event => {
  if (event.isPrimary && event.button === 0) pointerStart = { x: event.clientX, y: event.clientY };
});
stageScroll.addEventListener('pointercancel', () => { pointerStart = null; });
stageScroll.addEventListener('pointerup', event => {
  if (!pointerStart) return;
  const dx = event.clientX - pointerStart.x;
  const dy = event.clientY - pointerStart.y;
  pointerStart = null;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
    suppressClick = true;
    moveCarousel(dx < 0 ? 1 : -1);
    setTimeout(() => { suppressClick = false; }, 0);
  }
});
window.addEventListener('resize', updateOrbit);

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
      card.innerHTML = `
        <figure class="cinema-visual">
          <img draggable="false" src="assets/cinemas/landscape/${slug}-exterior${id === 'C02' || id === 'C03' || id === 'C04' ? '-v2' : ''}.webp" alt="${name}外觀示意" width="1774" height="887">
        </figure>
        <div class="card-content">
          <h2>${name}</h2><div class="type">${type}</div>
          <p class="description">${description}</p>
          <button type="button" class="select-button" aria-pressed="false">選擇${name}</button>
        </div>
        <figure class="cinema-visual">
          <img draggable="false" src="assets/cinemas/landscape/${slug}-interior.webp" alt="${name}內裝示意" width="1774" height="887" loading="lazy">
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
        centerIndex = stageOrder.indexOf(id);
        selection.hidden = false;
        updateOrbit();
        document.querySelector('#selection-title').textContent = `要進入${name}大展身手？`;
        confirmButton.disabled = confirmedId === id;
        confirmButton.textContent = confirmedId === id ? '已確定' : '確定';
      };
      const selectButton = card.querySelector('.select-button');
      selectButton.addEventListener('click', event => {
        event.stopPropagation();
        if (suppressClick) return;
        choose();
        selectButton.focus({ preventScroll: true });
      });
      card.addEventListener('click', () => {
        if (!suppressClick) browseTo(stageOrder.indexOf(id));
      });
      container.append(card);
    }
    updateOrbit();
    status.textContent = '請選擇你想經營的電影院';
  } catch (error) {
    container.replaceChildren();
    selection.hidden = true;
    status.textContent = '無法載入戲院資料，請確認透過網頁伺服器開啟，然後重新整理。';
    console.error('Cinema data loading failed:', error);
  }
}
init();
