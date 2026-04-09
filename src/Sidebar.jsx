import React, { useMemo, useState } from "react";
import { COMMODITY_COLORS, REGIONS, commodityLabel } from "./constants";

export default function Sidebar({ filters, setFilters, companies, commodities, periods }) {
  const update = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const [companySearch, setCompanySearch] = useState("");

  const hasActiveFilters = filters.commodity !== "all" || filters.region !== "All" || filters.period !== "all" || filters.companies.length > 0;

  const resetAll = () => {
    setFilters({ commodity: "all", companies: [], region: "All", period: "all" });
    setCompanySearch("");
  };

  const toggleCompany = (company) => {
    setFilters((prev) => {
      const next = prev.companies.includes(company)
        ? prev.companies.filter((c) => c !== company)
        : [...prev.companies, company];
      return { ...prev, companies: next };
    });
  };

  return (
    <aside className="w-[85vw] max-w-xs md:w-60 h-full flex-shrink-0 border-r border-white/5 bg-[#0d0d18] flex flex-col">
      {/* Fixed top: filters */}
      <div className="p-4 pb-2 flex flex-col gap-3 flex-shrink-0">
        {/* Reset - always reserve space to prevent layout shift */}
        <div className="h-8">
          {hasActiveFilters && (
            <button
              onClick={resetAll}
              className="w-full py-1.5 text-[11px] text-orange-400/70 hover:text-orange-400 border border-orange-500/20 hover:border-orange-500/40 rounded bg-orange-500/5 transition-colors"
            >
              Reset all filters
            </button>
          )}
        </div>

        {/* Commodity */}
        <section>
          <label className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">Commodity</label>
          <select
            value={filters.commodity}
            onChange={(e) => update("commodity", e.target.value)}
            className="mt-1.5 w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white/80 outline-none focus:border-orange-500/50"
          >
            <option value="all">All commodities</option>
            {commodities.map((c) => (
              <option key={c} value={c}>
                {commodityLabel(c)}
              </option>
            ))}
          </select>
        </section>

        {/* Region */}
        <section>
          <label className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">Region</label>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {REGIONS.map((r) => (
              <button
                key={r}
                onClick={() => update("region", r)}
                className={`px-2 py-1 rounded text-[11px] transition-colors ${
                  filters.region === r
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                    : "bg-white/5 text-white/40 border border-transparent hover:text-white/60"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </section>

        {/* Period */}
        <section>
          <label className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">Period</label>
          <select
            value={filters.period}
            onChange={(e) => update("period", e.target.value)}
            className="mt-1.5 w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white/80 outline-none focus:border-orange-500/50"
          >
            <option value="latest">Latest quarter</option>
            <option value="all">All periods</option>
            <optgroup label="Quarters">
              {periods.quarters.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </optgroup>
            <optgroup label="Half-years">
              {periods.halves.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </optgroup>
            <optgroup label="Full year">
              {periods.fullYears.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </optgroup>
          </select>
        </section>
      </div>

      {/* Flexible middle: companies + legend share remaining space */}
      <div className="flex-1 min-h-0 flex flex-col px-4 pb-4 gap-3 overflow-hidden">
        {/* Companies */}
        <section className="flex flex-col min-h-0 flex-1">
          <label className="text-[10px] uppercase tracking-widest text-white/30 font-semibold flex-shrink-0">
            Companies
            {filters.companies.length > 0 && (
              <span className="ml-1.5 text-orange-400/60">({filters.companies.length})</span>
            )}
          </label>
          <input
            type="text"
            placeholder="Search companies..."
            value={companySearch}
            onChange={(e) => setCompanySearch(e.target.value)}
            className="mt-1.5 w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white/80 outline-none focus:border-orange-500/50 placeholder:text-white/20 flex-shrink-0"
          />
          <div className="mt-1 flex flex-col gap-0.5 overflow-y-auto flex-1 min-h-[80px]">
            {companies
              .filter((c) => !companySearch || c.toLowerCase().includes(companySearch.toLowerCase()))
              .map((company) => {
                const active = filters.companies.length === 0 || filters.companies.includes(company);
                return (
                  <button
                    key={company}
                    onClick={() => toggleCompany(company)}
                    className={`text-left px-2 py-0.5 rounded text-[11px] transition-colors flex-shrink-0 ${
                      active ? "text-white/80 hover:bg-white/5" : "text-white/20 hover:text-white/40"
                    }`}
                  >
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${active ? "bg-orange-500" : "bg-white/10"}`}
                    />
                    {company}
                  </button>
                );
              })}
          </div>
          {filters.companies.length > 0 && (
            <button
              onClick={() => update("companies", [])}
              className="mt-1 text-[10px] text-orange-400/60 hover:text-orange-400 flex-shrink-0"
            >
              Clear selection
            </button>
          )}
        </section>

        {/* Legend */}
        <section className="flex flex-col min-h-0 flex-1">
          <label className="text-[10px] uppercase tracking-widest text-white/30 font-semibold flex-shrink-0">Legend</label>
          <div className="mt-1 flex flex-col gap-0.5 overflow-y-auto flex-1 min-h-[60px]">
            {commodities
              .filter((c) => COMMODITY_COLORS[c])
              .map((commodity) => {
                const color = COMMODITY_COLORS[commodity] || "#6b7280";
                const isActive = filters.commodity === "all" || filters.commodity === commodity;
                return (
                  <button
                    key={commodity}
                    onClick={() => update("commodity", filters.commodity === commodity ? "all" : commodity)}
                    className={`flex items-center gap-2 text-[11px] px-1 py-0.5 rounded text-left transition-colors flex-shrink-0 ${
                      isActive ? "text-white/50 hover:text-white/70" : "text-white/15 hover:text-white/30"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: color,
                        boxShadow: isActive ? `0 0 4px ${color}` : "none",
                        opacity: isActive ? 1 : 0.3,
                      }}
                    />
                    {commodityLabel(commodity)}
                  </button>
                );
              })}
          </div>
          <div className="mt-2 flex items-end gap-3 text-[10px] text-white/30 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <svg width="8" height="8">
                <circle cx="4" cy="4" r="3" fill="#fd7412" fillOpacity="0.4" />
              </svg>
              Small
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14">
                <circle cx="7" cy="7" r="6" fill="#fd7412" fillOpacity="0.4" />
              </svg>
              Medium
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="20" height="20">
                <circle cx="10" cy="10" r="9" fill="#fd7412" fillOpacity="0.4" />
              </svg>
              Large
            </div>
          </div>
        </section>
      </div>

    </aside>
  );
}
