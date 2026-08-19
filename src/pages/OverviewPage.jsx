import React, { useMemo, useState } from "react";
import { COMMODITY_COLORS, commodityLabel } from "../constants";
import { latestPerMineCommodity } from "../data";
import MiningMap from "../MiningMap";
import {
  Card,
  EvidenceDialog,
  EvidenceLink,
  fmtInt,
  fmtValue,
  Link,
  SectionHeader,
  StatGrid,
  slugify,
} from "../ui";

function mostCommonUnit(records) {
  const counts = new Map();
  for (const record of records) {
    if (!record.unit_normalized || record.value_normalized == null) continue;
    counts.set(record.unit_normalized, (counts.get(record.unit_normalized) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

export default function OverviewPage({ data }) {
  const { mines, production, mineById, companies, commodities, periods, latestPeriod } = data;
  const [commodity, setCommodity] = useState("all");
  const [period, setPeriod] = useState("latest");
  const [evidenceRecord, setEvidenceRecord] = useState(null);

  const activePeriod = period === "latest" ? latestPeriod : period === "all" ? "" : period;

  const filteredProduction = useMemo(
    () =>
      production.filter((p) => {
        if (p.metric !== "production") return false;
        if (activePeriod && p.time_period !== activePeriod) return false;
        if (commodity !== "all" && p.commodity !== commodity) return false;
        return true;
      }),
    [production, commodity, activePeriod],
  );

  // Without a specific period, keep one latest observation per mine and
  // commodity rather than mixing overlapping quarterly, half-year and FY data.
  const viewRecords = useMemo(
    () => (activePeriod ? filteredProduction : latestPerMineCommodity(filteredProduction)),
    [filteredProduction, activePeriod],
  );

  // A ranking only becomes meaningful after selecting one commodity and one
  // normalized unit. Prefer the unit used by the largest number of disclosures.
  const selectedUnit = useMemo(
    () => (commodity === "all" ? "" : mostCommonUnit(viewRecords)),
    [commodity, viewRecords],
  );

  const comparableRecords = useMemo(
    () =>
      commodity === "all" || !selectedUnit
        ? viewRecords
        : viewRecords.filter((p) => p.unit_normalized === selectedUnit),
    [commodity, selectedUnit, viewRecords],
  );

  // Use a representative observation for each mine. Multi-commodity views use
  // equal-size markers, so values with incompatible units are never added.
  const mineProduction = useMemo(() => {
    const map = new Map();
    for (const p of comparableRecords) {
      if (!p.mine_id) continue;
      const existing = map.get(p.mine_id) || {
        output_value: 0,
        commodities: {},
        units: {},
        records: [],
      };
      const value = Number(p.value_normalized);
      if (Number.isFinite(value)) {
        existing.commodities[p.commodity] = Math.max(existing.commodities[p.commodity] ?? 0, value);
        if (commodity !== "all") existing.output_value = Math.max(existing.output_value, value);
      } else {
        existing.commodities[p.commodity] ??= 0;
      }
      if (p.unit_normalized) existing.units[p.commodity] = p.unit_normalized;
      existing.records.push(p);
      map.set(p.mine_id, existing);
    }
    return map;
  }, [comparableRecords, commodity]);

  const filteredMines = useMemo(() => mines.filter((m) => mineProduction.has(m.id)), [mines, mineProduction]);

  const countries = useMemo(
    () => new Set(filteredMines.map((m) => m.country).filter(Boolean)).size,
    [filteredMines],
  );

  const coverageRows = useMemo(() => {
    const records = activePeriod
      ? production.filter((p) => p.metric === "production" && p.time_period === activePeriod)
      : latestPerMineCommodity(production.filter((p) => p.metric === "production"));
    const grouped = new Map();
    for (const p of records) {
      if (!p.commodity || !COMMODITY_COLORS[p.commodity]) continue;
      const row = grouped.get(p.commodity) || {
        commodity: p.commodity,
        companies: new Set(),
        operations: new Set(),
        countries: new Set(),
        observations: 0,
      };
      if (p.company) row.companies.add(p.company);
      if (p.mine_id) {
        row.operations.add(p.mine_id);
        const country = mineById.get(p.mine_id)?.country;
        if (country) row.countries.add(country);
      }
      row.observations += 1;
      grouped.set(p.commodity, row);
    }
    return [...grouped.values()]
      .map((row) => ({
        commodity: row.commodity,
        companies: row.companies.size,
        operations: row.operations.size,
        countries: row.countries.size,
        observations: row.observations,
      }))
      .sort((a, b) => b.operations - a.operations || b.companies - a.companies)
      .slice(0, 12);
  }, [activePeriod, mineById, production]);

  // One disclosed, unit-compatible observation per operation. We deliberately
  // do not add product forms or reporting bases together.
  const topOperations = useMemo(() => {
    if (commodity === "all" || !selectedUnit) return [];
    const sorted = comparableRecords
      .filter((p) => p.mine_id && mineById.has(p.mine_id) && Number.isFinite(Number(p.value_normalized)))
      .sort((a, b) => Number(b.value_normalized) - Number(a.value_normalized));
    const seen = new Set();
    const rows = [];
    for (const record of sorted) {
      if (seen.has(record.mine_id)) continue;
      seen.add(record.mine_id);
      rows.push({ mine: mineById.get(record.mine_id), record });
      if (rows.length === 10) break;
    }
    return rows;
  }, [commodity, comparableRecords, mineById, selectedUnit]);

  const mapCommodities = useMemo(() => commodities.filter((c) => COMMODITY_COLORS[c]), [commodities]);
  const availableQuarters = useMemo(() => {
    const latestIndex = periods.quarters.indexOf(latestPeriod);
    return latestIndex >= 0 ? periods.quarters.slice(latestIndex) : periods.quarters;
  }, [latestPeriod, periods.quarters]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      {evidenceRecord ? (
        <EvidenceDialog record={evidenceRecord} onClose={() => setEvidenceRecord(null)} />
      ) : null}
      <h1 className="text-title sm:text-display font-semibold text-ink mb-2">
        Global mining production
      </h1>
      <p className="text-regular text-ink_muted max-w-3xl mb-6">
        Quarterly production volumes of the world's largest mining companies, extracted
        from their own quarterly and annual reports. Newly extracted facts include source evidence and lineage.
      </p>

      <StatGrid
        items={[
          { label: "Mines & operations", value: fmtInt(filteredMines.length) },
          {
            label: "Companies tracked",
            value: fmtInt(companies.length),
          },
          { label: "Countries", value: fmtInt(countries) },
          { label: "Reporting period", value: activePeriod || "Latest available" },
        ]}
      />

      <div className="mt-8">
        <SectionHeader
          className="overview-map-head"
          title="Production map"
          subtitle={
            commodity === "all"
              ? `Each marker is an operation reporting production ${activePeriod ? `in ${activePeriod}` : "in its latest available period"}. Select a commodity to compare output.`
              : selectedUnit
                ? `Bubble size compares ${commodityLabel(commodity).toLowerCase()} production in ${activePeriod || "the latest available period"} (${selectedUnit}).`
                : "No comparable normalized production unit is available for this selection."
          }
          right={
            <span className="overview-map-controls flex items-center gap-2">
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
                <option value="latest">{latestPeriod} · latest</option>
                {availableQuarters.filter((p) => p !== latestPeriod).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                <option value="all">Latest available per operation</option>
              </select>
            </span>
          }
        />
        <Card className="overflow-hidden">
          <MiningMap
            mines={filteredMines}
            mineProduction={mineProduction}
            height={560}
            scaleByOutput={commodity !== "all" && Boolean(selectedUnit)}
          />
        </Card>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {(commodity === "all" ? mapCommodities : [commodity]).map((c) => {
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
        {commodity === "all" ? (
          <>
            <SectionHeader
              className="overview-results-head"
              title={`Coverage by commodity — ${activePeriod || "latest available"}`}
              subtitle="Commodities with the broadest mine-level production coverage in this view"
              right={<Link to="/commodities">All commodities →</Link>}
            />
            <Card className="overflow-hidden">
              <div className="grid gap-3 px-4 grid-cols-[1fr_76px_82px] sm:grid-cols-[1fr_110px_110px_110px_110px] text-mini font-medium text-ink_muted h-9 items-center border-b border-stroke">
                <span>Commodity</span>
                <span className="text-right">Companies</span>
                <span className="text-right">Operations</span>
                <span className="hidden sm:block text-right">Countries</span>
                <span className="hidden sm:block text-right">Observations</span>
              </div>
              <div className="text-small [&>*:nth-child(even)]:bg-muted/30">
                {coverageRows.map((row) => (
                  <div
                    key={row.commodity}
                    className="grid gap-3 px-4 grid-cols-[1fr_76px_82px] sm:grid-cols-[1fr_110px_110px_110px_110px] h-10 items-center border-b border-stroke_soft last:border-b-0"
                  >
                    <span className="min-w-0 flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: COMMODITY_COLORS[row.commodity] }}
                      />
                      <Link to={`/commodity/${slugify(row.commodity)}`} className="truncate">
                        {commodityLabel(row.commodity)}
                      </Link>
                    </span>
                    <span className="text-right tabular-nums">{fmtInt(row.companies)}</span>
                    <span className="text-right tabular-nums">{fmtInt(row.operations)}</span>
                    <span className="hidden sm:block text-right tabular-nums">{fmtInt(row.countries)}</span>
                    <span className="hidden sm:block text-right tabular-nums">{fmtInt(row.observations)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </>
        ) : (
          <>
            <SectionHeader
              className="overview-results-head"
              title={`Largest ${commodityLabel(commodity).toLowerCase()} operations — ${activePeriod || "latest available"}`}
              subtitle={
                selectedUnit
                  ? `One disclosed production observation per operation in ${selectedUnit}; product form and reporting basis are not aggregated.`
                  : "No comparable normalized production observations are available for this selection."
              }
              right={
                <Link
                  to={`/production?commodity=${encodeURIComponent(commodity)}${activePeriod ? `&period=${encodeURIComponent(activePeriod)}` : ""}`}
                >
                  All production data →
                </Link>
              }
            />
            <Card className="overflow-hidden">
              <div className="grid gap-3 px-4 grid-cols-[30px_1fr_90px] sm:grid-cols-[40px_minmax(180px,1.4fr)_minmax(140px,1fr)_110px_minmax(150px,1fr)_110px_70px] text-mini font-medium text-ink_muted h-9 items-center border-b border-stroke">
                <span className="text-right">#</span>
                <span>Mine / operation</span>
                <span className="hidden sm:block">Company</span>
                <span className="hidden sm:block">Country</span>
                <span className="hidden sm:block">Reporting basis</span>
                <span className="text-right">Output</span>
                <span className="hidden sm:block">Source</span>
              </div>
              <div className="text-small [&>*:nth-child(even)]:bg-muted/30">
                {topOperations.map(({ mine, record }, i) => (
                  <div
                    key={mine.id}
                    className="grid gap-3 px-4 grid-cols-[30px_1fr_90px] sm:grid-cols-[40px_minmax(180px,1.4fr)_minmax(140px,1fr)_110px_minmax(150px,1fr)_110px_70px] min-h-10 py-2 items-center border-b border-stroke_soft last:border-b-0"
                  >
                    <span className="text-right text-mini text-ink_faint tabular-nums">{i + 1}</span>
                    <span className="truncate">
                      <Link to={`/mine/${mine.id}`}>{mine.name}</Link>
                    </span>
                    <span className="hidden sm:block truncate">
                      <Link to={`/company/${slugify(record.company)}`}>{record.company}</Link>
                    </span>
                    <span className="hidden sm:block truncate text-ink_muted">{mine.country || "--"}</span>
                    <span
                      className="hidden sm:block truncate text-ink_muted"
                      title={[record.basis, record.product_form].filter(Boolean).join(" · ")}
                    >
                      {[record.basis, record.product_form].filter(Boolean).join(" · ") || "--"}
                    </span>
                    <span className="text-right tabular-nums">
                      {fmtValue(record.value_normalized)} {record.unit_normalized}
                    </span>
                    <span className="hidden sm:block">
                      <EvidenceLink record={record} onOpen={setEvidenceRecord} />
                    </span>
                  </div>
                ))}
                {!topOperations.length && (
                  <p className="px-4 py-6 text-small text-ink_muted">No comparable operation-level records.</p>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
