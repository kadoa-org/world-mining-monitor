import React from "react";
import { Card, Link } from "../ui";

export default function AboutPage() {
  return (
    <div className="max-w-[820px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <h1 className="text-title sm:text-display font-semibold text-ink mb-4">About the data</h1>

      <div className="space-y-4 text-regular text-ink_secondary leading-relaxed">
        <p>
          The World Mining Monitor tracks mine-level production volumes for the world's largest publicly listed
          mining companies. The data is extracted from each company's quarterly and annual reports. Newly extracted
          facts include the original source value and its location in the report.
        </p>

        <h2 className="text-large font-semibold text-ink pt-4">How it works</h2>
        <p>
          Company investor-relations pages are monitored for new quarterly and annual reports using{" "}
          <a href="https://www.kadoa.com" target="_blank" rel="noreferrer" className="dk-link">
            Kadoa
          </a>
          . New PDF and spreadsheet reports are parsed with an extraction pipeline, then normalized: commodity names are
          mapped to a canonical list, units converted for comparison (kt for base metals, koz for precious metals), fiscal
          quarters mapped to calendar quarters, and values validated against range and consistency checks.
        </p>

        <h2 className="text-large font-semibold text-ink pt-4">Evidence and lineage</h2>
        <p>
          Source evidence records the report, page or table location, original text, reported value, unit, and period.
          The pipeline also records normalization and fiscal-period transformations without changing the original
          observation. Open an evidence link in a production table or download the CSV to inspect these fields.
        </p>

        <h2 className="text-large font-semibold text-ink pt-4">What's covered</h2>
        <p>
          Production and sales volumes by mine or operation, commodity, and period. Coverage follows what companies
          disclose: some report mine-by-mine, others only consolidated totals; some quarterly, others half-yearly.
          Reporting bases differ too (consolidated vs. attributable share of joint ventures).
        </p>

        <h2 className="text-large font-semibold text-ink pt-4">Use the data</h2>
        <p>
          <a href="https://www.kadoa.com/contact/sales" target="_blank" rel="noreferrer" className="dk-link">
            Get in touch
          </a>{" "}
          for the full historical dataset with continuous updates.
        </p>
      </div>
    </div>
  );
}
