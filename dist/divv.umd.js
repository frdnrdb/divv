!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports):"function"==typeof define&&define.amd?define(["exports"],t):t((e="undefined"!=typeof globalThis?globalThis:e||self).divv={})}(this,(function(e){"use strict";const t={PROPS:Symbol("props"),ROOT:Symbol("root"),OBSERVER:Symbol("observer"),EMITTER:Symbol("emitter"),INSERTED_EMITTER:Symbol("inserted-emitter"),IS_PROXY:Symbol("isProxy"),PROXY_OBSERVE:Symbol("proxyObserve")},n={EMIT:"emit",CHILDREN:"_children",STYLESHEET:"_stylesheet",ID:"_id"},o={func:e=>"function"==typeof e,str:e=>"string"==typeof e,obj:e=>"object"==typeof e,arr:Array.isArray},r=()=>Math.random().toString(32).substring(2),s=e=>o.obj(e)?o.arr(e)?[...e]:{...e}:e,a=(e,t)=>{for(let n in e)Object.prototype.hasOwnProperty.call(e,n)&&e[n]&&o.obj(e[n])&&l(e[n],t,n,e)};function i(e,n){return new Proxy(e,{get:(e,n,o)=>n===t.IS_PROXY||Reflect.get(e,n,o),set:function(e,t,o,r){const a=s(e[t]);return Reflect.set(e,t,o,r),n({key:t,value:o,oldValue:a,operation:"set",data:r.valueOf()}),!0},deleteProperty(e,t){const o=e[t];return delete e[t],n({key:t,value:void 0,oldValue:o,operation:"delete",data:e}),!0}})}function c(e,n){const r=(()=>{let e,t;return{skip:(n,o)=>{const r=Number(o),s=n.length-1;if(/(un)?shift|push|pop/.test(e)){if(!isNaN(r))return!0;t=void 0}if("sort"===e&&r!==s)return!0},old:()=>t,method:(n,r)=>{if(!r)return e;o.str(r)&&/push|pop|(un)?shift|splice|sort/.test(r)&&(e=r),/(un)?shift|push|pop/.test(e)&&!t&&(t=[...n])}}})();return new Proxy(e,{get:(e,n,o)=>n===t.IS_PROXY||(r.method(e,n),Reflect.get(e,n,o)),set:function(e,t,o,a){const i=r.old()||s(e);return Reflect.set(e,t,o,a),r.skip(e,t)||i===o||n({key:t,value:s(e),oldValue:i,operation:r.method(),meta:r.isArray&&{item:e[t],index:t},data:a.valueOf()}),!0}})}function l(e,n,r,s,l){if(!e||!o.obj(e))return e;const d=function(e,n,o,r){if(n[t.IS_PROXY])return n;const s=[o],i=e(n,o=e=>s.forEach((t=>t(e))));return n[t.IS_PROXY]=!0,n[t.PROXY_OBSERVE]=e=>{!s.some((t=>t===e))&&s.push(e)},!r&&a(n,o),i}(o.arr(e)?c:i,e,n,l);return r&&s&&(s[r]=d),d}const d=/@/g,u=/(^|\s)\/(\/|\*)/,p=/^:?(else)?-?(if)?$/,f=/^[\s\t]{0,}\/\//,h=e=>e.replace(d,""),m=(e,t={})=>(e=h(e),f.test(e)?(t.isEval=!0,t.token=e.replace(f,"").trim(),t):(e.startsWith("!")&&(e=e.substring(1),t.not=!0),t.token=e,e.includes(".")&&(e=e.split(".")[0]),e.includes("]")&&(e=e.replace(/\[.*/,"")),t.prop=e,t));function b(e,t,n){const o=e.parentElement,s=e.textContent;if(s){if(8===e.nodeType)return{type:"comment",text:s};if(3===e.nodeType){if(!t&&u.test(s))return;const e=t&&f.test(s),n={isTemplate:d.test(s),isEval:e,type:"text",text:s};return e&&m(s,n),n}}if(1!==e.nodeType)return;const a=e.tagName.toLowerCase(),i={type:"tag",name:a,attrs:{},children:[],events:[]},c=(e,t)=>{i.isLoop=!0,i.isBlock=t;let[n,,o]=e;if("{"===n)return Object.assign(i,{prop:h(e.pop()),alias:e.slice(1,-2).map((e=>{const t=e.indexOf(",");return-1!==t&&(e=e.substring(0,t)),h(e.trim())})),destructured:!0});Object.assign(i,{prop:h(o),alias:h(n)})},l=(e,t,n)=>{o._id=o._id||r(),i.condition={key:e,id:o._id},i.isBlock=n,i.isLoop?m(t,i.condition):m(t,i)};"else"===a&&l(a,"",!0);for(const{name:r,value:d}of e.attributes){if("for"===a){c(Array.from(e.attributes).map((e=>e.name)),!0);break}if("for"!==r){if(p.test(a)){l(a,r,!0);break}if(p.test(r))l(r,d);else if(r.startsWith("@")){const e=h(r),t=h(d);if("html"===e){i.text=t,i.isHTML=!0,m(d,i);continue}i.events.push({func:t,event:e})}else d.includes("@")?(i.reactiveAttrs=i.reactiveAttrs||[],i.reactiveAttrs.push({key:r,value:d})):"ref"!==r?i.attrs[r]=d:i.ref=d}else c(d.split(" "))}for(const r of e.childNodes){const e=b(r,!0);e&&(("text"!==e.type||e.isTemplate)&&(n=!0),i.children.push(e))}return i.condition||n&&!i.isHTML||(i.isHTML||(i.text=s),delete i.children),i.text&&m(i.text,i),i}const E=(e,t,n)=>{e[t]=e[t]||[],e[t].some((e=>e===n))||e[t].push(n)},v={},y={},g=(e,t,n,o)=>{n&&(E(v,e,t),((e,t,n,o)=>{y[n]=y[n]||{},y[n][e]=v[e],R(o[n],n,t)})(e,t,n,o),R(o,n,t,o)),t()},T={},O={},R=(e,n,r,s)=>{if("object"==typeof e){if(o.arr(e[n])&&E(O,n,r),e[t.IS_PROXY])return e[t.PROXY_OBSERVE](r);l(e,r,getPropNameCaseInsensitive(n,s),s)}},S=(e,t,n,o)=>{R(e,t,n,o),E(T,t,n),n()};let x;const w={},j=e=>{const{key:t,value:n,operation:o,data:r}=e;"set"===o&&O[t]&&O[t].forEach((e=>S(r[t],t,e))),x=JSON.stringify(n),w[t]!==x&&(w[t]=x,T[t]&&T[t].forEach((t=>t(e))),y[t]&&Object.values(y[t]).forEach((t=>t.forEach((t=>t(e))))))},k=e=>"function"==typeof e?e():e,M=(e,t)=>{try{return k(new Function(...Object.keys(t),`return ${e.trim()}`).apply(null,Object.values(t)))}catch(n){return console.warn(n.message),""}},C=(e,t)=>{if("object"!=typeof t||"string"!=typeof e||!e.length)return;const n=e.split(/[\[\]\?\.]/).filter(Boolean);for(let o of n){if(void 0===t[o])return;t=t[o]}return k(t)},I=(e,t,n="",o,r,s)=>{const a=n?new RegExp("@"+(o?`(${n.join("|")})`:`${n}(?:\\.)?([a-z0-9\\[\\].]+)?`),"gi"):/@([a-z0-9\[\].]+)/gi;return t.replace(a,((t,n)=>n?"index"===n?r:(s?M:C)(n,e):k(e)))},N=(e="",t)=>{let n,o=t;const r=e.split(".").reduce(((e,t)=>{if(!t.trim())return e;const[r]=t.match(/[^\s\[\]]+/),s=((e,t)=>t[e]?e:Object.keys(t).find((t=>t.toLowerCase()===e)))(r,o)||r;return n||(n=s),e.push(t.replace(r,s)),"object"!=typeof o||(o=o[s]),e}),[]);return{prop:n,token:r.join(".")}},L=(e,t,r)=>{t.refs=[];const s=t.refs,a=(t,n)=>{const{alias:a,prop:i,destructured:c,isBlock:l,children:d=[]}=n,{token:u}=N(i,e),p=C(u,e);if(l&&!d.length)return;if(!p||!o.arr(p))return;const f=r("span",t),h=l?d:[n];delete n.isLoop;const m=e=>{e.forEach(((e,t)=>{const n=((e,t)=>{const n=o=>{o.isEval&&!o.condition&&(o.text=M(o.token,{...e,index:t}),delete o.isEval),o.isTemplate&&(o.text=I(e,o.text,a,c&&u,t),delete o.isTemplate),o.reactiveAttrs&&(o.reactiveAttrs.forEach((({key:n,value:r})=>{o.attrs[n]=I(e,r,a,c&&u,t,o.isEval)})),delete o.reactiveAttrs),o.condition&&(o.loopState={...e,index:t}),o.children&&o.children.forEach(n)},o=h.map((e=>JSON.parse(JSON.stringify(e))));return o.forEach(n),o})(e,t);n.forEach((e=>E(f,e)))}))};S(p,u,(()=>{f.innerHTML="",m(C(u,e)),Object.entries(s).forEach((([e,t])=>{Array.isArray(t)&&(s[e]=t.filter((e=>e.offsetParent)))}))}),e)},i=(e,t)=>{t.children.length&&(delete t.isBlock,t.name="span",E(e,t))},c=(e,t)=>{const{type:n="text",text:o=""}=t,r=[],s=[];return o.replace(/(\\)?@([^\s<]+)/g,((e,t,n)=>(r.push((t?"@":"")+n),s.push(t),"χ"))).split("χ").flatMap((e=>{const t=r.shift(),o=s.shift();return[e&&{type:n,text:e},t&&{...m(t),type:"text",text:t,isProp:!o}]})).filter(Boolean).forEach((t=>E(e,t)))},l=(e,t)=>{const{type:n,name:o,attrs:s={},text:a=""}=t;return r(...[o||n,e,{tag:o||n,text:a,attrs:s,passive:!0}].filter(Boolean))},d=(t,n)=>{const{reactiveAttrs:o}=t;o.forEach((({key:t,value:o,prop:r})=>{S(e,r,(()=>n.setAttribute(t,I(e,o))),e)}))},u=(t,n)=>{const{isEval:r,isHTML:s,token:a}=t,i=r?(c=a,Array.from(c.split(" ").reduce(((t,n)=>{if(!(n=n.replace(/@/g,"").trim()))return t;const[o]=n.split(/\[|\./).map((e=>e.replace(/^!/,"")));return/[a-zA-Z]{2,}/.test(o)&&e[o]&&t.add(o),t}),new Set))):t.prop;var c;const l=r?M:C,d=()=>n[s?"innerHTML":"textContent"]=l(a,e);(o.arr(i)?i:[i]).forEach((t=>S(e,t,d,e)))},p=(o,r)=>{o.forEach((({func:o,event:a})=>{if(!t[o])return console.warn(`@${a} ${o} not declared`);r[n.EMIT]=r[n.EMIT]||((e,t)=>r.dispatchEvent(new CustomEvent(e,{detail:t}))),r.addEventListener(a,(n=>{r.refs=s,r.data=e,t[o].call(r,n)}))}))};let f={};const h=(t,n)=>{const{isEval:o,not:s,condition:a,token:i,loopState:c}=t,{key:l,id:d}=a,{prop:u,token:p}=c&&a.prop?a:N(i,e),h="else"===l,m=o?M:C,b=(()=>{const e=n.parentElement;return n.placeholder=r("comment",e),t=>{t?e.insertBefore(n,n.placeholder):n.remove()}})();g(d,(()=>{"if"===l&&(f={});const t=!h&&p&&m(p,c||e),n=s?!t:!!t,o=h?!f.fulfilled:("if"===l||!f.fulfilled)&&n;a.fulfilled="else-if"===l?f.fulfilled||!f.fulfilled&&n:o,f=a,b(o)}),u,c||e)},b=(e,t)=>{let{ref:n,name:r}=e;n=n||t.id||t.className&&t.className.split(" ")[0]||r,n&&((e,t,n)=>{if(e[t])return o.arr(e[t])||(e[t]=[e[t]]),void e[t].push(n);e[t]=n})(s,n,t)};function E(e,t){const{isLoop:n,condition:o,isTemplate:r,reactiveAttrs:s,isHTML:f,isProp:m,isEval:v,isBlock:y,children:g=[],events:T=[]}=t;if(n)return a(e,t);if(o&&y)return i(e,t);if(r)return c(e,t);const O=l(e,t);return s&&d(t,O),(f||m||v&&!o)&&u(t,O),o&&h(t,O),b(t,O),p(T,O),g.forEach((e=>E(O,e))),O}return E},P=(e,t)=>{const{props:n,tag:o,parent:r}=e,s=l(n.data||{},j,"data",n),a=Object.assign(r,t("span",n)),i=L(s,n,t);((e,t=[])=>{const n=(new DOMParser).parseFromString(e,"text/html");for(const o of n.body.childNodes){const e=b(o);e&&t.push(e)}return t.flat()})(o).forEach((e=>i(r,e))),n.inserted&&n.inserted.call(a)},_=(e,t,n)=>{t.off=t.off||(e=>t.off._list[e]&&t.off._list[e]()),t.off._list=Object.assign(t.off._list||{},{[e]:n})},A=(e,t)=>(n,o)=>{const r=r=>(o.call(e,r),t&&e.off(n));e.addEventListener(n,r),_(n,e,(()=>e.removeEventListener(n,r)))},$=e=>{const{props:{passive:n,inserted:o,isChild:r},node:s,parent:a}=e;if(n||!o||!a)return e;const i=a.host||a,c=()=>o.call(s,a);if(r){if(i[t.ROOT][t.INSERTED_int.EMITTER])return i[t.ROOT][t.INSERTED_int.EMITTER].push(c),e;i[t.ROOT]=a}return i[t.INSERTED_int.EMITTER]=[c],new MutationObserver(((e,n)=>{for(const o of e)for(const e of o.addedNodes)if(e===s){n.disconnect(),i[t.INSERTED_int.EMITTER].forEach((e=>e()));break}})).observe(a,{childList:!0}),e},H=(e,n)=>o=>{e[t.OBSERVER]&&e[t.OBSERVER]({type:n,...o}),e[t.PROPS]&&e[t.PROPS].on[n]&&e.dispatchEvent(new CustomEvent(n,{detail:o}))};function B(e,o){const{props:r,node:s}=e;if(r.passive)return;const a=o.host||o||{},i=H(s,"event");s[t.EMITTER]=a[t.EMITTER]||[],s[t.EMITTER].push(s),s[n.EMIT]=(e,n)=>{const o=new CustomEvent(e,{detail:n});s[t.EMITTER].forEach((e=>e!==s&&e.dispatchEvent(o))),i({key:e,value:n})}}function D(e){const{props:n,node:o}=e;n.observe&&function(e,n){e[t.OBSERVER]=n.bind(e);const o=H(e,"attribute"),r=Array.from(e.attributes).reduce(((e,t)=>Object.assign(e,{[t.name]:t.value})),{}),s=new MutationObserver((e=>e.forEach((e=>{const t=e.target.getAttribute(e.attributeName)??void 0,n=r[e.attributeName];t!==n&&o({key:e.attributeName,value:t,oldValue:n}),r[e.attributeName]=t}))));s.observe(e,{attributes:!0}),_("observe",e,(()=>s.disconnect()))}(o,n.observe)}function Y(e){const{props:t,node:n}=e;let{state:r,passive:s}=t;s||(o.obj(r)||(console.warn("[state] must be of type object. value moved to state.value"),r={value:r}),l(r,H(n,"state"),"state",n),n.observe=function(e){return(t={},n)=>o.obj(t)?e||!n||o.func(n)?l(t,n?e=>n(Object.assign({type:"observe",data:t},e)):H(e,"observe")):console.warn("callback not specified"):console.warn("[argument] must be of type object")}(n))}const V=e=>{const{props:n,tag:o,parent:s}=e;e.node=document.createElement(o),e.node[t.PROPS]=n,e.node[t.ID]=r(),D(e),B(e,s),Y(e)},X=(e,t)=>t.replace(new RegExp(`${e}|(?!^|[\\s\\t\\r\\n]+)body(?=[\\s\\{])`,"g"),":host"),q=(e,n,r)=>{const s=n.shadowRoot?":host":n.localName;return r.host[t.STYLESHEET].textContent+=(o.obj(e)?((e,n,o)=>{const[r,s,a]=Object.entries(n).reduce(((e,[t,n])=>{const r="css"===t,s="cssText"===t;var a;return e[r?2:s&&!o.shadowRoot?1:0]+=r||s?n:`${a=t,a.replace(/[A-Z]/g,(e=>`-${e.toLowerCase()}`))}: ${n};`,e}),["","",""]);return[a&&X(o.localName,a),r&&`${e} {${r}}`,s&&(o.setAttribute(o[t.ID],"")||`${e}[${o[t.ID]}] {${s}}`)].filter(Boolean).join("")})(s,e,n):X(n.localName,e)).replace(/\s{2,}/g," ")};function z(e,t,n){const{style:o,textContent:r,innerHTML:s,template:a,on:i}=t;if(o&&q(o,{shadowRoot:!0,localName:e},n),r&&n.appendChild(document.createTextNode(r)),s){n.appendChild(document.createElement("span")).innerHTML=s}if(a){n.appendChild(document.createElement("span")).innerHTML=a}i&&Object.entries(i).forEach((([e,t])=>A(this,"once"===e)(e,t)))}const J=e=>`${e.toLowerCase()}${e.includes("-")?"":"-component"}`;function F(e){const{props:n,tag:o}=e,s=J(o),a=customElements.get(s);if(a)return e.node=new a;const{constructor:i,connected:c,disconnected:l,adopted:d}=n;class u extends HTMLElement{constructor(){super(),e.node=this;const o=this.attachShadow({mode:"open"});this[t.PROPS]=n,this[t.ID]=r(),this[t.STYLESHEET]=o.appendChild(document.createElement("style")),z.call(this,s,n,o),o.appendChild(document.createElement("slot")),D(e),B(e,this),Y(e),i&&i.call(this)}}const p=u.prototype;c&&(p.connectedCallback=c),l&&(p.disConnectedCallback=l),d&&(p.adoptedCallback=d),customElements.define(s,u),new u}const W=["style","css","on","text","textContent","html","innerHTML"],Z=["constructor","connected","disconnected","adopted","template"],G=["watch","observe","state","fetch","isChild","refs"],K=new Set("html,base,head,link,meta,script,style,title,body,address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,main,nav,section,body,blockquote,cite,dd,dt,dl,div,figcaption,figure,hr,li,ol,p,pre,ul,a,href,abbr,b,bdi,bdo,br,code,data,time,dfn,em,i,kbd,mark,q,rb,ruby,rp,rt,rtc,s,del,ins,samp,small,x-small,span,class,id,lang,strong,sub,sup,u,var,wbr,area,audio,src,source,MediaStream,img,map,track,video,embed,iframe,object,param,picture,portal,svg,math,canvas,noscript,caption,col,colgroup,table,tbody,tr,td,tfoot,th,scope,headers,thead,button,datalist,option,fieldset,label,form,input,legend,meter,optgroup,select,output,progress,textarea,details,dialog,menu,summary,slot,template,acronym,applet,basefont,bgsound,big,medium,large,blink,center,content,dir,font,frame,frameset,hgroup,h1,h2,h3,h4,h5,h6,image,isindex,keygen,listing,marquee,menuitem,multicol,nextid,nobr,noembed,noframes,plaintext,shadow,spacer,strike,tt,xmp".split(",")),Q=e=>{const{props:t,node:n,parent:o}=e;return t.created&&t.created.call(n,o),e},U=(e,n,o,r)=>{e.forEach((e=>{const s=e.tag;s?delete e.tag:console.warn("created child without [tag] property, defaults to div");const a=n.host||n;o[t.ROOT]=a[t.ROOT]||a,e.isChild=!0,ce(s||"div",r||o,e)}))},ee=e=>(t,n)=>e.setAttribute(t,n),te=e=>(t,n)=>e[t]=n;function ne(e){const{props:t,node:n,shadow:r,selfShadow:s}=e;return function t(n,a,i){Object.entries(n).forEach((([n,c])=>{if(!G.includes(n)){if(r){if(s&&W.includes(n))return;if("style"===n)return q(c,a,r)}return"className"===n&&o.obj(c)&&(c=Object.values(c).filter(Boolean).join(" ")),o.obj(c)?"children"===n?U(c,e):"on"===n?t(c,a,A(a,"once"===n)):"style"===n||"dataset"===n?t(c,a,te(a[n])):/^attr/.test(n)?t(c,a,ee(a)):void(a[n]=c):i?i(n,c):te(a)(n,c)}}))}(t,n),e}const oe=e=>{const{node:t,parent:n}=e;e.parentShadow=n&&(n.shadowRoot||n.host&&!/localhost|www/.test(n.host)&&n),e.selfShadow=t.shadowRoot,e.shadow=e.selfShadow||e.parentShadow};function re(e){const t=()=>{const{node:t,parent:n,parentShadow:o}=e;n&&(o||n).appendChild(t)};return function(e,t){const{fetch:n}=e.props;if(!n)return;const{node:r}=e.refs;r.data=r.data||{};const s=Object.entries(n).map((([e,t])=>{const[n,s={}]=o.str(t)?[t]:[t.url,t.options],a=t=>observerResponse(r,"fetch")({key:e,path:`this.data.${e}`,url:n,value:t});return fetch(n,s).then((e=>200!==e.status?a({error:e.status}):e[/json/.test(e.headers.get("content-type"))?"json":"text"]())).then((t=>{r.data[e]=t,a(t)})).catch((e=>{a({error:e.message})}))}));return Promise.all(s).then(t)}(e,t)||t(),e}const se=e=>{const{node:n,selfShadow:o}=e;return n[t.CHILDREN]=Array.from((o||n).children).filter((e=>"style"!==e.localName)),n};function ae(e){return e.isCustom?F(e):V(e),oe(e),e}function ie(e){const{props:t,tag:n}=e,r={class:"className",html:"innerHTML",text:"textContent",css:"style"},s={css:e=>({cssText:e}),style:e=>o.str(e)?{css:e}:e},a={on:{},state:{},...t};return e.isCustom=!K.has(n),e.props=Object.entries(a).reduce(((t,[n,o])=>{var a;if(!e.isCustom&&Z.includes(n))return console.warn(`"${n}" is not valid for standard HTML elements`),t;const i=r[n]||n,c=(null==(a=s[n])?void 0:a.call(s,o))||o;return t[i]="style"===i?Object.assign(t[i]||{},c):c,t}),Object.create(null)),e}function ce(){const e=[...arguments],t=e.shift(),n=(e[0]instanceof Element||e[0]instanceof ShadowRoot)&&e.shift(),o=e.shift()||{};return/</.test(t)?P({tag:t,parent:n,props:o},ce):/^(text|comment)$/.test(t)?function(e,t=document.body,n=""){return t.appendChild(document["text"===e?"createTextNode":"createComment"](n))}(t,n,o.text):[ie,ae,$,ne,Q,re,se].reduce(((e,t)=>t(e)),{tag:t,parent:n,props:o})}e.divv=ce,Object.defineProperty(e,Symbol.toStringTag,{value:"Module"})}));
