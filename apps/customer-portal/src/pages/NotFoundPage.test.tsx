import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import "../i18n";
import i18n from "../i18n";
import { ThemeProvider } from "../theme/ThemeProvider";
import { NotFoundPage } from "./NotFoundPage";

describe("NotFoundPage", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("fr");
  });

  it("renders a dedicated not-found screen with a sign-in route", () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <NotFoundPage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Cette page est introuvable." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Retour à la connexion" }),
    ).toHaveAttribute("href", "/login");
    expect(screen.queryByText("En attente du réseau…")).not.toBeInTheDocument();
  });
});
