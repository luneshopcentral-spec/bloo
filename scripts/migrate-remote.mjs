// Applies new supabase/migrations/*.sql files to the database in SUPABASE_DB_URL.
//
// Each migration runs in one transaction together with its entry in
// supabase_migrations.schema_migrations — the Supabase CLI's own ledger — so a
// failed migration leaves nothing half-applied or half-recorded, and a
// recorded one is never run again. GitHub Actions runs this on every push to
// main that adds a migration (.github/workflows/migrate.yml).
//
//   SUPABASE_DB_URL      Postgres connection string (Supabase: Connect → Session pooler).
//   MIGRATION_BASELINE   Optional. "none" applies everything (fresh test databases);
//                        "latest" records every local migration as already applied.
//                        Defaults to supabase/migration-baseline.json.
//   --dry-run            List what would happen without changing anything.
//   --expect-applied=N   Fail unless exactly N migrations were applied (CI checks).

import { spawnSync } from "node:child_process";
import { appendFileSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MIGRATIONS = "supabase/migrations";
const psql = process.env.PSQL_PATH || "psql";
const dryRun = process.argv.includes("--dry-run");
const expectApplied = process.argv.find((arg) => arg.startsWith("--expect-applied="))?.split("=")[1];

function fail(message) {
  console.error(process.env.GITHUB_ACTIONS ? `::error::${message}` : message);
  process.exit(1);
}

const url = process.env.SUPABASE_DB_URL?.trim();
if (!url) {
  fail("SUPABASE_DB_URL is not set. Add it as a GitHub Actions repository secret: Supabase dashboard → Connect → Session pooler connection string, with your database password filled in.");
}
if (/@db\.[a-z0-9]+\.supabase\.co\b/i.test(url)) {
  console.warn("This is Supabase's direct connection, which is IPv6-only. GitHub Actions needs the Session pooler connection string instead.");
}

function psqlRun(args, label) {
  const result = spawnSync(psql, [url, "-X", "-q", "-v", "ON_ERROR_STOP=1", ...args], {
    encoding: "utf8",
    env: { ...process.env, PGCLIENTENCODING: "UTF8" },
  });
  if (result.error) fail(`Could not run psql (${result.error.message}). Install the PostgreSQL client or set PSQL_PATH.`);
  if (result.status !== 0) fail(`${label} failed:\n${result.stderr.trim()}`);
  return result.stdout;
}

function query(sql, label) {
  return psqlRun(["-A", "-t", "-c", sql], label).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

const local = readdirSync(MIGRATIONS)
  .map((file) => /^(\d+)_([a-z0-9_]+)\.sql$/i.exec(file))
  .filter(Boolean)
  .map(([file, version, name]) => ({ file, version, name }))
  .sort((a, b) => (BigInt(a.version) < BigInt(b.version) ? -1 : 1));
const stray = readdirSync(MIGRATIONS).filter((file) => file.endsWith(".sql") && !local.some((m) => m.file === file));
if (stray.length) fail(`Migration files must be named <number>_<name>.sql: ${stray.join(", ")}`);

const baselineSetting = process.env.MIGRATION_BASELINE ?? JSON.parse(readFileSync("supabase/migration-baseline.json", "utf8")).appliedThrough;
const baseline = baselineSetting === "none" ? null
  : baselineSetting === "latest" ? local.at(-1)?.version ?? null
  : baselineSetting;
if (baseline !== null && !/^\d+$/.test(baseline)) fail(`Invalid migration baseline: ${baseline}`);

const ledgerExists = query("select to_regclass('supabase_migrations.schema_migrations') is not null", "Reading the migration ledger")[0] === "t";
if (!ledgerExists && !dryRun) {
  query(`create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
    select 1`, "Creating the migration ledger");
}
const recorded = new Set(ledgerExists || !dryRun
  ? query("select version from supabase_migrations.schema_migrations", "Reading the migration ledger")
  : []);

const pending = local.filter((migration) => !recorded.has(migration.version));
const adopted = pending.filter((migration) => baseline !== null && BigInt(migration.version) <= BigInt(baseline));
const toApply = pending.filter((migration) => !adopted.includes(migration));

if (adopted.length) {
  console.log(`${dryRun ? "Would record" : "Recording"} ${adopted.length} migration(s) applied by hand before automation: ${adopted.map((m) => m.version).join(", ")}`);
  if (!dryRun) {
    const rows = adopted.map((m) => `('${m.version}', '${m.name}')`).join(", ");
    query(`insert into supabase_migrations.schema_migrations (version, name) values ${rows} on conflict (version) do nothing; select 1`, "Recording the baseline");
  }
}

const workdir = mkdtempSync(join(tmpdir(), "migrate-"));
try {
  for (const migration of toApply) {
    if (dryRun) {
      console.log(`Would apply ${migration.file}`);
      continue;
    }
    // The file's own top-level BEGIN/COMMIT would end our transaction early;
    // the ledger entry must commit together with the migration.
    const body = readFileSync(join(MIGRATIONS, migration.file), "utf8")
      .split(/\r?\n/)
      .filter((line) => !/^\s*(?:begin|commit)(?:\s+(?:transaction|work))?\s*;\s*(?:--.*)?$/i.test(line))
      .join("\n");
    const script = join(workdir, migration.file);
    writeFileSync(script, [
      "begin;",
      "select pg_advisory_xact_lock(hashtext('supabase_migrations'));",
      body,
      `insert into supabase_migrations.schema_migrations (version, name) values ('${migration.version}', '${migration.name}');`,
      "commit;",
    ].join("\n"));
    psqlRun(["-f", script], `Migration ${migration.file}`);
    console.log(`Applied ${migration.file}`);
  }
} finally {
  rmSync(workdir, { recursive: true, force: true });
}

const summary = toApply.length
  ? `${dryRun ? "Would apply" : "Applied"} ${toApply.length} migration(s): ${toApply.map((m) => m.file).join(", ")}`
  : "No new migrations to apply. The database is up to date.";
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Database migrations\n\n${summary}\n${adopted.length ? `\nRecorded as already applied: ${adopted.map((m) => m.version).join(", ")}\n` : ""}`);
}
if (expectApplied !== undefined && Number(expectApplied) !== toApply.length) {
  fail(`Expected ${expectApplied} migration(s) to be applied, but ${toApply.length} were.`);
}
