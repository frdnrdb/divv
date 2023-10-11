import { int } from './common';
import { isType, hash } from './helpers';
import { createTemplate } from './template';
import { onInserted } from './observer';
import { createCustomElement } from './custom';
import { prefetch } from './fetch';
import { insertShadowStyle } from './style';
import { onEvent } from './event';
import { addObserver, addEmitter, addState } from './observer';

const CONSTRUCTOR_PROPS = [ 'style', 'css', 'on', 'text', 'textContent', 'html', 'innerHTML' ];
const COMPONENT_RESERVED_PROPS = [ 'constructor', 'connected', 'disconnected', 'adopted', 'template' ];
const META_PROPS = [ 'watch', 'observe', 'state', 'fetch', 'isChild' ];

// --->

const onCreated = state => {
    const { props, node, parent } = state;
    props.created && props.created.call(node, parent);      
    return state;  
};

// ---> traverse

const traverseChildren = (children, parent, node, selfShadow) => {
    children.forEach(child => {
        const tag = child.tag;

        tag ? delete child.tag : console.warn('created child without [tag] property, defaults to div');
        
        // reference for onInserted logic
        const ref = parent.host || parent;
        node[int.ROOT] = ref[int.ROOT] || ref;
        child.isChild = true;

        divv(tag || 'div', selfShadow || node, child);
    });         
};

const setAttr = node => (key, value) => node.setAttribute(key, value);
const setProp = ref => (key, value) => ref[key] = value;

function traverse(state) {
    const { props, node, shadow, selfShadow } = state;

    (function repeat(props, node, func) {
        Object.entries(props).forEach(([key, value]) => {
            if (META_PROPS.includes(key)) return;

            if (shadow) {
                if (selfShadow && CONSTRUCTOR_PROPS.includes(key)) return;
                if (key === 'style') return insertShadowStyle(value, node, shadow);
            }

            if (key === 'className') {
                if (isType.obj(value)) value = Object.values(value).filter(Boolean).join(' ');
            }
            if (!isType.obj(value)) return func 
                ? func(key, value) 
                : setProp(node)(key, value);

            if (key === 'children') return traverseChildren(value, state);
            if (key === 'on') return repeat(value, node, onEvent(node, key === 'once'));
            if (key === 'style') return repeat(value, node, setProp(node[key]));
            if (key === 'dataset') return repeat(value, node, setProp(node[key]));
            if (/^attr/.test(key)) return repeat(value, node, setAttr(node));
            
            node[key] = value;
        });
    })(props, node);

    return state;
}

// ---> create

const addShadowRefs = state => {
    const { node, parent } = state;
    state.parentShadow = parent && (parent.shadowRoot || (parent.host && !/localhost|www/.test(parent.host) && parent));
    state.selfShadow = node.shadowRoot;
    state.shadow = state.selfShadow || state.parentShadow;
};

// ---> 

function appendToParent(state) {
    const append = () => {
        const { node, parent, parentShadow } = state;
        parent && (parentShadow || parent).appendChild(node);          
    };

    prefetch(state, append) || append();
    return state;      
};

const output = state => {
    const { node, selfShadow } = state;
    node[int.CHILDREN] = Array.from((selfShadow || node).children).filter(n => n.localName !== 'style');
    return node;
}; 

// --->

function createText(tag, parent = document.body, props) {
    const str = isType.str(props);
    const node = document[tag === 'text' ? 'createTextNode' : 'createComment'](str ? props : props.text);
    if (!str && props.inserted) {
        onInserted({ props, node, parent });
    }
    return parent.appendChild(node);
}

// --->

function createNode(state) {
    const { props, parent, isCustom } = state;

    isCustom && createCustomElement(state);
         
    state.node[int.PROPS] = props;
    state.node[int.ID] = hash();
  
    addObserver(state);
    addEmitter(state, isCustom ? state.node : parent);
    addState(state);
    addShadowRefs(state);

    return state;
};

function validate(state) {
    const { props: unvalidatedProps, tag } = state;

    const keyAlias = {
        'class': 'className',
        'html': 'innerHTML',
        'text': 'textContent',
        'css': 'style',
        'constructor': 'constructor'
    };

    const valueAlias = {
        css: value => ({ cssText: value }),
        style: value => isType.str(value) ? ({ css: value }) : value
    };

    const withDefaultValues = {
        on: {},
        state: {},
        ...unvalidatedProps
    };

    state.node = document.createElement(tag);   
    state.isCustom = state.node instanceof HTMLUnknownElement || tag.includes('-');

    state.props = Object.entries(withDefaultValues).reduce((o, [key, value]) => {
        if (!state.isCustom && COMPONENT_RESERVED_PROPS.includes(key)) {
            console.warn(`"${key}" is not valid for standard HTML elements`);
            return o;
        }
        const k = keyAlias[key] || key;
        const v = valueAlias[key]?.(value) || value;

        o[k] = k === 'style' ? Object.assign(o[k] || {}, v) : v;
        return o;
    }, Object.create(null));

    return state;
};    

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
};

// --->

export function divv() {
    const args = [ ...arguments ];
    const tag = args.shift();
    const parent = (args[0] instanceof Element || args[0] instanceof ShadowRoot) && args.shift();
    const props = args.shift() || {};

    if (/</.test(tag)) {
        return createTemplate({ tag, parent, props }, divv);
    }
    if (/^(text|comment)$/.test(tag)) {
        return createText(tag, parent, props);
    }

    return createTag({ tag, parent, props });
};