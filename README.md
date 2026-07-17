# World Mining Monitor

**Live: [mining.kadoa.com](https://mining.kadoa.com/)**

![World Mining Monitor](https://kadoa.b-cdn.net/mining-pdfs/screenshot.png)

Open dataset and interactive map of global mining production. Quarterly mine-level volumes for 60+ of the largest mining companies, extracted from their own quarterly and annual reports. Every number links back to the source PDF.

The hard part is normalization, since every company reports differently:

- Units vary (copper in kt, million pounds, or wet metric tonnes)
- Fiscal years don't align (calendar vs June FY vs September FY)
- Payable vs contained metal vs equity-adjusted bases
- Inconsistent product naming ("copper concentrate" vs "cu conc" vs "SX-EW cathode")

## What's in the data

- 20+ commodities: copper, gold, zinc, nickel, iron ore, aluminium, coal, silver, PGMs, lithium, and more
- Production, sales, and guidance by mine/operation and period, with normalized units and QoQ changes
- Geocoded mine coordinates

| File | Description |
|------|-------------|
| `public/data/mining.db` | SQLite database with all production records and mine locations |
| `data/mines-coordinates.json` | Mine metadata (company, country, region, commodities) |
| `data/sources.json` | 62 mining companies with IR page URLs |

The database loads client-side via [sql.js](https://sql.js.org/), no backend needed. Download CSVs directly from the [production table](https://mining.kadoa.com/production).

## Development

```bash
bun install
bun run dev     # http://localhost:5180
bun run build   # stats + vite + prerendered SEO pages
```

## Sources

All data comes from publicly available quarterly reports, 10-Q/10-K filings, and production reports published by the companies themselves, collected and normalized with [Kadoa](https://kadoa.com). Need the full historical dataset with continuous updates? [Get in touch](https://www.kadoa.com/contact/sales).

## License

MIT, see [LICENSE](LICENSE). Production data is sourced from public company filings and provided for research and educational purposes.
