import { int } from './common';
import { hash } from './helpers';
import { addObserver, addEmitter, addState } from './observer';

export const createElement = state => {
  const { props, tag, parent } = state;

    state.node = document.createElement(tag);   
         
    state.node[int.PROPS] = props;
    state.node[int.ID] = hash(tag);

    addObserver(state);
    addEmitter(state, parent);
    addState(state);
};