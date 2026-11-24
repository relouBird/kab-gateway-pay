import { useState, type InputHTMLAttributes } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "./Icon";

interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id"
> {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  revealable?: boolean;
}

export function TextField({
  id,
  label,
  error,
  hint,
  revealable = false,
  type = "text",
  className,
  ...rest
}: TextFieldProps) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");
  const effectiveType = revealable && revealed ? "text" : type;

  return (
    <div
      className={["field", error ? "field--invalid" : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control">
        <input
          id={id}
          className="field__input"
          type={effectiveType}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          {...rest}
        />
        {revealable ? (
          <button
            type="button"
            className="field__reveal"
            onClick={() => setRevealed((value) => !value)}
            aria-pressed={revealed}
            aria-label={
              revealed ? t("common.hidePassword") : t("common.showPassword")
            }
          >
            <Icon name={revealed ? "eyeOff" : "eye"} />
          </button>
        ) : null}
      </div>
      {hint ? (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="field__error">
          <Icon name="alert" size={16} />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
