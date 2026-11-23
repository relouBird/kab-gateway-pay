import { useCallback, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { ValidationError, type AnySchema } from "yup";
import { env } from "../config/env";

interface UseYupFormOptions<T extends Record<string, string>> {
  formId: string;
  schema: AnySchema;
  initialValues: T;
}

type FieldErrors<T> = Partial<Record<keyof T, string>>;

/** Formulaire contrôlé validé par les schémas Yup de `@kgpay/contracts/transport`. */
export function useYupForm<T extends Record<string, string>>({
  formId,
  schema,
  initialValues,
}: UseYupFormOptions<T>) {
  const { t } = useTranslation();
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<T>>({});

  const validate = useCallback(async (): Promise<T | null> => {
    try {
      const cast = (await schema.validate(values, { abortEarly: false })) as T;
      setErrors({});
      return cast;
    } catch (error) {
      if (!(error instanceof ValidationError)) throw error;
      const next: FieldErrors<T> = {};
      for (const issue of error.inner) {
        const path = issue.path as keyof T | undefined;
        if (path && !(path in next)) next[path] = issue.message;
      }
      setErrors(next);
      const first = Object.keys(next)[0];
      if (first) document.getElementById(`${formId}-${first}`)?.focus();
      return null;
    }
  }, [schema, values, formId]);

  const field = useCallback(
    (name: keyof T & string) => {
      const key: string | undefined = errors[name];
      return {
        id: `${formId}-${name}`,
        name,
        value: values[name],
        error: key ? t(key, { min: env.passwordMinLength }) : undefined,
        onChange: (event: ChangeEvent<HTMLInputElement>) => {
          const { value } = event.target;
          setValues((current) => ({ ...current, [name]: value }));
          setErrors((current) =>
            current[name] ? { ...current, [name]: undefined } : current,
          );
        },
      };
    },
    [errors, values, formId, t],
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  const clearField = useCallback((name: keyof T & string) => {
    setValues((current) => ({ ...current, [name]: "" }));
    setErrors((current) =>
      current[name] ? { ...current, [name]: undefined } : current,
    );
  }, []);

  return { values, field, validate, reset, clearField };
}
