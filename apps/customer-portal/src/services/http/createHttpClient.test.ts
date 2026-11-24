import {
  AxiosError,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from "axios";
import { createHttpClient } from "./createHttpClient";

function setup(
  responses: number[],
  overrides: {
    refresh?: () => Promise<string | null>;
    defaultHeaders?: Readonly<Record<string, string>>;
  } = {},
) {
  const seen: InternalAxiosRequestConfig[] = [];
  const refreshAccessToken = vi.fn(
    overrides.refresh ?? (() => Promise.resolve("fresh")),
  );
  let token: string | null = "old";
  const client = createHttpClient({
    baseURL: "http://api.test",
    getAccessToken: () => token,
    isAccessTokenExpiring: () => false,
    getLanguage: () => "en",
    refreshAccessToken: async () => {
      const next = await refreshAccessToken();
      token = next;
      return next;
    },
    defaultHeaders: overrides.defaultHeaders,
  });
  const adapter: AxiosAdapter = (config) => {
    seen.push(config);
    const status = responses.shift() ?? 200;
    const response = { status, data: {}, statusText: "", headers: {}, config };
    if (status >= 400) {
      return Promise.reject(
        new AxiosError("x", undefined, config, undefined, response),
      );
    }
    return Promise.resolve(response);
  };
  client.defaults.adapter = adapter;
  return { client, seen, refreshAccessToken };
}

describe("createHttpClient", () => {
  it("ajoute corrélation et langue, mais pas d'Authorization par défaut", async () => {
    const { client, seen } = setup([200]);
    await client.get("/auth/csrf");
    const headers = seen[0]?.headers;
    expect(headers?.get("X-Correlation-Id")).toBeTruthy();
    expect(headers?.get("Accept-Language")).toBe("en");
    expect(headers?.has("Authorization")).toBe(false);
  });

  it("transmet le contexte du portail configuré", async () => {
    const { client, seen } = setup([200], {
      defaultHeaders: { "X-KGPay-Portal": "CUSTOMER" },
    });

    await client.get("/auth/csrf");

    expect(seen[0]?.headers.get("X-KGPay-Portal")).toBe("CUSTOMER");
  });

  it("n'envoie le jeton que sur demande explicite", async () => {
    const { client, seen } = setup([200]);
    await client.get("/auth/sessions", { authentication: "access-token" });
    expect(seen[0]?.headers.get("Authorization")).toBe("Bearer old");
  });

  it("rafraîchit puis rejoue une seule fois sur 401", async () => {
    const { client, seen, refreshAccessToken } = setup([401, 200]);
    await client.get("/auth/sessions", { authentication: "access-token" });
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(seen).toHaveLength(2);
    expect(seen[1]?.headers.get("Authorization")).toBe("Bearer fresh");
  });

  it("ne boucle pas si le 401 persiste", async () => {
    const { client, seen } = setup([401, 401]);
    await expect(
      client.get("/auth/sessions", { authentication: "access-token" }),
    ).rejects.toMatchObject({
      status: 401,
    });
    expect(seen).toHaveLength(2);
  });

  it("ne rejoue pas quand retryOnUnauthorized vaut false", async () => {
    const { client, seen, refreshAccessToken } = setup([401]);
    await expect(
      client.post(
        "/auth/password/change",
        {},
        { authentication: "access-token", retryOnUnauthorized: false },
      ),
    ).rejects.toMatchObject({ status: 401 });
    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(seen).toHaveLength(1);
  });
});
