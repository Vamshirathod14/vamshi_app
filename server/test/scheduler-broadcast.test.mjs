import { test } from "node:test";
import assert from "node:assert/strict";
import {
  systemBroadcastFor,
  istWallClock,
} from "../src/services/scheduler.js";

test("IST wall clock shifts UTC by +5:30", () => {
  const ist = istWallClock(new Date("2026-09-21T03:30:00.000Z"));
  assert.equal(ist.getUTCHours(), 9);
  assert.equal(ist.getUTCMinutes(), 0);
});

test("09:00 IST fires the morning greeting once with a stable slot ts", () => {
  const a = systemBroadcastFor(new Date("2026-09-21T03:30:00.000Z"));
  const b = systemBroadcastFor(new Date("2026-09-21T03:30:30.000Z"));
  assert.ok(a.some((x) => x.slot === "greet-morning"));
  assert.equal(a.find((x) => x.slot === "greet-morning").ts, b[0].ts);
});

test("14:00 IST fires the afternoon greeting", () => {
  const r = systemBroadcastFor(new Date("2026-09-21T08:30:00.000Z"));
  assert.ok(r.some((x) => x.slot === "greet-afternoon"));
});

test("19:00 IST fires the evening greeting", () => {
  const r = systemBroadcastFor(new Date("2026-09-21T13:30:00.000Z"));
  assert.ok(r.some((x) => x.slot === "greet-evening"));
});

test("a festival morning fires the fest broadcast alongside the greeting", () => {
  const r = systemBroadcastFor(new Date("2026-12-25T03:30:00.000Z"));
  assert.ok(r.some((x) => x.slot === "greet-morning"));
  assert.ok(r.some((x) => x.slot === "fest" && x.title.includes("Christmas")));
});

test("no broadcast outside the 0-4 min window", () => {
  assert.deepEqual(
    systemBroadcastFor(new Date("2026-09-21T03:35:00.000Z")),
    [],
  );
  assert.deepEqual(
    systemBroadcastFor(new Date("2026-09-21T05:30:00.000Z")),
    [],
  );
});