import { describe, expect, test } from "bun:test";
import { quarterlyPivot } from "./constants";

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
});
