import { useEffect, useState } from "react";

/** Secondes restantes avant `until` (ms epoch) ; s'arrête à 0. */
export function useCountdown(until: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    if (Date.now() >= until) return undefined;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= until) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [until]);

  return Math.max(0, Math.ceil((until - now) / 1000));
}
