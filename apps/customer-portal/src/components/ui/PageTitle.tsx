import { useEffect, useRef } from "react";

interface PageTitleProps {
  title: string;
  subtitle?: string | undefined;
}

/** Titre de page : met à jour `document.title` et déplace le focus pour les lecteurs d'écran. */
export function PageTitle({ title, subtitle }: PageTitleProps) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = `${title} · KG Pay`;
    heading.current?.focus({ preventScroll: true });
  }, [title]);

  return (
    <header className="page-title">
      <h1 ref={heading} tabIndex={-1}>
        {title}
      </h1>
      {subtitle ? <p className="page-title__subtitle">{subtitle}</p> : null}
    </header>
  );
}
