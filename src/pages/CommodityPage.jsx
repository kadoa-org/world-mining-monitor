import React, { useMemo } from "react";
import {
  aggregateProductionBy,
  COMMODITY_COLORS,
  commodityLabel,
  compareMineProduction,
  latestProductionQuarter,
  productionBreadth,
  quarterByPhysicalMine,
  rankMinesForLatestQuarter,
  topProducingCountry,
  yearAgoQuarter,
} from "../constants";
import { ChangeTag, KeyFigures } from "../kit";
import { Card, fmtInt, fmtValue, Link, SectionHeader, slugify } from "../ui";

// Company ranking for one commodity: latest-quarter production per company,
// with the previous quarter alongside for a QoQ read.
export default function CommodityPage({ data, slug }) {
  const { production, commodityBySlug, mineById } = data;
  const commodity = commodityBySlug.get(slug);

  const records = useMemo(
    () => production.filter((p) => p.commodity === commodity && p.metric === "production"),
    [production, commodity],
  );

  // Latest quarter WITH data for this commodity (may lag the site-wide one).
  const quarter = useMemo(() => latestProductionQuarter(records), [records]);

  const prevQuarter = useMemo(() => {
    if (!quarter) return null;
    const q = Number(quarter[1]);
    const y = Number(quarter.slice(3));
    return q === 1 ? `Q4 ${y - 1}` : `Q${q - 1} ${y}`;
  }, [quarter]);

  const ranking = useMemo(() => {
    const sum = (tp) => {
      const aggregates = aggregateProductionBy(
        records.filter((record) => record.time_period === tp),
        (record) => record.company,
      );
      return new Map([...aggregates].map(([company, aggregate]) => [company, aggregate.value]));
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

  const mineRanking = useMemo(
    () => rankMinesForLatestQuarter(records.filter((record) => record.mine_id), mineById, commodity).ranked,
    [records, mineById, commodity],
  );

  const stats = useMemo(() => {
    const unit = records.find((p) => p.unit_normalized)?.unit_normalized || "kt";
    return { unit };
  }, [records]);

  // Headline figures: who leads, which way comparable mines moved on a year earlier, and where output comes from.
  const headline = useMemo(() => {
    if (!quarter) return null;
    const previousYear = yearAgoQuarter(quarter);
    const breadth = previousYear ? productionBreadth(compareMineProduction(records, mineById, quarter, previousYear), commodity) : null;
    const country = topProducingCountry(quarterByPhysicalMine(records, mineById, quarter));
    const total = ranking.reduce((sum, r) => sum + r.value, 0);
    const leader = ranking[0] ? { ...ranking[0], share: total > 0 ? (ranking[0].value / total) * 100 : null } : null;
    return { previousYear, breadth, country, leader };
  }, [records, mineById, quarter, commodity, ranking]);

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
        Who produces the most {label.toLowerCase()}, taken from company quarterly reports.
      </p>

      {headline && (
        <KeyFigures
          title="Headlines"
          description={`Disclosed production in ${quarter}. Changes compare mines reporting on the same basis a year earlier.`}
          date={`Up to and including ${quarter}`}
          items={[
            headline.leader && {
              label: "Largest producer",
              value: <Link to={`/company/${slugify(headline.leader.company)}`}>{headline.leader.company}</Link>,
              note: `${fmtValue(headline.leader.value)} ${stats.unit}${headline.leader.share != null && ranking.length > 1 ? `, ${Math.round(headline.leader.share)}% of covered output` : ""}`,
            },
            headline.breadth && {
              label: `Against ${headline.previousYear}`,
              value: `${headline.breadth.lower} of ${headline.breadth.mines} mines lower`,
              title: `${headline.breadth.higher} higher, ${headline.breadth.mines - headline.breadth.lower - headline.breadth.higher} unchanged, among mines reporting on the same basis in both quarters`,
              note: <><ChangeTag value={headline.breadth.median} good="up" size="small" /> median mine</>,
            },
            // A country share from one or two mines says more about coverage than about where output comes from.
            headline.country && headline.country.mines >= 3 && {
              label: "Top producing country",
              value: headline.country.country,
              note: `${Math.round(headline.country.share)}% of output at ${fmtInt(headline.country.mines)} covered ${headline.country.mines === 1 ? "mine" : "mines"}`,
            },
          ]}
        />
      )}

      <div className="mt-8">
        <SectionHeader
          title={`Largest ${label.toLowerCase()} producers, ${quarter}`}
          subtitle={`Disclosed mine-level production, ${stats.unit}. Change on ${prevQuarter}.`}
          right={
            <span className="flex items-center gap-3">
              {mineRanking.length >= 5 ? (
                <Link to={`/largest-${slug}-mines`}>Largest {label.toLowerCase()} mines →</Link>
              ) : null}
              <Link to={`/production?commodity=${encodeURIComponent(commodity)}`}>All {label} records →</Link>
            </span>
          }
        />
        <Card className="overflow-hidden">
          <div className="grid gap-3 px-4 grid-cols-[30px_1fr_110px_90px] sm:grid-cols-[40px_1fr_140px_110px] text-mini font-medium text-ink_muted h-9 items-center border-b border-stroke">
            <span className="text-right">#</span>
            <span>Company</span>
            <span className="text-right">Production ({stats.unit})</span>
            <span className="text-right">Change</span>
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
          Only companies that disclose mine-level {label.toLowerCase()} volumes are ranked. This is disclosed production,
          not a complete global census.
        </p>
      </div>
    </div>
  );
}
