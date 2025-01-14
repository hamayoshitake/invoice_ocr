module.exports = {
  root: true,
  env: { es6: true, node: true },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.json", "./tsconfig.dev.json"],
    tsconfigRootDir: __dirname,
    sourceType: "module"
  },
  ignorePatterns: ["/lib/**/*", ".eslintrc.js"],
  plugins: ["@typescript-eslint", "import"],
  ules: {
    "quotes": ["error", "single"],
    "import/no-unresolved": 0,
    "object-curly-spacing": ["error", "always"],
    "comma-dangle": ["error", "never"]
  }
};