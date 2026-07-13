/**
 * Destructive tests must never share a database or schema with real app data.
 * A deliberately named target makes accidental development/production cleanup
 * fail before the application or test hooks can open a database connection.
 */
export function requireIsolatedTestDatabase(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) throw new Error("DATABASE_URL must point to an isolated test database or schema.");
  const url = new URL(databaseUrl);
  const target = `${url.pathname.slice(1)}_${url.searchParams.get("schema") || ""}`;
  if (!/(?:^|[_-])test(?:$|[_-])/.test(target)) {
    throw new Error("Tests require a dedicated database or schema whose name contains 'test'; refusing to access development or production data.");
  }
  return databaseUrl;
}
