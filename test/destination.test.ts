import test from "node:test";
import assert from "node:assert/strict";
import { hashStrings, isPluginOwnedNote } from "../src/destination";

test("Excalidraw drawings are plugin-owned by file name", () => {
	assert.equal(isPluginOwnedNote("Drawings/Plan.excalidraw.md", {}), true);
	assert.equal(isPluginOwnedNote("Drawings/Plan.EXCALIDRAW.md", null), true);
});

test("Excalidraw and Kanban are plugin-owned by frontmatter", () => {
	assert.equal(
		isPluginOwnedNote("Plan.md", { "excalidraw-plugin": "parsed" }),
		true
	);
	assert.equal(
		isPluginOwnedNote("Board.md", { "kanban-plugin": "basic" }),
		true
	);
});

test("ordinary notes are not plugin-owned", () => {
	assert.equal(isPluginOwnedNote("Notes/Tokyo.md", { tags: ["x"] }), false);
	assert.equal(isPluginOwnedNote("Notes/Tokyo.md", undefined), false);
});

test("hashStrings is stable and order-sensitive", () => {
	assert.equal(hashStrings(["a", "b"]), hashStrings(["a", "b"]));
	assert.notEqual(hashStrings(["a", "b"]), hashStrings(["b", "a"]));
	// The separator keeps part boundaries apart.
	assert.notEqual(hashStrings(["ab", "c"]), hashStrings(["a", "bc"]));
});
