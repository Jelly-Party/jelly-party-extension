/* eslint @typescript-eslint/no-var-requires: "off" */
const CopyPlugin = require('copy-webpack-plugin')
const CPS = require('csp-generator');

function cspAppender(entries, manifest) {
  const csp = new CPS(manifest['content_security_policy'] ? manifest['content_security_policy'] : "");
  entries.forEach(function(entry) {
    csp.append(entry.key, entry.value)
  })
  manifest['content_security_policy'] = csp.generate();
  return manifest;
}

function cspAppenderWrapper(func, manifest) {
  return cspAppender(func(manifest), manifest);
}

function applyTransformer(transformer, content) {
  let manifest = JSON.parse(content);
  manifest = transformer(manifest);
  return JSON.stringify(manifest, null, 2)
}

function transformer(options) {
  if (options.pluginOptions && options.pluginOptions.manifest && options.pluginOptions.manifest.cspAppender) {
    return applyTransformer.bind(null, cspAppenderWrapper.bind(null, options.pluginOptions.manifest.cspAppender))
  }
}

module.exports = (api, options) => {
  const patterns = [
    {
      from: 'src/manifest.json',
      to: 'manifest.json',
      transform: transformer(options)
    }
  ]
  api.chainWebpack(webpackConfig => {
    webpackConfig
      .plugin('copy-manifest')
        .use(CopyPlugin, [patterns])
  })
}
