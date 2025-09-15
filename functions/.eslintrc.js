module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    // Avoid requiring full TypeScript program for lint to reduce tooling friction
    tsconfigRootDir: __dirname,
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "/generated/**/*", // Ignore generated files.
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    "quotes": ["error", "double", {"avoidEscape": true, "allowTemplateLiterals": true}],
    "import/no-unresolved": 0,
    "indent": ["error", 2],
    "require-jsdoc": 0,
    "max-len": ["error", {"code": 120}],
    "object-curly-spacing": 0,
    "space-before-function-paren": 0,
  },
  overrides: [
    {
      files: ["test/**/*.ts"],
      rules: {
        "require-jsdoc": 0,
        "quotes": 0,
        "object-curly-spacing": 0,
        "max-len": 0,
      },
    },
  ],
};
