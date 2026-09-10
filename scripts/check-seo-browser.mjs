import fs from "node:fs";
import path from "node:path";
import initSqlJs from "sql.js";
import { buildRoutes, renderRoute } from "./prerender.mjs";

// Run after `bun run build`, with `bun scripts/preview-static.mjs` running.
const root = path.resolve(import.meta.dir, "..");
const output = path.resolve(process.env.MINING_QA_OUTPUT || path.join(root, "output/playwright"));
const base = `http://127.0.0.1:${process.env.MINING_PREVIEW_PORT || 5183}`;
fs.mkdirSync(output, { recursive: true });
const fixtureDb = path.join(output, "mining-fixture.db");
const fixtureHtml = path.join(output, "mining-fixture.html");
const actual = {
  company: "BHP", mine_id: "bhp-waio", operation: "WAIO", commodity: "iron ore",
  metric: "production", time_period: "Q2 2026", calendar_period: "Q2 2026",
  value: 66.2, unit: "kt", value_normalized: 66.2, unit_normalized: "kt", basis: "consolidated",
};
const records = [
  { ...actual, time_period: "Q4 2025", calendar_period: "Q4 2025" },
  actual,
  { ...actual, metric: "production_guidance", time_period: "Q2 2028", calendar_period: "Q2 2028", reported_period: "from Q4 FY28", value_normalized: 70 },
];
const mines = [{ id: "bhp-waio", name: "WAIO", company: "BHP", country: "Australia", lat: -22.4, lng: 119.7, commodities: '["iron ore"]' }];
const SQL = await initSqlJs();
const source = new SQL.Database(fs.readFileSync(path.join(root, "public/data/mining.db")));
const fixture = new SQL.Database();
for (const [table, rows] of [["mines", mines], ["production", records]]) {
  fixture.run(source.exec(`SELECT sql FROM sqlite_master WHERE name = '${table}'`)[0].values[0][0]);
  for (const row of rows) {
    const columns = Object.keys(row);
    fixture.run(`INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`, Object.values(row));
  }
}
fs.writeFileSync(fixtureDb, fixture.export());
source.close();
fixture.close();
const home = fs.readFileSync(path.join(root, "dist/mining/index.html"), "utf8");
const shell = home.match(/<div id="root">([\s\S]*?)<\/div>/)[1];
const template = home.replace(/<div id="root">[\s\S]*?<\/div><main class="seo-shell"[\s\S]*?<\/main>/, '<div id="root"></div>');
fs.writeFileSync(fixtureHtml, renderRoute(template, buildRoutes(records, mines).find((route) => route.path === "/company/bhp"), shell));

async function browserCheck(page, { base, output, fixtureDb, fixtureHtml }) {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const nav = (name) => page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name, exact: true });
  const metadata = await (await page.request.get(`${base}/mining/data/page-metadata.json`)).json();
  const errors = [];
  const pageErrors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const checkMetadata = async (pathname) => {
    assert(await page.title() === metadata[pathname].title, `Wrong title at ${pathname}`);
    assert(await page.locator('meta[name="description"]').getAttribute("content") === metadata[pathname].description, `Wrong description at ${pathname}`);
  };
  let metadataRequests = 0;
  page.on("request", (request) => { if (request.url().endsWith("page-metadata.json")) metadataRequests++; });

  await page.goto(`${base}/mining/company/bhp`);
  await page.getByText("Latest quarter", { exact: true }).waitFor();
  await page.evaluate(() => {
    window.history.replaceState({ ...window.history.state, miningPageMetadata: { title: "Outdated title", description: "Outdated description", url: window.location.href } }, "");
  });
  await page.reload();
  await page.getByText("Latest quarter", { exact: true }).waitFor();
  await page.evaluate(() => { window.miningDocumentProof = true; });
  await nav("About").click();
  await page.waitForURL("**/mining/about");
  await checkMetadata("/mining/about");
  await nav("Companies").click();
  await page.getByRole("link", { name: "Browse mines", exact: true }).click();
  await page.waitForURL("**/mining/mines");
  await page.getByRole("heading", { name: "Mines tracked", exact: true }).waitFor();
  await checkMetadata("/mining/mines");
  assert(await page.evaluate(() => window.miningDocumentProof), "Navigation unexpectedly reloaded the document");
  assert(metadataRequests === 1, `Expected one cached metadata request, got ${metadataRequests}`);
  const hrefs = await page.getByRole("navigation", { name: "Primary" }).getByRole("link").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  assert(hrefs.every((href) => href.startsWith("/mining/")), "Navigation escaped the mining prefix");
  const [newTab] = await Promise.all([page.context().waitForEvent("page"), nav("Production").click({ modifiers: ["Meta"] })]);
  await newTab.waitForLoadState("domcontentloaded");
  assert(newTab.url() === `${base}/mining/production`, "New tab lost the mining prefix");
  await newTab.close();
  await page.goBack();
  await page.waitForURL("**/mining/companies");
  await checkMetadata("/mining/companies");
  await page.goBack();
  await page.waitForURL("**/mining/about");
  await checkMetadata("/mining/about");
  await page.goBack();
  await page.waitForURL("**/mining/company/bhp");
  await checkMetadata("/mining/company/bhp");
  await page.goto(`${base}/mining/mines`);
  await page.getByRole("heading", { name: "Mines tracked", exact: true }).waitFor();
  await checkMetadata("/mining/mines");

  let releaseDatabase;
  const gate = new Promise((resolve) => { releaseDatabase = resolve; });
  await page.route("**/data/mining.db", async (route) => { await gate; await route.continue(); });
  await page.goto(`${base}/mining/company/bhp`);
  await page.getByRole("status").filter({ hasText: "The published summary is available below" }).waitFor();
  const loadingAnswer = page.locator(".seo-shell h1");
  assert((await loadingAnswer.boundingBox()).y < 600, "Published answer is pushed below the first viewport while loading");
  await page.screenshot({ path: `${output}/mining-loading.png` });
  releaseDatabase();
  await page.getByText("Latest quarter", { exact: true }).waitFor();
  assert(await page.locator(".seo-shell").count() === 0, "Published answer duplicates the loaded app");
  await page.unroute("**/data/mining.db");

  await page.route("**/data/mining.db", (route) => route.fulfill({ status: 503, body: "Dataset unavailable" }));
  await page.goto(`${base}/mining/company/bhp`);
  await page.getByRole("alert").filter({ hasText: "Interactive data could not load" }).waitFor();
  assert((await page.locator(".seo-shell h1").boundingBox()).y < 600, "Failed DB hid the published answer below the viewport");
  assert(await page.locator(".seo-shell table tbody td").first().innerText() === "Q2 2026", "Failed DB lost the actual production answer");
  assert(errors.some((message) => message.includes("Mining dataset load failed")), "Dataset failure was not logged");
  await page.screenshot({ path: `${output}/mining-db-unavailable.png` });
  await nav("About").click();
  await page.waitForURL("**/mining/about");
  assert(await page.locator(".seo-shell").count() === 0, "BHP published answer survived navigation to About");
  await checkMetadata("/mining/about");
  await page.unroute("**/data/mining.db");

  for (const status of [503, 200]) {
    const before = metadataRequests;
    const errorsBefore = errors.length;
    await page.route("**/page-metadata.json", (route) => route.fulfill({ status, body: "{}", contentType: "application/json" }));
    await page.goto(`${base}/mining/company/bhp`);
    await nav("About").waitFor();
    await page.evaluate(() => { window.miningDocumentProof = true; });
    await nav("About").click();
    await page.waitForURL("**/mining/about");
    await page.getByRole("heading", { name: "About the data", exact: true }).waitFor();
    await checkMetadata("/mining/about");
    assert(!(await page.evaluate(() => window.miningDocumentProof)), "Unavailable metadata did not open the published document");
    assert(metadataRequests - before === 1, "Metadata failure retried or caused a navigation loop");
    assert(errors.slice(errorsBefore).some((message) => message.includes("Mining page metadata unavailable; opening the published page")), "Metadata fallback was not logged");
    await page.unroute("**/page-metadata.json");
  }

  await page.route("**/mining/company/bhp", (route) => route.fulfill({ path: fixtureHtml, contentType: "text/html" }));
  await page.route("**/data/mining.db", (route) => route.fulfill({ path: fixtureDb, contentType: "application/x-sqlite3" }));
  await page.goto(`${base}/mining/company/bhp`);
  await page.getByText("Latest quarter", { exact: true }).waitFor();
  const summary = await page.getByText("Latest quarter", { exact: true }).locator("..").innerText();
  assert(summary.includes("Q2 2026") && !summary.includes("Q2 2028"), "Rendered summary used future guidance as actual production");
  const description = await page.locator('meta[name="description"]').getAttribute("content");
  assert(description.includes("latest Q2 2026") && !description.includes("Q2 2028"), "Generated metadata disagrees with the rendered fixture");
  const body = await page.locator("body").innerText();
  assert(body.includes("production_guidance") && body.includes("Q2 2028"), "Future guidance was removed from the records");
  await page.screenshot({ path: `${output}/mining-fixture-production.png` });
  await page.unroute("**/mining/company/bhp");
  await page.unroute("**/data/mining.db");
  assert(pageErrors.length === 0, `Uncaught browser errors: ${pageErrors.join("; ")}`);
  return "PASS: navigation, new tab, history, metadata cache/failure, delayed/failed DB, existing mines directory, production/guidance fixture";
}

function cli(...args) {
  const result = Bun.spawnSync(["playwright-cli", "-s=mining-seo-proof", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
  const stdout = result.stdout.toString();
  if (result.exitCode || stdout.includes("### Error")) throw new Error(stdout + result.stderr.toString());
  return stdout;
}

try {
  cli("open", `${base}/mining/company/bhp`, "--headed");
  const config = { base, output, fixtureDb, fixtureHtml };
  const result = cli("run-code", `async page => (${browserCheck.toString()})(page, ${JSON.stringify(config)})`);
  fs.writeFileSync(path.join(output, "seo-browser-check.txt"), result);
  console.log(result.match(/PASS: [^\n]+/)?.[0] || result);
} catch (error) {
  fs.writeFileSync(path.join(output, "seo-browser-failure.txt"), `${cli("snapshot")}\n${cli("console")}`);
  throw error;
} finally {
  cli("close");
}
