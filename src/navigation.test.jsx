import { afterAll, beforeAll, expect, test } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

let server;
let Link;
let NavBar;
let parseRoute;

beforeAll(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true },
    logLevel: "error",
  });
  ({ Link } = await server.ssrLoadModule("/src/ui.jsx"));
  ({ NavBar } = await server.ssrLoadModule("/src/kit/index.jsx"));
  ({ parseRoute } = await server.ssrLoadModule("/src/router.js"));
});
afterAll(async () => server?.close());

test("kit navigation emits real links under the deployed mining prefix", () => {
  const html = renderToStaticMarkup(<NavBar LinkComponent={Link} items={[
    { href: "/production", label: "Production" },
    { href: "/companies", label: "Companies" },
    { href: "/commodities", label: "Commodities" },
    { href: "/about", label: "About" },
  ]} />);
  for (const path of ["production", "companies", "commodities", "about"]) {
    expect(html).toContain(`href="/mining/${path}"`);
    expect(html).not.toContain(`href="/${path}"`);
  }
  expect(renderToStaticMarkup(<Link to="/mining/company/bhp">BHP</Link>)).toContain('href="/mining/company/bhp"');
  expect(renderToStaticMarkup(<Link href="https://www.kadoa.com/datasets">Datasets</Link>)).toContain('href="https://www.kadoa.com/datasets"');
});

test("the existing mines directory resolves to its own page", () => {
  expect(parseRoute("/mining/mines", "")).toEqual({ name: "mines", query: {} });
});
