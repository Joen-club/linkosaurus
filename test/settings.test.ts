import test from "node:test";
import assert from "node:assert/strict";
import { clampRelinkInterval } from "../src/settings";

test("relink interval keeps valid values", () => {
	assert.equal(clampRelinkInterval(1), 1);
	assert.equal(clampRelinkInterval(15), 15);
	assert.equal(clampRelinkInterval(60), 60);
});

test("relink interval clamps to 1–60", () => {
	assert.equal(clampRelinkInterval(0.4), 1);
	assert.equal(clampRelinkInterval(500), 60);
});

test("relink interval falls back to 5 for unusable values", () => {
	assert.equal(clampRelinkInterval(0), 5);
	assert.equal(clampRelinkInterval(-3), 5);
	assert.equal(clampRelinkInterval(NaN), 5);
	assert.equal(clampRelinkInterval(""), 5);
	assert.equal(clampRelinkInterval("abc"), 5);
	assert.equal(clampRelinkInterval(undefined), 5);
	assert.equal(clampRelinkInterval("10"), 10);
});
