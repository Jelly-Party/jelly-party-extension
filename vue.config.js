// vue.config.js
module.exports = {
  publicPath: "",
  assetsDir: "",
  pages: {
    index: {
      entry: "src/main.js",
      template: "public/index.html",
      filename: "index.html",
      title: "Jelly-Party App"
    }
  },
  // background: {
  //   entry: "src/browser/background.js",
  //   filename: "background.js"
  // }
  configureWebpack: {
    entry: {
      background: "./src/browser/background.js"
    }
  },
  chainWebpack: config => {
    config.optimization.splitChunks(false);
  }
};
