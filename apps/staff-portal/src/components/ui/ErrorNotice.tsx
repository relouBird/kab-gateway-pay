import { Notice } from "./Notice";

export function ErrorNotice({
  message,
  reference,
}: {
  message: string;
  reference?: string | null;
}) {
  return (
    <Notice tone="error" correlationId={reference}>
      {message}
    </Notice>
  );
}
