// vue.config.js
module.exports = {
  publicPath: "",
  assetsDir: "",
  lintOnSave: true,
  pages: {
    index: {
      entry: "src/main.js",
      template: "public/index.html",
      filename: "index.html",
      title: "Jelly-Party App"
    }
  },
  pluginOptions: {
    webpackBundleAnalyzer: {
      openAnalyzer: true
    }
  },
  filenameHashing: false,
  configureWebpack: {
    entry: {
      background: "./src/browser/background.js",
      contentScript: "./src/browser/contentScript.js"
    }
    // TODO: see https://github.com/webpack/webpack/issues/1625
    // output: {
    //   library: "beta",
    //   libraryTarget: "var"
    // }
  },
  chainWebpack: config => {
    config.optimization.splitChunks(false);
    const svgRule = config.module.rule("svg");
    svgRule.uses.clear();
    svgRule
      .use("babel-loader")
      .loader("babel-loader")
      .end()
      .use("vue-svg-loader")
      .loader("vue-svg-loader");
  },
  // TODO: Look into webpack's side effects: https://github.com/vuejs/vue-cli/issues/1287
  css: { extract: false }
};
