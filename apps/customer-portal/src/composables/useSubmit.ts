import { useCallback, useRef, useState } from "react";
import {
  errorMessageKey,
  toApiError,
  type ErrorContext,
} from "../services/http/apiError";

export interface SubmitError {
  key: string;
  correlationId: string | null;
}

/** Exécute une action asynchrone une seule fois à la fois et normalise l'erreur affichable. */
export function useSubmit(defaultContext: ErrorContext = "generic") {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<SubmitError | null>(null);
  const running = useRef(false);

  const run = useCallback(
    async <T>(
      task: () => Promise<T>,
      context: ErrorContext = defaultContext,
    ): Promise<T | undefined> => {
      if (running.current) return undefined;
      running.current = true;
      setPending(true);
      setError(null);
      try {
        return await task();
      } catch (caught) {
        const apiError = toApiError(caught);
        setError({
          key: errorMessageKey(apiError, context),
          correlationId: apiError.correlationId,
        });
        return undefined;
      } finally {
        running.current = false;
        setPending(false);
      }
    },
    [defaultContext],
  );

  const clearError = useCallback(() => setError(null), []);

  return { pending, error, run, clearError };
}
