import { describe, expect, it } from "vitest";
import { hashAdminPassword, verifyAdminPassword } from "../lib/admin-auth";

describe("admin password security", () => {
  it("stores a salted hash and verifies only the correct password", async () => {
    const hash = await hashAdminPassword("a-strong-test-password");
    expect(hash).toMatch(/^scrypt-v1\$/);
    expect(hash).not.toContain("a-strong-test-password");
    expect(await verifyAdminPassword("a-strong-test-password", hash)).toBe(true);
    expect(await verifyAdminPassword("wrong-password", hash)).toBe(false);
  });

  it("uses a different salt for each password hash", async () => {
    expect(await hashAdminPassword("same-password-value")).not.toBe(await hashAdminPassword("same-password-value"));
  });
});
