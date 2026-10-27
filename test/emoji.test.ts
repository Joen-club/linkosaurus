import test from "node:test";
import assert from "node:assert/strict";
import AutoLinkKeywordsPlugin from "../src/main";
import { stripEdgeEmojis } from "../src/emoji";

test("strips complete emoji sequences from title edges only", () => {
	assert.equal(stripEdgeEmojis("🗺Question Framework"), "Question Framework");
	assert.equal(stripEdgeEmojis("🛠️🛠️🗡Brightest Ones Fade Away First❓"), "Brightest Ones Fade Away First");
	assert.equal(stripEdgeEmojis("🧑🏽‍💻 Work 🇺🇸"), "Work");
	assert.equal(stripEdgeEmojis("🏳️‍🌈 Pride 🤷🏽‍♀️"), "Pride");
	assert.equal(stripEdgeEmojis("1️⃣ Plan #️⃣"), "Plan");
	assert.equal(stripEdgeEmojis("A 💡 B"), "A 💡 B");
	assert.equal(stripEdgeEmojis("📅 2026-10-26"), "2026-10-26");
	assert.equal(stripEdgeEmojis("🧠🔎"), "");
	assert.equal(stripEdgeEmojis("Normal Title"), "Normal Title");
});

function scan(names: string[], enabled = true, manual = "") {
	const files = names.map((basename) => ({ basename, path: basename + ".md", extension: "md" }));
	const p = new AutoLinkKeywordsPlugin({
		vault: { getMarkdownFiles: () => files },
		metadataCache: { getFileCache: () => null },
	} as never, {} as never);
	Object.assign(p.settings, {
		scanVaultLinks: true, ignoreEdgeEmojis: enabled, keywordList: manual,
	});
	p.rebuildFoldTable();
	p.parseBlocklist();
	p.parseManualKeywords();
	(p as unknown as { scanVaultLinks(): void }).scanVaultLinks();
	return p as unknown as {
		replaceKeywordsInText(text: string, before: string, after: string): string;
		matchKeyword(text: string): { target: string } | null;
	};
}

test("plain words link to emoji-decorated original notes without alias links", () => {
	const p = scan(["🗺Question Framework", "🛠️🛠️🗡Brightest Ones Fade Away First❓"]);
	assert.equal(p.replaceKeywordsInText("Question Framework", "", ""), "[[🗺Question Framework]]");
	assert.equal(p.replaceKeywordsInText("Brightest Ones Fade Away First", "", ""), "[[🛠️🛠️🗡Brightest Ones Fade Away First❓]]");
	assert.equal(p.matchKeyword("Question Framework")?.target, "🗺Question Framework");
});

test("setting disabled preserves original matching behavior", () => {
	const p = scan(["🗺Question Framework"], false);
	assert.equal(p.replaceKeywordsInText("Question Framework", "", ""), "Question Framework");
});

test("ambiguous stripped titles do not silently select a destination", () => {
	const p = scan(["🗺Question Framework", "🧠Question Framework"]);
	assert.equal(p.replaceKeywordsInText("Question Framework", "", ""), "Question Framework");
});

test("exact filenames and manual mappings take priority", () => {
	const p = scan(["🗺Question Framework", "Question Framework"]);
	assert.equal(p.replaceKeywordsInText("Question Framework", "", ""), "[[Question Framework]]");
	const manual = scan(["🗺Question Framework"], true, "Question Framework = Other");
	assert.equal(manual.replaceKeywordsInText("Question Framework", "", ""), "[[Other|Question Framework]]");
});
