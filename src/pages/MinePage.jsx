import React, { useMemo, useState } from "react";
import {
  COMMODITY_COLORS,
  commodityLabel,
  productionSeriesKey,
  quarterlyPivot,
  selectComparableProductionRecords,
  splitProductionSeriesKey,
} from "../constants";
import { latestPerMineCommodity } from "../data";
import MiningMap from "../MiningMap";
import {
  Card,
  EvidenceDialog,
  EvidenceLink,
  fmtInt,
  Link,
  QuarterlySeriesTable,
  SectionHeader,
  StatGrid,
  slugify,
} from "../ui";

const mineSeriesLabel = (series, mineId) => {
  const [commodity, productForm, basis] = splitProductionSeriesKey(series);
  const basisLabel =
    mineId === "bhp-waio" && basis === "equity"
      ? "BHP share"
      : mineId === "bhp-waio" && basis === "consolidated"
        ? "100% basis"
        : basis.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const formLabel = productForm
    ? productForm.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : null;
  return [commodityLabel(commodity), formLabel, basis === "unknown" ? null : basisLabel].filter(Boolean).join(" · ");
};

// Per-mine page: the structured answer to "<mine> production" queries —
// quarterly output series straight from the operator's own reports.
export default function MinePage({ data, slug }) {
  const { production, mineById } = data;
  const mine = mineById.get(slug);
  const [evidenceRecord, setEvidenceRecord] = useState(null);

  const records = useMemo(() => production.filter((p) => p.mine_id === slug), [production, slug]);
  const chartRecords = useMemo(() => selectComparableProductionRecords(records), [records]);
  const pivot = useMemo(() => quarterlyPivot(chartRecords, { seriesKey: productionSeriesKey }), [chartRecords]);

  const commodities = useMemo(() => [...new Set(records.map((p) => p.commodity))].filter(Boolean).sort(), [records]);

  const mineProduction = useMemo(() => {
    const latest = latestPerMineCommodity(records);
    const map = new Map();
    for (const p of latest) {
      if (!p.mine_id || !Number.isFinite(p.value_normalized)) continue;
      const existing = map.get(p.mine_id) || { total_kt: 0, commodities: {}, records: [] };
      const kt = p.value_normalized;
      existing.total_kt += kt;
      existing.commodities[p.commodity] = (existing.commodities[p.commodity] || 0) + kt;
      existing.records.push(p);
      map.set(p.mine_id, existing);
    }
    return map;
  }, [records]);

  if (!mine) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
        <h1 className="text-title font-semibold text-ink mb-2">Mine not found</h1>
        <p className="text-regular text-ink_muted">
          No production data for this mine. <Link to="/production">Browse all production data</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      {evidenceRecord ? (
        <EvidenceDialog record={evidenceRecord} onClose={() => setEvidenceRecord(null)} />
      ) : null}
      <p className="text-mini text-ink_muted mb-1">
        <Link to={`/company/${slugify(mine.company)}`}>{mine.company}</Link> / {mine.name}
      </p>
      <h1 className="text-title sm:text-display font-semibold text-ink mb-2">{mine.name}: production by quarter</h1>
      <p className="text-regular text-ink_muted max-w-3xl mb-6">
        Quarterly production volumes for {mine.name}, extracted from {mine.company}'s own quarterly and annual reports.
      </p>

      <StatGrid
        items={[
          { label: "Operator", value: mine.company },
          { label: "Country", value: mine.country || "--" },
          { label: "Commodities", value: fmtInt(commodities.length), sub: commodities.map(commodityLabel).join(", ") },
          { label: "Latest quarter", value: pivot.quarters[0] || "--" },
        ]}
      />

      <div className="mt-8">
        <SectionHeader
          title="Quarterly production"
          subtitle="Comparable volumes by commodity, product form, and reporting basis. Select a value to view its source."
          right={<Link to={`/company/${slugify(mine.company)}`}>All {mine.company} data →</Link>}
        />
        <Card className="overflow-hidden">
          <QuarterlySeriesTable
            pivot={pivot}
            labelFor={(series) => mineSeriesLabel(series, slug)}
            colorFor={(series) => COMMODITY_COLORS[splitProductionSeriesKey(series)[0]] || "#6b7280"}
            renderValue={(series, quarter, formattedValue) => {
              const [record] = pivot.getRecords(series, quarter);
              if (!record?.source_url) return formattedValue;
              const seriesLabel = mineSeriesLabel(series, slug);
              const actionLabel = record.verification ? "view source details" : "open source in a new tab";
              return (
                <EvidenceLink
                  record={record}
                  onOpen={setEvidenceRecord}
                  className="dk-value-link"
                  ariaLabel={`${formattedValue} ${pivot.unit[series]}, ${seriesLabel}, ${quarter}; ${actionLabel}`}
                >
                  {formattedValue}
                </EvidenceLink>
              );
            }}
          />
          {!pivot.quarters.length && (
            <p className="px-4 py-6 text-small text-ink_muted">No quarterly production records for this mine.</p>
          )}
        </Card>
      </div>

      {mine.lat != null && mine.lng != null && (
        <div className="mt-8">
          <SectionHeader title="Location" />
          <Card className="overflow-hidden">
            <MiningMap
              mines={[mine]}
              mineProduction={mineProduction}
              height={320}
              center={[mine.lat, mine.lng]}
              zoom={5}
              scaleByOutput={false}
              popupAction="company"
            />
          </Card>
        </div>
      )}
    </div>
  );
}
