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
    <aside className="w-60 flex-shrink-0 border-r border-white/5 bg-[#0d0d18] overflow-y-auto">
      <div className="p-4 flex flex-col gap-5">
        {/* Reset all */}
        {hasActiveFilters && (
          <button
            onClick={resetAll}
            className="w-full py-1.5 text-[11px] text-orange-400/70 hover:text-orange-400 border border-orange-500/20 hover:border-orange-500/40 rounded bg-orange-500/5 transition-colors"
          >
            Reset all filters
          </button>
        )}
        {/* Commodity */}
        <section>
          <label className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">Commodity</label>
          <select
            value={filters.commodity}
            onChange={(e) => update("commodity", e.target.value)}
            className="mt-2 w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white/80 outline-none focus:border-orange-500/50"
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
          <div className="mt-2 flex flex-wrap gap-1">
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
            className="mt-2 w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white/80 outline-none focus:border-orange-500/50"
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

        {/* Companies */}
        <section>
          <label className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">
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
            className="mt-2 w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white/80 outline-none focus:border-orange-500/50 placeholder:text-white/20"
          />
          <div className="mt-1.5 flex flex-col gap-0.5 max-h-52 overflow-y-auto">
            {companies
              .filter((c) => !companySearch || c.toLowerCase().includes(companySearch.toLowerCase()))
              .map((company) => {
                const active = filters.companies.length === 0 || filters.companies.includes(company);
                return (
                  <button
                    key={company}
                    onClick={() => toggleCompany(company)}
                    className={`text-left px-2 py-1 rounded text-xs transition-colors ${
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
              className="mt-1.5 text-[10px] text-orange-400/60 hover:text-orange-400"
            >
              Clear selection
            </button>
          )}
        </section>

        {/* Legend */}
        <section>
          <label className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">Legend</label>
          <div className="mt-2 flex flex-col gap-0.5">
            {commodities
              .filter((c) => COMMODITY_COLORS[c])
              .slice(0, 14)
              .map((commodity) => {
                const color = COMMODITY_COLORS[commodity] || "#6b7280";
                const isActive = filters.commodity === "all" || filters.commodity === commodity;
                return (
                  <button
                    key={commodity}
                    onClick={() => update("commodity", filters.commodity === commodity ? "all" : commodity)}
                    className={`flex items-center gap-2 text-[11px] px-1 py-0.5 rounded text-left transition-colors ${
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
          <div className="mt-3 flex items-end gap-3 text-[10px] text-white/30">
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

        {/* Attribution */}
        <div className="pt-4 border-t border-white/5 text-[10px] text-white/20">
          Data sourced with <a href="https://kadoa.com" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/50 underline decoration-white/10">kadoa.com</a>
        </div>
      </div>
    </aside>
  );
}
