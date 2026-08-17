/**
 * Convert JSON data files to a SQLite database for the viz.
 * Run: bun scripts/build-db.js
 */
import initSqlJs from "sql.js";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

async function build() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // Create tables
  db.run(`
    CREATE TABLE mines (
      id TEXT PRIMARY KEY,
      name TEXT,
      company TEXT,
      lat REAL,
      lng REAL,
      country TEXT,
      region TEXT,
      commodities TEXT
    )
  `);

  db.run(`
    CREATE TABLE production (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mine_id TEXT,
      company TEXT,
      operation TEXT,
      commodity TEXT,
      product_form TEXT,
      metric TEXT,
      value REAL,
      unit TEXT,
      value_normalized REAL,
      unit_normalized TEXT,
      time_period TEXT,
      calendar_period TEXT,
      period_type TEXT,
      basis TEXT,
      confidence REAL,
      source_url TEXT,
      source_document_name TEXT,
      source_page INTEGER,
      source_section TEXT,
      source_table TEXT,
      source_row TEXT,
      source_column TEXT,
      source_excerpt TEXT,
      reported_value TEXT,
      reported_unit TEXT,
      reported_period TEXT,
      FOREIGN KEY (mine_id) REFERENCES mines(id)
    )
  `);

  // Create indexes
  db.run("CREATE INDEX idx_production_mine ON production(mine_id)");
  db.run("CREATE INDEX idx_production_company ON production(company)");
  db.run("CREATE INDEX idx_production_commodity ON production(commodity)");
  db.run("CREATE INDEX idx_production_period ON production(time_period)");
  db.run("CREATE INDEX idx_production_metric ON production(metric)");

  // Load mines
  const mines = JSON.parse(readFileSync(join(root, "public/data/mines.json"), "utf-8"));
  const mineStmt = db.prepare(
    "INSERT INTO mines (id, name, company, lat, lng, country, region, commodities) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  for (const m of mines) {
    mineStmt.run([m.id, m.name, m.company, m.lat, m.lng, m.country, m.region, JSON.stringify(m.commodities || [])]);
  }
  mineStmt.free();

  // Load production
  const production = JSON.parse(readFileSync(join(root, "public/data/production.json"), "utf-8"));
  const prodStmt = db.prepare(
    `INSERT INTO production (mine_id, company, operation, commodity, product_form, metric, value, unit, value_normalized, unit_normalized, time_period, calendar_period, period_type, basis, confidence, source_url, source_document_name, source_page, source_section, source_table, source_row, source_column, source_excerpt, reported_value, reported_unit, reported_period)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const r of production) {
    const provenance = r.provenance || null;
    const source = provenance?.kind === "extracted" ? provenance.source || {} : {};
    const observation = provenance?.kind === "extracted" ? provenance.observation || {} : {};

    prodStmt.run([
      r.mine_id, r.company, r.operation || null, r.commodity, r.product_form || null,
      r.metric, r.value, r.unit, r.value_normalized, r.unit_normalized,
      r.time_period, r.calendar_period || null, r.period_type || "quarterly", r.basis, r.confidence,
      r.source_url || null,
      r.source_document_name || source.document_name || null,
      source.page ?? null,
      source.section || null,
      source.table || null,
      source.row_label || null,
      source.column_label || null,
      observation.verbatim_text || null,
      observation.reported_value == null ? null : String(observation.reported_value),
      observation.reported_unit || null,
      observation.reported_period || null,
    ]);
  }
  prodStmt.free();

  const expectedVerifiableRows = production.filter((record) => record.provenance?.kind === "extracted").length;
  const storedVerifiableRows = db.exec(
    `SELECT count(*) AS count FROM production
     WHERE source_url LIKE 'https://kadoa.b-cdn.net/mining-sources/%'
       AND coalesce(source_document_name, '') <> ''
       AND coalesce(source_excerpt, '') <> ''
       AND reported_value IS NOT NULL
       AND coalesce(reported_unit, '') <> ''
       AND coalesce(reported_period, '') <> ''
       AND (
         source_page IS NOT NULL
         OR coalesce(source_section, '') <> ''
         OR coalesce(source_table, '') <> ''
         OR coalesce(source_row, '') <> ''
         OR coalesce(source_column, '') <> ''
       )`,
  )[0]?.values[0]?.[0] || 0;
  if (storedVerifiableRows !== expectedVerifiableRows) {
    throw new Error(`Verification integrity check failed: expected=${expectedVerifiableRows}, stored=${storedVerifiableRows}`);
  }

  // Export
  const data = db.export();
  const buffer = Buffer.from(data);
  const outPath = join(root, "public/data/mining.db");
  writeFileSync(outPath, buffer);

  console.log(
    `Built mining.db: ${mines.length} mines, ${production.length} production records, ${storedVerifiableRows} verifiable records`,
  );
  console.log(`Size: ${(buffer.length / 1024).toFixed(0)} KB (vs ${(readFileSync(join(root, "public/data/production.json")).length / 1024).toFixed(0)} KB JSON)`);

  db.close();
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
