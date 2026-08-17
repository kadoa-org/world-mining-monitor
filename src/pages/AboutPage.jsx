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

        <h2 className="text-large font-semibold text-ink pt-4">Verify a value</h2>
        <p>
          Verified rows include the source report, its page or table location, the exact excerpt, and the value, unit,
          and period as reported by the company. Select Verify in a production table to compare the value with the
          archived source file, or download the CSV to use the same source fields directly.
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
