import test from "node:test";
import assert from "node:assert/strict";
import {
	LANGUAGE_PACK_IDS,
	VARIANT_CAP,
	buildFoldTable,
	fold,
	foldVariants,
	foldWithMap,
	isFoldBoundary,
	parseLanguages,
	toFoldedIndex,
	toSrcIndex,
} from "../src/fold";

const all = buildFoldTable({
	enabled: true,
	lowercase: true,
	allLanguages: true,
	languages: new Set<string>(),
});

const off = buildFoldTable({
	enabled: false,
	lowercase: true,
	allLanguages: true,
	languages: new Set<string>(),
});

function only(...ids: string[]) {
	return buildFoldTable({
		enabled: true,
		lowercase: true,
		allLanguages: false,
		languages: new Set(ids),
	});
}

test("folds letters that carry no combining mark", () => {
	assert.equal(fold("Łukasz", all), "lukasz");
	assert.equal(fold("Søren", all), "soren");
	assert.equal(fold("Đorđe", all), "dorde");
	assert.equal(fold("Hħ", all), "hh");
});

test("folds ordinary diacritics across languages", () => {
	assert.equal(fold("Wąsik", all), "wasik");
	assert.equal(fold("Szcześniak", all), "szczesniak");
	assert.equal(fold("Dvořák", all), "dvorak");
	assert.equal(fold("Gökhan", all), "gokhan");
	assert.equal(fold("Çağlar", all), "caglar");
	assert.equal(fold("Chloé", all), "chloe");
	assert.equal(fold("Kjærgaard", all), "kjaergaard");
	assert.equal(fold("Håkon", all), "hakon");
	assert.equal(fold("Nguyễn", all), "nguyen");
});

test("handles the Turkish dotted and dotless i", () => {
	assert.equal(fold("Işık", all), "isik");
	assert.equal(fold("İstanbul", all), "istanbul");
	assert.equal(fold("ISIK", all), "isik");
});

test("precomposed and decomposed input fold identically", () => {
	const precomposed = "Zürich";
	const decomposed = "Zürich";
	assert.notEqual(precomposed, decomposed);
	assert.equal(fold(precomposed, all), fold(decomposed, all));
	assert.equal(fold(decomposed, all), "zurich");
});

test("length-changing folds expand", () => {
	assert.equal(fold("Straße", all), "strasse");
	assert.equal(fold("Æther", all), "aether");
	assert.equal(fold("Þór", all), "thor");
	assert.equal(fold("œuvre", all), "oeuvre");
});

test("disabled table behaves exactly like the old lowercase normalize", () => {
	assert.equal(fold("Łukasz", off), "łukasz");
	assert.equal(fold("Straße", off), "straße");
	const caseSensitive = buildFoldTable({
		enabled: false,
		lowercase: false,
		allLanguages: true,
		languages: new Set<string>(),
	});
	assert.equal(fold("Łukasz", caseSensitive), "Łukasz");
});

test("İ is index-mapped even with folding switched off", () => {
	// "İ".toLowerCase() is two characters, so the old assumption that
	// lowercasing preserves length shifted every later offset by one.
	assert.equal("İ".toLowerCase().length, 2);
	const f = foldWithMap("İstanbul", off);
	assert.equal(f.folded, "i̇stanbul");
	assert.notEqual(f.toSrc, null);
	// The 's' after the dotted capital must still point at source index 1.
	assert.equal(toSrcIndex(f, 2), 1);
	assert.equal(toFoldedIndex(f, 1), 2);
	assert.equal(toSrcIndex(f, f.folded.length), "İstanbul".length);
	// And with folding on it collapses to a plain 'i', no map needed.
	const on = foldWithMap("İstanbul", all);
	assert.equal(on.folded, "istanbul");
	assert.equal(on.toSrc, null);
});

test("case-sensitive folding keeps the leading capital", () => {
	const table = buildFoldTable({
		enabled: true,
		lowercase: false,
		allLanguages: true,
		languages: new Set<string>(),
	});
	assert.equal(fold("Łukasz", table), "Lukasz");
	assert.equal(fold("Über", table), "Uber");
	assert.equal(fold("Æther", table), "Aether");
	assert.equal(fold("straße", table), "strasse");
});

test("selected mode leaves unselected characters alone", () => {
	const polish = only("pl");
	assert.equal(fold("Łukasz", polish), "lukasz");
	assert.equal(fold("Gökhan", polish), "gökhan");

	const turkish = only("tr");
	assert.equal(fold("Gökhan", turkish), "gokhan");
	assert.equal(fold("Łukasz", turkish), "łukasz");

	const none = buildFoldTable({
		enabled: true,
		lowercase: true,
		allLanguages: false,
		languages: new Set<string>(),
	});
	assert.equal(fold("Łukasz", none), "łukasz");
});

test("selected mode still handles decomposed input", () => {
	const german = only("de");
	assert.equal(fold("Zürich", german), "zurich");
	assert.equal(fold("Zürich", german), "zurich");
});

test("length-preserving folds skip the index maps entirely", () => {
	// The hot path: no allocation for ASCII or for any 1:1 language.
	for (const source of ["plain ascii", "Łukasz", "Gökhan", "Dvořák", "İşık"]) {
		const f = foldWithMap(source, all);
		assert.equal(f.toSrc, null, `expected identity maps for ${source}`);
		assert.equal(f.toFolded, null, `expected identity maps for ${source}`);
		assert.equal(f.folded, fold(source, all));
		assert.equal(f.folded.length, source.length);
		assert.equal(toSrcIndex(f, 3), 3);
		assert.equal(toFoldedIndex(f, 3), 3);
	}
});

test("index maps survive length-changing folds", () => {
	for (const source of ["Straße", "Æther", "Þór", "Meßner", "école"]) {
		const f = foldWithMap(source, all);
		const { folded, toSrc, toFolded } = f;
		assert.equal(folded, fold(source, all), `folded mismatch for ${source}`);
		assert.notEqual(toSrc, null, `expected maps for ${source}`);
		assert.equal(toSrc!.length, folded.length + 1, `toSrc length for ${source}`);
		assert.equal(
			toFolded!.length,
			source.length + 1,
			`toFolded length for ${source}`
		);
		assert.equal(toSrcIndex(f, folded.length), source.length);
		assert.equal(toFoldedIndex(f, source.length), folded.length);
		for (let i = 0; i < folded.length; i++) {
			const src = toSrcIndex(f, i);
			assert.ok(
				src >= 0 && src < source.length,
				`toSrc[${i}] out of range for ${source}`
			);
		}
		// Non-decreasing in both directions.
		for (let i = 1; i < toSrc!.length; i++) {
			assert.ok(toSrc![i]! >= toSrc![i - 1]!, `toSrc not monotonic for ${source}`);
		}
		for (let i = 1; i < toFolded!.length; i++) {
			assert.ok(
				toFolded![i]! >= toFolded![i - 1]!,
				`toFolded not monotonic for ${source}`
			);
		}
	}
});

test("index maps locate a keyword inside a longer string", () => {
	// "Straße" folds to "strasse" — one character longer than the source, so
	// raw and folded offsets diverge and the map has to bridge them.
	const line = "Wir treffen uns in der Straße heute";
	const f = foldWithMap(line, all);
	const keyword = fold("Straße", all);
	const at = f.folded.indexOf(keyword);
	assert.notEqual(at, -1);
	assert.equal(
		line.slice(toSrcIndex(f, at), toSrcIndex(f, at + keyword.length)),
		"Straße"
	);
	assert.equal(toFoldedIndex(f, line.indexOf("Straße")), at);
});

test("a fold boundary can be told apart from the middle of an expansion", () => {
	const f = foldWithMap("Meßner", all);
	assert.equal(f.folded, "messner");
	// Both 's' of the expanded ß come from the same source index. A keyword
	// folding to "sner" matches at folded index 3, which is the middle of the
	// ß — rejecting it is what stops the replacement eating half a character.
	assert.equal(f.folded.substring(3), "sner");
	assert.equal(toSrcIndex(f, 2), toSrcIndex(f, 3));
	assert.equal(isFoldBoundary(f, 2), true);
	assert.equal(isFoldBoundary(f, 3), false);
	assert.equal(isFoldBoundary(f, 4), true);
	// Both ends of the string always count as boundaries.
	assert.equal(isFoldBoundary(f, 0), true);
	assert.equal(isFoldBoundary(f, f.folded.length), true);
	// Identity maps make every position a boundary.
	const plain = foldWithMap("Gökhan", all);
	for (let i = 0; i <= plain.folded.length; i++) {
		assert.equal(isFoldBoundary(plain, i), true);
	}
});

test("variants cover both spellings of a digraph", () => {
	assert.deepEqual(foldVariants("Søren", all), ["soren", "soeren"]);
	assert.deepEqual(foldVariants("Müller", all), ["muller", "mueller"]);
	assert.deepEqual(foldVariants("Håkon", all), ["hakon", "haakon"]);
	assert.deepEqual(foldVariants("Tokyo", all), ["tokyo"]);
	// ß already folds to ss, so there is nothing extra to generate.
	assert.deepEqual(foldVariants("Straße", all), ["strasse"]);
});

test("variants respect the selected languages", () => {
	assert.deepEqual(foldVariants("Müller", only("fr")), ["muller"]);
	assert.deepEqual(foldVariants("Müller", only("de")), ["muller", "mueller"]);
	assert.deepEqual(foldVariants("Søren", only("de")), ["søren"]);
});

test("variant count stays capped", () => {
	const variants = foldVariants("Ärgerlöööüü", all);
	assert.ok(
		variants.length <= VARIANT_CAP,
		`expected at most ${VARIANT_CAP}, got ${variants.length}`
	);
	assert.equal(variants[0], fold("Ärgerlöööüü", all));
});

test("variants always lead with the canonical fold and never repeat", () => {
	for (const word of ["Søren", "Müller", "Håkon", "Straße", "Łukasz"]) {
		const variants = foldVariants(word, all);
		assert.equal(variants[0], fold(word, all));
		assert.equal(new Set(variants).size, variants.length);
	}
});

test("parseLanguages keeps known ids and drops the rest", () => {
	assert.deepEqual([...parseLanguages("pl,tr")], ["pl", "tr"]);
	assert.deepEqual([...parseLanguages("pl, nope ,tr")], ["pl", "tr"]);
	assert.deepEqual([...parseLanguages("")], []);
	assert.equal(parseLanguages(LANGUAGE_PACK_IDS.join(",")).size, LANGUAGE_PACK_IDS.length);
});
