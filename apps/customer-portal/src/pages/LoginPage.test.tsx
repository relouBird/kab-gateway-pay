import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import i18n from "../i18n";
import { ApiError } from "../services/http/apiError";
import { authService } from "../services/authService";
import { useOtpFlowStore } from "../stores/otpFlowStore";
import { LoginPage } from "./LoginPage";

vi.mock("../services/authService", () => ({ authService: { login: vi.fn() } }));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/mfa" element={<p>ÃƒÂ©tape MFA</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("fr");
  });

  beforeEach(() => {
    vi.resetAllMocks();
    useOtpFlowStore.getState().clearFlow();
  });

  it("ne contacte pas l'API quand le formulaire est invalide", async () => {
    renderLogin();
    await userEvent.click(screen.getByRole("button", { name: /continuer/i }));
    expect(authService.login).not.toHaveBeenCalled();
    expect(
      await screen.findByText("Saisissez un mot de passe."),
    ).toBeInTheDocument();
  });

  it("ouvre l'ÃƒÂ©tape MFA aprÃƒÂ¨s un mot de passe acceptÃƒÂ©", async () => {
    vi.mocked(authService.login).mockResolvedValue({
      challengeId: "c1",
      expiresAt: "2026-11-23T10:00:00Z",
    });
    renderLogin();
    await userEvent.type(
      screen.getByLabelText(/adresse e-mail/i),
      "alice@example.com",
    );
    await userEvent.type(
      screen.getByLabelText(/mot de passe/i, { selector: "input" }),
      "correct-horse-1",
    );
    await userEvent.click(screen.getByRole("button", { name: /continuer/i }));

    expect(await screen.findByText("ÃƒÂ©tape MFA")).toBeInTheDocument();
    expect(useOtpFlowStore.getState().flow).toMatchObject({
      purpose: "login",
      challengeId: "c1",
    });
  });

  it("affiche un message gÃƒÂ©nÃƒÂ©rique sur identifiants refusÃƒÂ©s", async () => {
    vi.mocked(authService.login).mockRejectedValue(
      new ApiError({ kind: "http", status: 401 }),
    );
    renderLogin();
    await userEvent.type(
      screen.getByLabelText(/adresse e-mail/i),
      "alice@example.com",
    );
    await userEvent.type(
      screen.getByLabelText(/mot de passe/i, { selector: "input" }),
      "wrong-password-1",
    );
    await userEvent.click(screen.getByRole("button", { name: /continuer/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(useOtpFlowStore.getState().flow).toBeNull();
  });
});
