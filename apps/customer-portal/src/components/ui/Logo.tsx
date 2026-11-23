interface LogoProps {
  /** `dark` = logotype pour fond sombre ; `light` = fond clair (bascule seul en thème sombre). */
  tone: "light" | "dark";
  className?: string;
}

const LIGHT = "/brand/kgpay-logotype-clair.svg";
const DARK = "/brand/kgpay-logotype-sombre.svg";

export function Logo({ tone, className }: LogoProps) {
  const classes = className ?? "logo";
  if (tone === "dark") {
    return <img className={classes} src={DARK} alt="KG Pay" height={40} />;
  }
  return (
    <picture>
      <source media="(prefers-color-scheme: dark)" srcSet={DARK} />
      <img className={classes} src={LIGHT} alt="KG Pay" height={40} />
    </picture>
  );
}
