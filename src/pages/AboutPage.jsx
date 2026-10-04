import React from "react";
import { AboutPage as KitAboutPage } from "../kit";
import { METHODS } from "../methodology";

const REPO = "https://github.com/kadoa-org/world-mining-monitor";

export default function AboutPage() {
  return (
    <div className="dk-container">
      <KitAboutPage
        lede="Quarterly mine production from the world's largest listed mining companies, taken from their own reports. Free to search, download and reuse."
        sources={[
          { name: "BHP", href: "https://www.bhp.com/investors/financial-results-operational-reviews", what: "Operational reviews" },
          { name: "Rio Tinto", href: "https://www.riotinto.com/en/invest/financial-news-performance/production", what: "Quarterly production reports" },
          { name: "Vale", href: "https://vale.com/announcements-results-presentations-and-reports", what: "Production and sales reports" },
          { name: "Glencore", href: "https://www.glencore.com/publications", what: "Production reports" },
          { name: "Freeport-McMoRan", href: "https://investors.fcx.com/investors/financial-information/sec-filings/default.aspx", what: "Quarterly results and SEC filings" },
          { name: "All companies", href: "/mining/companies", what: "Every company covered, each from its own reports" },
        ]}
        steps={[
          { title: "Monitor", text: "Kadoa checks each company's investor pages for new reports every day." },
          { title: "Extract", text: "It reads each PDF or spreadsheet and pulls out production by mine and commodity." },
          { title: "Normalize", text: "Names, units and fiscal quarters are mapped to one standard and checked." },
          { title: "Link", text: "Each value links back to the page of the report it came from." },
        ]}
        methods={METHODS}
        corrections={
          <>
            Found an error? <a href={`${REPO}/issues`}>Open an issue on GitHub</a>.
          </>
        }
      />
    </div>
  );
}
