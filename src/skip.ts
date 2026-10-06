// Recognizers for Markdown regions the auto-linker must leave alone: tags,
// comments, math, callout headers and frontmatter. Each scanner takes the
// text and a position and returns the index just past the region it found
// there, or -1 when no such region starts at that position.
//
// Free of any Obsidian or CodeMirror import so they can be unit tested.

// Characters Obsidian accepts inside a tag (#project/sub-topic_2).
const TAG_CHAR = /[\p{L}\p{N}\p{M}_\-/]/u;

/** Letters, digits and combining marks: what counts as part of a word. */
export const WORD_CHAR = /[\p{L}\p{N}\p{M}]/u;

export function isWordChar(ch: string): boolean {
	return !!ch && WORD_CHAR.test(ch);
}

/**
 * A #tag starting at `i`. `prevChar` is the character before `i` (empty at
 * the start of the text); a tag only starts after whitespace or at the start,
 * so "C#" or "page#anchor" are not tags. "# Heading" is not a tag either.
 */
export function skipHashtag(text: string, i: number, prevChar: string): number {
	if (text.charAt(i) !== "#") return -1;
	if (prevChar && !/\s/.test(prevChar)) return -1;
	let end = i + 1;
	while (end < text.length && TAG_CHAR.test(text.charAt(end))) end++;
	return end > i + 1 ? end : -1;
}

/**
 * True when the text ends inside a #tag token, i.e. a keyword starting right
 * after `before` would be part of a tag ("#Ber" + "lin" → no link).
 */
export function endsInHashtag(before: string): boolean {
	let j = before.length;
	while (j > 0 && TAG_CHAR.test(before.charAt(j - 1))) j--;
	if (j === 0 || before.charAt(j - 1) !== "#") return false;
	const prev = j >= 2 ? before.charAt(j - 2) : "";
	return !prev || /\s/.test(prev);
}

/**
 * An Obsidian comment %%…%% starting at `i`. Like Obsidian, an unclosed
 * comment runs to the end of the text.
 */
export function skipComment(text: string, i: number): number {
	if (text.substring(i, i + 2) !== "%%") return -1;
	const close = text.indexOf("%%", i + 2);
	return close === -1 ? text.length : close + 2;
}

/** A display-math block $$…$$ starting at `i`; unclosed is not math. */
export function skipDisplayMath(text: string, i: number): number {
	if (text.substring(i, i + 2) !== "$$") return -1;
	const close = text.indexOf("$$", i + 2);
	return close === -1 ? -1 : close + 2;
}

/**
 * Inline math $…$ starting at `i`, on a single line. Follows the Markdown
 * convention that keeps prices from turning into math: the opening $ is not
 * followed by whitespace, the closing $ is not preceded by whitespace and not
 * followed by a digit.
 */
export function skipInlineMath(text: string, i: number): number {
	if (text.charAt(i) !== "$") return -1;
	const first = text.charAt(i + 1);
	if (!first || first === "$" || /\s/.test(first)) return -1;
	for (let j = i + 1; j < text.length; j++) {
		const ch = text.charAt(j);
		if (ch === "\n") return -1;
		if (ch === "\\") {
			j++;
			continue;
		}
		if (ch !== "$") continue;
		if (/\s/.test(text.charAt(j - 1))) continue;
		if (/[0-9]/.test(text.charAt(j + 1))) continue;
		return j + 1;
	}
	return -1;
}

/** A callout header [!type] (optionally with +/- fold marker) at `i`. */
export function skipCalloutType(text: string, i: number): number {
	if (text.substring(i, i + 2) !== "[!") return -1;
	const m = /^\[![^\]\n]+\][+-]?/.exec(text.substring(i, i + 64));
	return m ? i + m[0].length : -1;
}

/**
 * The line number (1-based) of the closing fence of a YAML frontmatter
 * block, or -1 when the document has none. `line(n)` returns line n.
 * Only the first `maxLines` lines are searched.
 */
export function frontmatterCloseLine(
	line: (n: number) => string,
	lineCount: number,
	maxLines = 2000
): number {
	if (lineCount < 2 || !/^---[ \t]*$/.test(line(1))) return -1;
	const last = Math.min(lineCount, maxLines);
	for (let n = 2; n <= last; n++) {
		if (/^(---|\.\.\.)[ \t]*$/.test(line(n))) return n;
	}
	return -1;
}

/**
 * Index just past the frontmatter block at the start of `text`, or 0 when
 * there is none.
 */
export function frontmatterEnd(text: string): number {
	if (!text.startsWith("---\n") && !text.startsWith("---\r\n")) return 0;
	const searchFrom = text.indexOf("\n") + 1;
	const match = /(^|\n)---[ \t]*(?:\r?\n|$)/.exec(text.substring(searchFrom));
	if (!match) return 0;
	return searchFrom + match.index + match[0].length;
}
