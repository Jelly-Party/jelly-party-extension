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
  filenameHashing: false,
  configureWebpack: {
    entry: {
      background: "./src/browser/background.js",
      contentScript: "./src/browser/contentScript.js"
    }
  },
  chainWebpack: config => {
    config.optimization.splitChunks(false);
  },
  // TODO: Look into webpack's side effects: https://github.com/vuejs/vue-cli/issues/1287
  css: { extract: false }
};
