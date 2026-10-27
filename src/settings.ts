// Settings helpers that need no Obsidian import, so they can be unit tested.

export const RELINK_INTERVAL_MIN = 1;
export const RELINK_INTERVAL_MAX = 60;
export const RELINK_INTERVAL_DEFAULT = 5;

/**
 * The periodic relink interval in whole minutes, always 1–60. Anything that
 * is not a usable number (an empty field, NaN, a string from an old data.json)
 * falls back to the default — setInterval with 0 or NaN would fire constantly.
 */
export function clampRelinkInterval(value: unknown): number {
	const n = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(n) || n <= 0) return RELINK_INTERVAL_DEFAULT;
	return Math.min(
		RELINK_INTERVAL_MAX,
		Math.max(RELINK_INTERVAL_MIN, Math.round(n))
	);
}

/**
 * Settings that decide which keywords exist and how they match. Changing one
 * of them means re-folding, re-parsing and re-scanning; any other setting is
 * picked up where it is read and needs none of that.
 */
export const INDEX_SETTING_KEYS: readonly string[] = [
	"keywordList",
	"blocklist",
	"caseInsensitive",
	"foldDiacritics",
	"foldLanguageMode",
	"foldLanguages",
	"minKeywordLength",
	"scanVaultLinks",
	"ignoreEdgeEmojis",
	"scanFrontmatterAliases",
	"folderFilter",
	"folderFilterMode",
];

/** The keys whose values differ between two settings objects. */
export function changedSettingKeys(
	previous: Record<string, unknown> | null,
	next: Record<string, unknown>
): Set<string> {
	const keys = new Set<string>();
	for (const key of Object.keys(next)) {
		if (!previous || previous[key] !== next[key]) keys.add(key);
	}
	if (previous) {
		for (const key of Object.keys(previous)) {
			if (!(key in next)) keys.add(key);
		}
	}
	return keys;
}

/** True when any of the changed keys affects the keyword index. */
export function affectsIndex(changed: Set<string>): boolean {
	return INDEX_SETTING_KEYS.some((key) => changed.has(key));
}
