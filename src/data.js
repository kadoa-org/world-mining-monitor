// Shared data layer: loads the full dataset out of SQLite once and derives
// the lookups every page needs. The dataset is small (~4k production rows,
// ~200 mines), so in-memory JS aggregation beats scattering SQL across pages.
import { useMemo } from "react";
import { normalizeCommodity } from "./constants";
import { slugify } from "./ui";
import { query } from "./useDatabase";

export function useMiningData(db) {
  return useMemo(() => {
    if (!db) return null;

    const mines = query(db, "SELECT * FROM mines").map((r) => ({
      ...r,
      commodities: r.commodities ? JSON.parse(r.commodities) : [],
    }));

    const production = query(db, "SELECT * FROM production")
      .map((r) => ({ ...r, commodity: normalizeCommodity(r.commodity) }))
      .filter((r) => r.commodity !== null);

    const mineById = new Map(mines.map((m) => [m.id, m]));

    const companies = [...new Set(production.map((p) => p.company))].sort();
    const companyBySlug = new Map(companies.map((c) => [slugify(c), c]));

    const commodities = [...new Set(production.map((p) => p.commodity))].filter(Boolean).sort();
    const commodityBySlug = new Map(commodities.map((c) => [slugify(c), c]));

    // Quarterly / half-year / full-year period lists, 2023+, newest first.
    const all = [...new Set(production.map((p) => p.time_period))];
    const byYearDesc = (a, b) => {
      const ya = Number(a.slice(-4));
      const yb = Number(b.slice(-4));
      if (ya !== yb) return yb - ya;
      return Number(b[1]) - Number(a[1]);
    };
    const quarters = all.filter((p) => /^Q[1-4] \d{4}$/.test(p) && Number(p.slice(3)) >= 2023).sort(byYearDesc);
    const halves = all.filter((p) => /^H[12] \d{4}$/.test(p) && Number(p.slice(3)) >= 2023).sort(byYearDesc);
    const fullYears = all
      .filter((p) => /^FY\d{4}$/.test(p) && Number(p.slice(2)) >= 2023 && Number(p.slice(2)) <= 2030)
      .sort((a, b) => Number(b.slice(2)) - Number(a.slice(2)));
    const periods = { quarters, halves, fullYears };

    // Latest quarter with meaningful coverage (>= 5 production records), so a
    // single early reporter doesn't flip the whole site to a sparse quarter.
    let latestPeriod = quarters[0] ?? "";
    for (const p of quarters) {
      const count = production.filter((r) => r.time_period === p && r.metric === "production").length;
      if (count >= 5) {
        latestPeriod = p;
        break;
      }
    }

    return {
      mines,
      production,
      mineById,
      companies,
      companyBySlug,
      commodities,
      commodityBySlug,
      periods,
      latestPeriod,
    };
  }, [db]);
}

// Latest quarterly value per mine+commodity, avoiding double counting of
// overlapping periods (Q1+Q2+H1+FY all describe the same tonnes).
export function latestPerMineCommodity(production) {
  const isQ = (tp) => /^Q[1-4] \d{4}$/.test(tp);
  const latest = new Map();
  for (const p of production) {
    if (p.metric !== "production") continue;
    const key = `${p.mine_id}|${p.commodity}`;
    const existing = latest.get(key);
    if (!existing) {
      latest.set(key, p);
      continue;
    }
    const curIsQ = isQ(p.time_period);
    const exIsQ = isQ(existing.time_period);
    if (curIsQ && !exIsQ) latest.set(key, p);
    else if (curIsQ === exIsQ && p.time_period > existing.time_period) latest.set(key, p);
  }
  return [...latest.values()];
}

// Previous comparable period for QoQ/YoY-style deltas.
export function getPrevPeriod(period) {
  if (!period) return null;
  const qm = period.match(/^Q(\d)\s+(\d{4})$/);
  if (qm) {
    const q = Number(qm[1]);
    const y = Number(qm[2]);
    return q === 1 ? `Q4 ${y - 1}` : `Q${q - 1} ${y}`;
  }
  const hm = period.match(/^H(\d)\s+(\d{4})$/);
  if (hm) {
    const h = Number(hm[1]);
    const y = Number(hm[2]);
    return h === 1 ? `H2 ${y - 1}` : `H1 ${y}`;
  }
  const fm = period.match(/^FY\s?(\d{4})$/);
  if (fm) return `FY${Number(fm[1]) - 1}`;
  return null;
}
