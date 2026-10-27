// Derive a matchable name from emoji-decorated note titles without changing
// the actual filename or adding a frontmatter alias.
//
// Match whole emoji sequences, not individual UTF-16 code units. This covers
// variation selectors, skin tones, ZWJ sequences, flags, keycaps and tag flags.
// We deliberately do not strip ordinary punctuation, digits or interior emoji.
const EMOJI_BASE = String.raw`[\p{Extended_Pictographic}\p{Emoji_Presentation}]`;
const EMOJI_PART = String.raw`${EMOJI_BASE}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?`;
const EMOJI = String.raw`(?:\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|${EMOJI_PART}(?:\u200D${EMOJI_PART})*(?:[\u{E0020}-\u{E007E}]+\u{E007F})?)`;

const LEADING_EMOJI = new RegExp(`^(?:${EMOJI}\\s*)+`, "u");
const TRAILING_EMOJI = new RegExp(`(?:\\s*${EMOJI})+$`, "u");

/** The original filename remains the link target; this is a match key only. */
export function stripEdgeEmojis(title: string): string {
	return title.trim().replace(LEADING_EMOJI, "").replace(TRAILING_EMOJI, "").trim();
}
