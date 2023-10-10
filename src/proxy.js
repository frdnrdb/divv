import { int } from './common';
import { isType } from './helpers';

const flatten = target => {
  return isType.obj(target)
      ? isType.arr(target)
          ? [ ...target ]
          : { ...target }
      : target;
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

  const callbackStack = [ callback ];
  callback = o => callbackStack.forEach(fn => fn(o));

  const proxy = method(object, callback);

  object[int.IS_PROXY] = true;
  object[int.PROXY_OBSERVE] = cb => {
    !callbackStack.some(fn => fn === cb) && callbackStack.push(cb);
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
          Reflect.set(target, name, value, receiver); //proxify(value, callback, name, target);
  
          //if (oldValue === value) return true;

          callback({
              key: name,
              value, //: flatten(value),
              oldValue,
              operation: 'set',
              data: receiver.valueOf(),
          });
          
          return true;
      },

      deleteProperty(target, name) {
          const oldValue = target[name];
          delete target[name];

          callback({
              key: name,
              value: undefined,
              oldValue,
              operation: 'delete',
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
                  if (!isNaN(index)) return true; // don't return intermediate array operations
                  oldValue = undefined;
              }
              if (arrayOperation === 'sort' && index !== length) {
                  return true;
              }

          },
          old: () => oldValue,
          method: (target, name) => {
              if (!name) return arrayOperation;
              if (isType.str(name) && /push|pop|(un)?shift|splice|sort/.test(name)) {
                  arrayOperation = name;
              }
              if (/(un)?shift|push|pop/.test(arrayOperation) && !oldValue) {
                  oldValue = [ ...target ];
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
          Reflect.set(target, name, value, receiver); //proxify(value, callback, name, target)

          if (meta.skip(target, name) || (oldValue === value)) {
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

export function proxify(value, callback, prop, source, shallow) {
  if (!value || !isType.obj(value)) return value;
  const proxyMethod = isType.arr(value) ? arrayProxy : objectProxy;
  const proxy = proxyWrapper(proxyMethod, value, callback, shallow);
  if (prop && source) source[prop] = proxy;
  return proxy;
}
