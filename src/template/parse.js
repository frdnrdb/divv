import { hash } from '../helpers';

const RE_PREFIX = /@/g;
const RE_SLASH_COMMENT = /(^|\s)\/(\/|\*)/;
const RE_CONDITION = /^:?(else)?-?(if)?$/;
const RE_EVAL = /^[\s\t]{0,}\/\//;

const removePrefix = str => {
  return str.replace(RE_PREFIX, '');
};

export const parseAlias = (prop, o = {}) => {
  prop = removePrefix(prop);

  if (RE_EVAL.test(prop)) {
    o.isEval = true;
    o.token = prop.replace(RE_EVAL, '').trim();
    return o;
  }

  if (prop.startsWith('!')) {
    prop = prop.substring(1);
    o.not = true;
  }

  o.token = prop;
  if (prop.includes('.')) {
    prop = prop.split('.')[0];
  }

  if (prop.includes(']')) {
    prop = prop.replace(/\[.*/, '');
  }

  o.prop = prop;
  return o;
}

function nodeToObject(node, hasParent, hasTags) {
  const parent = node.parentElement;
  const text = node.textContent;

  if (text) {
    if (node.nodeType === 8) {
      return {
        type: 'comment',
        text
      };
    }

    if (node.nodeType === 3) {
      if (!hasParent && RE_SLASH_COMMENT.test(text)) {
        return;
      }

      const isEval = hasParent && RE_EVAL.test(text);

      const obj = {
        isTemplate: RE_PREFIX.test(text),
        isEval,
        type: 'text',
        text
      };

      isEval && parseAlias(text, obj);

      return obj;
    }
  }

  if (node.nodeType !== 1) {
    return;
  }

  const name = node.tagName.toLowerCase();

  const obj = {
    type: 'tag',
    name,
    attrs: {},
    children: [],
    events: []
  };

  const setupLoop = (arr, isBlock) => {
    obj.isLoop = true;
    obj.isBlock = isBlock;

    let [alias, , prop] = arr;

    if (alias === '{') {
      return Object.assign(obj, {
        prop: removePrefix(arr.pop()),
        alias: arr.slice(1, -2).map(str => {
          const comma = str.indexOf(',');
          if (comma !== -1) {
            str = str.substring(0, comma);
          }
          return removePrefix(str.trim());
        }),
        destructured: true
      });
    }

    Object.assign(obj, {
      prop: removePrefix(prop),
      alias: removePrefix(alias)
    });
  }

  const setupCondition = (key, rawProp, isBlock) => {
    parent._id = parent._id || hash();
    obj.condition = {
      key,
      id: parent._id
    };
    obj.isBlock = isBlock;

    obj.isLoop ? parseAlias(rawProp, obj.condition) : parseAlias(rawProp, obj);
  }

  // <else></else> won't be looped with node.attributes below
  if (name === 'else') {
    setupCondition(name, '', true);
  }

  for (const {
      name: key,
      value
    } of node.attributes) {

    if (name === 'for') {
      const attrs = Array.from(node.attributes).map(attr => attr.name);
      setupLoop(attrs, true);
      break; // tag is for
    }

    if (key === 'for') {
      setupLoop(value.split(' '));
      continue;
    }

    if (RE_CONDITION.test(name)) {
      setupCondition(name, key, true);
      break; // tag is if|else
    }

    if (RE_CONDITION.test(key)) {
      setupCondition(key, value);
      continue;
    }

    if (key.startsWith('@')) {
      const k = removePrefix(key);
      const v = removePrefix(value);
      if (k === 'html') {
        obj.text = v;
        obj.isHTML = true;
        parseAlias(value, obj);
        continue;
      }
      obj.events.push({
        func: v,
        event: k
      });
      continue;
    }

    if (value.includes('@')) {
      obj.reactiveAttrs = obj.reactiveAttrs || [];
      obj.reactiveAttrs.push({
        key,
        value
      });
      continue;
    }

    if (key === 'ref') {
      obj.ref = value;
      continue;
    }

    obj.attrs[key] = value;
  }

  for (const child of node.childNodes) {
    const o = nodeToObject(child, true);
    if (o) {
      if (o.type !== 'text' || o.isTemplate) {
        hasTags = true;
      }
      obj.children.push(o);
    }
  }

  if (!obj.condition && (!hasTags || obj.isHTML)) {
    if (!obj.isHTML) {
      obj.text = text;
    }
    delete obj.children;
  }

  if (obj.text) {
    parseAlias(obj.text, obj);
  }

  return obj;
}

export const parse = (html, root = []) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  for (const child of doc.body.childNodes) {
    const o = nodeToObject(child);
    o && root.push(o);
  }

  return root.flat();
}