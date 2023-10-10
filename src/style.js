import { int } from './common';
import { isType } from './helpers';

// regex – double escaped for use in template strings
const RE_BODY_TAG_IN_CSS = '(?!^|[\\s\\t\\r\\n]+)body(?=[\\s\\{])';

const camelToDash = str => str.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);

const useHostSelector = (tag, css) => {
    return css.replace(new RegExp(`${tag}|${RE_BODY_TAG_IN_CSS}`, 'g'), ':host');
};

const styleToText = (selector, props, node) => {

    const [ regular, scoped, sheet ] = Object.entries(props).reduce((css, [ prop, value ]) => {
        const cssSheet = prop === 'css';
        const cssText = prop === 'cssText';
        const index = cssSheet ? 2 : cssText && !node.shadowRoot ? 1 : 0;
        css[index] += cssSheet || cssText ? value : `${camelToDash(prop)}: ${value};`
        return css;
    }, [ '', '', '' ]);

    return [
        sheet && useHostSelector(node.localName, sheet),
        regular && `${selector} {${regular}}`,
        scoped && (node.setAttribute(node[int.ID], '') || `${selector}[${node[int.ID]}] {${scoped}}`)
    ].filter(Boolean).join('');
};

export const insertShadowStyle = (value, node, shadow) => {
    const selector = node.shadowRoot ? ':host' : node.localName;
    return shadow.host[int.STYLESHEET].textContent += (
        isType.obj(value) 
            ? styleToText(selector, value, node) 
            : useHostSelector(node.localName, value)
    ).replace(/\s{2,}/g, ' ');
}; 