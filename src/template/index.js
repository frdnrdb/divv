import { proxify } from '../proxy';
import { parse } from './parse';
import { observe } from './proxy';
import { AddNode } from './logic';

export const createTemplate = (state, divv) => {
  const { props, tag: template, parent = {} } = state;
  
  props.refs = [];
  const data = proxify(props.data || {}, observe, 'data', props);
  const scope = divv('span', props); //Object.assign(parent, divv('span', props));

  const addNode = AddNode(data, props, props.refs, divv);

  parse(template).forEach(o => addNode(parent, o));
  props.inserted && props.inserted.call(scope);
};