import CopyPlugin from "copy-webpack-plugin";
import CPS from "csp-generator";

function cspAppender(entries: any[], manifest: { [x: string]: any }) {
  const csp = new CPS(
    manifest["content_security_policy"]
      ? manifest["content_security_policy"]
      : "",
  );
  entries.forEach(function(entry) {
    csp.append(entry.key, entry.value);
  });
  manifest["content_security_policy"] = csp.generate();
  return manifest;
}

function cspAppenderWrapper(func: (arg0: any) => any, manifest: any) {
  return cspAppender(func(manifest), manifest);
}

function applyTransformer(transformer: (arg0: any) => any, content: string) {
  let manifest = JSON.parse(content);
  manifest = transformer(manifest);
  return JSON.stringify(manifest, null, 2);
}

function transformer(options: {
  pluginOptions: { manifest: { cspAppender: any } };
}) {
  if (
    options.pluginOptions &&
    options.pluginOptions.manifest &&
    options.pluginOptions.manifest.cspAppender
  ) {
    return applyTransformer.bind(
      null,
      cspAppenderWrapper.bind(null, options.pluginOptions.manifest.cspAppender),
    );
  }
}

module.exports = (
  api: { chainWebpack: (arg0: (webpackConfig: any) => void) => void },
  options: any,
) => {
  const patterns = [
    {
      from: "src/manifest.json",
      to: "manifest.json",
      transform: transformer(options),
    },
  ];
  api.chainWebpack(webpackConfig => {
    webpackConfig.plugin("copy-manifest").use(CopyPlugin, [patterns]);
  });
};
