module.exports = {
  root: true,

  env: {
    node: true,
    webextensions: true,
    browser: true,
  },

  parserOptions: {
    parser: "@typescript-eslint/parser",
  },

  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-unused-vars": [
      "error",
      { vars: "all", args: "none", ignoreRestSiblings: false },
    ],
  },

  extends: ["plugin:vue/essential", "eslint:recommended", "@vue/typescript"],
};
