import { int } from './common';
import { isType } from './helpers';
import { createTemplate } from './template';
import { onInserted } from './observer';
import { createElement } from './element';
import { createCustomElement } from './custom';
import { prefetch } from './fetch';
import { insertShadowStyle } from './style';
import { onEvent } from './event';

const CONSTRUCTOR_PROPS = [ 'style', 'css', 'on', 'text', 'textContent', 'html', 'innerHTML' ];
const COMPONENT_RESERVED_PROPS = [ 'constructor', 'connected', 'disconnected', 'adopted', 'template' ];
const META_PROPS = [ 'watch', 'observe', 'state', 'fetch', 'isChild', 'refs' ];

/*
    https://developer.mozilla.org/en-US/docs/Web/HTML/Element Apr. 21, 2021
*/
const validElements = 'html,base,head,link,meta,script,style,title,body,address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,main,nav,section,body,blockquote,cite,dd,dt,dl,div,figcaption,figure,hr,li,ol,p,pre,ul,a,href,abbr,b,bdi,bdo,br,code,data,time,dfn,em,i,kbd,mark,q,rb,ruby,rp,rt,rtc,s,del,ins,samp,small,x-small,span,class,id,lang,strong,sub,sup,u,var,wbr,area,audio,src,source,MediaStream,img,map,track,video,embed,iframe,object,param,picture,portal,svg,math,canvas,noscript,caption,col,colgroup,table,tbody,tr,td,tfoot,th,scope,headers,thead,button,datalist,option,fieldset,label,form,input,legend,meter,optgroup,select,output,progress,textarea,details,dialog,menu,summary,slot,template,acronym,applet,basefont,bgsound,big,medium,large,blink,center,content,dir,font,frame,frameset,hgroup,h1,h2,h3,h4,h5,h6,image,isindex,keygen,listing,marquee,menuitem,multicol,nextid,nobr,noembed,noframes,plaintext,shadow,spacer,strike,tt,xmp';

const validHTML = new Set(validElements.split(','));

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

function createText(tag, parent = document.body, text = '') {
    return parent.appendChild(
        document[tag === 'text' ? 'createTextNode' : 'createComment'](text)
    );    
}

// --->

function createNode(state) {
    state.isCustom
        ? createCustomElement(state)
        : createElement(state);

    addShadowRefs(state);

    return state;
};

function validate(state) {
    const { props: unvalidatedProps, tag } = state;

    const keyAlias = {
        'class': 'className',
        'html': 'innerHTML',
        'text': 'textContent',
        'css': 'style'
        //'constructor': 'constructor'
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

    state.isCustom = !validHTML.has(tag);

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
        return createText(tag, parent, props.text);
    }

    return createTag({ tag, parent, props });
};