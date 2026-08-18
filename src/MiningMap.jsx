import L from "leaflet";
import React, { useMemo } from "react";
import { CircleMarker, Tooltip as LeafletTooltip, MapContainer, Popup, TileLayer } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import { BUBBLE_MAX, BUBBLE_MIN, COMMODITY_COLORS, commodityLabel } from "./constants";
import { navigate } from "./router";
import { slugify } from "./ui";

function getBubbleRadius(output, logMax) {
  if (!output || output <= 0) return BUBBLE_MIN;
  const normalized = Math.log10(output + 1) / logMax;
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

function formatOutput(value, unit) {
  if (!Number.isFinite(Number(value))) return "--";
  const number = Number(value);
  if (unit === "kt") {
    if (number >= 1000) return `${(number / 1000).toFixed(1)} Mt`;
    if (number >= 1) return `${number.toFixed(1)} kt`;
    return `${(number * 1000).toFixed(0)} t`;
  }
  const display = number.toLocaleString("en-US", { maximumFractionDigits: number >= 1 ? 1 : 3 });
  return unit ? `${display} ${unit}` : display;
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

export default function MiningMap({
  mines,
  mineProduction,
  height = 560,
  center = [20, 10],
  zoom = 2,
  scaleByOutput = true,
  showOutputValues = scaleByOutput,
}) {
  const markers = useMemo(() => {
    const withProd = mines
      .filter((m) => mineProduction.has(m.id))
      .map((mine) => ({ mine, prod: mineProduction.get(mine.id) }));
    const outputFor = (prod) => prod.output_value ?? prod.total_kt ?? 0;
    const maxOutput = Math.max(...withProd.map((m) => outputFor(m.prod)), 1);
    const logMax = Math.log10(maxOutput + 1);
    return withProd.map(({ mine, prod }) => {
      const primary = scaleByOutput
        ? getPrimaryCommodity(prod.commodities)
        : Object.keys(prod.commodities || {})[0] || mine.commodities?.[0] || "copper";
      const color = COMMODITY_COLORS[primary] || "#6b7280";
      const radius = scaleByOutput ? getBubbleRadius(outputFor(prod), logMax) : BUBBLE_MIN + 2;
      return { mine, prod, color, radius };
    });
  }, [mines, mineProduction, scaleByOutput]);

  return (
    <div style={{ width: "100%", height }}>
      <MapContainer
        center={center}
        zoom={zoom}
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
            const recordPeriods = [...new Set(prod.records.map((record) => record.time_period).filter(Boolean))];
            const period = recordPeriods.length === 1 ? recordPeriods[0] : "";

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
                <Popup className="mine-popup" maxWidth={300} minWidth={228}>
                  <section className="mine-popup-card" aria-labelledby={`mine-popup-${mine.id}`}>
                    <header className="mine-popup-header">
                      <h3 id={`mine-popup-${mine.id}`}>{mine.name}</h3>
                    </header>

                    <div className="mine-popup-body">
                      <dl className="mine-popup-summary">
                        <div>
                          <dt>Company</dt>
                          <dd>{mine.company}</dd>
                        </div>
                        <div>
                          <dt>Country</dt>
                          <dd>{mine.country || "Not available"}</dd>
                        </div>
                        {period ? (
                          <div>
                            <dt>Period</dt>
                            <dd>{period}</dd>
                          </div>
                        ) : null}
                      </dl>

                      <div className="mine-popup-production">
                        <h4>{showOutputValues ? "Production" : "Reported commodities"}</h4>
                        {showOutputValues ? (
                          <dl>
                            {sorted.map(([commodity, value]) => (
                              <div key={commodity}>
                                <dt>
                                  <span
                                    className="mine-popup-dot"
                                    style={{ backgroundColor: COMMODITY_COLORS[commodity] || "#6b7280" }}
                                    aria-hidden="true"
                                  />
                                  {commodityLabel(commodity)}
                                </dt>
                                <dd>{formatOutput(value, prod.units?.[commodity])}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : (
                          <ul>
                            {sorted.map(([commodity]) => (
                              <li key={commodity}>
                                <span
                                  className="mine-popup-dot"
                                  style={{ backgroundColor: COMMODITY_COLORS[commodity] || "#6b7280" }}
                                  aria-hidden="true"
                                />
                                {commodityLabel(commodity)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <p className="mine-popup-observations">
                        {prod.records.length} production {prod.records.length === 1 ? "observation" : "observations"} in this view
                      </p>
                    </div>

                    <footer className="mine-popup-footer">
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/company/${slugify(mine.company)}`);
                        }}
                      >
                        View company
                        <span className="sr-only">: {mine.company}</span>
                      </a>
                    </footer>
                  </section>
                </Popup>
              </CircleMarker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
