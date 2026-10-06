import test from "node:test";
import assert from "node:assert/strict";
import AutoLinkKeywordsPlugin from "../src/main";

// Drives the plugin's text matchers without Obsidian: only the keyword list
// is used as a source, the vault scan stays off.
type Internals = {
	replaceKeywordsInText(
		text: string,
		charBefore: string,
		charAfter: string,
		skipKeyword?: string
	): string;
	matchKeyword(textBefore: string): {
		keyword: string;
		target: string;
		start: number;
	} | null;
};

function plugin(keywords: string, over: Record<string, unknown> = {}) {
	const p = new AutoLinkKeywordsPlugin({} as never, {} as never);
	Object.assign(p.settings, { scanVaultLinks: false, keywordList: keywords, ...over });
	p.rebuildFoldTable();
	p.parseBlocklist();
	p.parseManualKeywords();
	p.parseTlds();
	return p as unknown as Internals;
}

test("links keywords in a text, longest match first", () => {
	const p = plugin("Open\nOpen Source\nML = Machine Learning");
	assert.equal(
		p.replaceKeywordsInText("Open Source and ML.", "", ""),
		"[[Open Source]] and [[Machine Learning|ML]]."
	);
	assert.equal(p.replaceKeywordsInText("Open door", "", ""), "[[Open]] door");
});

test("respects word boundaries on both sides", () => {
	const p = plugin("Berlin");
	assert.equal(p.replaceKeywordsInText("Berliner Berlin", "", ""), "Berliner [[Berlin]]");
	assert.equal(p.replaceKeywordsInText("Berlin", "x", ""), "Berlin");
	assert.equal(p.replaceKeywordsInText("Berlin", "", "x"), "Berlin");
});

test("folds accents and keeps the note's spelling", () => {
	const p = plugin("Łukasz");
	assert.equal(p.replaceKeywordsInText("met Lukasz", "", ""), "met [[Łukasz]]");
});

test("skips tags, comments, math, callouts and code", () => {
	const p = plugin("Berlin\nnote");
	assert.equal(p.replaceKeywordsInText("#Berlin trip", "", ""), "#Berlin trip");
	assert.equal(p.replaceKeywordsInText("%%Berlin%% Berlin", "", ""), "%%Berlin%% [[Berlin]]");
	assert.equal(p.replaceKeywordsInText("$Berlin$ x", "", ""), "$Berlin$ x");
	assert.equal(p.replaceKeywordsInText("$$\nBerlin\n$$", "", ""), "$$\nBerlin\n$$");
	assert.equal(p.replaceKeywordsInText("> [!note] Berlin", "", ""), "> [!note] [[Berlin]]");
	assert.equal(p.replaceKeywordsInText("`Berlin` Berlin", "", ""), "`Berlin` [[Berlin]]");
	assert.equal(
		p.replaceKeywordsInText("```\nBerlin\n```\nBerlin", "", ""),
		"```\nBerlin\n```\n[[Berlin]]"
	);
});

test("a stray backtick no longer blocks the rest of the note", () => {
	const p = plugin("Berlin");
	assert.equal(
		p.replaceKeywordsInText("it`s in Berlin\n\nBerlin again", "", ""),
		"it`s in [[Berlin]]\n\n[[Berlin]] again"
	);
	// Fences only open at the start of a line.
	assert.equal(
		p.replaceKeywordsInText("see ``` Berlin", "", ""),
		"see ``` [[Berlin]]"
	);
});

test("frontmatter is left alone", () => {
	const p = plugin("Berlin");
	assert.equal(
		p.replaceKeywordsInText("---\ncity: Berlin\n---\nBerlin", "", ""),
		"---\ncity: Berlin\n---\n[[Berlin]]"
	);
});

test("targets keep folders and headings", () => {
	const p = plugin("Basics = AI/Machine Learning#Basics");
	assert.equal(
		p.replaceKeywordsInText("Basics", "", ""),
		"[[AI/Machine Learning#Basics|Basics]]"
	);
});

test("never links a note to itself", () => {
	const p = plugin("Berlin");
	assert.equal(p.replaceKeywordsInText("Berlin", "", "", "Berlin"), "Berlin");
});

test("matchKeyword finds the keyword ending at the cursor", () => {
	const p = plugin("Open\nOpen Source");
	assert.deepEqual(
		{ ...p.matchKeyword("I like Open Source")!, typedText: undefined },
		{ keyword: "Open Source", target: "Open Source", start: 7, typedText: undefined }
	);
	assert.equal(p.matchKeyword("Reopen"), null);
	assert.equal(p.matchKeyword("#Open"), null);
	assert.equal(p.matchKeyword("[[Open"), null);
});

test("matchKeyword only folds the tail of a long line", () => {
	const p = plugin("Berlin\nŁukasz");
	const long = "x ".repeat(5000) + "trip to Berlin";
	const m = p.matchKeyword(long);
	assert.equal(m?.target, "Berlin");
	assert.equal(m?.start, long.length - "Berlin".length);
	const folded = "ß".repeat(300) + " Lukasz";
	assert.equal(p.matchKeyword(folded)?.start, 301);
	// A word that only partly fits the window is still not matched inside.
	assert.equal(p.matchKeyword("a".repeat(500) + "Berlin"), null);
});

test("grow sets answer whether a match can still become a longer keyword", () => {
	const p = plugin("Open\nOpen Source Initiative\nSøren Kierkegaard") as unknown as {
		growPrefixes: Set<string>;
		growNext: Set<string>;
	};
	assert.equal(p.growPrefixes.has("open"), true);
	assert.equal(p.growPrefixes.has("open source"), true);
	assert.equal(p.growNext.has("open s"), true);
	assert.equal(p.growNext.has("open x"), false);
	// Folded spellings count too.
	assert.equal(p.growPrefixes.has("soren"), true);
	assert.equal(p.growPrefixes.has("source"), false);
});
