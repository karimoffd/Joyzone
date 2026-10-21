
import { join } from "node:path";
import { build } from "esbuild";

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
};

const result = await build({
  entryPoints: [join(process.cwd(), "src/utils/bookingDraft.js")],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
});
const source = result.outputFiles[0].text;
const bookingDraft = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

const draft = bookingDraft.createBookingDraft({
  place: { id: 42, title: "Smoke Place" },
  selection: {
    duration_type: "soatlik",
    startDate: "2026-09-20",
    endDate: "2026-09-20",
    slots: ["11:00", "10:00"],
    guests: 3,
    subtotal: 100000,
    tax: 12000,
    amount: 112000,
    currency: "UZS",
    note: "smoke",
  },
  user: { id: 7, name: "Test User" },
});

const payload = bookingDraft.draftToBookingPayload(draft);
const expectedKeys = ["place", "start_time", "end_time", "duration_type", "guests", "note"];
if (JSON.stringify(Object.keys(payload)) !== JSON.stringify(expectedKeys)) {
  throw new Error(`Unexpected booking payload keys: ${Object.keys(payload).join(", ")}`);
}
if (payload.place !== 42 || payload.duration_type !== "hourly" || draft.amount !== 112000) {
  throw new Error("Booking payload values were not normalized.");
}
if (new Date(payload.end_time) <= new Date(payload.start_time)) {
  throw new Error("Booking draft has an invalid time range.");
}

if (!bookingDraft.saveBookingDraft(draft)) throw new Error("Booking draft was not saved.");
if (bookingDraft.loadBookingDraft()?.place !== 42) throw new Error("Booking draft was not loaded.");
bookingDraft.clearBookingDraft();
if (bookingDraft.loadBookingDraft() !== null) throw new Error("Booking draft was not cleared.");

localStorage.setItem("joyzone-pending-booking", JSON.stringify({
  place: 43,
  spaceTitle: "Legacy Place",
  duration: "kunlik",
  startDate: "2026-09-21",
  endDate: "2026-09-21",
  guests: 2,
  total: 50000,
}));
const migrated = bookingDraft.loadBookingDraft();
if (migrated?.place !== 43 || migrated?.duration_type !== "daily" || migrated?.amount !== 56000) {
  throw new Error("Legacy booking draft was not migrated.");
}

console.log("[ok] booking draft contract checks passed");
