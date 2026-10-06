// Which notes Linkosaurus may write links into. Free of any Obsidian import
// so it can be unit tested on its own.

/**
 * Notes owned by another plugin's own file format. Excalidraw drawings and
 * Kanban boards are Markdown on disk, but their text is data the owning
 * plugin parses — a wikilink injected there breaks the drawing or the board.
 */
export function isPluginOwnedNote(
	path: string,
	frontmatter: Record<string, unknown> | undefined | null
): boolean {
	if (path.toLowerCase().endsWith(".excalidraw.md")) return true;
	if (!frontmatter) return false;
	return (
		Object.prototype.hasOwnProperty.call(frontmatter, "excalidraw-plugin") ||
		Object.prototype.hasOwnProperty.call(frontmatter, "kanban-plugin")
	);
}

/**
 * A short fingerprint of everything that decides what the bulk linker would
 * write. When it is unchanged, a note that produced no links last time and
 * has not been edited since will produce none again.
 */
export function hashStrings(parts: Iterable<string>): string {
	// FNV-1a, 32 bit, over the parts joined by a separator that cannot occur
	// in a keyword line.
	let h = 0x811c9dc5;
	for (const part of parts) {
		for (let i = 0; i < part.length; i++) {
			h ^= part.charCodeAt(i);
			h = Math.imul(h, 0x01000193);
		}
		h ^= 0x1f;
		h = Math.imul(h, 0x01000193);
	}
	return (h >>> 0).toString(36);
}
