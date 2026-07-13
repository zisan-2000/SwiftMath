import { readFileSync } from "node:fs";

const MIN_PWA_SCORE = 90;
const reportPath = process.argv[2] ?? "lighthouse-pwa.json";

const raw = readFileSync(reportPath, "utf8");
const report = JSON.parse(raw) as {
  categories?: { pwa?: { score?: number } };
};

const score = (report.categories?.pwa?.score ?? 0) * 100;

if (score < MIN_PWA_SCORE) {
  console.error(`Lighthouse PWA score ${score.toFixed(0)} is below ${MIN_PWA_SCORE}`);
  process.exit(1);
}

console.log(`Lighthouse PWA score OK: ${score.toFixed(0)}`);
