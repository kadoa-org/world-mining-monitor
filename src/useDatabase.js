import { useEffect, useState } from "react";
import initSqlJs from "sql.js";

// Self-hosted from public/ (copied from node_modules/sql.js/dist) so it loads
// same-origin — keeps working under a strict CSP after the www.kadoa.com/mining
// subfolder cutover.
const SQL_WASM_URL = `${import.meta.env.BASE_URL}sql-wasm.wasm`;

let dbPromise = null;

function loadDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await initSqlJs({ locateFile: () => SQL_WASM_URL });
      const response = await fetch(`${import.meta.env.BASE_URL}data/mining.db`);
      if (!response.ok) throw new Error(`Failed to load mining.db: ${response.status}`);
      const buffer = await response.arrayBuffer();
      return new SQL.Database(new Uint8Array(buffer));
    })();
  }
  return dbPromise;
}

// `enabled` lets callers defer the sql.js + DB fetch until a route actually
// needs it. The promise is cached, so the second enabled mount reuses the
// in-flight or resolved load instead of re-fetching.
export function useDatabase(enabled = true) {
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadDb()
      .then((d) => {
        setDb(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e);
        setLoading(false);
      });
  }, [enabled]);

  return { db, loading, error };
}

// Execute a SQL query and return rows as plain JS objects.
export function query(db, sql, params = []) {
  if (!db) return [];
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}
