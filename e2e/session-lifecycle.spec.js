import { expect, test } from "@playwright/test";

const BACKEND_URL = "http://127.0.0.1:8010";
const DEMO_ACCOUNT = "public_demo_e2e_client";
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD || "e2e-only-demo-secret-4f8d2a";

async function createBrowserSession(page) {
  const response = await page.request.post(`${BACKEND_URL}/api/auth/demo-login/`, {
    data: { account: DEMO_ACCOUNT, password: DEMO_PASSWORD },
  });
  expect(response.ok()).toBeTruthy();
  const session = await response.json();

  await page.goto("/#home");
  await page.evaluate(({ access, refresh }) => {
    localStorage.setItem("joyzone-access", access);
    localStorage.setItem("joyzone-refresh", refresh);
  }, session);
  return session;
}

test("concurrent 401 responses share one refresh and persist rotation", async ({ page }) => {
  const original = await createBrowserSession(page);
  let refreshRequests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/auth/token/refresh/")) refreshRequests += 1;
  });

  const result = await page.evaluate(async () => {
    localStorage.setItem("joyzone-access", "expired-for-e2e");
    const { default: api } = await import("/src/api/client.js");
    const responses = await Promise.all([
      api.get("/api/auth/profile/"),
      api.get("/api/auth/profile/"),
    ]);
    return {
      statuses: responses.map((response) => response.status),
      access: localStorage.getItem("joyzone-access"),
      refresh: localStorage.getItem("joyzone-refresh"),
    };
  });

  expect(result.statuses).toEqual([200, 200]);
  expect(refreshRequests).toBe(1);
  expect(result.access).toBeTruthy();
  expect(result.refresh).toBeTruthy();
  expect(result.refresh).not.toBe(original.refresh);

  const replay = await page.request.post(`${BACKEND_URL}/api/auth/token/refresh/`, {
    data: { refresh: original.refresh },
  });
  expect(replay.status()).toBe(401);
});

test("frontend logout revokes refresh and clears both canonical keys", async ({ page }) => {
  await createBrowserSession(page);
  const beforeLogout = await page.evaluate(() => ({
    access: localStorage.getItem("joyzone-access"),
    refresh: localStorage.getItem("joyzone-refresh"),
  }));

  const result = await page.evaluate(async () => {
    const { logoutSession } = await import("/src/api/client.js");
    const logoutResult = await logoutSession();
    return {
      ...logoutResult,
      access: localStorage.getItem("joyzone-access"),
      refresh: localStorage.getItem("joyzone-refresh"),
    };
  });

  expect(result.revoked).toBe(true);
  expect(result.access).toBeNull();
  expect(result.refresh).toBeNull();

  const refreshAfterLogout = await page.request.post(
    `${BACKEND_URL}/api/auth/token/refresh/`,
    { data: { refresh: beforeLogout.refresh } },
  );
  expect(refreshAfterLogout.status()).toBe(401);

  const repeatedLogout = await page.request.post(`${BACKEND_URL}/api/auth/logout/`, {
    headers: { Authorization: `Bearer ${beforeLogout.access}` },
    data: { refresh: beforeLogout.refresh },
  });
  expect(repeatedLogout.ok()).toBeTruthy();
});

test("refresh 500 keeps tokens, emits one retryable event, and can recover", async ({ page }) => {
  const original = await createBrowserSession(page);
  let refreshRequests = 0;
  await page.route("**/api/auth/token/refresh/", async (route) => {
    refreshRequests += 1;
    await route.fulfill({ status: 500, contentType: "application/json", body: '{"detail":"temporary"}' });
  });

  const outage = await page.evaluate(async () => {
    const sessionErrors = [];
    let expiredEvents = 0;
    window.addEventListener("joyzone-session-error", (event) => sessionErrors.push(event.detail));
    window.addEventListener("joyzone-session-expired", () => { expiredEvents += 1; });
    localStorage.setItem("joyzone-access", "expired-for-500-e2e");
    const { default: api } = await import("/src/api/client.js");
    const results = await Promise.allSettled([
      api.get("/api/auth/profile/"),
      api.get("/api/auth/profile/"),
    ]);
    return {
      rejected: results.filter((result) => result.status === "rejected").length,
      sessionErrors,
      expiredEvents,
      access: localStorage.getItem("joyzone-access"),
      refresh: localStorage.getItem("joyzone-refresh"),
    };
  });

  expect(outage.rejected).toBe(2);
  expect(refreshRequests).toBe(1);
  expect(outage.access).toBe("expired-for-500-e2e");
  expect(outage.refresh).toBe(original.refresh);
  expect(outage.expiredEvents).toBe(0);
  expect(outage.sessionErrors).toHaveLength(1);
  expect(outage.sessionErrors[0]).toMatchObject({
    reason: "refresh_unavailable",
    retryable: true,
    status: 500,
  });
  await expect(page.getByTestId("session-notice")).toContainText("повторите действие");

  await page.unroute("**/api/auth/token/refresh/");
  const recovered = await page.evaluate(async () => {
    const { default: api } = await import("/src/api/client.js");
    const response = await api.get("/api/auth/profile/");
    return {
      status: response.status,
      access: localStorage.getItem("joyzone-access"),
      refresh: localStorage.getItem("joyzone-refresh"),
    };
  });
  expect(recovered.status).toBe(200);
  expect(recovered.access).not.toBe("expired-for-500-e2e");
  expect(recovered.refresh).not.toBe(original.refresh);
});

test("refresh network failure preserves session for a later retry", async ({ page }) => {
  const original = await createBrowserSession(page);
  let refreshRequests = 0;
  await page.route("**/api/auth/token/refresh/", async (route) => {
    refreshRequests += 1;
    await route.abort("failed");
  });

  const result = await page.evaluate(async () => {
    const sessionErrors = [];
    let expiredEvents = 0;
    window.addEventListener("joyzone-session-error", (event) => sessionErrors.push(event.detail));
    window.addEventListener("joyzone-session-expired", () => { expiredEvents += 1; });
    localStorage.setItem("joyzone-access", "expired-for-network-e2e");
    const { default: api } = await import("/src/api/client.js");
    await api.get("/api/auth/profile/").catch(() => null);
    return {
      sessionErrors,
      expiredEvents,
      access: localStorage.getItem("joyzone-access"),
      refresh: localStorage.getItem("joyzone-refresh"),
    };
  });

  expect(refreshRequests).toBe(1);
  expect(result.access).toBe("expired-for-network-e2e");
  expect(result.refresh).toBe(original.refresh);
  expect(result.expiredEvents).toBe(0);
  expect(result.sessionErrors).toHaveLength(1);
  expect(result.sessionErrors[0]).toMatchObject({
    reason: "refresh_unavailable",
    retryable: true,
    status: null,
  });
});

test("refresh timeout preserves tokens and reports a retryable outage", async ({ page }) => {
  const original = await createBrowserSession(page);
  await page.route("**/api/auth/token/refresh/", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 750));
    await route.abort("timedout").catch(() => {});
  });

  const result = await page.evaluate(async () => {
    const sessionErrors = [];
    window.addEventListener("joyzone-session-error", (event) => sessionErrors.push(event.detail));
    localStorage.setItem("joyzone-access", "expired-for-timeout-e2e");
    const { default: api } = await import("/src/api/client.js");
    await api.get("/api/auth/profile/").catch(() => null);
    return {
      sessionErrors,
      access: localStorage.getItem("joyzone-access"),
      refresh: localStorage.getItem("joyzone-refresh"),
    };
  });

  expect(result.access).toBe("expired-for-timeout-e2e");
  expect(result.refresh).toBe(original.refresh);
  expect(result.sessionErrors).toHaveLength(1);
  expect(result.sessionErrors[0]).toMatchObject({
    reason: "refresh_unavailable",
    retryable: true,
    status: null,
    code: "ECONNABORTED",
  });
});

test("invalid refresh clears auth and emits session expired", async ({ page }) => {
  await createBrowserSession(page);
  let refreshRequests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/auth/token/refresh/")) refreshRequests += 1;
  });

  const result = await page.evaluate(async () => {
    const sessionErrors = [];
    const expiredEvents = [];
    window.addEventListener("joyzone-session-error", (event) => sessionErrors.push(event.detail));
    window.addEventListener("joyzone-session-expired", (event) => expiredEvents.push(event.detail));
    localStorage.setItem("joyzone-access", "expired-for-invalid-refresh-e2e");
    localStorage.setItem("joyzone-refresh", "invalid-refresh-e2e");
    const { default: api } = await import("/src/api/client.js");
    await api.get("/api/auth/profile/").catch(() => null);
    return {
      sessionErrors,
      expiredEvents,
      access: localStorage.getItem("joyzone-access"),
      refresh: localStorage.getItem("joyzone-refresh"),
    };
  });

  expect(refreshRequests).toBe(1);
  expect(result.access).toBeNull();
  expect(result.refresh).toBeNull();
  expect(result.sessionErrors).toHaveLength(0);
  expect(result.expiredEvents).toEqual([{ reason: "refresh_invalid" }]);
});

test("uncertain non-idempotent network failure is never replayed", async ({ page }) => {
  const original = await createBrowserSession(page);
  let bookingRequests = 0;
  let refreshRequests = 0;
  await page.route("**/api/bookings/", async (route) => {
    bookingRequests += 1;
    await route.abort("failed");
  });
  page.on("request", (request) => {
    if (request.url().endsWith("/api/auth/token/refresh/")) refreshRequests += 1;
  });

  const result = await page.evaluate(async () => {
    const { default: api } = await import("/src/api/client.js");
    await api.post("/api/bookings/", { place: 1 }).catch(() => null);
    return {
      access: localStorage.getItem("joyzone-access"),
      refresh: localStorage.getItem("joyzone-refresh"),
    };
  });

  expect(bookingRequests).toBe(1);
  expect(refreshRequests).toBe(0);
  expect(result.access).toBe(original.access);
  expect(result.refresh).toBe(original.refresh);
});
