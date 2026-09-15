import React, { useEffect, useState } from "react";
export default function MiningMapLoader(props) {
  const [Map, setMap] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let active = true;
    import("./MiningMap.jsx").then((module) => { if (active) setMap(() => module.default); }).catch((cause) => {
      console.error("Mining map code could not load", cause);
      if (active) setError(cause);
    });
    return () => { active = false; };
  }, []);
  if (Map) return <Map {...props} />;
  return <div style={{ height: props.height ?? 560, background: "#eef0ef", padding: 16 }} aria-busy={!error}>
    <p role={error ? "alert" : "status"}>{error ? "The map could not load. Reload the page to try again." : "Loading map…"}</p>
  </div>;
}
