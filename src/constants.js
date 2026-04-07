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
  platinum: "#d4d4d8",
  palladium: "#fafafa",
  salt: "#d6d3d1",
  oil: "#854d0e",
  titanium_dioxide: "#f472b6",
  "titanium dioxide": "#f472b6",
  copper_equivalent: "#fb923c",
  "copper equivalent": "#fb923c",
  ore: "#a8a29e",
};

// Merge display synonyms
export const COMMODITY_ALIASES = {
  aluminum: "aluminium",
  "iron ore": "iron_ore",
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
  concentrate: null,  // skip generic "concentrate"
  ore: null,          // skip generic "ore"
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

export const REGIONS = ["All", "Americas", "Europe", "Asia Pacific", "Africa"];

// Bubble size scale: log(value_in_kt) * factor
export const BUBBLE_MIN = 6;
export const BUBBLE_MAX = 32;
