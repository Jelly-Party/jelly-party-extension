module.exports = {
  root: true,
  env: {
    node: true,
    webextensions: true,
    browser: true,
  },
  extends: [
    "plugin:vue/recommended",
    "eslint:recommended",
    "@vue/typescript/recommended",
    "@vue/prettier",
    "@vue/prettier/@typescript-eslint",
  ],
  parserOptions: {
    ecmaVersion: 2020,
  },
  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/ban-ts-ignore": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { vars: "all", args: "none", ignoreRestSiblings: false },
    ],
    "@typescript-eslint/no-explicit-any": 0,
  },
  plugins: ["import"],
  settings: {
    "import/resolver": {
      alias: {
        map: [
          ["@", "./src"], //default @ -> ./src alias in Vue, it exists even if vue.config.js is not present
          /*
           *... add your own webpack aliases if you have them in vue.config.js/other webpack config file
           * if you forget to add them, eslint-plugin-import will not throw linting error in .vue imports that contain the webpack alias you forgot to add
           */
        ],
        extensions: [".vue", ".json", ".js"],
      },
    },
  },
};
