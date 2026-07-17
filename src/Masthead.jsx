import React, { useEffect, useState } from "react";
import { GitHubButton, LiveBadge, NavBar, SiteHeader } from "./kit";
import { useRoute } from "./router";
import { Link } from "./ui";

const TABS = [
  { to: "/", label: "Overview", match: "overview" },
  { to: "/production", label: "Production", match: "production" },
  { to: "/companies", label: "Companies", match: "companies" },
  { to: "/commodities", label: "Commodities", match: "commodities" },
  { to: "/about", label: "About", match: "about" },
];

// data-kit chrome: brand bar + tab navigation + data-freshness badge.
export default function Masthead() {
  const route = useRoute();
  const [latestQuarter, setLatestQuarter] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/stats.json`)
      .then((r) => r.json())
      .then((s) => setLatestQuarter(s?.latestQuarter ?? null))
      .catch(() => {});
  }, []);

  const activeTab = (() => {
    if (route.name === "company") return "companies";
    if (route.name === "commodity") return "commodities";
    return route.name;
  })();

  return (
    <>
      <SiteHeader
        brand="⛏️ World Mining Monitor"
        LinkComponent={Link}
        brandSuffix={
          <a href="https://www.kadoa.com" target="_blank" rel="noreferrer" className="dk-header-link">
            by Kadoa
          </a>
        }
        right={
          <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {latestQuarter && <LiveBadge>Data through {latestQuarter}</LiveBadge>}
            <GitHubButton repo="kadoa-org/world-mining-monitor" />
          </span>
        }
      />
      <NavBar
        LinkComponent={Link}
        items={TABS.map((t) => ({ href: t.to, label: t.label, active: activeTab === t.match }))}
      />
    </>
  );
}
