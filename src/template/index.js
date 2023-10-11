import { proxify } from '../proxy';
import { parse } from './parse';
import { observe } from './proxy';
import { CreateAddNode } from './logic';

export const createTemplate = (state, divv) => {
  const { props, tag: template, parent = {} } = state;

  props.refs = [];
  proxify(props.data || {}, observe, 'data', props);

  const addNode = CreateAddNode(props, divv);
  parse(template).forEach(o => addNode(parent, o));

  props.inserted && props.inserted.call(divv('span', props));
};