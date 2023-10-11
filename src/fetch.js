import { isType } from './helpers';
import { observerResponse } from './observer';

export function prefetch(state, append) {
  const { props: { fetch: prefetch }, node } = state;
  if (!prefetch) return;

  node.data = node.data || {};

  const fetchers = Object.entries(prefetch).map(([ key, config ]) => {

      const [ url, options = {} ] = isType.str(config) 
          ? [ config ] 
          : [ config.url, config.options ];

      const callback = value => observerResponse(node, 'fetch')({
          key, 
          path: `this.data.${key}`,
          url,
          value
      });

      return fetch(url, options)
          .then(res => {
              if (res.status !== 200) return callback({ error: res.status });
              return res[
                  /json/.test(res.headers.get('content-type')) 
                      ? 'json' 
                      : 'text'
              ]();
          })
          .then(data => {
              node.data[key] = data;
              callback(data);
          })
          .catch(err => {
              callback({ error: err.message });
          });
  });

  return Promise.all(fetchers).then(append);
}