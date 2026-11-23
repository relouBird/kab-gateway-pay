import { useId } from "react";

const WIDTH = 143;
const PITCH = 185;
const GAP = 22;
const EXTENT = 1400;
type Point = readonly [number, number];

const polygon = (c1: number, c2: number, d1: number, d2: number) => {
  const points: Point[] = [
    [c1, d1],
    [c2, d1],
    [c2, d2],
    [c1, d2],
  ];
  return points.map(([c, e]) => `${(c + e) / 2},${(c - e) / 2}`).join(" ");
};

const LIGHT_BANDS: Point[] = [0, 1, 2].map((index): Point => [
  510 - PITCH * index - WIDTH,
  510 - PITCH * index,
]);
const DARK_BANDS: Point[] = [0, 1, 2].map((index): Point => [
  -PITCH * index - WIDTH,
  -PITCH * index,
]);
const lightCuts: string[] = [];
const darkCuts: string[] = [];

LIGHT_BANDS.forEach(([a1, a2], lightIndex) =>
  DARK_BANDS.forEach(([d1, d2], darkIndex) => {
    if ((3 - lightIndex + darkIndex + 1) % 2 === 0) {
      darkCuts.push(polygon(a1 - GAP, a2 + GAP, d1 - 6, d2 + 6));
    } else {
      lightCuts.push(polygon(a1 - 6, a2 + 6, d1 - GAP, d2 + GAP));
    }
  }),
);
const lightPolygons = LIGHT_BANDS.map(([start, end]) =>
  polygon(start, end, -EXTENT, EXTENT),
);
const darkPolygons = DARK_BANDS.map(([start, end]) =>
  polygon(-EXTENT, EXTENT, start, end),
);

function CutMask({ id, cuts }: { id: string; cuts: string[] }) {
  return (
    <mask
      id={id}
      maskUnits="userSpaceOnUse"
      x="-100"
      y="-100"
      width="720"
      height="720"
    >
      <rect x="-100" y="-100" width="720" height="720" fill="#fff" />
      {cuts.map((points, index) => (
        <polygon key={index} points={points} fill="#000" />
      ))}
    </mask>
  );
}

export function AuthBrandMark({
  lightColor,
  accentColor,
  size = 44,
}: {
  lightColor: string;
  accentColor: string;
  size?: number;
}) {
  const id = useId().replace(/:/g, "");
  const clipId = `auth-clip-${id}`;
  const lightMaskId = `auth-light-${id}`;
  const darkMaskId = `auth-dark-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 510 510"
      role="img"
      aria-label="KG Pay"
    >
      <defs>
        <clipPath id={clipId}>
          <path d="M40 0H510L255 255L510 510H40A40 40 0 0 1 0 470V40A40 40 0 0 1 40 0Z" />
        </clipPath>
        <CutMask id={lightMaskId} cuts={lightCuts} />
        <CutMask id={darkMaskId} cuts={darkCuts} />
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <g fill={lightColor} mask={`url(#${lightMaskId})`}>
          {lightPolygons.map((points, index) => (
            <polygon key={index} points={points} />
          ))}
        </g>
        <g fill={accentColor} mask={`url(#${darkMaskId})`}>
          {darkPolygons.map((points, index) => (
            <polygon key={index} points={points} />
          ))}
        </g>
      </g>
    </svg>
  );
}
