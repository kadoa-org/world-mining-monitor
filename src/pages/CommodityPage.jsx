import React, { useMemo } from "react";
import { COMMODITY_COLORS, commodityLabel } from "../constants";
import { Card, fmtInt, fmtValue, Link, SectionHeader, StatGrid, slugify } from "../ui";

// Company ranking for one commodity: latest-quarter production per company,
// with the previous quarter alongside for a QoQ read.
export default function CommodityPage({ data, slug }) {
  const { production, commodityBySlug, latestPeriod } = data;
  const commodity = commodityBySlug.get(slug);

  const records = useMemo(
    () => production.filter((p) => p.commodity === commodity && p.metric === "production"),
    [production, commodity],
  );

  // Latest quarter WITH data for this commodity (may lag the site-wide one).
  const quarter = useMemo(() => {
    const qs = [...new Set(records.map((p) => p.time_period))]
      .filter((tp) => /^Q[1-4] \d{4}$/.test(tp))
      .sort((a, b) => (b.slice(3) + b[1]).localeCompare(a.slice(3) + a[1]));
    return qs[0] || latestPeriod;
  }, [records, latestPeriod]);

  const prevQuarter = useMemo(() => {
    if (!quarter) return null;
    const q = Number(quarter[1]);
    const y = Number(quarter.slice(3));
    return q === 1 ? `Q4 ${y - 1}` : `Q${q - 1} ${y}`;
  }, [quarter]);

  const ranking = useMemo(() => {
    const sum = (tp) => {
      const byCompany = new Map();
      for (const p of records) {
        if (p.time_period !== tp) continue;
        byCompany.set(p.company, (byCompany.get(p.company) || 0) + (p.value_normalized || 0));
      }
      return byCompany;
    };
    const cur = sum(quarter);
    const prev = prevQuarter ? sum(prevQuarter) : new Map();
    return [...cur.entries()]
      .map(([company, value]) => {
        const prevVal = prev.get(company);
        const qoq = prevVal > 0 ? ((value - prevVal) / prevVal) * 100 : null;
        return { company, value, qoq };
      })
      .sort((a, b) => b.value - a.value);
  }, [records, quarter, prevQuarter]);

  const stats = useMemo(() => {
    const companies = new Set(records.map((p) => p.company));
    const mines = new Set(records.map((p) => p.mine_id).filter(Boolean));
    const unit = records.find((p) => p.unit_normalized)?.unit_normalized || "kt";
    return { companies: companies.size, mines: mines.size, records: records.length, unit };
  }, [records]);

  if (!commodity) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
        <h1 className="text-title font-semibold text-ink mb-2">Commodity not found</h1>
        <p className="text-regular text-ink_muted">
          No production data for this commodity. <Link to="/commodities">Browse all commodities</Link>.
        </p>
      </div>
    );
  }

  const label = commodityLabel(commodity);
  const color = COMMODITY_COLORS[commodity] || "#6b7280";

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <p className="text-mini text-ink_muted mb-1">
        <Link to="/commodities">Commodities</Link> / {label}
      </p>
      <h1 className="text-title sm:text-display font-semibold text-ink mb-2 flex items-center gap-3">
        <span className="w-4 h-4 rounded-full inline-block shrink-0" style={{ backgroundColor: color }} />
        {label} production by company
      </h1>
      <p className="text-regular text-ink_muted max-w-3xl mb-6">
        Who produces the most {label.toLowerCase()}? Mine-level output extracted from company quarterly reports,
        normalized for comparison.
      </p>

      <StatGrid
        items={[
          { label: "Producers tracked", value: fmtInt(stats.companies) },
          { label: "Mines & operations", value: fmtInt(stats.mines) },
          { label: "Records", value: fmtInt(stats.records) },
          { label: "Latest quarter", value: quarter || "--" },
        ]}
      />

      <div className="mt-8">
        <SectionHeader
          title={`Largest ${label.toLowerCase()} producers — ${quarter}`}
          subtitle={`Sum of disclosed mine-level production, ${stats.unit}. QoQ vs ${prevQuarter}.`}
          right={<Link to={`/production?commodity=${encodeURIComponent(commodity)}`}>All {label} records →</Link>}
        />
        <Card className="overflow-hidden">
          <div className="grid gap-3 px-4 grid-cols-[30px_1fr_110px_90px] sm:grid-cols-[40px_1fr_140px_110px] text-mini font-medium text-ink_muted h-9 items-center border-b border-stroke">
            <span className="text-right">#</span>
            <span>Company</span>
            <span className="text-right">Production ({stats.unit})</span>
            <span className="text-right">QoQ</span>
          </div>
          <div className="text-small [&>*:nth-child(even)]:bg-muted/30">
            {ranking.map((r, i) => (
              <div
                key={r.company}
                className="grid gap-3 px-4 grid-cols-[30px_1fr_110px_90px] sm:grid-cols-[40px_1fr_140px_110px] h-10 items-center border-b border-stroke_soft last:border-b-0"
              >
                <span className="text-right text-mini text-ink_faint tabular-nums">{i + 1}</span>
                <span className="truncate">
                  <Link to={`/company/${slugify(r.company)}`}>{r.company}</Link>
                </span>
                <span className="text-right tabular-nums font-medium">{fmtValue(r.value)}</span>
                <span
                  className={`text-right tabular-nums ${r.qoq == null ? "text-ink_faint" : r.qoq >= 0 ? "text-buy" : "text-sell"}`}
                >
                  {r.qoq == null ? "--" : `${r.qoq >= 0 ? "+" : ""}${r.qoq.toFixed(1)}%`}
                </span>
              </div>
            ))}
            {ranking.length === 0 && (
              <div className="px-4 py-6 text-ink_muted">No quarterly records for {quarter}.</div>
            )}
          </div>
        </Card>
        <p className="text-mini text-ink_muted mt-3">
          Only companies that disclose mine-level {label.toLowerCase()} volumes in the covered set are ranked — this is
          disclosed production, not a complete global census.
        </p>
      </div>
    </div>
  );
}
