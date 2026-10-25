'use strict';
(function(root) {
  function paymentReminders({week,rent,propertyTax,managementFee,utilityBills}) {
    const notices=[];
    const due=state=>(state?.receipts||[]).filter(r=>r.week===week&&r.amount>0).reduce((sum,r)=>sum+r.amount,0);
    const add=(kind,title,amount)=>notices.push({id:`payment/${kind}/${week}`,title,amount,message:'',noticeOnly:true});
    const utilities=due(utilityBills),rental=due(rent),management=due(managementFee),tax=due(propertyTax);
    if(utilities)add('utilities','本週應繳水電網路費',utilities);
    if(rental||management)add('premises',rental?(management?'本週應繳租金、管理費合計':'本週應繳租金'):'本週應繳管理費',rental+management);
    if(tax)add('property-tax','本週應繳房屋稅、地價稅合計',tax);
    return notices;
  }
  let pending=[],decisionHandler,acknowledgeHandler,activeID=null,initialized=false;
  function present(){
    const dialog=document.querySelector('#event-notice-dialog');
    if(!pending.length||dialog.open||document.querySelector('#payment-notice-dialog')?.open)return;
    if(!initialized){dialog.addEventListener('cancel',event=>event.preventDefault());initialized=true;}
    const event=pending[0];activeID=event.id;
    document.querySelector('#event-notice-title').textContent=event.title;
    document.querySelector('#event-notice-message').textContent=event.message;
    const status=document.querySelector('#event-notice-status');status.hidden=true;status.textContent='';
    const choices=event.choices||[],actions=document.querySelector('#event-notice-actions');
    const buttons=(choices.length?choices:[{id:null,label:'了解'}]).map(choice=>{
      const button=document.createElement('button');button.type='button';button.className='gold-button';button.textContent=choice.label;
      button.disabled=choices.length>0&&typeof decisionHandler!=='function';
      button.addEventListener('click',async()=>{
        const siblings=[...actions.querySelectorAll('button')];siblings.forEach(b=>b.disabled=true);
        try{
          if(choices.length)await decisionHandler({eventId:event.id,choiceId:choice.id});
          if(activeID!==event.id)return;
          acknowledgeHandler?.(event.id);
          pending.shift();activeID=null;dialog.close();present();
        }catch{
          status.hidden=false;status.textContent='暫時無法完成決策，請重試。';siblings.forEach(b=>b.disabled=false);
        }
      });return button;
    });
    actions.replaceChildren(...buttons);dialog.showModal();
  }
  // Database-backed notices and decisions use the same centered card, queued
  // after actual bill notices. No random event or decision effect is invented.
  function render({events=[],onDecision,onAcknowledge,acknowledged=[],defer=false}={}){
    if(!Array.isArray(events))throw Error('Weekly events must be an array');
    const ids=new Set();
    for(const event of events){
      if(!event||typeof event.id!=='string'||ids.has(event.id)||typeof event.title!=='string'||typeof event.message!=='string')throw Error('Invalid weekly event');
      ids.add(event.id);const choices=event.choices??[];
      if(!Array.isArray(choices)||choices.some(c=>!c||typeof c.id!=='string'||typeof c.label!=='string')||new Set(choices.map(c=>c.id)).size!==choices.length)throw Error('Invalid event choices');
    }
    const dialog=document.querySelector('#event-notice-dialog');
    if(dialog.open)dialog.close();
    pending=events.filter(e=>!acknowledged.includes(e.id));activeID=null;decisionHandler=onDecision;acknowledgeHandler=onAcknowledge;
    if(!defer)present();
  }
  const api={render,present,paymentReminders};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaEvents=api;
})(globalThis);
