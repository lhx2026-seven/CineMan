'use strict';
(function(root){
  function create(year,seed,settled=false){return{version:2,year,settled,role:root.CinemaRules.seededRandom(`annual-meeting/v1/${seed}/${year}`)()<.5?'shareholders':'chairperson'};}
  function resolve(saved,year,week,seed){if(saved==null)return null;if(week!==50||![1,2].includes(saved.version)||saved.year!==year||!['shareholders','chairperson'].includes(saved.role)||saved.role!==create(year,seed).role)throw Error('年度會議存檔錯誤');return{...saved,version:2,settled:saved.settled===true};}
  function summary(year,boxOffice,activation,foodRevenue,merchandise){
    const ticket=boxOffice?.byYear[year]||0,space=(activation?.receipts||[]).filter(r=>(r.accountingYear??(2022+Math.floor((r.bookedAt-1)/50)))===year).reduce((s,r)=>s+r.gross,0);
    const food=(foodRevenue?.receipts||[]).filter(r=>(r.accountingYear??(2022+Math.floor((r.bookedAt-1)/50)))===year).reduce((s,r)=>s+r.gross,0);
    const merch=(merchandise?.receipts||[]).filter(r=>(r.accountingYear??(2022+Math.floor((r.bookedAt-1)/50)))===year).reduce((s,r)=>s+r.total,0);
    return{ticket,space,knownIncome:ticket+space+food+merch,expenses:null,profit:null};
  }
  function topFilms(year,boxOffice,database){
    const totals=new Map(),titles=new Map((database?.movies||[]).map(m=>[m.id,m.title]));
    for(const r of boxOffice?.receipts||[])if((r.accountingYear??(2022+Math.floor((r.bookedAt-1)/50)))===year)for(const film of r.films)totals.set(film.id,(totals.get(film.id)||0)+film.gross);
    return [...totals].filter(([,gross])=>gross>0).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,5).map(([id,gross])=>({id,title:titles.get(id)||id,gross}));
  }
  function render({state,cinemaName,figures,topFive=[],showRanking=true}){
    const section=document.querySelector('#weekly-events'),list=document.querySelector('#weekly-event-list');section.hidden=false;section.classList.add('annual-meeting');document.querySelector('#weekly-events-title').textContent='年度會議';document.querySelector('#weekly-bulletin').classList.add('has-events');
    const article=document.createElement('article');article.className='meeting-layout';
    const visual=document.createElement('img');visual.src='assets/annual-meeting.svg';visual.width=640;visual.height=360;visual.alt='年度經營簡報示意';visual.className='meeting-slide';
    const content=document.createElement('div');content.className='meeting-content';const h=document.createElement('h3');h.textContent=`${state.year}年・${cinemaName}`;
    const money=n=>'NT$'+n.toLocaleString('zh-TW');
    const text=document.createElement('p');text.className='meeting-summary';text.textContent=`年度已入帳收入合計${money(figures.knownIncome)}。年度支出：${figures.expenses===null?'待結算':money(figures.expenses)}。年度損益：${figures.profit===null?'待結算':money(figures.profit)}。`;
    const ranking=document.createElement('div');ranking.className='meeting-ranking';
    if(showRanking&&topFive.length){const heading=document.createElement('h4');heading.textContent='年度票房TOP 5';const ol=document.createElement('ol');for(const film of topFive){const li=document.createElement('li');li.textContent=film.title;li.dataset.movieId=film.id;ol.append(li);}ranking.append(heading,ol);}
    if(!ranking.children.length){const heading=document.createElement('h4');heading.textContent='年度票房TOP 5';const p=document.createElement('p');p.textContent=showRanking?'本年度尚無票房紀錄':'本院僅顯示合計票房';ranking.append(heading,p);}
    const response=document.createElement('div');response.className='meeting-response';response.dataset.role=state.role;const speaker=document.createElement('h4');speaker.textContent=state.role==='shareholders'?'股東回應':'董事長回應';const reply=document.createElement('p');reply.textContent='⋯';reply.setAttribute('aria-label','回應尚未公布');response.append(speaker,reply);
    content.append(h,text);article.append(visual,content,ranking,response);list.replaceChildren(article);
  }
  const api={create,resolve,summary,topFilms,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaMeeting=api;
})(globalThis);
