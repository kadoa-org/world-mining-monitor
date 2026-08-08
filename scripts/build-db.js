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
    CREATE TABLE evidence (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      source_url TEXT,
      document_name TEXT,
      document_sha256 TEXT,
      page INTEGER,
      section TEXT,
      table_name TEXT,
      row_label TEXT,
      column_label TEXT,
      verbatim_text TEXT,
      reported_value TEXT,
      reported_unit TEXT,
      reported_period TEXT,
      document_parser TEXT,
      schema_extractor TEXT,
      parser_job_id TEXT,
      extracted_at TEXT,
      derivation_formula TEXT,
      input_evidence_ids TEXT
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
      evidence_id TEXT,
      provenance_transformations TEXT,
      FOREIGN KEY (mine_id) REFERENCES mines(id),
      FOREIGN KEY (evidence_id) REFERENCES evidence(id)
    )
  `);

  // Create indexes
  db.run("CREATE INDEX idx_production_mine ON production(mine_id)");
  db.run("CREATE INDEX idx_production_company ON production(company)");
  db.run("CREATE INDEX idx_production_commodity ON production(commodity)");
  db.run("CREATE INDEX idx_production_period ON production(time_period)");
  db.run("CREATE INDEX idx_production_metric ON production(metric)");
  db.run("CREATE INDEX idx_production_evidence ON production(evidence_id)");
  db.run("CREATE INDEX idx_evidence_document ON evidence(document_sha256)");

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
  const evidenceStmt = db.prepare(
    `INSERT OR IGNORE INTO evidence (id, kind, source_url, document_name, document_sha256, page, section, table_name, row_label, column_label, verbatim_text, reported_value, reported_unit, reported_period, document_parser, schema_extractor, parser_job_id, extracted_at, derivation_formula, input_evidence_ids)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const prodStmt = db.prepare(
    `INSERT INTO production (mine_id, company, operation, commodity, product_form, metric, value, unit, value_normalized, unit_normalized, time_period, calendar_period, period_type, basis, confidence, source_url, evidence_id, provenance_transformations)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const r of production) {
    const provenance = r.provenance || null;
    const evidenceId = provenance?.evidence_id || null;
    if (evidenceId) {
      const source = provenance.kind === "extracted" ? provenance.source || {} : {};
      const observation = provenance.kind === "extracted" ? provenance.observation || {} : {};
      const extraction = provenance.kind === "extracted" ? provenance.extraction || {} : {};
      const derivation = provenance.kind === "derived" ? provenance.derivation || {} : {};
      evidenceStmt.run([
        evidenceId,
        provenance.kind,
        source.document_url || null,
        source.document_name || null,
        source.document_sha256 || null,
        source.page ?? null,
        source.section || null,
        source.table || null,
        source.row_label || null,
        source.column_label || null,
        observation.verbatim_text || null,
        observation.reported_value == null ? null : String(observation.reported_value),
        observation.reported_unit || null,
        observation.reported_period || null,
        extraction.document_parser || null,
        extraction.schema_extractor || null,
        extraction.parser_job_id || null,
        extraction.extracted_at || null,
        derivation.formula || null,
        derivation.input_evidence_ids ? JSON.stringify(derivation.input_evidence_ids) : null,
      ]);
    }

    prodStmt.run([
      r.mine_id, r.company, r.operation || null, r.commodity, r.product_form || null,
      r.metric, r.value, r.unit, r.value_normalized, r.unit_normalized,
      r.time_period, r.calendar_period || null, r.period_type || "quarterly", r.basis, r.confidence,
      r.source_url || provenance?.source?.document_url || null, evidenceId,
      provenance?.transformations ? JSON.stringify(provenance.transformations) : null,
    ]);
  }
  evidenceStmt.free();
  prodStmt.free();

  const expectedEvidence = new Set(production.map((record) => record.provenance?.evidence_id).filter(Boolean)).size;
  const storedEvidence = db.exec("SELECT count(*) AS count FROM evidence")[0]?.values[0]?.[0] || 0;
  const orphanedEvidence = db.exec(
    "SELECT count(*) AS count FROM production p LEFT JOIN evidence e ON e.id = p.evidence_id WHERE p.evidence_id IS NOT NULL AND e.id IS NULL",
  )[0]?.values[0]?.[0] || 0;
  if (storedEvidence !== expectedEvidence || orphanedEvidence !== 0) {
    throw new Error(
      `Evidence integrity check failed: expected=${expectedEvidence}, stored=${storedEvidence}, orphaned=${orphanedEvidence}`,
    );
  }

  // Export
  const data = db.export();
  const buffer = Buffer.from(data);
  const outPath = join(root, "public/data/mining.db");
  writeFileSync(outPath, buffer);

  console.log(
    `Built mining.db: ${mines.length} mines, ${production.length} production records, ${storedEvidence} evidence records`,
  );
  console.log(`Size: ${(buffer.length / 1024).toFixed(0)} KB (vs ${(readFileSync(join(root, "public/data/production.json")).length / 1024).toFixed(0)} KB JSON)`);

  db.close();
}

build().catch(console.error);
