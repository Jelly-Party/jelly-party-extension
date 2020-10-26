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
    // Join: {
    //   entry: "src/apps/join/Join.ts",
    //   template: "public/index.html",
    //   filename: "join.html",
    //   title: "Jelly-Party Join",
    // },
  },
  filenameHashing: false,
  configureWebpack: {
    entry: {
      background: "./src/background/Background.ts",
      //   sidebar: "./src/apps/sidebar/Sidebar.ts",
      //   rootStyles: "./src/assets/styles/RootStyles.scss",
      //   amazonController:
      //     "./src/services/provider/providers/amazon/AmazonController.ts",
      //   defaultController:
      //     "./src/services/provider/providers/default/DefaultController.ts",
      //   disneyPlusController:
      //     "./src/services/provider/providers/disneyplus/DisneyPlusController.ts",
      //   netflixController:
      //     "./src/services/provider/providers/netflix/NetflixController.ts",
      //   vimeoController:
      //     "./src/services/provider/providers/vimeo/VimeoController.ts",
      //   youtubeController:
      //     "./src/services/provider/providers/youtube/YoutubeController.ts",
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
};
