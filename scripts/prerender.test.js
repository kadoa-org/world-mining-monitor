import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { buildRoutes, renderRoute } from "./prerender.mjs";

const template = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const actual = {
  company: "BHP", mine_id: "bhp-waio", operation: "WAIO", commodity: "iron ore",
  metric: "production", time_period: "Q2 2026", value_normalized: 66.2,
  unit_normalized: "kt", basis: "consolidated",
};
const guidance = { ...actual, metric: "production_guidance", time_period: "Q2 2028", reported_period: "from Q4 FY28", value_normalized: 70 };
const mines = [{ id: "bhp-waio", name: "WAIO", company: "BHP", country: "Australia", commodities: '["iron ore"]' }];

describe("generated production answers", () => {
  test("company and mine metadata agree with actual production despite future guidance", () => {
    const records = [{ ...actual, time_period: "Q4 2025" }, guidance, actual];
    const peerMines = [1, 2, 3, 4].map((id) => ({ ...mines[0], id: `mine-${id}`, name: `Mine ${id}`, company: "Another operator" }));
    const peers = peerMines.map((mine) => ({ ...actual, mine_id: mine.id, company: mine.company }));
    const routes = buildRoutes([...records, ...peers], [...mines, ...peerMines]);
    for (const path of ["/company/bhp", "/mine/bhp-waio", "/commodity/iron-ore", "/largest-iron-ore-mines"]) {
      const route = routes.find((route) => route.path === path);
      const html = renderRoute(template, route, "<p>Loading interactive data</p>");
      expect(html).toContain("Q2 2026");
      expect(html).not.toContain("Q2 2028");
      expect(html).toContain(`href="https://www.kadoa.com/mining${path}"`);
      expect(html).not.toContain("seo-shell");
    }
    expect(records).toHaveLength(3);
    expect(guidance.metric).toBe("production_guidance");
    expect(guidance.reported_period).toBe("from Q4 FY28");
  });

  test("a company with guidance only has no invented latest production quarter", () => {
    const route = buildRoutes([guidance], []).find((route) => route.path === "/company/bhp");
    expect(route.description).not.toContain("latest");
    expect(route.body).not.toContain("Latest reported quarterly production");
    expect(route.body).not.toContain("<table>");
  });
});
