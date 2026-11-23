/** Motif décoratif de la marque : des lignes parallèles convergent vers une ouverture unique. */
export function ConvergenceMark({ className }: { className?: string }) {
  const sources = [64, 104, 144, 176, 216, 256];
  return (
    <svg
      className={className}
      viewBox="0 0 320 320"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id="convergence-clip">
          <circle cx="160" cy="160" r="148" />
        </clipPath>
      </defs>
      <circle
        cx="160"
        cy="160"
        r="148"
        stroke="#F6F1E7"
        strokeOpacity=".28"
        strokeWidth="1.5"
      />
      <g
        clipPath="url(#convergence-clip)"
        stroke="#F6F1E7"
        strokeWidth="1.5"
        strokeOpacity=".55"
      >
        {sources.map((y) => (
          <line key={y} x1="0" y1={y} x2="236" y2="160" />
        ))}
      </g>
      <circle cx="236" cy="160" r="7" fill="#E8B84B" />
    </svg>
  );
}
