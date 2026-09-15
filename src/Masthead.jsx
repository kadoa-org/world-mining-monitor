import React from "react";
import { GitHubButton, LiveBadge, NavBar, SiteHeader } from "./kit";
import { Link } from "./ui";

const TABS = [
  { to: "/", label: "Overview", match: "overview" },
  { to: "/production", label: "Production", match: "production" },
  { to: "/companies", label: "Companies", match: "companies" },
  { to: "/commodities", label: "Commodities", match: "commodities" },
  { to: "/about", label: "About", match: "about" },
];

// data-kit chrome: brand bar + tab navigation + data-freshness badge.
export default function Masthead({ route, latestQuarter }) {
  const activeTab = (() => {
    if (route.name === "company" || route.name === "mine" || route.name === "mines") return "companies";
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
