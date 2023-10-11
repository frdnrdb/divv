import { isType } from '../helpers';

const fulfill = val => typeof val === 'function' ? val() : val;

export const makeFunction = (str, o) => {
  try {
    return fulfill(new Function(...Object.keys(o), `return ${str.trim()}`).apply(null, Object.values(o)));
  }
  catch(err) {
    console.warn(err.message, str);
    return str;
  }
};

export const getProp = (str, o) => {
  if (!isType.obj(o) || !isType.str(str) || !str.length) return str;

  const arr = str.split(/[\[\]\?\.]/).filter(Boolean); // some.array[3]?.prop => some array 3 prop

  for (let key of arr) {
    if (o[key] === undefined) {
      return;
    }
    o = o[key];
  }
  return fulfill(o);
};

export const replaceDotAlias = (o, str, loopAlias = '', loopProp, index, isEval) => {
  const re = loopAlias 
    ? new RegExp(`@${loopProp ? `(${loopAlias.join('|')})` : `${loopAlias}(?:\\.)?([a-z0-9\\[\\].]+)?`}`, 'gi') 
    : /@([a-z0-9\[\].]+)/gi;
  return str.replace(re, (_, dotAlias) => {
    if (dotAlias) {
      if (loopProp && dotAlias === 'index') {
        return index;
      }
      if (!isType.obj(o)) {
        return o;
      }
      return (isEval ? makeFunction : getProp)(dotAlias, o);
    }
    return fulfill(o);
  });
};

// --->

export const pushOrSet = (o, ref, node) => {
  if (o[ref]) {
    if (!isType.arr(o[ref])) {
        o[ref] = [ o[ref] ];
    }
    o[ref].push(node);
    return;
  }
  o[ref] = node;
};

export const getPropNameCaseInsensitive = (prop, o) => {
  return !!o[prop] ? prop : Object.keys(o).find(key => key.toLowerCase() === prop);
};

// translate case insensitive attr props to proper case

export const toProperCase = (str = '', o) => {
  let obj = o;
  let mainProp;

  const props = str.split('.').reduce((props, part) => {
    if (!part.trim()) {
      return props;
    }
    const [ word ] = part.match(/[^\s\[\]]+/);
    const prop = getPropNameCaseInsensitive(word, obj) || word; // edge case – return part if used before defined on data object by user

    if (!mainProp) {
      mainProp = prop;
    }

    props.push(part.replace(word, prop));

    if (typeof obj !== 'object') {
      return props;
    }
    obj = obj[prop];
    return props;
  }, []);      
  
  return { prop: mainProp, token: props.join('.') };
};