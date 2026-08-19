import { describe, expect, test } from "bun:test";
import { aggregateProductionGroup, quarterlyPivot } from "./constants";

describe("quarterlyPivot", () => {
  test("distinguishes missing normalization from a reported zero", () => {
    const pivot = quarterlyPivot([
      {
        commodity: "ilmenite",
        metric: "production",
        time_period: "Q1 2026",
        value: 121,
        unit: "kt",
        value_normalized: null,
        unit_normalized: null,
      },
      {
        commodity: "zircon",
        metric: "production",
        time_period: "Q1 2026",
        value: 0,
        unit: "kt",
        value_normalized: 0,
        unit_normalized: "kt",
      },
    ]);

    expect(pivot.commodities).toEqual(["zircon"]);
    expect(pivot.get("ilmenite", "Q1 2026")).toBeNull();
    expect(pivot.get("zircon", "Q1 2026")).toBe(0);
  });

  test("uses a disclosed company total instead of adding its component operations", () => {
    const pivot = quarterlyPivot(
      [
        production({ operation: "", value_normalized: 87.1 }),
        production({ operation: "Pilbara", value_normalized: 79.9 }),
        production({ operation: "IOC", value_normalized: 7.2 }),
      ],
      { preferCompanyTotals: true },
    );

    expect(pivot.get("iron ore", "Q2 2026")).toBe(87.1);
  });

  test("prefers a consolidated total over alternate company reporting bases", () => {
    const aggregate = aggregateProductionGroup([
      production({ operation: "", basis: "consolidated", value_normalized: 87.1 }),
      production({ operation: "", basis: "attributable", value_normalized: null, unit_normalized: null }),
      production({ operation: "", basis: "equity", value_normalized: 72.9 }),
    ]);

    expect(aggregate?.value).toBe(87.1);
  });

  test("uses an unqualified total instead of adding a qualified by-product series", () => {
    const aggregate = aggregateProductionGroup([
      production({ operation: "", product_form: null, value_normalized: 84.3 }),
      production({ operation: "", product_form: "pellets", value_normalized: 7.3 }),
    ]);

    expect(aggregate?.value).toBe(84.3);
  });

  test("rejects a competing total that is smaller than a disclosed component", () => {
    const aggregate = aggregateProductionGroup([
      production({ operation: "", basis: "consolidated", value_normalized: 0.191 }),
      production({ operation: "", basis: "contained", value_normalized: 79.934 }),
      production({ operation: "Candelaria", basis: "contained", value_normalized: 30.808 }),
      production({ operation: "Caserones", basis: "contained", value_normalized: 38.552 }),
    ]);

    expect(aggregate?.value).toBe(79.934);
  });

  test("does not present one qualified form as the whole commodity", () => {
    const aggregate = aggregateProductionGroup([
      production({ operation: "", product_form: "concentrate", value_normalized: 30 }),
      production({ operation: "Smelter", product_form: "cathode", value_normalized: 36 }),
    ]);

    expect(aggregate).toBeNull();
  });

  test("does not fall back to components when a disclosed total cannot be normalized", () => {
    const aggregate = aggregateProductionGroup([
      production({ operation: "", value_normalized: null, unit_normalized: null }),
      production({ operation: "Mine A", value_normalized: 50 }),
    ]);

    expect(aggregate).toBeNull();
  });

  test("refuses to sum different product forms or reporting bases", () => {
    expect(
      aggregateProductionGroup([
        production({ operation: "Mine A", product_form: "ore", value_normalized: 100 }),
        production({ operation: "Smelter A", product_form: "metal", value_normalized: 10 }),
      ]),
    ).toBeNull();
    expect(
      aggregateProductionGroup([
        production({ operation: "Mine A", basis: "consolidated", value_normalized: 100 }),
        production({ operation: "Mine B", basis: "attributable", value_normalized: 10 }),
      ]),
    ).toBeNull();
  });

  test("uses contained nickel instead of physical ore or intermediate tonnage", () => {
    const aggregate = aggregateProductionGroup([
      production({ commodity: "nickel", operation: "Mine A", product_form: "nickel content", value_normalized: 8 }),
      production({ commodity: "nickel", operation: "Mine B", product_form: "nickel content", value_normalized: 12 }),
      production({ commodity: "nickel", operation: "Plant", product_form: "nickel pig iron", value_normalized: 200 }),
    ]);

    expect(aggregate?.value).toBe(20);
  });
});

function production(overrides = {}) {
  return {
    company: "Example Mining",
    operation: "Mine A",
    commodity: "iron ore",
    product_form: null,
    metric: "production",
    time_period: "Q2 2026",
    value_normalized: 10,
    unit_normalized: "kt",
    basis: "consolidated",
    ...overrides,
  };
}
