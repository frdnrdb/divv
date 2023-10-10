import { int } from '../common';
import { isType } from '../helpers';
import { proxify } from '../proxy';
import { getPropNameCaseInsensitive } from './helpers';

const consolidateArray = (map, id, newItem) => {
  map[id] = map[id] || [];
    if (!map[id].some(item => item === newItem)) {
        map[id].push(newItem);    
    }
};

// --->

const conditions = {};
const conditionTriggers = {};

const addConditionTrigger = (id, func, prop, obj) => {
  conditionTriggers[prop] = conditionTriggers[prop] || {};
  conditionTriggers[prop][id] = conditions[id];
  makeProxy(obj[prop], prop, func, obj); 
};

export const addCondition = (id, func, prop, obj) => {
  if (prop) {
    consolidateArray(conditions, id, func);
    addConditionTrigger(id, func, prop, obj);
    makeProxy(obj, prop, func, obj);
  }
  func();
};

// --->

const observables = {};
const observerdArrays = {};

const makeProxy = (o, prop, func, data) => {
  if (typeof o !== 'object') {
    return;
  }

  // re-observe local changes if data.prop = set, vs data.prop.push etc
  if (isType.arr(data[prop])) {
    consolidateArray(observerdArrays, prop, func);
  }   

  if (o[int.IS_PROXY]) {
    return o[int.PROXY_OBSERVE](func);
  }
  
  proxify(o, func, getPropNameCaseInsensitive(prop, data), data);     
};

export const addObservable = (o, prop, func, data) => {
  makeProxy(o, prop, func, data); // local changes (push, pop, splice)
  consolidateArray(observables, prop, func); // global changes (prop = [])
  func();
};

// --->

let valueString;
const did = {};
export const observe = e => {        
  const { key, value, operation, data } = e;

  // if array prop is replaced, re-proxify
  if (operation === 'set' && observerdArrays[key]) {
    observerdArrays[key].forEach(func => addObservable(data[key], key, func, data));
  }

  // don't populate if value is set to the same as previous value
  valueString = JSON.stringify(value);
  if (did[key] === valueString) {
    return;
  }
  did[key] = valueString;
  
  if (observables[key]) {
    observables[key].forEach(func => func(e));
  }
  if (conditionTriggers[key]) {
    Object.values(conditionTriggers[key]).forEach(arr => arr.forEach(func => func(e)));
  }
};