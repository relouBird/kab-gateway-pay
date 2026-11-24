import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import i18n from "../../i18n";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { StaffLayout } from "./StaffLayout";

describe("StaffLayout", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("fr");
  });

  it("renders the staff navigation without exposing admin links by default", () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/my-sessions"]}>
          <Routes>
            <Route element={<StaffLayout />}>
              <Route
                path="/my-sessions"
                element={<h1>Mes sessions authentifiées</h1>}
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(screen.getAllByRole("link", { name: "Mes sessions" })).toHaveLength(
      2,
    );
    expect(screen.queryByRole("link", { name: "Administration" })).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Mes sessions authentifiées" }),
    ).toBeVisible();
    expect(screen.getByRole("group", { name: "Thème" })).toBeInTheDocument();
  });

  it("persists the selected connected theme", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/my-sessions"]}>
          <Routes>
            <Route element={<StaffLayout />}>
              <Route path="/my-sessions" element={<h1>Mes sessions</h1>} />
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
});
