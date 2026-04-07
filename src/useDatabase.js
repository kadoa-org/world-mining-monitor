import { useEffect, useState } from "react";
import initSqlJs from "sql.js";

// sql.js needs the WASM file -- use CDN for simplicity
const SQL_WASM_URL = "https://sql.js.org/dist/sql-wasm.wasm";

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await initSqlJs({ locateFile: () => SQL_WASM_URL });
      const response = await fetch("/data/mining.db");
      const buffer = await response.arrayBuffer();
      return new SQL.Database(new Uint8Array(buffer));
    })();
  }
  return dbPromise;
}

export function useDatabase() {
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDb()
      .then((d) => { setDb(d); setLoading(false); })
      .catch((e) => { setError(e); setLoading(false); });
  }, []);

  return { db, loading, error };
}

/**
 * Run a SELECT query and return rows as objects.
 */
export function query(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}
