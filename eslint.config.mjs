import js from "@eslint/js";
import globals from "globals";

export default [
  // These are built from linted sources or vendored. CI checks their syntax separately.
  { ignores: ["scripts/*.min.js", "gpu-io.min.js", "three.min.js"] },
  js.configs.recommended,
  {
    files: ["scripts/*.js", "fluid-background.js"],
    languageOptions: { ecmaVersion: 2021, sourceType: "script", globals: globals.browser },
    rules: { "no-empty": ["error", { allowEmptyCatch: true }] },
  },
  {
    files: ["sw.js"],
    languageOptions: { ecmaVersion: 2021, sourceType: "script", globals: globals.serviceworker },
  },
  {
    files: ["dev-server.js", "tools/**/*.js"],
    languageOptions: { ecmaVersion: 2021, sourceType: "commonjs", globals: globals.node },
  },
];
