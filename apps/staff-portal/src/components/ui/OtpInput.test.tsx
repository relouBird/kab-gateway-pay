import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import "../../i18n";
import { OtpInput } from "./OtpInput";

function OtpHarness() {
  const [value, setValue] = useState("");
  return (
    <OtpInput
      id="test-code"
      label="Code de sécurité"
      value={value}
      onChange={setValue}
      autoFocus={false}
    />
  );
}

describe("OtpInput", () => {
  it("distributes a pasted code into six numeric cells", () => {
    render(<OtpHarness />);
    const cells = screen.getAllByRole("textbox");
    const firstCell = cells[0];
    if (!firstCell) throw new Error("OTP input was not rendered.");

    fireEvent.paste(firstCell, {
      clipboardData: { getData: () => "123 456" },
    });

    expect(cells.map((cell) => (cell as HTMLInputElement).value)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
    ]);
  });

  it("advances focus and supports backspace across cells", () => {
    render(<OtpHarness />);
    const cells = screen.getAllByRole("textbox");
    const firstCell = cells[0];
    const secondCell = cells[1];
    if (!firstCell || !secondCell)
      throw new Error("OTP inputs were not rendered.");

    fireEvent.focus(firstCell);
    fireEvent.change(firstCell, { target: { value: "7" } });
    expect(document.activeElement).toBe(secondCell);

    fireEvent.keyDown(secondCell, { key: "Backspace" });
    expect((firstCell as HTMLInputElement).value).toBe("");
    expect(document.activeElement).toBe(firstCell);
  });
});
