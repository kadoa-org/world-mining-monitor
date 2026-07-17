import React, { useEffect } from "react";
import { useMiningData } from "./data";
import { SiteFooter } from "./kit";
import Masthead from "./Masthead";
import AboutPage from "./pages/AboutPage";
import CommoditiesPage from "./pages/CommoditiesPage";
import CommodityPage from "./pages/CommodityPage";
import CompaniesPage from "./pages/CompaniesPage";
import CompanyPage from "./pages/CompanyPage";
import OverviewPage from "./pages/OverviewPage";
import ProductionPage from "./pages/ProductionPage";
import { useRoute } from "./router";
import { useDatabase } from "./useDatabase";

// Every route except About renders from the SQLite dataset.
const ROUTES_NEEDING_DB = new Set(["overview", "production", "companies", "commodities", "company", "commodity"]);

function LoadingScreen() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-16">
      <div className="h-4 w-40 bg-muted rounded animate-pulse mb-4" />
      <div className="h-10 w-3/4 bg-muted rounded animate-pulse mb-3" />
      <div className="h-4 w-2/3 bg-muted rounded animate-pulse mb-8" />
      <div className="border border-[#b1b4b6] bg-white overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-stroke">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-4 py-4 sm:px-5">
              <div className="h-3 w-16 max-w-full bg-muted rounded animate-pulse mb-3" />
              <div className="h-6 w-20 max-w-full bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-8 h-6 w-64 bg-muted rounded animate-pulse" />
      <div className="mt-4 border border-[#b1b4b6] bg-white p-4 animate-pulse h-[520px]" />
    </div>
  );
}

function ErrorScreen({ error }) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-large font-semibold text-ink mb-2">Could not load the dataset</h1>
        <p className="text-small text-ink_muted">{String(error?.message ?? error)}</p>
      </div>
    </div>
  );
}

export default function App() {
  const route = useRoute();
  const needsDb = ROUTES_NEEDING_DB.has(route.name);
  const { db, loading, error } = useDatabase(needsDb);
  const data = useMiningData(db);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.name, route.slug]);

  // Self-referencing canonical on every route: prerendered pages carry the
  // right canonical statically, but client-rendered long-tail routes inherit
  // index.html's homepage canonical unless re-pointed here.
  useEffect(() => {
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = `${window.location.origin}${window.location.pathname}`;
  }, [route.name, route.slug]);

  if (needsDb && error) return <ErrorScreen error={error} />;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Masthead />
      {needsDb && (loading || !data) ? (
        <LoadingScreen />
      ) : (
        <>
          {route.name === "overview" && <OverviewPage data={data} />}
          {route.name === "production" && <ProductionPage data={data} initialQuery={route.query} />}
          {route.name === "companies" && <CompaniesPage data={data} />}
          {route.name === "commodities" && <CommoditiesPage data={data} />}
          {route.name === "company" && <CompanyPage data={data} slug={route.slug} />}
          {route.name === "commodity" && <CommodityPage data={data} slug={route.slug} />}
          {route.name === "about" && <AboutPage />}
        </>
      )}
      <SiteFooter current="mining" />
    </div>
  );
}
