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

import { isInFolders, parseFolderList, passesFolderFilter } from "../src/destination";

test("parseFolderList normalises separators, slashes and case", () => {
	assert.deepEqual(parseFolderList("Templates\n/Daily Notes/\nA\\B\n\n  "), [
		"templates/",
		"daily notes/",
		"a/b/",
	]);
	assert.deepEqual(parseFolderList("x\nX/"), ["x/"]);
	assert.deepEqual(parseFolderList("/"), []);
});

test("isInFolders compares without case and only on folder boundaries", () => {
	const folders = parseFolderList("Templates");
	assert.equal(isInFolders("templates/Daily.md", folders), true);
	assert.equal(isInFolders("Templates/Sub/Daily.md", folders), true);
	assert.equal(isInFolders("TemplatesOld/Daily.md", folders), false);
});

test("passesFolderFilter honours include and exclude", () => {
	const folders = parseFolderList("Work");
	assert.equal(passesFolderFilter("Work/a.md", folders, "include"), true);
	assert.equal(passesFolderFilter("Home/a.md", folders, "include"), false);
	assert.equal(passesFolderFilter("Work/a.md", folders, "exclude"), false);
	assert.equal(passesFolderFilter("Home/a.md", [], "include"), true);
});

import { optsOutByFrontmatter } from "../src/destination";

test("a note opts out with linkosaurus: false", () => {
	assert.equal(optsOutByFrontmatter({ linkosaurus: false }), true);
	assert.equal(optsOutByFrontmatter({ linkosaurus: "off" }), true);
	assert.equal(optsOutByFrontmatter({ linkosaurus: "Never" }), true);
	assert.equal(optsOutByFrontmatter({ linkosaurus: true }), false);
	assert.equal(optsOutByFrontmatter({ linkosaurus: "yes" }), false);
	assert.equal(optsOutByFrontmatter({ other: false }), false);
	assert.equal(optsOutByFrontmatter(undefined), false);
});
