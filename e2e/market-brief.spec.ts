import { expect, test } from "@playwright/test";

async function expectPageDesignIsHealthy(page: import("@playwright/test").Page) {
  const design = await page.evaluate(() => ({
    bodyFont: getComputedStyle(document.body).fontFamily,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(design.bodyFont).toContain("Helvetica Neue");
  expect(design.overflow).toBeLessThanOrEqual(1);
}

async function expectWizardActionInViewport(page: import("@playwright/test").Page, name: RegExp) {
  const button = page.getByRole("button", { name });
  const box = await button.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
}

async function loginAdmin(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill("admin-e2e@example.com");
  await page.getByLabel("Password").fill("e2e-secure-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/subscribers$/);
}

test("homepage signup and sample brief work", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /market, made clear/i })).toBeVisible();
  const personalizedCta = page.getByRole("link", { name: /personalize my brief/i });
  await expect(personalizedCta).toBeVisible();
  await expect(page.getByText("Want a brief built around you?")).toBeVisible();
  if ((page.viewportSize()?.width || 0) > 700) {
    await expect(page.locator(".heroMarketVisual")).toBeVisible();
  }
  const ctaBox = await personalizedCta.boundingBox();
  expect(ctaBox).not.toBeNull();
  expect(ctaBox!.y + ctaBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.getByLabel("Work email").fill("reader@example.com");
  await page.getByRole("button", { name: /get the daily brief/i }).click();
  await expect(page.getByRole("button", { name: /on the list/i })).toBeDisabled();
  await expect(page.getByLabel("Sample daily market brief")).toBeVisible();
  if ((page.viewportSize()?.width || 0) > 1100) {
    await expect(page.locator(".readingStamp")).toBeVisible();
    await expect(page.locator(".openingMotif")).toBeVisible();
  }
  const sample = page.getByTestId("sample-brief");
  const sampleDesign = await sample.evaluate(element => {
    const style = getComputedStyle(element);
    const headerStyle = getComputedStyle(element.querySelector("header")!);
    return { background: style.backgroundColor, border: style.borderTopWidth, padding: style.paddingTop, headerDisplay: headerStyle.display };
  });
  expect(sampleDesign.background).toBe("rgb(251, 250, 246)");
  expect(sampleDesign.border).toBe("1px");
  expect(Number.parseFloat(sampleDesign.padding)).toBeGreaterThanOrEqual(22);
  expect(sampleDesign.headerDisplay).toBe("flex");
  await expect(sample).toHaveScreenshot("sample-daily-brief.png", { animations: "disabled", maxDiffPixels: 500 });
  await expectPageDesignIsHealthy(page);
  await page.getByRole("link", { name: /personalize your brief/i }).click();
  await expect(page).toHaveURL(/\/setup$/);
  const closeSetup = page.getByRole("link", { name: "Close personalization setup and return home" });
  await expect(closeSetup).toBeVisible();
  await closeSetup.click();
  await expect(page).toHaveURL(/\/$/);
});

test("setup exposes defaults, toggles, and a final summary", async ({ page }) => {
  await page.goto("/setup");
  await expectPageDesignIsHealthy(page);
  const titleDesign = await page.getByRole("heading", { name: "Set your market focus." }).evaluate(element => {
    const style = getComputedStyle(element);
    return { font: style.fontFamily, size: Number.parseFloat(style.fontSize), lineHeight: style.lineHeight };
  });
  expect(titleDesign.font).toContain("Georgia");
  expect(titleDesign.size).toBeGreaterThanOrEqual(48);
  expect(titleDesign.lineHeight).not.toBe("normal");
  await expectWizardActionInViewport(page, /continue/i);
  await expect(page.getByRole("button", { name: /^Canadian markets$/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /^US markets$/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Briefing style")).toHaveValue("Balanced");
  await expect(page.getByLabel("Experience level")).toHaveValue("Beginner-friendly");
  await page.getByRole("button", { name: /continue/i }).click();
  const contentOptions = page.getByTestId("content-options");
  await expectWizardActionInViewport(page, /continue/i);
  const optionDesign = await contentOptions.evaluate(element => {
    const style = getComputedStyle(element);
    const firstOption = getComputedStyle(element.querySelector("button")!);
    return { display: style.display, gap: style.gap, optionDisplay: firstOption.display, optionBackground: firstOption.backgroundColor };
  });
  expect(optionDesign).toEqual({ display: "grid", gap: "11px", optionDisplay: "flex", optionBackground: "rgb(255, 255, 255)" });
  await expect(page.locator(".setupWrap")).toHaveScreenshot("personalization-options.png", { animations: "disabled" });
  const etfToggle = page.getByRole("button", { name: /ETF ideas to watch/i });
  await etfToggle.click();
  await expect(etfToggle).toHaveAttribute("aria-pressed", "true");
  const instrumentSearch = page.getByRole("combobox", { name: /Watchlist/ });
  await instrumentSearch.fill("NASDAQ:SHOP");
  await expect(page.getByRole("listbox").getByRole("option")).toHaveCount(1);
  await instrumentSearch.press("ArrowDown");
  await instrumentSearch.press("Enter");
  await expect(page.getByLabel("Selected watchlist instruments").getByText("SHOP · NASDAQ")).toBeVisible();
  await instrumentSearch.fill("NASDAQ:SHOP");
  await expect(page.getByRole("listbox").getByRole("option")).toHaveCount(1);
  await instrumentSearch.press("ArrowDown");
  await instrumentSearch.press("Enter");
  await expect(page.getByLabel("Selected watchlist instruments").locator(".watchlistTag")).toHaveCount(1);
  await page.getByRole("button", { name: /continue/i }).click();
  await expect(page.getByRole("heading", { name: "Choose your notifications." })).toBeVisible();
  await expect(page.getByRole("switch", { name: "Daily Market Brief notification" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("switch", { name: "Weekly Market Recap notification" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("switch", { name: "Premarket Brief notification" })).toHaveAttribute("aria-checked", "false");
  await expect(page.getByRole("switch", { name: "Market Close Summary notification" })).toHaveAttribute("aria-checked", "false");
  await expect(page.getByLabel("Time zone")).toHaveValue("America/Toronto");
  await expectWizardActionInViewport(page, /continue/i);
  await expectPageDesignIsHealthy(page);
  await expect(page.getByTestId("notification-options")).toHaveScreenshot("notification-options.png", { animations: "disabled" });
  await page.getByRole("switch", { name: "Premarket Brief notification" }).click();
  await page.locator(".notificationTime output").all().then(async fields => {
    expect(fields).toHaveLength(3);
  });
  await expect(page.getByLabel("Premarket Brief delivery time")).toHaveText("8:00 AM");
  await page.getByLabel("Time zone").selectOption("America/Vancouver");
  await page.getByRole("switch", { name: "Weekly Market Recap notification" }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await expect(page.getByText("Canadian markets · US markets")).toBeVisible();
  await expect(page.getByText("Balanced", { exact: true })).toBeVisible();
  await expect(page.getByText("Beginner-friendly", { exact: true })).toBeVisible();
  await expect(page.getByText(/Watchlist: SHOP \(NASDAQ\)/)).toBeVisible();
  await expect(page.getByText("Daily Market Brief — 7:00 AM")).toBeVisible();
  await expect(page.getByText("Premarket Brief — 8:00 AM")).toBeVisible();
  await expect(page.getByText("Weekly Market Recap", { exact: true })).not.toBeVisible();
  await expect(page.getByText("America/Vancouver", { exact: true })).toBeVisible();
  await expectWizardActionInViewport(page, /finish setup/i);
  await page.getByRole("button", { name: /back/i }).click();
  await expect(page.getByRole("switch", { name: "Premarket Brief notification" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByLabel("Premarket Brief delivery time")).toHaveText("8:00 AM");
  await expect(page.getByLabel("Time zone")).toHaveValue("America/Vancouver");
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByLabel("Email address Required").fill("personalized@example.com");
  await page.getByRole("button", { name: /finish setup/i }).click();
  await expect(page.getByRole("heading", { name: "Your brief is ready." })).toBeVisible();
});

test("email fields validate and subscriptions persist", async ({ page, request }) => {
  await page.goto("/");
  await page.getByLabel("Work email").fill("not-an-email");
  await page.getByRole("button", { name: /get the daily brief/i }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await page.getByLabel("Work email").fill("saved-reader@example.com");
  await page.getByRole("button", { name: /get the daily brief/i }).click();
  await expect(page.getByText("weekday brief preferences are saved")).toBeVisible();

  const invalid = await request.post("/api/subscriptions", { data: { email: "bad" } });
  expect(invalid.status()).toBe(422);
});

test("admin can create, view, update, deactivate, and delete subscribers", async ({ page, request }, testInfo) => {
  const marker = `admin-crud-${testInfo.project.name}`;
  const email = `${marker}@example.com`;
  const payload = {
    source: "personalized", email, name: "Admin CRUD",
    markets: ["Canadian markets", "US markets"], briefingStyle: "Balanced", experienceLevel: "Beginner-friendly",
    contentToggles: ["General market overview"], timeZone: "America/Toronto", watchlistInstrumentIds: [],
    notifications: { daily: true, premarket: false, close: false, weekly: true },
  };
  expect((await request.get("/api/admin/subscribers")).status()).toBe(401);
  await loginAdmin(page);
  const adminRequest = page.request;
  expect([200, 201]).toContain((await adminRequest.post("/api/admin/subscribers", { data: payload })).status());
  const listing = await adminRequest.get(`/api/admin/subscribers?q=${marker}`);
  const subscriber = (await listing.json()).subscribers[0];
  expect(subscriber.email).toBe(email);

  await page.getByLabel("Search subscribers").fill(marker);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText(email)).toBeVisible();
  await expectPageDesignIsHealthy(page);

  const updated = { ...payload, name: "Updated Admin", notifications: { daily: false, premarket: true, close: false, weekly: true } };
  expect((await adminRequest.put(`/api/admin/subscribers/${subscriber.id}`, { data: updated })).ok()).toBe(true);
  expect((await adminRequest.patch(`/api/admin/subscribers/${subscriber.id}`, { data: { isActive: false } })).ok()).toBe(true);
  const updatedListing = await adminRequest.get(`/api/admin/subscribers?q=${marker}&active=false`);
  const updatedSubscriber = (await updatedListing.json()).subscribers[0];
  expect(updatedSubscriber.name).toBe("Updated Admin");
  expect(updatedSubscriber.notifications.premarket).toBe(true);
  expect((await adminRequest.delete(`/api/admin/subscribers/${subscriber.id}`)).status()).toBe(204);
  expect((await (await adminRequest.get(`/api/admin/subscribers?q=${marker}`)).json()).total).toBe(0);
});

test("local instrument API searches quickly and reports catalogue status", async ({ request, page }) => {
  await request.get("/api/instruments/search?q=warmup");
  const started = Date.now();
  const response = await request.get("/api/instruments/search?q=nvda");
  expect(response.ok()).toBe(true);
  expect(Date.now() - started).toBeLessThan(500);
  const body = await response.json();
  expect(body.instruments[0].symbol).toBe("NVDA");
  expect(body.instruments.length).toBeLessThanOrEqual(20);
  await loginAdmin(page);
  const status = await page.request.get("/api/admin/instruments/status");
  expect(status.ok()).toBe(true);
  expect((await status.json()).lastSuccessfulRefreshAt).toBeTruthy();
  await page.goto("/admin/catalogue");
  await expect(page.getByRole("heading", { name: "Instrument refresh status." })).toBeVisible();
  await expect(page.getByText("Active instruments", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh free catalogue" })).toBeVisible();
  await expectPageDesignIsHealthy(page);
});

test("setup requires at least one notification", async ({ page }) => {
  await page.goto("/setup");
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("switch", { name: "Daily Market Brief notification" }).click();
  await page.getByRole("switch", { name: "Weekly Market Recap notification" }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await expect(page.getByText("Choose at least one notification to continue.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose your notifications." })).toBeVisible();
  await expectPageDesignIsHealthy(page);
});
