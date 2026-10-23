import React, { useMemo } from "react";
import { comparableQuarterlyPivot } from "../constants";
import { Link } from "../ui";

export default function MinesPage({ data }) {
  const mines = useMemo(() => {
    const recordsByMine = new Map();
    for (const record of data.production) {
      if (!recordsByMine.has(record.mine_id)) recordsByMine.set(record.mine_id, []);
      recordsByMine.get(record.mine_id).push(record);
    }
    return data.mines
      .filter((mine) => comparableQuarterlyPivot(recordsByMine.get(mine.id) || []).quarters.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  return (
    <div className="dk-container page-main">
      <h1 className="dk-h1">Mines tracked</h1>
      <p className="page-lede">Quarterly production for {mines.length} individual operations, extracted from their operators' own reports.</p>
      <ul className="space-y-3">
        {mines.map((mine) => (
          <li key={mine.id}>
            <Link to={`/mine/${mine.id}`}>{mine.name}</Link>, {mine.company}{mine.country ? `, ${mine.country}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
