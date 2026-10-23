'use strict';
// Parameter.xlsx, imported 2026-10-20; guarantee step corrected by user to 5000.
// Negative distributor parameters reduce gross box office via distributor-rules.js.
(function(root) {
  const DATA={
  "playerControl": {
    "salary_budget": {
      "displayName": "人力預算",
      "attribute": "expense",
      "min": 20000.0,
      "max": 400000.0,
      "step": 1000.0,
      "gapWeeks": 1.0
    },
    "food&drink_buy": {
      "displayName": "餐飲成本",
      "attribute": "expense",
      "min": 0.0,
      "max": 400000.0,
      "step": 1000.0,
      "gapWeeks": 1.0
    },
    "marketing_fee": {
      "displayName": "行銷宣傳",
      "attribute": "expense",
      "min": 0.0,
      "max": 100000.0,
      "step": 5000.0,
      "gapWeeks": 1.0
    },
    "maintenance_fee": {
      "displayName": "硬體維護",
      "attribute": "expense",
      "min": 10000.0,
      "max": 200000.0,
      "step": 1000.0,
      "gapWeeks": 1.0
    },
    "petty_cash": {
      "displayName": "雜支",
      "attribute": "expense",
      "min": 0.0,
      "max": 200000.0,
      "step": 1000.0,
      "gapWeeks": 1.0
    },
    "first_run_ticket price": {
      "displayName": "全票",
      "attribute": "boxoffice_weight",
      "min": 250.0,
      "max": 400.0,
      "step": 10.0,
      "gapWeeks": null
    },
    "second_run_ticket price": {
      "displayName": "票價",
      "attribute": "boxoffice_weight",
      "min": 60.0,
      "max": 200.0,
      "step": 10.0,
      "gapWeeks": null
    },
    "arthouse_ticket price": {
      "displayName": "全票",
      "attribute": "boxoffice_weight",
      "min": 20.0,
      "max": 250.0,
      "step": 10.0,
      "gapWeeks": null
    },
    "IMAX_ticket_price": {
      "displayName": "票價",
      "attribute": "boxoffice_weight",
      "min": 400.0,
      "max": 600.0,
      "step": 10.0,
      "gapWeeks": null
    },
    "4DX_ticket_price": {
      "displayName": "票價",
      "attribute": "boxoffice_weight",
      "min": 500.0,
      "max": 600.0,
      "step": 10.0,
      "gapWeeks": null
    },
    "VIP_ticket_price": {
      "displayName": "票價",
      "attribute": "boxoffice_weight",
      "min": 300.0,
      "max": 1000.0,
      "step": 10.0,
      "gapWeeks": null
    },
    "special_show_price": {
      "displayName": "票價",
      "attribute": "boxoffice_weight",
      "min": 400.0,
      "max": 600.0,
      "step": 10.0,
      "gapWeeks": null
    },
    "popcorn_price": {
      "displayName": "爆米花",
      "attribute": "revenue_weight",
      "min": 20.0,
      "max": 200.0,
      "step": 10.0,
      "gapWeeks": null
    },
    "drink_price": {
      "displayName": "飲料",
      "attribute": "revenue_weight",
      "min": 20.0,
      "max": 100.0,
      "step": 10.0,
      "gapWeeks": null
    },
    "special_food_price": {
      "displayName": "獨家餐飲",
      "attribute": "revenue_weight",
      "min": 20.0,
      "max": 200.0,
      "step": 10.0,
      "gapWeeks": null
    }
  },
  "compute": {
    "rental": {
      "displayName": "房租",
      "attribute": "expense",
      "min": 300000.0,
      "max": 5000000.0,
      "step": 10000.0,
      "gapWeeks": 4.0
    },
    "manage_fee": {
      "displayName": "管理費",
      "attribute": "expense",
      "min": 10000.0,
      "max": 1000000.0,
      "step": 10000.0,
      "gapWeeks": 4.0
    },
    "tax_about_real_estate": {
      "displayName": "不動產稅",
      "attribute": "expense",
      "min": 500000.0,
      "max": 10000000.0,
      "step": 500000.0,
      "gapWeeks": 50.0
    },
    "utility_bill": {
      "displayName": "公共事業帳單",
      "attribute": "expense",
      "min": 100000.0,
      "max": 1000000.0,
      "step": 5000.0,
      "gapWeeks": 8.0
    },
    "hit_film_distributor_share": {
      "displayName": null,
      "attribute": "boxoffice_deduction",
      "min": -0.5,
      "max": -0.65,
      "step": 0.05,
      "gapWeeks": null
    },
    "bomb_film_distributor_share": {
      "displayName": null,
      "attribute": "boxoffice_deduction",
      "min": -0.5,
      "max": -0.6,
      "step": 0.05,
      "gapWeeks": null
    },
    "average_film_distributor_share": {
      "displayName": null,
      "attribute": "boxoffice_deduction",
      "min": -0.35,
      "max": -0.5,
      "step": 0.05,
      "gapWeeks": null
    },
    "bomb_film_distributor_guarantee": {
      "displayName": null,
      "attribute": "boxoffice_deduction",
      "min": -50000.0,
      "max": -100000.0,
      "step": 5000,
      "gapWeeks": null
    },
    "second_run_hit_film_pay": {
      "displayName": null,
      "attribute": "boxoffice_deduction",
      "min": -20000.0,
      "max": -30000.0,
      "step": 1000.0,
      "gapWeeks": null
    },
    "second_run_bomb_film_pay": {
      "displayName": null,
      "attribute": "boxoffice_deduction",
      "min": -5000.0,
      "max": -20000.0,
      "step": 1000.0,
      "gapWeeks": null
    },
    "second_run_average_film_pay": {
      "displayName": null,
      "attribute": "boxoffice_deduction",
      "min": -5000.0,
      "max": -10000.0,
      "step": 1000.0,
      "gapWeeks": null
    },
    "hit_film_attendence_rate": {
      "displayName": null,
      "attribute": "boxoffice_weight",
      "min": 0.5,
      "max": 1.0,
      "step": 0.01,
      "gapWeeks": null
    },
    "bomb_film_attendence_rate": {
      "displayName": null,
      "attribute": "boxoffice_weight",
      "min": 0.01,
      "max": 0.1,
      "step": 0.01,
      "gapWeeks": null
    },
    "average_film_attendence_rate": {
      "displayName": null,
      "attribute": "boxoffice_weight",
      "min": 0.01,
      "max": 0.5,
      "step": 0.01,
      "gapWeeks": null
    },
    "w2_attendence_decline": {
      "displayName": null,
      "attribute": "boxoffice_weight",
      "min": -0.5,
      "max": 0.0,
      "step": 0.01,
      "gapWeeks": null
    },
    "w3_attendence_decline": {
      "displayName": null,
      "attribute": "boxoffice_weight",
      "min": -0.75,
      "max": -0.5,
      "step": 0.01,
      "gapWeeks": null
    },
    "w4_attendence_decline": {
      "displayName": null,
      "attribute": "boxoffice_weight",
      "min": -0.99,
      "max": -0.5,
      "step": 0.01,
      "gapWeeks": null
    }
  }
};
  const fields={staffing:'salary_budget',foodCost:'food&drink_buy',marketing:'marketing_fee',maintenance:'maintenance_fee',consumables:'petty_cash',secondRunPrice:'second_run_ticket price',popcornPrice:'popcorn_price',drinkPrice:'drink_price',exclusiveFoodPrice:'special_food_price',ticketExtra_IMAX:'IMAX_ticket_price',ticketExtra_4DX:'4DX_ticket_price',ticketExtra_VIP:'VIP_ticket_price'};
  function forControl(name,cinemaID) {
    const key=name==='ticketFull' ? (cinemaID==='C05'?'arthouse_ticket price':'first_run_ticket price') : /^specialPrice(?:[2-5])?$/.test(name) ? 'special_show_price' : fields[name];
    return key ? DATA.playerControl[key] : name==='posterPrice' ? {min:0,max:1000,step:50} : name==='figurePrice' ? {min:0,max:10000,step:50} : null;
  }
  function applyTo(input,cinemaID) {
    const rule=forControl(input.name,cinemaID);if(!rule)return;
    for(const key of ['min','max','step'])input[key]=String(rule[key]);
  }
  function makeSlider(input) {
    if(!input.parentElement || !input.min || !input.max)return;
    const value=input.value || input.min;
    input.type='range';input.classList.add('amount-range');input.value=value;
    let wrap=input.parentElement;
    if(!wrap.classList.contains('input-wrap')) {
      wrap=document.createElement('span');wrap.className='input-wrap';
      const currency=document.createElement('span');currency.textContent='NT$';wrap.append(currency);
      input.before(wrap);wrap.append(input);
    }
    wrap.classList.add('amount-slider');
    if(input.closest('.budget-field,.food-grid,.merch-settings'))wrap.classList.add('centered-amount');
    const output=document.createElement('output');output.className='amount-value';
    input.id ||= `amount-${input.name}`;output.htmlFor=input.id;
    const label=input.closest('label');if(label)label.htmlFor=input.id;
    wrap.insertBefore(output,input);input.amountOutput=output;
    if(input.name==='ticketFull') {
      wrap.classList.add('ticket-amount');
      input.closest('.standard-ticket-grid').append(input);
      input.setAttribute('aria-label','全票票價，同步計算其他票種');
    }
    syncSlider(input);
  }
  function syncSlider(input) {
    const value=Number(input.value).toLocaleString('zh-TW');
    input.amountOutput.textContent=(input.amountOutput.parentElement.classList.contains('centered-amount')?'NT$':'')+value;
    if(input.dataset.amountUnit) {
      const unit=document.createElement('small');unit.className='amount-unit';unit.id='activation-kind';unit.textContent=`（${input.dataset.amountUnit}）`;
      input.amountOutput.append(unit);
    }
    input.setAttribute('aria-valuetext',`NT$ ${value}${input.dataset.amountUnit?'，'+input.dataset.amountUnit:''}`);
  }
  function syncSliders(form,changed) {
    if(changed)syncSlider(changed);else form.querySelectorAll('.amount-range').forEach(syncSlider);
    const total=['staffing','foodCost','maintenance','marketing','consumables'].reduce((sum,name)=>sum+Number(form.elements[name].value||0),0);
    form.querySelector('#budget-total').textContent=`NT$${total.toLocaleString('zh-TW')}`;
  }
  const DERIVED_TICKETS=Object.freeze(['ticketDiscount','ticketMorning','ticketAccessible']);
  function isDerived(name) { return DERIVED_TICKETS.includes(name); }
  function apply(form,cinemaID) {
    for(const input of form.querySelectorAll('input[type="number"]')) {
      applyTo(input,cinemaID);
      if(isDerived(input.name)) {
        input.readOnly=true;input.value='';input.title='依全票票價計算';
      } else if(forControl(input.name,cinemaID))makeSlider(input);
    }
  }
  function derive(fullPrice) {
    return {ticketDiscount:fullPrice-30,ticketMorning:fullPrice-60,ticketAccessible:fullPrice*0.5};
  }
  function updateDerived(form) {
    const full=form.elements.ticketFull;
    const ready=(!full.matches(':disabled')||full.dataset.yearLocked==='true'&&!full.closest('fieldset').disabled) && full.value!=='' && full.validity.valid;
    const prices=ready ? derive(Number(full.value)) : null;
    for(const name of DERIVED_TICKETS) {
      const input=form.elements[name];
      input.value=prices && !input.matches(':disabled') ? String(prices[name]) : '';
    }
  }
  const api={DATA,forControl,applyTo,apply,DERIVED_TICKETS,isDerived,derive,updateDerived,makeSlider,syncSliders};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CinemaParameters=api;
})(globalThis);
