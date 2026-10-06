import test from "node:test";
import assert from "node:assert/strict";
import {
	formatAliasLink,
	formatWikilink,
	sanitizeDisplay,
	sanitizeTarget,
} from "../src/wikilink";

test("sanitizeTarget keeps paths, headings and block refs", () => {
	assert.equal(sanitizeTarget("AI/Machine Learning#Basics"), "AI/Machine Learning#Basics");
	assert.equal(sanitizeTarget("Note^abc123"), "Note^abc123");
});

test("sanitizeTarget removes link syntax and line breaks", () => {
	assert.equal(sanitizeTarget("[[Tokyo]]"), "Tokyo");
	assert.equal(sanitizeTarget("A|B"), "AB");
	assert.equal(sanitizeTarget("A\nB\r\0"), "AB");
	assert.equal(sanitizeTarget("Odd]"), "Odd");
});

test("sanitizeDisplay keeps ordinary punctuation", () => {
	assert.equal(sanitizeDisplay("C#"), "C#");
	assert.equal(sanitizeDisplay("1/2"), "1/2");
	assert.equal(sanitizeDisplay("a|b"), "ab");
});

test("formatWikilink uses the short form for the note's own name", () => {
	assert.equal(formatWikilink("Tokyo", "Tokyo"), "[[Tokyo]]");
	assert.equal(formatWikilink("tokyo", "Tokyo"), "[[tokyo]]");
	assert.equal(formatWikilink("ML", "Machine Learning"), "[[Machine Learning|ML]]");
	assert.equal(
		formatWikilink("Basics", "AI/Machine Learning#Basics"),
		"[[AI/Machine Learning#Basics|Basics]]"
	);
});

test("formatWikilink and formatAliasLink return empty for empty halves", () => {
	assert.equal(formatWikilink("[[]]", "Tokyo"), "");
	assert.equal(formatAliasLink("Tokyo", "|"), "");
	assert.equal(formatAliasLink("Tokyo", "trip"), "[[Tokyo|trip]]");
});
