/**
 * Build-time prerender for SEO.
 *
 * The app is a client-rendered SPA, so without this every route serves the
 * identical homepage HTML and deep pages (companies, commodities) are
 * invisible to search engines. Runs after `vite build` and writes a static
 * `dist/<route>/index.html` per route with:
 *   - unique <title>, meta description, canonical, og/twitter tags
 *   - a crawler-visible content block inside #root (replaced on hydration)
 * plus dist/sitemap.xml and dist/robots.txt.
 *
 * Routes are enumerated from public/data/mining.db (read via sql.js) using
 * the same commodity normalization + slugs as the client app, so every
 * prerendered URL matches a working SPA route.
 *
 * Usage: node scripts/prerender.mjs   (wired into `npm run build`)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";
import { commodityLabel, COMPANY_TICKERS, normalizeCommodity, quarterlyPivot, slugify } from "../src/constants.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist", "mining"); // vite outDir (site lives under /mining/)
const PREFIX = "/mining"; // public path prefix behind the www.kadoa.com reverse proxy
const BASE = `https://www.kadoa.com${PREFIX}`;

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fmtValue = (v) => {
  if (v == null) return "--";
  if (Math.abs(v) >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 1 });
  if (Math.abs(v) >= 1) return v.toFixed(1);
  return v.toFixed(3);
};

// ── data ─────────────────────────────────────────────────────────────────────

async function loadData() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(path.join(ROOT, "public/data/mining.db")));
  const read = (sql) => {
    const out = [];
    const stmt = db.prepare(sql);
    while (stmt.step()) out.push(stmt.getAsObject());
    stmt.free();
    return out;
  };
  const production = read("SELECT * FROM production")
    .map((r) => ({ ...r, commodity: normalizeCommodity(r.commodity) }))
    .filter((r) => r.commodity !== null);
  const mines = read("SELECT * FROM mines");
  db.close();
  return { production, mines };
}

// Crawler-visible quarterly series table (quarters x commodities) — the
// direct answer to "<company|mine> production by quarter" queries.
function pivotTable(records) {
  const pivot = quarterlyPivot(records);
  if (!pivot.quarters.length) return "";
  const head = `<tr><th>Quarter</th>${pivot.commodities
    .map((c) => `<th>${esc(commodityLabel(c))} (${esc(pivot.unit[c])})</th>`)
    .join("")}</tr>`;
  const body = pivot.quarters
    .map(
      (q) =>
        `<tr><td>${esc(q)}</td>${pivot.commodities
          .map((c) => `<td>${pivot.get(c, q) != null ? esc(fmtValue(pivot.get(c, q))) : "--"}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  return `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

const qKey = (tp) => `${tp.slice(3)}${tp[1]}`; // "Q3 2025" -> "20253", sortable
const latestQuarterOf = (rows) => {
  const qs = [...new Set(rows.map((p) => p.time_period))]
    .filter((tp) => /^Q[1-4] \d{4}$/.test(tp))
    .sort((a, b) => qKey(b).localeCompare(qKey(a)));
  return qs[0] ?? null;
};

// ── route definitions ────────────────────────────────────────────────────────

function buildRoutes(production, mines) {
  const routes = [];
  const companies = [...new Set(production.map((p) => p.company))].sort();
  const commodities = [...new Set(production.map((p) => p.commodity))].filter(Boolean).sort();

  routes.push(
    {
      path: "/production",
      title: "Mining Production Data - Quarterly Volumes by Mine & Company | World Mining Monitor",
      description: `${production.length.toLocaleString("en-US")} normalized production records from ${companies.length} global mining companies: mine, commodity, period, volume, and source filing. Filterable, CSV export.`,
    },
    {
      path: "/companies",
      title: `Mining Companies Tracked - Production Data for ${companies.length} Producers | World Mining Monitor`,
      description: `Mine-level production data for ${companies.length} global mining companies, extracted from their quarterly and annual reports.`,
      h1: "Mining companies tracked",
      body: `<ul>${companies
        .map((c) => `<li><a href="${PREFIX}/company/${esc(slugify(c))}">${esc(c)} production data</a></li>`)
        .join("")}</ul>`,
    },
    {
      path: "/commodities",
      title: "Mine Production by Commodity - Copper, Gold, Iron Ore & More | World Mining Monitor",
      description: `Quarterly production volumes for ${commodities.length} commodities across ${companies.length} mining companies, from primary-source disclosures.`,
      h1: "Production by commodity",
      body: `<ul>${commodities
        .map(
          (c) =>
            `<li><a href="${PREFIX}/commodity/${esc(slugify(c))}">${esc(commodityLabel(c))} production by company</a></li>`,
        )
        .join("")}</ul>`,
    },
    {
      path: "/about",
      title: "About the Data - Methodology & Sources | World Mining Monitor",
      description:
        "How the World Mining Monitor works: report discovery with Kadoa, LLM extraction from quarterly PDFs, commodity and unit normalization, and validation. Open data under CC BY 4.0.",
    },
  );

  for (const company of companies) {
    const rows = production.filter((p) => p.company === company);
    const comms = [...new Set(rows.map((p) => p.commodity))].filter(Boolean).sort();
    const latest = latestQuarterOf(rows);
    const commLabels = comms.map(commodityLabel);
    const slug = slugify(company);

    const latestRows = latest
      ? rows.filter((p) => p.time_period === latest && p.metric === "production").slice(0, 40)
      : [];
    const table = latestRows.length
      ? `<h2>${esc(company)} production — ${esc(latest)}</h2><table><thead><tr><th>Operation</th><th>Commodity</th><th>Volume</th></tr></thead><tbody>${latestRows
          .map(
            (r) =>
              `<tr><td>${esc(r.operation || "")}</td><td>${esc(commodityLabel(r.commodity))}</td><td>${esc(fmtValue(r.value_normalized ?? r.value))} ${esc(r.unit_normalized || r.unit || "")}</td></tr>`,
          )
          .join("")}</tbody></table>`
      : "";

    const ticker = COMPANY_TICKERS[company];
    const tickerSuffix = ticker ? ` (${ticker})` : "";
    const series = pivotTable(rows);
    routes.push({
      path: `/company/${slug}`,
      title: `${company}${tickerSuffix} Production Data - ${commLabels.slice(0, 3).join(", ")} Output by Quarter | World Mining Monitor`,
      description: `${company}${tickerSuffix} mine-level production volumes by quarter: ${commLabels.join(", ")}. ${rows.length} records extracted from ${company}'s own quarterly and annual reports${latest ? `, latest ${latest}` : ""}.`,
      h1: `${company}${tickerSuffix}: quarterly production data`,
      body: `<p>${esc(company)}${esc(tickerSuffix)} discloses mine-level production for ${esc(commLabels.join(", "))}. This page tracks ${rows.length} extracted records${latest ? `, most recently ${esc(latest)}` : ""}.</p>${series ? `<h2>${esc(company)} production by quarter</h2>${series}` : ""}${table}<p><a href="${PREFIX}/companies">All mining companies</a></p>`,
    });
  }

  for (const commodity of commodities) {
    const rows = production.filter((p) => p.commodity === commodity && p.metric === "production");
    const latest = latestQuarterOf(rows);
    const label = commodityLabel(commodity);
    const slug = slugify(commodity);
    const unit = rows.find((p) => p.unit_normalized)?.unit_normalized || "kt";

    // Company ranking for the latest quarter — the crawler-visible answer to
    // "who produces the most X".
    const byCompany = new Map();
    for (const p of rows) {
      if (p.time_period !== latest) continue;
      byCompany.set(p.company, (byCompany.get(p.company) || 0) + (p.value_normalized || 0));
    }
    const ranking = [...byCompany.entries()].sort((a, b) => b[1] - a[1]);
    const rankingHtml = ranking.length
      ? `<h2>Largest ${esc(label.toLowerCase())} producers — ${esc(latest)}</h2><ol>${ranking
          .map(
            ([c, v]) =>
              `<li><a href="${PREFIX}/company/${esc(slugify(c))}">${esc(c)}</a> — ${esc(fmtValue(v))} ${esc(unit)}</li>`,
          )
          .join("")}</ol>`
      : "";

    routes.push({
      path: `/commodity/${slug}`,
      title: `${label} Production by Company${latest ? ` - ${latest}` : ""} | World Mining Monitor`,
      description: `Who produces the most ${label.toLowerCase()}? ${ranking.length ? `${ranking[0][0]} leads` : "Company rankings"} among ${new Set(rows.map((p) => p.company)).size} tracked producers, from mine-level disclosures${latest ? `, latest ${latest}` : ""}.`,
      h1: `${label} production by company`,
      body: `<p>Mine-level ${esc(label.toLowerCase())} production extracted from company quarterly reports, normalized to ${esc(unit)}.</p>${rankingHtml}<p><a href="${PREFIX}/largest-${slug}-mines">Largest ${esc(label.toLowerCase())} mines in the world</a> · <a href="${PREFIX}/commodities">All commodities</a></p>`,
    });
  }

  // Per-mine pages: "<mine> production" queries. Only mines with actual
  // production records get a page (and a sitemap entry).
  const byMine = new Map();
  for (const p of production) {
    if (!p.mine_id) continue;
    if (!byMine.has(p.mine_id)) byMine.set(p.mine_id, []);
    byMine.get(p.mine_id).push(p);
  }
  const mineById = new Map(mines.map((m) => [m.id, m]));
  for (const [mineId, rows] of byMine) {
    const mine = mineById.get(mineId);
    if (!mine) continue;
    const series = pivotTable(rows);
    if (!series) continue;
    const comms = [...new Set(rows.map((p) => p.commodity))].filter(Boolean).sort().map(commodityLabel);
    const latest = latestQuarterOf(rows);
    routes.push({
      path: `/mine/${mineId}`,
      title: `${mine.name} Mine Production by Quarter - ${comms.slice(0, 3).join(", ")} | World Mining Monitor`,
      description: `${mine.name} (${mine.company}${mine.country ? `, ${mine.country}` : ""}) quarterly production: ${comms.join(", ")}${latest ? `, latest ${latest}` : ""}. From ${mine.company}'s own reports.`,
      h1: `${mine.name}: production by quarter`,
      body: `<p>${esc(mine.name)} is operated by <a href="${PREFIX}/company/${esc(slugify(mine.company))}">${esc(mine.company)}</a>${mine.country ? ` in ${esc(mine.country)}` : ""} and produces ${esc(comms.join(", "))}.</p>${series}<p><a href="${PREFIX}/production">All production data</a></p>`,
    });
  }

  // "Largest <commodity> mines" rankings: live counterpart to the annual
  // listicles. Only commodities with enough mine-level coverage to rank.
  for (const commodity of commodities) {
    const rows = production.filter((p) => p.commodity === commodity && p.metric === "production" && p.mine_id);
    const latest = latestQuarterOf(rows);
    if (!latest) continue;
    const byM = new Map();
    for (const p of rows) {
      if (p.time_period !== latest) continue;
      byM.set(p.mine_id, (byM.get(p.mine_id) || 0) + (p.value_normalized || 0));
    }
    // Guard against company-wide totals mis-attributed to a flagship mine
    // (e.g. BHP group copper attached to the WAIO iron-ore id): a mine only
    // ranks for commodities it declares. Mines with no declared list pass.
    const declares = (mine) => {
      try {
        const list = JSON.parse(mine.commodities || "[]").map(normalizeCommodity).filter(Boolean);
        return list.length === 0 || list.includes(commodity);
      } catch {
        return true;
      }
    };
    const ranked = [...byM.entries()]
      .map(([id, v]) => ({ mine: mineById.get(id), v }))
      .filter((r) => r.mine && r.v > 0 && declares(r.mine))
      .sort((a, b) => b.v - a.v)
      .slice(0, 25);
    if (ranked.length < 5) continue;
    const label = commodityLabel(commodity);
    const slug = slugify(commodity);
    const unit = rows.find((p) => p.unit_normalized)?.unit_normalized || "kt";
    routes.push({
      path: `/largest-${slug}-mines`,
      title: `${ranked.length} Largest ${label} Mines in the World - ${latest} Production | World Mining Monitor`,
      description: `The biggest ${label.toLowerCase()} mines ranked by ${latest} disclosed production: ${ranked
        .slice(0, 3)
        .map((r) => r.mine.name)
        .join(", ")} and more. Live data from operator reports.`,
      h1: `Largest ${label.toLowerCase()} mines in the world`,
      body: `<p>The biggest ${esc(label.toLowerCase())} mines ranked by disclosed production in ${esc(latest)}, normalized to ${esc(unit)}.</p><ol>${ranked
        .map(
          (r) =>
            `<li><a href="${PREFIX}/mine/${esc(r.mine.id)}">${esc(r.mine.name)}</a> (${esc(r.mine.company)}${r.mine.country ? `, ${esc(r.mine.country)}` : ""}) — ${esc(fmtValue(r.v))} ${esc(unit)}</li>`,
        )
        .join("")}</ol><p><a href="${PREFIX}/commodity/${slug}">${esc(label)} production by company</a></p>`,
    });
  }

  return routes;
}

// ── templating ───────────────────────────────────────────────────────────────

function renderRoute(template, route) {
  const url = `${BASE}${route.path}`;
  // Function replacements throughout: replacement STRINGS treat `$` as
  // capture-group syntax, which corrupts output when titles/values contain it.
  let html = template
    .replace(/<title>[^<]*<\/title>/, () => `<title>${esc(route.title)}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/s, (_m, a, b) => `${a}${esc(route.description)}${b}`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, (_m, a, b) => `${a}${url}${b}`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, (_m, a, b) => `${a}${url}${b}`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, (_m, a, b) => `${a}${esc(route.title)}${b}`)
    .replace(
      /(<meta\s+property="og:description"\s+content=")[^"]*(")/s,
      (_m, a, b) => `${a}${esc(route.description)}${b}`,
    )
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, (_m, a, b) => `${a}${esc(route.title)}${b}`)
    .replace(
      /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/s,
      (_m, a, b) => `${a}${esc(route.description)}${b}`,
    );

  if (route.h1) {
    html = html.replace(
      /(<div id="root">)(<\/div>)/,
      (_m, open, close) =>
        `${open}<main><h1>${esc(route.h1)}</h1>${route.body ?? ""}<p><a href="${PREFIX}/">World Mining Monitor home</a></p></main>${close}`,
    );
  }
  return html;
}

// ── main ─────────────────────────────────────────────────────────────────────

const { production, mines } = await loadData();
const template = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
const routes = buildRoutes(production, mines);

let written = 0;
for (const r of routes) {
  const dir = path.join(DIST, r.path.slice(1));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), renderRoute(template, r));
  written++;
}

const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${BASE}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
${routes
  .map(
    (r) =>
      `<url><loc>${BASE}${r.path}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${r.path.split("/").length > 2 ? "0.7" : "0.9"}</priority></url>`,
  )
  .join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(DIST, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${BASE}/sitemap.xml\n`);

console.log(`prerendered ${written} routes + sitemap.xml (${routes.length + 1} urls) + robots.txt`);
