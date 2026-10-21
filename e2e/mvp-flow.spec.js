import { expect, test } from "@playwright/test";

const PLACE_TITLE = "E2E Browser Space";
const PARTNER_PHONE = "+998901110001";
const CLIENT_PHONE = "+998901110002";

async function loginWithDevOtp(page, phone, firstName, lastName) {
  await page.goto("/login");
  await page.getByTestId("auth-phone").fill(phone);
  await page.getByTestId("auth-send-otp").click();
  await expect(page.getByTestId("auth-otp-0")).toBeVisible();
  for (let index = 0; index < 6; index += 1) {
    await page.getByTestId(`auth-otp-${index}`).fill("1");
  }
  await page.getByTestId("auth-otp-submit").click();

  const firstNameInput = page.getByTestId("auth-first-name");
  await expect(firstNameInput).toBeVisible();
  await firstNameInput.fill(firstName);
  await page.getByTestId("auth-last-name").fill(lastName);
  await page.getByTestId("auth-profile-submit").click();

  await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem("joyzone-access")))).toBe(true);
  await expect(page).toHaveURL(/:4173.(#.*)?$/);
}

async function completeCardPayment(page, prefix = "payment") {
  await page.getByTestId(`${prefix}-card-number`).fill("8600123412341234");
  await page.getByTestId(`${prefix}-card-holder`).fill("E2E USER");
  await page.getByTestId(`${prefix}-expiry`).fill("1230");
  await page.getByTestId(`${prefix}-cvv`).fill("123");
  await page.getByTestId(prefix === "payment" ? "payment-submit" : "checkout-pay").click();
}

async function createPlaceThroughOnboarding(page) {
  await page.goto("/partner");
  await page.getByTestId("onboarding-start").click();
  await page.getByTestId("onboarding-selection-kovorking").click();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-selection-hot-desk").click();
  await page.getByTestId("onboarding-next").click();

  await page.getByTestId("onboarding-address").fill("Tashkent, E2E Street 1");
  await page.getByTestId("onboarding-address-confirm").click();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-street").fill("E2E Street 1");
  await page.getByTestId("onboarding-next").click();

  const tinyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  await page.getByTestId("onboarding-photos").setInputFiles(
    Array.from({ length: 4 }, (_, index) => ({
      name: `e2e-space-${index + 1}.png`,
      mimeType: "image/png",
      buffer: tinyPng,
    })),
  );
  await page.getByTestId("onboarding-next").click();

  await page.getByTestId("onboarding-title").fill(PLACE_TITLE);
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-description-ru").fill("Тестовое пространство, созданное браузерным E2E сценарием.");
  await page.getByTestId("onboarding-description-tab-uz").click();
  await page.getByTestId("onboarding-description-uz").fill("Brauzer E2E sinovi yaratgan test maydoni.");
  await page.getByTestId("onboarding-description-tab-en").click();
  await page.getByTestId("onboarding-description-en").fill("A test space created by the browser E2E flow.");
  await page.getByTestId("onboarding-next").click();

  await page.getByTestId("onboarding-area").fill("80");
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-price-toggle-kunlik").click();
  await page.getByTestId("onboarding-price-kunlik").fill("250000");
  await page.getByTestId("onboarding-next").click();

  const placeResponsePromise = page.waitForResponse((response) => (
    response.url().endsWith("/api/places/")
    && response.request().method() === "POST"
  ));
  await page.getByTestId("onboarding-publish").click();
  const placeResponse = await placeResponsePromise;
  expect(placeResponse.ok()).toBeTruthy();
  const place = await placeResponse.json();
  expect(place.status).toBe("pending");
  await expect(page.getByTestId("onboarding-toast-success")).toContainText("модерац");
  return place;
}

test("full Joyzone MVP browser flow", async ({ browser }) => {
  const partnerContext = await browser.newContext();
  const partnerPage = await partnerContext.newPage();
  await loginWithDevOtp(partnerPage, PARTNER_PHONE, "E2E", "Partner");

  await partnerPage.goto("/partner-guide");
  await partnerPage.getByTestId("tariff-select-comfort").click();
  await expect(partnerPage.getByTestId("payment-modal")).toBeVisible();
  await completeCardPayment(partnerPage);
  await expect(partnerPage.getByTestId("payment-success")).toBeVisible();

  const place = await createPlaceThroughOnboarding(partnerPage);

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const adminLoginResponse = await adminContext.request.post(
    "http://127.0.0.1:8010/api/auth/dev-admin-login/",
  );
  expect(adminLoginResponse.ok()).toBeTruthy();
  const adminSession = await adminLoginResponse.json();
  await adminPage.goto("/");
  await adminPage.evaluate(async ({ access }) => {
    const { beginAuthSession } = await import("/src/utils/storageKeys.js");
    beginAuthSession(access);
  }, adminSession);
  await adminPage.goto("/admin");
  await expect(adminPage.getByTestId("admin-nav-moderation")).toBeVisible({ timeout: 30_000 });
  await adminPage.getByTestId("admin-nav-moderation").click();
  await expect(adminPage.getByTestId(`moderation-place-${place.id}`)).toContainText(PLACE_TITLE);
  await adminPage.getByTestId(`moderation-approve-${place.id}`).click();
  await expect(adminPage.getByTestId(`moderation-place-${place.id}`)).toBeHidden();

  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  await publicPage.goto("/filter");
  await expect(publicPage.getByTestId(`place-card-${place.id}`)).toContainText(PLACE_TITLE);
  await publicContext.close();

  const clientContext = await browser.newContext();
  const clientPage = await clientContext.newPage();
  await loginWithDevOtp(clientPage, CLIENT_PHONE, "E2E", "Client");

  const start = new Date();
  start.setDate(start.getDate() + 2);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setHours(18, 0, 0, 0);
  const bookingDraft = {
    version: 1,
    created_at: new Date().toISOString(),
    place: place.id,
    place_title: place.title,
    place_snapshot: place,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
    duration_type: "daily",
    slots: [],
    guests: 2,
    amount: 250000,
    currency: "UZS",
    note: "Browser E2E booking",
    pricing: { subtotal: 223214, tax: 26786, amount: 250000, discount: 0, discount_name: null },
    user: null,
  };
  await clientPage.evaluate((draft) => {
    localStorage.setItem("joyzone-pending-booking", JSON.stringify(draft));
  }, bookingDraft);

  const bookingResponsePromise = clientPage.waitForResponse((response) => (
    response.url().endsWith("/api/bookings/")
    && response.request().method() === "POST"
  ));
  await clientPage.goto(`/book-space-${place.id}`);
  await completeCardPayment(clientPage, "checkout");
  const bookingResponse = await bookingResponsePromise;
  expect(bookingResponse.ok()).toBeTruthy();
  const booking = await bookingResponse.json();
  await expect(clientPage.getByTestId("booking-payment-success")).toBeVisible();

  await clientPage.goto("/profile");
  await expect(clientPage.getByTestId("notification-bell")).toBeVisible();
  await clientPage.getByTestId("notification-bell").click();
  await expect(clientPage.locator('[data-testid^="notification-booking_paid-"]')).toHaveCount(1);

  await partnerPage.goto("/host-today");
  await partnerPage.reload();
  await expect(partnerPage.getByTestId(`host-upcoming-booking-${booking.id}`)).toContainText(PLACE_TITLE);
  await partnerPage.getByTestId("notification-bell").click();
  await expect(partnerPage.locator('[data-testid^="notification-booking_paid-"]')).toHaveCount(1);

  await clientContext.close();
  await adminContext.close();
  await partnerContext.close();
});
