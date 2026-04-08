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
    // Prioritize standard calendar periods (Q1-Q4 20xx, H1/H2 20xx, FY20xx)
    const standard = all.filter((p) => /^(Q[1-4]|H[12]|FY|9M) \d{4}$/.test(p) || /^FY\d{4}$/.test(p));
    return standard.sort((a, b) => {
      // Sort by year desc, then period desc
      const ya = a.match(/\d{4}/)?.[0] || "0";
      const yb = b.match(/\d{4}/)?.[0] || "0";
      if (ya !== yb) return yb.localeCompare(ya);
      return b.localeCompare(a);
    });
  }, [production]);

  // Find the latest quarter with the most data (at least 5 mines reporting)
  const latestPeriod = useMemo(() => {
    const stdQuarters = periods.filter((p) => /^Q[1-4] \d{4}$/.test(p));
    if (stdQuarters.length === 0) return periods[0] || "";
    // Sort by year desc, quarter desc
    const sorted = stdQuarters.sort((a, b) => {
      const ya = Number(a.slice(3));
      const yb = Number(b.slice(3));
      if (ya !== yb) return yb - ya;
      return Number(b[1]) - Number(a[1]);
    });
    // Pick the most recent quarter that has at least 5 production records
    for (const p of sorted) {
      const count = production.filter((r) => r.time_period === p && r.metric === "production").length;
      if (count >= 5) return p;
    }
    return sorted[0];
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
    const map = new Map();
    for (const p of filteredProduction) {
      const existing = map.get(p.mine_id) || { total_kt: 0, commodities: {}, records: [] };
      const kt = p.value_normalized || 0;
      existing.total_kt += kt;
      existing.commodities[p.commodity] = (existing.commodities[p.commodity] || 0) + kt;
      existing.records.push(p);
      map.set(p.mine_id, existing);
    }
    return map;
  }, [filteredProduction]);

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
      <header className="h-12 flex items-center justify-between px-5 border-b border-white/5 flex-shrink-0 relative z-[1000]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-sm font-semibold tracking-tight">World Mining Monitor</span>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-white/5 rounded p-0.5">
          <button
            onClick={() => {
              setView("map");
              setTableSearch("");
              setFilters((prev) => ({ ...prev, period: "all", companies: [] }));
            }}
            className={`px-3 py-1 rounded text-[11px] transition-colors ${
              view === "map" ? "bg-orange-500/20 text-orange-400" : "text-white/40 hover:text-white/60"
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setView("table")}
            className={`px-3 py-1 rounded text-[11px] transition-colors ${
              view === "table" ? "bg-orange-500/20 text-orange-400" : "text-white/40 hover:text-white/60"
            }`}
          >
            Table
          </button>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-white/40 flex-shrink-0">
          <span>{stats.mines} mines</span>
          <span className="text-white/10">|</span>
          <span>{stats.companies} companies</span>
          <span className="text-white/10">|</span>
          <span>{stats.countries} countries</span>
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          filters={filters}
          setFilters={setFilters}
          companies={filteredCompanies}
          commodities={commodities}
          periods={periods}
        />
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
    </div>
  );
}
