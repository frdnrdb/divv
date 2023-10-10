import { int, ext } from './common';
import { isType } from './helpers';
import { proxify } from './proxy';
import { attachOffSwitch } from './event';

export const onInserted = state => {
  const { props: { passive, inserted, isChild }, node, parent } = state;

  if (passive || !inserted || !parent) return state;

  const parentNode = parent.host || parent;
  const func = () => inserted.call(node, parent);

  /*
      make sure parent and children [inserted] callbacks are executed in the right order:
      parent > child > inner child
  */
  if (isChild) {
      if (parentNode[int.ROOT][int.INSERTED_int.EMITTER]) {
          parentNode[int.ROOT][int.INSERTED_int.EMITTER].push(func);
          return state;
      }
      parentNode[int.ROOT] = parent;
  }

  parentNode[int.INSERTED_int.EMITTER] = [ func ];

  new MutationObserver((list, observer) => {
      for (const record of list) {
          for (const child of record.addedNodes) {
              if (child === node) {
                  observer.disconnect();
                  parentNode[int.INSERTED_int.EMITTER].forEach(func => func());
                  break;
              }
          }
      }
  }).observe(parent, {
      childList: true
  });

  return state;
};

const observerResponse = (node, type) => detail => {
  node[int.OBSERVER] && node[int.OBSERVER]({
      type,
      ...detail
  });

  if (node[int.PROPS] && node[int.PROPS].on[type]) {
      node.dispatchEvent(new CustomEvent(type, { detail }))
  }
};

function observeAttributes(node, observerFunction) {
  node[int.OBSERVER] = observerFunction.bind(node);

  const callback = observerResponse(node, 'attribute');
  const oldValues = Array.from(node.attributes).reduce((list, attr) => Object.assign(list, { [attr.name]: attr.value }), {});

  const observer = new MutationObserver(list => list.forEach(m => {
      const value = m.target.getAttribute(m.attributeName) ?? undefined;
      const oldValue = oldValues[m.attributeName];

      value !== oldValue && callback({
          key: m.attributeName, 
          value,
          oldValue
      });

      oldValues[m.attributeName] = value;
  }));

  observer.observe(node, { attributes: true });

  attachOffSwitch('observe', node, () => observer.disconnect());
}

export function addEmitter(state, parent) {
  const { props, node } = state;
  if (props.passive) {
      return;
  }

  const ref = parent.host || parent || {};
  const callback = observerResponse(node, 'event');

  /*
      should any child reference outmost parent and check every descendant for
      registered observers? and then emit to ALL observe-methods?
  */
  node[int.EMITTER] = ref[int.EMITTER] || [];
  node[int.EMITTER].push(node);

  node[ext.EMIT] = (event, detail) => {
      const e = new CustomEvent(event, { detail });

      node[int.EMITTER].forEach(receiver => receiver !== node && receiver.dispatchEvent(e));

      callback({
          key: event, 
          value: detail
      });
  };
}

export function addObserver(state) {
  const { props, node } = state;
  if (!props.observe) return;
  observeAttributes(node, props.observe);
}

function addProxyObserver(node) {
  return (data = {}, callback) => {
      if (!isType.obj(data)) return console.warn('[argument] must be of type object');
      if (!node && (callback && !isType.func(callback))) return console.warn('callback not specified');
      return proxify(data, 
          callback
              ? object => callback(Object.assign({ type: 'observe', data }, object))
              : observerResponse(node, 'observe')
      );
  };
}

export function addState(state) {
  const { props, node } = state;
  let { state: nodeState, passive } = props;

  if (passive) {
      return;
  }

  if (!isType.obj(nodeState)) {
      console.warn('[state] must be of type object. value moved to state.value');
      nodeState = { value: nodeState };
  }

  proxify(nodeState, observerResponse(node, 'state'), 'state', node);
  node.observe = addProxyObserver(node);
}
