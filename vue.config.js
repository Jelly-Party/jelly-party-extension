// vue.config.js
module.exports = {
  publicPath: "",
  assetsDir: "",
  lintOnSave: true,
  pages: {
    index: {
      entry: "src/main.ts",
      template: "public/index.html",
      filename: "index.html",
      title: "Jelly-Party App",
    },
    IFrame: {
      entry: "src/IFrame.ts",
      template: "public/index.html",
      filename: "iframe.html",
      title: "Jelly-Party IFrame",
    },
  },
  pluginOptions: {
    webpackBundleAnalyzer: {
      openAnalyzer: false,
    },
  },
  filenameHashing: false,
  configureWebpack: {
    entry: {
      background: "./src/browser/background.js",
      sideBar: "./src/browser/sideBar.js",
      RootStyles: "./src/styles/RootStyles.scss",
    },
    devtool: ["development", "staging"].includes(process.env.NODE_ENV)
      ? "eval-source-map"
      : "",
    // TODO: see https://github.com/webpack/webpack/issues/1625
    // output: {
    //   library: "beta",
    //   libraryTarget: "var"
    // }
  },
  chainWebpack: (config) => {
    config.optimization.splitChunks(false);
    const svgRule = config.module.rule("svg");
    svgRule.uses.clear();
    svgRule
      .use("babel-loader")
      .loader("babel-loader")
      .end()
      .use("vue-svg-loader")
      .loader("vue-svg-loader");
    config.module
      .rule("images")
      .use("url-loader")
      .loader("url-loader")
      .tap((options) => Object.assign(options, { limit: 100240 }));
  },
  // TODO: Look into webpack's side effects: https://github.com/vuejs/vue-cli/issues/1287
  // css: { extract: false },
  css: {
    loaderOptions: {
      sass: {
        prependData: `@import "~@/styles/_variables.scss";`,
      },
    },
  },
};
