/**
 * Auditoría Lighthouse de Home y Detalle, en móvil y escritorio.
 *
 * Uso (con el build de producción corriendo en otra terminal):
 *   npm run build && npm start
 *   npm run lighthouse                       # contra http://localhost:3000
 *   BASE_URL=http://localhost:3100 npm run lighthouse
 *
 * - Calienta cada ruta antes de medir: la primera petición tras `next start`
 *   incluye el arranque en frío del servidor, que no es lo que ve un usuario.
 * - Corre cada auditoría RUNS veces y se queda con la de rendimiento
 *   mediano (Lighthouse recomienda la mediana; una sola corrida varía ±5).
 * - Deja JSON + HTML de la corrida mediana en docs/lighthouse/ y un resumen
 *   en docs/lighthouse/summary.json. Usa el CLI vía npx (o LIGHTHOUSE_BIN)
 *   para no añadir Lighthouse como dependencia del proyecto.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const BIN = process.env.LIGHTHOUSE_BIN;
const RUNS = Number(process.env.RUNS ?? 3);
const OUT = "docs/lighthouse";
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];

const targets = [
  { name: "home", path: "/" },
  { name: "detalle", path: "/razas/abyssinian" },
];
const presets = [
  { name: "mobile", flags: [] },
  { name: "desktop", flags: ["--preset=desktop"] },
];

function lighthouse(args) {
  if (BIN) execFileSync(BIN, args, { stdio: "inherit" });
  else execFileSync("npx", ["--yes", "lighthouse", ...args], { stdio: "inherit" });
}

const scoresOf = (file) => {
  const report = JSON.parse(readFileSync(`${file}.report.json`, "utf8"));
  return Object.fromEntries(CATEGORIES.map((id) => [id, Math.round(report.categories[id].score * 100)]));
};

mkdirSync(OUT, { recursive: true });

for (const target of targets) {
  for (let i = 0; i < 2; i++) await fetch(`${BASE}${target.path}`).then((response) => response.text());
}

const summary = {};
for (const target of targets) {
  for (const preset of presets) {
    const name = `${target.name}-${preset.name}`;
    const runs = [];
    for (let run = 1; run <= RUNS; run++) {
      const file = join(OUT, `${name}-run${run}`);
      console.log(`→ ${name} (${run}/${RUNS})`);
      lighthouse([
        `${BASE}${target.path}`,
        "--output=json",
        "--output=html",
        `--output-path=${file}`,
        `--only-categories=${CATEGORIES.join(",")}`,
        "--chrome-flags=--headless=new",
        "--quiet",
        ...preset.flags,
      ]);
      runs.push({ file, scores: scoresOf(file) });
    }

    const median = [...runs].sort((a, b) => a.scores.performance - b.scores.performance)[Math.floor(runs.length / 2)];
    copyFileSync(`${median.file}.report.json`, join(OUT, `${name}.report.json`));
    copyFileSync(`${median.file}.report.html`, join(OUT, `${name}.report.html`));
    for (const { file } of runs) {
      rmSync(`${file}.report.json`);
      rmSync(`${file}.report.html`);
    }
    summary[name] = { ...median.scores, performanceRuns: runs.map((r) => r.scores.performance) };
  }
}

writeFileSync(join(OUT, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.table(summary);
