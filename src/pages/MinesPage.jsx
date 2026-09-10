import React, { useMemo } from "react";
import { quarterlyPivot } from "../constants";
import { Link } from "../ui";

export default function MinesPage({ data }) {
  const mines = useMemo(() => {
    const recordsByMine = new Map();
    for (const record of data.production) {
      if (!recordsByMine.has(record.mine_id)) recordsByMine.set(record.mine_id, []);
      recordsByMine.get(record.mine_id).push(record);
    }
    return data.mines
      .filter((mine) => quarterlyPivot(recordsByMine.get(mine.id) || []).quarters.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <h1 className="text-title font-semibold mb-4">Mines tracked</h1>
      <p className="mb-6">Quarterly production for {mines.length} individual operations, extracted from their operators' own reports.</p>
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
