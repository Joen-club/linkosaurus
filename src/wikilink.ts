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
 * The note a keyword names when it is its own target ("C#", "TCP/IP"
 * without "= Target"). A note name cannot hold "/", "\\", "#" or "^" —
 * inside a link they would point at a folder, a heading or a block — so
 * they are dropped, as earlier versions did: "C#" names the note "C".
 */
export function selfTargetName(text: string): string {
	return sanitizeTarget(text).replace(/[#^\\/]/g, "");
}

/**
 * The link for a keyword pointing at a target: [[Target]] when the keyword
 * is the target's own name (case aside), [[Target|keyword]] otherwise.
 * When the keyword is its own target but carries characters a note name
 * cannot hold, the link goes to the cleaned name and keeps the keyword as
 * display text: "C#" → [[C|C#]].
 * Returns "" when either half is empty after sanitizing.
 */
export function formatWikilink(keyword: string, target: string): string {
	const kw = sanitizeDisplay(keyword);
	let tg = sanitizeTarget(target);
	if (!kw || !tg) return "";
	if (kw.toLowerCase() === tg.toLowerCase()) {
		const name = selfTargetName(tg);
		if (!name) return "";
		if (name === tg) return `[[${kw}]]`;
		tg = name;
	}
	return `[[${tg}|${kw}]]`;
}

/** An alias link that always keeps the display text: [[Target|display]]. */
export function formatAliasLink(target: string, display: string): string {
	const tg = sanitizeTarget(target);
	const d = sanitizeDisplay(display);
	if (!tg || !d) return "";
	return `[[${tg}|${d}]]`;
}
