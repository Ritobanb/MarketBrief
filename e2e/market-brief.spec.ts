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

test("homepage signup and sample brief work", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /market, made clear/i })).toBeVisible();
  await page.getByLabel("Work email").fill("reader@example.com");
  await page.getByRole("button", { name: /get the daily brief/i }).click();
  await expect(page.getByRole("button", { name: /on the list/i })).toBeDisabled();
  await expect(page.getByLabel("Sample daily market brief")).toBeVisible();
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
  await expect(sample).toHaveScreenshot("sample-daily-brief.png", { animations: "disabled" });
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
  await page.getByLabel("Delivery time").all().then(async fields => {
    expect(fields).toHaveLength(3);
  });
  await page.locator("#premarket-time").fill("07:30");
  await page.getByLabel("Time zone").selectOption("America/Vancouver");
  await page.getByRole("switch", { name: "Weekly Market Recap notification" }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await expect(page.getByText("Canadian markets · US markets")).toBeVisible();
  await expect(page.getByText("Balanced", { exact: true })).toBeVisible();
  await expect(page.getByText("Beginner-friendly", { exact: true })).toBeVisible();
  await expect(page.getByText(/Watchlist: SHOP \(NASDAQ\)/)).toBeVisible();
  await expect(page.getByText("Daily Market Brief — 07:00")).toBeVisible();
  await expect(page.getByText("Premarket Brief — 07:30")).toBeVisible();
  await expect(page.getByText("Weekly Market Recap", { exact: true })).not.toBeVisible();
  await expect(page.getByText("America/Vancouver", { exact: true })).toBeVisible();
  await expectWizardActionInViewport(page, /finish setup/i);
  await page.getByRole("button", { name: /back/i }).click();
  await expect(page.getByRole("switch", { name: "Premarket Brief notification" })).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("#premarket-time")).toHaveValue("07:30");
  await expect(page.getByLabel("Time zone")).toHaveValue("America/Vancouver");
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: /finish setup/i }).click();
  await expect(page.getByRole("heading", { name: "Your brief is ready." })).toBeVisible();
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
  const status = await request.get("/api/admin/instruments/status");
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
