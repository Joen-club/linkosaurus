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

import { affectsIndex, changedSettingKeys } from "../src/settings";

test("changedSettingKeys lists exactly the differing keys", () => {
	const a = { x: 1, y: "a", z: true };
	assert.deepEqual([...changedSettingKeys(a, { x: 1, y: "b", z: true })], ["y"]);
	assert.deepEqual([...changedSettingKeys(a, { ...a })], []);
	assert.deepEqual([...changedSettingKeys(null, { x: 1 })], ["x"]);
	assert.deepEqual([...changedSettingKeys({ x: 1, old: 2 }, { x: 1 })], ["old"]);
});

test("only index-relevant settings trigger a rebuild", () => {
	assert.equal(affectsIndex(new Set(["keywordList"])), true);
	assert.equal(affectsIndex(new Set(["folderFilter"])), true);
	assert.equal(affectsIndex(new Set(["foldLanguages"])), true);
	assert.equal(affectsIndex(new Set(["aliasSuggestTabAccepts"])), false);
	assert.equal(affectsIndex(new Set(["urlAutolinkTlds", "noteSearchTrigger"])), false);
	assert.equal(affectsIndex(new Set()), false);
});
