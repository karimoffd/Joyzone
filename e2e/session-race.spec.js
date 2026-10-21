import { expect, test } from "@playwright/test";

const BACKEND_URL = "http://127.0.0.1:8010";

const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD || "e2e-only-demo-secret-4f8d2a";

async function createDemoSession(request, account, firstName) {
  const verify = await request.post(`${BACKEND_URL}/api/auth/demo-login/`, {
    data: { account, password: DEMO_PASSWORD },
  });
  expect(verify.ok()).toBeTruthy();
  const session = await verify.json();

  const profileResponse = await request.patch(`${BACKEND_URL}/api/auth/profile/`, {
    headers: { Authorization: `Bearer ${session.access}` },
    data: { first_name: firstName, last_name: "Race" },
  });
  expect(profileResponse.ok()).toBeTruthy();
  return { ...session, profile: await profileResponse.json() };
}

async function installSession(page, session) {
  await page.evaluate(async ({ access, profile }) => {
    const storage = await import("/src/utils/storageKeys.js");
    const profiles = await import("/src/utils/profileMapper.js");
    storage.beginAuthSession(access);
    profiles.cacheProfile(profile);
  }, session);
}

test("late profile from account A cannot overwrite account B", async ({ page, request }) => {
  const accountA = await createDemoSession(request, "public_demo_race_a", "Account A");
  const accountB = await createDemoSession(request, "public_demo_race_b", "Account B");
  await page.goto("/");
  await installSession(page, accountA);

  let releaseProfile;
  let markProfileStarted;
  const profileStarted = new Promise((resolve) => { markProfileStarted = resolve; });
  const profileGate = new Promise((resolve) => { releaseProfile = resolve; });
  await page.route("**/api/auth/profile/", async (route) => {
    markProfileStarted();
    await profileGate;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(accountA.profile) });
  });

  await page.evaluate(() => {
    window.__lateProfileResult = (async () => {
      const { default: api } = await import("/src/api/client.js");
      const { cacheProfile } = await import("/src/utils/profileMapper.js");
      try {
        const response = await api.get("/api/auth/profile/");
        cacheProfile(response.data);
        return "applied";
      } catch (error) {
        return error.code;
      }
    })();
  });
  await profileStarted;

  await page.evaluate(async (sessionB) => {
    const { logoutSession } = await import("/src/api/client.js");
    const storage = await import("/src/utils/storageKeys.js");
    const profiles = await import("/src/utils/profileMapper.js");
    await logoutSession().catch(() => null);
    storage.beginAuthSession(sessionB.access);
    profiles.cacheProfile(sessionB.profile);
    storage.setStorageItem(storage.STORAGE_KEYS.booking.active, JSON.stringify({ id: "booking-b" }));
    storage.setStorageItem(storage.STORAGE_KEYS.offline.favorites, JSON.stringify([{ id: "favorite-b" }]));
    storage.setStorageItem(storage.STORAGE_KEYS.offline.chats, JSON.stringify([{ id: "chat-b" }]));
  }, accountB);

  releaseProfile();
  const result = await page.evaluate(async () => ({
    lateResult: await window.__lateProfileResult,
    access: localStorage.getItem("joyzone-access"),
    refresh: localStorage.getItem("joyzone-refresh"),
    name: localStorage.getItem("joyzone-name"),
    booking: localStorage.getItem("joyzone-booking"),
    favorites: localStorage.getItem("joyzone-favorite-places"),
    chats: localStorage.getItem("joyzone-shared-chats"),
  }));

  expect(result.lateResult).toBe("JOYZONE_SESSION_CHANGED");
  expect(result.access).toBe(accountB.access);
  expect(result.refresh).toBeNull();
  expect(result.name).toContain("Account B");
  expect(result.booking).toContain("booking-b");
  expect(result.favorites).toContain("favorite-b");
  expect(result.chats).toContain("chat-b");
  expect(result.name).not.toContain("Account A");
});

test("late refresh from account A cannot restore tokens after account B login", async ({ page, request }) => {
  const accountA = await createDemoSession(request, "public_demo_race_a", "Refresh A");
  const accountB = await createDemoSession(request, "public_demo_race_b", "Refresh B");
  await page.goto("/");
  await installSession(page, accountA);

  let releaseRefresh;
  let markRefreshStarted;
  const refreshStarted = new Promise((resolve) => { markRefreshStarted = resolve; });
  const refreshGate = new Promise((resolve) => { releaseRefresh = resolve; });
  await page.route("**/api/auth/token/refresh/", async (route) => {
    markRefreshStarted();
    await refreshGate;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access: "late-access-a", refresh: "late-refresh-a" }),
    });
  });

  await page.evaluate(() => {
    localStorage.setItem("joyzone-access", "expired-account-a");
    window.__lateRefreshResult = (async () => {
      const { default: api } = await import("/src/api/client.js");
      try {
        await api.get("/api/auth/profile/");
        return "applied";
      } catch (error) {
        return error.code;
      }
    })();
  });
  await refreshStarted;

  await page.evaluate(async (sessionB) => {
    const { logoutSession } = await import("/src/api/client.js");
    const storage = await import("/src/utils/storageKeys.js");
    const profiles = await import("/src/utils/profileMapper.js");
    await logoutSession().catch(() => null);
    storage.beginAuthSession(sessionB.access);
    profiles.cacheProfile(sessionB.profile);
  }, accountB);

  releaseRefresh();
  const result = await page.evaluate(async () => ({
    lateResult: await window.__lateRefreshResult,
    access: localStorage.getItem("joyzone-access"),
    refresh: localStorage.getItem("joyzone-refresh"),
    name: localStorage.getItem("joyzone-name"),
  }));

  expect(result.lateResult).toBe("JOYZONE_SESSION_CHANGED");
  expect(result.access).toBe(accountB.access);
  expect(result.refresh).toBeNull();
  expect(result.name).toContain("Refresh B");
  expect(result.access).not.toBe("late-access-a");
});

test("logout synchronizes across tabs while preserving UI and guest preferences", async ({ context }) => {
  // context.request shares cookies with the tabs, so logout can revoke the refresh cookie.
  const accountA = await createDemoSession(context.request, "public_demo_race_a", "Two Tabs");
  const pageA = await context.newPage();
  const pageB = await context.newPage();
  await Promise.all([pageA.goto("/"), pageB.goto("/profile")]);

  await pageB.evaluate(() => {
    window.__sessionGenerationEvents = 0;
    window.addEventListener("storage", (event) => {
      if (event.key === "joyzone-session-generation") window.__sessionGenerationEvents += 1;
    });
  });
  await installSession(pageA, accountA);
  await expect.poll(() => pageB.evaluate(() => localStorage.getItem("joyzone-access"))).toBe(accountA.access);
  await pageB.evaluate(() => { window.__sessionGenerationEvents = 0; });

  await pageA.evaluate(() => {
    localStorage.setItem("joyzone-lang", "ru");
    localStorage.setItem("joyzone-currency", "USD");
    localStorage.setItem("joyzone-user-token", "guest-token-stable");
    localStorage.setItem("joyzone-booking", '{"id":"account-a-booking"}');
    localStorage.setItem("joyzone-favorite-places", '[{"id":"account-a-favorite"}]');
    localStorage.setItem("joyzone-shared-chats", '[{"id":"account-a-chat"}]');
  });

  await pageA.evaluate(async () => {
    const { logoutSession } = await import("/src/api/client.js");
    await logoutSession();
  });

  await expect(pageB).toHaveURL(/login$/);
  const state = await pageB.evaluate(() => ({
    generationEvents: window.__sessionGenerationEvents,
    access: localStorage.getItem("joyzone-access"),
    refresh: localStorage.getItem("joyzone-refresh"),
    profileName: localStorage.getItem("joyzone-name"),
    booking: localStorage.getItem("joyzone-booking"),
    favorites: localStorage.getItem("joyzone-favorite-places"),
    chats: localStorage.getItem("joyzone-shared-chats"),
    language: localStorage.getItem("joyzone-lang"),
    currency: localStorage.getItem("joyzone-currency"),
    guestToken: localStorage.getItem("joyzone-user-token"),
  }));

  expect(state.generationEvents).toBeGreaterThan(0);
  expect(state.access).toBeNull();
  expect(state.refresh).toBeNull();
  expect(state.profileName).toBeNull();
  expect(state.booking).toBeNull();
  expect(state.favorites).toBeNull();
  expect(state.chats).toBeNull();
  expect(state.language).toBe("ru");
  expect(state.currency).toBe("USD");
  expect(state.guestToken).toBe("guest-token-stable");
});
