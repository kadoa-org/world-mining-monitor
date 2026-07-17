/**
 * Emit public/data/stats.json — the tiny summary the Masthead reads without
 * loading the full SQLite DB. generatedAt uses the DB file's mtime so the
 * freshness badge stays honest even when the site is rebuilt without new data.
 *
 * Run: node scripts/build-stats.js  (wired into `npm run build`)
 */
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = join(root, "public/data/mining.db");

const SQL = await initSqlJs();
const db = new SQL.Database(readFileSync(dbPath));

const rows = [];
const stmt = db.prepare(
  "SELECT time_period, count(*) AS n FROM production WHERE metric = 'production' GROUP BY time_period",
);
while (stmt.step()) rows.push(stmt.getAsObject());
stmt.free();

// Latest quarter with meaningful coverage (>= 5 records), same heuristic as
// the app, so the badge and the overview agree.
const qKey = (tp) => `${tp.slice(3)}${tp[1]}`;
const latestQuarter =
  rows
    .filter((r) => /^Q[1-4] \d{4}$/.test(r.time_period) && r.n >= 5)
    .sort((a, b) => qKey(b.time_period).localeCompare(qKey(a.time_period)))[0]?.time_period ?? null;

const counts = {};
for (const [key, sql] of [
  ["records", "SELECT count(*) AS n FROM production"],
  ["companies", "SELECT count(DISTINCT company) AS n FROM production"],
  ["mines", "SELECT count(*) AS n FROM mines"],
]) {
  const s = db.prepare(sql);
  s.step();
  counts[key] = s.getAsObject().n;
  s.free();
}
db.close();

const stats = {
  generatedAt: statSync(dbPath).mtime.toISOString(),
  latestQuarter,
  ...counts,
};

writeFileSync(join(root, "public/data/stats.json"), `${JSON.stringify(stats, null, 2)}\n`);
console.log("stats.json:", JSON.stringify(stats));
