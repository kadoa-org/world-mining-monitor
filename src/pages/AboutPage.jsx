import React from "react";
import { Card, Link } from "../ui";

export default function AboutPage() {
  return (
    <div className="max-w-[820px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <h1 className="text-title sm:text-display font-semibold text-ink mb-4">About the data</h1>

      <div className="space-y-4 text-regular text-ink_secondary leading-relaxed">
        <p>
          The World Mining Monitor tracks mine-level production volumes for 60+ of the world's largest publicly listed
          mining companies. Every number is extracted from the company's own quarterly or annual report — the primary
          source — and links back to the exact PDF it came from.
        </p>

        <h2 className="text-large font-semibold text-ink pt-4">How it works</h2>
        <p>
          Company investor-relations pages are monitored for new quarterly and annual reports using{" "}
          <a href="https://www.kadoa.com" target="_blank" rel="noreferrer" className="dk-link">
            Kadoa
          </a>
          . New report PDFs are parsed with an LLM extraction pipeline, then normalized: commodity names are mapped to a
          canonical list, units converted for comparison (kt for base metals, koz for precious metals), fiscal quarters
          mapped to calendar quarters, and values validated against range and consistency checks.
        </p>

        <h2 className="text-large font-semibold text-ink pt-4">What's covered</h2>
        <p>
          Production and sales volumes by mine or operation, commodity, and period. Coverage follows what companies
          disclose: some report mine-by-mine, others only consolidated totals; some quarterly, others half-yearly.
          Reporting bases differ too (consolidated vs. attributable share of joint ventures) — the <em>basis</em> column
          preserves this, so compare with care.
        </p>

        <h2 className="text-large font-semibold text-ink pt-4">Caveats</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>This is disclosed production from covered companies — not a complete census of global mining output.</li>
          <li>Values are extracted from PDFs by an LLM and validated automatically; extraction errors are possible.</li>
          <li>Company rankings compare only companies in the covered set that disclose mine-level volumes.</li>
          <li>Historic coverage varies by company; some series have gaps where reports were not machine-readable.</li>
        </ul>

        <h2 className="text-large font-semibold text-ink pt-4">Use the data</h2>
        <p>
          The dataset is open under CC BY 4.0. Download filtered CSVs from the{" "}
          <Link to="/production">production table</Link>, grab the full SQLite database from{" "}
          <a
            href="https://github.com/kadoa-org/world-mining-monitor"
            target="_blank"
            rel="noreferrer"
            className="dk-link"
          >
            GitHub
          </a>
          , or{" "}
          <a href="https://www.kadoa.com/contact/sales" target="_blank" rel="noreferrer" className="dk-link">
            get in touch
          </a>{" "}
          for the full historical dataset with continuous updates.
        </p>
      </div>

      <Card className="mt-8 p-4">
        <p className="text-small text-ink_muted">
          Built and maintained by{" "}
          <a href="https://www.kadoa.com" target="_blank" rel="noreferrer" className="dk-link">
            Kadoa
          </a>
          , the platform for turning unstructured web data into reliable pipelines. The same stack powers our other open
          datasets — quant jobs, layoffs, congress trades, and the POTUS tracker — linked in the footer.
        </p>
      </Card>
    </div>
  );
}
