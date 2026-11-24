/** N'accepte qu'un chemin interne pour éviter toute redirection ouverte. */
export function resolveReturnPath(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  if (
    typeof from === "string" &&
    from.startsWith("/") &&
    !from.startsWith("//")
  )
    return from;
  return "/";
}
