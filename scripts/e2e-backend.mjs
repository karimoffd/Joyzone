import { existsSync, mkdirSync, rmSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { basename, dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const backend = resolve(root, "django_backend");
const runtimeDir = resolve(backend, ".e2e");
const database = resolve(runtimeDir, "db.sqlite3");
// Prefer the uv-style .venv, fall back to the classic venv folder.
const venvPython = (folder) => (process.platform === "win32"
  ? resolve(backend, folder, "Scripts", "python.exe")
  : resolve(backend, folder, "bin", "python"));
const python = [".venv", "venv"].map(venvPython).find((candidate) => existsSync(candidate)) || venvPython("venv");
const publicDemoAccount = "public_demo_e2e_client";
const publicDemoAccounts = [
  publicDemoAccount,
  "public_demo_race_a",
  "public_demo_race_b",
  "public_demo_admin_guard_moderator",
];
const publicDemoPassword = process.env.E2E_DEMO_PASSWORD || "e2e-only-demo-secret-4f8d2a";

if (dirname(runtimeDir) !== backend || basename(runtimeDir) !== ".e2e") {
  throw new Error(`Refusing to clean unexpected E2E runtime path: ${runtimeDir}`);
}
rmSync(runtimeDir, { recursive: true, force: true });
mkdirSync(runtimeDir, { recursive: true });

const env = {
  ...process.env,
  DATABASE_URL: "",
  DEBUG: "true",
  DEV_OTP_ENABLED: "true",
  PUBLIC_DEMO_LOGIN_ENABLED: "true",
  PUBLIC_DEMO_DATA_ISOLATED: "true",
  PUBLIC_DEMO_ACCOUNT_USERNAMES: publicDemoAccounts.join(","),
  PUBLIC_DEMO_ACCOUNT_PREFIX: "public_demo_",
  PUBLIC_DEMO_LOGIN_EXPIRES_AT: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  PUBLIC_DEMO_SESSION_MINUTES: "30",
  PUBLIC_DEMO_LOGIN_RATE: "100/minute",
  E2E_DEMO_PASSWORD: publicDemoPassword,
  ALLOWED_HOSTS: "127.0.0.1,localhost",
  CORS_ALLOWED_ORIGINS: "http://127.0.0.1:4173",
  SQLITE_PATH: database,
  MEDIA_ROOT: resolve(runtimeDir, "media"),
  // One browser makes many requests from 127.0.0.1; keep global limits out of the way.
  API_ANON_RATE: "100000/minute",
  API_USER_RATE: "100000/minute",
  TEST_PAYMENTS_ENABLED: "true",
};

function runManage(args) {
  const result = spawnSync(python, ["manage.py", ...args], {
    cwd: backend,
    env,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

runManage(["migrate", "--noinput"]);
runManage(["seed_demo"]);
runManage([
  "shell",
  "-c",
  [
    "import os",
    "from django.contrib.auth import get_user_model",
    "User = get_user_model()",
    `accounts = ${JSON.stringify(publicDemoAccounts)}`,
    "[(lambda user: (user.set_password(os.environ['E2E_DEMO_PASSWORD']), user.save(update_fields=['password'])))(User.objects.update_or_create(username=username, defaults={'role': 'client', 'is_staff': False, 'is_superuser': False, 'first_name': 'E2E Demo'})[0]) for username in accounts]",
  ].join("; "),
]);

const server = spawn(
  python,
  ["manage.py", "runserver", "127.0.0.1:8010", "--noreload"],
  { cwd: backend, env, stdio: "inherit" },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}

server.on("exit", (code) => process.exit(code ?? 0));
