export const COMMODITY_COLORS = {
  copper: "#fd7412",
  gold: "#fbbf24",
  iron_ore: "#ef4444",
  "iron ore": "#ef4444",
  zinc: "#3b82f6",
  nickel: "#10b981",
  silver: "#94a3b8",
  coal: "#78716c",
  aluminum: "#8b5cf6",
  aluminium: "#8b5cf6",
  alumina: "#a78bfa",
  bauxite: "#7c3aed",
  cobalt: "#06b6d4",
  molybdenum: "#f97316",
  lead: "#6b7280",
  lithium: "#22d3ee",
  chromite: "#a3a3a3",
  diamonds: "#e879f9",
  platinum: "#64748b",
  palladium: "#78716c",
  salt: "#a8a29e",
  oil: "#854d0e",
  titanium_dioxide: "#f472b6",
  "titanium dioxide": "#f472b6",
  copper_equivalent: "#fb923c",
  "copper equivalent": "#fb923c",
  ore: "#a8a29e",
  tungsten: "#ea580c",
  niobium: "#0ea5e9",
  phosphate: "#84cc16",
  manganese: "#d97706",
  pgm: "#64748b",
  "2e pgm": "#64748b",
  "4e pgm": "#64748b",
  "gold equivalent": "#fbbf24",
  uranium: "#16a34a",
  tin: "#737373",
  "mineral sands": "#c084fc",
  "recycling materials": "#a3a3a3",
  "sulfuric acid": "#facc15",
  ammonia: "#2dd4bf",
  iron: "#ef4444",
};

// Merge display synonyms
export const COMMODITY_ALIASES = {
  aluminum: "aluminium",
  iron_ore: "iron ore",
  "titanium dioxide": "titanium_dioxide",
  "copper equivalent": "copper_equivalent",
  Copper: "copper",
  "Copper - heap leach": "copper",
  "Copper Cathodes": "copper",
  "Copper Concentrates": "copper",
  "copper concentrate": "copper",
  "copper concentrates": "copper",
  "copper sulfate": "copper",
  "copper equivalents": "copper_equivalent",
  Gold: "gold",
  Silver: "silver",
  Zinc: "zinc",
  "Zinc in concentrate": "zinc",
  "Zinc-refined and in concentrate": "zinc",
  "zinc & lead": "zinc",
  "zinc and lead": "zinc",
  "zinc-lead": "zinc",
  "zinc (lead)": "zinc",
  "zinc equivalent": "zinc",
  PGM: "pgm",
  PGMs: "pgm",
  "PGM (2E)": "pgm",
  "PGM (3E)": "pgm",
  "platinum group metals": "pgm",
  "platinum group metals (PGMs)": "pgm",
  platinum: "pgm",
  palladium: "pgm",
  "precious metals": "pgm",
  TPM: "pgm",
  "TPM (gold, platinum, palladium)": "pgm",
  "Sulfuric acid": "sulfuric_acid",
  "sulfuric acid": "sulfuric_acid",
  "Molybdenum": "molybdenum",
  "Molybdenum Concentrates": "molybdenum",
  "Molybdenum contained in concentrate": "molybdenum",
  "Molybdenum in concentrate": "molybdenum",
  "energy coal": "coal",
  "metallurgical coal": "coal",
  "steelmaking coal": "coal",
  "manganese ore": "manganese",
  "mineral sands": "mineral_sands",
  "oil & gas": "oil",
  "oil": "oil",
  "lithium (LCE)": "lithium",
  "lithium carbonate": "lithium",
  "lithium carbonate equivalent": "lithium",
  "chrome ore": "chromite",
  "chromite concentrate": "chromite",
  ferrochrome: "chromite",
  "phosphate fertilizer": "phosphate",
  "base metals": null,
  "physical trade": null,
  "concentrate metal products": null,
  "refined metal products": null,
  metal: null,
  "2e pgm": "pgm",
  "4e pgm": "pgm",
  "gold equivalent": null,
  "copper_equivalent": null,
  "copper equivalent": null,
  "ncm precursor": null,
  selenium: null,
  silicon: null,
  nepheline: null,
  indium: null,
  antimony: null,
  bismuth: null,
  gallium: null,
  germanium: null,
  tellurium: null,
  "recycling materials": null,
  "sulfuric_acid": null,
  "sulfuric acid": null,
  "titanium dioxide slag": null,
  iron: "iron ore",
  concentrate: null,
  ore: null,
  energy: null,
  power: null,
  freight: null,
};

export function normalizeCommodity(c) {
  if (!c) return null;
  const mapped = COMMODITY_ALIASES[c];
  if (mapped === null) return null;  // explicitly filtered out
  return mapped || c;
}

// Display names for commodities that don't capitalize well
export const COMMODITY_DISPLAY = {
  pgm: "PGM",
  "iron ore": "Iron Ore",
};

export function commodityLabel(c) {
  return COMMODITY_DISPLAY[c] || c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

// Company -> primary ticker mapping
export const COMPANY_TICKERS = {
  "Alcoa": "AA",
  "Alro SA": "ALR.RO",
  "Aluminium Bahrain": "ALBH.BH",
  "Amman Mineral": "AMMN.JK",
  "Anglo American": "AAL.L",
  "Antofagasta": "ANTO.L",
  "Aurubis": "NDA.DE",
  "BHP": "BHP",
  "Barrick Gold": "B",
  "Befesa SA": "BFSA.DE",
  "Boliden": "BOL.ST",
  "CNMC": "1258.HK",
  "Centerra Gold": "CG.TO",
  "Century Aluminum": "CENX",
  "China Daye": "0661.HK",
  "China Hongqiao": "1378.HK",
  "China Molybdenum": "3993.HK",
  "Eramet": "ERA.PA",
  "First Quantum Minerals": "FM.TO",
  "Freeport-McMoRan": "FCX",
  "Glencore": "GLEN.L",
  "Hindalco": "HINDALCO.NS",
  "Hindustan Zinc": "HINDZINC.NS",
  "Hudbay Minerals": "HBM.TO",
  "Industrias Penoles": "PE&OLES.MX",
  "Ivanhoe Mines": "IVN.TO",
  "Jinchuan": "2362.HK",
  "Jubilee Platinum": "JLP.L",
  "KAZ Minerals": "",
  "KGHM": "KGH.WA",
  "Kaiser Aluminum": "KALU",
  "Korea Zinc": "010130.KS",
  "Lundin Mining": "LUN.TO",
  "MMG Limited": "1208.HK",
  "Maaden": "1211.SR",
  "Merdeka Copper Gold": "MDKA.JK",
  "New Gold": "",
  "Newmont": "NEM",
  "Nexa Resources": "NEXA",
  "Nickel Industries": "NIC.AX",
  "Nornickel": "GMKN.ME",
  "Norsk Hydro": "NHY.OL",
  "PT Aneka Tambang": "ANTM.JK",
  "RUSAL": "0486.HK",
  "Rio Tinto": "RIO",
  "Sandfire Resources": "SFR.AX",
  "Sibanye Stillwater": "SSW.JO",
  "South32": "S32.AX",
  "Southern Copper": "SCCO",
  "Teck Resources": "TECK",
  "Vale SA": "VALE",
  "Vedanta": "VEDL.NS",
  "Zijin Mining": "2899.HK",
};

export const REGIONS = ["All", "Americas", "Europe", "Asia Pacific", "Africa"];

// Bubble size scale: log(value_in_kt) * factor
export const BUBBLE_MIN = 4;
export const BUBBLE_MAX = 22;

// URL-safe slug for companies and commodities. Shared by the app (via ui.jsx)
// and scripts/prerender.mjs — keep it here (plain JS, importable from node).
export function slugify(name) {
  if (!name) return "unknown";
  return String(name)
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

// Quarterly production pivot for a set of records: quarters (newest first,
// capped) x top commodities by volume. Shared by the app pages and
// scripts/prerender.mjs (plain JS, importable from node) — this table is the
// crawler-visible answer to "<company|mine> production by quarter".
export function quarterlyPivot(records, { maxQuarters = 8, maxCommodities = 6 } = {}) {
  const prod = records.filter((r) => r.metric === "production" && /^Q[1-4] \d{4}$/.test(r.time_period));
  const qKey = (tp) => tp.slice(3) + tp[1];
  const quarters = [...new Set(prod.map((r) => r.time_period))]
    .sort((a, b) => qKey(b).localeCompare(qKey(a)))
    .slice(0, maxQuarters);
  const totals = new Map();
  for (const r of prod) totals.set(r.commodity, (totals.get(r.commodity) || 0) + (r.value_normalized || 0));
  const commodities = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCommodities)
    .map(([c]) => c);
  const unit = {};
  const cell = new Map();
  for (const r of prod) {
    if (!quarters.includes(r.time_period) || !commodities.includes(r.commodity)) continue;
    unit[r.commodity] ||= r.unit_normalized || r.unit || "kt";
    const k = `${r.commodity}|${r.time_period}`;
    cell.set(k, (cell.get(k) || 0) + (r.value_normalized || 0));
  }
  return { quarters, commodities, unit, get: (c, q) => cell.get(`${c}|${q}`) ?? null };
}
