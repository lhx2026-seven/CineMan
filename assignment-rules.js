'use strict';
// Shared, dependency-free constraints from the three supplied Excel tables.
(function(root) {
  const TYPES = ['A', 'B', 'C', 'D', 'EXTRA'];
  const field = (type, name) => `screens type=${type}\n${name}`;
  const VERSION = 'allocation-v1';
  function chance(value, screens) {
    const probability = value == null ? 0 : value === 'normal' ? 1 / screens : value;
    if (typeof probability !== 'number' || !Number.isFinite(probability) || probability < 0 || probability > 1) throw Error('Invalid chance: ' + value);
    return probability;
  }
  function normalize(row) {
    const ranges = Object.fromEntries(TYPES.map(type => [type, {
      min: row[field(type, 'min')], max: row[field(type, 'max')],
    }]));
    if (!Number.isInteger(row.screens) || row.screens < 1) throw Error('Invalid screen count');
    for (const type of TYPES) {
      const {min, max} = ranges[type];
      if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max < min) {
        throw Error(`Invalid ${type} range: ${row.cinemaID}/${row.screens}`);
      }
    }
    return {cinemaID:row.cinemaID, screens:row.screens, ranges,
      minSeats:row['screens size total\nmin'] ?? 0,
      chanceA:chance(row[field('A', 'chance')], row.screens),
      chanceNon500:chance(row['screens type=A\nsize=non-500\nchance'], row.screens),
      chanceD20:chance(row['screens type=D\nsize=20\nchance'], row.screens)};
  }
  function availableScreens(rule, database) {
    return database.screens.filter(screen => {
      if (screen.type === 'A' && rule.chanceNon500 === 0 && screen.size !== 500) return false;
      if (screen.type === 'A' && rule.chanceNon500 === 1 && screen.size === 500) return false;
      if (screen.type === 'D' && rule.chanceD20 === 0 && screen.size === 20) return false;
      if (screen.type === 'D' && rule.chanceD20 === 1 && screen.size !== 20) return false;
      return true;
    });
  }
  function extraCombinations(count, options) {
    const result = [];
    function visit(index, remaining, chosen) {
      if (index === options.length) { if (!remaining) result.push(chosen); return; }
      const screen = options[index];
      for (let n=0; n<=Math.min(remaining, screen.max_per_cinema ?? remaining); n++) {
        visit(index + 1, remaining - n, [...chosen, ...Array(n).fill(screen)]);
      }
    }
    visit(0, count, []);
    return result;
  }
  function seatBounds(counts, rule, database) {
    const available = availableScreens(rule, database);
    let min = 0, max = 0;
    for (const type of TYPES.filter(type => type !== 'EXTRA')) {
      if (!counts[type]) continue;
      const sizes = available.filter(screen => screen.type === type).map(screen => screen.size);
      if (!sizes.length) return null;
      min += counts[type] * Math.min(...sizes);
      max += counts[type] * Math.max(...sizes);
    }
    const extraTotals = extraCombinations(counts.EXTRA, available.filter(s => s.type === 'EXTRA'))
      .map(combo => combo.reduce((sum, screen) => sum + screen.size, 0));
    if (!extraTotals.length) return null;
    return {min:min + Math.min(...extraTotals), max:max + Math.max(...extraTotals)};
  }
  function enumerateCounts(row, database) {
    const rule = normalize(row), result = [];
    function visit(index, remaining, counts) {
      const type = TYPES[index], range = rule.ranges[type];
      for (let n=range.min; n<=Math.min(range.max, remaining); n++) {
        if (type === 'A' && ((rule.chanceA === 0 && n > 0) || (rule.chanceA === 1 && n === 0))) continue;
        const next = {...counts, [type]:n};
        if (index < TYPES.length-1) visit(index+1, remaining-n, next);
        else if (remaining === n) {
          const bounds = seatBounds(next, rule, database);
          if (bounds && bounds.max >= rule.minSeats) result.push({counts:next, seatBounds:bounds});
        }
      }
    }
    visit(0, rule.screens, {});
    return result;
  }
  const townRows=new WeakMap();
  function locationRule(row,locationID){
    if(locationID!=='LOC08')return row;
    if(!townRows.has(row))townRows.set(row,{...row,[field('EXTRA','min')]:0,[field('EXTRA','max')]:0});
    return townRows.get(row);
  }
  function validateAssignment(assignment, database, {allowLegacyTownCount=false}={}) {
    const errors = [];
    if(assignment.locationID==='LOC08'&&assignment.screens?.length>4&&!allowLegacyTownCount)errors.push('LOC08 allows at most 4 screens');
    const row = database.cinemas.find(row => row.cinemaID === assignment.cinemaID && row.screens === assignment.screens?.length);
    if (!row) return ['No matching cinema/screen-count rule'];
    const rule = normalize(locationRule(row,assignment.locationID)), counts = Object.fromEntries(TYPES.map(type => [type, 0]));
    const repeats = new Map();
    let total = 0;
    for (const screen of assignment.screens) {
      const known = availableScreens(rule, database).find(s => s.type === screen.type && s.name === screen.name && s.size === screen.size);
      if (!known) { errors.push('Unknown or excluded screen: ' + screen.name); continue; }
      counts[screen.type]++;
      total += screen.size;
      const key = `${screen.type}/${screen.name}`;
      repeats.set(key, (repeats.get(key) || 0) + 1);
      if (known.max_per_cinema != null && repeats.get(key) > known.max_per_cinema) errors.push('Exceeded limit: ' + screen.name);
    }
    for (const type of TYPES) {
      if (counts[type] < rule.ranges[type].min || counts[type] > rule.ranges[type].max) errors.push('Out of range: ' + type);
    }
    if (rule.chanceA === 0 && counts.A || rule.chanceA === 1 && !counts.A) errors.push('A probability constraint');
    if (total < rule.minSeats) errors.push('Below minimum total seats');
    if (assignment.totalSeats !== total) errors.push('Incorrect seat sum');
    if (assignment.screenCount != null && assignment.screenCount !== assignment.screens.length) errors.push('Incorrect screen count');
    if (assignment.counts && TYPES.some(type => assignment.counts[type] !== counts[type])) errors.push('Incorrect type totals');
    return errors;
  }
  function seededRandom(seed) {
    let state = 2166136261;
    for (const char of String(seed)) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
    return () => {
      state = (state + 0x6D2B79F5) >>> 0;
      let value = Math.imul(state ^ state >>> 15, 1 | state);
      value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }
  function freshSeed() {
    if (globalThis.crypto?.getRandomValues) return Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16).padStart(8, '0')).join('');
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
  function weighted(items, weight, random) {
    const total = items.reduce((sum, item) => sum + weight(item), 0);
    if (!(total > 0)) throw Error('No feasible weighted outcomes');
    let target = random() * total, lastPositive;
    for (const item of items) {
      const value = weight(item);
      if (!(value > 0)) continue;
      lastPositive = item;
      target -= value;
      if (target < 0) return item;
    }
    return lastPositive;
  }
  function seatOptions(type, rule, database) {
    const options = database.screens.filter(s => s.type === type);
    if (!options.length) return [];
    if (type === 'A') {
      const large = options.filter(s => s.size !== 500).length;
      return options.map(screen => ({screen, weight:screen.size === 500 ? 1-rule.chanceNon500 : rule.chanceNon500 / large})).filter(o => o.weight > 0);
    }
    if (type === 'D') {
      return options.map(screen => ({screen, weight:screen.size === 20 ? rule.chanceD20 : 1-rule.chanceD20})).filter(o => o.weight > 0);
    }
    return options.map(screen => ({screen, weight:1/options.length}));
  }
  // Exact conditional seat sampling: weight each choice by the mass of its valid
  // completions. No unbounded rejection loop or fallback outside database bounds.
  function seatSampler(counts, rule, database) {
    const slots = TYPES.flatMap(type => Array(counts[type]).fill(type));
    const options = Object.fromEntries(TYPES.map(type => [type, seatOptions(type, rule, database)]));
    const extras = database.screens.filter(s => s.type === 'EXTRA');
    const memo = new Map();
    function choices(index, used) {
      return options[slots[index]].filter(({screen}) => screen.max_per_cinema == null ||
        (used[extras.indexOf(screen)] || 0) < screen.max_per_cinema);
    }
    function nextUsed(screen, used) {
      if (screen.type !== 'EXTRA') return used;
      const next = used.slice(), index = extras.indexOf(screen);
      next[index] = (next[index] || 0) + 1;
      return next;
    }
    function mass(index, needed, used) {
      if (index === slots.length) return needed <= 0 ? 1 : 0;
      const key = `${index}/${needed}/${used.join(',')}`;
      if (memo.has(key)) return memo.get(key);
      const result = choices(index, used).reduce((sum, {screen, weight}) => sum + weight *
        mass(index+1, Math.max(0, needed-screen.size), nextUsed(screen, used)), 0);
      memo.set(key, result);
      return result;
    }
    const validMass = mass(0, rule.minSeats, Array(extras.length).fill(0));
    return {validMass, sample(random) {
      const screens = []; let needed = rule.minSeats, used = Array(extras.length).fill(0);
      for (let index=0; index<slots.length; index++) {
        const {screen} = weighted(choices(index, used), option => option.weight *
          mass(index+1, Math.max(0, needed-option.screen.size), nextUsed(option.screen, used)), random);
        screens.push({...screen});
        needed = Math.max(0, needed-screen.size); used = nextUsed(screen, used);
      }
      for (let i=screens.length-1; i>0; i--) { const j=Math.floor(random()*(i+1)); [screens[i],screens[j]]=[screens[j],screens[i]]; }
      return screens;
    }};
  }
  const modelCache = new WeakMap();
  function model(row, database) {
    let cache = modelCache.get(database);
    if (!cache) { cache = new WeakMap(); modelCache.set(database, cache); }
    if (cache.has(row)) return cache.get(row);
    const rule = normalize(row);
    const combinations = enumerateCounts(row, database).map(choice => ({...choice, sampler:seatSampler(choice.counts, rule, database)}))
      .filter(choice => choice.sampler.validMass > 0);
    if (!combinations.length) throw Error(`No valid assignment: ${rule.cinemaID}/${rule.screens}`);
    const withA = combinations.filter(choice => choice.counts.A > 0), withoutA = combinations.filter(choice => !choice.counts.A);
    const effectiveA = !withA.length ? 0 : !withoutA.length ? 1 : rule.chanceA;
    const result = {rule, combinations, withA, withoutA, effectiveA};
    cache.set(row, result);
    return result;
  }
  const fingerprintCache = new WeakMap();
  function fingerprint(database) {
    if (fingerprintCache.has(database)) return fingerprintCache.get(database);
    let hash = 2166136261;
    for (const c of JSON.stringify({cinemas:database.cinemas,screens:database.screens})) hash = Math.imul(hash ^ c.charCodeAt(0),16777619) >>> 0;
    const result = hash.toString(16).padStart(8,'0');
    fingerprintCache.set(database, result);
    return result;
  }
  function generate(database, cinemaID, seed, screenCount = null, locationID = null) {
    if (typeof seed !== 'string' || !seed.length || seed.length > 256) throw Error('Seed must contain 1–256 characters');
    const rows = database.cinemas.filter(row => row.cinemaID === cinemaID && (screenCount == null || row.screens === screenCount) && (locationID!=='LOC08'||row.screens<=4));
    if (!rows.length) throw Error('Unknown cinema or unavailable screen count');
    const random = seededRandom(seed);
    const row = rows[Math.floor(random()*rows.length)];
    const current = model(locationRule(row,locationID), database);
    const group = random() < current.effectiveA ? current.withA : current.withoutA;
    const choice = group[Math.floor(random()*group.length)];
    const screens = choice.sampler.sample(random);
    const assignment = {version:VERSION, dataVersion:fingerprint(database), cinemaID, seed,
      screenCount:screens.length, totalSeats:screens.reduce((sum,screen)=>sum+screen.size,0),
      counts:{...choice.counts}, screens,
      probabilities:{aConfigured:current.rule.chanceA, aEffective:current.effectiveA,
        aNon500:current.rule.chanceNon500, d20:current.rule.chanceD20},
      constraints:{minSeats:current.rule.minSeats, ranges:current.rule.ranges}};
    if(locationID)assignment.locationID=locationID;
    const errors = validateAssignment(assignment, database);
    if (errors.length) throw Error(errors.join('; '));
    return assignment;
  }
  const api = {VERSION, TYPES, chance, normalize, availableScreens, extraCombinations, seatBounds, enumerateCounts,
    validateAssignment, seededRandom, freshSeed, fingerprint, model, generate};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CinemaRules = api;
})(globalThis);
