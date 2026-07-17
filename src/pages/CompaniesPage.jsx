import React, { useMemo, useState } from "react";
import { COMPANY_TICKERS, commodityLabel } from "../constants";
import { Card, fmtInt, Pill, RowLinkNav, SectionHeader, SortHeader, slugify } from "../ui";

const COLS = "grid gap-3 px-4 grid-cols-[30px_1fr_70px_80px] sm:grid-cols-[40px_1.4fr_1fr_90px_90px_110px]";

export default function CompaniesPage({ data }) {
  const { production, mineById } = data;
  const [sort, setSort] = useState("-records");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const byCompany = new Map();
    for (const p of production) {
      let c = byCompany.get(p.company);
      if (!c) {
        c = { company: p.company, records: 0, commodities: new Set(), mines: new Set(), latest: "" };
        byCompany.set(p.company, c);
      }
      c.records++;
      if (p.commodity) c.commodities.add(p.commodity);
      if (p.mine_id && mineById.has(p.mine_id)) c.mines.add(p.mine_id);
      if (/^Q[1-4] \d{4}$/.test(p.time_period)) {
        const cmp = (tp) => tp.slice(3) + tp[1]; // "2025"+"3" — sortable year+quarter key
        if (!c.latest || cmp(p.time_period) > cmp(c.latest)) c.latest = p.time_period;
      }
    }
    return [...byCompany.values()].map((c) => ({
      ...c,
      ticker: COMPANY_TICKERS[c.company] || "",
      commodityList: [...c.commodities].sort(),
      commodityCount: c.commodities.size,
      mineCount: c.mines.size,
    }));
  }, [production, mineById]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const key = sort.startsWith("-") ? sort.slice(1) : sort;
    const dir = sort.startsWith("-") ? -1 : 1;
    return rows
      .filter((r) => !term || r.company.toLowerCase().includes(term))
      .sort((a, b) => {
        const va = a[key];
        const vb = b[key];
        if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
        return String(va ?? "").localeCompare(String(vb ?? "")) * dir;
      });
  }, [rows, search, sort]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <SectionHeader title="Companies" subtitle={`${fmtInt(rows.length)} companies with extracted production data`} />
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search company..."
        className="h-8 px-3 mb-4 text-small border border-stroke rounded-md bg-white min-w-[260px] focus:outline-none focus:border-accent placeholder:text-ink_faint"
      />
      <Card className="overflow-hidden">
        <div className={`${COLS} text-mini font-medium text-ink_muted h-9 items-center border-b border-stroke`}>
          <span className="text-right">#</span>
          <SortHeader label="Company" sortKey="company" sort={sort} setSort={setSort} />
          <span className="hidden sm:block">Commodities</span>
          <span className="hidden sm:block text-right">
            <SortHeader label="Mines" sortKey="mineCount" sort={sort} setSort={setSort} align="right" />
          </span>
          <SortHeader label="Records" sortKey="records" sort={sort} setSort={setSort} align="right" />
          <SortHeader label="Latest" sortKey="latest" sort={sort} setSort={setSort} align="right" />
        </div>
        <div className="text-small [&>*:nth-child(even)]:bg-muted/30">
          {filtered.map((c, i) => (
            <RowLinkNav key={c.company} to={`/company/${slugify(c.company)}`}>
              <div className={`${COLS} h-11 sm:h-10 items-center hover:bg-hover border-b border-stroke_soft`}>
                <span className="text-right text-mini text-ink_faint tabular-nums">{i + 1}</span>
                <span className="truncate">
                  {c.company}
                  {c.ticker && <span className="ml-1.5 text-mini text-ink_faint">{c.ticker}</span>}
                </span>
                <span className="hidden sm:flex items-center gap-1 overflow-hidden">
                  {c.commodityList.slice(0, 3).map((cm) => (
                    <Pill key={cm} tone="neutral">
                      {commodityLabel(cm)}
                    </Pill>
                  ))}
                  {c.commodityCount > 3 && <span className="text-mini text-ink_faint">+{c.commodityCount - 3}</span>}
                </span>
                <span className="hidden sm:block text-right tabular-nums">{fmtInt(c.mineCount)}</span>
                <span className="text-right tabular-nums">{fmtInt(c.records)}</span>
                <span className="text-right tabular-nums text-ink_muted">{c.latest || "--"}</span>
              </div>
            </RowLinkNav>
          ))}
        </div>
      </Card>
    </div>
  );
}
