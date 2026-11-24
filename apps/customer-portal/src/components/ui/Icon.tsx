import type { SVGProps } from "react";

const paths = {
  home: "M3 10.5 12 3l9 7.5V21H3z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  alert:
    "M12 8v5m0 3.5v.01M10.3 4.6L3.4 17a2 2 0 001.7 3h13.8a2 2 0 001.7-3L13.7 4.6a2 2 0 00-3.4 0z",
  info: "M12 11v5m0-8.5v.01M12 21a9 9 0 100-18 9 9 0 000 18z",
  clock: "M12 7v5l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  eyeOff:
    "M4 4l16 16M9.9 6A9.7 9.7 0 0112 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 01-3 3.7M6.3 7.6A16 16 0 002.5 12S6 18.5 12 18.5c1.3 0 2.5-.3 3.6-.8M10 10a2.5 2.5 0 003.5 3.5",
  shield:
    "M12 3l7.5 3v5.5c0 4.7-3.1 8.2-7.5 9.5-4.4-1.3-7.5-4.8-7.5-9.5V6L12 3zM9 12l2.2 2.2L15.5 10",
  device:
    "M7 4h10a1.5 1.5 0 011.5 1.5v13A1.5 1.5 0 0117 20H7a1.5 1.5 0 01-1.5-1.5v-13A1.5 1.5 0 017 4zm4 13.5h2",
  logout:
    "M9 4.5H6a1.5 1.5 0 00-1.5 1.5v12A1.5 1.5 0 006 19.5h3M16 8l4 4-4 4M20 12H9",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4.5 20a7.5 7.5 0 0115 0",
  key: "M14.5 9.5a4 4 0 11-1.2 2.8L4.5 21v-3h-3v-3l9-8.7a4 4 0 013-.8zM16.5 8.5v.01",
  list: "M8 6.5h12M8 12h12M8 17.5h12M4 6.5v.01M4 12v.01M4 17.5v.01",
} as const;

export type IconName = keyof typeof paths;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
}

/** Icône décorative : le sens est toujours porté par un libellé texte adjacent. */
export function Icon({ name, size = 20, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={paths[name]} />
    </svg>
  );
}
