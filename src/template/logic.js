import { ext, breakCharacter } from '../common';
import { isType } from '../helpers';
import { parseAlias } from './parse';
import { addObservable, addCondition } from './proxy';
import { makeFunction, getProp, replaceDotAlias, toProperCase, pushOrSet } from './helpers';

export const AddNode = (data, props, refs, divv) => {

  const makeLoop = (parent, o) => {
    const { alias, prop, destructured, isBlock, children = [] } = o;
    const { token } = toProperCase(prop, data);
    const dataRef = getProp(token, data);

    if (isBlock && !children.length) {
      return;
    }

    if (!dataRef || !isType.arr(dataRef)) {
      return;
    }

    const container = divv('span', parent);
    const subTree = isBlock ? children : [ o ];
    delete o.isLoop;

    const getTree = (o, index) => {
      const fixTree = obj => {
        if (obj.isEval && !obj.condition) {
          obj.text = makeFunction(obj.token, { ...o, index });
          delete obj.isEval;
        }
        if (obj.isTemplate) {
          obj.text = replaceDotAlias(o, obj.text, alias, destructured && token, index);
          delete obj.isTemplate;
        }
        if (obj.reactiveAttrs) {
          obj.reactiveAttrs.forEach(({ key, value }) => {
            obj.attrs[key] = replaceDotAlias(o, value, alias, destructured && token, index, obj.isEval);
          });
          delete obj.reactiveAttrs;
        }
        if (obj.condition) {
          obj.loopState = { ...o, index };
        }
        if (obj.children) {
          obj.children.forEach(fixTree);
        }
      }
      
      const tree = subTree.map(branch => JSON.parse(JSON.stringify(branch)));
      tree.forEach(fixTree);
      return tree;
    };

    const parseTree = arr => {
      arr.forEach((o, i) => {
        const tree = getTree(o, i);
        tree.forEach(branch => addNode(container, branch));
      });
    };

    const func = () => {
      container.innerHTML = '';
      parseTree(getProp(token, data));

      // update relevant refs
      Object.entries(refs).forEach(([ key, entry ]) => {
        if (Array.isArray(entry)) {
          refs[key] = entry.filter(node => node.offsetParent);
        }
      });
    };
    
    addObservable(dataRef, token, func, data);
  };

  const setConditionBlock = (parent, o) => {
    if (!o.children.length) {
      return;
    }
    delete o.isBlock;
    o.name = 'span';
    addNode(parent, o);
  };

  const separateTextNodes = (parent, o) => {
    const { type = 'text', text = '' } = o;

    const names = [];
    const escapes = [];
    const parsed = text.replace(/(\\)?@([^\s<]+)/g, (_, escaped, name) => {
      names.push((escaped ? '@' : '') + name); 
      escapes.push(escaped);
      return breakCharacter;
    });

    const parts = parsed.split(breakCharacter).flatMap(str => {
      const text = names.shift();
      const escaped = escapes.shift();
      return [
        str && { type, text: str }, 
        text && {
          ...parseAlias(text),
          type: 'text', 
          text, 
          isProp: !escaped
        }
      ];
    });
    
    return parts.filter(Boolean).forEach(o => addNode(parent, o));
  };

  const insertNode = (parent, o) => {
    const { type, name, attrs = {}, text = '' } = o;

    const args = [name || type, parent, {
      tag: name || type,
      text,
      attrs,
      passive: true  
    }];
    
    return divv(...args.filter(Boolean));
  };

  const bindAttrs = (o, node) => {
    const { reactiveAttrs } = o;
    reactiveAttrs.forEach(({ key, value, prop }) => {
      const func = () => node.setAttribute(key, replaceDotAlias(data, value));
      addObservable(data, prop, func, data);
    });
  };

  const resolveProps = str => {
    return Array.from(str.split(' ').reduce((set, str) => {
      str = str.replace(/@/g, '').trim();
      if (!str) return set;
      const [ prop ] = str.split(/\[|\./).map(str => str.replace(/^!/, ''));
      if (/[a-zA-Z]{2,}/.test(prop) && !!data[prop]) {
        set.add(prop);
      }
      return set;
    }, new Set()));        
  };

  const bindProp = (o, node) => {
    const { isEval, isHTML, token } = o;
    const prop = isEval ? resolveProps(token) : o.prop;
    const method = isEval ? makeFunction : getProp;
    const func = () => node[isHTML ? 'innerHTML' : 'textContent'] = method(token, data);
    (isType.arr(prop) ? prop : [prop]).forEach(prop => addObservable(data, prop, func, data));
  };

  const bindEvents = (events, node) => {
    events.forEach(({ func, event }) => {
      if (!props[func]) {
        return console.warn(`@${event} ${func} not declared`);
      }
      node[ext.EMIT] = node[ext.EMIT] || ((e, detail) => node.dispatchEvent(new CustomEvent(e, { detail })));

      node.addEventListener(event, e => {
        node.refs = refs;
        node.data = data;
        props[func].call(node, e);
      });
    });        
  };    

  let prevCondition = {};

  const bindCondition = (o, node) => {
    const { isEval, not, condition, token: rawToken, loopState } = o;
    const { key, id } = condition;

    // when a conditional is added on the same node as a loop initiation, eg. <div for="{ text, active } in items" if="active"></div>
    const { prop, token } = loopState && condition.prop ? condition : toProperCase(rawToken, data);

    const isElse = key === 'else';
    const method = isEval ? makeFunction : getProp;

    const toggleNode = (() => {
      const parent = node.parentElement;
      node.placeholder = divv('comment', parent);            
      return on => {
        on ? parent.insertBefore(node, node.placeholder) : node.remove();
      }
    })();

    const func = () => {
      if (key === 'if') {
        prevCondition = {};
      }

      const value = !isElse && token && method(token, loopState || data);
      const ok = not ? !value : !!value;
      const toggle = isElse ? !prevCondition.fulfilled : key === 'if' ? ok : !prevCondition.fulfilled && ok;

      condition.fulfilled = key === 'else-if' ? prevCondition.fulfilled || (!prevCondition.fulfilled && ok) : toggle;
      prevCondition = condition;

      toggleNode(toggle);
    };

    addCondition(id, func, prop, loopState || data);
  };

  const setRef = (o, node) => {
    let { ref, name } = o;
    ref = ref || node.id || (node.className && node.className.split(' ')[0]) || name;        
    if (ref) {
      pushOrSet(refs, ref, node);
    }
  };

  function addNode(parent, o) { 
    const { 
      isLoop,
      condition,
      isTemplate,
      reactiveAttrs,
      isHTML,
      isProp,
      isEval,
      isBlock,
      children = [], 
      events = []
    } = o;

    if (isLoop) {
      return makeLoop(parent, o);
    }
    if (condition && isBlock) {
      return setConditionBlock(parent, o);
    }
    if (isTemplate) {
      return separateTextNodes(parent, o);
    }        

    // --->

    const node = insertNode(parent, o);

    // ---> 

    if (reactiveAttrs) {
      bindAttrs(o, node);
    }
    if (isHTML || isProp || (isEval && !condition)) {
      bindProp(o, node);
    }
    if (condition) {
      bindCondition(o, node)
    }

    // --->

    setRef(o, node);
    bindEvents(events, node);

    // --->
    
    children.forEach(child => addNode(node, child));
    return node;
  };

  return addNode;
};