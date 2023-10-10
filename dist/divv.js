const int = {
  PROPS: Symbol("props"),
  ROOT: Symbol("root"),
  OBSERVER: Symbol("observer"),
  EMITTER: Symbol("emitter"),
  INSERTED_EMITTER: Symbol("inserted-emitter"),
  IS_PROXY: Symbol("isProxy"),
  PROXY_OBSERVE: Symbol("proxyObserve")
};
const ext = {
  EMIT: "emit",
  CHILDREN: "_children",
  STYLESHEET: "_stylesheet",
  ID: "_id"
};
const breakCharacter = "χ";
const isType = {
  func: (o) => typeof o === "function",
  str: (o) => typeof o === "string",
  obj: (o) => typeof o === "object",
  arr: Array.isArray
};
const hash = () => Math.random().toString(32).substring(2);
const flatten = (target) => {
  return isType.obj(target) ? isType.arr(target) ? [...target] : { ...target } : target;
};
const deepProxy = (object, callback) => {
  for (let prop in object) {
    if (Object.prototype.hasOwnProperty.call(object, prop) && object[prop] && isType.obj(object[prop])) {
      proxify(object[prop], callback, prop, object);
    }
  }
};
function proxyWrapper(method, object, callback, shallow) {
  if (object[int.IS_PROXY]) {
    return object;
  }
  const callbackStack = [callback];
  callback = (o) => callbackStack.forEach((fn) => fn(o));
  const proxy = method(object, callback);
  object[int.IS_PROXY] = true;
  object[int.PROXY_OBSERVE] = (cb) => {
    !callbackStack.some((fn) => fn === cb) && callbackStack.push(cb);
  };
  !shallow && deepProxy(object, callback);
  return proxy;
}
function objectProxy(object, callback) {
  return new Proxy(object, {
    get(target, name, receiver) {
      if (name === int.IS_PROXY) {
        return true;
      }
      return Reflect.get(target, name, receiver);
    },
    set: function(target, name, value, receiver) {
      const oldValue = flatten(target[name]);
      Reflect.set(target, name, value, receiver);
      callback({
        key: name,
        value,
        //: flatten(value),
        oldValue,
        operation: "set",
        data: receiver.valueOf()
      });
      return true;
    },
    deleteProperty(target, name) {
      const oldValue = target[name];
      delete target[name];
      callback({
        key: name,
        value: void 0,
        oldValue,
        operation: "delete",
        data: target
      });
      return true;
    }
  });
}
function arrayProxy(object, callback) {
  const meta = (() => {
    let arrayOperation;
    let oldValue;
    return {
      skip: (target, name) => {
        const index = Number(name);
        const length = target.length - 1;
        if (/(un)?shift|push|pop/.test(arrayOperation)) {
          if (!isNaN(index))
            return true;
          oldValue = void 0;
        }
        if (arrayOperation === "sort" && index !== length) {
          return true;
        }
      },
      old: () => oldValue,
      method: (target, name) => {
        if (!name)
          return arrayOperation;
        if (isType.str(name) && /push|pop|(un)?shift|splice|sort/.test(name)) {
          arrayOperation = name;
        }
        if (/(un)?shift|push|pop/.test(arrayOperation) && !oldValue) {
          oldValue = [...target];
        }
      }
    };
  })();
  return new Proxy(object, {
    get(target, name, receiver) {
      if (name === int.IS_PROXY) {
        return true;
      }
      meta.method(target, name);
      return Reflect.get(target, name, receiver);
    },
    set: function(target, name, value, receiver) {
      const oldValue = meta.old() || flatten(target);
      Reflect.set(target, name, value, receiver);
      if (meta.skip(target, name) || oldValue === value) {
        return true;
      }
      callback({
        key: name,
        value: flatten(target),
        oldValue,
        operation: meta.method(),
        meta: meta.isArray && {
          item: target[name],
          index: name
        },
        data: receiver.valueOf()
      });
      return true;
    }
  });
}
function proxify(value, callback, prop, source, shallow) {
  if (!value || !isType.obj(value))
    return value;
  const proxyMethod = isType.arr(value) ? arrayProxy : objectProxy;
  const proxy = proxyWrapper(proxyMethod, value, callback, shallow);
  if (prop && source)
    source[prop] = proxy;
  return proxy;
}
const RE_PREFIX = /@/g;
const RE_SLASH_COMMENT = /(^|\s)\/(\/|\*)/;
const RE_CONDITION = /^:?(else)?-?(if)?$/;
const RE_EVAL = /^[\s\t]{0,}\/\//;
const removePrefix = (str) => {
  return str.replace(RE_PREFIX, "");
};
const parseAlias = (prop, o = {}) => {
  prop = removePrefix(prop);
  if (RE_EVAL.test(prop)) {
    o.isEval = true;
    o.token = prop.replace(RE_EVAL, "").trim();
    return o;
  }
  if (prop.startsWith("!")) {
    prop = prop.substring(1);
    o.not = true;
  }
  o.token = prop;
  if (prop.includes(".")) {
    prop = prop.split(".")[0];
  }
  if (prop.includes("]")) {
    prop = prop.replace(/\[.*/, "");
  }
  o.prop = prop;
  return o;
};
function nodeToObject(node, hasParent, hasTags) {
  const parent = node.parentElement;
  const text = node.textContent;
  if (text) {
    if (node.nodeType === 8) {
      return {
        type: "comment",
        text
      };
    }
    if (node.nodeType === 3) {
      if (!hasParent && RE_SLASH_COMMENT.test(text)) {
        return;
      }
      const isEval = hasParent && RE_EVAL.test(text);
      const obj2 = {
        isTemplate: RE_PREFIX.test(text),
        isEval,
        type: "text",
        text
      };
      isEval && parseAlias(text, obj2);
      return obj2;
    }
  }
  if (node.nodeType !== 1) {
    return;
  }
  const name = node.tagName.toLowerCase();
  const obj = {
    type: "tag",
    name,
    attrs: {},
    children: [],
    events: []
  };
  const setupLoop = (arr, isBlock) => {
    obj.isLoop = true;
    obj.isBlock = isBlock;
    let [alias, , prop] = arr;
    if (alias === "{") {
      return Object.assign(obj, {
        prop: removePrefix(arr.pop()),
        alias: arr.slice(1, -2).map((str) => {
          const comma = str.indexOf(",");
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
  };
  const setupCondition = (key, rawProp, isBlock) => {
    parent._id = parent._id || hash();
    obj.condition = {
      key,
      id: parent._id
    };
    obj.isBlock = isBlock;
    obj.isLoop ? parseAlias(rawProp, obj.condition) : parseAlias(rawProp, obj);
  };
  if (name === "else") {
    setupCondition(name, "", true);
  }
  for (const {
    name: key,
    value
  } of node.attributes) {
    if (name === "for") {
      const attrs = Array.from(node.attributes).map((attr) => attr.name);
      setupLoop(attrs, true);
      break;
    }
    if (key === "for") {
      setupLoop(value.split(" "));
      continue;
    }
    if (RE_CONDITION.test(name)) {
      setupCondition(name, key, true);
      break;
    }
    if (RE_CONDITION.test(key)) {
      setupCondition(key, value);
      continue;
    }
    if (key.startsWith("@")) {
      const k = removePrefix(key);
      const v = removePrefix(value);
      if (k === "html") {
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
    if (value.includes("@")) {
      obj.reactiveAttrs = obj.reactiveAttrs || [];
      obj.reactiveAttrs.push({
        key,
        value
      });
      continue;
    }
    if (key === "ref") {
      obj.ref = value;
      continue;
    }
    obj.attrs[key] = value;
  }
  for (const child of node.childNodes) {
    const o = nodeToObject(child, true);
    if (o) {
      if (o.type !== "text" || o.isTemplate) {
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
const parse = (html, root = []) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  for (const child of doc.body.childNodes) {
    const o = nodeToObject(child);
    o && root.push(o);
  }
  return root.flat();
};
const consolidateArray = (map, id, newItem) => {
  map[id] = map[id] || [];
  if (!map[id].some((item) => item === newItem)) {
    map[id].push(newItem);
  }
};
const conditions = {};
const conditionTriggers = {};
const addConditionTrigger = (id, func, prop, obj) => {
  conditionTriggers[prop] = conditionTriggers[prop] || {};
  conditionTriggers[prop][id] = conditions[id];
  makeProxy(obj[prop], prop, func);
};
const addCondition = (id, func, prop, obj) => {
  if (prop) {
    consolidateArray(conditions, id, func);
    addConditionTrigger(id, func, prop, obj);
    makeProxy(obj, prop, func, obj);
  }
  func();
};
const observables = {};
const observerdArrays = {};
const makeProxy = (o, prop, func, data) => {
  if (typeof o !== "object") {
    return;
  }
  if (isType.arr(o[prop])) {
    consolidateArray(observerdArrays, prop, func);
  }
  if (o[int.IS_PROXY]) {
    return o[int.PROXY_OBSERVE](func);
  }
  proxify(o, func, getPropNameCaseInsensitive(prop, data), data);
};
const addObservable = (o, prop, func, data) => {
  makeProxy(o, prop, func, data);
  consolidateArray(observables, prop, func);
  func();
};
let valueString;
const did = {};
const observe = (e) => {
  const { key, value, operation, data } = e;
  if (operation === "set" && observerdArrays[key]) {
    observerdArrays[key].forEach((func) => addObservable(data[key], key, func));
  }
  valueString = JSON.stringify(value);
  if (did[key] === valueString) {
    return;
  }
  did[key] = valueString;
  if (observables[key]) {
    observables[key].forEach((func) => func(e));
  }
  if (conditionTriggers[key]) {
    Object.values(conditionTriggers[key]).forEach((arr) => arr.forEach((func) => func(e)));
  }
};
const fulfill = (val) => typeof val === "function" ? val() : val;
const makeFunction = (str, o) => {
  try {
    return fulfill(new Function(...Object.keys(o), `return ${str.trim()}`).apply(null, Object.values(o)));
  } catch (err) {
    console.warn(err.message);
    return "";
  }
};
const getProp = (str, o) => {
  if (typeof o !== "object" || typeof str !== "string" || !str.length)
    return;
  const arr = str.split(/[\[\]\?\.]/).filter(Boolean);
  for (let key of arr) {
    if (o[key] === void 0) {
      return;
    }
    o = o[key];
  }
  return fulfill(o);
};
const replaceDotAlias = (o, str, loopAlias = "", loopProp, index, isEval) => {
  const re = loopAlias ? new RegExp(`@${loopProp ? `(${loopAlias.join("|")})` : `${loopAlias}(?:\\.)?([a-z0-9\\[\\].]+)?`}`, "gi") : /@([a-z0-9\[\].]+)/gi;
  return str.replace(re, (_, dotAlias) => {
    if (dotAlias) {
      if (dotAlias === "index")
        return index;
      return (isEval ? makeFunction : getProp)(dotAlias, o);
    }
    return fulfill(o);
  });
};
const pushOrSet = (o, ref, node) => {
  if (o[ref]) {
    if (!isType.arr(o[ref])) {
      o[ref] = [o[ref]];
    }
    o[ref].push(node);
    return;
  }
  o[ref] = node;
};
const getPropNameCaseInsensitive$1 = (prop, o) => {
  return !!o[prop] ? prop : Object.keys(o).find((key) => key.toLowerCase() === prop);
};
const toProperCase = (str = "", o) => {
  let obj = o;
  let mainProp;
  const props = str.split(".").reduce((props2, part) => {
    if (!part.trim()) {
      return props2;
    }
    const [word] = part.match(/[^\s\[\]]+/);
    const prop = getPropNameCaseInsensitive$1(word, obj) || word;
    if (!mainProp) {
      mainProp = prop;
    }
    props2.push(part.replace(word, prop));
    if (typeof obj !== "object") {
      return props2;
    }
    obj = obj[prop];
    return props2;
  }, []);
  return { prop: mainProp, token: props.join(".") };
};
const AddNode = (data, props, divv2) => {
  props.refs = [];
  const refs = props.refs;
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
    const container = divv2("span", parent);
    const subTree = isBlock ? children : [o];
    delete o.isLoop;
    const getTree = (o2, index) => {
      const fixTree = (obj) => {
        if (obj.isEval && !obj.condition) {
          obj.text = makeFunction(obj.token, { ...o2, index });
          delete obj.isEval;
        }
        if (obj.isTemplate) {
          obj.text = replaceDotAlias(o2, obj.text, alias, destructured && token, index);
          delete obj.isTemplate;
        }
        if (obj.reactiveAttrs) {
          obj.reactiveAttrs.forEach(({ key, value }) => {
            obj.attrs[key] = replaceDotAlias(o2, value, alias, destructured && token, index, obj.isEval);
          });
          delete obj.reactiveAttrs;
        }
        if (obj.condition) {
          obj.loopState = { ...o2, index };
        }
        if (obj.children) {
          obj.children.forEach(fixTree);
        }
      };
      const tree = subTree.map((branch) => JSON.parse(JSON.stringify(branch)));
      tree.forEach(fixTree);
      return tree;
    };
    const parseTree = (arr) => {
      arr.forEach((o2, i) => {
        const tree = getTree(o2, i);
        tree.forEach((branch) => addNode(container, branch));
      });
    };
    const func = () => {
      container.innerHTML = "";
      parseTree(getProp(token, data));
      Object.entries(refs).forEach(([key, entry]) => {
        if (Array.isArray(entry)) {
          refs[key] = entry.filter((node) => node.offsetParent);
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
    o.name = "span";
    addNode(parent, o);
  };
  const separateTextNodes = (parent, o) => {
    const { type = "text", text = "" } = o;
    const names = [];
    const escapes = [];
    const parsed = text.replace(/(\\)?@([^\s<]+)/g, (_, escaped, name) => {
      names.push((escaped ? "@" : "") + name);
      escapes.push(escaped);
      return breakCharacter;
    });
    const parts = parsed.split(breakCharacter).flatMap((str) => {
      const text2 = names.shift();
      const escaped = escapes.shift();
      return [
        str && { type, text: str },
        text2 && {
          ...parseAlias(text2),
          type: "text",
          text: text2,
          isProp: !escaped
        }
      ];
    });
    return parts.filter(Boolean).forEach((o2) => addNode(parent, o2));
  };
  const insertNode = (parent, o) => {
    const { type, name, attrs = {}, text = "" } = o;
    const args = [name || type, parent, {
      tag: name || type,
      text,
      attrs,
      passive: true
    }];
    return divv2(...args.filter(Boolean));
  };
  const bindAttrs = (o, node) => {
    const { reactiveAttrs } = o;
    reactiveAttrs.forEach(({ key, value, prop }) => {
      const func = () => node.setAttribute(key, replaceDotAlias(data, value));
      addObservable(data, prop, func, data);
    });
  };
  const resolveProps = (str) => {
    return Array.from(str.split(" ").reduce((set, str2) => {
      str2 = str2.replace(/@/g, "").trim();
      if (!str2)
        return set;
      const [prop] = str2.split(/\[|\./).map((str3) => str3.replace(/^!/, ""));
      if (/[a-zA-Z]{2,}/.test(prop) && !!data[prop]) {
        set.add(prop);
      }
      return set;
    }, /* @__PURE__ */ new Set()));
  };
  const bindProp = (o, node) => {
    const { isEval, isHTML, token } = o;
    const prop = isEval ? resolveProps(token) : o.prop;
    const method = isEval ? makeFunction : getProp;
    const func = () => node[isHTML ? "innerHTML" : "textContent"] = method(token, data);
    (isType.arr(prop) ? prop : [prop]).forEach((prop2) => addObservable(data, prop2, func, data));
  };
  const bindEvents = (events, node) => {
    events.forEach(({ func, event }) => {
      if (!props[func]) {
        return console.warn(`@${event} ${func} not declared`);
      }
      node[ext.EMIT] = node[ext.EMIT] || ((e, detail) => node.dispatchEvent(new CustomEvent(e, { detail })));
      node.addEventListener(event, (e) => {
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
    const { prop, token } = loopState && condition.prop ? condition : toProperCase(rawToken, data);
    const isElse = key === "else";
    const method = isEval ? makeFunction : getProp;
    const toggleNode = (() => {
      const parent = node.parentElement;
      node.placeholder = divv2("comment", parent);
      return (on) => {
        on ? parent.insertBefore(node, node.placeholder) : node.remove();
      };
    })();
    const func = () => {
      if (key === "if") {
        prevCondition = {};
      }
      const value = !isElse && token && method(token, loopState || data);
      const ok = not ? !value : !!value;
      const toggle = isElse ? !prevCondition.fulfilled : key === "if" ? ok : !prevCondition.fulfilled && ok;
      condition.fulfilled = key === "else-if" ? prevCondition.fulfilled || !prevCondition.fulfilled && ok : toggle;
      prevCondition = condition;
      toggleNode(toggle);
    };
    addCondition(id, func, prop, loopState || data);
  };
  const setRef = (o, node) => {
    let { ref, name } = o;
    ref = ref || node.id || node.className && node.className.split(" ")[0] || name;
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
    const node = insertNode(parent, o);
    if (reactiveAttrs) {
      bindAttrs(o, node);
    }
    if (isHTML || isProp || isEval && !condition) {
      bindProp(o, node);
    }
    if (condition) {
      bindCondition(o, node);
    }
    setRef(o, node);
    bindEvents(events, node);
    children.forEach((child) => addNode(node, child));
    return node;
  }
  return addNode;
};
const createTemplate = (state, divv2) => {
  const { props, tag: template, parent } = state;
  const data = proxify(props.data || {}, observe, "data", props);
  const scope = Object.assign(parent, divv2("span", props));
  const addNode = AddNode(data, props, divv2);
  parse(template).forEach((o) => addNode(parent, o));
  props.inserted && props.inserted.call(scope);
};
const attachOffSwitch = (key, node, func) => {
  node.off = node.off || ((event) => node.off._list[event] && node.off._list[event]());
  node.off._list = Object.assign(node.off._list || {}, {
    [key]: func
  });
};
const onEvent = (node, once) => (key, value) => {
  const func = (e) => (value.call(node, e), once && node.off(key));
  node.addEventListener(key, func);
  attachOffSwitch(key, node, () => node.removeEventListener(key, func));
};
const onInserted = (state) => {
  const { props: { passive, inserted, isChild }, node, parent } = state;
  if (passive || !inserted || !parent)
    return state;
  const parentNode = parent.host || parent;
  const func = () => inserted.call(node, parent);
  if (isChild) {
    if (parentNode[int.ROOT][int.INSERTED_int.EMITTER]) {
      parentNode[int.ROOT][int.INSERTED_int.EMITTER].push(func);
      return state;
    }
    parentNode[int.ROOT] = parent;
  }
  parentNode[int.INSERTED_int.EMITTER] = [func];
  new MutationObserver((list, observer) => {
    for (const record of list) {
      for (const child of record.addedNodes) {
        if (child === node) {
          observer.disconnect();
          parentNode[int.INSERTED_int.EMITTER].forEach((func2) => func2());
          break;
        }
      }
    }
  }).observe(parent, {
    childList: true
  });
  return state;
};
const observerResponse$1 = (node, type) => (detail) => {
  node[int.OBSERVER] && node[int.OBSERVER]({
    type,
    ...detail
  });
  if (node[int.PROPS] && node[int.PROPS].on[type]) {
    node.dispatchEvent(new CustomEvent(type, { detail }));
  }
};
function observeAttributes(node, observerFunction) {
  node[int.OBSERVER] = observerFunction.bind(node);
  const callback = observerResponse$1(node, "attribute");
  const oldValues = Array.from(node.attributes).reduce((list, attr) => Object.assign(list, { [attr.name]: attr.value }), {});
  const observer = new MutationObserver((list) => list.forEach((m) => {
    const value = m.target.getAttribute(m.attributeName) ?? void 0;
    const oldValue = oldValues[m.attributeName];
    value !== oldValue && callback({
      key: m.attributeName,
      value,
      oldValue
    });
    oldValues[m.attributeName] = value;
  }));
  observer.observe(node, { attributes: true });
  attachOffSwitch("observe", node, () => observer.disconnect());
}
function addEmitter(state, parent) {
  const { props, node } = state;
  if (props.passive) {
    return;
  }
  const ref = parent.host || parent || {};
  const callback = observerResponse$1(node, "event");
  node[int.EMITTER] = ref[int.EMITTER] || [];
  node[int.EMITTER].push(node);
  node[ext.EMIT] = (event, detail) => {
    const e = new CustomEvent(event, { detail });
    node[int.EMITTER].forEach((receiver) => receiver !== node && receiver.dispatchEvent(e));
    callback({
      key: event,
      value: detail
    });
  };
}
function addObserver(state) {
  const { props, node } = state;
  if (!props.observe)
    return;
  observeAttributes(node, props.observe);
}
function addProxyObserver(node) {
  return (data = {}, callback) => {
    if (!isType.obj(data))
      return console.warn("[argument] must be of type object");
    if (!node && (callback && !isType.func(callback)))
      return console.warn("callback not specified");
    return proxify(
      data,
      callback ? (object) => callback(Object.assign({ type: "observe", data }, object)) : observerResponse$1(node, "observe")
    );
  };
}
function addState(state) {
  const { props, node } = state;
  let { state: nodeState, passive } = props;
  if (passive) {
    return;
  }
  if (!isType.obj(nodeState)) {
    console.warn("[state] must be of type object. value moved to state.value");
    nodeState = { value: nodeState };
  }
  proxify(nodeState, observerResponse$1(node, "state"), "state", node);
  node.observe = addProxyObserver(node);
}
const createElement = (state) => {
  const { props, tag, parent } = state;
  state.node = document.createElement(tag);
  state.node[int.PROPS] = props;
  state.node[int.ID] = hash();
  addObserver(state);
  addEmitter(state, parent);
  addState(state);
};
const RE_BODY_TAG_IN_CSS = "(?!^|[\\s\\t\\r\\n]+)body(?=[\\s\\{])";
const camelToDash = (str) => str.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const useHostSelector = (tag, css) => {
  return css.replace(new RegExp(`${tag}|${RE_BODY_TAG_IN_CSS}`, "g"), ":host");
};
const styleToText = (selector, props, node) => {
  const [regular, scoped, sheet] = Object.entries(props).reduce((css, [prop, value]) => {
    const cssSheet = prop === "css";
    const cssText = prop === "cssText";
    const index = cssSheet ? 2 : cssText && !node.shadowRoot ? 1 : 0;
    css[index] += cssSheet || cssText ? value : `${camelToDash(prop)}: ${value};`;
    return css;
  }, ["", "", ""]);
  return [
    sheet && useHostSelector(node.localName, sheet),
    regular && `${selector} {${regular}}`,
    scoped && (node.setAttribute(node[int.ID], "") || `${selector}[${node[int.ID]}] {${scoped}}`)
  ].filter(Boolean).join("");
};
const insertShadowStyle = (value, node, shadow) => {
  const selector = node.shadowRoot ? ":host" : node.localName;
  return shadow.host[int.STYLESHEET].textContent += (isType.obj(value) ? styleToText(selector, value, node) : useHostSelector(node.localName, value)).replace(/\s{2,}/g, " ");
};
function traverseConstructorProps(tag, props, shadow) {
  const {
    style,
    textContent,
    innerHTML,
    template,
    on
  } = props;
  if (style) {
    insertShadowStyle(style, { shadowRoot: true, localName: tag }, shadow);
  }
  if (textContent) {
    shadow.appendChild(document.createTextNode(textContent));
  }
  if (innerHTML) {
    const span = shadow.appendChild(document.createElement("span"));
    span.innerHTML = innerHTML;
  }
  if (template) {
    const span = shadow.appendChild(document.createElement("span"));
    span.innerHTML = template;
  }
  if (on) {
    Object.entries(on).forEach(([e, func]) => onEvent(this, e === "once")(e, func));
  }
}
const ensureValidTag = (proposedTag) => {
  return `${proposedTag.toLowerCase()}${proposedTag.includes("-") ? "" : "-component"}`;
};
function createCustomElement(state) {
  const { props, tag: unvalidatedTag } = state;
  const tag = ensureValidTag(unvalidatedTag);
  const RegisteredElement = customElements.get(tag);
  if (RegisteredElement) {
    return state.node = new RegisteredElement();
  }
  const { constructor, connected, disconnected, adopted } = props;
  class CustomElement extends HTMLElement {
    constructor() {
      super();
      state.node = this;
      const shadow = this.attachShadow({ mode: "open" });
      this[int.PROPS] = props;
      this[int.ID] = hash();
      this[int.STYLESHEET] = shadow.appendChild(document.createElement("style"));
      traverseConstructorProps.call(this, tag, props, shadow);
      shadow.appendChild(document.createElement("slot"));
      addObserver(state);
      addEmitter(state, this);
      addState(state);
      constructor && constructor.call(this);
    }
  }
  const ref = CustomElement.prototype;
  connected && (ref.connectedCallback = connected);
  disconnected && (ref.disConnectedCallback = disconnected);
  adopted && (ref.adoptedCallback = adopted);
  customElements.define(tag, CustomElement);
  new CustomElement();
}
function prefetch(state, append) {
  const { fetch: prefetch2 } = state.props;
  if (!prefetch2)
    return;
  const { node } = state.refs;
  node.data = node.data || {};
  const fetchers = Object.entries(prefetch2).map(([key, config]) => {
    const [url, options = {}] = isType.str(config) ? [config] : [config.url, config.options];
    const callback = (value) => observerResponse(node, "fetch")({
      key,
      path: `this.data.${key}`,
      url,
      value
    });
    return fetch(url, options).then((res) => {
      if (res.status !== 200)
        return callback({ error: res.status });
      return res[/json/.test(res.headers.get("content-type")) ? "json" : "text"]();
    }).then((data) => {
      node.data[key] = data;
      callback(data);
    }).catch((err) => {
      callback({ error: err.message });
    });
  });
  return Promise.all(fetchers).then(append);
}
const CONSTRUCTOR_PROPS = ["style", "css", "on", "text", "textContent", "html", "innerHTML"];
const COMPONENT_RESERVED_PROPS = ["constructor", "connected", "disconnected", "adopted", "template"];
const META_PROPS = ["watch", "observe", "state", "fetch", "isChild", "refs"];
const validElements = "html,base,head,link,meta,script,style,title,body,address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,main,nav,section,body,blockquote,cite,dd,dt,dl,div,figcaption,figure,hr,li,ol,p,pre,ul,a,href,abbr,b,bdi,bdo,br,code,data,time,dfn,em,i,kbd,mark,q,rb,ruby,rp,rt,rtc,s,del,ins,samp,small,x-small,span,class,id,lang,strong,sub,sup,u,var,wbr,area,audio,src,source,MediaStream,img,map,track,video,embed,iframe,object,param,picture,portal,svg,math,canvas,noscript,caption,col,colgroup,table,tbody,tr,td,tfoot,th,scope,headers,thead,button,datalist,option,fieldset,label,form,input,legend,meter,optgroup,select,output,progress,textarea,details,dialog,menu,summary,slot,template,acronym,applet,basefont,bgsound,big,medium,large,blink,center,content,dir,font,frame,frameset,hgroup,h1,h2,h3,h4,h5,h6,image,isindex,keygen,listing,marquee,menuitem,multicol,nextid,nobr,noembed,noframes,plaintext,shadow,spacer,strike,tt,xmp";
const validHTML = new Set(validElements.split(","));
const onCreated = (state) => {
  const { props, node, parent } = state;
  props.created && props.created.call(node, parent);
  return state;
};
const traverseChildren = (children, parent, node, selfShadow) => {
  children.forEach((child) => {
    const tag = child.tag;
    tag ? delete child.tag : console.warn("created child without [tag] property, defaults to div");
    const ref = parent.host || parent;
    node[int.ROOT] = ref[int.ROOT] || ref;
    child.isChild = true;
    divv(tag || "div", selfShadow || node, child);
  });
};
const setAttr = (node) => (key, value) => node.setAttribute(key, value);
const setProp = (ref) => (key, value) => ref[key] = value;
function traverse(state) {
  const { props, node, shadow, selfShadow } = state;
  (function repeat(props2, node2, func) {
    Object.entries(props2).forEach(([key, value]) => {
      if (META_PROPS.includes(key))
        return;
      if (shadow) {
        if (selfShadow && CONSTRUCTOR_PROPS.includes(key))
          return;
        if (key === "style")
          return insertShadowStyle(value, node2, shadow);
      }
      if (key === "className") {
        if (isType.obj(value))
          value = Object.values(value).filter(Boolean).join(" ");
      }
      if (!isType.obj(value))
        return func ? func(key, value) : setProp(node2)(key, value);
      if (key === "children")
        return traverseChildren(value, state);
      if (key === "on")
        return repeat(value, node2, onEvent(node2, key === "once"));
      if (key === "style")
        return repeat(value, node2, setProp(node2[key]));
      if (key === "dataset")
        return repeat(value, node2, setProp(node2[key]));
      if (/^attr/.test(key))
        return repeat(value, node2, setAttr(node2));
      node2[key] = value;
    });
  })(props, node);
  return state;
}
const addShadowRefs = (state) => {
  const { node, parent } = state;
  state.parentShadow = parent && (parent.shadowRoot || parent.host && !/localhost|www/.test(parent.host) && parent);
  state.selfShadow = node.shadowRoot;
  state.shadow = state.selfShadow || state.parentShadow;
};
function appendToParent(state) {
  const append = () => {
    const { node, parent, parentShadow } = state;
    parent && (parentShadow || parent).appendChild(node);
  };
  prefetch(state, append) || append();
  return state;
}
const output = (state) => {
  const { node, selfShadow } = state;
  node[int.CHILDREN] = Array.from((selfShadow || node).children).filter((n) => n.localName !== "style");
  return node;
};
function createText(tag, parent = document.body, text = "") {
  return parent.appendChild(
    document[tag === "text" ? "createTextNode" : "createComment"](text)
  );
}
function createNode(state) {
  state.isCustom ? createCustomElement(state) : createElement(state);
  addShadowRefs(state);
  return state;
}
function validate(state) {
  const { props: unvalidatedProps, tag } = state;
  const keyAlias = {
    "class": "className",
    "html": "innerHTML",
    "text": "textContent",
    "css": "style"
    //'constructor': 'constructor'
  };
  const valueAlias = {
    css: (value) => ({ cssText: value }),
    style: (value) => isType.str(value) ? { css: value } : value
  };
  const withDefaultValues = {
    on: {},
    state: {},
    ...unvalidatedProps
  };
  state.isCustom = !validHTML.has(tag);
  state.props = Object.entries(withDefaultValues).reduce((o, [key, value]) => {
    var _a;
    if (!state.isCustom && COMPONENT_RESERVED_PROPS.includes(key)) {
      console.warn(`"${key}" is not valid for standard HTML elements`);
      return o;
    }
    const k = keyAlias[key] || key;
    const v = ((_a = valueAlias[key]) == null ? void 0 : _a.call(valueAlias, value)) || value;
    o[k] = k === "style" ? Object.assign(o[k] || {}, v) : v;
    return o;
  }, /* @__PURE__ */ Object.create(null));
  return state;
}
function createTag(state) {
  const composition = [
    validate,
    createNode,
    onInserted,
    traverse,
    onCreated,
    appendToParent,
    output
  ];
  return composition.reduce((o, func) => func(o), state);
}
function divv() {
  const args = [...arguments];
  const tag = args.shift();
  const parent = (args[0] instanceof Element || args[0] instanceof ShadowRoot) && args.shift();
  const props = args.shift() || {};
  if (/</.test(tag)) {
    return createTemplate({ tag, parent, props }, divv);
  }
  if (/^(text|comment)$/.test(tag)) {
    return createText(tag, parent, props.text);
  }
  return createTag({ tag, parent, props });
}
export {
  divv
};
