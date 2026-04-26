import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Existing client pages use common mount-time loading effects and a
      // development monitor that renders relative timestamps. Keep lint focused
      // on production defects while the larger UI refactors land incrementally.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/static-components": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-dev/**",
    "out/**",
    "build/**",
    "artifacts/**",
    "convex/_generated/**",
    "src/app/engine-mock/bitsy/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
