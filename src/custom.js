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

const ensureValidTag = proposedTag => {
  return `${proposedTag.toLowerCase()}${proposedTag.includes('-') ? '' : '-component'}`;
};

export function createCustomElement(state) {
  const { props, tag: unvalidatedTag } = state;
  const tag = ensureValidTag(unvalidatedTag);

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

          this[int.PROPS] = props;
          this[int.ID] = hash(tag);
          this[int.STYLESHEET] = shadow.appendChild(document.createElement('style'));

          traverseConstructorProps.call(this, tag, props, shadow);

          // attach slotted content to shadow root by default
          shadow.appendChild(document.createElement('slot'));

          // skipping "static get observedAttributes()" alongside "attributeChangedCallback()"
          // in favor of a more dynamic approach
          addObserver(state);
          addEmitter(state, this);
          addState(state);

          constructor && constructor.call(this);
      }
  };
                  
  const ref = CustomElement.prototype;

  connected && (ref.connectedCallback = connected);
  disconnected && (ref.disConnectedCallback = disconnected);
  adopted && (ref.adoptedCallback = adopted);
  
  customElements.define(tag, CustomElement);

  new CustomElement();
}