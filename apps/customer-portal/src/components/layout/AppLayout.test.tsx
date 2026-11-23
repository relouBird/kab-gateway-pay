import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import i18n from "../../i18n";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { AppLayout } from "./AppLayout";

describe("AppLayout", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("fr");
  });

  it("renders connected navigation and the active page content", () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<h1>Contenu authentifié</h1>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(
      screen.getAllByRole("navigation", { name: "Navigation principale" }),
    ).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Mon compte" })).toHaveLength(2);
    const activeHomeLinks = screen.getAllByRole("link", { name: "Accueil" });
    expect(activeHomeLinks).toHaveLength(2);
    expect(
      activeHomeLinks.every(
        (link) => link.getAttribute("aria-current") === "page",
      ),
    ).toBe(true);
    expect(
      screen.getByRole("heading", { name: "Contenu authentifié" }),
    ).toBeVisible();
    expect(screen.getByRole("group", { name: "Thème" })).toBeInTheDocument();
  });

  it("persists the selected connected theme", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<h1>Contenu authentifié</h1>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );

    const darkTheme = screen.getByRole("button", { name: "Sombre" });
    await user.click(darkTheme);

    expect(darkTheme).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem("kgpay.theme")).toBe("dark");
    localStorage.removeItem("kgpay.theme");
  });

  it("keeps the home link inactive on nested connected pages", () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/account"]}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/account" element={<h1>Mon compte</h1>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(
      screen
        .getAllByRole("link", { name: "Accueil" })
        .every((link) => link.getAttribute("aria-current") !== "page"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: "Mon compte" })
        .every((link) => link.getAttribute("aria-current") === "page"),
    ).toBe(true);
  });
});
