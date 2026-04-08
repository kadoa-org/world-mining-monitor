# World Mining Monitor

**Live demo: [mining.kadoa.com](https://mining.kadoa.com/)**

![World Mining Monitor Demo](https://kadoa.b-cdn.net/mining-pdfs/demo.gif)

Interactive map and open dataset of global mining production data.

For each company we extract mine/operation name, commodity, production volume, unit, normalized value, time period, and a link to the source report PDF.

The hard part is normalization since every region and company reports differently (if not SEC):
- Different units across reports like copper in kt, million pounds, or wet metric tonnes
- Fiscal years don't align (calendar year vs June FY vs September FY)
- Some report on a payable basis, others contained metal, others equity-adjusted
- Product naming is inconsistent ("copper concentrate" vs "cu conc" vs "SX-EW cathode")


## What's in the data?
- production data for **60+** of the largest global mining companies
- **20+ commodities**: copper, gold, zinc, nickel, iron ore, aluminium, coal, silver, PGMs, lithium, manganese, cobalt
- Quarterly production volumes, sales, and guidance
- Normalized units for cross-company comparison
- QoQ production change tracking
- Mine-level geocoded coordinates

## Quick start

```bash
bun install && bun run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Features

- **Interactive map** with clustered mine markers colored by primary commodity
- **Filterable** by commodity, region, time period, and company
- **Table view** with sortable columns, QoQ change indicators, and search
- **CSV export** for the current view or all periods
- **Shareable URLs** -- filters are persisted in URL params

## Data

The dataset is stored as a SQLite database (`public/data/mining.db`) and loaded client-side using [sql.js](https://sql.js.org/) (SQLite compiled to WASM). No backend required.

| File | Description |
|------|-------------|
| `public/data/mining.db` | SQLite database with all production records and mine locations |
| `data/mines-coordinates.json` | Extended mine metadata (company, country, region, commodities) |
| `data/sources.json` | 62 mining companies with IR page URLs |



## Data sources

All data is extracted from publicly available quarterly reports, 10-Q/10-K SEC filings, and production reports published by the mining companies themselves.
We use [kadoa.com](https://kadoa.com) to source and normalize the data at scale. Free trial available if you need it for your own research.

## What's next

- Historical backfill: This dataset currently covers 2025 for most companies. 
- Continuous real-time updates as new quarterly reports come out
- Expand company coverage
- Expand dataset with more KPIs

## License

MIT -- see [LICENSE](LICENSE).

The production data is sourced from public company filings and provided for research and educational purposes.
