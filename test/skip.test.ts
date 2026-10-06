import test from "node:test";
import assert from "node:assert/strict";
import {
	endsInHashtag,
	frontmatterCloseLine,
	frontmatterEnd,
	isWordChar,
	skipCalloutType,
	skipComment,
	skipDisplayMath,
	skipHashtag,
	skipInlineMath,
} from "../src/skip";

test("skipHashtag covers a tag after whitespace or at the start", () => {
	assert.equal(skipHashtag("#Berlin rest", 0, ""), 7);
	assert.equal(skipHashtag("x #reise/Berlin.", 2, " "), 15);
	assert.equal(skipHashtag("#Zürich_2-a", 0, ""), 11);
});

test("skipHashtag ignores headings, anchors and C#", () => {
	assert.equal(skipHashtag("# Heading", 0, ""), -1);
	assert.equal(skipHashtag("page#anchor", 4, "e"), -1);
	assert.equal(skipHashtag("C#", 1, "C"), -1);
	assert.equal(skipHashtag("#", 0, ""), -1);
});

test("endsInHashtag spots a keyword starting inside a tag", () => {
	assert.equal(endsInHashtag("Trip #"), true);
	assert.equal(endsInHashtag("#reise/"), true);
	assert.equal(endsInHashtag("Trip to "), false);
	assert.equal(endsInHashtag("page#"), false);
	assert.equal(endsInHashtag("#tag, "), false);
	assert.equal(endsInHashtag(""), false);
});

test("skipComment handles closed and unclosed comments", () => {
	assert.equal(skipComment("%%Berlin%% after", 0), 10);
	assert.equal(skipComment("%%open to the end", 0), 17);
	assert.equal(skipComment("% single", 0), -1);
});

test("skipDisplayMath needs a closing $$", () => {
	assert.equal(skipDisplayMath("$$x = Berlin$$ y", 0), 14);
	assert.equal(skipDisplayMath("$$ never closed", 0), -1);
});

test("skipInlineMath follows the price-safe rules", () => {
	assert.equal(skipInlineMath("$x+y$ text", 0), 5);
	// Opening $ followed by a space is not math.
	assert.equal(skipInlineMath("$ 5 and 6$", 0), -1);
	// Two prices on one line.
	assert.equal(skipInlineMath("$5 and $10", 0), -1);
	// Never across a line break.
	assert.equal(skipInlineMath("$a\nb$", 0), -1);
	// Escaped dollar inside.
	assert.equal(skipInlineMath("$a\\$b$", 0), 6);
});

test("skipCalloutType covers the callout header", () => {
	assert.equal(skipCalloutType("[!note] Title", 0), 7);
	assert.equal(skipCalloutType("[!faq]- Folded", 0), 7);
	assert.equal(skipCalloutType("[link](x)", 0), -1);
});

test("frontmatterCloseLine finds the closing fence", () => {
	const lines = ["---", "title: Berlin", "---", "Body"];
	const at = (n: number) => lines[n - 1]!;
	assert.equal(frontmatterCloseLine(at, lines.length), 3);
	const none = ["Body", "---"];
	assert.equal(frontmatterCloseLine((n) => none[n - 1]!, none.length), -1);
	const open = ["---", "title: x"];
	assert.equal(frontmatterCloseLine((n) => open[n - 1]!, open.length), -1);
});

test("frontmatterEnd skips the YAML block, including an empty one", () => {
	assert.equal(frontmatterEnd("---\na: 1\n---\nBody"), 13);
	assert.equal(frontmatterEnd("---\n---\nBody"), 8);
	assert.equal(frontmatterEnd("Body\n---\n"), 0);
	assert.equal(frontmatterEnd("---\nnever closed"), 0);
});

test("isWordChar includes combining marks", () => {
	assert.equal(isWordChar("a"), true);
	assert.equal(isWordChar("́"), true);
	assert.equal(isWordChar("7"), true);
	assert.equal(isWordChar(" "), false);
	assert.equal(isWordChar(""), false);
});

import { isAtLineStart, skipFencedCode, skipInlineCode } from "../src/skip";

test("isAtLineStart accepts indentation and quote markers", () => {
	assert.equal(isAtLineStart("```", 0), true);
	assert.equal(isAtLineStart("a\n  ```", 4), true);
	assert.equal(isAtLineStart("> ```", 2), true);
	assert.equal(isAtLineStart("text ```", 5), false);
	assert.equal(isAtLineStart("```", 0, "x"), false);
	assert.equal(isAtLineStart("```", 0, "\n"), true);
});

test("skipFencedCode skips a block up to its closing fence", () => {
	const text = "```js\nBerlin\n```\nafter";
	assert.equal(skipFencedCode(text, 0), 16);
	assert.equal(text.substring(16), "\nafter");
});

test("skipFencedCode needs a long enough closing fence of the same kind", () => {
	const text = "````\n```\nBerlin\n````\nafter";
	assert.equal(text.substring(skipFencedCode(text, 0)), "\nafter");
	const tilde = "~~~\n```\n~~~\nafter";
	assert.equal(tilde.substring(skipFencedCode(tilde, 0)), "\nafter");
});

test("skipFencedCode ignores fences in the middle of a line", () => {
	assert.equal(skipFencedCode("see ```x``` here", 4), -1);
});

test("skipFencedCode runs to the end when never closed", () => {
	assert.equal(skipFencedCode("```\nBerlin", 0), 10);
});

test("skipInlineCode pairs runs of equal length", () => {
	assert.equal(skipInlineCode("`a` b", 0), 3);
	assert.equal(skipInlineCode("``a ` b`` c", 0), 9);
});

test("skipInlineCode does not cross a paragraph break or swallow the rest", () => {
	assert.equal(skipInlineCode("`open\n\nBerlin `x`", 0), -1);
	assert.equal(skipInlineCode("`never closed Berlin", 0), -1);
	// Same paragraph, line break allowed.
	assert.equal(skipInlineCode("`a\nb` c", 0), 5);
});
