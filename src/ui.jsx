// Reusable primitives shared by all pages. Linear.app sizing: 18px root,
// 0.9375rem body — same conventions as the sibling dataset sites.
import React from "react";
import { Tag as DkTag } from "./kit";
import { navigate, withBase } from "./router";

export const TABLE_HEADER_CLS = "text-mini font-medium text-ink_muted";
export const TABLE_ZEBRA_CLS = "[&>*:nth-child(even)]:bg-muted/30";

// Sort state is a column key, prefixed with "-" for descending. Right-aligned
// (numeric) columns sort descending on first click; text columns ascending.
export function SortHeader({ label, sortKey, sort, setSort, align = "left" }) {
  const active = sort === sortKey || sort === `-${sortKey}`;
  const desc = sort === `-${sortKey}`;
  const justify = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
  const onClick = () => {
    if (!active) setSort(align === "right" ? `-${sortKey}` : sortKey);
    else setSort(desc ? sortKey : `-${sortKey}`);
  };
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 cursor-pointer hover:text-ink tabular-nums text-${align} ${justify} ${active ? "text-ink" : ""}`}
    >
      <span>{label}</span>
      {active ? (
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className={`text-ink shrink-0 ${desc ? "" : "rotate-180"}`}
          aria-hidden="true"
        >
          <path d="M2 4 L5 7 L8 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="8" height="10" viewBox="0 0 8 10" className="text-ink_faint shrink-0" aria-hidden="true">
          <path d="M2 4 L4 2 L6 4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M2 6 L4 8 L6 6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

export function fmtInt(n) {
  if (n == null) return "--";
  return Number(n).toLocaleString("en-US");
}

export function fmtCompact(n) {
  if (n == null) return "--";
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

// Production values arrive normalized to kt (or koz for precious metals).
// Sub-1 values are real (e.g. 0.4 kt of molybdenum), so keep precision there.
export function fmtValue(v) {
  if (v == null) return "--";
  if (typeof v === "string") return v;
  if (Math.abs(v) >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 1 });
  if (Math.abs(v) >= 1) return v.toFixed(1);
  return v.toFixed(3);
}

export function Pill({ tone = "neutral", children }) {
  const map = {
    neutral: "grey",
    blue: "blue",
    violet: "purple",
    amber: "orange",
    green: "green",
    red: "red",
    yellow: "yellow",
    teal: "teal",
  };
  return <DkTag tone={map[tone] || "grey"}>{children}</DkTag>;
}

export function Link({ to, className = "", children, onClick, ...rest }) {
  return (
    <a
      href={withBase(to)}
      className={`dk-link ${className}`}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        onClick?.(e);
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

export function Card({ children, className = "" }) {
  return <div className={`border border-[#b1b4b6] bg-white ${className}`}>{children}</div>;
}

export function SectionHeader({ title, subtitle, right }) {
  return (
    <div className="dk-section-head">
      <div style={{ minWidth: 0 }}>
        <h2>{title}</h2>
        {subtitle && <p className="dk-hint">{subtitle}</p>}
      </div>
      {right && <div style={{ flexShrink: 0, whiteSpace: "nowrap" }}>{right}</div>}
    </div>
  );
}

export function PropertyLabel({ children, className = "" }) {
  return <div className={`text-mini text-ink_muted ${className}`}>{children}</div>;
}

// Responsive stat grid: 2-up on mobile, 4-up on desktop, with clean dividers
// on both axes and non-wrapping values.
export function StatGrid({ items, cols = 4 }) {
  const desktopCols = cols === 5 ? "sm:grid-cols-5" : "sm:grid-cols-4";
  return (
    <div className={`grid grid-cols-2 ${desktopCols} bg-white border border-[#b1b4b6] overflow-hidden`}>
      {items.map((it, i) => {
        const cls = [
          "px-4 sm:px-5 py-4 min-w-0 border-stroke",
          i % 2 !== 0 ? "border-l" : "",
          i >= 2 ? "border-t" : "",
          "sm:border-t-0",
          i % cols === 0 ? "sm:border-l-0" : "sm:border-l",
        ].join(" ");
        return (
          <div key={it.label} className={cls}>
            <PropertyLabel className="mb-1.5">{it.label}</PropertyLabel>
            <div className="text-regular sm:text-large font-semibold text-ink tabular-nums truncate">{it.value}</div>
            {it.sub && <div className="text-mini text-ink_muted mt-0.5 truncate">{it.sub}</div>}
          </div>
        );
      })}
    </div>
  );
}

// slugify lives in constants.js (plain JS) so scripts/prerender.mjs can share it.
export { slugify } from "./constants";

// ── CSV export ───────────────────────────────────────────────────────────────
// The dataset is open, so table views offer a download of exactly what's shown.
function csvCell(value) {
  if (value == null) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function rowsToCsv(columns, rows) {
  const header = columns.map(([, label]) => label).join(",");
  const body = rows.map((r) => columns.map(([key]) => csvCell(r[key])).join(","));
  return [header, ...body].join("\r\n");
}

export function downloadCsv(filename, csv) {
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function DownloadCsvButton({ onClick, count }) {
  return (
    <button type="button" onClick={onClick} className="dk-btn">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>Download CSV{count != null ? ` · ${fmtInt(count)}` : ""}</span>
    </button>
  );
}

// SPA row link: real <a href> (cmd/ctrl-click works) that routes client-side
// on plain clicks. Used for primary cells inside kit DataTables.
export function RowLinkNav({ to, children }) {
  return (
    <a
      href={withBase(to)}
      className="no-underline"
      style={{ color: "var(--dk-ink)" }}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
