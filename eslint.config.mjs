import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Fronteras de la arquitectura hexagonal, comprobadas en cada lint:
 * las dependencias solo apuntan hacia dentro (presentación → aplicación →
 * dominio). Un import en sentido contrario rompe el lint, no la revisión.
 */
const restrict = (patterns, message) => ({
  "no-restricted-imports": ["error", { patterns: [{ group: patterns, message }] }],
});

const FRAMEWORKS = ["react", "react-dom", "react/*", "next", "next/*", "zustand", "@tanstack/*"];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/domain/**"],
    rules: restrict(
      ["@application/*", "@infrastructure/*", "@presentation/*", "@/*", "zod", ...FRAMEWORKS],
      "El dominio es TypeScript puro: no conoce casos de uso, adaptadores, UI ni librerías.",
    ),
  },
  {
    files: ["src/application/**"],
    rules: restrict(
      ["@infrastructure/*", "@presentation/*", "@/*", ...FRAMEWORKS],
      "La aplicación define puertos; no importa adaptadores, UI ni frameworks.",
    ),
  },
  {
    files: ["src/infrastructure/**"],
    rules: restrict(["@presentation/*", "@/*"], "La infraestructura implementa puertos; no conoce la UI."),
  },
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts", "public/sw.js"]),
]);

export default eslintConfig;
