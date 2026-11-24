import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCountdown } from "../../composables/useCountdown";
import { useSubmit } from "../../composables/useSubmit";
import { Button } from "../ui/Button";
import { Notice } from "../ui/Notice";

interface OtpResendProps {
  /** Instant (ms epoch) à partir duquel un renvoi est possible. */
  availableAt: number;
  onResend: () => Promise<void>;
}

/** Renvoi de code avec délai d'attente ; le serveur reste maître du cooldown (429). */
export function OtpResend({ availableAt, onResend }: OtpResendProps) {
  const { t } = useTranslation();
  const remaining = useCountdown(availableAt);
  const { pending, error, run } = useSubmit();
  const [sent, setSent] = useState(false);

  async function handleClick() {
    setSent(false);
    const ok = await run(async () => {
      await onResend();
      return true;
    });
    if (ok) setSent(true);
  }

  return (
    <div className="stack stack--sm">
      <Button
        variant="ghost"
        onClick={() => void handleClick()}
        disabled={remaining > 0}
        loading={pending}
      >
        {remaining > 0
          ? t("otp.resendIn", { count: remaining })
          : t("otp.resend")}
      </Button>
      {sent && !error ? (
        <Notice tone="success">{t("otp.resent")}</Notice>
      ) : null}
      {error ? (
        <Notice tone="error" correlationId={error.correlationId}>
          {t(error.key)}
        </Notice>
      ) : null}
    </div>
  );
}
