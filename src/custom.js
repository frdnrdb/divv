import { int } from './common';
import { hash } from './helpers';
import { addObserver, addEmitter, addState } from './observer';
import { insertShadowStyle } from './style';
import { onEvent } from './event';

function traverseConstructorProps(tag, props, shadow) {
  const { 
      style, 
      textContent,
      innerHTML,
      template,
      on
  } = props;

  if (style) {
      insertShadowStyle(style, { shadowRoot: true, localName: tag }, shadow);
  }

  if (textContent) {
      shadow.appendChild(document.createTextNode(textContent));
  }

  if (innerHTML) {
      const span = shadow.appendChild(document.createElement('span'));
      span.innerHTML = innerHTML;
  }

  if (template) {
      const span = shadow.appendChild(document.createElement('span'));
      span.innerHTML = template;
  }

  if (on) {
      Object.entries(on).forEach(([ e, func ]) => onEvent(this, e === 'once')(e, func));
  }
};

export function createCustomElement(state) {
  const { props, tag: unvalidatedTag, parent } = state;
  const tag = unvalidatedTag.replace(/[^a-zA-Z-]/g, '');

  const RegisteredElement = customElements.get(tag);
  if (RegisteredElement) {
      return state.node = new RegisteredElement(); 
  }

  const { constructor, connected, disconnected, adopted } = props;

  class CustomElement extends HTMLElement {
      constructor() {
          super();
          state.node = this;

          const shadow = this.attachShadow({ mode: 'open' });
          this[int.STYLESHEET] = shadow.appendChild(document.createElement('style'));

          traverseConstructorProps.call(this, tag, props, shadow);

          // attach slotted content to shadow root by default
          shadow.appendChild(document.createElement('slot'));

          // skipping "static get observedAttributes()" alongside "attributeChangedCallback()"
      }
  };
                  
  const ref = CustomElement.prototype;

  connected && (ref.connectedCallback = connected);
  disconnected && (ref.disConnectedCallback = disconnected);
  adopted && (ref.adoptedCallback = adopted);
  
    constructor && (ref.customConstructor = constructor);

  customElements.define(tag, CustomElement);

  new CustomElement();
}