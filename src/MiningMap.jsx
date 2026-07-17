import L from "leaflet";
import React, { useMemo } from "react";
import { CircleMarker, Tooltip as LeafletTooltip, MapContainer, Popup, TileLayer } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import { BUBBLE_MAX, BUBBLE_MIN, COMMODITY_COLORS } from "./constants";
import { navigate } from "./router";
import { slugify } from "./ui";

function getBubbleRadius(totalKt, logMax) {
  if (!totalKt || totalKt <= 0) return BUBBLE_MIN;
  // Log scale relative to the largest mine in view — spreads the range well
  // across iron ore (100k kt) to gold (10 koz).
  const normalized = Math.log10(totalKt + 1) / logMax;
  return BUBBLE_MIN + normalized * (BUBBLE_MAX - BUBBLE_MIN);
}

function getPrimaryCommodity(commodities) {
  if (!commodities) return "copper";
  let max = 0;
  let primary = "copper";
  for (const [commodity, value] of Object.entries(commodities)) {
    if (value > max) {
      max = value;
      primary = commodity;
    }
  }
  return primary;
}

function createClusterIcon(cluster) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 30 : count < 30 ? 36 : 42;

  return L.divIcon({
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.85);
      border: 1.5px solid #b1b4b6;
      color: #23252a;
      font-size: 11px;
      font-weight: 700;
      font-family: Inter, sans-serif;
      box-shadow: 0 1px 3px rgba(17,17,17,0.12);
    ">${count}</div>`,
    className: "custom-cluster-icon",
    iconSize: L.point(size, size),
  });
}

export default function MiningMap({ mines, mineProduction, height = 560 }) {
  const markers = useMemo(() => {
    const withProd = mines
      .filter((m) => mineProduction.has(m.id))
      .map((mine) => ({ mine, prod: mineProduction.get(mine.id) }));
    const maxKt = Math.max(...withProd.map((m) => m.prod.total_kt || 0), 1);
    const logMax = Math.log10(maxKt + 1);
    return withProd.map(({ mine, prod }) => {
      const primary = getPrimaryCommodity(prod.commodities);
      const color = COMMODITY_COLORS[primary] || "#6b7280";
      const radius = getBubbleRadius(prod.total_kt, logMax);
      return { mine, prod, color, radius };
    });
  }, [mines, mineProduction]);

  return (
    <div style={{ width: "100%", height }}>
      <MapContainer
        center={[20, 10]}
        zoom={2}
        minZoom={2}
        maxZoom={10}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
        attributionControl={false}
        worldCopyJump={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png" maxZoom={19} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
          maxZoom={19}
          minZoom={5}
        />

        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={50}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
          iconCreateFunction={createClusterIcon}
        >
          {markers.map(({ mine, prod, color, radius }) => {
            const sorted = Object.entries(prod.commodities)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 6);

            return (
              <CircleMarker
                key={mine.id}
                center={[mine.lat, mine.lng]}
                radius={radius}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.55,
                  color: color,
                  weight: 1.5,
                  opacity: 0.85,
                }}
              >
                <LeafletTooltip direction="top" offset={[0, -radius]} className="mine-leaflet-tooltip">
                  <span style={{ fontWeight: 600 }}>{mine.name}</span>
                  <br />
                  <span style={{ opacity: 0.6, fontSize: 10 }}>{mine.company}</span>
                </LeafletTooltip>
                <Popup className="mine-popup" maxWidth={260} minWidth={200}>
                  <div style={{ fontFamily: "Inter, sans-serif", color: "#23252a" }}>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{mine.name}</div>
                      <div style={{ fontSize: 11, opacity: 0.55 }}>
                        {mine.company} · {mine.country}
                      </div>
                    </div>
                    {sorted.map(([commodity, value]) => {
                      const cColor = COMMODITY_COLORS[commodity] || "#6b7280";
                      const display =
                        value >= 1000
                          ? `${(value / 1000).toFixed(1)} Mt`
                          : value >= 1
                            ? `${value.toFixed(1)} kt`
                            : `${(value * 1000).toFixed(0)} t`;
                      return (
                        <div
                          key={commodity}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "3px 0",
                            fontSize: 12,
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span
                              style={{ width: 6, height: 6, borderRadius: "50%", background: cColor, flexShrink: 0 }}
                            />
                            <span style={{ opacity: 0.65 }}>{commodity.replace(/_/g, " ")}</span>
                          </span>
                          <span style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{display}</span>
                        </div>
                      );
                    })}
                    <div
                      style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    >
                      <span style={{ fontSize: 10, opacity: 0.35 }}>{prod.records.length} records</span>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/company/${slugify(mine.company)}`);
                        }}
                        style={{
                          color: "#1d70b8",
                          textDecoration: "none",
                          fontSize: 11,
                          fontWeight: 500,
                          padding: "4px 12px",
                          borderRadius: 4,
                          background: "rgba(29,112,184,0.08)",
                          border: "1px solid rgba(29,112,184,0.3)",
                        }}
                      >
                        View company &rarr;
                      </a>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
