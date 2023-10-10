export const attachOffSwitch = (key, node, func) => {
  node.off = node.off || (event => node.off._list[event] && node.off._list[event]());
  node.off._list = Object.assign(node.off._list || {}, {
      [key]: func
  });
};

export const onEvent = (node, once) => (key, value) => {
  const func = e => (value.call(node, e), once && node.off(key));
  node.addEventListener(key, func);
  attachOffSwitch(key, node, () => node.removeEventListener(key, func));
};