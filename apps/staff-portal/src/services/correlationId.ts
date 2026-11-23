export function correlationId(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "correlationId" in error.response.data &&
    typeof error.response.data.correlationId === "string"
  ) {
    return error.response.data.correlationId;
  }
  return null;
}
