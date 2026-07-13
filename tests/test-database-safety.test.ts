import { describe, expect, it } from "vitest";
import { requireIsolatedTestDatabase } from "./helpers/test-database";

describe("test database safety", () => {
  it.each([
    "postgresql://user:pass@localhost:5432/marketbrief_test",
    "postgresql://user:pass@localhost:5432/marketbrief?schema=marketbrief_test",
  ])("allows an explicitly named test target", databaseUrl => {
    expect(requireIsolatedTestDatabase(databaseUrl)).toBe(databaseUrl);
  });

  it.each([
    "postgresql://user:pass@localhost:5432/marketbrief",
    "postgresql://user:pass@localhost:5432/marketbrief?schema=public",
    "postgresql://user:pass@production.example.com:5432/marketbrief",
  ])("blocks a non-test target before cleanup", databaseUrl => {
    expect(() => requireIsolatedTestDatabase(databaseUrl)).toThrow(/refusing to access development or production data/);
  });
});
