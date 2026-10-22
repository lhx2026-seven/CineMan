'use strict';
(function(root){
  function create(year,seed){return{version:1,year,role:root.CinemaRules.seededRandom(`annual-meeting/v1/${seed}/${year}`)()<.5?'shareholders':'chairperson'};}
  function resolve(saved,year,week,seed){if(saved==null)return null;if(week!==50||saved.version!==1||saved.year!==year||!['shareholders','chairperson'].includes(saved.role)||saved.role!==create(year,seed).role)throw Error('年度會議存檔錯誤');return{...saved};}
  function summary(year,boxOffice,activation,foodRevenue){
    const ticket=boxOffice?.byYear[year]||0,space=(activation?.receipts||[]).filter(r=>2022+Math.floor((r.bookedAt-1)/50)===year).reduce((s,r)=>s+r.gross,0);
    const food=(foodRevenue?.receipts||[]).filter(r=>2022+Math.floor((r.bookedAt-1)/50)===year).reduce((s,r)=>s+r.gross,0);
    return{ticket,space,knownIncome:ticket+space+food,expenses:null,profit:null};
  }
  function render({state,cinemaName,figures}){
    const section=document.querySelector('#weekly-events'),list=document.querySelector('#weekly-event-list');section.hidden=false;section.classList.add('annual-meeting');document.querySelector('#weekly-events-title').textContent='年度會議';document.querySelector('#weekly-bulletin').classList.add('has-events');
    const article=document.createElement('article');article.className='meeting-layout';
    const visual=document.createElement('img');visual.src='assets/annual-meeting.svg';visual.width=640;visual.height=360;visual.alt='年度經營簡報示意';visual.className='meeting-slide';
    const content=document.createElement('div');content.className='meeting-content';const h=document.createElement('h3');h.textContent=`${state.year}年・${cinemaName}`;
    const money=n=>'NT$'+n.toLocaleString('zh-TW');
    const text=document.createElement('p');text.className='meeting-summary';text.textContent=`年度已入帳收入合計${money(figures.knownIncome)}。年度支出：${figures.expenses===null?'待結算':money(figures.expenses)}。年度損益：${figures.profit===null?'待結算':money(figures.profit)}。`;
    const note=document.createElement('p');note.className='meeting-note';note.textContent='依本年度入帳紀錄整理；W50營運收入將於下一年度入帳。';
    const response=document.createElement('div');response.className='meeting-response';response.dataset.role=state.role;const speaker=document.createElement('h4');speaker.textContent=state.role==='shareholders'?'股東回應':'董事長回應';const reply=document.createElement('p');reply.textContent='⋯';reply.setAttribute('aria-label','回應尚未公布');response.append(speaker,reply);
    content.append(h,text,note,response);article.append(visual,content);list.replaceChildren(article);
  }
  const api={create,resolve,summary,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaMeeting=api;
})(globalThis);
