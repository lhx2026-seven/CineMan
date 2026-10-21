'use strict';
(function(root) {
  const DB_NAME = 'CineMan', DB_VERSION = 1, SAVE_VERSION = 1;
  let opening;
  const listeners = new Set();
  let channel;
  try { channel = new BroadcastChannel('cineman-autosave');channel.onmessage = () => listeners.forEach(fn=>fn()); } catch { /* Focus refresh also works without BroadcastChannel. */ }
  function notify() { listeners.forEach(fn=>fn());channel?.postMessage('changed'); }
  function open() {
    if (opening) return opening;
    opening = new Promise((resolve,reject)=>{
      let request, settled = false;
      const fail = error => { if(settled)return;settled=true;clearTimeout(timeout);reject(error); };
      const timeout = setTimeout(()=>fail(Error('存檔資料庫暫時無法開啟')),4000);
      try { request = root.indexedDB.open(DB_NAME,DB_VERSION); } catch(error) { fail(error);return; }
      request.onupgradeneeded = () => {
        for(const name of ['preferences','saves'])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name,{keyPath:'key'});
      };
      request.onerror = () => fail(request.error || Error('無法開啟存檔資料庫'));
      request.onblocked = () => fail(Error('存檔資料庫更新受其他分頁阻擋'));
      request.onsuccess = () => {
        if(settled){request.result.close();return;}settled=true;clearTimeout(timeout);
        const db=request.result;db.onversionchange=()=>{db.close();opening=null;};resolve(db);
      };
    }).catch(error=>{opening=null;throw error;});
    return opening;
  }
  async function read(store,key) {
    const db=await open();return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,'readonly'),request=tx.objectStore(store).get(key);
      const timeout=setTimeout(()=>{reject(Error('讀取存檔逾時'));try{tx.abort();}catch{}},4000);
      tx.oncomplete=()=>{clearTimeout(timeout);resolve(request.result);};
      tx.onabort=tx.onerror=()=>{clearTimeout(timeout);reject(tx.error||Error('讀取存檔失敗'));};
    });
  }
  function valid(record) {
    return record?.version===SAVE_VERSION && ['C01','C02','C03','C04','C05'].includes(record.cinemaID) &&
      typeof record.cinemaName==='string' && typeof record.runId==='string' && record.runId.length>0 && record.runId.length<=256 &&
      Number.isInteger(record.year) && record.year>0 && Number.isInteger(record.week) && record.week>=1 && record.week<=50 &&
      record.values && typeof record.values==='object' && !Array.isArray(record.values) &&
      record.allocation?.cinemaID===record.cinemaID && record.allocation?.seed===record.runId && Array.isArray(record.allocation.screens);
  }
  async function list() {
    const db=await open();
    const records=await new Promise((resolve,reject)=>{
      const tx=db.transaction('saves','readonly'),request=tx.objectStore('saves').getAll();
      tx.oncomplete=()=>resolve(request.result);tx.onabort=tx.onerror=()=>reject(tx.error||Error('讀取存檔失敗'));
    });
    if(records.some(record=>!valid(record)))throw Error('存檔格式不支援或已損壞');
    const runs=new Map();
    records.sort((a,b)=>(b.savedAt||0)-(a.savedAt||0)).forEach(record=>{if(!runs.has(record.runId))runs.set(record.runId,record);});
    return [...runs.values()];
  }
  async function getLatest() { return (await list())[0] || null; }
  async function getByRun(runId) {
    const [current,legacy]=await Promise.all([read('saves',runId),read('saves','latest')]);
    const record=current || (legacy?.runId===runId ? legacy : null);
    if(record && !valid(record))throw Error('存檔格式不支援或已損壞');
    return record;
  }
  async function clear() {
    const db=await open();await new Promise((resolve,reject)=>{
      const tx=db.transaction('saves','readwrite');tx.objectStore('saves').clear();
      tx.oncomplete=()=>{try{root.sessionStorage.removeItem(HANDOFF_KEY);}catch{}resolve();};tx.onerror=tx.onabort=()=>reject(tx.error||Error('清空紀錄失敗'));
    });notify();
  }
  async function getSettings() { const pref=await read('preferences','autoSave');return {enabled:pref?.enabled===true}; }
  async function setEnabled(enabled) {
    const db=await open();await new Promise((resolve,reject)=>{
      const tx=db.transaction(['preferences','saves'],'readwrite');
      tx.objectStore('preferences').put({key:'autoSave',enabled:!!enabled});
      tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error||Error('更新自動存檔設定失敗'));
    });notify();
  }
  async function save(snapshot) {
    const record={...snapshot,key:snapshot.runId,version:SAVE_VERSION,savedAt:Date.now()};
    if(!valid(record))throw Error('無法保存不完整的遊戲狀態');
    const db=await open();let written=false,writeError;
    await new Promise((resolve,reject)=>{
      // Preference and checkpoint share one transaction, so an OFF setting in
      // another tab cannot be bypassed by a stale cached preference.
      const tx=db.transaction(['preferences','saves'],'readwrite');
      const pref=tx.objectStore('preferences').get('autoSave');
      pref.onsuccess=()=>{try{if(pref.result?.enabled===true){const store=tx.objectStore('saves');store.put(record);const legacy=store.get('latest');legacy.onsuccess=()=>{if(legacy.result?.runId===record.runId)store.delete('latest');};written=true;}}catch(error){writeError=error;tx.abort();}};
      tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(writeError||tx.error||Error('自動存檔失敗'));
    });if(written)notify();return written;
  }
  const HANDOFF_KEY='cineman.navigationCheckpoint';
  function stageNavigation(snapshot) {
    if(!valid({...snapshot,version:SAVE_VERSION}))return false;
    try { root.sessionStorage.setItem(HANDOFF_KEY,JSON.stringify(snapshot));return true; } catch { return false; }
  }
  async function flushNavigation() {
    let raw;
    try {raw=root.sessionStorage.getItem(HANDOFF_KEY);} catch {return false;}
    if(!raw)return false;
    const snapshot=JSON.parse(raw);
    // save() checks the actual preference inside its atomic transaction.
    const written=await save(snapshot);
    if(root.sessionStorage.getItem(HANDOFF_KEY)===raw)root.sessionStorage.removeItem(HANDOFF_KEY);
    return written;
  }
  root.CinemaSave={DB_NAME,SAVE_VERSION,getSettings,setEnabled,getLatest,getByRun,list,clear,save,stageNavigation,flushNavigation,
    label:record=>`${record.cinemaName} ${record.year}年${record.week}週`,
    subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}};
})(globalThis);
