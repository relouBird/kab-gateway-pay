import type { AuthTokensResponse } from "@kgpay/contracts/transport";
import { ApiError } from "./http/apiError";
import { refreshSession } from "./sessionManager";
import { authService } from "./authService";
import { useSessionStore } from "../stores/sessionStore";

vi.mock("./authService", () => ({
  authService: { getCsrf: vi.fn(), refresh: vi.fn(), logout: vi.fn() },
}));

const tokens: AuthTokensResponse = {
  accessToken: "access",
  tokenType: "Bearer",
  expiresIn: 900,
  subjectType: "CUSTOMER",
  roles: ["CUSTOMER"],
  sessionId: "s1",
};

describe("refreshSession", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useSessionStore.getState().clearSession();
  });

  it("sérialise les appels simultanés en un seul refresh", async () => {
    vi.mocked(authService.getCsrf).mockResolvedValue({ csrfToken: "csrf" });
    vi.mocked(authService.refresh).mockResolvedValue(tokens);

    const results = await Promise.all([
      refreshSession(),
      refreshSession(),
      refreshSession(),
    ]);

    expect(results).toEqual(["access", "access", "access"]);
    expect(authService.refresh).toHaveBeenCalledTimes(1);
    expect(authService.refresh).toHaveBeenCalledWith("csrf");
    expect(useSessionStore.getState().status).toBe("authenticated");
  });

  it("termine la session sur refus serveur", async () => {
    useSessionStore.getState().setSession(tokens);
    vi.mocked(authService.getCsrf).mockResolvedValue({ csrfToken: "csrf" });
    vi.mocked(authService.refresh).mockRejectedValue(
      new ApiError({ kind: "http", status: 401 }),
    );

    expect(await refreshSession()).toBeNull();
    expect(useSessionStore.getState().status).toBe("anonymous");
  });

  it("conserve la session sur erreur réseau", async () => {
    useSessionStore.getState().setSession(tokens);
    vi.mocked(authService.getCsrf).mockRejectedValue(
      new ApiError({ kind: "network" }),
    );

    expect(await refreshSession()).toBeNull();
    expect(useSessionStore.getState().status).toBe("authenticated");
  });
});
