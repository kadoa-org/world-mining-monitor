// Tiny path + query router using pushState / popstate.
// Routes are app-relative ("/company/x"); the deploy prefix
// (import.meta.env.BASE_URL, "/" today on mining.kadoa.com, "/mining/" after
// the subfolder cutover) is stripped on parse and added on navigation/href
// via withBase().
import { useCallback, useEffect, useState } from "react";
import { applyRouteMetadata, loadRouteMetadata, readDocumentMetadata } from "./navigationMetadata";

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

export function withBase(path) {
  if (!BASE_PATH || !path.startsWith("/") || path.startsWith("//")) return path;
  if (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`)) return path;
  return `${BASE_PATH}${path}`;
}

function stripBase(pathname) {
  if (BASE_PATH && (pathname === BASE_PATH || pathname.startsWith(`${BASE_PATH}/`))) {
    return pathname.slice(BASE_PATH.length) || "/";
  }
  return pathname;
}

export function parseRoute(pathname = window.location.pathname, search = window.location.search) {
  const segments = stripBase(pathname).replace(/^\//, "").split("/").filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(search));
  if (segments.length === 0) return { name: "overview", query };
  if (segments[0] === "company" && segments[1])
    return { name: "company", slug: decodeURIComponent(segments[1]), query };
  if (segments[0] === "mine" && segments[1]) return { name: "mine", slug: decodeURIComponent(segments[1]), query };
  if (segments[0] === "commodity" && segments[1])
    return { name: "commodity", slug: decodeURIComponent(segments[1]), query };
  if (segments[0] === "companies") return { name: "companies", query };
  if (segments[0] === "mines") return { name: "mines", query };
  if (segments[0] === "commodities") return { name: "commodities", query };
  if (segments[0] === "production") return { name: "production", query };
  if (segments[0] === "about") return { name: "about", query };
  const largest = segments[0] && segments.length === 1 ? segments[0].match(/^largest-([a-z0-9-]+)-mines$/) : null;
  if (largest) return { name: "largestMines", slug: largest[1], query };
  return { name: "overview", query };
}

export function useRoute(initialRoute) {
  const [route, setRoute] = useState(() => initialRoute ?? parseRoute());
  useEffect(() => {
    // A document reload can publish newer metadata than its saved history entry.
    window.history.replaceState({ ...window.history.state, miningPageMetadata: readDocumentMetadata() }, "");
    const onPop = (event) => {
      if (event.state?.miningPageMetadata) applyRouteMetadata(event.state.miningPageMetadata);
      setRoute(parseRoute());
    };
    setRoute(parseRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return route;
}

let navigationId = 0;

export async function navigate(pathOrUrl, { replace = false } = {}) {
  const target = withBase(pathOrUrl);
  const current = window.location.pathname + window.location.search;
  if (target === current) return;
  const id = ++navigationId;
  const pathname = new URL(target, window.location.origin).pathname;
  let metadata = window.history.state?.miningPageMetadata;
  if (pathname !== window.location.pathname) {
    try {
      metadata = await loadRouteMetadata(pathname);
      if (id !== navigationId || current !== window.location.pathname + window.location.search) return;
      applyRouteMetadata(metadata);
    } catch (error) {
      if (id !== navigationId || current !== window.location.pathname + window.location.search) return;
      console.error("Mining page metadata unavailable; opening the published page", error);
      if (replace) window.location.replace(target);
      else window.location.assign(target);
      return;
    }
  }
  const state = { ...window.history.state, miningPageMetadata: metadata };
  if (replace) {
    window.history.replaceState(state, "", target);
  } else {
    window.history.pushState(state, "", target);
  }
  window.dispatchEvent(new PopStateEvent("popstate"));
}
