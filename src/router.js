// Tiny path + query router using pushState / popstate.
// Routes are app-relative ("/company/x"); the deploy prefix
// (import.meta.env.BASE_URL, "/" today on mining.kadoa.com, "/mining/" after
// the subfolder cutover) is stripped on parse and added on navigation/href
// via withBase().
import { useCallback, useEffect, useState } from "react";

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

export function withBase(path) {
  if (!BASE_PATH || !path.startsWith("/")) return path;
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
  if (segments[0] === "commodity" && segments[1])
    return { name: "commodity", slug: decodeURIComponent(segments[1]), query };
  if (segments[0] === "companies") return { name: "companies", query };
  if (segments[0] === "commodities") return { name: "commodities", query };
  if (segments[0] === "production") return { name: "production", query };
  if (segments[0] === "about") return { name: "about", query };
  return { name: "overview", query };
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute());
  useEffect(() => {
    const onPop = () => setRoute(parseRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return route;
}

export function navigate(pathOrUrl, { replace = false } = {}) {
  const target = withBase(pathOrUrl);
  const current = window.location.pathname + window.location.search;
  if (target === current) return;
  if (replace) {
    window.history.replaceState({}, "", target);
  } else {
    window.history.pushState({}, "", target);
  }
  window.dispatchEvent(new PopStateEvent("popstate"));
}
