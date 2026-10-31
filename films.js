'use strict';
(function(root) {
  const OLD_FILMS = [{id:'MV0001',title:'魔猴'},{id:'MV0002',title:'恐怖速食店'},{id:'MV0003',title:'酆都'}];
  const POSTER_VERSIONS = {"MV0001": "c6bb028955b9", "MV0002": "c55e552e31bf", "MV0003": "d35e30859d3d"};
  function screeningCapacity(screenCount,cinemaID='C01') {
    return root.CinemaMovieRules.screeningCapacity(screenCount,cinemaID);
  }
  function sharePercentage(slots,screenCount,cinemaID='C01') {
    const capacity=screeningCapacity(screenCount,cinemaID);
    if(!Number.isInteger(slots)||slots<0||slots>capacity)throw Error('Invalid screening slots');
    return slots*100/capacity;
  }
  function init(form,{showBoxOffice=true}={}) {
    const carousel = document.querySelector('#film-carousel');
    const cards = [...carousel.querySelectorAll('.film-option')];
    const titleMeasure=document.createElement('canvas').getContext('2d');
    const titleObserver=new ResizeObserver(entries=>entries.forEach(({target})=>fitTitle(target)));
    function fitTitle(title){
      const width=title.clientWidth;if(!width||!title.firstElementChild)return;
      const style=getComputedStyle(title);titleMeasure.font=style.font;
      const text=title.textContent,spacing=parseFloat(style.letterSpacing)||0;
      const measured=titleMeasure.measureText(text).width+Math.max(0,Array.from(text).length-1)*spacing;
      const size=parseFloat(style.fontSize)*Math.min(1,(width-1)/Math.max(1,measured));
      title.firstElementChild.style.fontSize=`${Math.max(1,size)}px`;
    }
    function setTitle(title,text){
      const span=document.createElement('span');span.textContent=text;
      title.replaceChildren(span);title.title=text;titleObserver.observe(title);fitTitle(title);
    }
    document.fonts.ready.then(()=>form.querySelectorAll('.film-info h4,.old-film h4').forEach(fitTitle));
    const previous = document.querySelector('#previous-film'), next = document.querySelector('#next-film');
    let available=cards.length, midpoint = (available - 1) / 2;
    let center = midpoint, pointer = null, swiped = false;
    const carryRadio=form.querySelector('#carry-film'),carryButton=document.querySelector('#carry-feature-button');
    carryButton.addEventListener('click',()=>{if(carryRadio.disabled)return;carryRadio.checked=true;carryRadio.dispatchEvent(new Event('change',{bubbles:true}));});
    const specialRows=[...form.querySelectorAll('.special-screening')];
    const add=document.querySelector('#add-special-screening');
    add.addEventListener('click',()=>{
      if(add.closest('fieldset').disabled)return;
      const count=Number(form.elements.specialCount.value);
      if(count>=5 || !specialRows[count-1].querySelector('select').value)return;
      form.elements.specialCount.value=String(count+1);update();
      specialRows[count].querySelector('select').focus();
      form.elements.specialCount.dispatchEvent(new Event('change',{bubbles:true}));
    });
    function update() {
      carousel.classList.toggle('is-overview', center === midpoint);
      carryButton.setAttribute('aria-pressed',String(carryRadio.checked));
      carryButton.classList.toggle('is-selected',carryRadio.checked);
      cards.forEach((card,index)=>{
        const distance = index-center;
        card.style.setProperty('--film-distance',distance);
        card.style.setProperty('--film-depth',Math.abs(distance));
        card.style.zIndex = index === center ? '2' : '1';
        const button = card.querySelector('.film-select');
        button.tabIndex = center === midpoint || index === center ? 0 : -1;
        const selected = card.querySelector('input').checked;
        button.setAttribute('aria-pressed',String(selected));button.textContent = selected ? '已選擇' : '選為主打片';
        button.setAttribute('aria-label',`${selected ? '已選擇' : '選擇'}${card.querySelector('h4').textContent}`);
      });
      previous.disabled = center === 0;next.disabled = !available || center === available-1;
      document.querySelector('#film-position').textContent = available<=1 || center === midpoint ? `${available} 部新片` : `${center+1} / ${available}`;
      if(add.closest('fieldset').disabled) {
        form.elements.specialCount.value='0';
        specialRows.forEach(row=>{
          row.querySelector('select').value='';
          const price=row.querySelector('input');price.value=price.type==='range'?price.min:'';price.disabled=true;
        });
        add.hidden=true;
        return;
      }
      let count=Math.max(1,Math.min(5,Number(form.elements.specialCount.value)||1));
      specialRows.forEach((row,index)=>{if(row.querySelector('select').value)count=Math.max(count,index+1);});
      form.elements.specialCount.value=String(count);
      specialRows.forEach((row,index)=>{
        row.hidden=index>=count;
        const selected=!!row.querySelector('select').value;
        row.querySelector('.special-film-price').hidden=!selected;
        row.querySelector('input').disabled=!selected;
      });
      add.hidden=count>=5 || !specialRows[count-1].querySelector('select').value;
    }
    function browse(index) { center = Math.max(0,Math.min(Math.max(0,available-1),index));update(); }
    previous.addEventListener('click',()=>browse(center-1));next.addEventListener('click',()=>browse(center+1));
    cards.forEach((card,index)=>{
      card.addEventListener('click',()=>{if(!swiped)browse(index);});
      card.querySelector('.film-select').addEventListener('click',event=>{
        event.stopPropagation();if(swiped||event.currentTarget.disabled)return;
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
    function setMovies(movies,values={},retained=[],totals={},carry=null) {
      document.querySelector('#carry-feature').hidden=!carry;carryRadio.disabled=!carry;carryRadio.value=carry?.id||'';carryRadio.checked=!!carry&&values.featuredFilm===carry.id;document.querySelector('#carry-film-title').textContent=carry?.title||'';
      const legacy={'new-01':movies[0]?.id,'new-02':movies[1]?.id};
      available=movies.length;midpoint=(available-1)/2;carousel.hidden=!available;
      cards.forEach((card,i)=>{
        const movie=movies[i];card.hidden=!movie;card.querySelector("input").disabled=!movie;if(!movie){card.querySelector("input").checked=false;return;}card.dataset.filmValue=movie.id;
        const input=card.querySelector('input');input.value=movie.id;input.checked=(legacy[values.featuredFilm]||values.featuredFilm)===movie.id;
        setTitle(card.querySelector('h4'),movie.title);
        card.querySelector('.film-box-office').hidden=!showBoxOffice;
        const output=card.querySelector('[data-box-office]');output.dataset.boxOffice=movie.id;output.setAttribute('aria-label',`${movie.title}本院累計票房`);output.textContent=(totals[movie.id]||0).toLocaleString('zh-TW');
      });
      specialRows.forEach(row=>{
        const select=row.querySelector('select'),saved=legacy[values[select.name]]||values[select.name]||'';
        const options=[new Option('選擇電影',''),...[...movies,...retained].map(m=>new Option(m.title,m.id))];
        select.replaceChildren(...options);select.value=saved;
      });
      const oldContainer=document.querySelector('.old-films');
      oldContainer.querySelectorAll('h4').forEach(title=>titleObserver.unobserve(title));
      oldContainer.replaceChildren(...retained.map(movie=>{
        const article=document.createElement('article');article.className='old-film';article.dataset.movieId=movie.id;
        const poster=document.createElement('div');poster.className='old-film-poster';
        if(OLD_FILMS.some(old=>old.id===movie.id)){const img=document.createElement('img');img.src=`assets/films/${movie.id}.webp?v=${POSTER_VERSIONS[movie.id]}`;img.width=600;img.height=900;img.alt=`《${movie.title}》電影海報`;img.loading='lazy';img.decoding='async';poster.append(img);}else{const icon=cards[0].querySelector('.film-poster svg').cloneNode(true);icon.setAttribute('aria-hidden','true');poster.append(icon);}
        const title=document.createElement('h4');setTitle(title,movie.title);
        const report=document.createElement('p');report.className='film-box-office';report.hidden=!showBoxOffice;const label=document.createElement('span');label.textContent='本院累計票房';const amount=document.createElement('span');amount.append('NT$ ');const output=document.createElement('output');output.dataset.boxOffice=movie.id;output.textContent=(totals[movie.id]||0).toLocaleString('zh-TW');output.setAttribute('aria-label',`${movie.title}本院累計票房`);amount.append(output);report.append(label,amount);article.append(poster,title,report);return article;
      }));
      oldContainer.hidden=!retained.length;document.querySelector('.old-films-heading').hidden=!retained.length;
      const selected=cards.findIndex(card=>card.querySelector('input').checked);browse(selected<0?midpoint:selected);
    }
    return {update,setMovies,
      titleFor(value){return value===carryRadio.value&&!carryRadio.disabled?document.querySelector('#carry-film-title').textContent:cards.find(card=>card.dataset.filmValue===value)?.querySelector('h4').textContent||'';}};
  }
  root.CinemaFilms = {OLD_FILMS,screeningCapacity,sharePercentage,init};
})(globalThis);
