import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/#home");
});

test("default timeout is finite and a safe GET can be retried manually", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/client-timeout-test/", async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await new Promise((resolve) => setTimeout(resolve, 2400));
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }).catch(() => {});
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
  });

  const result = await page.evaluate(async () => {
    const { default: api, parseApiError } = await import("/src/api/client.js");
    let parsed;
    try {
      await api.get("/api/client-timeout-test/", { skipAuth: true });
    } catch (error) {
      parsed = parseApiError(error);
    }
    const retry = await api.get("/api/client-timeout-test/", { skipAuth: true });
    return { parsed, retryStatus: retry.status, retryData: retry.data };
  });

  expect(result.parsed).toMatchObject({
    code: "ECONNABORTED",
    isTimeout: true,
    isNetworkError: false,
    isRetryable: true,
    isCanceled: false,
  });
  expect(result.retryStatus).toBe(200);
  expect(result.retryData).toEqual({ ok: true });
  expect(attempts).toBe(2);
});

test("AbortController cancellation is classified as silent cancellation", async ({ page }) => {
  await page.route("**/api/client-abort-test/", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2400));
    await route.fulfill({ status: 200, body: "{}" }).catch(() => {});
  });

  const result = await page.evaluate(async () => {
    const { default: api, parseApiError } = await import("/src/api/client.js");
    const controller = new AbortController();
    const pending = api.get("/api/client-abort-test/", {
      skipAuth: true,
      signal: controller.signal,
    }).catch((error) => parseApiError(error));
    controller.abort();
    return pending;
  });

  expect(result).toMatchObject({
    code: "ERR_CANCELED",
    isCanceled: true,
    isNetworkError: false,
    isRetryable: false,
  });
});

test("offline and validation failures share the normalized error contract", async ({ page }) => {
  await page.route("**/api/client-offline-test/", (route) => route.abort("failed"));
  await page.route("**/api/client-validation-test/", (route) => route.fulfill({
    status: 400,
    contentType: "application/json",
    body: JSON.stringify({ title: ["Required."], people: ["Must be positive."] }),
  }));

  const result = await page.evaluate(async () => {
    const { default: api, parseApiError } = await import("/src/api/client.js");
    const capture = async (promise) => {
      try {
        await promise;
        return null;
      } catch (error) {
        return parseApiError(error);
      }
    };
    return {
      offline: await capture(api.get("/api/client-offline-test/", { skipAuth: true })),
      validation: await capture(api.post("/api/client-validation-test/", {}, { skipAuth: true })),
    };
  });

  expect(result.offline).toMatchObject({
    isNetworkError: true,
    isTimeout: false,
    isRetryable: true,
  });
  expect(result.validation).toMatchObject({
    status: 400,
    isValidationError: true,
    isPermissionError: false,
    isRetryable: false,
    fieldErrors: {
      title: ["Required."],
      people: ["Must be positive."],
    },
  });
});

test("upload requests can opt into the longer timeout", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const {
      API_TIMEOUT_MS,
      API_UPLOAD_TIMEOUT_MS,
      withUploadTimeout,
    } = await import("/src/api/client.js");
    return {
      defaultTimeout: API_TIMEOUT_MS,
      uploadTimeout: API_UPLOAD_TIMEOUT_MS,
      configured: withUploadTimeout({ headers: { "X-Test": "1" } }),
    };
  });

  expect(result.defaultTimeout).toBe(2000);
  expect(result.uploadTimeout).toBe(5000);
  expect(result.configured.timeout).toBe(5000);
  expect(result.configured.headers).toEqual({ "X-Test": "1" });
});
