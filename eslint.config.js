// ESLint flat config for ESLint v9
import js from "@eslint/js";
import globals from "globals";

export default [
  // Base recommended rules
  js.configs.recommended,

  // Project configuration
  {
    ignores: [
      "**/*.min.js",
      "gpu-io.min.js",
      "three.min.js",
      "sw.js",
      "eslint.config.js",
      "node_modules/**",
      "dist/**",
      "build/**",
    ],
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Relaxations for legacy/experimental code paths
      "no-unused-vars": ["warn", { "args": "none", "varsIgnorePattern": "^_" }],
      "no-empty": "off",
      "no-useless-escape": "off",
    },
  },
];