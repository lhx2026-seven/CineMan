'use strict';
(function(root) {
  const OLD_FILMS = [{id:'MV0001',title:'魔猴'},{id:'MV0002',title:'恐怖速食店'},{id:'MV0003',title:'酆都'}];
  const canonicalId = id => ({MV001:'MV0001',MV002:'MV0002',MV003:'MV0003'})[id] || id;
  function screeningCapacity(screenCount) {
    if (!Number.isInteger(screenCount) || screenCount < 1) throw Error('Invalid screen count');
    return 6 * screenCount;
  }
  function sharePercentage(slots, screenCount) {
    const capacity = screeningCapacity(screenCount);
    if (!Number.isInteger(slots) || slots < 0 || slots > capacity) throw Error('Invalid screening slots');
    return slots * 100 / capacity;
  }
  function retirementPool(showing, week) {
    if (!Number.isInteger(week) || week < 1) throw Error('Invalid week');
    const forced = week >= 2 ? showing.filter(movie=>canonicalId(movie.id)==='MV0003') : [];
    const randomPool = week >= 3 ? showing.filter(movie=>canonicalId(movie.id)!=='MV0003') : [];
    return {forced, randomPool};
  }
  // Quantity must be supplied by the future week progression rules. Do not
  // invent a weekly retirement probability or count while MoviesList is absent.
  function drawRetirements(showing, week, count, seed) {
    const {forced,randomPool} = retirementPool(showing,week);
    if (!Number.isInteger(count) || count < 0 || count > randomPool.length) throw Error('Specify a valid retirement count');
    const random = root.CinemaRules.seededRandom(seed), shuffled=randomPool.slice();
    for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
    return {forced,random:shuffled.slice(0,count)};
  }
  // Future MoviesList integration supplies the eligible new-release pool, not
  // an assumed database schema. Keep the three fixed older titles out of it.
  function pickNewMovies(pool, seed) {
    const excluded = new Set(OLD_FILMS.map(movie=>movie.id));
    const ids = new Set();
    const eligible = pool.filter(movie=>{
      if (!movie || typeof movie.id !== 'string' || typeof movie.title !== 'string' || ids.has(canonicalId(movie.id))) throw Error('Invalid or duplicate movie');
      ids.add(canonicalId(movie.id)); return !excluded.has(canonicalId(movie.id));
    });
    if (eligible.length < 2) throw Error('At least two eligible new movies required');
    const random = root.CinemaRules.seededRandom(seed), shuffled = eligible.slice();
    for (let i=shuffled.length-1;i>0;i--) { const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]; }
    return shuffled.slice(0,2);
  }
  function init(form) {
    const carousel = document.querySelector('#film-carousel');
    const cards = [...carousel.querySelectorAll('.film-option')];
    const previous = document.querySelector('#previous-film'), next = document.querySelector('#next-film');
    const midpoint = (cards.length - 1) / 2;
    let center = midpoint, pointer = null, swiped = false;
    function update() {
      carousel.classList.toggle('is-overview', center === midpoint);
      cards.forEach((card,index)=>{
        const distance = index-center;
        card.style.setProperty('--film-distance',distance);
        card.style.setProperty('--film-depth',Math.abs(distance));
        card.style.zIndex = index === center ? '2' : '1';
        const button = card.querySelector('.film-select');
        button.tabIndex = center === midpoint || index === center ? 0 : -1;
        const selected = card.querySelector('input').checked;
        button.setAttribute('aria-pressed',String(selected));button.textContent = selected ? '已選擇' : '選擇';
        button.setAttribute('aria-label',`${selected ? '已選擇' : '選擇'}${card.querySelector('h4').textContent}`);
      });
      previous.disabled = center === 0;next.disabled = center === cards.length-1;
      document.querySelector('#film-position').textContent = center === midpoint ? '2 部新片' : `${center+1} / ${cards.length}`;
      const selectedMovie = form.elements.specialMovie.value;
      document.querySelector('#special-price').hidden = !selectedMovie;
      form.elements.specialPrice.disabled = !selectedMovie;
    }
    function browse(index) { center = Math.max(0,Math.min(cards.length-1,index));update(); }
    previous.addEventListener('click',()=>browse(center-1));next.addEventListener('click',()=>browse(center+1));
    cards.forEach((card,index)=>{
      card.addEventListener('click',()=>{if(!swiped)browse(index);});
      card.querySelector('.film-select').addEventListener('click',event=>{
        event.stopPropagation();if(swiped)return;
        browse(index);
        const input = card.querySelector('input');input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));
      });
    });
    carousel.addEventListener('keydown',event=>{
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const focused = document.activeElement.classList.contains('film-select');
      browse(event.key==='Home'?0:event.key==='End'?cards.length-1:center+(event.key==='ArrowRight'?1:-1));
      if(focused)cards[center].querySelector('.film-select').focus({preventScroll:true});
    });
    carousel.addEventListener('pointerdown',event=>{if(event.isPrimary&&event.button===0)pointer={x:event.clientX,y:event.clientY};});
    carousel.addEventListener('pointercancel',()=>{pointer=null;});
    carousel.addEventListener('pointerup',event=>{
      if(!pointer)return;const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;pointer=null;
      if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.3){swiped=true;browse(center+(dx<0?1:-1));setTimeout(()=>{swiped=false;},0);}
    });
    return {update,restoreView(){const selected=cards.findIndex(card=>card.querySelector('input').checked);browse(selected<0?midpoint:selected);},
      titleFor(value){return cards.find(card=>card.dataset.filmValue===value)?.querySelector('h4').textContent||'';}};
  }
  root.CinemaFilms = {OLD_FILMS,pickNewMovies,screeningCapacity,sharePercentage,retirementPool,drawRetirements,init};
})(globalThis);
