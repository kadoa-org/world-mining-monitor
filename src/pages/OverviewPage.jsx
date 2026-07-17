import React, { useMemo, useState } from "react";
import { COMMODITY_COLORS, commodityLabel } from "../constants";
import { latestPerMineCommodity } from "../data";
import MiningMap from "../MiningMap";
import { Card, fmtInt, fmtValue, Link, SectionHeader, StatGrid, slugify } from "../ui";

export default function OverviewPage({ data }) {
  const { mines, production, mineById, companies, commodities, periods, latestPeriod } = data;
  const [commodity, setCommodity] = useState("all");
  const [period, setPeriod] = useState("all");

  const activePeriod = period === "latest" ? latestPeriod : period === "all" ? "" : period;

  const filteredProduction = useMemo(
    () =>
      production.filter((p) => {
        if (p.metric !== "production" && p.metric !== "sales") return false;
        if (activePeriod && p.time_period !== activePeriod) return false;
        if (commodity !== "all" && p.commodity !== commodity) return false;
        return true;
      }),
    [production, commodity, activePeriod],
  );

  // Aggregate per mine for bubble sizing. Without a specific period, collapse
  // overlapping periods to the latest quarterly value per mine+commodity.
  const mineProduction = useMemo(() => {
    const records = activePeriod ? filteredProduction : latestPerMineCommodity(filteredProduction);
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
  }, [filteredProduction, activePeriod]);

  const filteredMines = useMemo(() => mines.filter((m) => mineProduction.has(m.id)), [mines, mineProduction]);

  const countries = useMemo(() => new Set(filteredMines.map((m) => m.country)).size, [filteredMines]);

  // Largest operations in the current view, by aggregated normalized output.
  const topMines = useMemo(() => {
    return [...mineProduction.entries()]
      .map(([id, prod]) => ({ mine: mineById.get(id), prod }))
      .filter((r) => r.mine)
      .sort((a, b) => b.prod.total_kt - a.prod.total_kt)
      .slice(0, 10);
  }, [mineProduction, mineById]);

  const mapCommodities = useMemo(() => commodities.filter((c) => COMMODITY_COLORS[c]), [commodities]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <h1 className="text-title sm:text-display font-semibold text-ink mb-2">
        Global mining production, mapped from primary sources
      </h1>
      <p className="text-regular text-ink_muted max-w-3xl mb-6">
        Quarterly production volumes for {fmtInt(companies.length)} of the world's largest mining companies, extracted
        from their own quarterly and annual reports. Open data — every number links back to the source PDF.
      </p>

      <StatGrid
        items={[
          { label: "Mines & operations", value: fmtInt(filteredMines.length) },
          { label: "Companies", value: fmtInt(companies.length) },
          { label: "Countries", value: fmtInt(countries) },
          { label: "Latest quarter", value: latestPeriod || "--" },
        ]}
      />

      <div className="mt-8">
        <SectionHeader
          title="Production map"
          subtitle="Bubble size = normalized output in the selected view. Click a mine for details."
          right={
            <span className="flex items-center gap-2">
              <select
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                className="h-8 px-2 text-small border border-stroke rounded-md bg-white focus:outline-none focus:border-accent"
                aria-label="Commodity"
              >
                <option value="all">All commodities</option>
                {mapCommodities.map((c) => (
                  <option key={c} value={c}>
                    {commodityLabel(c)}
                  </option>
                ))}
              </select>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="h-8 px-2 text-small border border-stroke rounded-md bg-white focus:outline-none focus:border-accent"
                aria-label="Period"
              >
                <option value="all">All periods</option>
                <option value="latest">Latest quarter</option>
                {periods.quarters.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </span>
          }
        />
        <Card className="overflow-hidden">
          <MiningMap mines={filteredMines} mineProduction={mineProduction} height={560} />
        </Card>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {mapCommodities.map((c) => {
            const active = commodity === "all" || commodity === c;
            return (
              <button
                key={c}
                onClick={() => setCommodity(commodity === c ? "all" : c)}
                className={`flex items-center gap-1.5 text-mini ${active ? "text-ink_muted hover:text-ink" : "text-ink_faint"}`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: COMMODITY_COLORS[c], opacity: active ? 1 : 0.3 }}
                />
                {commodityLabel(c)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-10">
        <SectionHeader
          title="Largest operations in view"
          subtitle="Aggregated normalized output for the selected commodity and period"
          right={<Link to="/production">All production data →</Link>}
        />
        <Card className="overflow-hidden">
          <div className="grid gap-3 px-4 grid-cols-[30px_1fr_90px] sm:grid-cols-[40px_1fr_1fr_110px_110px] text-mini font-medium text-ink_muted h-9 items-center border-b border-stroke">
            <span className="text-right">#</span>
            <span>Mine / operation</span>
            <span className="hidden sm:block">Company</span>
            <span className="hidden sm:block">Country</span>
            <span className="text-right">Output</span>
          </div>
          <div className="text-small [&>*:nth-child(even)]:bg-muted/30">
            {topMines.map(({ mine, prod }, i) => (
              <div
                key={mine.id}
                className="grid gap-3 px-4 grid-cols-[30px_1fr_90px] sm:grid-cols-[40px_1fr_1fr_110px_110px] h-10 items-center border-b border-stroke_soft last:border-b-0"
              >
                <span className="text-right text-mini text-ink_faint tabular-nums">{i + 1}</span>
                <span className="truncate">{mine.name}</span>
                <span className="hidden sm:block truncate">
                  <Link to={`/company/${slugify(mine.company)}`}>{mine.company}</Link>
                </span>
                <span className="hidden sm:block truncate text-ink_muted">{mine.country}</span>
                <span className="text-right tabular-nums">{fmtValue(prod.total_kt)} kt</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
