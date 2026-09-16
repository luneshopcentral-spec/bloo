import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
// An explicitly named empty test database is mandatory. Never load .env.local.
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("/launch_audit")) throw new Error("Set TEST_DATABASE_URL to an EMPTY isolated database named launch_audit");
const psql = process.env.PSQL_PATH || "psql";
const files = ["supabase/tests/bootstrap.sql", ...readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort().map((f) => `supabase/migrations/${f}`), "supabase/tests/security.sql"];
for (const file of files) {
  const result = spawnSync(psql, [url, "-v", "ON_ERROR_STOP=1", "-f", file], { encoding: "utf8", env: { ...process.env, PGCLIENTENCODING: "UTF8" } });
  if (result.status !== 0) { console.error(file, result.stderr || result.error); process.exit(1); }
  console.log(`Passed: ${file}`);
}
