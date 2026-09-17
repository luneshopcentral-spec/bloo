import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { POST as codes } from "@/app/api/admin/codes/route";
import { POST as users } from "@/app/api/admin/users/route";
import { POST as redeem } from "@/app/api/redeem/route";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowRequest } from "@/lib/security/rate-limit";
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/security/rate-limit", () => ({ allowRequest: vi.fn() }));
const id = "30000000-0000-4000-8000-000000000001";
const body = {
  action: "create",
  code: "test-code",
  grantsMinutes: 120,
  maxRedemptions: 1,
  expiresAt: null,
  assignedEmail: null,
};
function request(
  path: string,
  payload: unknown,
  origin = "http://admin.localhost",
  host = "admin.localhost",
) {
  return new Request(`http://${host}/api/${path}`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}
describe("admin and redemption API boundaries", () => {
  let role: string, signedIn: boolean;
  const rpc = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("NEXT_PUBLIC_ADMIN_HOST", "admin.localhost");
    role = "admin";
    signedIn = true;
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: async () => ({
          data: {
            user: signedIn ? { id, email: "admin@example.invalid" } : null,
          },
        }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: { role } }) }),
        }),
      }),
    } as never);
    vi.mocked(createAdminClient).mockReturnValue({ rpc } as never);
    vi.mocked(allowRequest).mockResolvedValue(true);
    rpc.mockResolvedValue({ data: { ok: true }, error: null });
  });
  afterEach(() => vi.unstubAllEnvs());
  it("requires the configured admin host and same origin before database access", async () => {
    expect(
      (await codes(request("admin/codes", body, "http://evil.invalid"))).status,
    ).toBe(403);
    expect(
      (
        await codes(
          request("admin/codes", body, "http://localhost", "localhost"),
        )
      ).status,
    ).toBe(403);
    expect(createAdminClient).not.toHaveBeenCalled();
  });
  it("rejects anonymous and student callers", async () => {
    signedIn = false;
    expect((await codes(request("admin/codes", body))).status).toBe(401);
    signedIn = true;
    role = "student";
    expect((await codes(request("admin/codes", body))).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("accepts a configured browser host when Next uses an internal request URL", async () => {
    const req = request(
      "admin/codes",
      body,
      "http://admin.localhost:3106",
      "localhost:3106",
    );
    req.headers.set("host", "admin.localhost:3106");
    expect((await codes(req)).status).toBe(200);
    req.headers.set("origin", "http://admin.localhost:9999");
    expect((await codes(req)).status).toBe(403);
    req.headers.set("host", "evil.invalid");
    req.headers.set("origin", "https://evil.invalid");
    expect((await codes(req)).status).toBe(403);
  });
  it("uses the authenticated actor, normalises codes and commits via the audited RPC", async () => {
    expect(
      (
        await codes(
          request("admin/codes", {
            ...body,
            actor_id: "forged",
            assignedEmail: "STUDENT@example.invalid",
          }),
        )
      ).status,
    ).toBe(200);
    expect(rpc).toHaveBeenCalledWith("admin_manage_access", {
      actor_id: id,
      operation: {
        ...body,
        code: "TEST-CODE",
        assignedEmail: "student@example.invalid",
      },
    });
  });
  it.each([
    { grantsMinutes: 0 },
    { grantsMinutes: 525601 },
    { maxRedemptions: 0 },
    { assignedEmail: "bad" },
    { expiresAt: "2020-01-01T00:00:00.000Z" },
    { code: "x" },
  ])("rejects invalid code controls %j", async (invalid) => {
    expect(
      (await codes(request("admin/codes", { ...body, ...invalid }))).status,
    ).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("rejects rate limited mutations", async () => {
    vi.mocked(allowRequest).mockResolvedValue(false);
    expect(
      (
        await users(
          request("admin/users", {
            action: "grant_comp",
            userId: id,
            minutes: 60,
          }),
        )
      ).status,
    ).toBe(429);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("does not report success for failed or missing database operations", async () => {
    rpc.mockResolvedValue({ error: { message: "target not found" } });
    expect(
      (
        await users(
          request("admin/users", { action: "revoke_comp", userId: id }),
        )
      ).status,
    ).toBe(404);
    rpc.mockResolvedValue({ error: { code: "23505" } });
    expect((await codes(request("admin/codes", body))).status).toBe(409);
    rpc.mockResolvedValue({ error: { message: "internal sensitive error" } });
    const result = await codes(request("admin/codes", body));
    expect(result.status).toBe(503);
    expect(await result.text()).not.toContain("sensitive");
  });
  it("redemption ignores forged recipient IDs and uses only the signed-in user", async () => {
    rpc.mockResolvedValue({ data: "2027-01-01T00:00:00Z", error: null });
    const result = await redeem(
      request(
        "redeem",
        { code: " test-code ", recipient_id: "another-user" },
        "http://localhost",
        "localhost",
      ),
    );
    expect(result.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("redeem_access_code_for_user", {
      input_code: "TEST-CODE",
      recipient_id: id,
    });
  });
  it("requires authentication and rate limiting for redemption", async () => {
    signedIn = false;
    expect((await redeem(request("redeem", { code: "TEST" }))).status).toBe(
      401,
    );
    signedIn = true;
    vi.mocked(allowRequest).mockResolvedValue(false);
    expect((await redeem(request("redeem", { code: "TEST" }))).status).toBe(
      429,
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});
