import { useMemo } from "react";
import type { StatusPageState } from "../layout/StatusPageLayout";

const RADIUS = 300;
const PETALS = 6;
const STRANDS = 13;

export function StatusRosette({ mode }: { mode: StatusPageState }) {
  const petals = useMemo(() => {
    const height = RADIUS * 0.3;
    return Array.from({ length: PETALS }, (_, index) => {
      const missing = mode === "not-found" && index === PETALS - 1;
      const strands = [];
      for (let strand = -STRANDS; strand <= STRANDS; strand += 1) {
        const offset = (strand / STRANDS) * height;
        const fade = 1 - Math.abs(strand) / (STRANDS + 1);
        const isCenter = strand === 0;
        const path = `M0 0C${RADIUS * 0.3} ${offset} ${RADIUS * 0.7} ${offset} ${RADIUS} 0`;

        if (missing && !isCenter && Math.abs(strand) !== STRANDS) continue;

        strands.push({
          strand,
          path,
          opacity: missing
            ? isCenter
              ? 0.8
              : 0.25
            : mode === "offline"
              ? isCenter
                ? 0.6
                : 0.08 + 0.3 * fade
              : isCenter
                ? 0.95
                : 0.1 + 0.5 * fade,
          width: isCenter ? 1.6 : 1,
          dashed: mode === "offline" || missing,
          accent: isCenter,
        });
      }
      return { rotation: index * 60, missing, strands };
    });
  }, [mode]);

  const boxSize = RADIUS * 2.2;

  return (
    <svg
      className="status-page__mark"
      viewBox={`${-RADIUS * 1.1} ${-RADIUS * 1.1} ${boxSize} ${boxSize}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g>
        {petals.map(({ rotation, missing, strands }) => (
          <g key={rotation} transform={`rotate(${rotation})`}>
            {strands.map((strand) => (
              <path
                key={strand.strand}
                d={strand.path}
                stroke={strand.accent ? "#E8B84B" : "currentColor"}
                strokeOpacity={strand.opacity}
                strokeWidth={strand.width}
                strokeDasharray={strand.dashed ? "2 6" : undefined}
              />
            ))}
            {missing ? (
              <circle
                cx={RADIUS}
                cy="0"
                r="7"
                stroke="#E8B84B"
                strokeWidth="1.6"
              />
            ) : null}
          </g>
        ))}
      </g>
      <circle r={RADIUS * 1.02} stroke="currentColor" strokeOpacity=".12" />
      {mode === "offline" ? (
        <>
          <circle r={RADIUS * 0.18} stroke="#E8B84B" strokeWidth="1.4" />
          <circle r="6" stroke="#E8B84B" strokeWidth="2" />
        </>
      ) : (
        <circle r="6" fill="#E8B84B" />
      )}
    </svg>
  );
}
