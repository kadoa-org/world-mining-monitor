import L from "leaflet";
import React, { useEffect, useMemo } from "react";
import { CircleMarker, Tooltip as LeafletTooltip, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import { BUBBLE_MAX, BUBBLE_MIN, COMMODITY_COLORS } from "./constants";

// Fix Leaflet not rendering correctly after being hidden (display:none)
function InvalidateSizeFix() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function getBubbleRadius(totalKt) {
  if (!totalKt || totalKt <= 0) return BUBBLE_MIN;
  // Wider range: small mines (1 kt) = 6px, mega mines (1000+ kt) = 32px
  const r = Math.log10(totalKt + 1) * 7;
  return Math.max(BUBBLE_MIN, Math.min(BUBBLE_MAX, r));
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

// Custom cluster icon creator
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
      background: rgba(255, 255, 255, 0.08);
      border: 1.5px solid rgba(255, 255, 255, 0.25);
      color: rgba(255, 255, 255, 0.7);
      font-size: 11px;
      font-weight: 700;
      font-family: Inter, sans-serif;
      backdrop-filter: blur(4px);
    ">${count}</div>`,
    className: "custom-cluster-icon",
    iconSize: L.point(size, size),
  });
}

export default function MiningMap({
  mines,
  mineProduction,
  onMineHover,
  onMineLeave,
  onMineClick,
  selectedMineId,
  onBackgroundClick,
  onViewData,
}) {
  const markers = useMemo(() => {
    return mines
      .filter((m) => mineProduction.has(m.id))
      .map((mine) => {
        const prod = mineProduction.get(mine.id);
        const primary = getPrimaryCommodity(prod.commodities);
        const color = COMMODITY_COLORS[primary] || "#6b7280";
        const radius = getBubbleRadius(prod.total_kt);
        return { mine, prod, color, radius };
      });
  }, [mines, mineProduction]);

  return (
    <div className="w-full h-full">
      <MapContainer
        center={[20, 10]}
        zoom={2}
        minZoom={2}
        maxZoom={10}
        style={{ width: "100%", height: "100%", background: "#0a0a14" }}
        zoomControl={false}
        attributionControl={false}
        worldCopyJump={false}
      >
        <InvalidateSizeFix />
        {/* Dark tile layer - no labels at low zoom */}
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" maxZoom={19} />
        {/* Labels layer - only visible at higher zoom */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
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
            const isSelected = mine.id === selectedMineId;
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
                  fillOpacity: isSelected ? 0.7 : 0.4,
                  color: isSelected ? "#ffffff" : color,
                  weight: isSelected ? 2 : 1,
                  opacity: isSelected ? 1 : 0.6,
                }}
              >
                <LeafletTooltip direction="top" offset={[0, -radius]} className="mine-leaflet-tooltip">
                  <span style={{ fontWeight: 600 }}>{mine.name}</span>
                  <br />
                  <span style={{ opacity: 0.6, fontSize: 10 }}>{mine.company}</span>
                </LeafletTooltip>
                <Popup className="mine-popup" maxWidth={260} minWidth={200}>
                  <div style={{ fontFamily: "Inter, sans-serif", color: "#e4e5e9" }}>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{mine.name}</div>
                      <div style={{ fontSize: 11, opacity: 0.4 }}>
                        {mine.company} - {mine.country}
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
                            <span style={{ opacity: 0.6 }}>{commodity.replace(/_/g, " ")}</span>
                          </span>
                          <span style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{display}</span>
                        </div>
                      );
                    })}
                    <div
                      style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    >
                      <span style={{ fontSize: 10, opacity: 0.25 }}>{prod.records[0]?.time_period}</span>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          onViewData?.(mine);
                        }}
                        style={{
                          color: "#fd7412",
                          textDecoration: "none",
                          fontSize: 11,
                          fontWeight: 500,
                          padding: "4px 12px",
                          borderRadius: 4,
                          background: "rgba(253,116,18,0.1)",
                          border: "1px solid rgba(253,116,18,0.25)",
                        }}
                      >
                        View data &rarr;
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
