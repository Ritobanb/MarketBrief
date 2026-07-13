import { describe, expect, it } from "vitest";
import { createHomepageSubscription, isValidEmail, TIME_ZONE_OPTIONS, validateSubscriptionInput } from "../lib/subscriptions";

describe("subscription validation", () => {
  it("normalizes a valid homepage email", () => {
    const result = validateSubscriptionInput(createHomepageSubscription(" Reader@Example.COM "));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("reader@example.com");
  });

  it.each(["", "reader", "reader@", "@example.com", "reader@example"])("rejects invalid email %s", email => {
    expect(isValidEmail(email)).toBe(false);
    const result = validateSubscriptionInput(createHomepageSubscription(email));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.email).toBe("Enter a valid email address.");
  });

  it("requires at least one notification and market", () => {
    const input = createHomepageSubscription("reader@example.com");
    const result = validateSubscriptionInput({ ...input, markets: [], notifications: {} });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors).toMatchObject({ markets: expect.any(String), notifications: expect.any(String) });
  });

  it("shows only Toronto and New York in the free-edition timezone dropdown", () => {
    expect(TIME_ZONE_OPTIONS).toEqual(["America/Toronto", "America/New_York"]);
  });
});
