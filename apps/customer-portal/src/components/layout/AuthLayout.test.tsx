import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import i18n from "../../i18n";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { AuthLayout } from "./AuthLayout";

describe("AuthLayout", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("fr");
  });

  beforeEach(() => {
    window.localStorage.removeItem("kgpay.theme");
  });

  it("renders the KG Pay login design around the existing auth route", () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route index element={<h2>Formulaire de connexion</h2>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(document.querySelector(".auth-design")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Plusieurs sources. Un seul accès.",
      }),
    ).toBeVisible();
    expect(screen.getByText("Kab Gateway Payment · CEMAC")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Formulaire de connexion" }),
    ).toBeVisible();
    expect(screen.getByRole("group", { name: "Langue" })).toBeVisible();
  });

  it("keeps the A/B theme switcher connected to the existing preference", async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route index element={<h2>Connexion</h2>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /B · Clair/ }));

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("data-theme", "light");
    });
    expect(window.localStorage.getItem("kgpay.theme")).toBe("light");
  });
});
