// vue.config.js
module.exports = {
  publicPath: "",
  assetsDir: "",
  lintOnSave: true,
  pages: {
    index: {
      entry: "src/popup/main.ts",
      template: "public/index.html",
      filename: "popup.html",
      title: "Jelly-Party App",
    },
    IFrame: {
      entry: "src/iFrame/IFrame.ts",
      template: "public/index.html",
      filename: "iframe.html",
      title: "Jelly-Party IFrame",
    },
    Join: {
      entry: "src/join.jelly-party.com/index.ts",
      template: "public/index.html",
      filename: "join.html",
      title: "Jelly-Party Join",
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
      background: "./src/background.ts",
      hostFrame: "./src/sidebar/main.ts",
      RootStyles: "./src/assets/styles/RootStyles.scss",
    },
    devtool: ["development", "staging"].includes(process.env.NODE_ENV)
      ? "source-map"
      : "",
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
    config.module
      .rule("images")
      .use("url-loader")
      .loader("url-loader")
      .tap(options => Object.assign(options, { limit: 100240 }));
  },
  // TODO: Look into webpack's side effects: https://github.com/vuejs/vue-cli/issues/1287
  css: {
    loaderOptions: {
      sass: {
        prependData: `@import "~@/assets/styles/_variables.scss";`,
      },
    },
    extract: false,
  },
};
