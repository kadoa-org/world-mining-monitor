// Reusable primitives shared by all pages. Linear.app sizing: 18px root,
// 0.9375rem body — same conventions as the sibling dataset sites.
import React, { useEffect, useId, useRef } from "react";
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
  if (typeof v === "string") return v.replace(/(\d)\s*[-–—]\s*(?=\d)/g, "$1–");
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

export function SectionHeader({ title, subtitle, right, className = "" }) {
  return (
    <div className={`dk-section-head ${className}`}>
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

export function EvidenceLink({ record, onOpen, children = "Source", ariaLabel, className = "" }) {
  const verification = record.verification;
  const href = record.source_url;

  if (verification && onOpen) {
    return (
      <button
        type="button"
        className={`dk-link cursor-pointer ${className}`}
        onClick={() => onOpen(record)}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
      >
        {children}
      </button>
    );
  }

  if (!href) return <span className="text-ink_faint">--</span>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`dk-link ${className}`}
      aria-label={ariaLabel || "Source (opens in new tab)"}
    >
      {children}
    </a>
  );
}

function EvidenceField({ label, children, prominent = false, className = "" }) {
  if (children == null || children === "") return null;
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-mini text-ink_muted mb-1">{label}</dt>
      <dd className={`text-small text-ink break-words ${prominent ? "font-semibold tabular-nums" : ""}`}>{children}</dd>
    </div>
  );
}

function evidenceLocation(verification) {
  const isSpreadsheet = /\.xlsx?(?:$|[?#])/i.test(verification?.documentName || verification?.sourceUrl || "");
  return [
    verification?.page != null ? { label: "Page", value: verification.page } : null,
    verification?.section ? { label: isSpreadsheet ? "Worksheet" : "Section", value: verification.section } : null,
    verification?.table ? { label: "Table", value: verification.table } : null,
    verification?.row ? { label: "Row", value: verification.row } : null,
    verification?.column ? { label: "Column", value: verification.column } : null,
  ].filter(Boolean);
}

function spreadsheetExcerpt(excerpt) {
  if (typeof excerpt !== "string") return null;
  const cells = excerpt.split(/\s+\|\s+/).map((part) => {
    const match = part.match(/^\s*([A-Z]{1,3}\d+)\s*=\s*(.*?)\s*$/);
    return match ? { reference: match[1], value: match[2] } : null;
  });
  return cells.length > 1 && cells.every(Boolean) ? cells : null;
}

function EvidenceLocation({ items }) {
  if (!items.length) return null;
  return (
    <dl className="mt-3 border-y border-stroke divide-y divide-stroke_soft">
      {items.map(({ label, value }) => (
        <div key={label} className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 py-2.5">
          <dt className="text-mini font-medium text-ink_muted">{label}</dt>
          <dd className="text-small text-ink break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function EvidenceExcerpt({ excerpt }) {
  const cells = spreadsheetExcerpt(excerpt);
  if (cells) {
    return (
      <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(84px,1fr))] gap-px border border-stroke bg-stroke">
        {cells.map(({ reference, value }) => (
          <div key={reference} className="min-w-0 px-3 py-2.5 bg-white">
            <div className="font-mono text-mini font-medium text-ink_muted">{reference}</div>
            <div className="mt-1 font-mono text-small text-ink break-words">{value}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <blockquote className="mt-3 border-l-4 border-[#b1b4b6] pl-4 py-0.5 text-small leading-relaxed text-ink">
      <p>{excerpt}</p>
    </blockquote>
  );
}

export function EvidenceDialog({ record, onClose }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  if (!record?.verification) return null;

  const verification = record.verification;
  const href = verification.sourceUrl;
  const sourceAction = /\.pdf(?:$|[?#])/i.test(href || "") ? "Open source PDF" : "Open source file";
  const reportedValue = [verification.reportedValue, verification.reportedUnit].filter(Boolean).join(" ");
  const location = evidenceLocation(verification);
  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="w-[min(640px,calc(100vw-32px))] max-h-[calc(100vh-32px)] p-0 border border-[#b1b4b6] rounded-lg bg-white text-ink shadow-xl backdrop:bg-black/25"
    >
      <div className="max-h-[calc(100vh-34px)] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between gap-4 px-5 py-4 border-b border-stroke bg-white">
          <div>
            <h2 id={titleId} className="text-large font-semibold">Source details</h2>
            <p id={descriptionId} className="text-mini text-ink_muted mt-0.5">
              {record.company} · {record.operation || "Company total"} · {record.time_period}
            </p>
          </div>
          <button type="button" onClick={close} className="text-ink_muted hover:text-ink hover:bg-hover p-2 -mr-2 rounded" aria-label="Close source details">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6">
          <section aria-label="Reported data">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <EvidenceField label="Reported value" prominent>{reportedValue}</EvidenceField>
              <EvidenceField label="Reported period">{verification.reportedPeriod}</EvidenceField>
              <EvidenceField label="Document" className="sm:col-span-2">{verification.documentName}</EvidenceField>
            </dl>
          </section>

          {location.length ? (
            <section aria-labelledby={`${titleId}-location`}>
              <h3 id={`${titleId}-location`} className="text-small font-semibold text-ink">Location in source</h3>
              <p className="mt-0.5 text-mini text-ink_muted">Follow these references to find the reported value.</p>
              <EvidenceLocation items={location} />
            </section>
          ) : null}

          <section aria-labelledby={`${titleId}-excerpt`}>
            <h3 id={`${titleId}-excerpt`} className="text-small font-semibold text-ink">Source excerpt</h3>
            <p className="mt-0.5 text-mini text-ink_muted">Exact text or cells used to verify the reported value.</p>
            <EvidenceExcerpt excerpt={verification.excerpt} />
          </section>
        </div>

        <div className="sticky bottom-0 flex items-center justify-start px-5 py-3 border-t border-stroke bg-white">
          <a href={href} target="_blank" rel="noopener noreferrer" className="dk-btn">
            {sourceAction}
          </a>
        </div>
      </div>
    </dialog>
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

// Quarterly series pivot table (quarters newest-first x commodities). The
// SPA twin of the crawler-visible table the prerenderer emits.
export function QuarterlySeriesTable({ pivot, labelFor, colorFor, renderValue }) {
  if (!pivot.quarters.length) return null;
  return (
    <div className="overflow-x-auto">
      <div
        className="min-w-[520px]"
        style={renderValue ? { minWidth: 110 + pivot.commodities.length * 170 } : undefined}
      >
        <div
          className="grid gap-3 px-4 text-mini font-medium text-ink_muted h-9 items-center border-b border-stroke"
          style={{ gridTemplateColumns: `110px repeat(${pivot.commodities.length}, 1fr)` }}
        >
          <span>Quarter</span>
          {pivot.commodities.map((c) => (
            <span key={c} className="flex items-center gap-1.5 justify-end text-right truncate">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colorFor(c) }} />
              {labelFor(c)} ({pivot.unit[c]})
            </span>
          ))}
        </div>
        <div className="text-small [&>*:nth-child(even)]:bg-muted/30">
          {pivot.quarters.map((q) => (
            <div
              key={q}
              className="grid gap-3 px-4 h-10 items-center border-b border-stroke_soft last:border-b-0"
              style={{ gridTemplateColumns: `110px repeat(${pivot.commodities.length}, 1fr)` }}
            >
              <span className="tabular-nums">{q}</span>
              {pivot.commodities.map((c) => {
                const value = pivot.get(c, q);
                const formattedValue = value != null ? fmtValue(value) : "--";
                return (
                  <span key={c} className="flex items-center justify-end text-right tabular-nums">
                    {value != null && renderValue ? renderValue(c, q, formattedValue) : formattedValue}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
