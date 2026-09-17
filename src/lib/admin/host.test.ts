import { afterEach, describe, expect, it, vi } from "vitest";
import { isAdminHost } from "./host";
afterEach(() => vi.unstubAllEnvs());
describe("admin host routing", () => {
  it("matches an explicitly configured host exactly, including port stripping", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_HOST", "admin.example.com");
    expect(isAdminHost("ADMIN.example.com:443")).toBe(true);
    expect(isAdminHost("admin.example.com.evil.invalid")).toBe(false);
    expect(isAdminHost("admin.other.example")).toBe(false);
    expect(isAdminHost("example.com")).toBe(false);
  });
  it("can derive the subdomain from the configured primary site", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_HOST", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.example.com");
    expect(isAdminHost("admin.example.com")).toBe(true);
    expect(isAdminHost("admin.evil.invalid")).toBe(false);
  });
  it("supports local development without accepting arbitrary production admin hosts", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_HOST", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(isAdminHost("admin.localhost:3106")).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    expect(isAdminHost("admin.localhost")).toBe(false);
    expect(isAdminHost(null)).toBe(false);
  });
});
