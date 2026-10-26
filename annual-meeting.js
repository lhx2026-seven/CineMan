'use strict';
(function(root){
  function create(year,seed,settled=false){return{version:2,year,settled,role:root.CinemaRules.seededRandom(`annual-meeting/v1/${seed}/${year}`)()<.5?'shareholders':'chairperson'};}
  function resolve(saved,year,week,seed){if(saved==null)return null;if(week!==50||![1,2].includes(saved.version)||saved.year!==year||!['shareholders','chairperson'].includes(saved.role)||saved.role!==create(year,seed).role)throw Error('年度會議存檔錯誤');return{...saved,version:2,settled:saved.settled===true};}
  function summary(year,boxOffice,activation,foodRevenue,merchandise,distributor){
    const ticket=distributor?distributor.receipts.filter(r=>r.accountingYear===year).reduce((sum,r)=>sum+r.net,0):(boxOffice?.byYear[year]||0),space=(activation?.receipts||[]).filter(r=>(r.accountingYear??(2022+Math.floor((r.bookedAt-1)/50)))===year).reduce((s,r)=>s+r.gross,0);
    const food=(foodRevenue?.receipts||[]).filter(r=>(r.accountingYear??(2022+Math.floor((r.bookedAt-1)/50)))===year).reduce((s,r)=>s+r.gross,0);
    const merch=(merchandise?.receipts||[]).filter(r=>(r.accountingYear??(2022+Math.floor((r.bookedAt-1)/50)))===year).reduce((s,r)=>s+r.total,0);
    return{ticket,space,knownIncome:ticket+space+food+merch,expenses:null,profit:null};
  }
  function topFilms(year,boxOffice,database){
    const totals=new Map(),titles=new Map((database?.movies||[]).map(m=>[m.id,m.title]));
    for(const r of boxOffice?.receipts||[])if((r.accountingYear??(2022+Math.floor((r.bookedAt-1)/50)))===year)for(const film of r.films)totals.set(film.id,(totals.get(film.id)||0)+film.gross);
    return [...totals].filter(([,gross])=>gross>0).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,5).map(([id,gross])=>({id,title:titles.get(id)||id,gross}));
  }
  function profitAxis(min,max){
    if(!Number.isFinite(min)||!Number.isFinite(max)||min>max)throw Error('年度走勢範圍錯誤');
    const extent=Math.max(Math.abs(min),Math.abs(max));
    const step=extent===0?1:Math.max(1,10**(Math.floor(Math.log10(extent))-1));
    const upper=Math.max(0,Math.ceil(max/step)*step),lower=Math.min(0,Math.floor(min/step)*step);
    return upper===lower?{upper:1,lower:-1,step:1}:{upper,lower,step};
  }
  function renderTrend(trend){
    const ns='http://www.w3.org/2000/svg';
    const el=(tag,attrs={},text)=>{const node=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,v);if(text!==undefined)node.textContent=text;return node;};
    const {points,min,max,year}=trend,last=points.at(-1),left=228,right=610,top=36,bottom=324;
    const axis=profitAxis(min,max);
    const x=week=>left+(week-1)/(points.length-1)*(right-left);
    const y=value=>bottom-(value-axis.lower)/(axis.upper-axis.lower)*(bottom-top);
    const svg=el('svg',{viewBox:'0 0 640 360',width:640,height:360,role:'img','aria-label':`${year}年累計年度損益走勢，最低NT$${min.toLocaleString('zh-TW')}，最高NT$${max.toLocaleString('zh-TW')}，年度結算NT$${last.profit.toLocaleString('zh-TW')}`,class:'meeting-slide meeting-profit-chart','data-min':min,'data-max':max,'data-final-profit':last.profit,'data-axis-min':axis.lower,'data-axis-max':axis.upper});
    svg.append(el('rect',{width:640,height:360,rx:14,fill:'#17130e'}));
    for(const value of new Set([axis.upper,0,axis.lower])){
      const pos=y(value);
      svg.append(el('line',{x1:left,y1:pos,x2:right,y2:pos,stroke:value===0?'#c4ac7b80':'#b699624d',...(value===0?{}:{'stroke-dasharray':'5 7'})}));
      svg.append(el('text',{x:208,y:pos,dy:'.35em',fill:'#d8c39c','font-size':26,'text-anchor':'end'},value.toLocaleString('en-US')));
    }
    const coordinates=points.map(point=>`${x(point.week).toFixed(2)},${y(point.profit).toFixed(2)}`).join(' ');
    svg.append(el('polyline',{points:coordinates,fill:'none',stroke:'#d8b778','stroke-width':3,'stroke-linejoin':'round','stroke-linecap':'round'}));
    for(const point of points){const dot=el('circle',{cx:x(point.week),cy:y(point.profit),r:point===last?5:3,fill:point===last?'#ffe0a2':'#d8b778'});dot.append(el('title',{},`${point.week===51?'年度結算':'W'+point.week}：NT$${point.profit.toLocaleString('zh-TW')}`));svg.append(dot);}
    return svg;
  }
  function render({state,cinemaName,figures,trend,topFive=[],showRanking=true}){
    const section=document.querySelector('#annual-meeting-section'),list=document.querySelector('#annual-meeting-content');section.hidden=false;
    const article=document.createElement('article');article.className='meeting-layout';
    const visual=renderTrend(trend);
    const content=document.createElement('div');content.className='meeting-content';const h=document.createElement('h3');h.textContent=`${cinemaName}${state.year}年度損益摘要`;
    const money=n=>'NT$'+n.toLocaleString('zh-TW');
    const text=document.createElement('p');text.className='meeting-summary';text.textContent=`年度已入帳收入合計${money(figures.knownIncome)}。年度支出：${figures.expenses===null?'待結算':money(figures.expenses)}。${figures.preTaxProfit==null?'':`稅前淨利：${money(figures.preTaxProfit)}。`}年度損益：${figures.profit===null?(figures.preTaxProfit==null?'待結算':'待所得稅'):money(figures.profit)}。`;
    const ranking=document.createElement('div');ranking.className='meeting-ranking';
    if(showRanking&&topFive.length){const heading=document.createElement('h4');heading.textContent='年度票房TOP 5';const ol=document.createElement('ol');for(const film of topFive){const li=document.createElement('li');li.textContent=film.title;li.dataset.movieId=film.id;ol.append(li);}ranking.append(heading,ol);}
    if(!ranking.children.length){const heading=document.createElement('h4');heading.textContent='年度票房TOP 5';const p=document.createElement('p');p.textContent=showRanking?'本年度尚無票房紀錄':'本院僅顯示合計票房';ranking.append(heading,p);}
    const response=document.createElement('div');response.className='meeting-response';response.dataset.role=state.role;const speaker=document.createElement('h4');speaker.textContent=state.role==='shareholders'?'股東回應':'董事長回應';const reply=document.createElement('p');reply.textContent='⋯';reply.setAttribute('aria-label','回應尚未公布');response.append(speaker,reply);
    content.append(h,text);article.append(visual,content,ranking,response);list.replaceChildren(article);
  }
  const api={create,resolve,summary,topFilms,profitAxis,renderTrend,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaMeeting=api;
})(globalThis);
