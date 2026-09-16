import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowRequest } from "@/lib/security/rate-limit";
import { emptyFormStateFor } from "@/components/simulator/state";
import { getCaseEditorialRecord } from "@/lib/governance/editorial";
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/security/rate-limit", () => ({ allowRequest: vi.fn() }));

const sessionId = "10000000-0000-4000-8000-000000000001";
function request(body: unknown, origin = "http://localhost") {
  return new Request("http://localhost/api/attempts", { method: "POST", headers: { origin }, body: JSON.stringify(body) });
}
const submission = { sessionId, formState: emptyFormStateFor(1), selectedWarnings: [[]], drugSeedIds: [null], prescriberNumber: null, patient: null, decision: null, assembly: null, transcript: [] };
describe("attempt API trust boundary", () => {
  let user: { id: string } | null;
  let caseId: string;
  let sessionOwner: string;
  let inserted: Record<string, unknown> | null;
  beforeEach(() => {
    vi.resetAllMocks(); user = { id: "signed-in-user" }; caseId = "case-2"; sessionOwner = user.id; inserted = null;
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: async () => ({ data: { user } }) } } as never);
    vi.mocked(allowRequest).mockResolvedValue(true);
    vi.mocked(createAdminClient).mockReturnValue({ from(table: string) {
      const filters: Record<string,string> = {};
      const query = {
        select() { return query; }, eq(column: string, value: string) { filters[column] = value; return query; },
        async single() {
          if (table === "profiles") return { data: { has_paid: false, role: "student" }, error: null };
          return { data: filters.user_id === sessionOwner ? { id: sessionId, user_id: sessionOwner, case_id: caseId, case_version: getCaseEditorialRecord(caseId).version, seed: 0, mode: "practice", assisted: false } : null, error: null };
        },
        async maybeSingle() { return { data: null, error: null }; },
        async insert(row: Record<string,unknown>) { inserted = row; return { error: null }; },
      };
      return query;
    } } as never);
  });
  it("rejects cross-origin requests before touching the database", async () => {
    expect((await POST(request(submission, "https://other.example"))).status).toBe(403);
    expect(createAdminClient).not.toHaveBeenCalled();
  });
  it("requires authentication", async () => {
    user = null; expect((await POST(request(submission))).status).toBe(401);
  });
  it("rejects another user's session", async () => {
    sessionOwner = "another-user"; expect((await POST(request(submission))).status).toBe(409);
    expect(inserted).toBeNull();
  });
  it("rejects a locked case despite forged client flags", async () => {
    caseId = "case-13"; expect((await POST(request({ ...submission, caseIsFree: true, has_paid: true }))).status).toBe(403);
    expect(inserted).toBeNull();
  });
  it("saves server scores under the authenticated identity", async () => {
    expect((await POST(request({ ...submission, user_id: "victim", passed: true, score: 999 }))).status).toBe(200);
    expect(inserted).toMatchObject({ user_id: "signed-in-user", passed: false, server_verified: true });
    expect(inserted?.score).not.toBe(999);
  });
  it("rejects malformed submissions and rate-limited traffic", async () => {
    expect((await POST(request({ sessionId: "bad" }))).status).toBe(400);
    vi.mocked(allowRequest).mockResolvedValue(false);
    expect((await POST(request(submission))).status).toBe(429);
  });
});
