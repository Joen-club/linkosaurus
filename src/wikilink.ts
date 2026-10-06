// Building wikilinks from keywords and targets. Free of any Obsidian import
// so it can be unit tested on its own.

// Wikilink syntax that must never appear inside either half of a link.
function stripLinkSyntax(text: string): string {
	return (
		text
			.replace(/\]\]|\[\[|[|\n\r\0]/g, "")
			// A lone trailing "]" would close the link early: "a]" + "]]".
			.replace(/\]+$/, "")
	);
}

/**
 * The target half of a link. Keeps "/" (folder paths), "#" (headings) and
 * "^" (blocks), so a manual mapping like "ML = AI/Machine Learning#Basics"
 * links exactly where it says.
 */
export function sanitizeTarget(text: string): string {
	return stripLinkSyntax(text);
}

/**
 * The display half of a link. Only the characters that would break the link
 * itself are removed — "C#" or "1/2" stay what the user wrote.
 */
export function sanitizeDisplay(text: string): string {
	return stripLinkSyntax(text);
}

/**
 * The link for a keyword pointing at a target: [[Target]] when the keyword
 * is the target's own name (case aside), [[Target|keyword]] otherwise.
 * Returns "" when either half is empty after sanitizing.
 */
export function formatWikilink(keyword: string, target: string): string {
	const kw = sanitizeDisplay(keyword);
	const tg = sanitizeTarget(target);
	if (!kw || !tg) return "";
	return kw.toLowerCase() === tg.toLowerCase() ? `[[${kw}]]` : `[[${tg}|${kw}]]`;
}

/** An alias link that always keeps the display text: [[Target|display]]. */
export function formatAliasLink(target: string, display: string): string {
	const tg = sanitizeTarget(target);
	const d = sanitizeDisplay(display);
	if (!tg || !d) return "";
	return `[[${tg}|${d}]]`;
}
