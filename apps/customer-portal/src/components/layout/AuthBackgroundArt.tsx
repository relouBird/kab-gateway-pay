import type { CSSProperties } from "react";
import { useMemo } from "react";

const ART_CONFIG = [
  { x: "30%", y: "40%", s: "min(78vw,720px)", d: "260s", o: 1, wires: 14 },
  { x: "60%", y: "8%", s: "min(34vw,320px)", d: "-160s", o: 0.8, wires: 9 },
  { x: "44%", y: "3%", s: "min(22vw,210px)", d: "200s", o: 0.5, wires: 9 },
  { x: "96%", y: "96%", s: "min(36vw,340px)", d: "-220s", o: 0.7, wires: 9 },
  { x: "52%", y: "72%", s: "min(22vw,220px)", d: "140s", o: 0.6, wires: 9 },
];

type RosetteStyle = CSSProperties & {
  "--x": string;
  "--y": string;
  "--s": string;
  "--d": string;
  "--o": number;
};

function WireRosette({ radius = 300, petals = 6, wires = 9 }) {
  const groups = useMemo(() => {
    const height = radius * 0.3;
    return Array.from({ length: petals }, (_, index) => {
      const strands = [];
      for (let wire = -wires; wire <= wires; wire += 1) {
        const offset = (wire / wires) * height;
        const fade = 1 - Math.abs(wire) / (wires + 1);
        const center = wire === 0;
        strands.push({
          key: wire,
          path: `M0 0C${radius * 0.3} ${offset} ${radius * 0.7} ${offset} ${radius} 0`,
          stroke: center ? "#E8B84B" : "#F6F1E7",
          opacity: center ? 0.95 : (0.1 + 0.5 * fade).toFixed(2),
          width: center ? 1.6 : 1,
        });
      }
      return { rotation: (index * 360) / petals, strands };
    });
  }, [petals, radius, wires]);

  const size = radius * 2.1;
  return (
    <svg
      viewBox={`${-radius * 1.05} ${-radius * 1.05} ${size} ${size}`}
      width="100%"
      height="100%"
    >
      {groups.map(({ rotation, strands }) => (
        <g key={rotation} transform={`rotate(${rotation})`}>
          {strands.map((strand) => (
            <path
              key={strand.key}
              d={strand.path}
              fill="none"
              stroke={strand.stroke}
              strokeOpacity={strand.opacity}
              strokeWidth={strand.width}
            />
          ))}
        </g>
      ))}
      <circle
        r={radius * 1.02}
        fill="none"
        stroke="#F6F1E7"
        strokeOpacity=".12"
      />
      <circle r="5" fill="#E8B84B" />
    </svg>
  );
}

function PetalRosette({ radius = 300 }) {
  const petalRadius = radius * 0.5;
  const size = radius * 2.1;

  return (
    <svg
      viewBox={`${-radius * 1.05} ${-radius * 1.05} ${size} ${size}`}
      width="100%"
      height="100%"
    >
      {Array.from({ length: 6 }, (_, index) => {
        const angle = (index * Math.PI) / 3;
        const accent = index % 2 === 1;
        return (
          <circle
            key={index}
            cx={(petalRadius * Math.cos(angle)).toFixed(1)}
            cy={(petalRadius * Math.sin(angle)).toFixed(1)}
            r={petalRadius}
            fill={accent ? "#C77E2C" : "#0B3D2E"}
            fillOpacity={accent ? 0.06 : 0.045}
            stroke="#0B3D2E"
            strokeOpacity=".16"
          />
        );
      })}
      <circle r={radius} fill="none" stroke="#0B3D2E" strokeOpacity=".22" />
      <circle r="4" fill="#C77E2C" />
    </svg>
  );
}

export function AuthBackgroundArt() {
  return (
    <div className="auth-design__art" aria-hidden="true">
      {ART_CONFIG.map((config, index) => {
        const style: RosetteStyle = {
          "--x": config.x,
          "--y": config.y,
          "--s": config.s,
          "--d": config.d,
          "--o": config.o,
        };
        return (
          <div key={index}>
            <div
              className="auth-design__rosette auth-design__rosette--dark"
              style={style}
            >
              <WireRosette radius={300} petals={6} wires={config.wires} />
            </div>
            <div
              className="auth-design__rosette auth-design__rosette--light"
              style={style}
            >
              <PetalRosette radius={300} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
