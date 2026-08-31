import { describe, expect, test } from "bun:test";
import {
  aggregateProductionGroup,
  productionSeriesKey,
  quarterlyPivot,
  selectComparableProductionRecords,
} from "./constants";

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

  test("keeps alternate mine reporting bases as separate series", () => {
    const separator = "\u001f";
    const equity = production({
      basis: "equity",
      value_normalized: 66_200,
      source_url: "https://example.com/equity.pdf",
    });
    const consolidated = production({
      basis: "consolidated",
      value_normalized: 74_800,
      source_url: "https://example.com/consolidated.pdf",
    });
    const pivot = quarterlyPivot(
      [equity, consolidated],
      { seriesKey: (record) => `${record.commodity}${separator}${record.basis}` },
    );

    expect(pivot.commodities).toEqual([`iron ore${separator}consolidated`, `iron ore${separator}equity`]);
    expect(pivot.get(`iron ore${separator}equity`, "Q2 2026")).toBe(66_200);
    expect(pivot.get(`iron ore${separator}consolidated`, "Q2 2026")).toBe(74_800);
    expect(pivot.getRecords(`iron ore${separator}equity`, "Q2 2026")).toEqual([equity]);
    expect(pivot.getRecords(`iron ore${separator}consolidated`, "Q1 2026")).toEqual([]);
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

  test("does not reconstruct an unresolved total from components on another basis", () => {
    const aggregate = aggregateProductionGroup([
      production({
        operation: "",
        basis: "consolidated",
        value_normalized: null,
        unit_normalized: null,
      }),
      production({ operation: "Mine A", basis: "attributable", value_normalized: 50 }),
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

  test("selects a plausible disclosed mine total over its product-form breakdown", () => {
    const total = production({ operation: "Escondida", value_normalized: 311.9 });
    const cathode = production({ operation: "Escondida", product_form: "cathode", value_normalized: 66.3 });

    expect(selectComparableProductionRecords([total, cathode])).toEqual([total]);
  });

  test("keeps different product forms separate when no total is disclosed", () => {
    const concentrate = production({ operation: "Escondida", product_form: "concentrate", value_normalized: 76 });
    const refined = production({ operation: "Escondida", product_form: "refined", value_normalized: 20 });
    const selected = selectComparableProductionRecords([concentrate, refined]);
    const pivot = quarterlyPivot(selected, { seriesKey: productionSeriesKey });

    expect(selected).toEqual([concentrate, refined]);
    expect(pivot.commodities).toEqual([
      productionSeriesKey(concentrate),
      productionSeriesKey(refined),
    ]);
    expect(pivot.get(productionSeriesKey(concentrate), "Q2 2026")).toBe(76);
    expect(pivot.get(productionSeriesKey(refined), "Q2 2026")).toBe(20);
  });

  test("does not replace an unresolved disclosed company total with components", () => {
    const total = production({ operation: "", value_normalized: null, unit_normalized: null });
    const component = production({ operation: "Mine A", value_normalized: 50 });

    expect(selectComparableProductionRecords([total, component], { preferCompanyTotals: true })).toEqual([total]);
  });

  test("company totals suppress operation components reported on another basis", () => {
    const consolidated = production({ operation: "", basis: "consolidated", value_normalized: 356.5 });
    const operation = production({ operation: "Morenci", basis: "attributable", value_normalized: 53.1 });

    expect(
      selectComparableProductionRecords([consolidated, operation], { preferCompanyTotals: true }),
    ).toEqual([consolidated]);
  });

  test("only ranks series that have a value in the visible quarter window", () => {
    const current = production({ commodity: "copper", time_period: "Q2 2026", value_normalized: 10 });
    const old = production({ commodity: "gold", time_period: "Q1 2026", value_normalized: 1_000 });
    const pivot = quarterlyPivot([current, old], { maxQuarters: 1, maxCommodities: 1 });

    expect(pivot.quarters).toEqual(["Q2 2026"]);
    expect(pivot.commodities).toEqual(["copper"]);
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
