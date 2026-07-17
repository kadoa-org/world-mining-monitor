import React, { useMemo, useState } from "react";
import { COMMODITY_COLORS, commodityLabel } from "../constants";
import { Card, fmtInt, RowLinkNav, SectionHeader, SortHeader, slugify } from "../ui";

const COLS = "grid gap-3 px-4 grid-cols-[30px_1fr_80px_80px] sm:grid-cols-[40px_1fr_110px_110px_110px]";

export default function CommoditiesPage({ data }) {
  const { production } = data;
  const [sort, setSort] = useState("-records");

  const rows = useMemo(() => {
    const byCommodity = new Map();
    for (const p of production) {
      if (!p.commodity) continue;
      let c = byCommodity.get(p.commodity);
      if (!c) {
        c = { commodity: p.commodity, records: 0, companies: new Set(), mines: new Set() };
        byCommodity.set(p.commodity, c);
      }
      c.records++;
      c.companies.add(p.company);
      if (p.mine_id) c.mines.add(p.mine_id);
    }
    return [...byCommodity.values()].map((c) => ({
      ...c,
      companyCount: c.companies.size,
      mineCount: c.mines.size,
    }));
  }, [production]);

  const sorted = useMemo(() => {
    const key = sort.startsWith("-") ? sort.slice(1) : sort;
    const dir = sort.startsWith("-") ? -1 : 1;
    return [...rows].sort((a, b) => {
      const va = a[key];
      const vb = b[key];
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va ?? "").localeCompare(String(vb ?? "")) * dir;
    });
  }, [rows, sort]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <SectionHeader
        title="Commodities"
        subtitle={`${fmtInt(rows.length)} commodities tracked across quarterly disclosures`}
      />
      <Card className="overflow-hidden">
        <div className={`${COLS} text-mini font-medium text-ink_muted h-9 items-center border-b border-stroke`}>
          <span className="text-right">#</span>
          <SortHeader label="Commodity" sortKey="commodity" sort={sort} setSort={setSort} />
          <SortHeader label="Companies" sortKey="companyCount" sort={sort} setSort={setSort} align="right" />
          <span className="hidden sm:block text-right">
            <SortHeader label="Mines" sortKey="mineCount" sort={sort} setSort={setSort} align="right" />
          </span>
          <SortHeader label="Records" sortKey="records" sort={sort} setSort={setSort} align="right" />
        </div>
        <div className="text-small [&>*:nth-child(even)]:bg-muted/30">
          {sorted.map((c, i) => (
            <RowLinkNav key={c.commodity} to={`/commodity/${slugify(c.commodity)}`}>
              <div className={`${COLS} h-11 sm:h-10 items-center hover:bg-hover border-b border-stroke_soft`}>
                <span className="text-right text-mini text-ink_faint tabular-nums">{i + 1}</span>
                <span className="flex items-center gap-2 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: COMMODITY_COLORS[c.commodity] || "#6b7280" }}
                  />
                  {commodityLabel(c.commodity)}
                </span>
                <span className="text-right tabular-nums">{fmtInt(c.companyCount)}</span>
                <span className="hidden sm:block text-right tabular-nums">{fmtInt(c.mineCount)}</span>
                <span className="text-right tabular-nums">{fmtInt(c.records)}</span>
              </div>
            </RowLinkNav>
          ))}
        </div>
      </Card>
    </div>
  );
}
