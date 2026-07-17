import React, { useMemo, useState } from "react";
import { COMMODITY_COLORS, COMPANY_TICKERS, commodityLabel } from "../constants";
import { latestPerMineCommodity } from "../data";
import MiningMap from "../MiningMap";
import {
  Card,
  DownloadCsvButton,
  downloadCsv,
  fmtInt,
  fmtValue,
  Link,
  rowsToCsv,
  SectionHeader,
  StatGrid,
} from "../ui";

const CSV_COLUMNS = [
  ["operation", "operation"],
  ["commodity", "commodity"],
  ["metric", "metric"],
  ["time_period", "period"],
  ["value_normalized", "value"],
  ["unit_normalized", "unit"],
  ["basis", "basis"],
  ["source_url", "source_url"],
];

export default function CompanyPage({ data, slug }) {
  const { production, mines, mineById, companyBySlug } = data;
  const company = companyBySlug.get(slug);
  const [commodity, setCommodity] = useState("all");

  const companyProduction = useMemo(() => production.filter((p) => p.company === company), [production, company]);
  const companyMines = useMemo(() => mines.filter((m) => m.company === company), [mines, company]);

  const commodities = useMemo(
    () => [...new Set(companyProduction.map((p) => p.commodity))].filter(Boolean).sort(),
    [companyProduction],
  );

  const latestQuarter = useMemo(() => {
    const qs = companyProduction
      .map((p) => p.time_period)
      .filter((tp) => /^Q[1-4] \d{4}$/.test(tp))
      .sort((a, b) => (b.slice(3) + b[1]).localeCompare(a.slice(3) + a[1]));
    return qs[0] || "--";
  }, [companyProduction]);

  const mineProduction = useMemo(() => {
    const records = latestPerMineCommodity(
      companyProduction.filter((p) => commodity === "all" || p.commodity === commodity),
    );
    const map = new Map();
    for (const p of records) {
      const existing = map.get(p.mine_id) || { total_kt: 0, commodities: {}, records: [] };
      const kt = p.value_normalized || 0;
      existing.total_kt += kt;
      existing.commodities[p.commodity] = (existing.commodities[p.commodity] || 0) + kt;
      existing.records.push(p);
      map.set(p.mine_id, existing);
    }
    return map;
  }, [companyProduction, commodity]);

  const rows = useMemo(() => {
    const cmp = (tp) => {
      const q = tp.match(/^Q([1-4]) (\d{4})$/);
      if (q) return `${q[2]}-${q[1]}-q`;
      const h = tp.match(/^H([12]) (\d{4})$/);
      if (h) return `${h[2]}-${h[1]}-h`;
      const f = tp.match(/^FY\s?(\d{4})$/);
      if (f) return `${f[1]}-9-f`;
      return `0-${tp}`;
    };
    return companyProduction
      .filter((p) => commodity === "all" || p.commodity === commodity)
      .sort((a, b) => cmp(b.time_period).localeCompare(cmp(a.time_period)))
      .slice(0, 500);
  }, [companyProduction, commodity]);

  if (!company) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
        <h1 className="text-title font-semibold text-ink mb-2">Company not found</h1>
        <p className="text-regular text-ink_muted">
          No production data for this company. <Link to="/companies">Browse all companies</Link>.
        </p>
      </div>
    );
  }

  const ticker = COMPANY_TICKERS[company];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <p className="text-mini text-ink_muted mb-1">
        <Link to="/companies">Companies</Link> / {company}
      </p>
      <h1 className="text-title sm:text-display font-semibold text-ink mb-2">
        {company}
        {ticker && <span className="ml-3 text-large text-ink_faint font-normal align-middle">{ticker}</span>}
      </h1>
      <p className="text-regular text-ink_muted max-w-3xl mb-6">
        Mine-level production volumes extracted from {company}'s quarterly and annual reports.
      </p>

      <StatGrid
        items={[
          { label: "Mines & operations", value: fmtInt(companyMines.length) },
          { label: "Commodities", value: fmtInt(commodities.length) },
          { label: "Production records", value: fmtInt(companyProduction.length) },
          { label: "Latest quarter", value: latestQuarter },
        ]}
      />

      {companyMines.length > 0 && (
        <div className="mt-8">
          <SectionHeader title="Operations map" />
          <Card className="overflow-hidden">
            <MiningMap
              mines={companyMines.filter((m) => mineProduction.has(m.id))}
              mineProduction={mineProduction}
              height={380}
            />
          </Card>
        </div>
      )}

      <div className="mt-8">
        <SectionHeader
          title="Production by period"
          subtitle={`${fmtInt(rows.length)} most recent records`}
          right={
            <span className="flex items-center gap-2">
              <select
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                className="h-8 px-2 text-small border border-stroke rounded-md bg-white focus:outline-none focus:border-accent"
                aria-label="Commodity"
              >
                <option value="all">All commodities</option>
                {commodities.map((c) => (
                  <option key={c} value={c}>
                    {commodityLabel(c)}
                  </option>
                ))}
              </select>
              <DownloadCsvButton
                onClick={() => downloadCsv(`${slug}-production.csv`, rowsToCsv(CSV_COLUMNS, companyProduction))}
              />
            </span>
          }
        />
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid gap-3 px-4 grid-cols-[1.4fr_110px_100px_90px_100px_60px_90px_60px] text-mini font-medium text-ink_muted h-9 items-center border-b border-stroke">
                <span>Operation</span>
                <span>Commodity</span>
                <span>Metric</span>
                <span>Period</span>
                <span className="text-right">Value</span>
                <span>Unit</span>
                <span>Basis</span>
                <span>Source</span>
              </div>
              <div className="text-small [&>*:nth-child(even)]:bg-muted/30">
                {rows.map((r, i) => (
                  <div
                    key={`${r.operation}-${r.commodity}-${r.metric}-${r.time_period}-${i}`}
                    className="grid gap-3 px-4 grid-cols-[1.4fr_110px_100px_90px_100px_60px_90px_60px] h-10 items-center border-b border-stroke_soft last:border-b-0"
                  >
                    <span className="truncate">{r.operation || mineById.get(r.mine_id)?.name || "--"}</span>
                    <span className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: COMMODITY_COLORS[r.commodity] || "#6b7280" }}
                      />
                      <span className="truncate">{r.commodity?.replace(/_/g, " ")}</span>
                    </span>
                    <span className="text-ink_muted">{r.metric}</span>
                    <span className="tabular-nums">{r.time_period}</span>
                    <span className="text-right tabular-nums font-medium">
                      {fmtValue(r.value_normalized ?? r.value)}
                    </span>
                    <span className="text-ink_muted">{r.unit_normalized || r.unit}</span>
                    <span className="text-ink_muted truncate">{r.basis || "--"}</span>
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
      </div>
    </div>
  );
}
