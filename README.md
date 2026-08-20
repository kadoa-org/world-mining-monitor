# World Mining Monitor

An open dataset of global mine-level production, extracted from company reports and normalized for comparison.

**[Open the live app](https://mining.kadoa.com/)** · **[Browse the production data](https://mining.kadoa.com/production)**

![World Mining Monitor](assets/mining-demo.jpg)

## Why I built this

I follow commodities and could not find an open dataset covering global mining production. I wanted to test whether LLMs make it practical to build one from unstructured company filings and reports—and whether the result could be useful for systematic research.

The underlying information is public, but it is scattered across inconsistent websites, PDFs, and spreadsheets. In conversations with central data teams at hedge funds and with data providers, the same challenge kept coming up: extracting the data once is manageable; keeping it accurate, traceable, and up to date is much harder.

For each company, the dataset aims to answer:

- What was produced, and how much?
- Which mine or operation produced it?
- Which reporting period does the figure cover?
- Which unit and reporting basis were used?
- Where exactly did the figure appear in the source report?

## Why normalization is difficult

Mining companies do not report production in a common format, especially outside standardized regulatory filings.

- **Units vary.** Copper may be reported in kilotonnes, million pounds, or wet metric tonnes.
- **Fiscal calendars differ.** Companies use calendar years, June year-ends, September year-ends, and other conventions.
- **Reporting bases differ.** A figure may represent payable metal, contained metal, consolidated production, or an equity-adjusted share.
- **Product names are inconsistent.** “Copper concentrate,” “Cu conc,” and “SX-EW cathode” describe related but non-equivalent products.
- **Context is easy to miss.** Ownership percentages and reporting methods are often buried in headings, footnotes, or surrounding text.
- **Sources change.** Investor-relations websites and report layouts evolve over time.

Normalizing the unit alone is not enough. Product form and reporting basis must remain explicit so that unlike figures are not silently combined.

## Pipeline approach

The traditional approach would be to build and maintain a bespoke ETL pipeline for every company. This project tests a different model: LLMs generate, monitor, and repair deterministic extraction and transformation code.

The deterministic code—not free-form model output—runs the recurring pipeline. When a website or report layout changes, an agent investigates the failure, updates the relevant code, and runs its tests. If it cannot resolve the problem safely, it escalates the case for manual review.

The process is roughly:

1. **Discover reports.** Scraping code monitors company websites and captures new quarterly and annual reports.
2. **Extract reported facts.** Conventional PDF parsing is combined with Gemini 3.7 Flash for documents that require layout or semantic interpretation.
3. **Preserve evidence.** Each extracted value retains its source document and, where available, its page, section, table, row, column, and exact excerpt.
4. **Normalize conservatively.** Transformations use the least flexible method that works:
   1. Parse the value as reported.
   2. Apply deterministic code, such as a unit converter or regex-based mapper.
   3. Use an LLM only when a deterministic mapping is not practical.
5. **Validate before publishing.** Records must pass schema, unit, range, and consistency checks before they enter the dataset.

The working rule is simple: treat every extracted value as wrong until it passes validation—guilty until proven innocent.

## What is in the data

Each production record can include:

- Company and mine or operation
- Commodity and product form
- Reported value and unit
- Normalized value and unit
- Fiscal and calendar period
- Reporting basis
- Source document and extraction timestamp
- Page, section, table, row, column, and source excerpt

The current dataset covers 60+ mining companies and 20+ commodities, including copper, gold, zinc, nickel, iron ore, aluminium, coal, silver, PGMs, and lithium.

| File | Description |
| --- | --- |
| [`public/data/mining.db`](public/data/mining.db) | SQLite database containing production records, source evidence, and mine locations |
| [`data/mines-coordinates.json`](data/mines-coordinates.json) | Mine metadata, including company, country, region, coordinates, and commodities |
| [`data/sources.json`](data/sources.json) | Company investor-relations sources monitored for reports |

The application loads the SQLite database in the browser through [sql.js](https://sql.js.org/), so it does not require a backend. Filtered data can also be downloaded as CSV from the [production table](https://mining.kadoa.com/production).

## Open-source status

The dataset and application are open source. The extraction and pipeline-management code will follow.

I would be particularly interested in feedback on where this approach is most likely to fail—especially around point-in-time correctness, restatements, and silent changes in reporting basis.

## Development

```bash
bun install
bun run dev     # http://localhost:5180
bun run build   # stats + Vite + prerendered pages
```

## Sources and limitations

The data comes from publicly available quarterly reports, annual reports, regulatory filings, and production reports published by the companies themselves. Coverage follows what each company discloses: some report mine-level figures, while others publish only consolidated totals; some report quarterly, while others report half-yearly.

Normalization improves comparability but does not make different product forms or reporting bases equivalent. Every material comparison should be checked against the linked source evidence.

## License

The code is available under the [MIT License](LICENSE). Production data is sourced from public company reports and is provided for research and educational use.
