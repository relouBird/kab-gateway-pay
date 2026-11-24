import { fireEvent, render, screen } from "@testing-library/react";
import "./i18n";
import { App } from "./App";
import i18n from "./i18n";
import { ThemeProvider } from "./theme/ThemeProvider";

vi.mock("./services/sessionManager", () => ({
  restoreSession: vi.fn().mockResolvedValue(undefined),
}));

describe("App network status", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("fr");
  });

  it("shows the offline and restored screens when network events change", async () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );

    fireEvent(window, new Event("offline"));
    expect(
      await screen.findByRole("heading", {
        name: "Plus de réseau pour le moment.",
      }),
    ).toBeInTheDocument();

    fireEvent(window, new Event("online"));
    expect(
      await screen.findByRole("heading", {
        name: "De retour. Tout est en place.",
      }),
    ).toBeInTheDocument();
  });
});
