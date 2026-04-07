import React, { useMemo, useState } from "react";
import { COMMODITY_COLORS } from "./constants";

const SORT_ICONS = { asc: "\u2191", desc: "\u2193", none: "\u2195" };

function getPrevPeriod(period) {
  if (!period) return null;
  // Q1-Q4
  const qm = period.match(/^Q(\d)\s+(\d{4})$/);
  if (qm) {
    const q = parseInt(qm[1], 10);
    const y = parseInt(qm[2], 10);
    return q === 1 ? `Q4 ${y - 1}` : `Q${q - 1} ${y}`;
  }
  // H1/H2
  const hm = period.match(/^H(\d)\s+(\d{4})$/);
  if (hm) {
    const h = parseInt(hm[1], 10);
    const y = parseInt(hm[2], 10);
    return h === 1 ? `H2 ${y - 1}` : `H1 ${y}`;
  }
  // FY
  const fm = period.match(/^FY\s?(\d{4})$/);
  if (fm) return `FY${parseInt(fm[1], 10) - 1}`;
  return null;
}

function formatValue(v, unit) {
  if (v == null) return "-";
  if (typeof v === "string") return v;
  if (Math.abs(v) >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 1 });
  if (Math.abs(v) >= 1) return v.toFixed(1);
  return v.toFixed(3);
}

function toCSV(rows) {
  const headers = [
    "company",
    "operation",
    "commodity",
    "product_form",
    "metric",
    "value",
    "unit",
    "value_normalized",
    "unit_normalized",
    "time_period",
    "qoq",
    "basis",
    "confidence",
    "source_url",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const vals = headers.map((h) => {
      const v = r[h];
      if (v == null) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    });
    lines.push(vals.join(","));
  }
  return lines.join("\n");
}


function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DataTable({ production, mines, filters, activePeriod, initialSearch, onSearchChange }) {
  const [sortCol, setSortCol] = useState("company");
  const [sortDir, setSortDir] = useState("asc");
  const [search, setSearchLocal] = useState(initialSearch || "");

  // Sync initial search from map "View data" click
  React.useEffect(() => {
    if (initialSearch) setSearchLocal(initialSearch);
  }, [initialSearch]);

  const setSearch = (v) => {
    setSearchLocal(v);
    onSearchChange?.(v);
  };

  // Build table rows: join production with mine metadata
  const mineMap = useMemo(() => {
    const m = new Map();
    for (const mine of mines) m.set(mine.id, mine);
    return m;
  }, [mines]);

  // Build lookup for previous quarter values (include operation to avoid collisions)
  const prevLookup = useMemo(() => {
    const map = new Map();
    for (const p of production) {
      const key = `${p.mine_id}|${p.operation || ""}|${p.commodity}|${p.product_form || ""}|${p.metric}|${p.time_period}`;
      map.set(key, p.value_normalized);
    }
    return map;
  }, [production]);

  const rows = useMemo(() => {
    return production
      .filter((p) => {
        if (filters.commodity !== "all" && p.commodity !== filters.commodity) return false;
        if (filters.companies.length > 0 && !filters.companies.includes(p.company)) return false;
        if (activePeriod && filters.period !== "all" && p.time_period !== activePeriod) return false;
        const mine = mineMap.get(p.mine_id);
        if (filters.region !== "All" && mine && mine.region !== filters.region) return false;
        return true;
      })
      .map((p) => {
        const mine = mineMap.get(p.mine_id);
        const pq = getPrevPeriod(p.time_period);
        const prevKey = pq ? `${p.mine_id}|${p.operation || ""}|${p.commodity}|${p.product_form || ""}|${p.metric}|${pq}` : null;
        const prevVal = prevKey ? prevLookup.get(prevKey) : null;
        const qoq =
          prevVal != null && prevVal > 0 && p.value_normalized != null
            ? ((p.value_normalized - prevVal) / prevVal) * 100
            : null;
        return { ...p, country: mine?.country || "", region: mine?.region || "", mine_name: mine?.name || "", qoq };
      });
  }, [production, mineMap, filters, activePeriod, prevLookup]);

  // Search
  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.company?.toLowerCase().includes(q) ||
        r.operation?.toLowerCase().includes(q) ||
        r.commodity?.toLowerCase().includes(q) ||
        r.country?.toLowerCase().includes(q) ||
        r.mine_name?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va = a[sortCol];
      let vb = b[sortCol];
      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }
      va = String(va || "").toLowerCase();
      vb = String(vb || "").toLowerCase();
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [filtered, sortCol, sortDir]);

  const toggleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const columns = [
    { key: "company", label: "Company", w: "w-36" },
    { key: "operation", label: "Operation", w: "w-32" },
    { key: "commodity", label: "Commodity", w: "w-24" },
    { key: "metric", label: "Metric", w: "w-20" },
    { key: "time_period", label: "Period", w: "w-24" },
    { key: "value_normalized", label: "Value", w: "w-24", align: "right" },
    { key: "unit_normalized", label: "Unit", w: "w-16" },
    { key: "qoq", label: "QoQ", w: "w-20", align: "right" },
    { key: "country", label: "Country", w: "w-24" },
    { key: "basis", label: "Basis", w: "w-20" },
    { key: "source_url", label: "Source", w: "w-16" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0a14]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search company, mine, commodity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-xs text-white/80 w-64 outline-none focus:border-orange-500/50 placeholder:text-white/20"
          />
          <span className="text-[11px] text-white/30 tabular-nums">{sorted.length} rows</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => download(toCSV(sorted), `mining-production-${activePeriod}.csv`, "text/csv")}
            className="px-3 py-1.5 text-[11px] bg-white/5 border border-white/10 rounded text-white/60 hover:text-white/90 hover:border-orange-500/30 transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => {
              const allRows = production.map((p) => {
                const mine = mineMap.get(p.mine_id);
                return { ...p, country: mine?.country || "", region: mine?.region || "" };
              });
              download(toCSV(allRows), "mining-production-all-periods.csv", "text/csv");
            }}
            className="px-3 py-1.5 text-[11px] bg-orange-500/10 border border-orange-500/20 rounded text-orange-400/80 hover:text-orange-400 hover:border-orange-500/40 transition-colors"
          >
            Export All Periods
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(toCSV(sorted));
            }}
            className="px-3 py-1.5 text-[11px] bg-white/5 border border-white/10 rounded text-white/60 hover:text-white/90 hover:border-orange-500/30 transition-colors"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#0d0d1a] border-b border-white/10">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`${col.w} px-3 py-2 text-left font-medium text-white/40 cursor-pointer hover:text-white/70 select-none whitespace-nowrap ${col.align === "right" ? "text-right" : ""}`}
                >
                  {col.label}{" "}
                  <span className="text-white/20">{sortCol === col.key ? SORT_ICONS[sortDir] : SORT_ICONS.none}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const color = COMMODITY_COLORS[row.commodity] || "#6b7280";
              return (
                <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-1.5 text-white/70 truncate">{row.company}</td>
                  <td className="px-3 py-1.5 text-white/50 truncate">{row.operation || "-"}</td>
                  <td className="px-3 py-1.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-white/60">{row.commodity?.replace(/_/g, " ")}</span>
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-white/40">{row.metric}</td>
                  <td className="px-3 py-1.5 text-white/50">{row.time_period}</td>
                  <td className="px-3 py-1.5 text-orange-400/80 tabular-nums text-right font-medium">
                    {formatValue(row.value_normalized ?? row.value)}
                  </td>
                  <td className="px-3 py-1.5 text-white/30">{row.unit_normalized || row.unit}</td>
                  <td className="px-3 py-1.5 tabular-nums text-right">
                    {row.qoq != null ? (
                      <span className={row.qoq >= 0 ? "text-emerald-400/80" : "text-red-400/80"}>
                        {row.qoq >= 0 ? "+" : ""}
                        {row.qoq.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-white/10">-</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-white/40 truncate">{row.country || "-"}</td>
                  <td className="px-3 py-1.5 text-white/30">{row.basis}</td>
                  <td className="px-3 py-1.5">
                    {row.source_url ? (
                      <a
                        href={row.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400/60 hover:text-orange-400"
                      >
                        PDF
                      </a>
                    ) : (
                      <span className="text-white/10">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
