import test from "node:test";
import assert from "node:assert/strict";
import { EditorState, type TransactionSpec } from "@codemirror/state";
import AutoLinkKeywordsPlugin from "../src/main";

/** Drive an actual editor-triggered space through the vault-derived index. */
function typeInVault(noteNames: string[], mention: string, ignoreEdgeEmojis: boolean) {
	const notes = noteNames.map((basename) => ({
		basename,
		path: basename + ".md",
		extension: "md",
	}));
	const plugin = new AutoLinkKeywordsPlugin({
		vault: { getMarkdownFiles: () => notes },
		workspace: { getActiveFile: () => null },
		metadataCache: { getFileCache: () => null },
	} as never, {} as never);
	Object.assign(plugin.settings, {
		scanVaultLinks: true,
		ignoreEdgeEmojis,
		keywordList: "",
	});
	plugin.rebuildFoldTable();
	plugin.parseBlocklist();
	plugin.parseManualKeywords();
	(plugin as unknown as { scanVaultLinks(): void }).scanVaultLinks();
	const internals = plugin as unknown as {
		handleInput(v: unknown, from: number, to: number, text: string): boolean;
	};
	const view = {
		state: EditorState.create({ doc: mention, selection: { anchor: mention.length } }),
		composing: false,
		compositionStarted: false,
		dispatch(spec: TransactionSpec) {
			const change = this.state.update(spec);
			this.state = change.state;
		},
	};
	const claimed = internals.handleInput(view, mention.length, mention.length, " ");
	if (!claimed) {
		view.dispatch({
			changes: { from: mention.length, insert: " " },
			selection: { anchor: mention.length + 1 },
		});
	}
	return { claimed, text: view.state.doc.toString() };
}

test("typed ordinary keyword still links with emoji option enabled", () => {
	assert.deepEqual(typeInVault(["Berlin", "🗺Question Framework"], "Berlin", true), {
		claimed: true,
		text: "[[Berlin]] ",
	});
});

test("typed ordinary keyword still links with emoji option disabled", () => {
	assert.deepEqual(typeInVault(["Berlin", "🗺Question Framework"], "Berlin", false), {
		claimed: true,
		text: "[[Berlin]] ",
	});
});

test("typing an emoji-free title creates a non-aliased original-name wikilink", () => {
	assert.deepEqual(typeInVault(["🗺Question Framework"], "Question Framework", true), {
		claimed: true,
		text: "[[🗺Question Framework]] ",
	});
});

test("emoji-free title is not indexed when the option is disabled", () => {
	assert.deepEqual(typeInVault(["🗺Question Framework"], "Question Framework", false), {
		claimed: false,
		text: "Question Framework ",
	});
});
