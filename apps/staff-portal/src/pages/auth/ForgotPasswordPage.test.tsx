import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import i18n from "../../i18n";
import { authService } from "../../services/authService";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { LoginPage } from "./LoginPage";

vi.mock("../../services/authService", () => ({
  authService: {
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    login: vi.fn(),
  },
}));

describe("ForgotPasswordPage", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("fr");
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("revient à la connexion avec une confirmation après la réinitialisation", async () => {
    vi.mocked(authService.forgotPassword).mockResolvedValue({
      message: "Accepted",
      challengeId: "challenge-1",
    });
    vi.mocked(authService.resetPassword).mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.type(
      screen.getByLabelText(/adresse e-mail/i),
      "staff@example.test",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /envoyer un code/i }),
    );

    await userEvent.type(
      await screen.findByLabelText(/code de sécurité/i),
      "123456",
    );
    await userEvent.type(
      screen.getByLabelText(/nouveau mot de passe/i),
      "correct-horse-1",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /réinitialiser le mot de passe/i }),
    );

    expect(await screen.findByText("Accès du personnel")).toBeInTheDocument();
    expect(
      screen.getByText("Opération confirmée par le serveur."),
    ).toBeInTheDocument();
    expect(authService.resetPassword).toHaveBeenCalledWith({
      challengeId: "challenge-1",
      code: "123456",
      newPassword: "correct-horse-1",
    });
  });
});
