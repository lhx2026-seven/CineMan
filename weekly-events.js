'use strict';
(function(root) {
  function paymentReminders({week,rent,propertyTax,managementFee,utilityBills}) {
    const notices=[];
    const add=(kind,title)=>notices.push({id:`payment/${kind}/${week}`,title,message:'',noticeOnly:true});
    if(utilityBills?.receipts.some(r=>r.week===week&&r.amount>0))add('utilities','本週繳交水電網路費');
    const rental=rent?.receipts.some(r=>r.week===week&&r.amount>0);
    const management=managementFee?.receipts.some(r=>r.week===week&&r.amount>0);
    if(rental||management)add('premises',rental?(management?'本週繳交租金及管理費':'本週繳交租金'):'本週繳交管理費');
    if(propertyTax?.receipts.some(r=>r.week===week&&r.amount>0))add('property-tax','本週繳交房屋稅、地價稅');
    return notices;
  }
  // Called at the beginning of a week with that week's database-backed events.
  // No event database or game effects are invented by this presentation layer.
  function render({events = [], onDecision} = {}) {
    if (!Array.isArray(events)) throw Error('Weekly events must be an array');
    const ids = new Set();
    for (const event of events) {
      if (!event || typeof event.id !== 'string' || ids.has(event.id) || typeof event.title !== 'string' || typeof event.message !== 'string') throw Error('Invalid weekly event');
      ids.add(event.id);
      const choices = event.choices ?? [];
      if (!Array.isArray(choices) || choices.some(c => !c || typeof c.id !== 'string' || typeof c.label !== 'string') || new Set(choices.map(c=>c.id)).size !== choices.length) throw Error('Invalid event choices');
    }
    const section = document.querySelector('#weekly-events');
    const list = document.querySelector('#weekly-event-list');
    document.querySelector('#weekly-events-title').textContent='本週大事';section.classList.remove('annual-meeting');
    const cards = events.map(event => {
      const article = document.createElement('article'); article.className = 'weekly-event';
      const heading = document.createElement('h3'); heading.textContent = event.title;
      const message = document.createElement('p'); message.textContent = event.message;
      article.append(heading);if(event.message)article.append(message);
      const choices = event.choices ?? [];
      if (choices.length) {
        const actions = document.createElement('div'); actions.className = 'event-actions';
        const status = document.createElement('p'); status.className = 'event-decision-status'; status.setAttribute('role','status');
        for (const choice of choices) {
          const button = document.createElement('button'); button.type = 'button'; button.textContent = choice.label;
          button.disabled = typeof onDecision !== 'function';
          button.addEventListener('click', async () => {
            const buttons = [...actions.querySelectorAll('button')];
            buttons.forEach(b=>{b.disabled=true;}); status.textContent = '處理中…';
            try {
              await onDecision({eventId:event.id, choiceId:choice.id});
              button.classList.add('chosen'); status.textContent = `已決定：${choice.label}`;
            } catch {
              buttons.forEach(b=>{b.disabled=false;}); status.textContent = '暫時無法完成決策，請重試。';
            }
          });
          actions.append(button);
        }
        article.append(actions, status);
      } else if(!event.noticeOnly) {
        const note = document.createElement('span'); note.className = 'event-notice'; note.textContent = '無法干預'; article.append(note);
      }
      return article;
    });
    list.replaceChildren(...cards);
    section.hidden = !cards.length;
    document.querySelector('#weekly-events-title').hidden=!cards.length;
    document.querySelector('#weekly-bulletin').classList.toggle('has-events', cards.length > 0);
  }
  const api={render,paymentReminders};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaEvents=api;
})(globalThis);
