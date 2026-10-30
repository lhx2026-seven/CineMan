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

// Warm only the chosen destination; never preload all five game screens.
const preparedGames = new Set();
const preparedRuns = new Map();
function newRunId() {
  return Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16).padStart(8, '0')).join('');
}
function prepareGame(id) {
  if (!preparedRuns.has(id)) preparedRuns.set(id, newRunId());
  if (navigator.connection?.saveData || preparedGames.has(id)) return;
  preparedGames.add(id);
  for (const [href, as] of [
    [`game.html?cinema=${encodeURIComponent(id)}&fresh=1&v=entry-v39&run=${preparedRuns.get(id)}`, 'document'],
    ['game.css?v=b0ceb301409f', 'style'],
    ['game-runtime.js?v=fd2200c414dc', 'script'],
  ]) {
    const link = document.createElement('link');
    link.rel = as === 'document' ? 'prefetch' : 'preload';
    link.href = href;
    link.as = as;
    document.head.append(link);
  }
  const [,slug]=definitions.find(([cinemaID])=>cinemaID===id);
  const stem=`${slug}-exterior${['C02','C03','C04'].includes(id)?'-v2':''}`;
  const image=document.createElement('link');image.rel='preload';image.as='image';image.fetchPriority='high';
  image.href=`assets/cinemas/landscape/${stem}.webp`;
  image.imageSrcset=[...[640,960,1280].map(width=>`assets/cinemas/optimized/${stem}-${width}.webp ${width}w`),`${image.href} 1774w`].join(', ');
  image.imageSizes='(max-width: 760px) calc(100vw - 20px), (max-width: 992px) 52vw, 510px';
  document.head.append(image);
}

let enteringGame = false;
confirmButton.addEventListener('click', () => {
  const cinema = definitions.find(([id]) => id === selectedId);
  if (!cinema || enteringGame) return;
  enteringGame = true;
  confirmedId = selectedId;
  try { localStorage.setItem('cineman.confirmedCinema', confirmedId); } catch { /* The URL also carries the selected cinema. */ }
  confirmButton.disabled = true;
  const run = preparedRuns.get(selectedId) || newRunId();
  const destination = `game.html?cinema=${encodeURIComponent(selectedId)}&fresh=1&v=entry-v39&run=${run}`;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    location.assign(destination);
    return;
  }
  document.body.classList.add('entering-game');
  const transition = document.createElement('div');
  transition.className = 'entry-transition';
  transition.setAttribute('role', 'status');
  transition.innerHTML = '<div class="entry-curtain entry-left"></div><div class="entry-curtain entry-right"></div><div class="entry-title"><span>CineMan</span><p></p></div>';
  transition.querySelector('p').textContent = `歡迎來到${cinema[2]}`;
  document.body.append(transition);
  requestAnimationFrame(() => requestAnimationFrame(() => transition.classList.add('closing')));
  setTimeout(() => location.assign(destination), 480);
});
window.addEventListener('pageshow', event => {
  if (event.persisted) location.reload();
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
    card.style.setProperty('--orbit-y', `${highlighted ? (width <= 760 ? -6 : -30) : Math.abs(distance) * 12}px`);
    card.style.setProperty('--orbit-ground-y', `${Math.abs(distance) * 12}px`);
    card.style.setProperty('--orbit-z', `${(Math.cos(radians) - 1) * depthRadius}px`);
    card.style.setProperty('--orbit-yaw', `${angle * .6}deg`);
    card.style.setProperty('--orbit-scale', centered ? (highlighted ? (width <= 760 ? '1.09' : '1.14') : '.96') : '.92');
    card.style.setProperty('--orbit-layer', 20 - Math.abs(distance));
    card.style.setProperty('--float-delay', `${index * -.8}s`);
    const shadow = container.querySelector(`[data-shadow-for="${card.dataset.cinemaId}"]`);
    shadow.style.cssText = card.style.cssText;
    shadow.classList.toggle('highlighted', highlighted);
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
    const data = globalThis.CinemaDatabase;
    if (!data) throw Error('Missing cinema database');
    for (const [id, slug, name, type, description] of definitions) {
      const rules = data.cinemas.filter(row => row.cinemaID === id);
      if (!rules.length) throw new Error(`Missing rules: ${id}`);
      const card = document.createElement('article');
      card.className = `cinema-card ${slug}`;
      card.dataset.cinemaId = id;
      card.innerHTML = `
        <figure class="cinema-visual">
          <img draggable="false" src="assets/cinemas/landscape/${slug}-exterior${id === 'C02' || id === 'C03' || id === 'C04' ? '-v2' : ''}.webp" srcset="assets/cinemas/optimized/${slug}-exterior${['C02','C03','C04'].includes(id) ? '-v2' : ''}-640.webp 640w, assets/cinemas/optimized/${slug}-exterior${['C02','C03','C04'].includes(id) ? '-v2' : ''}-960.webp 960w, assets/cinemas/landscape/${slug}-exterior${['C02','C03','C04'].includes(id) ? '-v2' : ''}.webp 1774w" sizes="320px" decoding="async" alt="${name}外觀示意" width="1774" height="887">
        </figure>
        <div class="card-content">
          <h2>${name}</h2><div class="type">${type}</div>
          <p class="description">${description}</p>
          <button type="button" class="select-button" aria-pressed="false">選擇${name}</button>
        </div>
        <figure class="cinema-visual">
          <img draggable="false" src="assets/cinemas/landscape/${slug}-interior.webp" srcset="assets/cinemas/optimized/${slug}-interior-640.webp 640w, assets/cinemas/optimized/${slug}-interior-960.webp 960w, assets/cinemas/landscape/${slug}-interior.webp 1774w" sizes="320px" decoding="async" alt="${name}內裝示意" width="1774" height="887" loading="lazy">
        </figure>`;
      const choose = () => {
        if (selectedId !== id) {
          confirmedId = null;
          try { localStorage.removeItem('cineman.confirmedCinema'); } catch { /* Storage may be unavailable. */ }
        }
        selectedId = id;
        prepareGame(id);
        try { localStorage.setItem('cineman.selectedCinema', id); } catch { /* Keep the in-memory selection. */ }
        container.querySelectorAll('.cinema-card').forEach(other => {
          const active = other.dataset.cinemaId === id;
          other.classList.toggle('selected', active);
          const button = other.querySelector('.select-button');
          button.setAttribute('aria-pressed', String(active));
          button.textContent = `${active ? '選擇' : '選擇'}${other.querySelector('h2').textContent}`;
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
      const shadow = document.createElement('div');
      shadow.className = 'card-shadow';
      shadow.dataset.shadowFor = id;
      shadow.setAttribute('aria-hidden', 'true');
      container.append(shadow, card);
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
