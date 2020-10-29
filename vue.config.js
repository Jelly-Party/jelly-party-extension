// vue.config.js
module.exports = {
  publicPath: "",
  assetsDir: "",
  lintOnSave: true,
  pages: {
    index: {
      entry: "src/apps/popup/Popup.ts",
      template: "public/index.html",
      filename: "popup.html",
      title: "Jelly-Party App",
    },
    iframe: {
      entry: "src/apps/iframe/IFrame.ts",
      template: "public/index.html",
      filename: "iframe.html",
      title: "Jelly-Party IFrame",
    },
    Join: {
      entry: "src/apps/join/Join.ts",
      template: "public/index.html",
      filename: "join.html",
      title: "Jelly-Party Join",
    },
  },
  pluginOptions: {
    manifest: {
      cspAppender: manifest => {
        let csp = [
          { key: "connect-src", value: process.env.VUE_APP_WS_ADDRESS },
        ];
        if (["staging", "development"].includes(process.env.NODE_ENV)) {
          csp = csp.concat([
            { key: "script-src", value: "'unsafe-eval'" },
            { key: "connect-src", value: "http://localhost:8098" },
            { key: "connect-src", value: "ws://localhost:8098" },
          ]);
        }
        return csp;
      },
    },
  },
  filenameHashing: false,
  configureWebpack: {
    entry: {
      background: "./src/background/Background.ts",
    },
    devtool: ["development", "staging"].includes(process.env.NODE_ENV)
      ? "source-map"
      : "",
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
  css: {
    loaderOptions: {
      sass: {
        prependData: `@import "~@/assets/styles/_variables.scss";`,
      },
    },
    extract: false,
  },
};
