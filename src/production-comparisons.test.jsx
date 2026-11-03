import { afterAll, beforeAll, expect, test } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

let server;
let ProductionPage;

beforeAll(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true },
    logLevel: "error",
  });
  ({ default: ProductionPage } = await server.ssrLoadModule("/src/pages/ProductionPage.jsx"));
});

afterAll(async () => server?.close());

function record(overrides = {}) {
  return {
    company: "Example Mining", mine_id: null, operation: null,
    commodity: "copper", product_form: null, metric: "production",
    time_period: "Q1 2026", value_normalized: 100, unit_normalized: "kt",
    basis: "consolidated", ...overrides,
  };
}

function render(production, company = "Example Mining") {
  return renderToStaticMarkup(<ProductionPage
    data={{
      production, mineById: new Map(), companies: [...new Set(production.map((p) => p.company))],
      commodities: [...new Set(production.map((p) => p.commodity))], periods: { quarters: ["Q2 2026", "Q1 2026"], halves: [], fullYears: [] },
    }}
    initialQuery={{ company, period: "Q2 2026" }}
  />);
}

const current = () => record({ time_period: "Q2 2026", value_normalized: 110 });

test("compares the same company's figures before applying the company filter", () => {
  const html = render([record(), record({ company: "Other Mining", value_normalized: 200 }), current()]);
  expect(html).toContain("+10.0%");
  expect(html).not.toContain("-45.0%");
});

test("keeps reporting bases separate", () => {
  const html = render([record(), record({ basis: "attributable", value_normalized: 50 }), current()]);
  expect(html).toContain("+10.0%");
  expect(html).not.toContain("+120.0%");
});

test("keeps normalized units separate", () => {
  const html = render([record(), record({ unit_normalized: "t", value_normalized: 100_000 }), current()]);
  expect(html).toContain("+10.0%");
  expect(html).not.toContain("-99.9%");
});

test.each([
  { company: "Other Mining" },
  { basis: "attributable" },
  { unit_normalized: "t" },
])("leaves the comparison unknown when only an incompatible predecessor exists: %j", (overrides) => {
  const html = render([record(overrides), current()]);
  expect(html).not.toContain("+10.0%");
  expect(html).not.toMatch(/[-+]\d+\.\d%/);
});

test("unrelated company rows cannot change the result when input order changes", () => {
  const previous = record();
  const unrelated = record({ company: "Other Mining", value_normalized: 200 });
  expect(render([previous, unrelated, current()])).toContain("+10.0%");
  expect(render([unrelated, previous, current()])).toContain("+10.0%");
});

test("still compares ordinary matching records", () => {
  expect(render([record(), current()])).toContain("+10.0%");
});

test("does not calculate a percentage from a zero predecessor", () => {
  expect(render([record({ value_normalized: 0 }), current()])).not.toMatch(/[-+]\d+\.\d%/);
});

test("keeps product forms separate", () => {
  const html = render([record({ product_form: "concentrate", value_normalized: 200 }), record(), current()]);
  expect(html).toContain("+10.0%");
});

test("uses Fresnillo's own Juanicipio predecessor from the dataset snapshot", () => {
  // mining.db at a865658: production IDs 121, 122, and 895 respectively.
  const shared = { mine_id: null, operation: "Juanicipio", commodity: "silver", unit_normalized: "koz", basis: "attributable" };
  const html = render([
    record({ ...shared, company: "Fresnillo", time_period: "Q2 2026", value_normalized: 2219 }),
    record({ ...shared, company: "Fresnillo", value_normalized: 2201 }),
    record({ ...shared, company: "Pan American Silver", value_normalized: 1746 }),
  ], "Fresnillo");
  expect(html).toContain("+0.8%");
  expect(html).not.toContain("+27.1%");
});
