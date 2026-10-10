import test from "node:test";
import assert from "node:assert/strict";
import {
	formatAliasLink,
	formatWikilink,
	sanitizeDisplay,
	sanitizeTarget,
	selfTargetName,
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

test("a keyword that is its own target never links to a heading, block or folder", () => {
	assert.equal(formatWikilink("C#", "C#"), "[[C|C#]]");
	assert.equal(formatWikilink("TCP/IP", "TCP/IP"), "[[TCPIP|TCP/IP]]");
	assert.equal(formatWikilink("Meeting #3", "Meeting #3"), "[[Meeting 3|Meeting #3]]");
	assert.equal(formatWikilink("#", "#"), "");
	// An explicit target keeps its path and heading.
	assert.equal(formatWikilink("C#", "CSharp"), "[[CSharp|C#]]");
	assert.equal(selfTargetName("A/B#c^d"), "ABcd");
});
