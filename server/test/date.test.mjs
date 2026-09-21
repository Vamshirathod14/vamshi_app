import { test } from "node:test";
import assert from "node:assert/strict";
import { combineDateTime } from "../src/utils/date.js";

test("ISO datetime strings pass through unchanged (server TZ cannot skew)", () => {
  const iso = "2026-09-21T12:45:00.000Z";
  const d = combineDateTime(iso, "10:00");
  assert.equal(d.toISOString(), iso);
});

test("Date instances pass through unchanged", () => {
  const when = new Date("2026-09-21T12:45:00.000Z");
  const d = combineDateTime(when, "10:00");
  assert.equal(d.getTime(), when.getTime());
});

test("legacy YYYY-MM-DD + HH:mm still combines at the given wall-clock", () => {
  const d = combineDateTime("2026-09-21", "12:45");
  assert.equal(d.getHours(), 12);
  assert.equal(d.getMinutes(), 45);
});

test("invalid inputs fall back to now instead of crashing", () => {
  const a = combineDateTime("not-a-date", null);
  const b = combineDateTime("garbageT12", null);
  assert.ok(!Number.isNaN(a.getTime()));
  assert.ok(!Number.isNaN(b.getTime()));
});