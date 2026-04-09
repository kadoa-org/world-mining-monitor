import React, { useEffect, useMemo, useState } from "react";
import { normalizeCommodity } from "./constants";
import { useDatabase, query } from "./useDatabase";
import DataTable from "./DataTable";
import MiningMap from "./MiningMap";
import Sidebar from "./Sidebar";

function getInitialState() {
  const params = new URLSearchParams(window.location.search);
  return {
    view: params.get("view") || "map",
    commodity: params.get("commodity") || "all",
    company: params.get("company") || "",
    region: params.get("region") || "All",
    period: params.get("period") || "all",
    search: params.get("search") || "",
  };
}

export default function App() {
  const initial = useMemo(getInitialState, []);
  const { db, loading: dbLoading } = useDatabase();
  const [mines, setMines] = useState([]);
  const [production, setProduction] = useState([]);
  const [view, setView] = useState(initial.view);
  const [tableSearch, setTableSearch] = useState(initial.search);
  const [filters, setFilters] = useState({
    commodity: initial.commodity,
    companies: initial.company ? [initial.company] : [],
    region: initial.region,
    period: initial.period,
  });
  const [hoveredMine, setHoveredMine] = useState(null);
  const [selectedMine, setSelectedMine] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sync state to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (view !== "map") params.set("view", view);
    if (filters.commodity !== "all") params.set("commodity", filters.commodity);
    if (filters.companies.length === 1) params.set("company", filters.companies[0]);
    if (filters.region !== "All") params.set("region", filters.region);
    if (filters.period !== "all") params.set("period", filters.period);
    if (tableSearch) params.set("search", tableSearch);
    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [view, filters, tableSearch]);

  useEffect(() => {
    if (!db) return;
    const m = query(db, "SELECT * FROM mines").map((r) => ({
      ...r,
      commodities: r.commodities ? JSON.parse(r.commodities) : [],
    }));
    const p = query(db, "SELECT * FROM production")
      .map((r) => ({ ...r, commodity: normalizeCommodity(r.commodity) }))
      .filter((r) => r.commodity !== null);
    setMines(m);
    setProduction(p);
  }, [db]);

  const companies = useMemo(() => [...new Set(mines.map((m) => m.company))].sort(), [mines]);

  // Companies filtered by selected commodity (for sidebar)
  const filteredCompanies = useMemo(() => {
    if (filters.commodity === "all") return companies;
    const companiesWithCommodity = new Set(
      production.filter((p) => p.commodity === filters.commodity).map((p) => p.company),
    );
    return companies.filter((c) => companiesWithCommodity.has(c));
  }, [companies, production, filters.commodity]);
  const commodities = useMemo(
    () =>
      [...new Set(production.map((p) => p.commodity))]
        .filter(Boolean)
        .sort(),
    [production],
  );
  const periods = useMemo(() => {
    const all = [...new Set(production.map((p) => p.time_period))];
    // Only show quarterly and full-year periods from 2023+
    const quarters = all
      .filter((p) => /^Q[1-4] \d{4}$/.test(p) && parseInt(p.slice(3)) >= 2023)
      .sort((a, b) => {
        const ya = Number(a.slice(3)), yb = Number(b.slice(3));
        if (ya !== yb) return yb - ya;
        return Number(b[1]) - Number(a[1]);
      });
    const halves = all
      .filter((p) => /^H[12] \d{4}$/.test(p) && parseInt(p.slice(3)) >= 2023)
      .sort((a, b) => {
        const ya = Number(a.slice(3)), yb = Number(b.slice(3));
        if (ya !== yb) return yb - ya;
        return Number(b[1]) - Number(a[1]);
      });
    const fullYears = all
      .filter((p) => /^FY\d{4}$/.test(p) && parseInt(p.slice(2)) >= 2023 && parseInt(p.slice(2)) <= 2026)
      .sort((a, b) => Number(b.slice(2)) - Number(a.slice(2)));
    return { quarters, halves, fullYears };
  }, [production]);

  // Find the latest quarter with the most data (at least 5 mines reporting)
  const latestPeriod = useMemo(() => {
    const stdQuarters = periods.quarters;
    if (stdQuarters.length === 0) return "";
    // Already sorted desc - pick the most recent with at least 5 production records
    for (const p of stdQuarters) {
      const count = production.filter((r) => r.time_period === p && r.metric === "production").length;
      if (count >= 5) return p;
    }
    return stdQuarters[0];
  }, [periods, production]);
  const activePeriod = filters.period === "latest" ? latestPeriod : filters.period === "all" ? "" : filters.period;

  const filteredProduction = useMemo(() => {
    return production.filter((p) => {
      if (p.metric !== "production" && p.metric !== "sales") return false;
      if (activePeriod && p.time_period !== activePeriod) return false;
      if (filters.commodity !== "all" && p.commodity !== filters.commodity) return false;
      if (filters.companies.length > 0 && !filters.companies.includes(p.company)) return false;
      return true;
    });
  }, [production, filters, activePeriod]);

  const mineProduction = useMemo(() => {
    let records = filteredProduction;
    // When "All periods" is active, keep only the latest quarterly production value per
    // mine+commodity to avoid double-counting overlapping periods (Q1+Q2+H1+FY).
    // Only use production metric for bubble sizing and popup (not sales).
    if (!activePeriod) {
      const latest = new Map();
      for (const p of filteredProduction) {
        if (p.metric !== "production") continue;
        const key = `${p.mine_id}|${p.commodity}`;
        const existing = latest.get(key);
        if (!existing) { latest.set(key, p); continue; }
        const isQ = (tp) => /^Q[1-4] \d{4}$/.test(tp);
        const curIsQ = isQ(p.time_period);
        const exIsQ = isQ(existing.time_period);
        if (curIsQ && !exIsQ) { latest.set(key, p); }
        else if (curIsQ === exIsQ && p.time_period > existing.time_period) { latest.set(key, p); }
      }
      records = [...latest.values()];
    }
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

  const filteredMines = useMemo(() => {
    return mines.filter((m) => {
      if (filters.region !== "All" && m.region !== filters.region) return false;
      if (filters.companies.length > 0 && !filters.companies.includes(m.company)) return false;
      if (!mineProduction.has(m.id)) return false;
      return true;
    });
  }, [mines, filters, mineProduction]);

  const handleMineHover = (mine, event) => {
    if (!selectedMine) {
      setHoveredMine(mine);
      if (event) {
        setTooltipPos({ x: event.clientX, y: event.clientY });
      }
    }
  };

  const handleMineClick = (mine, event) => {
    if (selectedMine?.id === mine.id) {
      setSelectedMine(null);
    } else {
      setSelectedMine(mine);
      if (event) {
        setTooltipPos({ x: event.clientX, y: event.clientY });
      }
    }
    setHoveredMine(null);
  };

  const handleViewData = (mine) => {
    // Use short name (strip parenthetical) for better search matching
    const searchTerm = mine.name.replace(/\s*\(.*\)/, "");
    setTableSearch(searchTerm);
    setFilters((prev) => ({ ...prev, period: "all" }));
    setSelectedMine(null);
    setHoveredMine(null);
    setView("table");
  };

  const stats = {
    mines: filteredMines.length,
    companies: new Set(filteredMines.map((m) => m.company)).size,
    countries: new Set(filteredMines.map((m) => m.country)).size,
    records: filteredProduction.length,
  };

  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Header */}
      <header className="h-12 flex items-center justify-between px-2 md:px-5 border-b border-white/5 flex-shrink-0 relative z-[1000] overflow-hidden">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden text-white/50 hover:text-white/80 p-1 flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          </button>
          <div className="w-2 h-2 rounded-full bg-orange-500 hidden md:block flex-shrink-0" />
          <span className="hidden md:inline text-sm font-semibold tracking-tight whitespace-nowrap">World Mining Monitor</span>
          <span className="md:hidden text-xs font-semibold tracking-tight whitespace-nowrap">WMM</span>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-white/5 rounded p-0.5">
          <button
            onClick={() => {
              setView("map");
              setTableSearch("");
              setFilters((prev) => ({ ...prev, period: "all", companies: [] }));
              setSidebarOpen(false);
            }}
            className={`px-3 py-1 rounded text-[11px] transition-colors ${
              view === "map" ? "bg-orange-500/20 text-orange-400" : "text-white/40 hover:text-white/60"
            }`}
          >
            Map
          </button>
          <button
            onClick={() => { setView("table"); setSidebarOpen(false); }}
            className={`px-3 py-1 rounded text-[11px] transition-colors ${
              view === "table" ? "bg-orange-500/20 text-orange-400" : "text-white/40 hover:text-white/60"
            }`}
          >
            Table
          </button>
        </div>

        <div className="flex items-center gap-2.5 text-[11px] text-white/40 flex-shrink-0">
          <span className="hidden md:inline">{stats.mines} mines</span>
          <span className="hidden md:inline text-white/10">|</span>
          <span className="hidden md:inline">{stats.companies} companies</span>
          <a
            href="https://github.com/kadoa-org/world-mining-monitor"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-white/30 hover:text-white/70 transition-colors text-[11px]"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
            <span className="hidden sm:inline">Star on GitHub</span>
          </a>
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile overlay backdrop */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-[999] md:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        <div className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static top-12 md:top-0 z-[1000] md:z-auto h-[calc(100vh-3rem)] md:h-full transition-transform duration-200`}>
          <Sidebar
            filters={filters}
            setFilters={setFilters}
            companies={filteredCompanies}
            commodities={commodities}
            periods={periods}
          />
        </div>
        <main className="flex-1 relative overflow-hidden">
          {/* Keep map mounted with dimensions to preserve Leaflet state */}
          <div style={{
            width: "100%", height: "100%",
            visibility: view === "map" ? "visible" : "hidden",
            position: view === "map" ? "relative" : "absolute",
            pointerEvents: view === "map" ? "auto" : "none",
          }}>
            <MiningMap
              mines={filteredMines}
              mineProduction={mineProduction}
              filters={filters}
              onMineHover={handleMineHover}
              onMineLeave={() => {
                if (!selectedMine) setHoveredMine(null);
              }}
              onMineClick={handleMineClick}
              onBackgroundClick={() => {
                setSelectedMine(null);
                setHoveredMine(null);
              }}
              selectedMineId={selectedMine?.id}
              onViewData={handleViewData}
            />
          </div>
          {view === "table" && (
            <DataTable
              production={production}
              mines={mines}
              filters={filters}
              activePeriod={activePeriod}
              initialSearch={tableSearch}
              onSearchChange={setTableSearch}
            />
          )}
        </main>
      </div>

      {/* Map attribution overlay - outside main to avoid Leaflet z-index */}
      {view === "map" && (
        <a
          href="https://kadoa.com/contact"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-3 right-3 z-[2000] flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 text-[11px] hover:border-orange-500/30 transition-colors"
        >
          <span className="text-white/40">Powered by kadoa</span>
          <span className="text-orange-400/80">Get full dataset &rarr;</span>
        </a>
      )}
    </div>
  );
}
