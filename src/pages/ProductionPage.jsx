import React, { useMemo, useState } from "react";
import { COMMODITY_COLORS, commodityLabel } from "../constants";
import { getPrevPeriod } from "../data";
import {
  Card,
  DownloadCsvButton,
  downloadCsv,
  fmtInt,
  fmtValue,
  Link,
  rowsToCsv,
  SectionHeader,
  SortHeader,
  slugify,
} from "../ui";

const MAX_RENDERED = 1000;

// Chronologically sortable key for a period label. Clean periods (Q/H/9M/FY)
// order by year then specificity; free-text labels sink to the bottom.
function periodKey(tp) {
  if (!tp) return "0000";
  const q = tp.match(/^Q([1-4]) (\d{4})$/);
  if (q) return `${q[2]}-3-Q${q[1]}`;
  const h = tp.match(/^H([12]) (\d{4})$/);
  if (h) return `${h[2]}-2-H${h[1]}`;
  const nm = tp.match(/^9M (\d{4})$/);
  if (nm) return `${nm[1]}-2-N9`;
  const fy = tp.match(/^FY\s?(\d{4})$/);
  if (fy) return `${fy[1]}-1-FY`;
  const ytd = tp.match(/^YTD (\d{4})$/);
  if (ytd) return `${ytd[1]}-0-YT`;
  return "0000";
}

const CSV_COLUMNS = [
  ["company", "company"],
  ["operation", "operation"],
  ["commodity", "commodity"],
  ["metric", "metric"],
  ["time_period", "period"],
  ["value_normalized", "value"],
  ["unit_normalized", "unit"],
  ["qoq", "qoq_pct"],
  ["country", "country"],
  ["basis", "basis"],
  ["source_url", "source_url"],
];

export default function ProductionPage({ data, initialQuery = {} }) {
  const { production, mineById, companies, commodities, periods } = data;
  const [search, setSearch] = useState(initialQuery.search || "");
  const [commodity, setCommodity] = useState(initialQuery.commodity || "all");
  const [company, setCompany] = useState(initialQuery.company || "all");
  const [period, setPeriod] = useState(initialQuery.period || "all");
  const [metric, setMetric] = useState(initialQuery.metric || "production");
  const [sort, setSort] = useState("-time_period");

  // Previous-period lookup for QoQ deltas (operation included to avoid collisions).
  const prevLookup = useMemo(() => {
    const map = new Map();
    for (const p of production) {
      map.set(
        `${p.mine_id}|${p.operation || ""}|${p.commodity}|${p.product_form || ""}|${p.metric}|${p.time_period}`,
        p.value_normalized,
      );
    }
    return map;
  }, [production]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return production
      .filter((p) => {
        if (commodity !== "all" && p.commodity !== commodity) return false;
        if (company !== "all" && p.company !== company) return false;
        if (period !== "all" && p.time_period !== period) return false;
        if (metric !== "all" && p.metric !== metric) return false;
        return true;
      })
      .map((p) => {
        const mine = mineById.get(p.mine_id);
        const pq = getPrevPeriod(p.time_period);
        const prevVal = pq
          ? prevLookup.get(`${p.mine_id}|${p.operation || ""}|${p.commodity}|${p.product_form || ""}|${p.metric}|${pq}`)
          : null;
        const qoq =
          prevVal != null && prevVal > 0 && p.value_normalized != null
            ? ((p.value_normalized - prevVal) / prevVal) * 100
            : null;
        return {
          ...p,
          country: mine?.country || "",
          mine_name: mine?.name || "",
          qoq,
          period_key: periodKey(p.time_period),
        };
      })
      .filter((r) => {
        if (!term) return true;
        return (
          r.company?.toLowerCase().includes(term) ||
          r.operation?.toLowerCase().includes(term) ||
          r.commodity?.toLowerCase().includes(term) ||
          r.country?.toLowerCase().includes(term) ||
          r.mine_name?.toLowerCase().includes(term)
        );
      });
  }, [production, mineById, prevLookup, search, commodity, company, period, metric]);

  const sorted = useMemo(() => {
    let key = sort.startsWith("-") ? sort.slice(1) : sort;
    // Sort periods chronologically via the computed key, not as raw strings —
    // free-text period labels from filings would otherwise dominate the top.
    if (key === "time_period") key = "period_key";
    const dir = sort.startsWith("-") ? -1 : 1;
    return [...rows].sort((a, b) => {
      const va = a[key];
      const vb = b[key];
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va ?? "").localeCompare(String(vb ?? "")) * dir;
    });
  }, [rows, sort]);

  const rendered = sorted.slice(0, MAX_RENDERED);

  const selectCls =
    "h-8 px-2 text-small border border-stroke rounded-md bg-white focus:outline-none focus:border-accent";

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <SectionHeader
        title="Production data"
        subtitle={`${fmtInt(sorted.length)} records · quarterly and annual disclosures, normalized`}
        right={
          <DownloadCsvButton
            count={sorted.length}
            onClick={() =>
              downloadCsv(
                `mining-production${period !== "all" ? `-${period.replace(/\s+/g, "-")}` : ""}.csv`,
                rowsToCsv(
                  CSV_COLUMNS,
                  sorted.map((r) => ({ ...r, qoq: r.qoq != null ? r.qoq.toFixed(1) : "" })),
                ),
              )
            }
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company, mine, commodity, country..."
          className="h-8 px-3 text-small border border-stroke rounded-md bg-white min-w-[240px] flex-1 sm:flex-none sm:w-[300px] focus:outline-none focus:border-accent placeholder:text-ink_faint"
        />
        <select
          value={commodity}
          onChange={(e) => setCommodity(e.target.value)}
          className={selectCls}
          aria-label="Commodity"
        >
          <option value="all">All commodities</option>
          {commodities.map((c) => (
            <option key={c} value={c}>
              {commodityLabel(c)}
            </option>
          ))}
        </select>
        <select value={metric} onChange={(e) => setMetric(e.target.value)} className={selectCls} aria-label="Metric">
          <option value="production">Production</option>
          <option value="sales">Sales</option>
          <option value="guidance">Guidance</option>
          <option value="grade">Grade</option>
          <option value="all">All metrics</option>
        </select>
        <select value={company} onChange={(e) => setCompany(e.target.value)} className={selectCls} aria-label="Company">
          <option value="all">All companies</option>
          {companies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className={selectCls} aria-label="Period">
          <option value="all">All periods</option>
          <optgroup label="Quarters">
            {periods.quarters.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </optgroup>
          <optgroup label="Half-years">
            {periods.halves.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </optgroup>
          <optgroup label="Full years">
            {periods.fullYears.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid gap-3 px-4 grid-cols-[1.3fr_1.2fr_100px_90px_90px_100px_80px_80px_100px_60px] text-mini font-medium text-ink_muted h-9 items-center border-b border-stroke">
              <SortHeader label="Company" sortKey="company" sort={sort} setSort={setSort} />
              <SortHeader label="Operation" sortKey="operation" sort={sort} setSort={setSort} />
              <SortHeader label="Commodity" sortKey="commodity" sort={sort} setSort={setSort} />
              <span>Metric</span>
              <SortHeader label="Period" sortKey="time_period" sort={sort} setSort={setSort} />
              <SortHeader label="Value" sortKey="value_normalized" sort={sort} setSort={setSort} align="right" />
              <span>Unit</span>
              <SortHeader label="QoQ" sortKey="qoq" sort={sort} setSort={setSort} align="right" />
              <span>Country</span>
              <span>Source</span>
            </div>
            <div className="text-small [&>*:nth-child(even)]:bg-muted/30">
              {rendered.map((r, i) => (
                <div
                  key={`${r.mine_id}-${r.operation}-${r.commodity}-${r.metric}-${r.time_period}-${i}`}
                  className="grid gap-3 px-4 grid-cols-[1.3fr_1.2fr_100px_90px_90px_100px_80px_80px_100px_60px] h-10 items-center border-b border-stroke_soft last:border-b-0"
                >
                  <span className="truncate">
                    <Link to={`/company/${slugify(r.company)}`}>{r.company}</Link>
                  </span>
                  <span className="truncate text-ink_muted">{r.operation || "--"}</span>
                  <span className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: COMMODITY_COLORS[r.commodity] || "#6b7280" }}
                    />
                    <span className="truncate">{r.commodity?.replace(/_/g, " ")}</span>
                  </span>
                  <span className="text-ink_muted">{r.metric}</span>
                  <span className="tabular-nums truncate" title={r.time_period}>
                    {r.time_period}
                  </span>
                  <span className="text-right tabular-nums font-medium">{fmtValue(r.value_normalized ?? r.value)}</span>
                  <span className="text-ink_muted truncate" title={r.unit_normalized || r.unit}>
                    {r.unit_normalized || r.unit}
                  </span>
                  <span
                    className={`text-right tabular-nums ${r.qoq == null ? "text-ink_faint" : r.qoq >= 0 ? "text-buy" : "text-sell"}`}
                  >
                    {r.qoq == null ? "--" : `${r.qoq >= 0 ? "+" : ""}${r.qoq.toFixed(1)}%`}
                  </span>
                  <span className="truncate text-ink_muted">{r.country || "--"}</span>
                  <span>
                    {r.source_url ? (
                      <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="dk-link">
                        PDF
                      </a>
                    ) : (
                      <span className="text-ink_faint">--</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
      {sorted.length > MAX_RENDERED && (
        <p className="text-mini text-ink_muted mt-3">
          Showing the first {fmtInt(MAX_RENDERED)} of {fmtInt(sorted.length)} rows — narrow with search or filters, or
          download the full CSV.
        </p>
      )}
    </div>
  );
}
