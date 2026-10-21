import { expect, test } from "@playwright/test";

const DEMO_ACCOUNT = "public_demo_e2e_client";
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD || "e2e-only-demo-secret-4f8d2a";

test("allowlisted public demo account can sign in without OTP", async ({ page }) => {
  await page.goto("/#login");
  await expect(page.getByTestId("demo-login-open")).toBeVisible();
  await page.getByTestId("demo-login-open").click();
  await page.getByTestId("demo-account").fill(DEMO_ACCOUNT);
  await page.getByTestId("demo-password").fill(DEMO_PASSWORD);
  await page.getByTestId("demo-login-submit").click();

  await expect(page).toHaveURL(/#home/);
  const session = await page.evaluate(() => ({
    access: localStorage.getItem("joyzone-access"),
    refresh: localStorage.getItem("joyzone-refresh"),
  }));
  expect(session.access).toBeTruthy();
  expect(session.refresh).toBeTruthy();

  const profileResponse = await page.request.get("http://127.0.0.1:8010/api/auth/profile/", {
    headers: { Authorization: `Bearer ${session.access}` },
  });
  expect(profileResponse.ok()).toBeTruthy();
  const profile = await profileResponse.json();
  expect(profile.username).toBe(DEMO_ACCOUNT);
  expect(profile.role).toBe("client");
  expect(profile.is_staff).toBe(false);
  expect(profile.is_superuser).toBe(false);
});

test("non-allowlisted account cannot use public demo login", async ({ request }) => {
  const response = await request.post("http://127.0.0.1:8010/api/auth/demo-login/", {
    data: {
      account: "demo_admin",
      password: "admin12345",
    },
  });

  expect(response.status()).toBe(403);
  const payload = await response.json();
  expect(payload.access).toBeUndefined();
  expect(payload.refresh).toBeUndefined();
});
