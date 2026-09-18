import React, { useMemo } from "react";
import { COMMODITY_COLORS, commodityLabel, rankMinesForLatestQuarter } from "../constants";
import { Card, fmtInt, fmtValue, Link, SectionHeader, StatGrid, slugify } from "../ui";

// "Largest <commodity> mines" ranking: mines by latest-quarter disclosed
// production. The live counterpart to the static annual listicles that rank
// for these queries.
export default function LargestMinesPage({ data, slug }) {
  const { production, mineById, commodityBySlug } = data;
  const commodity = commodityBySlug.get(slug);

  const records = useMemo(
    () => production.filter((p) => p.commodity === commodity && p.metric === "production" && p.mine_id),
    [production, commodity],
  );

  const { quarter, ranked: ranking } = useMemo(
    () => rankMinesForLatestQuarter(records, mineById, commodity),
    [records, mineById, commodity],
  );

  const unit = records.find((p) => p.unit_normalized)?.unit_normalized || "kt";

  if (!commodity) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
        <h1 className="text-title font-semibold text-ink mb-2">Commodity not found</h1>
        <p className="text-regular text-ink_muted">
          <Link to="/commodities">Browse all commodities</Link>.
        </p>
      </div>
    );
  }

  const label = commodityLabel(commodity);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <p className="text-mini text-ink_muted mb-1">
        <Link to="/commodities">Commodities</Link> / <Link to={`/commodity/${slug}`}>{label}</Link> / Largest mines
      </p>
      <h1 className="text-title sm:text-display font-semibold text-ink mb-2 flex items-center gap-3">
        <span
          className="w-4 h-4 rounded-full inline-block shrink-0"
          style={{ backgroundColor: COMMODITY_COLORS[commodity] || "#6b7280" }}
        />
        Largest {label.toLowerCase()} mines in the world
      </h1>
      <p className="text-regular text-ink_muted max-w-3xl mb-6">
        The biggest {label.toLowerCase()} mines ranked by disclosed production in {quarter || "the latest quarter"} —
        live data from operator reports, not a yearly snapshot.
      </p>

      <StatGrid
        items={[
          { label: "Mines ranked", value: fmtInt(ranking.length) },
          { label: "Quarter", value: quarter || "--" },
          { label: "Unit", value: unit },
          { label: "Top mine", value: ranking[0]?.mine.name || "--" },
        ]}
      />

      <div className="mt-8">
        <SectionHeader
          title={`Ranking — ${quarter || "latest quarter"}`}
          subtitle={`Disclosed ${label.toLowerCase()} production per mine, ${unit}`}
          right={<Link to={`/commodity/${slug}`}>{label} by company →</Link>}
        />
        <Card className="overflow-hidden">
          <div className="grid gap-3 px-4 grid-cols-[30px_1fr_90px] sm:grid-cols-[40px_1.2fr_1fr_120px_130px] text-mini font-medium text-ink_muted h-9 items-center border-b border-stroke">
            <span className="text-right">#</span>
            <span>Mine</span>
            <span className="hidden sm:block">Operator</span>
            <span className="hidden sm:block">Country</span>
            <span className="text-right">Production ({unit})</span>
          </div>
          <div className="text-small [&>*:nth-child(even)]:bg-muted/30">
            {ranking.map(({ mine, value }, i) => (
              <div
                key={mine.id}
                className="grid gap-3 px-4 grid-cols-[30px_1fr_90px] sm:grid-cols-[40px_1.2fr_1fr_120px_130px] h-10 items-center border-b border-stroke_soft last:border-b-0"
              >
                <span className="text-right text-mini text-ink_faint tabular-nums">{i + 1}</span>
                <span className="truncate">
                  <Link to={`/mine/${mine.id}`}>{mine.name}</Link>
                </span>
                <span className="hidden sm:block truncate">
                  <Link to={`/company/${slugify(mine.company)}`}>{mine.company}</Link>
                </span>
                <span className="hidden sm:block truncate text-ink_muted">{mine.country || "--"}</span>
                <span className="text-right tabular-nums font-medium">{fmtValue(value)}</span>
              </div>
            ))}
            {ranking.length === 0 && (
              <div className="px-4 py-6 text-ink_muted">No mine-level {label.toLowerCase()} records yet.</div>
            )}
          </div>
        </Card>
        <p className="text-mini text-ink_muted mt-3">
          Ranked by mine-level disclosures from the covered companies — operators that report only consolidated totals
          are not shown here.
        </p>
      </div>
    </div>
  );
}
