import { expect, test } from "@playwright/test";

const BACKEND_URL = "http://127.0.0.1:8010";
const CLIENT_ACCOUNT = "public_demo_e2e_client";
const MODERATOR_ACCOUNT = "public_demo_admin_guard_moderator";
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD || "e2e-only-demo-secret-4f8d2a";

async function demoLogin(request, account) {
  const response = await request.post(`${BACKEND_URL}/api/auth/demo-login/`, {
    data: { account, password: DEMO_PASSWORD },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function adminLogin(request) {
  const response = await request.post(`${BACKEND_URL}/api/auth/dev-admin-login/`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function setUserRole(request, adminAccess, username, role) {
  const listResponse = await request.get(`${BACKEND_URL}/api/auth/users/`, {
    headers: { Authorization: `Bearer ${adminAccess}` },
  });
  expect(listResponse.ok()).toBeTruthy();
  const payload = await listResponse.json();
  const users = payload.results || payload;
  const user = users.find((item) => item.username === username);
  expect(user).toBeTruthy();
  const updateResponse = await request.patch(`${BACKEND_URL}/api/auth/users/${user.id}/`, {
    headers: { Authorization: `Bearer ${adminAccess}` },
    data: { role },
  });
  expect(updateResponse.ok()).toBeTruthy();
}

async function installSession(page, session, adminPage = null) {
  await page.goto("/");
  await page.evaluate(async ({ access, adminPage: targetPage }) => {
    const { beginAuthSession } = await import("/src/utils/storageKeys.js");
    beginAuthSession(access);
    if (targetPage) localStorage.setItem("joyzone-admin-page", targetPage);
  }, { ...session, adminPage });
}

test.describe.serial("admin route guard", () => {
  let adminSession;
  let moderatorSession;

  test.beforeAll(async ({ request }) => {
    moderatorSession = await demoLogin(request, MODERATOR_ACCOUNT);
    adminSession = await adminLogin(request);
    await setUserRole(request, adminSession.access, MODERATOR_ACCOUNT, "moderator");
  });

  test.afterAll(async ({ request }) => {
    await setUserRole(request, adminSession.access, MODERATOR_ACCOUNT, "client");
  });

  test("guest deep link never mounts the admin shell or calls private admin APIs", async ({ page }) => {
    const privateCalls = [];
    page.on("request", (request) => {
      if (/\/api\/(?:admin\/overview|finance|audit-logs|auth\/users)/.test(request.url())) {
        privateCalls.push(request.url());
      }
    });

    await page.goto("/admin");
    await expect(page.getByTestId("admin-access-unauthenticated")).toBeVisible();
    await expect(page.locator(".adm-shell")).toHaveCount(0);
    expect(privateCalls).toEqual([]);
  });

  test("client cannot mount the admin shell", async ({ page, request }) => {
    const clientSession = await demoLogin(request, CLIENT_ACCOUNT);
    await installSession(page, clientSession);
    await page.goto("/admin");

    await expect(page.getByTestId("admin-access-forbidden")).toBeVisible();
    await expect(page.locator(".adm-shell")).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => localStorage.getItem("joyzone-admin-page"))).toBeNull();
  });

  test("moderator gets the operational shell but cannot mount finance", async ({ page }) => {
    let financeCalls = 0;
    page.on("request", (request) => {
      if (request.url().includes("/api/finance/")) financeCalls += 1;
    });
    await installSession(page, moderatorSession, "finance");
    await page.goto("/admin");

    await expect(page.locator(".adm-shell")).toBeVisible();
    await expect(page.getByTestId("admin-nav-finance")).toHaveCount(0);
    await expect(page.locator(".adm-topbar-title")).toHaveText("Обзор");
    expect(financeCalls).toBe(0);
    await expect.poll(() => page.evaluate(() => localStorage.getItem("joyzone-admin-page"))).toBe("overview");
  });

  test("server-side role loss unmounts an open admin shell", async ({ page, request }) => {
    await installSession(page, moderatorSession, "moderation");
    await page.goto("/admin");
    await expect(page.locator(".adm-shell")).toBeVisible();

    await setUserRole(request, adminSession.access, MODERATOR_ACCOUNT, "client");
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));

    await expect(page.getByTestId("admin-access-forbidden")).toBeVisible();
    await expect(page.locator(".adm-shell")).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => localStorage.getItem("joyzone-admin-page"))).toBeNull();
    await setUserRole(request, adminSession.access, MODERATOR_ACCOUNT, "moderator");
  });

  test("staff admin mounts the shell and logout unmounts it immediately", async ({ page }) => {
    await installSession(page, adminSession);
    await page.goto("/admin");
    await expect(page.locator(".adm-shell")).toBeVisible();
    await expect(page.getByTestId("admin-nav-finance")).toBeVisible();

    await page.evaluate(async () => {
      const { logoutSession } = await import("/src/api/client.js");
      await logoutSession();
    });

    await expect(page.getByTestId("admin-access-unauthenticated")).toBeVisible();
    await expect(page.locator(".adm-shell")).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => localStorage.getItem("joyzone-admin-page"))).toBeNull();
  });
});
