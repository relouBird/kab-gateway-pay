import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("./http", () => ({
  authApi: http,
  authenticated: { authentication: "access-token" },
}));

import { adminService } from "./adminService";

describe("adminService", () => {
  beforeEach(() => {
    http.get.mockReset().mockResolvedValue({ data: [] });
    http.post.mockReset().mockResolvedValue({ data: { invitationId: "id" } });
  });

  it("restricts the identity listing query to STAFF and URL-encodes search terms", async () => {
    await adminService.listIdentities({
      page: 2,
      limit: 50,
      search: "a+b@example.test",
      status: "ACTIVE",
    });

    expect(http.get).toHaveBeenCalledWith(
      "/admin/identities?page=2&limit=50&subjectType=STAFF&search=a%2Bb%40example.test&status=ACTIVE",
      { authentication: "access-token" },
    );
  });

  it("sends step-up proof only with the protected invitation request", async () => {
    await adminService.invite(
      {
        email: "staff@example.test",
        phone: "+237600000000",
        roles: ["OPERATIONS_ADMIN"],
      },
      "short-lived-proof",
    );

    expect(http.post).toHaveBeenCalledWith(
      "/admin/identities",
      {
        email: "staff@example.test",
        phone: "+237600000000",
        roles: ["OPERATIONS_ADMIN"],
      },
      {
        authentication: "access-token",
        headers: { "X-Step-Up-Proof": "short-lived-proof" },
      },
    );
  });
});
