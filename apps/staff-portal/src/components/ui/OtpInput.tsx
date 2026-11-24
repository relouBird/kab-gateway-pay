import { Fragment, useRef } from "react";
import { useTranslation } from "react-i18next";

interface OtpInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  length?: number;
}

export function OtpInput({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  disabled = false,
  autoFocus = true,
  length = 6,
}: OtpInputProps) {
  const { t } = useTranslation();
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  function focusCell(index: number) {
    refs.current[Math.max(0, Math.min(length - 1, index))]?.focus();
  }

  function commit(next: string[], focusIndex: number) {
    onChange(next.join("").slice(0, length));
    focusCell(focusIndex);
  }

  function fill(start: number, raw: string) {
    const incoming = raw.replace(/\D/g, "");
    if (!incoming) return;
    const next = Array.from({ length }, (_, index) => value[index] ?? "");
    let index = incoming.length >= length ? 0 : Math.min(start, value.length);
    for (const digit of incoming) {
      if (index >= length) break;
      next[index] = digit;
      index += 1;
    }
    commit(next, Math.min(index, length - 1));
  }

  function removeAt(index: number) {
    const next = value.split("");
    next.splice(index, 1);
    commit(next, index);
  }

  return (
    <div className={`otp-field${error ? " otp-field--invalid" : ""}`}>
      <span className="otp-field__label" id={`${id}-label`}>
        {label}
      </span>
      <div
        className="otp-input"
        role="group"
        aria-labelledby={`${id}-label`}
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? true : undefined}
        data-error={error ? "" : undefined}
        style={{
          gridTemplateColumns:
            length % 2 === 0
              ? `repeat(${length / 2}, minmax(0, 1fr)) var(--otp-separator-width) repeat(${length / 2}, minmax(0, 1fr))`
              : `repeat(${length}, minmax(0, 1fr))`,
        }}
      >
        {digits.map((digit, index) => (
          <Fragment key={index}>
            {length % 2 === 0 && index === length / 2 ? (
              <span className="otp-input__separator" aria-hidden="true" />
            ) : null}
            <input
              ref={(element) => {
                refs.current[index] = element;
              }}
              id={index === 0 ? id : `${id}-${index}`}
              className="otp-input__cell"
              data-filled={digit ? "" : undefined}
              value={digit}
              disabled={disabled}
              autoFocus={autoFocus && index === 0}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={length}
              autoComplete={index === 0 ? "one-time-code" : "off"}
              aria-label={t("otpDigitPosition", {
                label,
                current: index + 1,
                total: length,
              })}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy || undefined}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => {
                const raw = event.currentTarget.value;
                if (raw === "") {
                  if (digit) removeAt(index);
                  return;
                }
                fill(index, raw);
              }}
              onKeyDown={(event) => {
                if (event.key === "Backspace" && !digit && index > 0) {
                  event.preventDefault();
                  removeAt(index - 1);
                } else if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  focusCell(index - 1);
                } else if (event.key === "ArrowRight") {
                  event.preventDefault();
                  focusCell(index + 1);
                }
              }}
              onPaste={(event) => {
                event.preventDefault();
                const text = event.clipboardData.getData("text");
                fill(
                  text.replace(/\D/g, "").length >= length ? 0 : index,
                  text,
                );
              }}
            />
          </Fragment>
        ))}
      </div>
      {hint ? (
        <p id={hintId} className="otp-field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="otp-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
