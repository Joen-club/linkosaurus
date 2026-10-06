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
