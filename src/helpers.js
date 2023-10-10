export const isType = {
  func: o => typeof o === 'function',
  str: o => typeof o === 'string',
  obj: o => typeof o === 'object',
  arr: Array.isArray
};

export const hash = () => Math.random().toString(32).substring(2);
